import { createHash, randomBytes } from "node:crypto";

export const RECONCILIATION_STATES = Object.freeze([
  "review_required",
  "provider_succeeded_output_withheld",
  "capture_pending",
  "release_pending",
  "captured",
  "released",
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function fingerprintEvent(event) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        id: event.id,
        type: event.type,
        providerRequestId: event.providerRequestId || null,
        outputRef: event.outputRef || null,
        reason: event.reason || null,
      })
    )
    .digest("hex");
}

function result(state, extra = {}) {
  return { ok: true, state, ...extra };
}

function fail(state, code, error) {
  return { ok: false, state, code, error };
}

/**
 * Pure source model for the service-role reconciliation table.
 * Provider output references stay private and are never customer-deliverable
 * through this financial state machine. Delivery requires a separate verified
 * T6 server-owned derivative.
 */
export function createReconciliationCase(input) {
  const now = input.nowMs ?? Date.now();
  return {
    jobId: input.jobId,
    reservationId: input.reservationId,
    userId: input.userId,
    state: "review_required",
    providerOutcome: "unknown",
    providerRequestId: null,
    outputRef: null,
    reason: null,
    appliedEvents: {},
    version: 0,
    lease: null,
    lastCompletion: null,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
}

/**
 * Apply one provider/settlement fact. Event IDs are immutable: replaying the
 * same event is a no-op, while reusing an ID for different facts fails closed.
 */
export function applyReconciliationEvent(current, event, nowMs = Date.now()) {
  const state = clone(current);
  const fingerprint = fingerprintEvent(event);
  const prior = state.appliedEvents[event.id];
  if (prior) {
    if (prior !== fingerprint) {
      return fail(
        current,
        "EVENT_ID_CONFLICT",
        "Event id was already used for a different reconciliation fact"
      );
    }
    return result(current, { idempotent: true });
  }

  if (event.type === "provider_succeeded") {
    if (state.state === "released" || state.providerOutcome === "failed") {
      return fail(
        current,
        "SETTLEMENT_CONFLICT",
        "A released/failed case cannot accept provider success automatically"
      );
    }
    state.providerOutcome = "succeeded";
    state.providerRequestId =
      event.providerRequestId || state.providerRequestId;
    state.outputRef = event.outputRef || state.outputRef;
    if (state.state !== "captured" && state.state !== "capture_pending") {
      state.state = "provider_succeeded_output_withheld";
    }
  } else if (event.type === "confirmed_pre_output_failure") {
    if (state.state === "captured" || state.providerOutcome === "succeeded") {
      return fail(
        current,
        "SETTLEMENT_CONFLICT",
        "A captured/provider-success case cannot be released automatically"
      );
    }
    state.providerOutcome = "failed";
    state.reason = event.reason || "confirmed_pre_output_failure";
    if (state.state !== "released") state.state = "release_pending";
  } else if (event.type === "settlement_unknown") {
    if (state.state !== "captured" && state.state !== "released") {
      state.state = "review_required";
    }
    state.reason = event.reason || state.reason;
  } else if (event.type === "capture_confirmed") {
    if (
      state.providerOutcome !== "succeeded" ||
      (state.state !== "capture_pending" &&
        state.state !== "provider_succeeded_output_withheld" &&
        state.state !== "captured")
    ) {
      return fail(
        current,
        "CAPTURE_NOT_ALLOWED",
        "Capture requires withheld provider-success evidence"
      );
    }
    state.state = "captured";
  } else if (event.type === "release_confirmed") {
    if (
      state.providerOutcome !== "failed" ||
      (state.state !== "release_pending" && state.state !== "released")
    ) {
      return fail(
        current,
        "RELEASE_NOT_ALLOWED",
        "Release requires confirmed pre-output failure evidence"
      );
    }
    state.state = "released";
  } else {
    return fail(current, "UNKNOWN_EVENT", "Unknown reconciliation event");
  }

  state.appliedEvents[event.id] = fingerprint;
  state.version += 1;
  state.updatedAt = new Date(nowMs).toISOString();
  return result(state, { idempotent: false });
}

/**
 * Compare-and-set worker lease. A stale expectedVersion loses even if the
 * caller raced before it observed another worker's lease.
 */
export function claimReconciliationLease(
  current,
  input,
  nowMs = Date.now()
) {
  if (input.expectedVersion !== current.version) {
    return fail(current, "VERSION_CONFLICT", "Reconciliation row changed");
  }
  if (
    current.state !== "provider_succeeded_output_withheld" &&
    current.state !== "capture_pending" &&
    current.state !== "release_pending"
  ) {
    return fail(
      current,
      "NOT_CLAIMABLE",
      "Only evidence-backed pending settlements are claimable"
    );
  }
  const leaseExpiry = current.lease
    ? Date.parse(current.lease.expiresAt)
    : Number.NaN;
  if (
    current.lease &&
    Number.isFinite(leaseExpiry) &&
    leaseExpiry > nowMs
  ) {
    return fail(current, "LEASE_HELD", "Another worker holds this case");
  }

  const state = clone(current);
  const leaseToken =
    input.leaseToken ||
    `recon_${randomBytes(24).toString("base64url")}`;
  if (state.state === "provider_succeeded_output_withheld") {
    state.state = "capture_pending";
  }
  state.lease = {
    workerId: input.workerId,
    token: leaseToken,
    expiresAt: new Date(nowMs + input.leaseMs).toISOString(),
  };
  state.version += 1;
  state.updatedAt = new Date(nowMs).toISOString();
  return result(state, { leaseToken });
}

/**
 * Complete an evidence-backed settlement under the current worker lease.
 * Replaying a completed token/action returns the prior terminal state.
 */
export function completeReconciliationLease(
  current,
  input,
  nowMs = Date.now()
) {
  const completionKey = createHash("sha256")
    .update(`${input.leaseToken}:${input.action}`)
    .digest("hex");
  if (current.lastCompletion?.key === completionKey) {
    return result(current, { idempotent: true });
  }
  const expiry = current.lease
    ? Date.parse(current.lease.expiresAt)
    : Number.NaN;
  if (
    !current.lease ||
    current.lease.workerId !== input.workerId ||
    current.lease.token !== input.leaseToken ||
    !Number.isFinite(expiry) ||
    expiry <= nowMs
  ) {
    return fail(current, "LEASE_INVALID", "Worker lease is missing or expired");
  }

  const event =
    input.action === "capture"
      ? { id: input.eventId, type: "capture_confirmed" }
      : input.action === "release"
        ? { id: input.eventId, type: "release_confirmed" }
        : null;
  if (!event) {
    return fail(current, "ACTION_INVALID", "Unknown settlement action");
  }
  const applied = applyReconciliationEvent(current, event, nowMs);
  if (!applied.ok) return applied;
  const state = clone(applied.state);
  state.lease = null;
  state.lastCompletion = {
    key: completionKey,
    action: input.action,
    eventId: input.eventId,
    completedAt: new Date(nowMs).toISOString(),
  };
  state.version += 1;
  state.updatedAt = new Date(nowMs).toISOString();
  return result(state, { idempotent: false });
}

/**
 * Public truth. Financial capture never promotes a raw provider output into a
 * deliverable. A separate T6 server-owned derivative verifier is required.
 */
export function reconciliationPresentation(state) {
  return {
    settlementCaptured:
      state.state === "captured" &&
      state.providerOutcome === "succeeded",
    deliverable: false,
    outputRef: null,
    refund:
      state.state === "released" && state.providerOutcome === "failed"
        ? "confirmed"
        : "unconfirmed",
    withheld: true,
    settlementState: state.state,
  };
}
