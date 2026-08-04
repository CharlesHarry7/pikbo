#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const providerErrorUrl = pathToFileURL(
  join(root, "lib/providerError.ts")
).href;
const {
  providerFailureSettlementPlan,
  recordAmbiguousSettlementStateSafely,
} = await import(providerErrorUrl);
const reservationLifecycleUrl = pathToFileURL(
  join(root, "lib/reservationLifecycle.ts")
).href;
const {
  createReservationLifecycle,
} = await import(reservationLifecycleUrl);
const recoveryPolicyUrl = pathToFileURL(
  join(root, "lib/generateRecoveryPolicy.ts")
).href;
const recoveryPolicy = await import(recoveryPolicyUrl);

function fakeReservation(id) {
  return {
    reservationId: `reservation-${id}`,
    jobId: `job-${id}`,
    accountId: "account-1",
    userId: "user-1",
    credits: 10,
    status: "reserved",
    providerAuthorized: true,
    planId: "founding_studio",
    idempotencyKey: `idempotency-${id}`,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
}

// A timeout/network/unknown exception after subscribe() may represent an
// accepted provider job. It must withhold before finally and never release.
for (const kind of ["timeout", "network", "other"]) {
  let releaseCalls = 0;
  let settleCalls = 0;
  let providerSpendCommitCalls = 0;
  let reconciliationCalls = 0;
  const lifecycle = createReservationLifecycle({
    async release() {
      releaseCalls += 1;
      return { ok: true };
    },
    async settle() {
      settleCalls += 1;
      return { ok: true };
    },
  });
  lifecycle.assign(fakeReservation(`post-submit-${kind}`));
  const plan = providerFailureSettlementPlan({
    kind,
    providerRequestStarted: true,
  });
  assert.equal(plan.action, "withhold");
  assert.equal(plan.code, "DURABLE_CREDITS_UNAVAILABLE");
  assert.equal(plan.status, 503);
  assert.equal(plan.refundUnconfirmed, true);
  assert.doesNotMatch(plan.error, /credits? (?:were )?restored|refunded/i);
  const safeguard = await recordAmbiguousSettlementStateSafely({
    reason: plan.reason,
    markWithheld: lifecycle.markWithheld,
    async commitProviderSpend() {
      providerSpendCommitCalls += 1;
      return true;
    },
    async recordReconciliation() {
      reconciliationCalls += 1;
      return { ok: true };
    },
  });
  const finallyResult = await lifecycle.safetyNetRelease();
  assert.equal(safeguard.providerSpendCommitted, true);
  assert.equal(safeguard.reconciliationRecorded, true);
  assert.equal(lifecycle.phase(), "withheld");
  assert.equal(finallyResult.skipped, true);
  assert.equal(releaseCalls, 0);
  assert.equal(settleCalls, 0);
  assert.equal(providerSpendCommitCalls, 1);
  assert.equal(reconciliationCalls, 1);
}

// Even when the durable Pack/R1 recorder throws, the synchronous withhold has
// already closed both the explicit and finally release paths.
{
  let releaseCalls = 0;
  let providerSpendCommitCalls = 0;
  let reconciliationCalls = 0;
  const lifecycle = createReservationLifecycle({
    async release() {
      releaseCalls += 1;
      return { ok: true };
    },
    async settle() {
      return { ok: true };
    },
  });
  lifecycle.assign(fakeReservation("recorder-throws"));
  const plan = providerFailureSettlementPlan({
    kind: "timeout",
    providerRequestStarted: true,
  });
  assert.equal(plan.action, "withhold");
  const safeguard = await recordAmbiguousSettlementStateSafely({
    reason: plan.reason,
    markWithheld: lifecycle.markWithheld,
    async commitProviderSpend() {
      providerSpendCommitCalls += 1;
      return true;
    },
    async recordReconciliation() {
      reconciliationCalls += 1;
      throw new Error("recorder unavailable");
    },
  });
  await lifecycle.safetyNetRelease();
  assert.equal(safeguard.providerSpendCommitted, true);
  assert.equal(safeguard.reconciliationRecorded, false);
  assert.equal(
    safeguard.reconciliationCode,
    "RECONCILIATION_RECORD_THROW"
  );
  assert.equal(lifecycle.phase(), "withheld");
  assert.equal(releaseCalls, 0);
  assert.equal(providerSpendCommitCalls, 1);
  assert.equal(reconciliationCalls, 1);
}

// A failure before subscribe() is authoritative and releases exactly once.
{
  let releaseCalls = 0;
  const lifecycle = createReservationLifecycle({
    async release() {
      releaseCalls += 1;
      return { ok: true };
    },
    async settle() {
      return { ok: true };
    },
  });
  lifecycle.assign(fakeReservation("pre-submit"));
  const plan = providerFailureSettlementPlan({
    kind: "network",
    providerRequestStarted: false,
  });
  assert.equal(plan.action, "release");
  assert.equal(plan.reason, "provider_error_before_submit");
  await lifecycle.release(plan.reason);
  await lifecycle.safetyNetRelease();
  assert.equal(releaseCalls, 1);
}

// Post-submit release is allowed only when structured provider evidence
// explicitly proves that execution never began.
{
  const plan = providerFailureSettlementPlan({
    kind: "content",
    providerRequestStarted: true,
    providerConfirmedNoExecution: true,
  });
  assert.equal(plan.action, "release");
  assert.equal(plan.reason, "provider_rejected_before_execution");
}

// The ambiguous API contract is terminal for this client call: no Retry-After
// and no automatic second POST with the same provider attempt.
{
  const clientSource = read("lib/generateClient.ts");
  const clientCompiled = ts.transpileModule(clientSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const clientModule = { exports: {} };
  new Function("require", "exports", "module", clientCompiled)(
    (id) => {
      if (id === "@/lib/createTrust") {
        return { isSafeDeliverableUrl: () => true };
      }
      if (id === "@/lib/generateRecoveryPolicy") {
        return recoveryPolicy;
      }
      if (id === "@/lib/sellerPackContract") {
        return { parseExactSellerPackServerJobs: () => null };
      }
      throw new Error(`unexpected generateClient import: ${id}`);
    },
    clientModule.exports,
    clientModule
  );
  const originalFetch = globalThis.fetch;
  let generatePostCalls = 0;
  let otherFetchCalls = 0;
  globalThis.fetch = async (url) => {
    if (url === "/api/generate") {
      generatePostCalls += 1;
      return {
        status: 503,
        async json() {
          return {
            error:
              "The provider response was interrupted after generation may have started. Credits remain reserved while Pikbo verifies the provider result; do not retry this attempt yet.",
            code: "DURABLE_CREDITS_UNAVAILABLE",
            refundUnconfirmed: true,
          };
        },
      };
    }
    otherFetchCalls += 1;
    throw new Error(`unexpected fetch: ${String(url)}`);
  };
  try {
    const result = await clientModule.exports.postGenerateWithRetry(
      {
        effect: "listing-spin",
        idempotencyKey: "idempotency-client-ambiguity",
        ownsRights: true,
        allowProviderSpend: true,
      },
      { maxRetries: 1 }
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "DURABLE_CREDITS_UNAVAILABLE");
    assert.equal(result.retryAfterSec, undefined);
    assert.equal(result.creditsRefunded, undefined);
    assert.equal(generatePostCalls, 1);
    assert.equal(otherFetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Image ambiguity uses the same terminal client contract: one POST, no wait,
// and no automatic retry with a new provider attempt.
{
  const imageClientSource = read("lib/imageClient.ts");
  const imageClientCompiled = ts.transpileModule(imageClientSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  let sleepCalls = 0;
  const imageClientModule = { exports: {} };
  new Function("require", "exports", "module", imageClientCompiled)(
    (id) => {
      if (id === "@/lib/createTrust") {
        return { isSafeDeliverableUrl: () => true };
      }
      if (id === "@/lib/generateClient") {
        return {
          sleep: async () => {
            sleepCalls += 1;
          },
        };
      }
      throw new Error(`unexpected imageClient import: ${id}`);
    },
    imageClientModule.exports,
    imageClientModule
  );
  const originalFetch = globalThis.fetch;
  let imagePostCalls = 0;
  let otherFetchCalls = 0;
  globalThis.fetch = async (url) => {
    if (url === "/api/image") {
      imagePostCalls += 1;
      return {
        status: 503,
        async json() {
          return {
            error:
              "The provider response was interrupted after generation may have started. Credits remain reserved while Pikbo verifies the provider result; do not retry this attempt yet.",
            code: "DURABLE_CREDITS_UNAVAILABLE",
            refundUnconfirmed: true,
          };
        },
      };
    }
    otherFetchCalls += 1;
    throw new Error(`unexpected image fetch: ${String(url)}`);
  };
  try {
    const result = await imageClientModule.exports.postImageWithRetry(
      {
        prompt: "A studio product still of an owned designer toy",
        idempotencyKey: "idempotency-image-ambiguity",
      },
      { maxRetries: 1 }
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "DURABLE_CREDITS_UNAVAILABLE");
    assert.match(result.error, /do not retry this attempt yet/i);
    assert.equal(result.retryAfterSec, undefined);
    assert.equal(result.creditsRefunded, undefined);
    assert.equal(imagePostCalls, 1);
    assert.equal(otherFetchCalls, 0);
    assert.equal(sleepCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// The process-memory image ledger persists the reconciliation-required code
// and refuses to fork a retry while the durable provider outcome is unknown.
{
  const imageJobsSource = read("lib/imageJobs.ts");
  const imageJobsCompiled = ts.transpileModule(imageJobsSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const imageJobsModule = { exports: {} };
  new Function("require", "exports", "module", imageJobsCompiled)(
    (id) => {
      if (id === "@/lib/createTrust") {
        return {
          failedLedgerCreditsOutcome: ({
            creditsRefunded,
            refundUnconfirmed,
          }) =>
            creditsRefunded === true
              ? "10 restored"
              : refundUnconfirmed === true
                ? "refund unconfirmed"
                : undefined,
          isSafeDeliverableUrl: () => true,
        };
      }
      if (id === "@/lib/generationReliability.mjs") {
        return {
          deadlineExpired: (deadlineAt, nowMs = Date.now()) =>
            Date.parse(deadlineAt) <= nowMs,
          deadlineRemainingMs: (deadlineAt, nowMs = Date.now()) =>
            Math.max(0, Date.parse(deadlineAt) - nowMs),
          fixedDeadlineAt: (startMs, timeoutMs) =>
            new Date(startMs + timeoutMs).toISOString(),
          mintRetryToken: () => "retry-token-image-ambiguity",
          retryTokenDigest: (value) => `digest:${value}`,
          retryTokenMatches: (digest, value) =>
            digest === `digest:${value}`,
        };
      }
      throw new Error(`unexpected imageJobs import: ${id}`);
    },
    imageJobsModule.exports,
    imageJobsModule
  );
  const opened = imageJobsModule.exports.beginImageJob({
    sessionId: "session-image-ambiguity",
    prompt: "Owned designer toy product still",
    aspect: "3:4",
    idempotencyKey: "idempotency-image-ledger",
  });
  const withheld = imageJobsModule.exports.failImageJob({
    jobId: opened.id,
    sessionId: opened.sessionId,
    prompt: opened.prompt,
    error:
      "Provider outcome interrupted; credits remain reserved for reconciliation.",
    errorCode: "DURABLE_CREDITS_UNAVAILABLE",
    refundUnconfirmed: true,
    idempotencyKey: opened.idempotencyKey,
  });
  assert.equal(withheld.status, "failed");
  assert.equal(withheld.errorCode, "DURABLE_CREDITS_UNAVAILABLE");
  assert.equal(withheld.creditsRefunded, undefined);
  assert.equal(withheld.creditsOutcome, "refund unconfirmed");
  const sameKey = imageJobsModule.exports.beginImageJob({
    sessionId: opened.sessionId,
    prompt: opened.prompt,
    aspect: opened.aspect,
    idempotencyKey: opened.idempotencyKey,
  });
  assert.equal(sameKey.id, opened.id);
  assert.equal(sameKey.errorCode, "DURABLE_CREDITS_UNAVAILABLE");
  const fork = imageJobsModule.exports.forkRetryImageJob({
    sessionId: opened.sessionId,
    parentId: opened.id,
  });
  assert.equal(fork.ok, false);
  assert.equal(fork.code, "JOB_IN_FLIGHT");
  assert.match(fork.message, /still being reconciled|do not retry/i);

  const canceled = imageJobsModule.exports.beginImageJob({
    sessionId: "session-image-canceled-ambiguity",
    prompt: "Owned toy still canceled during provider polling",
    idempotencyKey: "idempotency-image-canceled",
  });
  imageJobsModule.exports.cancelImageJob({
    sessionId: canceled.sessionId,
    id: canceled.id,
  });
  const canceledWithheld = imageJobsModule.exports.failImageJob({
    jobId: canceled.id,
    sessionId: canceled.sessionId,
    prompt: canceled.prompt,
    error: "Provider outcome unknown after the client canceled polling.",
    errorCode: "DURABLE_CREDITS_UNAVAILABLE",
    refundUnconfirmed: true,
    idempotencyKey: canceled.idempotencyKey,
  });
  assert.equal(canceledWithheld.status, "failed");
  assert.equal(
    canceledWithheld.errorCode,
    "DURABLE_CREDITS_UNAVAILABLE"
  );
  assert.equal(
    imageJobsModule.exports.forkRetryImageJob({
      sessionId: canceled.sessionId,
      parentId: canceled.id,
    }).code,
    "JOB_IN_FLIGHT"
  );

  const timedOut = imageJobsModule.exports.beginImageJob({
    sessionId: "session-image-timeout-ambiguity",
    prompt: "Owned toy still whose local deadline elapsed",
    idempotencyKey: "idempotency-image-timeout",
  });
  imageJobsModule.exports.failImageJob({
    jobId: timedOut.id,
    sessionId: timedOut.sessionId,
    prompt: timedOut.prompt,
    error: "Local image deadline elapsed.",
    errorCode: "TIMEOUT",
    refundUnconfirmed: true,
    idempotencyKey: timedOut.idempotencyKey,
  });
  const timedOutWithheld = imageJobsModule.exports.failImageJob({
    jobId: timedOut.id,
    sessionId: timedOut.sessionId,
    prompt: timedOut.prompt,
    error: "Provider returned after the local deadline.",
    errorCode: "DURABLE_CREDITS_UNAVAILABLE",
    refundUnconfirmed: true,
    idempotencyKey: timedOut.idempotencyKey,
  });
  assert.equal(
    timedOutWithheld.errorCode,
    "DURABLE_CREDITS_UNAVAILABLE"
  );
  assert.equal(
    imageJobsModule.exports.forkRetryImageJob({
      sessionId: timedOut.sessionId,
      parentId: timedOut.id,
    }).code,
    "JOB_IN_FLIGHT"
  );

  const captureFailed = imageJobsModule.exports.beginImageJob({
    sessionId: "session-image-capture-ambiguity",
    prompt: "Owned toy still whose credit capture failed",
    idempotencyKey: "idempotency-image-capture",
  });
  const captureWithheld = imageJobsModule.exports.failImageJob({
    jobId: captureFailed.id,
    sessionId: captureFailed.sessionId,
    prompt: captureFailed.prompt,
    error: "Provider succeeded but durable credit capture failed.",
    errorCode: "DURABLE_CREDITS_UNAVAILABLE",
    refundUnconfirmed: true,
    idempotencyKey: captureFailed.idempotencyKey,
  });
  assert.equal(
    captureWithheld.errorCode,
    "DURABLE_CREDITS_UNAVAILABLE"
  );
  assert.equal(
    imageJobsModule.exports.forkRetryImageJob({
      sessionId: captureFailed.sessionId,
      parentId: captureFailed.id,
    }).code,
    "JOB_IN_FLIGHT"
  );

  const racedCancel = imageJobsModule.exports.beginImageJob({
    sessionId: "session-image-cancel-fork-race",
    prompt: "Owned toy still canceled before a late provider success",
    aspect: "3:4",
    idempotencyKey: "idempotency-image-cancel-fork-race",
  });
  imageJobsModule.exports.cancelImageJob({
    sessionId: racedCancel.sessionId,
    id: racedCancel.id,
  });
  const racedFork = imageJobsModule.exports.forkRetryImageJob({
    sessionId: racedCancel.sessionId,
    parentId: racedCancel.id,
  });
  assert.equal(racedFork.ok, true);
  imageJobsModule.exports.failImageJob({
    jobId: racedCancel.id,
    sessionId: racedCancel.sessionId,
    prompt: racedCancel.prompt,
    error: "The original provider returned after the retry was offered.",
    errorCode: "DURABLE_CREDITS_UNAVAILABLE",
    refundUnconfirmed: true,
    idempotencyKey: racedCancel.idempotencyKey,
  });
  const racedClaim = imageJobsModule.exports.claimRetryImageJob({
    sessionId: racedCancel.sessionId,
    retryJobId: racedFork.job.id,
    retryToken: racedFork.retryToken,
    prompt: racedCancel.prompt,
    aspect: racedCancel.aspect,
    idempotencyKey: "idempotency-image-raced-child",
  });
  assert.equal(racedClaim.ok, false);
  assert.equal(racedClaim.code, "RETRY_JOB_NOT_READY");

  const postClaimRace = imageJobsModule.exports.beginImageJob({
    sessionId: "session-image-post-claim-race",
    prompt: "Owned toy still whose parent changes after child claim",
    aspect: "3:4",
    idempotencyKey: "idempotency-image-post-claim-parent",
  });
  imageJobsModule.exports.cancelImageJob({
    sessionId: postClaimRace.sessionId,
    id: postClaimRace.id,
  });
  const postClaimFork = imageJobsModule.exports.forkRetryImageJob({
    sessionId: postClaimRace.sessionId,
    parentId: postClaimRace.id,
  });
  assert.equal(postClaimFork.ok, true);
  const postClaimChild = imageJobsModule.exports.claimRetryImageJob({
    sessionId: postClaimRace.sessionId,
    retryJobId: postClaimFork.job.id,
    retryToken: postClaimFork.retryToken,
    prompt: postClaimRace.prompt,
    aspect: postClaimRace.aspect,
    idempotencyKey: "idempotency-image-post-claim-child",
  });
  assert.equal(postClaimChild.ok, true);
  imageJobsModule.exports.failImageJob({
    jobId: postClaimRace.id,
    sessionId: postClaimRace.sessionId,
    prompt: postClaimRace.prompt,
    error: "The original provider returned during retry reservation.",
    errorCode: "DURABLE_CREDITS_UNAVAILABLE",
    refundUnconfirmed: true,
    idempotencyKey: postClaimRace.idempotencyKey,
  });
  const postClaimProviderStart =
    imageJobsModule.exports.markImageProviderRequestStarted(
      postClaimChild.job.id
    );
  assert.equal(postClaimProviderStart.ok, false);
  assert.equal(postClaimProviderStart.code, "PARENT_RECONCILING");

  const startedThenCanceled = imageJobsModule.exports.beginImageJob({
    sessionId: "session-image-started-then-canceled",
    prompt: "Owned toy still canceled after provider submission",
    aspect: "3:4",
    idempotencyKey: "idempotency-image-started-canceled",
  });
  assert.equal(
    imageJobsModule.exports.markImageProviderRequestStarted(
      startedThenCanceled.id
    ).ok,
    true
  );
  imageJobsModule.exports.cancelImageJob({
    sessionId: startedThenCanceled.sessionId,
    id: startedThenCanceled.id,
  });
  const startedCancelFork = imageJobsModule.exports.forkRetryImageJob({
    sessionId: startedThenCanceled.sessionId,
    parentId: startedThenCanceled.id,
  });
  assert.equal(startedCancelFork.ok, false);
  assert.equal(startedCancelFork.code, "JOB_IN_FLIGHT");

  const ordinaryCanceled = imageJobsModule.exports.beginImageJob({
    sessionId: "session-image-ordinary-cancel",
    prompt: "Owned toy still canceled before provider success evidence",
    aspect: "3:4",
    idempotencyKey: "idempotency-image-ordinary-cancel",
  });
  imageJobsModule.exports.cancelImageJob({
    sessionId: ordinaryCanceled.sessionId,
    id: ordinaryCanceled.id,
  });
  const ordinaryRetry = imageJobsModule.exports.forkRetryImageJob({
    sessionId: ordinaryCanceled.sessionId,
    parentId: ordinaryCanceled.id,
  });
  assert.equal(ordinaryRetry.ok, true);
  const ordinaryClaim = imageJobsModule.exports.claimRetryImageJob({
    sessionId: ordinaryCanceled.sessionId,
    retryJobId: ordinaryRetry.job.id,
    retryToken: ordinaryRetry.retryToken,
    prompt: ordinaryCanceled.prompt,
    aspect: ordinaryCanceled.aspect,
    idempotencyKey: "idempotency-image-ordinary-child",
  });
  assert.equal(ordinaryClaim.ok, true);
  assert.equal(
    imageJobsModule.exports.markImageProviderRequestStarted(
      ordinaryCanceled.id
    ).ok,
    false
  );
  assert.equal(
    imageJobsModule.exports.markImageProviderRequestStarted(
      ordinaryClaim.job.id
    ).ok,
    true
  );
}

const source = read("lib/durableProviderBudget.ts");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;
const loaded = { exports: {} };
new Function("require", "exports", "module", compiled)(
  (id) => {
    if (id === "@/lib/supabase/server") {
      return { getSupabaseAdmin: () => null };
    }
    if (id === "@/lib/liveGenerationCostGuard") {
      return {
        estimateSeedance2JobUsd: () => ({
          amountUsd: 1.517,
          kind: "estimated",
          label: "estimated",
        }),
        buildSeedance2CostAudit: (input) => ({
          modelId: input.modelId,
          durationSec: input.durationSec,
          resolution: input.resolution,
          estimated: {
            amountUsd: 1.517,
            kind: "estimated",
            label: "estimated",
          },
          ceiling: {
            amountUsd: input.remainingAfterReserveUsd,
            kind: "ceiling",
            label: "ceiling",
          },
          actual: null,
          note: "fixture",
        }),
      };
    }
    if (id === "@/lib/models") {
      return {
        SEEDANCE_FAST: "bytedance/seedance-2.0/fast/image-to-video",
        SEEDANCE_FULL: "bytedance/seedance-2.0/image-to-video",
      };
    }
    throw new Error(`unexpected import: ${id}`);
  },
  loaded.exports,
  loaded
);

const {
  providerValidationBudgetUsd,
  providerValidationEnvironmentGate,
} = loaded.exports;
assert.equal(providerValidationBudgetUsd({}), 0);
assert.equal(
  providerValidationBudgetUsd({
    PIKBO_PROVIDER_VALIDATION_MODE: "1",
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
  }),
  0
);
assert.equal(
  providerValidationBudgetUsd({
    PIKBO_PROVIDER_VALIDATION_MODE: "1",
    PIKBO_PREVIEW_PROVIDER_VALIDATION_ENABLED: "1",
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
  }),
  20
);
assert.equal(
  providerValidationBudgetUsd({
    PIKBO_PROVIDER_VALIDATION_MODE: "1",
    PIKBO_PREVIEW_PROVIDER_VALIDATION_ENABLED: "1",
    NODE_ENV: "test",
    VERCEL_ENV: "production",
  }),
  0
);
assert.equal(
  providerValidationBudgetUsd({
    PIKBO_PROVIDER_VALIDATION_MODE: "1",
    NODE_ENV: "test",
    VERCEL_ENV: "preview",
  }),
  0
);
assert.equal(
  providerValidationBudgetUsd({
    PIKBO_PROVIDER_VALIDATION_MODE: "1",
    PIKBO_PREVIEW_PROVIDER_VALIDATION_ENABLED: "1",
    NODE_ENV: "test",
    VERCEL_ENV: "preview",
  }),
  20
);
assert.equal(
  providerValidationBudgetUsd({
    PIKBO_PROVIDER_VALIDATION_MODE: "1",
    PIKBO_PROVIDER_VALIDATION_BUDGET_USD: "5.75",
  }),
  5.75
);
assert.equal(
  providerValidationBudgetUsd({
    PIKBO_PROVIDER_VALIDATION_MODE: "1",
    PIKBO_PROVIDER_VALIDATION_BUDGET_USD: "999",
  }),
  20
);
assert.deepEqual(
  providerValidationEnvironmentGate({
    NODE_ENV: "production",
    VERCEL_ENV: "production",
    PIKBO_PREVIEW_PROVIDER_VALIDATION_ENABLED: "1",
  }),
  {
    environment: "vercel-production",
    previewOverride: false,
    environmentAllowed: false,
    productionHardClosed: true,
  }
);
assert.deepEqual(
  providerValidationEnvironmentGate({
    NODE_ENV: "test",
    VERCEL_ENV: "preview",
  }),
  {
    environment: "vercel-preview",
    previewOverride: false,
    environmentAllowed: false,
    productionHardClosed: false,
  }
);
assert.deepEqual(
  providerValidationEnvironmentGate({
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
    PIKBO_PREVIEW_PROVIDER_VALIDATION_ENABLED: "1",
  }),
  {
    environment: "vercel-preview",
    previewOverride: true,
    environmentAllowed: true,
    productionHardClosed: false,
  }
);
assert.deepEqual(
  providerValidationEnvironmentGate({
    NODE_ENV: "production",
  }),
  {
    environment: "closed",
    previewOverride: false,
    environmentAllowed: false,
    productionHardClosed: true,
  }
);

const budgetMigration = read(
  "supabase/migrations/20260729022000_provider_validation_budget.sql"
);
const pgcryptoMigration = read(
  "supabase/migrations/20260723121000_pgcrypto_extensions.sql"
);
assert.match(pgcryptoMigration, /alter extension pgcrypto set schema extensions/);
assert.match(pgcryptoMigration, /extensions\.digest\(text,text\)/);
assert.match(pgcryptoMigration, /PGCRYPTO_EXTENSIONS_SCHEMA_REQUIRED/);

assert.match(budgetMigration, /provider_validation_budgets/);
assert.match(budgetMigration, /scope text primary key/);
assert.match(budgetMigration, /check \(scope = 'project'\)/);
assert.match(budgetMigration, /provider_spend_reservations/);
assert.match(budgetMigration, /20000000/);
assert.match(budgetMigration, /pikbo_reserve_provider_spend_v1/);
assert.match(budgetMigration, /pikbo_commit_provider_spend_v1/);
assert.match(budgetMigration, /pikbo_release_provider_spend_v1/);
assert.match(budgetMigration, /pikbo_expire_provider_spend_v1/);
assert.match(budgetMigration, /expires_at <= now\(\)/);
assert.match(budgetMigration, /for update skip locked/);
assert.match(
  budgetMigration,
  /where scope = 'project'\s+for update/,
  "every account must serialize through one project-wide budget row"
);
assert.doesNotMatch(
  budgetMigration,
  /provider_validation_budgets[\s\S]{0,240}account_id uuid/,
  "the validation budget must not be scoped per account"
);
assert.match(budgetMigration, /enable row level security/);
assert.match(budgetMigration, /from public, anon, authenticated/);
assert.match(budgetMigration, /to service_role/);

const deprecatedBudgetMigration = read(
  "supabase/migrations/20260729023000_deprecate_seedance2_budget.sql"
);
assert.match(
  deprecatedBudgetMigration,
  /set ceiling_usd = spent_usd/,
  "the obsolete budget must retain zero remaining headroom"
);
assert.match(
  deprecatedBudgetMigration,
  /PROVIDER_BUDGET_V1_DEPRECATED/,
  "the obsolete RPC must fail closed"
);
assert.match(
  deprecatedBudgetMigration,
  /from public, anon, authenticated, service_role/,
  "no runtime role may execute the obsolete admission path"
);

const providerWorker = read(
  "app/api/internal/provider-budget/reconcile/route.ts"
);
assert.match(providerWorker, /PIKBO_INTERNAL_WORKER_SECRET/);
assert.match(providerWorker, /timingSafeEqual/);
assert.match(providerWorker, /suppliedBuffer\.byteLength/);
assert.match(providerWorker, /secretBuffer\.byteLength/);
assert.match(providerWorker, /expireDurableProviderSpendReservations/);
assert.doesNotMatch(
  providerWorker,
  /body\.(userId|accountId|reservationId|amount|expiredBefore)/,
  "worker input must not choose an owner, reservation, amount, or cutoff"
);
const health = read("app/api/health/route.ts");
assert.match(health, /providerValidationBudgetUsd/);
assert.match(health, /providerValidationEnvironmentGate/);
assert.match(health, /productionHardClosed/);
assert.match(health, /SELLER_PACK_LIVE_MODEL_ID/);
assert.match(health, /SELLER_PACK_LIVE_RESOLUTION/);

const models = read("lib/models.ts");
assert.match(
  models,
  /SELLER_PACK_LIVE_RESOLUTION:\s*SeedanceResolution\s*=\s*"720p"/
);
assert.match(
  models,
  /SELLER_PACK_LIVE_MODEL_ID\s*=\s*"seedance-fast"/
);
const meRoute = read("app/api/me/route.ts");
assert.match(meRoute, /capability\.canLiveGenerate[\s\S]*SELLER_PACK_LIVE_MODEL_ID/);
assert.match(
  meRoute,
  /capability\.canLiveGenerate[\s\S]*SELLER_PACK_LIVE_RESOLUTION/
);

const settlementGuard = read(
  "supabase/migrations/20260729021000_private_settlement_guard.sql"
);
assert.match(settlementGuard, /PRIVATE_RESULT_REQUIRED/);
assert.match(settlementGuard, /output_object_key is distinct from v_expected_key/);
assert.match(settlementGuard, /output_content_type is distinct from 'video\/mp4'/);
assert.match(settlementGuard, /output_sha256 !~ '\^\[a-f0-9\]\{64\}\$'/);
assert.match(settlementGuard, /pack_run_id is null/);

const generate = read("app/api/generate/route.ts");
const imageRoute = read("app/api/image/route.ts");
assert.match(generate, /reserveDurableProviderSpend/);
assert.match(generate, /commitDurableProviderSpend/);
assert.match(generate, /releaseDurableProviderSpend/);
assert.match(generate, /providerRequestStarted = true/);
assert.match(
  generate,
  /recordAmbiguousSettlementStateSafely\(\{[\s\S]*markWithheld:\s*reservationLife\.markWithheld[\s\S]*recordSellerPackReconciliation/
);
assert.match(
  generate,
  /packRunId:\s*activePackChild\.packRunId[\s\S]*jobId:\s*activePackChild\.packJobId[\s\S]*attemptKey:\s*activePackChild\.attemptKey[\s\S]*eventType:\s*"settlement_unknown"/
);
assert.doesNotMatch(
  generate,
  /providerRequestStarted[\s\S]{0,500}releaseReservation\("provider_error"\)/
);
const ambiguousCatchStart = generate.indexOf(
  'if (settlementPlan.action === "withhold")'
);
const ambiguousCatchEnd = generate.indexOf(
  "await releaseProviderSpendIfHeld();",
  ambiguousCatchStart
);
const ambiguousCatch = generate.slice(
  ambiguousCatchStart,
  ambiguousCatchEnd
);
assert.match(
  ambiguousCatch,
  /refundUnconfirmed:\s*settlementPlan\.refundUnconfirmed/
);
assert.doesNotMatch(ambiguousCatch, /creditsRefunded|retryAfterSec|noteFailed/);
assert.match(generate, /bindProviderSpendIntent\(serverAccess,\s*allowProviderSpend\)/);
assert.ok(
  generate.indexOf("bindProviderSpendIntent(serverAccess") <
    generate.indexOf("reserveDurableProviderSpend({"),
  "client cached intent must fence provider spend before any USD reservation"
);
assert.match(
  generate,
  /const resolution = access\.kind === "live"\s*\?\s*SELLER_PACK_LIVE_RESOLUTION/,
  "every admitted private live validation must use the fixed 720p contract"
);
assert.ok(
  generate.indexOf("reserveDurableProviderSpend({") <
    generate.indexOf("reserveStrictLiveGenerationWithAsset({"),
  "provider USD reservation must precede credit reserve"
);
assert.ok(
  generate.indexOf("savePrivateGenerationResult({") <
    generate.indexOf("reservationLife.settle("),
  "private object must precede credit settlement"
);
assert.doesNotMatch(generate, /tryReservePaidCeilingUsd/);

assert.match(imageRoute, /let providerRequestStarted = false/);
assert.match(
  imageRoute,
  /invokeReservedProvider\([\s\S]*\(\) => \{[\s\S]*markImageProviderRequestStarted\(liveJobId\)[\s\S]*providerRequestStarted = true;[\s\S]*return fal\.subscribe\(IMAGE_MODEL/,
  "image provider attempt must be marked started inside the gated callback immediately before subscribe"
);
assert.match(
  imageRoute,
  /providerFailureSettlementPlan\(\{[\s\S]*kind,[\s\S]*providerRequestStarted/
);
assert.match(
  imageRoute,
  /recordAmbiguousSettlementStateSafely\(\{[\s\S]*markWithheld:\s*\(reason\) => \{[\s\S]*reservationLife\.markWithheld\(reason\);[\s\S]*markImageReconciliationPending\(settlementPlan\.error\);[\s\S]*recordSettlementUnknown\(target/
);
assert.match(
  imageRoute,
  /"provider_error_before_submit"[\s\S]*"provider_rejected_before_execution"/
);
assert.match(
  imageRoute,
  /code === "DURABLE_CREDITS_UNAVAILABLE"[\s\S]{0,80}\?\s*503/
);
const imageAmbiguousStart = imageRoute.indexOf(
  'if (settlementPlan.action === "withhold")'
);
const imageAmbiguousEnd = imageRoute.indexOf(
  "const released = await releaseReservation(settlementPlan.reason);",
  imageAmbiguousStart
);
assert.ok(
  imageAmbiguousStart > 0 && imageAmbiguousEnd > imageAmbiguousStart,
  "image ambiguous branch must precede the authoritative pre-submit release"
);
const imageAmbiguousBranch = imageRoute.slice(
  imageAmbiguousStart,
  imageAmbiguousEnd
);
assert.match(imageAmbiguousBranch, /code:\s*settlementPlan\.code/);
assert.match(imageAmbiguousBranch, /status:\s*settlementPlan\.status/);
assert.match(
  imageAmbiguousBranch,
  /refundUnconfirmed:\s*settlementPlan\.refundUnconfirmed/
);
assert.match(
  imageAmbiguousBranch,
  /markWithheld:\s*\(reason\) => \{[\s\S]*markImageReconciliationPending\(settlementPlan\.error\);[\s\S]*commitProviderSpend/
);
assert.doesNotMatch(
  imageAmbiguousBranch,
  /releaseReservation|creditsRefunded|retryAfterSec|Retry-After/
);
const imageJobs = read("lib/imageJobs.ts");
assert.match(
  imageRoute,
  /const markImageReconciliationPending = \(error: string\) => \{[\s\S]*errorCode:\s*"DURABLE_CREDITS_UNAVAILABLE"[\s\S]*refundUnconfirmed:\s*true/
);
const imageLateOutputStart = imageRoute.indexOf(
  "const completionDecision = providerCompletionDecision(deadlineState);"
);
const imageCaptureStart = imageRoute.indexOf(
  "if (!captured.ok) {",
  imageLateOutputStart
);
assert.ok(
  imageLateOutputStart > 0 && imageCaptureStart > imageLateOutputStart,
  "image late-output branch must precede capture-failure handling"
);
const imageLateOutputBranch = imageRoute.slice(
  imageLateOutputStart,
  imageCaptureStart
);
assert.match(
  imageLateOutputBranch,
  /reservationLife\.markWithheld\(completionDecision\.code\);[\s\S]*markImageReconciliationPending\(completionDecision\.message\);[\s\S]*await recordProviderSucceededWithheld/
);
const imageCaptureEnd = imageRoute.indexOf(
  "let jobId = liveJobId;",
  imageCaptureStart
);
const imageCaptureBranch = imageRoute.slice(
  imageCaptureStart,
  imageCaptureEnd
);
assert.match(
  imageCaptureBranch,
  /reservationLife\.markWithheld\("capture_failed"\);[\s\S]*markImageReconciliationPending\([\s\S]*await recordProviderSucceededWithheld/
);
assert.match(imageCaptureBranch, /refundUnconfirmed:\s*true/);
assert.match(
  imageJobs,
  /imageProviderOutcomePending\(parent\)[\s\S]*code:\s*"JOB_IN_FLIGHT"/
);
assert.match(
  imageJobs,
  /const parent = jobs\.get\(child\.parentJobId\);[\s\S]*imageProviderOutcomePending\(parent\)[\s\S]*code:\s*"RETRY_JOB_NOT_READY"/
);
assert.match(
  imageJobs,
  /export function markImageProviderRequestStarted[\s\S]*job\.status !== "running"[\s\S]*imageProviderOutcomePending\(parent\)[\s\S]*providerRequestStartedAt/
);
for (const clientPath of [
  "components/CreateStudio.tsx",
  "components/BatchStudio.tsx",
  "components/LandingToolPanel.tsx",
]) {
  assert.match(
    read(clientPath),
    /allowProviderSpend:\s*!demoMode/,
    `${clientPath} must bind the displayed mode to provider-spend consent`
  );
}

console.log(
  "provider-budget-private-settlement-regression: PASS (US$20 cap · private-object capture guard · video/image post-submit ambiguity withheld/reconciled · no automatic retry)"
);
