/**
 * Service-role adapter for the source-only T6 durable derivative queue.
 * Raw sourceRef is returned only by the worker claim and never by public truth.
 */

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { T6DerivativeMetadata } from "@/lib/t6Worker";

type Failure = { ok: false; code: string; error: string };

export type DurableT6Truth = {
  jobId: string;
  state: "queued" | "running" | "succeeded" | "failed";
  deliverable: boolean;
  deliveryPath?: string;
  refundConfirmed: false;
  idempotent: boolean;
};

export type DurableT6Claim = {
  jobId: string;
  userId: string;
  providerRequestId: string;
  /** Service-role worker only. Never include in logs or public JSON. */
  sourceRef: string;
  idempotencyKey: string;
  objectKey: string;
  leaseToken: string;
  leaseExpiresAt: string;
  attemptCount: number;
};

function failure(code: string, error: string): Failure {
  return { ok: false, code, error };
}

function payloadOf(data: unknown): Record<string, unknown> | null {
  const value = Array.isArray(data) ? data[0] : data;
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function parseTruth(
  payload: Record<string, unknown> | null
): { ok: true; data: DurableT6Truth } | Failure {
  if (!payload || payload.ok !== true) {
    return failure(
      typeof payload?.code === "string" ? payload.code : "T6_RPC_FAILED",
      "Durable T6 operation failed"
    );
  }
  const state = payload.state;
  if (
    typeof payload.jobId !== "string" ||
    !["queued", "running", "succeeded", "failed"].includes(String(state)) ||
    typeof payload.deliverable !== "boolean" ||
    typeof payload.idempotent !== "boolean" ||
    payload.refundConfirmed !== false ||
    payload.deliverable !== (state === "succeeded") ||
    (state === "succeeded" && typeof payload.deliveryPath !== "string") ||
    (state !== "succeeded" && payload.deliveryPath != null)
  ) {
    return failure(
      "T6_TRUTH_INVALID",
      "Durable T6 truth failed closed"
    );
  }
  return {
    ok: true,
    data: {
      jobId: payload.jobId,
      state: state as DurableT6Truth["state"],
      deliverable: payload.deliverable,
      deliveryPath:
        typeof payload.deliveryPath === "string"
          ? payload.deliveryPath
          : undefined,
      refundConfirmed: false,
      idempotent: payload.idempotent,
    },
  };
}

export async function probeDurableT6Schema(): Promise<{
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
      .from("generation_derivatives")
      .select("job_id")
      .limit(1);
    return error
      ? {
          configured: true,
          schemaReady: false,
          warning: error.message.slice(0, 160),
        }
      : { configured: true, schemaReady: true };
  } catch (error) {
    return {
      configured: true,
      schemaReady: false,
      warning:
        error instanceof Error
          ? error.message.slice(0, 160)
          : "T6 schema probe failed",
    };
  }
}

export async function enqueueDurableT6Derivative(input: {
  userId: string;
  jobId: string;
}): Promise<{ ok: true; data: DurableT6Truth } | Failure> {
  const admin = getSupabaseAdmin();
  if (!admin) return failure("T6_UNAVAILABLE", "Supabase unavailable");
  const { data, error } = await admin.rpc(
    "pikbo_enqueue_t6_derivative_v1",
    {
      p_user_id: input.userId,
      p_job_id: input.jobId,
    }
  );
  if (error) return failure("T6_UNAVAILABLE", error.message.slice(0, 160));
  return parseTruth(payloadOf(data));
}

export async function claimDurableT6Derivative(input: {
  workerId: string;
  leaseSeconds?: number;
}): Promise<{ ok: true; data: DurableT6Claim } | Failure> {
  const admin = getSupabaseAdmin();
  if (!admin) return failure("T6_UNAVAILABLE", "Supabase unavailable");
  const { data, error } = await admin.rpc(
    "pikbo_claim_t6_derivative_v1",
    {
      p_worker_id: input.workerId.slice(0, 120),
      p_lease_seconds: Math.max(
        30,
        Math.min(600, Math.floor(input.leaseSeconds ?? 120))
      ),
    }
  );
  if (error) return failure("T6_UNAVAILABLE", error.message.slice(0, 160));
  const payload = payloadOf(data);
  if (!payload || payload.ok !== true) {
    return failure(
      typeof payload?.code === "string"
        ? payload.code
        : "T6_CLAIM_FAILED",
      "No T6 derivative was claimed"
    );
  }
  const required = [
    "jobId",
    "userId",
    "providerRequestId",
    "sourceRef",
    "idempotencyKey",
    "objectKey",
    "leaseToken",
    "leaseExpiresAt",
  ] as const;
  if (
    required.some((key) => typeof payload[key] !== "string") ||
    typeof payload.attemptCount !== "number"
  ) {
    return failure("T6_CLAIM_INVALID", "T6 claim failed closed");
  }
  return {
    ok: true,
    data: {
      jobId: payload.jobId as string,
      userId: payload.userId as string,
      providerRequestId: payload.providerRequestId as string,
      sourceRef: payload.sourceRef as string,
      idempotencyKey: payload.idempotencyKey as string,
      objectKey: payload.objectKey as string,
      leaseToken: payload.leaseToken as string,
      leaseExpiresAt: payload.leaseExpiresAt as string,
      attemptCount: payload.attemptCount,
    },
  };
}

export async function finishDurableT6Derivative(input: {
  workerId: string;
  leaseToken: string;
  jobId: string;
  result: T6DerivativeMetadata;
}): Promise<{ ok: true; data: DurableT6Truth } | Failure> {
  const admin = getSupabaseAdmin();
  if (!admin) return failure("T6_UNAVAILABLE", "Supabase unavailable");
  if (
    input.result.status !== "succeeded" &&
    input.result.status !== "failed"
  ) {
    return failure(
      "T6_RESULT_NOT_TERMINAL",
      "Only a verified success or terminal bake failure may finish a lease"
    );
  }
  const success = input.result.status === "succeeded";
  const { data, error } = await admin.rpc(
    "pikbo_finish_t6_derivative_v1",
    {
      p_worker_id: input.workerId.slice(0, 120),
      p_lease_token: input.leaseToken.slice(0, 256),
      p_job_id: input.jobId,
      p_action: success ? "success" : "failure",
      p_content_type: success ? input.result.contentType : null,
      p_source_checksum: success ? input.result.sourceChecksum : null,
      p_output_checksum: success ? input.result.outputChecksum : null,
      p_source_probe: success ? input.result.sourceProbe : null,
      p_output_probe: success
        ? {
            ...input.result.probe,
            pixelProof: input.result.pixelProof,
          }
        : null,
      p_delivery_path: success ? input.result.deliveryPath : null,
      p_error_code: success
        ? null
        : input.result.errorCode || "BAKE_FAILED",
    }
  );
  if (error) return failure("T6_UNAVAILABLE", error.message.slice(0, 160));
  return parseTruth(payloadOf(data));
}
