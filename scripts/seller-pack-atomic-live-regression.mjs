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
  assert.match(migration, /pikbo_settle_seller_pack_child_v1/);
  assert.match(migration, /pikbo_release_seller_pack_child_v1/);
  assert.match(migration, /pikbo_retry_seller_pack_child_v1/);
  assert.match(migration, /pikbo_get_seller_pack_status_v1/);
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

  const reserveRoute = read("app/api/seller-pack/reserve/route.ts");
  assert.match(reserveRoute, /reserveSellerPackAtomic/);
  assert.match(reserveRoute, /reserveSellerPackShadow/);

  const statusRoute = read("app/api/seller-pack/status/route.ts");
  assert.match(statusRoute, /getSellerPackStatusAtomic|getAtomicSellerPackStatus/);
  assert.match(statusRoute, /signedPrivateResultUrl/);
  assert.match(statusRoute, /getAuthUserFromRequest/);

  const retryRoute = read("app/api/seller-pack/retry/route.ts");
  assert.match(retryRoute, /retrySellerPackChildAtomic/);
  assert.match(retryRoute, /attemptKey/);
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
    privateStored: false,
  });
  assert.equal(noPrivate.ok, false);
  assert.equal(noPrivate.code, "PRIVATE_RESULT_REQUIRED");

  const settled = atomic.pureSettleSellerPackChild(store, {
    ownerUserId: OWNER,
    packRunId: r1.pack.packRunId,
    jobId: job.jobId,
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
        privateStored: true,
      });
    } else {
      atomic.pureReleaseSellerPackChild(s, {
        ownerUserId: OWNER,
        packRunId: reserved.pack.packRunId,
        jobId: job.jobId,
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

// ─── 12. Insufficient for full pack never requires 60 ──────────────────────

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

// ─── 13. parseSellerPackChildRequest binding rules ─────────────────────────

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
  "seller-pack-atomic-live-regression: PASS (30-credit reserve · exact 3 jobs · per-child 10 settle/release · same-child retry · refresh · cross-account/tamper denial · private-before-settle · no R1a on pack path)"
);
