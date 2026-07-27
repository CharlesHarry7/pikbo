/**
 * R1c durable settlement reconciliation adapter.
 *
 * Service-role RPCs are the only persistence boundary. This module never
 * treats an attempted capture/release as confirmed and never exposes a
 * withheld provider output to a customer-facing response.
 */

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { StrictLiveReservation } from "@/lib/durableCredits/liveReservation";
import { recordLocalReconciliationEvent } from "@/lib/durableCredits/localReconciliationJournal";

export type DurableReconciliationState =
  | "review_required"
  | "provider_succeeded_output_withheld"
  | "capture_pending"
  | "release_pending"
  | "captured"
  | "released";

export type DurableReconciliationTruth = {
  jobId: string;
  reservationId: string;
  state: DurableReconciliationState;
  providerOutcome?: "unknown" | "succeeded" | "failed";
  settlementCaptured: boolean;
  deliverable: boolean;
  refundConfirmed: boolean;
  idempotent: boolean;
};

export type DurableReconciliationFailure = {
  ok: false;
  code: string;
  error: string;
};

type RpcPayload = Record<string, unknown>;

export async function probeDurableReconciliationSchema(): Promise<{
  configured: boolean;
  schemaReady: boolean;
  warning?: string;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      configured: false,
      schemaReady: false,
      warning: "Supabase service role unavailable",
    };
  }
  try {
    const { error } = await admin
      .from("generation_reconciliations")
      .select("job_id")
      .limit(1);
    if (error) {
      return {
        configured: true,
        schemaReady: false,
        warning: error.message.slice(0, 160),
      };
    }
    return { configured: true, schemaReady: true };
  } catch (error) {
    return {
      configured: true,
      schemaReady: false,
      warning:
        error instanceof Error
          ? error.message.slice(0, 160)
          : "Reconciliation schema probe failed",
    };
  }
}

function payloadOf(data: unknown): RpcPayload | null {
  const value = Array.isArray(data) ? data[0] : data;
  return value && typeof value === "object"
    ? (value as RpcPayload)
    : null;
}

function failure(
  code: string,
  error: string
): DurableReconciliationFailure {
  return { ok: false, code, error };
}

function parseTruth(
  payload: RpcPayload | null,
  expected?: { jobId?: string; reservationId?: string }
):
  | { ok: true; data: DurableReconciliationTruth }
  | DurableReconciliationFailure {
  if (!payload || payload.ok !== true) {
    return failure(
      typeof payload?.code === "string"
        ? payload.code
        : "RECONCILIATION_RPC_FAILED",
      typeof payload?.error === "string"
        ? payload.error
        : "Durable reconciliation RPC failed"
    );
  }
  const state = payload.state;
  if (
    typeof payload.jobId !== "string" ||
    typeof payload.reservationId !== "string" ||
    ![
      "review_required",
      "provider_succeeded_output_withheld",
      "capture_pending",
      "release_pending",
      "captured",
      "released",
    ].includes(String(state)) ||
    typeof payload.idempotent !== "boolean" ||
    typeof payload.settlementCaptured !== "boolean" ||
    typeof payload.deliverable !== "boolean" ||
    typeof payload.refundConfirmed !== "boolean" ||
    (expected?.jobId && payload.jobId !== expected.jobId) ||
    (expected?.reservationId &&
      payload.reservationId !== expected.reservationId)
  ) {
    return failure(
      "RECONCILIATION_INVALID_RESPONSE",
      "Durable reconciliation returned invalid state"
    );
  }
  if (
    payload.settlementCaptured !== (state === "captured") ||
    payload.deliverable !== false ||
    payload.refundConfirmed !== (state === "released")
  ) {
    return failure(
      "RECONCILIATION_TRUTH_MISMATCH",
      "Delivery/refund truth did not match durable settlement"
    );
  }
  const providerOutcome =
    payload.providerOutcome === "unknown" ||
    payload.providerOutcome === "succeeded" ||
    payload.providerOutcome === "failed"
      ? payload.providerOutcome
      : undefined;
  return {
    ok: true,
    data: {
      jobId: payload.jobId,
      reservationId: payload.reservationId,
      state: state as DurableReconciliationState,
      providerOutcome,
      settlementCaptured: payload.settlementCaptured,
      deliverable: payload.deliverable,
      refundConfirmed: payload.refundConfirmed,
      idempotent: payload.idempotent,
    },
  };
}

async function recordOutcome(
  reservation: StrictLiveReservation,
  input: {
    eventId: string;
    eventType:
      | "provider_succeeded"
      | "confirmed_pre_output_failure"
      | "settlement_unknown";
    providerRequestId?: string;
    outputRef?: string;
    reason?: string;
  }
): Promise<
  | { ok: true; data: DurableReconciliationTruth }
  | DurableReconciliationFailure
> {
  // Process-memory fallback always — never lose withhold facts when SQL is off.
  // Never stores outputRef string (presence flag only).
  const localType =
    input.eventType === "provider_succeeded"
      ? ("provider_succeeded_withheld" as const)
      : input.eventType === "confirmed_pre_output_failure"
        ? ("confirmed_pre_output_failure" as const)
        : ("settlement_unknown" as const);
  try {
    recordLocalReconciliationEvent({
      eventId: input.eventId,
      type: localType,
      jobId: reservation.jobId,
      reservationId: reservation.reservationId,
      userId: reservation.userId,
      reason: input.reason,
      providerRequestId: input.providerRequestId,
      hasOutputRef: Boolean(input.outputRef),
    });
  } catch {
    /* journal must never throw into the live path */
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return failure(
      "DURABLE_CREDITS_UNAVAILABLE",
      "Supabase service role unavailable — event kept in process-memory journal only"
    );
  }
  const { data, error } = await admin.rpc(
    "pikbo_record_generation_outcome_v1",
    {
      p_user_id: reservation.userId,
      p_reservation_id: reservation.reservationId,
      p_job_id: reservation.jobId,
      p_event_id: input.eventId.slice(0, 160),
      p_event_type: input.eventType,
      p_provider_request_id: input.providerRequestId?.slice(0, 256) || null,
      p_output_ref: input.outputRef?.slice(0, 2048) || null,
      p_reason: input.reason?.slice(0, 160) || null,
    }
  );
  if (error) {
    return failure(
      "DURABLE_RECONCILIATION_UNAVAILABLE",
      error.message.slice(0, 160)
    );
  }
  return parseTruth(payloadOf(data), {
    jobId: reservation.jobId,
    reservationId: reservation.reservationId,
  });
}

export function recordProviderSucceededWithheld(
  reservation: StrictLiveReservation,
  input: {
    eventId: string;
    providerRequestId: string;
    /** Private provider/server object reference; never include in public JSON. */
    outputRef: string;
    reason?: string;
  }
) {
  return recordOutcome(reservation, {
    eventId: input.eventId,
    eventType: "provider_succeeded",
    providerRequestId: input.providerRequestId,
    outputRef: input.outputRef,
    reason: input.reason,
  });
}

export function recordConfirmedPreOutputFailure(
  reservation: StrictLiveReservation,
  input: { eventId: string; reason: string }
) {
  return recordOutcome(reservation, {
    eventId: input.eventId,
    eventType: "confirmed_pre_output_failure",
    reason: input.reason,
  });
}

export function recordSettlementUnknown(
  reservation: StrictLiveReservation,
  input: { eventId: string; reason: string }
) {
  return recordOutcome(reservation, {
    eventId: input.eventId,
    eventType: "settlement_unknown",
    reason: input.reason,
  });
}

export type ClaimedDurableReconciliation = {
  jobId: string;
  reservationId: string;
  userId: string;
  state: "capture_pending" | "release_pending";
  providerOutcome: "succeeded" | "failed";
  providerRequestId?: string;
  /** Service-role worker only. Never send to browser/client logs. */
  outputRef?: string;
  reason?: string;
  workerId: string;
  leaseToken: string;
  leaseExpiresAt: string;
  attemptCount: number;
};

export async function claimDurableReconciliation(input: {
  workerId: string;
  leaseSeconds?: number;
}): Promise<
  | { ok: true; data: ClaimedDurableReconciliation }
  | DurableReconciliationFailure
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return failure(
      "DURABLE_CREDITS_UNAVAILABLE",
      "Supabase service role unavailable"
    );
  }
  const { data, error } = await admin.rpc(
    "pikbo_claim_generation_reconciliation_v1",
    {
      p_worker_id: input.workerId.slice(0, 120),
      p_lease_seconds: Math.max(
        15,
        Math.min(300, Math.floor(input.leaseSeconds ?? 60))
      ),
    }
  );
  if (error) {
    return failure(
      "DURABLE_RECONCILIATION_UNAVAILABLE",
      error.message.slice(0, 160)
    );
  }
  const payload = payloadOf(data);
  if (!payload || payload.ok !== true) {
    return failure(
      typeof payload?.code === "string" ? payload.code : "CLAIM_FAILED",
      "No durable reconciliation case was claimed"
    );
  }
  if (
    typeof payload.jobId !== "string" ||
    typeof payload.reservationId !== "string" ||
    typeof payload.userId !== "string" ||
    (payload.state !== "capture_pending" &&
      payload.state !== "release_pending") ||
    (payload.providerOutcome !== "succeeded" &&
      payload.providerOutcome !== "failed") ||
    typeof payload.workerId !== "string" ||
    typeof payload.leaseToken !== "string" ||
    typeof payload.leaseExpiresAt !== "string" ||
    typeof payload.attemptCount !== "number"
  ) {
    return failure(
      "RECONCILIATION_INVALID_RESPONSE",
      "Claim returned invalid lease data"
    );
  }
  return {
    ok: true,
    data: {
      jobId: payload.jobId,
      reservationId: payload.reservationId,
      userId: payload.userId,
      state: payload.state,
      providerOutcome: payload.providerOutcome,
      providerRequestId:
        typeof payload.providerRequestId === "string"
          ? payload.providerRequestId
          : undefined,
      outputRef:
        typeof payload.outputRef === "string" ? payload.outputRef : undefined,
      reason: typeof payload.reason === "string" ? payload.reason : undefined,
      workerId: payload.workerId,
      leaseToken: payload.leaseToken,
      leaseExpiresAt: payload.leaseExpiresAt,
      attemptCount: payload.attemptCount,
    },
  };
}

export async function finishDurableReconciliation(input: {
  workerId: string;
  leaseToken: string;
  jobId: string;
  action: "capture" | "release";
}): Promise<
  | { ok: true; data: DurableReconciliationTruth }
  | DurableReconciliationFailure
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return failure(
      "DURABLE_CREDITS_UNAVAILABLE",
      "Supabase service role unavailable"
    );
  }
  const { data, error } = await admin.rpc(
    "pikbo_finish_generation_reconciliation_v1",
    {
      p_worker_id: input.workerId.slice(0, 120),
      p_lease_token: input.leaseToken.slice(0, 256),
      p_job_id: input.jobId,
      p_action: input.action,
    }
  );
  if (error) {
    return failure(
      "DURABLE_RECONCILIATION_UNAVAILABLE",
      error.message.slice(0, 160)
    );
  }
  return parseTruth(payloadOf(data), { jobId: input.jobId });
}
