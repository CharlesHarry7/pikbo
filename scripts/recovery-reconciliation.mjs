import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyReconciliationEvent,
  claimReconciliationLease,
  completeReconciliationLease,
  createReconciliationCase,
  reconciliationPresentation,
} from "../lib/durableCredits/reconciliationMachine.mjs";

const root = process.cwd();
const migration = readFileSync(
  join(
    root,
    "supabase/migrations/20260727233000_r1c_generation_reconciliation.sql"
  ),
  "utf8"
);
const adapter = readFileSync(
  join(root, "lib/durableCredits/reconciliation.ts"),
  "utf8"
);
const route = readFileSync(join(root, "app/api/generate/route.ts"), "utf8");

assert.match(migration, /generation_reconciliations/);
assert.match(migration, /generation_reconciliation_events/);
assert.match(migration, /provider_succeeded_output_withheld/);
assert.match(migration, /capture_pending/);
assert.match(migration, /release_pending/);
assert.match(migration, /for update skip locked/i);
assert.match(migration, /pikbo_record_generation_outcome_v1/);
assert.match(migration, /pikbo_claim_generation_reconciliation_v1/);
assert.match(migration, /pikbo_finish_generation_reconciliation_v1/);
assert.match(migration, /pikbo_capture_generation_v1/);
assert.match(migration, /pikbo_release_generation_v1/);
assert.match(migration, /revoke all[\s\S]*anon, authenticated/i);
assert.equal(
  (migration.match(/'deliverable', false/g) || []).length,
  4,
  "every public settlement truth response must keep delivery false"
);
assert.match(adapter, /recordProviderSucceededWithheld/);
assert.match(adapter, /claimDurableReconciliation/);
assert.match(adapter, /finishDurableReconciliation/);
assert.match(adapter, /payload\.deliverable !== false/);
assert.match(route, /recordProviderSucceededWithheld/);

const base = createReconciliationCase({
  jobId: "job-1",
  reservationId: "reservation-1",
  userId: "user-1",
  nowMs: 1_000,
});
assert.deepEqual(reconciliationPresentation(base), {
  settlementCaptured: false,
  deliverable: false,
  outputRef: null,
  refund: "unconfirmed",
  withheld: true,
  settlementState: "review_required",
});

// Duplicate provider event is an exact no-op; conflicting reuse fails closed.
const providerEvent = {
  id: "provider-event-1",
  type: "provider_succeeded",
  providerRequestId: "fal-request-1",
  outputRef: "private://provider-output/job-1",
};
const provider = applyReconciliationEvent(base, providerEvent, 2_000);
assert.equal(provider.ok, true);
assert.equal(provider.state.state, "provider_succeeded_output_withheld");
assert.equal(reconciliationPresentation(provider.state).deliverable, false);
const duplicate = applyReconciliationEvent(provider.state, providerEvent, 3_000);
assert.equal(duplicate.ok, true);
assert.equal(duplicate.idempotent, true);
assert.deepEqual(duplicate.state, provider.state);
const conflict = applyReconciliationEvent(
  provider.state,
  { ...providerEvent, outputRef: "private://different-output" },
  3_000
);
assert.equal(conflict.ok, false);
assert.equal(conflict.code, "EVENT_ID_CONFLICT");

// Twenty workers race one row/version: exactly one lease wins.
class LeaseFixture {
  constructor(state) {
    this.state = state;
    this.serial = Promise.resolve();
  }
  async claim(workerId, nowMs) {
    const prior = this.serial;
    let unlock;
    this.serial = new Promise((resolve) => {
      unlock = resolve;
    });
    await prior;
    try {
      const claimed = claimReconciliationLease(
        this.state,
        {
          workerId,
          expectedVersion: provider.state.version,
          leaseMs: 30_000,
        },
        nowMs
      );
      if (claimed.ok) this.state = claimed.state;
      return claimed;
    } finally {
      unlock();
    }
  }
}
const leaseFixture = new LeaseFixture(provider.state);
const leaseClaims = await Promise.all(
  Array.from({ length: 20 }, (_, i) =>
    leaseFixture.claim(`worker-${i}`, 4_000)
  )
);
assert.equal(leaseClaims.filter((claim) => claim.ok).length, 1);
const leaseWinner = leaseClaims.find((claim) => claim.ok);
assert.ok(leaseWinner?.leaseToken);
assert.equal(leaseFixture.state.state, "capture_pending");

// Worker crash: active lease blocks takeover; after expiry another worker
// claims and settles. The stale token cannot complete.
const held = claimReconciliationLease(
  leaseFixture.state,
  {
    workerId: "worker-loser",
    expectedVersion: leaseFixture.state.version,
    leaseMs: 30_000,
  },
  5_000
);
assert.equal(held.ok, false);
assert.equal(held.code, "LEASE_HELD");
const recovered = claimReconciliationLease(
  leaseFixture.state,
  {
    workerId: "worker-recovery",
    expectedVersion: leaseFixture.state.version,
    leaseMs: 30_000,
  },
  35_001
);
assert.equal(recovered.ok, true);
const staleComplete = completeReconciliationLease(
  recovered.state,
  {
    workerId: leaseWinner.state.lease.workerId,
    leaseToken: leaseWinner.leaseToken,
    action: "capture",
    eventId: "capture-stale",
  },
  35_100
);
assert.equal(staleComplete.ok, false);
assert.equal(staleComplete.code, "LEASE_INVALID");
const capture = completeReconciliationLease(
  recovered.state,
  {
    workerId: "worker-recovery",
    leaseToken: recovered.leaseToken,
    action: "capture",
    eventId: "capture-confirmed-1",
  },
  35_100
);
assert.equal(capture.ok, true);
assert.equal(capture.state.state, "captured");
assert.equal(reconciliationPresentation(capture.state).settlementCaptured, true);
assert.equal(reconciliationPresentation(capture.state).deliverable, false);
assert.equal(reconciliationPresentation(capture.state).outputRef, null);
assert.equal(reconciliationPresentation(capture.state).withheld, true);
const captureReplay = completeReconciliationLease(
  capture.state,
  {
    workerId: "worker-recovery",
    leaseToken: recovered.leaseToken,
    action: "capture",
    eventId: "capture-confirmed-1",
  },
  35_200
);
assert.equal(captureReplay.ok, true);
assert.equal(captureReplay.idempotent, true);
assert.deepEqual(captureReplay.state, capture.state);

// Capture after a request timeout remains withheld until durable capture.
let late = createReconciliationCase({
  jobId: "job-timeout",
  reservationId: "reservation-timeout",
  userId: "user-1",
  nowMs: 1_000,
});
late = applyReconciliationEvent(
  late,
  {
    id: "timeout-observed",
    type: "settlement_unknown",
    reason: "deadline_elapsed",
  },
  2_000
).state;
late = applyReconciliationEvent(
  late,
  {
    id: "provider-late-success",
    type: "provider_succeeded",
    providerRequestId: "fal-late",
    outputRef: "private://provider-output/job-timeout",
  },
  3_000
).state;
assert.equal(reconciliationPresentation(late).deliverable, false);
const lateClaim = claimReconciliationLease(
  late,
  {
    workerId: "worker-late",
    expectedVersion: late.version,
    leaseMs: 30_000,
  },
  4_000
);
assert.equal(lateClaim.ok, true);
const lateCapture = completeReconciliationLease(
  lateClaim.state,
  {
    workerId: "worker-late",
    leaseToken: lateClaim.leaseToken,
    action: "capture",
    eventId: "capture-late",
  },
  5_000
);
assert.equal(lateCapture.ok, true);
assert.equal(
  reconciliationPresentation(lateCapture.state).settlementCaptured,
  true
);
assert.equal(reconciliationPresentation(lateCapture.state).deliverable, false);
assert.equal(reconciliationPresentation(lateCapture.state).outputRef, null);
assert.equal(reconciliationPresentation(lateCapture.state).withheld, true);

// Release/capture race is evidence-directed. Confirmed pre-output failure may
// release once; capture cannot win before or after that terminal settlement.
let failed = createReconciliationCase({
  jobId: "job-failed",
  reservationId: "reservation-failed",
  userId: "user-1",
  nowMs: 1_000,
});
failed = applyReconciliationEvent(
  failed,
  {
    id: "provider-failed-1",
    type: "confirmed_pre_output_failure",
    reason: "provider_rejected_before_output",
  },
  2_000
).state;
const failedClaim = claimReconciliationLease(
  failed,
  {
    workerId: "worker-release",
    expectedVersion: failed.version,
    leaseMs: 30_000,
  },
  3_000
);
assert.equal(failedClaim.ok, true);
const wrongCapture = completeReconciliationLease(
  failedClaim.state,
  {
    workerId: "worker-release",
    leaseToken: failedClaim.leaseToken,
    action: "capture",
    eventId: "capture-wrong",
  },
  4_000
);
assert.equal(wrongCapture.ok, false);
assert.equal(wrongCapture.code, "CAPTURE_NOT_ALLOWED");
const release = completeReconciliationLease(
  failedClaim.state,
  {
    workerId: "worker-release",
    leaseToken: failedClaim.leaseToken,
    action: "release",
    eventId: "release-confirmed-1",
  },
  4_000
);
assert.equal(release.ok, true);
assert.equal(release.state.state, "released");
assert.equal(reconciliationPresentation(release.state).refund, "confirmed");
assert.equal(reconciliationPresentation(release.state).deliverable, false);
const releaseReplay = completeReconciliationLease(
  release.state,
  {
    workerId: "worker-release",
    leaseToken: failedClaim.leaseToken,
    action: "release",
    eventId: "release-confirmed-1",
  },
  4_100
);
assert.equal(releaseReplay.ok, true);
assert.equal(releaseReplay.idempotent, true);
assert.deepEqual(releaseReplay.state, release.state);
const successAfterRelease = applyReconciliationEvent(
  release.state,
  {
    id: "provider-success-too-late",
    type: "provider_succeeded",
    providerRequestId: "fal-conflict",
    outputRef: "private://conflict",
  },
  5_000
);
assert.equal(successAfterRelease.ok, false);
assert.equal(successAfterRelease.code, "SETTLEMENT_CONFLICT");

console.log(
  "recovery-reconciliation: PASS (20-way lease winner=1; duplicate event; timeout capture; release/capture race; crash takeover)"
);
