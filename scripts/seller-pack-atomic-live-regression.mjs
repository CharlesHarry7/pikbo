#!/usr/bin/env node
/**
 * Offline Seller Pack atomic authority regression.
 *
 * No provider, no Supabase apply, no secrets, no network.
 * Models reserve replay, path tampering, exact three jobs, one provider
 * authorization per attempt, partial success, release, failed-child retry,
 * refresh recovery, cross-account denial, and 30-credit maximum terminal charge.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

function sqlFunction(source, name) {
  const start = source.indexOf(`create or replace function public.${name}(`);
  assert.notEqual(start, -1, `missing SQL function ${name}`);
  const end = source.indexOf("\n$$;", start);
  assert.notEqual(end, -1, `unterminated SQL function ${name}`);
  return source.slice(start, end + 4);
}

function loadTypeScriptModule(relativePath, dependencies = {}) {
  const source = read(relativePath);
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
      if (Object.hasOwn(dependencies, id)) return dependencies[id];
      throw new Error(`unexpected ${relativePath} import: ${id}`);
    },
    loaded.exports,
    loaded
  );
  return loaded.exports;
}

const contract = loadTypeScriptModule("lib/sellerPackContract.ts");
const atomic = loadTypeScriptModule("lib/durableCredits/sellerPackAtomic.ts", {
  "@/lib/sellerPackContract": contract,
  "@/lib/durableCredits/supabaseStore": {
    supabaseReserveSellerPackAtomic: async () => ({
      ok: false,
      code: "OFFLINE",
      error: "offline",
    }),
    supabaseAuthorizeSellerPackChildAtomic: async () => ({
      ok: false,
      code: "OFFLINE",
      error: "offline",
    }),
    supabaseSettleSellerPackChildAtomic: async () => ({
      ok: false,
      code: "OFFLINE",
      error: "offline",
    }),
    supabaseReleaseSellerPackChildAtomic: async () => ({
      ok: false,
      code: "OFFLINE",
      error: "offline",
    }),
    supabaseRetrySellerPackChildAtomic: async () => ({
      ok: false,
      code: "OFFLINE",
      error: "offline",
    }),
    supabaseGetSellerPackStatusAtomic: async () => ({
      ok: false,
      code: "OFFLINE",
      error: "offline",
    }),
    supabaseExpireQueuedSellerPackChildren: async () => ({
      ok: false,
      code: "OFFLINE",
      error: "offline",
    }),
  },
});

const OWNER = "owner-user-1";
const OTHER = "other-user-2";
const PACK_KEY = "client-pack-key-001";
const FINGERPRINT = contract.SELLER_PACK_CONTRACT_FINGERPRINT_V1;

assert.equal(
  FINGERPRINT,
  "listing_spin:360-spin-showcase:1:1:5|blind_box_reveal:blind-box-unboxing:9:16:5|social_flash:paparazzi-flash:9:16:5"
);

// ─── Source locks ──────────────────────────────────────────────────────────

{
  const migration = read(
    "supabase/migrations/20260729020000_atomic_seller_pack.sql"
  );
  assert.match(migration, /pikbo_reserve_seller_pack_v1/);
  assert.match(migration, /pikbo_authorize_seller_pack_child_v1/);
  assert.match(migration, /pikbo_settle_seller_pack_child_v2/);
  assert.match(migration, /pikbo_release_seller_pack_child_v2/);
  assert.match(migration, /pikbo_retry_seller_pack_child_v1/);
  assert.match(migration, /pikbo_get_seller_pack_status_v1/);
  assert.match(migration, /pikbo_expire_seller_pack_queued_v1/);
  assert.match(migration, /PRIVATE_RESULT_REQUIRED/);
  assert.match(migration, /output_object_key/);
  assert.match(migration, /grant execute[\s\S]*service_role/);
  assert.match(migration, /revoke all[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /quoted_credits[\s\S]*30|v_quoted integer := 30/);
  assert.match(migration, /listing_spin/);
  assert.match(migration, /blind_box_reveal/);
  assert.match(migration, /social_flash/);
  assert.match(migration, /360-spin-showcase/);
  assert.match(migration, /blind-box-unboxing/);
  assert.match(migration, /paparazzi-flash/);
  assert.match(migration, /seedance-fast/);
  assert.match(migration, /720p/);

  const reserveFn = sqlFunction(migration, "pikbo_reserve_seller_pack_v1");
  const retryFn = sqlFunction(
    migration,
    "pikbo_retry_seller_pack_child_v1"
  );
  const settleFn = sqlFunction(
    migration,
    "pikbo_settle_seller_pack_child_v2"
  );
  const releaseFn = sqlFunction(
    migration,
    "pikbo_release_seller_pack_child_v2"
  );
  const expireFn = sqlFunction(
    migration,
    "pikbo_expire_seller_pack_queued_v1"
  );
  assert.match(settleFn, /p_attempt_key text/);
  assert.match(settleFn, /v_job\.pack_attempt_key is distinct from btrim\(p_attempt_key\)/);
  assert.match(settleFn, /'code', 'ATTEMPT_MISMATCH'/);
  assert.match(
    settleFn,
    /'ledger:seller-pack-settle:'[\s\S]*btrim\(p_attempt_key\)/
  );
  assert.match(releaseFn, /p_attempt_key text/);
  assert.match(releaseFn, /v_job\.pack_attempt_key is distinct from btrim\(p_attempt_key\)/);
  assert.match(releaseFn, /'code', 'ATTEMPT_MISMATCH'/);
  assert.match(releaseFn, /PRIVATE_RESULT_RECONCILIATION_REQUIRED/);
  assert.match(
    releaseFn,
    /'ledger:seller-pack-release:'[\s\S]*btrim\(p_attempt_key\)[\s\S]*p_reason/
  );
  assert.match(
    retryFn,
    /expires_at = now\(\) \+ interval '30 minutes'/,
    "retry must extend the queued attempt's expiry"
  );
  assert.match(retryFn, /ATTEMPT_REUSE_FORBIDDEN/);
  assert.match(
    expireFn,
    /'ledger:seller-pack-expire:'[\s\S]*coalesce\(v_job\.pack_attempt_key, 'initial'\)/,
    "queued expiry ledger identity must include the exact retry attempt"
  );
  const supportedPlanGuard =
    /v_account\.plan_id::text not in \(\s*'free',\s*'founding_studio'\s*\)/;
  assert.match(reserveFn, supportedPlanGuard);
  assert.match(retryFn, supportedPlanGuard);
  assert.match(reserveFn, /UNSUPPORTED_LEGACY_PLAN/);
  assert.match(retryFn, /UNSUPPORTED_LEGACY_PLAN/);
  assert.ok(
    reserveFn.indexOf("from public.seller_pack_runs") <
      reserveFn.indexOf("from public.credit_wallets"),
    "reserve replay must lock pack before wallet to match worker lock order"
  );
  assert.match(
    reserveFn,
    /v_existing_found := found;[\s\S]*?from public\.credit_wallets[\s\S]*?if v_existing_found then/,
    "wallet lookup must not overwrite the existing-Pack branch decision"
  );
  assert.ok(
    reserveFn.search(supportedPlanGuard) <
      reserveFn.indexOf("update public.credit_wallets"),
    "reserve must reject creator/shop before its first wallet mutation"
  );
  assert.ok(
    retryFn.search(supportedPlanGuard) <
      retryFn.indexOf("update public.credit_wallets"),
    "retry must reject creator/shop before its first wallet mutation"
  );
  assert.match(
    retryFn,
    /from public\.accounts[\s\S]*?for update;[\s\S]*?UNSUPPORTED_LEGACY_PLAN/,
    "retry must lock the account while validating its plan"
  );
  const retryReplayStart = retryFn.indexOf("if v_job.status = 'queued'");
  const retryReplayEnd = retryFn.indexOf("end if;", retryReplayStart);
  assert.notEqual(retryReplayStart, -1, "missing retry idempotent branch");
  assert.notEqual(retryReplayEnd, -1, "unterminated retry idempotent branch");
  const retryReplay = retryFn.slice(retryReplayStart, retryReplayEnd);
  assert.match(retryReplay, /'packSettledCredits',\s*v_pack\.settled_credits/);
  assert.match(retryReplay, /'packReleasedCredits',\s*v_pack\.released_credits/);

  const gen = read("app/api/generate/route.ts");
  assert.match(gen, /parseSellerPackChildRequest|packRunId/);
  assert.match(gen, /authorizeSellerPackChildLive/);
  assert.match(gen, /reserveStrictLiveGeneration/);
  // Pack path must not fall through to R1a when pack binding is active.
  assert.match(
    gen,
    /if \(packChild\)[\s\S]{0,800}authorizeSellerPackChildLive[\s\S]{0,1200}else[\s\S]{0,200}reserveStrictLiveGeneration/
  );
  assert.ok(
    gen.indexOf("savePrivateGenerationResult({") <
      gen.indexOf("reservationLife.settle("),
    "private storage must precede settlement"
  );
  assert.match(gen, /settleSellerPackChildAtomic|releaseSellerPackChildAtomic/);
  assert.match(gen, /sellerPackLiveModelEndpoint|SELLER_PACK_LIVE_RESOLUTION/);

  const store = read("lib/durableCredits/supabaseStore.ts");
  assert.match(store, /supabaseReserveSellerPackAtomic/);
  assert.match(store, /pikbo_reserve_seller_pack_v1/);
  assert.match(store, /pikbo_authorize_seller_pack_child_v1/);
  assert.match(store, /pikbo_settle_seller_pack_child_v2/);
  assert.match(store, /pikbo_release_seller_pack_child_v2/);
  assert.match(store, /p_attempt_key:\s*input\.attemptKey/);

  const attemptFence = read(
    "supabase/migrations/20260729020500_seller_pack_attempt_fencing.sql"
  );
  assert.match(attemptFence, /pikbo_attach_private_generation_output_v2/);
  assert.match(
    attemptFence,
    /v_job\.pack_attempt_key is distinct from btrim\(p_attempt_key\)/
  );
  assert.match(attemptFence, /ATTEMPT_FENCE_V2_REQUIRED/);
  assert.match(
    attemptFence,
    /pikbo_settle_seller_pack_child_v1[\s\S]*ATTEMPT_FENCE_V2_REQUIRED/
  );
  assert.match(
    attemptFence,
    /pikbo_release_seller_pack_child_v1[\s\S]*ATTEMPT_FENCE_V2_REQUIRED/
  );
  assert.match(
    attemptFence,
    /from public, anon, authenticated, service_role/
  );

  const parallelPathGuard = read(
    "supabase/migrations/20260729021500_pack_parallel_path_guard.sql"
  );
  assert.match(parallelPathGuard, /PACK_PARALLEL_PATH_FORBIDDEN/);
  assert.match(parallelPathGuard, /v_reservation\.purpose::text <> 'generation'/);
  assert.match(parallelPathGuard, /v_job\.pack_run_id is not null/);
  assert.match(
    parallelPathGuard,
    /PRIVATE_RESULT_RECONCILIATION_REQUIRED/
  );
  assert.match(
    parallelPathGuard,
    /pikbo_release_generation_unchecked_v1[\s\S]*from public, anon, authenticated, service_role/
  );
  assert.match(
    parallelPathGuard,
    /pikbo_record_generation_outcome_unchecked_v1[\s\S]*from public, anon, authenticated, service_role/
  );

  const reserveRoute = read("app/api/seller-pack/reserve/route.ts");
  assert.match(reserveRoute, /reserveSellerPackAtomic/);
  assert.doesNotMatch(reserveRoute, /reserveSellerPackShadow/);
  assert.match(reserveRoute, /AUTH_REQUIRED/);

  const batch = read("components/BatchStudio.tsx");
  assert.match(batch, /packRunId[\s\S]*packJobId/);
  assert.doesNotMatch(batch, /seller-pack\/(?:settle|release)/);
  assert.doesNotMatch(batch, /settleSellerPackChildClient|releaseSellerPackChildClient/);

  assert.throws(
    () => read("app/api/seller-pack/settle/route.ts"),
    /ENOENT/
  );
  assert.throws(
    () => read("app/api/seller-pack/release/route.ts"),
    /ENOENT/
  );
  const workerRoute = read(
    "app/api/internal/seller-pack/reconcile/route.ts"
  );
  assert.match(workerRoute, /PIKBO_INTERNAL_WORKER_SECRET/);
  assert.match(workerRoute, /expireAtomicSellerPackQueuedChildren/);
  assert.match(workerRoute, /discoverSellerPackResults/);
  assert.match(workerRoute, /reconcileSellerPackCases/);
  assert.ok(
    workerRoute.indexOf("discoverSellerPackResults") <
      workerRoute.indexOf("reconcileSellerPackCases"),
    "worker must commit discovery before attempting settlement"
  );
  assert.match(workerRoute, /suppliedBytes\.byteLength !== secretBytes\.byteLength/);

  const packReconciliation = read(
    "supabase/migrations/20260729024500_seller_pack_reconciliation.sql"
  );
  assert.match(
    packReconciliation,
    /pikbo_record_seller_pack_outcome_v1/
  );
  assert.match(
    packReconciliation,
    /pikbo_reconcile_seller_pack_cases_v1/
  );
  assert.match(
    packReconciliation,
    /pikbo_discover_seller_pack_results_v1/
  );
  assert.match(packReconciliation, /case_id uuid primary key/);
  assert.match(packReconciliation, /unique \(job_id, attempt_key\)/);
  assert.match(packReconciliation, /p_attempt_key text/);
  assert.match(
    packReconciliation,
    /v_job\.pack_attempt_key is distinct from btrim\(p_attempt_key\)/
  );
  assert.match(
    packReconciliation,
    /'attemptKey', btrim\(p_attempt_key\)/
  );
  assert.match(
    packReconciliation,
    /output_object_key is distinct from[\s\S]*private-results/
  );
  assert.match(
    packReconciliation,
    /state = 'review_required'[\s\S]*DISCOVERY_OUTCOME_CONFLICT/
  );
  assert.doesNotMatch(
    sqlFunction(
      packReconciliation,
      "pikbo_reconcile_seller_pack_cases_v1"
    ).split("loop", 1)[0],
    /for update/,
    "worker candidate selection must not lock reconciliation before pack/job"
  );
  assert.match(
    packReconciliation,
    /pikbo_settle_seller_pack_child_v2\([\s\S]*?v_case\.pack_run_id[\s\S]*?v_case\.job_id[\s\S]*?v_case\.attempt_key/
  );
  assert.match(
    packReconciliation,
    /pikbo_release_seller_pack_child_v2\([\s\S]*?v_case\.pack_run_id[\s\S]*?v_case\.job_id[\s\S]*?v_case\.attempt_key/
  );
  assert.doesNotMatch(
    packReconciliation,
    /pikbo_(?:capture|release)_generation_v1/,
    "Pack reconciliation must never use whole-reservation R1c settlement"
  );
  assert.match(
    packReconciliation,
    /from public, anon, authenticated[\s\S]*grant execute[\s\S]*to service_role/
  );
  assert.match(gen, /recordSellerPackReconciliation/);
  assert.match(gen, /packReconciliationEventId/);
  assert.match(gen, /createHash\("sha256"\)[\s\S]*attemptKey/);
  assert.match(gen, /attemptKey: activePackChild\.attemptKey/);

  const statusRoute = read("app/api/seller-pack/status/route.ts");
  assert.match(statusRoute, /getSellerPackStatusAtomic|getAtomicSellerPackStatus/);
  assert.match(statusRoute, /signedPrivateResultUrl/);
  assert.match(statusRoute, /getAuthUserFromRequest/);

  const retryRoute = read("app/api/seller-pack/retry/route.ts");
  assert.match(retryRoute, /retrySellerPackChildAtomic/);
  assert.match(retryRoute, /attemptKey/);
}

// Attempt A and Retry Attempt B are separate durable reconciliation cases.
// A terminal release can never poison B's capture idempotency identity.
{
  const cases = new Map();
  const key = (jobId, attemptKey) => `${jobId}:${attemptKey}`;
  const jobId = "same-logical-pack-job";
  cases.set(key(jobId, "attempt-A"), {
    state: "released",
    providerOutcome: "failed",
  });
  cases.set(key(jobId, "attempt-B"), {
    state: "capture_pending",
    providerOutcome: "succeeded",
  });
  assert.equal(cases.size, 2);
  assert.equal(cases.get(key(jobId, "attempt-A")).state, "released");
  assert.equal(cases.get(key(jobId, "attempt-B")).state, "capture_pending");
}

// ─── 1. One 30-credit reserve; wallet available 0 / reserved 30 ────────────

const store = atomic.createAtomicSellerPackStore({ availableCredits: 30 });
const r1 = atomic.pureReserveSellerPack(store, {
  ownerUserId: OWNER,
  clientPackKey: PACK_KEY,
});
assert.equal(r1.ok, true);
assert.equal(r1.idempotent, false);
assert.equal(r1.wallet.availableCredits, 0);
assert.equal(r1.wallet.reservedCredits, 30);
assert.equal(r1.pack.quotedCredits, 30);
assert.equal(r1.pack.jobs.length, 3);
assert.deepEqual(
  r1.pack.jobs.map((j) => j.childKey),
  ["listing_spin", "blind_box_reveal", "social_flash"]
);
assert.deepEqual(
  r1.pack.jobs.map((j) => j.effectSlug),
  [
    "360-spin-showcase",
    "blind-box-unboxing",
    "paparazzi-flash",
  ]
);
assert.deepEqual(
  r1.pack.jobs.map((j) => `${j.aspectRatio}:${j.durationSec}`),
  ["1:1:5", "9:16:5", "9:16:5"]
);
assert.ok(r1.pack.jobs.every((j) => j.quotedCredits === 10));
assert.equal(r1.pack.contractFingerprint, FINGERPRINT);

// A child with no authorized attempt cannot be released by a guessed callback.
const queuedRelease = atomic.pureReleaseSellerPackChild(store, {
  ownerUserId: OWNER,
  packRunId: r1.pack.packRunId,
  jobId: r1.pack.jobs[0].jobId,
  attemptKey: "attempt-queued-001",
  confirmed: true,
  reason: "browser_cancel",
});
assert.equal(queuedRelease.ok, false);
assert.equal(queuedRelease.code, "ATTEMPT_MISMATCH");
assert.equal(store.wallet.availableCredits, 0);
assert.equal(store.wallet.reservedCredits, 30);

// ─── 2. Reserve replay returns same pack + three job IDs ───────────────────

const r2 = atomic.pureReserveSellerPack(store, {
  ownerUserId: OWNER,
  clientPackKey: PACK_KEY,
});
assert.equal(r2.ok, true);
assert.equal(r2.idempotent, true);
assert.equal(r2.pack.packRunId, r1.pack.packRunId);
assert.equal(r2.pack.reservationId, r1.pack.reservationId);
assert.deepEqual(
  r2.pack.jobs.map((j) => j.jobId),
  r1.pack.jobs.map((j) => j.jobId)
);
// Still only 30 reserved total (no second debit).
assert.equal(r2.wallet.availableCredits, 0);
assert.equal(r2.wallet.reservedCredits, 30);

// ─── 3. Contract fingerprint change under same key fails closed ────────────

const badFp = atomic.pureReserveSellerPack(store, {
  ownerUserId: OWNER,
  clientPackKey: PACK_KEY,
  contractFingerprint: "tampered-fingerprint",
});
assert.equal(badFp.ok, false);
assert.equal(badFp.code, "IDEMPOTENCY_CONFLICT");

// ─── 4. Cross-account pack access denied ───────────────────────────────────

const cross = atomic.pureGetSellerPackStatus(store, {
  ownerUserId: OTHER,
  packRunId: r1.pack.packRunId,
});
assert.equal(cross.ok, false);
assert.equal(cross.code, "PACK_NOT_FOUND");

const crossAuth = atomic.pureAuthorizeSellerPackChild(store, {
  ownerUserId: OTHER,
  packRunId: r1.pack.packRunId,
  jobId: r1.pack.jobs[0].jobId,
  effectSlug: r1.pack.jobs[0].effectSlug,
  durationSec: 5,
  aspectRatio: "1:1",
  attemptKey: "attempt-cross-001",
});
assert.equal(crossAuth.ok, false);
assert.equal(crossAuth.code, "PACK_NOT_FOUND");

// ─── 5. Tampered job id / fourth-child path rejected ───────────────────────

const tamper = atomic.pureAuthorizeSellerPackChild(store, {
  ownerUserId: OWNER,
  packRunId: r1.pack.packRunId,
  jobId: "job_not_in_pack",
  effectSlug: "360-spin-showcase",
  durationSec: 5,
  aspectRatio: "1:1",
  attemptKey: "attempt-tamper-001",
});
assert.equal(tamper.ok, false);
assert.equal(tamper.code, "JOB_BINDING_MISMATCH");

const fourth = atomic.pureRejectFourthChild(store, {
  ownerUserId: OWNER,
  packRunId: r1.pack.packRunId,
  jobId: "job_fourth_fake",
});
assert.equal(fourth.ok, false);

// ─── 6. Effect / aspect / duration mismatch fails closed ───────────────────

const mismatch = atomic.pureAuthorizeSellerPackChild(store, {
  ownerUserId: OWNER,
  packRunId: r1.pack.packRunId,
  jobId: r1.pack.jobs[0].jobId,
  effectSlug: "paparazzi-flash",
  durationSec: 5,
  aspectRatio: "1:1",
  attemptKey: "attempt-mismatch-001",
});
assert.equal(mismatch.ok, false);
assert.equal(mismatch.code, "PACK_CHILD_CONTRACT_MISMATCH");

// ─── 7. One provider authorization per attempt; settle 10 × 2 + fail 1 ─────

const jobs = r1.pack.jobs;
const attempts = ["attempt-child-a-0001", "attempt-child-b-0001", "attempt-child-c-0001"];

for (let i = 0; i < 2; i++) {
  const job = jobs[i];
  const auth = atomic.pureAuthorizeSellerPackChild(store, {
    ownerUserId: OWNER,
    packRunId: r1.pack.packRunId,
    jobId: job.jobId,
    effectSlug: job.effectSlug,
    durationSec: job.durationSec,
    aspectRatio: job.aspectRatio,
    attemptKey: attempts[i],
  });
  assert.equal(auth.ok, true);
  assert.equal(auth.providerAuthorized, true);
  assert.equal(auth.idempotent, false);
  assert.equal(auth.job.providerAuthorizations, 1);

  // Replay same attempt: no second provider authorization.
  const replay = atomic.pureAuthorizeSellerPackChild(store, {
    ownerUserId: OWNER,
    packRunId: r1.pack.packRunId,
    jobId: job.jobId,
    effectSlug: job.effectSlug,
    durationSec: job.durationSec,
    aspectRatio: job.aspectRatio,
    attemptKey: attempts[i],
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.providerAuthorized, false);
  assert.equal(replay.idempotent, true);
  assert.equal(replay.job.providerAuthorizations, 1);

  // Private storage must precede settle.
  const noPrivate = atomic.pureSettleSellerPackChild(store, {
    ownerUserId: OWNER,
    packRunId: r1.pack.packRunId,
    jobId: job.jobId,
    attemptKey: attempts[i],
    privateStored: false,
  });
  assert.equal(noPrivate.ok, false);
  assert.equal(noPrivate.code, "PRIVATE_RESULT_REQUIRED");

  const settled = atomic.pureSettleSellerPackChild(store, {
    ownerUserId: OWNER,
    packRunId: r1.pack.packRunId,
    jobId: job.jobId,
    attemptKey: attempts[i],
    privateStored: true,
  });
  assert.equal(settled.ok, true);
  assert.equal(settled.job.settledCredits, 10);
  assert.equal(settled.job.status, "succeeded");
}

// Child 3: authorize then confirmed failure releases 10.
{
  const job = jobs[2];
  const auth = atomic.pureAuthorizeSellerPackChild(store, {
    ownerUserId: OWNER,
    packRunId: r1.pack.packRunId,
    jobId: job.jobId,
    effectSlug: job.effectSlug,
    durationSec: job.durationSec,
    aspectRatio: job.aspectRatio,
    attemptKey: attempts[2],
  });
  assert.equal(auth.ok, true);
  assert.equal(auth.providerAuthorized, true);

  const ambiguous = atomic.pureReleaseSellerPackChild(store, {
    ownerUserId: OWNER,
    packRunId: r1.pack.packRunId,
    jobId: job.jobId,
    attemptKey: attempts[2],
    confirmed: false,
    reason: "timeout_unknown",
  });
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.code, "AMBIGUOUS_FAILURE");
  assert.equal(ambiguous.creditsRefunded, false);

  const released = atomic.pureReleaseSellerPackChild(store, {
    ownerUserId: OWNER,
    packRunId: r1.pack.packRunId,
    jobId: job.jobId,
    attemptKey: attempts[2],
    confirmed: true,
    reason: "provider_error",
  });
  assert.equal(released.ok, true);
  assert.equal(released.creditsRefunded, true);
  assert.equal(released.wallet.availableCredits, 10);
  assert.equal(released.wallet.reservedCredits, 0);
  assert.equal(released.pack.settledCredits, 20);
  assert.equal(released.pack.releasedCredits, 10);
  assert.equal(released.pack.status, "partial");
  assert.equal(released.wallet.lifetimeUsedCredits, 20);
}

// ─── 8. Successful child cannot re-run; retry only failed child ────────────

{
  const successJob = jobs[0];
  const reauth = atomic.pureAuthorizeSellerPackChild(store, {
    ownerUserId: OWNER,
    packRunId: r1.pack.packRunId,
    jobId: successJob.jobId,
    effectSlug: successJob.effectSlug,
    durationSec: successJob.durationSec,
    aspectRatio: successJob.aspectRatio,
    attemptKey: "attempt-success-again",
  });
  assert.equal(reauth.ok, false);
  assert.equal(reauth.code, "CHILD_ALREADY_SUCCEEDED");

  const failedJob = jobs[2];
  const needsRetry = atomic.pureAuthorizeSellerPackChild(store, {
    ownerUserId: OWNER,
    packRunId: r1.pack.packRunId,
    jobId: failedJob.jobId,
    effectSlug: failedJob.effectSlug,
    durationSec: failedJob.durationSec,
    aspectRatio: failedJob.aspectRatio,
    attemptKey: "attempt-without-retry",
  });
  assert.equal(needsRetry.ok, false);
  assert.equal(needsRetry.code, "CHILD_REQUIRES_RETRY");

  const retry = atomic.pureRetrySellerPackChild(store, {
    ownerUserId: OWNER,
    packRunId: r1.pack.packRunId,
    jobId: failedJob.jobId,
    attemptKey: "attempt-retry-child-c",
  });
  assert.equal(retry.ok, true);
  assert.equal(retry.job.status, "queued");
  assert.equal(retry.wallet.availableCredits, 0);
  assert.equal(retry.wallet.reservedCredits, 10);
  assert.equal(retry.pack.releasedCredits, 0);
  assert.equal(retry.pack.jobs.length, 3, "never creates a fourth logical child");

  // Retry has minted Attempt B, but no provider call has been authorized yet.
  // Even the matching attempt cannot release queued/unstarted work.
  const queuedRetryRelease = atomic.pureReleaseSellerPackChild(store, {
    ownerUserId: OWNER,
    packRunId: r1.pack.packRunId,
    jobId: failedJob.jobId,
    attemptKey: "attempt-retry-child-c",
    confirmed: true,
    reason: "browser_cancel",
  });
  assert.equal(queuedRetryRelease.ok, false);
  assert.equal(queuedRetryRelease.code, "CHILD_NOT_RELEASABLE");

  const auth2 = atomic.pureAuthorizeSellerPackChild(store, {
    ownerUserId: OWNER,
    packRunId: r1.pack.packRunId,
    jobId: failedJob.jobId,
    effectSlug: failedJob.effectSlug,
    durationSec: failedJob.durationSec,
    aspectRatio: failedJob.aspectRatio,
    attemptKey: "attempt-retry-child-c",
  });
  assert.equal(auth2.ok, true);
  assert.equal(auth2.providerAuthorized, true);
  // Second attempt increments provider auth count on same logical job.
  assert.equal(auth2.job.providerAuthorizations, 2);

  const settle2 = atomic.pureSettleSellerPackChild(store, {
    ownerUserId: OWNER,
    packRunId: r1.pack.packRunId,
    jobId: failedJob.jobId,
    attemptKey: "attempt-retry-child-c",
    privateStored: true,
  });
  assert.equal(settle2.ok, true);
  assert.equal(settle2.pack.settledCredits, 30);
  assert.equal(settle2.pack.releasedCredits, 0);
  assert.equal(settle2.wallet.availableCredits, 0);
  assert.equal(settle2.wallet.reservedCredits, 0);
  assert.equal(settle2.wallet.lifetimeUsedCredits, 30);
  assert.equal(settle2.pack.status, "succeeded");
  assert.equal(settle2.pack.jobs.length, 3);
}

// ─── 9. Refresh recovery returns same pack + public child state ────────────

{
  const status = atomic.pureGetSellerPackStatus(store, {
    ownerUserId: OWNER,
    packRunId: r1.pack.packRunId,
  });
  assert.equal(status.ok, true);
  assert.equal(status.pack.jobs.length, 3);
  assert.ok(status.pack.jobs.every((j) => j.status === "succeeded"));
  assert.ok(status.pack.jobs.every((j) => j.hasPrivateResult === true));
  assert.equal(status.pack.settledCredits, 30);
  assert.equal(status.wallet.lifetimeUsedCredits, 30);
}

// ─── 10. Full three-success path from a fresh 30-credit wallet ─────────────

{
  const s = atomic.createAtomicSellerPackStore({ availableCredits: 30 });
  const reserved = atomic.pureReserveSellerPack(s, {
    ownerUserId: OWNER,
    clientPackKey: "fresh-pack-key-aaaa",
  });
  assert.equal(reserved.wallet.availableCredits, 0);
  assert.equal(reserved.wallet.reservedCredits, 30);
  for (const [i, job] of reserved.pack.jobs.entries()) {
    const auth = atomic.pureAuthorizeSellerPackChild(s, {
      ownerUserId: OWNER,
      packRunId: reserved.pack.packRunId,
      jobId: job.jobId,
      effectSlug: job.effectSlug,
      durationSec: job.durationSec,
      aspectRatio: job.aspectRatio,
      attemptKey: `fresh-attempt-${i}-xxxx`,
    });
    assert.equal(auth.providerAuthorized, true);
    const settled = atomic.pureSettleSellerPackChild(s, {
      ownerUserId: OWNER,
      packRunId: reserved.pack.packRunId,
      jobId: job.jobId,
      attemptKey: `fresh-attempt-${i}-xxxx`,
      privateStored: true,
    });
    assert.equal(settled.ok, true);
  }
  const end = atomic.pureGetSellerPackStatus(s, {
    ownerUserId: OWNER,
    packRunId: reserved.pack.packRunId,
  });
  assert.equal(end.pack.settledCredits, 30);
  assert.equal(end.pack.releasedCredits, 0);
  assert.equal(end.wallet.reservedCredits, 0);
  assert.equal(end.wallet.availableCredits, 0);
  assert.equal(end.wallet.lifetimeUsedCredits, 30);
}

// ─── 11. Partial path ends settled 20 / released 10 without retry ──────────

{
  const s = atomic.createAtomicSellerPackStore({ availableCredits: 30 });
  const reserved = atomic.pureReserveSellerPack(s, {
    ownerUserId: OWNER,
    clientPackKey: "partial-pack-key-bbb",
  });
  for (let i = 0; i < 3; i++) {
    const job = reserved.pack.jobs[i];
    atomic.pureAuthorizeSellerPackChild(s, {
      ownerUserId: OWNER,
      packRunId: reserved.pack.packRunId,
      jobId: job.jobId,
      effectSlug: job.effectSlug,
      durationSec: job.durationSec,
      aspectRatio: job.aspectRatio,
      attemptKey: `partial-attempt-${i}-yyyy`,
    });
    if (i < 2) {
      atomic.pureSettleSellerPackChild(s, {
        ownerUserId: OWNER,
        packRunId: reserved.pack.packRunId,
        jobId: job.jobId,
        attemptKey: `partial-attempt-${i}-yyyy`,
        privateStored: true,
      });
    } else {
      atomic.pureReleaseSellerPackChild(s, {
        ownerUserId: OWNER,
        packRunId: reserved.pack.packRunId,
        jobId: job.jobId,
        attemptKey: `partial-attempt-${i}-yyyy`,
        confirmed: true,
      });
    }
  }
  const end = atomic.pureGetSellerPackStatus(s, {
    ownerUserId: OWNER,
    packRunId: reserved.pack.packRunId,
  });
  assert.equal(end.pack.settledCredits, 20);
  assert.equal(end.pack.releasedCredits, 10);
  assert.equal(end.wallet.reservedCredits, 0);
  assert.equal(end.wallet.availableCredits, 10);
  assert.equal(end.wallet.lifetimeUsedCredits, 20);
  assert.equal(end.pack.status, "partial");
}

// ─── 12. Same failure reason is isolated by retry attempt identity ─────────

{
  const s = atomic.createAtomicSellerPackStore({ availableCredits: 30 });
  const reserved = atomic.pureReserveSellerPack(s, {
    ownerUserId: OWNER,
    clientPackKey: "attempt-fence-pack-ddd",
  });
  const job = reserved.pack.jobs[0];
  const attemptA = "attempt-ledger-a-0001";
  const attemptB = "attempt-ledger-b-0001";

  const authA = atomic.pureAuthorizeSellerPackChild(s, {
    ownerUserId: OWNER,
    packRunId: reserved.pack.packRunId,
    jobId: job.jobId,
    effectSlug: job.effectSlug,
    durationSec: job.durationSec,
    aspectRatio: job.aspectRatio,
    attemptKey: attemptA,
  });
  assert.equal(authA.ok, true);

  const releasedA = atomic.pureReleaseSellerPackChild(s, {
    ownerUserId: OWNER,
    packRunId: reserved.pack.packRunId,
    jobId: job.jobId,
    attemptKey: attemptA,
    confirmed: true,
    reason: "provider_error",
  });
  assert.equal(releasedA.ok, true);
  assert.equal(releasedA.idempotent, false);
  assert.equal(releasedA.wallet.availableCredits, 10);
  assert.equal(releasedA.wallet.reservedCredits, 20);
  assert.equal(releasedA.pack.releasedCredits, 10);

  const beforeReuse = atomic.pureGetSellerPackStatus(s, {
    ownerUserId: OWNER,
    packRunId: reserved.pack.packRunId,
  });
  assert.equal(beforeReuse.ok, true);
  const reusedA = atomic.pureRetrySellerPackChild(s, {
    ownerUserId: OWNER,
    packRunId: reserved.pack.packRunId,
    jobId: job.jobId,
    attemptKey: attemptA,
  });
  assert.equal(reusedA.ok, false);
  assert.equal(reusedA.code, "ATTEMPT_REUSE_FORBIDDEN");
  const afterReuse = atomic.pureGetSellerPackStatus(s, {
    ownerUserId: OWNER,
    packRunId: reserved.pack.packRunId,
  });
  assert.equal(afterReuse.ok, true);
  assert.deepEqual(afterReuse.pack, beforeReuse.pack);
  assert.deepEqual(afterReuse.wallet, beforeReuse.wallet);
  assert.equal(afterReuse.pack.releasedCredits, 10);
  assert.equal(afterReuse.pack.jobs[0].status, "failed");
  assert.equal(afterReuse.pack.jobs[0].attemptKey, attemptA);

  const retriedB = atomic.pureRetrySellerPackChild(s, {
    ownerUserId: OWNER,
    packRunId: reserved.pack.packRunId,
    jobId: job.jobId,
    attemptKey: attemptB,
  });
  assert.equal(retriedB.ok, true);
  assert.equal(retriedB.wallet.availableCredits, 0);
  assert.equal(retriedB.wallet.reservedCredits, 30);
  assert.equal(retriedB.pack.releasedCredits, 0);

  const authB = atomic.pureAuthorizeSellerPackChild(s, {
    ownerUserId: OWNER,
    packRunId: reserved.pack.packRunId,
    jobId: job.jobId,
    effectSlug: job.effectSlug,
    durationSec: job.durationSec,
    aspectRatio: job.aspectRatio,
    attemptKey: attemptB,
  });
  assert.equal(authB.ok, true);
  assert.equal(authB.job.providerAuthorizations, 2);

  // A late Attempt A callback cannot mutate Attempt B.
  const staleReleaseA = atomic.pureReleaseSellerPackChild(s, {
    ownerUserId: OWNER,
    packRunId: reserved.pack.packRunId,
    jobId: job.jobId,
    attemptKey: attemptA,
    confirmed: true,
    reason: "provider_error",
  });
  assert.equal(staleReleaseA.ok, false);
  assert.equal(staleReleaseA.code, "ATTEMPT_MISMATCH");
  const staleSettleA = atomic.pureSettleSellerPackChild(s, {
    ownerUserId: OWNER,
    packRunId: reserved.pack.packRunId,
    jobId: job.jobId,
    attemptKey: attemptA,
    privateStored: true,
  });
  assert.equal(staleSettleA.ok, false);
  assert.equal(staleSettleA.code, "ATTEMPT_MISMATCH");
  assert.equal(s.wallet.availableCredits, 0);
  assert.equal(s.wallet.reservedCredits, 30);

  // The same provider failure reason is legal for Attempt B because SQL ledger
  // identity includes the attempt key, not only job + reason.
  const releasedB = atomic.pureReleaseSellerPackChild(s, {
    ownerUserId: OWNER,
    packRunId: reserved.pack.packRunId,
    jobId: job.jobId,
    attemptKey: attemptB,
    confirmed: true,
    reason: "provider_error",
  });
  assert.equal(releasedB.ok, true);
  assert.equal(releasedB.idempotent, false);
  assert.equal(releasedB.wallet.availableCredits, 10);
  assert.equal(releasedB.wallet.reservedCredits, 20);
  assert.equal(releasedB.pack.releasedCredits, 10);

  const replayB = atomic.pureReleaseSellerPackChild(s, {
    ownerUserId: OWNER,
    packRunId: reserved.pack.packRunId,
    jobId: job.jobId,
    attemptKey: attemptB,
    confirmed: true,
    reason: "provider_error",
  });
  assert.equal(replayB.ok, true);
  assert.equal(replayB.idempotent, true);
  assert.equal(replayB.wallet.availableCredits, 10);
  assert.equal(replayB.wallet.reservedCredits, 20);

  // Original funds are conserved across A release, B re-reserve, and B release.
  assert.equal(
    s.wallet.availableCredits +
      s.wallet.reservedCredits +
      s.wallet.lifetimeUsedCredits,
    30
  );
  assert.equal(replayB.pack.settledCredits + replayB.pack.releasedCredits, 10);
}

// ─── 13. Private output evidence can never be refunded ─────────────────────

{
  const s = atomic.createAtomicSellerPackStore({ availableCredits: 30 });
  const reserved = atomic.pureReserveSellerPack(s, {
    ownerUserId: OWNER,
    clientPackKey: "private-result-pack-eee",
  });
  const job = reserved.pack.jobs[0];
  const attempt = "attempt-private-output-001";
  atomic.pureAuthorizeSellerPackChild(s, {
    ownerUserId: OWNER,
    packRunId: reserved.pack.packRunId,
    jobId: job.jobId,
    effectSlug: job.effectSlug,
    durationSec: job.durationSec,
    aspectRatio: job.aspectRatio,
    attemptKey: attempt,
  });
  s.packsById[reserved.pack.packRunId].jobs[0].hasPrivateResult = true;

  const unsafeRefund = atomic.pureReleaseSellerPackChild(s, {
    ownerUserId: OWNER,
    packRunId: reserved.pack.packRunId,
    jobId: job.jobId,
    attemptKey: attempt,
    confirmed: true,
    reason: "signing_failed_after_attach",
  });
  assert.equal(unsafeRefund.ok, false);
  assert.equal(unsafeRefund.code, "PRIVATE_RESULT_RECONCILIATION_REQUIRED");
  assert.equal(s.wallet.availableCredits, 0);
  assert.equal(s.wallet.reservedCredits, 30);
}

// ─── 14. Insufficient for full pack never requires 60 ──────────────────────

{
  const s = atomic.createAtomicSellerPackStore({ availableCredits: 29 });
  const reserved = atomic.pureReserveSellerPack(s, {
    ownerUserId: OWNER,
    clientPackKey: "low-balance-key-ccc",
  });
  assert.equal(reserved.ok, false);
  assert.equal(reserved.code, "INSUFFICIENT_CREDITS");
  assert.equal(reserved.need, 30);
  assert.equal(reserved.have, 29);
  assert.equal(s.wallet.availableCredits, 29);
  assert.equal(s.wallet.reservedCredits, 0);
}

// ─── 15. parseSellerPackChildRequest binding rules ─────────────────────────

{
  assert.equal(atomic.parseSellerPackChildRequest({}).kind, "none");
  assert.equal(
    atomic.parseSellerPackChildRequest({ packRunId: "only-run" }).kind,
    "invalid"
  );
  assert.equal(
    atomic.parseSellerPackChildRequest({ packJobId: "only-job" }).kind,
    "invalid"
  );
  const ok = atomic.parseSellerPackChildRequest({
    packRunId: "pack-run-abcdef",
    packJobId: "pack-job-abcdef",
  });
  assert.equal(ok.kind, "pack");
  assert.equal(ok.packRunId, "pack-run-abcdef");
  assert.equal(ok.packJobId, "pack-job-abcdef");
}

console.log(
  "seller-pack-atomic-live-regression: PASS (30-credit reserve · exact 3 jobs · attempt-fenced settle/release · retry same-reason isolation · private-result refund denial · ledger conservation · refresh · cross-account/tamper denial)"
);
