import { getSupabaseAdmin } from "@/lib/supabase/server";

type PackReconciliationEvent = {
  userId: string;
  packRunId: string;
  jobId: string;
  attemptKey: string;
  eventId: string;
  eventType:
    | "provider_succeeded"
    | "confirmed_pre_output_failure"
    | "settlement_unknown";
  providerRequestId?: string;
  reason?: string;
};

type PackReconciliationState =
  | "review_required"
  | "capture_pending"
  | "release_pending"
  | "captured"
  | "released";

type PackReconciliationResult =
  | {
      ok: true;
      data: {
        state: PackReconciliationState;
        idempotent: boolean;
      };
    }
  | { ok: false; code: string; error: string };

function payloadOf(data: unknown): Record<string, unknown> | null {
  const value = Array.isArray(data) ? data[0] : data;
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

export async function recordSellerPackReconciliation(
  input: PackReconciliationEvent
): Promise<PackReconciliationResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: "Supabase service role unavailable",
    };
  }
  const { data, error } = await admin.rpc(
    "pikbo_record_seller_pack_outcome_v1",
    {
      p_user_id: input.userId,
      p_pack_run_id: input.packRunId,
      p_job_id: input.jobId,
      p_attempt_key: input.attemptKey.slice(0, 128),
      p_event_id: input.eventId.slice(0, 160),
      p_event_type: input.eventType,
      p_provider_request_id:
        input.providerRequestId?.slice(0, 256) || null,
      p_reason: input.reason?.slice(0, 160) || null,
    }
  );
  const payload = payloadOf(data);
  if (error || !payload || payload.ok !== true) {
    return {
      ok: false,
      code:
        typeof payload?.code === "string"
          ? payload.code
          : "PACK_RECONCILIATION_UNAVAILABLE",
      error:
        error?.message.slice(0, 160) ||
        "Pack reconciliation event was not persisted",
    };
  }
  const state = String(payload.state || "");
  if (
    ![
      "review_required",
      "capture_pending",
      "release_pending",
      "captured",
      "released",
    ].includes(state)
  ) {
    return {
      ok: false,
      code: "PACK_RECONCILIATION_INVALID_RESPONSE",
      error: "Pack reconciliation returned an invalid state",
    };
  }
  return {
    ok: true,
    data: {
      state: state as PackReconciliationState,
      idempotent: payload.idempotent === true,
    },
  };
}

export async function discoverSellerPackResults(input?: {
  limit?: number;
}): Promise<
  | {
      ok: true;
      data: {
        discoveredCases: number;
        conflictedCases: number;
      };
    }
  | { ok: false; code: string; error: string }
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: "Supabase service role unavailable",
    };
  }
  const limit = Math.min(
    100,
    Math.max(1, Math.floor(input?.limit ?? 25))
  );
  const { data, error } = await admin.rpc(
    "pikbo_discover_seller_pack_results_v1",
    { p_limit: limit }
  );
  const payload = payloadOf(data);
  if (
    error ||
    !payload ||
    payload.ok !== true ||
    typeof payload.discoveredCases !== "number" ||
    typeof payload.conflictedCases !== "number"
  ) {
    return {
      ok: false,
      code:
        typeof payload?.code === "string"
          ? payload.code
          : "PACK_RECONCILIATION_UNAVAILABLE",
      error:
        error?.message.slice(0, 160) ||
        "Pack result discovery failed",
    };
  }
  return {
    ok: true,
    data: {
      discoveredCases: payload.discoveredCases,
      conflictedCases: payload.conflictedCases,
    },
  };
}

export async function reconcileSellerPackCases(input?: {
  limit?: number;
}): Promise<
  | {
      ok: true;
      data: {
        processedCases: number;
        capturedCases: number;
        releasedCases: number;
        failedCases: number;
      };
    }
  | { ok: false; code: string; error: string }
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: "Supabase service role unavailable",
    };
  }
  const limit = Math.min(
    100,
    Math.max(1, Math.floor(input?.limit ?? 25))
  );
  const { data, error } = await admin.rpc(
    "pikbo_reconcile_seller_pack_cases_v1",
    { p_limit: limit }
  );
  const payload = payloadOf(data);
  const keys = [
    "processedCases",
    "capturedCases",
    "releasedCases",
    "failedCases",
  ] as const;
  if (
    error ||
    !payload ||
    payload.ok !== true ||
    keys.some((key) => typeof payload[key] !== "number")
  ) {
    return {
      ok: false,
      code:
        typeof payload?.code === "string"
          ? payload.code
          : "PACK_RECONCILIATION_UNAVAILABLE",
      error:
        error?.message.slice(0, 160) ||
        "Pack reconciliation worker failed",
    };
  }
  return {
    ok: true,
    data: {
      processedCases: payload.processedCases as number,
      capturedCases: payload.capturedCases as number,
      releasedCases: payload.releasedCases as number,
      failedCases: payload.failedCases as number,
    },
  };
}
