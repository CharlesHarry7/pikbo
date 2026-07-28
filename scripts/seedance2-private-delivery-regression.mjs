/**
 * Seedance 2.0 private delivery P0 regression (no network, no FAL, no secrets).
 *
 * Proves:
 * 1. Private live selects exactly bytedance/seedance-2.0/image-to-video
 * 2. Mini/Fast/cached cannot claim processedUpload on the private path
 * 3. Paid USD ceiling defaults to zero and fail-closes before provider
 * 4. One idempotency key → one estimated ceiling hold (no double spend)
 * 5. Estimated/ceiling labeled; actual never invented
 * 6. Timeout / cancel / confirmed failure / refund-unconfirmed / late success
 *    after terminal cancel|timeout / duplicate provider completion each have
 *    explicit settlement+delivery decisions
 * 7. Private storage identity is owner-scoped; raw provider URL never delivers
 * 8. Route wiring: model lock, cost guard, private save before settle
 * 9. Migration source exists and is unapplied contract only
 *
 * Run: node scripts/seedance2-private-delivery-regression.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  cachedUploadHonesty,
} from "../lib/privateLiveBeta.mjs";
import {
  privateResultObjectKey,
  providerOutputHostAllowed,
} from "../lib/privateGenerationResultsPure.mjs";
import {
  providerCompletionDecision,
  fixedDeadlineAt,
  deadlineExpired,
} from "../lib/generationReliability.mjs";
import {
  invokeReservedProvider,
} from "../lib/liveGenerationGate.mjs";
import {
  applyReconciliationEvent,
  createReconciliationCase,
  reconciliationPresentation,
} from "../lib/durableCredits/reconciliationMachine.mjs";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const costGuardUrl = pathToFileURL(
  join(root, "lib/liveGenerationCostGuard.ts")
).href;
const modelsUrl = pathToFileURL(join(root, "lib/models.ts")).href;
const lifecycleUrl = pathToFileURL(
  join(root, "lib/reservationLifecycle.ts")
).href;

const {
  SEEDANCE2_PRIVATE_LIVE_MODEL,
  estimateSeedance2JobUsd,
  buildSeedance2CostAudit,
  costAuditForResponse,
  defaultPaidCeilingUsdFromEnv,
  parsePaidCeilingUsd,
  privateLiveSeedanceModel,
  tryReservePaidCeilingUsd,
  releasePaidCeilingUsd,
  resetPaidCeilingStoreForTests,
  isPrivateLiveSeedanceModel,
} = await import(costGuardUrl);

const {
  SEEDANCE_FULL,
  SEEDANCE_MINI,
  SEEDANCE_FAST,
  modelForPrivateLive,
  modelForTier,
} = await import(modelsUrl);

const { createReservationLifecycle } = await import(lifecycleUrl);

// generationJobs/store.ts uses @/ path aliases — source-lock + pure decision
// helpers cover terminal delivery without loading the TS module graph.
const storeSrc = read("lib/generationJobs/store.ts");

// ─── 1. Exact model identity ──────────────────────────────────────────────

{
  assert.equal(
    SEEDANCE2_PRIVATE_LIVE_MODEL,
    "bytedance/seedance-2.0/image-to-video"
  );
  assert.equal(SEEDANCE_FULL, SEEDANCE2_PRIVATE_LIVE_MODEL);
  assert.equal(modelForPrivateLive("seedance-mini"), SEEDANCE_FULL);
  assert.equal(modelForPrivateLive("seedance-fast"), SEEDANCE_FULL);
  assert.equal(modelForPrivateLive(null), SEEDANCE_FULL);
  assert.equal(privateLiveSeedanceModel("seedance-mini"), SEEDANCE_FULL);
  assert.equal(isPrivateLiveSeedanceModel(SEEDANCE_MINI), false);
  assert.equal(isPrivateLiveSeedanceModel(SEEDANCE_FAST), false);
  assert.equal(isPrivateLiveSeedanceModel(SEEDANCE_FULL), true);
  // Free tier helper still may pick Mini — private path must not use it.
  assert.equal(modelForTier({ freeTier: true }), SEEDANCE_MINI);
  assert.notEqual(modelForPrivateLive("seedance-mini"), SEEDANCE_MINI);
}

// ─── 2. Cached honesty never claims processedUpload ───────────────────────

{
  const cached = cachedUploadHonesty({
    accessKind: "cached",
    hadUpload: true,
    reason: "anonymous_cached_only",
  });
  assert.equal(cached.processedUpload, false);
  assert.equal(cached.uploadIgnored, true);
  const live = cachedUploadHonesty({ accessKind: "live", hadUpload: true });
  assert.equal(live.processedUpload, true);
}

// ─── 3. Paid ceiling defaults to zero / fail closed ───────────────────────

{
  resetPaidCeilingStoreForTests();
  assert.equal(parsePaidCeilingUsd(undefined), 0);
  assert.equal(parsePaidCeilingUsd(""), 0);
  assert.equal(parsePaidCeilingUsd("not-a-number"), 0);
  assert.equal(parsePaidCeilingUsd("-5"), 0);
  assert.equal(defaultPaidCeilingUsdFromEnv({}), 0);
  assert.equal(
    defaultPaidCeilingUsdFromEnv({ PIKBO_SEEDANCE2_PAID_CEILING_USD: undefined }),
    0
  );

  const blocked = tryReservePaidCeilingUsd({
    userId: "user-a",
    ceilingUsd: 0,
    durationSec: 5,
    resolution: "720p",
    idempotencyKey: "idem-zero-1",
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, "PAID_CEILING_ZERO");
  assert.equal(blocked.audit.estimated.label, "estimated");
  assert.equal(blocked.audit.ceiling.label, "ceiling");
  assert.equal(blocked.audit.actual, null);
  assert.match(blocked.audit.note, /never invent/i);
}

// ─── 4. One idempotency key → one estimated hold ──────────────────────────

{
  resetPaidCeilingStoreForTests();
  const userId = "11111111-1111-4111-8111-111111111111";
  const first = tryReservePaidCeilingUsd({
    userId,
    ceilingUsd: 20,
    durationSec: 5,
    resolution: "720p",
    idempotencyKey: "idem-once-abc",
  });
  assert.equal(first.ok, true);
  assert.equal(first.idempotent, false);
  assert.ok(first.estimatedJobUsd > 0);
  const spentAfterFirst = first.reservedSpentUsd;

  const replay = tryReservePaidCeilingUsd({
    userId,
    ceilingUsd: 20,
    durationSec: 5,
    resolution: "720p",
    idempotencyKey: "idem-once-abc",
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.idempotent, true);
  assert.equal(replay.estimatedJobUsd, first.estimatedJobUsd);
  assert.equal(
    replay.reservedSpentUsd,
    spentAfterFirst,
    "replay must not increase cumulative spent"
  );

  const other = tryReservePaidCeilingUsd({
    userId,
    ceilingUsd: 20,
    durationSec: 5,
    resolution: "720p",
    idempotencyKey: "idem-once-def",
  });
  assert.equal(other.ok, true);
  assert.equal(other.idempotent, false);
  assert.ok(other.reservedSpentUsd > spentAfterFirst);

  // Pre-provider release restores headroom and clears idempotency hold.
  const released = releasePaidCeilingUsd({
    userId,
    estimatedJobUsd: other.estimatedJobUsd,
    idempotencyKey: "idem-once-def",
  });
  assert.ok(released.spentUsd < other.reservedSpentUsd);
  const again = tryReservePaidCeilingUsd({
    userId,
    ceilingUsd: 20,
    durationSec: 5,
    resolution: "720p",
    idempotencyKey: "idem-once-def",
  });
  assert.equal(again.ok, true);
  assert.equal(again.idempotent, false);
}

// ─── 5. Honest cost audit labels ──────────────────────────────────────────

{
  const estimated = estimateSeedance2JobUsd({
    durationSec: 5,
    resolution: "720p",
  });
  assert.equal(estimated.kind, "estimated");
  assert.equal(estimated.label, "estimated");
  assert.ok(estimated.amountUsd > 1 && estimated.amountUsd < 3);

  const audit = buildSeedance2CostAudit({
    durationSec: 5,
    resolution: "720p",
    ceilingUsd: 10,
    remainingAfterReserveUsd: 8.48,
    actualUsd: null,
  });
  assert.equal(audit.modelId, SEEDANCE_FULL);
  assert.equal(audit.estimated.label, "estimated");
  assert.equal(audit.ceiling.label, "ceiling");
  assert.equal(audit.actual, null);

  // Inventing actual from estimate is forbidden — only explicit provider figure.
  const withActual = buildSeedance2CostAudit({
    durationSec: 5,
    resolution: "720p",
    ceilingUsd: 10,
    remainingAfterReserveUsd: 8,
    actualUsd: 1.42,
  });
  assert.equal(withActual.actual?.label, "actual");
  assert.equal(withActual.actual?.amountUsd, 1.42);

  const response = costAuditForResponse(audit);
  assert.equal(response.actualUsd, null);
  assert.equal(response.estimatedUsd.label, "estimated");
  assert.equal(response.ceilingRemainingUsd.label, "ceiling");
}

// ─── 6. Mini model rejected by paid admission ─────────────────────────────

{
  resetPaidCeilingStoreForTests();
  const mini = tryReservePaidCeilingUsd({
    userId: "user-mini",
    ceilingUsd: 50,
    durationSec: 5,
    resolution: "720p",
    modelId: SEEDANCE_MINI,
    idempotencyKey: "idem-mini-1",
  });
  assert.equal(mini.ok, false);
  assert.equal(mini.code, "MODEL_NOT_ADMITTED");
}

// ─── 7. Reservation lifecycle: one settle, no release after settle ────────

{
  let providerCalls = 0;
  let settleCalls = 0;
  let releaseCalls = 0;
  const lc = createReservationLifecycle({
    async release() {
      releaseCalls += 1;
      return { ok: true, availableCredits: 0 };
    },
    async settle() {
      settleCalls += 1;
      return { ok: true, availableCredits: 0 };
    },
  });
  lc.assign({
    reservationId: "res-seedance-1",
    jobId: "job-seedance-1",
    accountId: "acct-1",
    userId: "user-1",
    credits: 10,
    status: "reserved",
    providerAuthorized: true,
    planId: "free",
    idempotencyKey: "idem-seedance-1",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });

  const result = await invokeReservedProvider(
    {
      reservationId: "res-seedance-1",
      status: "reserved",
      providerAuthorized: true,
    },
    async () => {
      providerCalls += 1;
      return { requestId: "fal-1", data: { video: { url: "https://v3b.fal.media/x.mp4" } } };
    }
  );
  assert.equal(providerCalls, 1);
  assert.equal(result.requestId, "fal-1");

  const s1 = await lc.settle("fal-1");
  const s2 = await lc.settle("fal-1");
  assert.equal(s1.ok, true);
  assert.equal(s2.skipped, true);
  assert.equal(settleCalls, 1);
  const r = await lc.release("provider_error");
  assert.equal(r.skipped, true);
  assert.equal(releaseCalls, 0);
}

// ─── 8. Terminal states: timeout, cancel, failure, late success ───────────

{
  assert.deepEqual(providerCompletionDecision({ status: "running" }), {
    allow: true,
  });

  const canceled = providerCompletionDecision({
    status: "canceled",
    errorCode: "CANCELED",
  });
  assert.equal(canceled.allow, false);
  assert.equal(canceled.code, "REQUEST_CANCELED");

  const confirmedFail = providerCompletionDecision({
    status: "failed",
    errorCode: "GENERATION_FAILED",
  });
  assert.equal(confirmedFail.allow, false);
  assert.equal(confirmedFail.code, "GENERATION_FAILED");

  const timed = providerCompletionDecision({
    status: "failed",
    errorCode: "TIMEOUT",
  });
  assert.equal(timed.allow, false);
  assert.equal(timed.code, "TIMEOUT");

  // Pure ledger model: terminal rows refuse reopen/delivery on late success.
  function pureComplete(job, videoUrl) {
    if (job.status === "failed" || job.status === "canceled") {
      return { ...job }; // never reopen; never attach late URL
    }
    if (job.status !== "running") {
      return { ...job, status: "failed", videoUrl: undefined };
    }
    return { ...job, status: "succeeded", videoUrl };
  }
  const lateCancel = pureComplete(
    { status: "canceled", videoUrl: undefined, creditsOutcome: "refund unconfirmed" },
    "https://v3b.fal.media/late.mp4"
  );
  assert.equal(lateCancel.status, "canceled");
  assert.equal(lateCancel.videoUrl, undefined);
  assert.notEqual(lateCancel.creditsOutcome, "10 used");

  const lateTimeout = pureComplete(
    {
      status: "failed",
      errorCode: "TIMEOUT",
      videoUrl: undefined,
      creditsOutcome: "refund unconfirmed",
    },
    "https://v3b.fal.media/late-timeout.mp4"
  );
  assert.equal(lateTimeout.status, "failed");
  assert.equal(lateTimeout.videoUrl, undefined);

  // Source locks: store must implement the same terminal refuse path.
  assert.match(
    storeSrc,
    /if \(cur\.status === "failed" \|\| cur\.status === "canceled"\)/
  );
  assert.match(
    storeSrc,
    /late provider response is[\s\S]{0,80}must not reopen/
  );
  assert.match(storeSrc, /creditsOutcome: "refund unconfirmed"/);
  assert.match(
    storeSrc,
    /status: input\.status === "canceled" \? "canceled" : "failed"/
  );
}

// ─── 9. Duplicate provider completion is idempotent / non-reopening ───────

{
  // Pure webhook event map: one event id → one side effect.
  const webhookEvents = new Map();
  function applyWebhook(eventId, job, status) {
    if (webhookEvents.has(eventId)) {
      return { ok: true, duplicate: true, job: webhookEvents.get(eventId).job };
    }
    if (
      job.status === "succeeded" ||
      job.status === "failed" ||
      job.status === "canceled"
    ) {
      const next = { ...job };
      webhookEvents.set(eventId, { job: next });
      return {
        ok: true,
        duplicate: false,
        job: next,
        withheld: status === "succeeded" && job.status !== "succeeded",
      };
    }
    const next =
      status === "succeeded"
        ? { ...job, status: "succeeded", videoUrl: "https://v3b.fal.media/ok.mp4" }
        : { ...job, status: "failed", videoUrl: undefined };
    webhookEvents.set(eventId, { job: next });
    return { ok: true, duplicate: false, job: next, withheld: false };
  }

  const running = { id: "job-dup-1", status: "running" };
  const first = applyWebhook("evt-dup-1", running, "succeeded");
  assert.equal(first.duplicate, false);
  assert.equal(first.job.status, "succeeded");
  const dup = applyWebhook("evt-dup-1", first.job, "succeeded");
  assert.equal(dup.duplicate, true);
  assert.equal(dup.job.videoUrl, "https://v3b.fal.media/ok.mp4");

  const canceledJob = { id: "job-dup-cancel", status: "canceled", videoUrl: undefined };
  const lateWh = applyWebhook("evt-late-cancel", canceledJob, "succeeded");
  assert.equal(lateWh.withheld, true);
  assert.equal(lateWh.job.status, "canceled");
  assert.equal(lateWh.job.videoUrl, undefined);

  // Source locks for process-memory webhook path.
  assert.match(storeSrc, /webhookEvents\.get\(eventId\)/);
  assert.match(storeSrc, /duplicate:\s*true/);
  assert.match(
    storeSrc,
    /Job already terminal[\s\S]{0,40}webhook recorded without overwrite/
  );
  assert.match(
    storeSrc,
    /Late provider success withheld — attempt no longer running/
  );
}

// ─── 10. Reconciliation: late success never becomes deliverable free ──────

{
  const base = createReconciliationCase({
    jobId: "job-recon-1",
    reservationId: "res-recon-1",
    userId: "user-recon-1",
    nowMs: 1_000,
  });
  const provider = applyReconciliationEvent(
    base,
    {
      id: "pe-1",
      type: "provider_succeeded",
      providerRequestId: "fal-recon-1",
      outputRef: "private://provider-output/job-recon-1",
    },
    2_000
  );
  assert.equal(provider.ok, true);
  const presentation = reconciliationPresentation(provider.state);
  assert.equal(presentation.deliverable, false);
  assert.equal(presentation.withheld, true);
  const dup = applyReconciliationEvent(
    provider.state,
    {
      id: "pe-1",
      type: "provider_succeeded",
      providerRequestId: "fal-recon-1",
      outputRef: "private://provider-output/job-recon-1",
    },
    3_000
  );
  assert.equal(dup.ok, true);
  assert.equal(dup.idempotent, true);
}

// ─── 11. Private storage identity + host allowlist ────────────────────────

{
  const userId = "11111111-1111-4111-8111-111111111111";
  const jobId = "22222222-2222-4222-8222-222222222222";
  const otherUser = "33333333-3333-4333-8333-333333333333";
  assert.equal(
    privateResultObjectKey({ userId, jobId }),
    `private-results/${userId}/${jobId}.mp4`
  );
  // Owner scope is baked into the key path — cross-account key would not match.
  assert.notEqual(
    privateResultObjectKey({ userId: otherUser, jobId }),
    privateResultObjectKey({ userId, jobId })
  );
  assert.equal(
    providerOutputHostAllowed("https://v3b.fal.media/files/x.mp4", ["fal.media"]),
    true
  );
  assert.equal(
    providerOutputHostAllowed("https://evil.example/x.mp4", ["fal.media"]),
    false
  );
  assert.equal(
    providerOutputHostAllowed("http://fal.media/x.mp4", ["fal.media"]),
    false
  );
}

// ─── 12. Fixed deadline never moves; expired blocks completion ────────────

{
  const start = 1_700_000_000_000;
  const deadline = fixedDeadlineAt(start, 60_000);
  assert.equal(deadlineExpired(deadline, start + 59_000), false);
  assert.equal(deadlineExpired(deadline, start + 60_000), true);
  // Heartbeats / reads must not extend: fixedDeadlineAt is pure from start.
  assert.equal(fixedDeadlineAt(start, 60_000), deadline);
}

// ─── 13. Route + migration source locks ───────────────────────────────────

{
  const gen = read("app/api/generate/route.ts");
  assert.match(gen, /modelForPrivateLive/);
  assert.match(gen, /tryReservePaidCeilingUsd/);
  assert.match(gen, /defaultPaidCeilingUsdFromEnv|PIKBO_SEEDANCE2_PAID_CEILING/);
  assert.match(gen, /PAID_CEILING_ZERO|PAID_CEILING_EXHAUSTED/);
  assert.match(gen, /savePrivateGenerationResult/);
  assert.match(gen, /processedUpload:\s*true/);
  assert.match(gen, /privateResult:\s*true/);
  assert.match(gen, /costAudit:\s*costAuditForResponse/);
  assert.match(gen, /providerRequestId/);
  assert.doesNotMatch(
    gen,
    /modelForTier\(\{\s*freeTier:\s*false/
  );
  // Private object must be saved before credit capture.
  assert.ok(
    gen.indexOf("savePrivateGenerationResult({") <
      gen.indexOf("reservationLife.settle(")
  );
  // No raw provider URL on success payload.
  assert.match(gen, /videoUrl:\s*saved\.signedUrl/);
  assert.doesNotMatch(
    gen,
    /videoUrl:\s*videoUrl\s*,\s*\n\s*demo:\s*false/
  );

  const models = read("lib/models.ts");
  assert.match(models, /export function modelForPrivateLive/);
  assert.match(models, /return SEEDANCE_FULL/);

  const contracts = read("lib/contracts.ts");
  assert.match(contracts, /costAudit\?/);
  assert.match(contracts, /PAID_CEILING_ZERO/);
  assert.match(contracts, /label:\s*"estimated"/);

  const costGuard = read("lib/liveGenerationCostGuard.ts");
  assert.match(costGuard, /defaults to ZERO|default.*zero/i);
  assert.match(costGuard, /Never auto-recharges|never auto-recharge/i);
  assert.match(costGuard, /actualUsd/);
  assert.match(costGuard, /PIKBO_SEEDANCE2_PAID_CEILING_USD/);
  assert.doesNotMatch(costGuard, /req\.headers|document\.cookie|localStorage/);

  const migration = read(
    "supabase/migrations/20260729010000_seedance2_cost_audit.sql"
  );
  assert.match(migration, /SOURCE ONLY/);
  assert.match(migration, /seedance2_paid_ceilings/);
  assert.match(migration, /seedance2_cost_audit/);
  assert.match(migration, /pikbo_reserve_seedance2_cost_v1/);
  assert.match(migration, /bytedance\/seedance-2\.0\/image-to-video/);
  assert.match(migration, /estimated_kind text not null default 'estimated'/);
  assert.match(migration, /ceiling_kind text not null default 'ceiling'/);
  assert.match(migration, /actual_usd numeric/);
  assert.match(migration, /ceiling_usd numeric\(12, 4\) not null default 0/);
  assert.match(migration, /revoke all[\s\S]*anon, authenticated/i);

  const downloads = read("app/api/downloads/[id]/route.ts");
  assert.match(downloads, /getAuthUserFromRequest/);
  assert.match(downloads, /getPrivateGenerationResult/);
  assert.match(downloads, /signedPrivateResultUrl/);

  const generations = read("app/api/generations/route.ts");
  assert.match(generations, /listPrivateGenerationResults/);
  assert.doesNotMatch(generations, /providerOutputUrl/);

  const recover = read("app/api/generations/recover/route.ts");
  assert.match(recover, /getPrivateGenerationRecovery/);
  assert.match(recover, /processedUpload:\s*true/);
  assert.match(recover, /privateResult:\s*true/);
  assert.doesNotMatch(recover, /fal\.subscribe|invokeReservedProvider/);

  const pure = read("lib/privateGenerationResultsPure.mjs");
  assert.match(pure, /private-results\//);
  assert.match(pure, /providerOutputHostAllowed/);
}

// ─── 14. Exhausted ceiling after partial spend ────────────────────────────

{
  resetPaidCeilingStoreForTests();
  const userId = "user-exhaust";
  const a = tryReservePaidCeilingUsd({
    userId,
    ceilingUsd: 1.6,
    durationSec: 5,
    resolution: "720p",
    idempotencyKey: "idem-ex-1",
  });
  // 5s * 0.3034 ≈ 1.517 — first should pass if ceiling 1.6
  assert.equal(a.ok, true);
  const b = tryReservePaidCeilingUsd({
    userId,
    ceilingUsd: 1.6,
    durationSec: 5,
    resolution: "720p",
    idempotencyKey: "idem-ex-2",
  });
  assert.equal(b.ok, false);
  assert.equal(b.code, "PAID_CEILING_EXHAUSTED");
}

console.log(
  "seedance2-private-delivery-regression: PASS (exact Seedance 2.0 model · zero default paid ceiling · one idempotent USD hold · labeled cost audit · terminal late-result withhold · private owner storage · route+migration source locks)"
);
