import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  privateResultObjectKey,
  privateStoredObjectMatches,
  providerOutputHostAllowed,
} from "@/lib/privateGenerationResultsPure.mjs";

export {
  privateResultObjectKey,
  privateStoredObjectMatches,
  providerOutputHostAllowed,
} from "@/lib/privateGenerationResultsPure.mjs";

export const PRIVATE_RESULTS_BUCKET = "pikbo-private-results";
export const PRIVATE_RESULT_MAX_BYTES = 64 * 1024 * 1024;
export const PRIVATE_RESULT_FETCH_TIMEOUT_MS = 45_000;

export type PrivateGenerationResult = {
  jobId: string;
  userId: string;
  objectKey: string;
  contentType: "video/mp4";
  byteLength: number;
  checksum: string;
  providerRequestId: string;
  effect: string;
  model: string;
  duration: number;
  aspectRatio: string;
  resolution: string;
  createdAt: string;
};

export type PrivateGenerationRecovery =
  | {
      state: "not_found";
    }
  | {
      state: "unavailable";
    }
  | {
      state: "pending";
      jobId: string;
      status: "queued" | "running" | "unknown";
    }
  | {
      state: "failed";
      jobId: string;
      status: "failed" | "canceled";
      creditsRefunded: boolean;
      errorCode?: string;
    }
  | {
      state: "succeeded";
      result: PrivateGenerationResult;
    };

type SaveInput = {
  jobId: string;
  userId: string;
  attemptKey?: string | null;
  providerRequestId: string;
  providerOutputUrl: string;
  effect: string;
  model: string;
  duration: number;
  aspectRatio: string;
  resolution: string;
};

type SaveFailure = {
  ok: false;
  code: string;
  error: string;
  /**
   * The object may already be durably attached even though the RPC response
   * was lost. Callers must withhold (never refund/delete) until reconciliation.
   */
  settlementUncertain?: boolean;
};

function configuredProviderHosts(): string[] {
  return (process.env.PIKBO_PROVIDER_OUTPUT_HOST_ALLOWLIST || "")
    .split(",")
    .map((value) => value.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
}

export function privateProviderOutputAllowlistConfigured(): boolean {
  return configuredProviderHosts().length > 0;
}

function resultFromRow(row: Record<string, unknown>): PrivateGenerationResult | null {
  if (
    typeof row.id !== "string" ||
    typeof row.created_by !== "string" ||
    typeof row.output_object_key !== "string" ||
    row.output_content_type !== "video/mp4" ||
    typeof row.output_byte_length !== "number" ||
    typeof row.output_sha256 !== "string" ||
    typeof row.provider_request_id !== "string" ||
    typeof row.effect_slug !== "string"
  ) {
    return null;
  }
  return {
    jobId: row.id,
    userId: row.created_by,
    objectKey: row.output_object_key,
    contentType: "video/mp4",
    byteLength: row.output_byte_length,
    checksum: row.output_sha256,
    providerRequestId: row.provider_request_id,
    effect: row.effect_slug,
    model: typeof row.model_id === "string" ? row.model_id : "unknown",
    duration:
      typeof row.duration_seconds === "number" ? row.duration_seconds : 5,
    aspectRatio:
      typeof row.aspect_ratio === "string" ? row.aspect_ratio : "1:1",
    resolution:
      typeof row.resolution === "string" ? row.resolution : "480p",
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date(0).toISOString(),
  };
}

const RESULT_COLUMNS = [
  "id",
  "created_by",
  "effect_slug",
  "status",
  "provider_request_id",
  "output_object_key",
  "output_content_type",
  "output_byte_length",
  "output_sha256",
  "model_id",
  "duration_seconds",
  "aspect_ratio",
  "resolution",
  "created_at",
].join(",");

async function attachedOutputState(input: {
  jobId: string;
  userId: string;
  attemptKey?: string | null;
  objectKey: string;
  checksum: string;
  providerRequestId: string;
  byteLength: number;
}): Promise<"match" | "empty" | "conflict" | "unavailable"> {
  const admin = getSupabaseAdmin();
  if (!admin) return "unavailable";
  const { data, error } = await admin
    .from("generation_jobs")
    .select(
      [
        "id",
        "created_by",
        "pack_attempt_key",
        "provider_request_id",
        "output_object_key",
        "output_content_type",
        "output_byte_length",
        "output_sha256",
      ].join(",")
    )
    .eq("id", input.jobId)
    .eq("created_by", input.userId)
    .maybeSingle();
  if (error) return "unavailable";
  if (!data) return "empty";
  const row = data as unknown as Record<string, unknown>;
  if (row.output_object_key == null) return "empty";
  return row.id === input.jobId &&
    row.created_by === input.userId &&
    row.pack_attempt_key === (input.attemptKey ?? null) &&
    row.output_object_key === input.objectKey &&
    row.output_content_type === "video/mp4" &&
    row.output_byte_length === input.byteLength &&
    row.output_sha256 === input.checksum &&
    row.provider_request_id === input.providerRequestId
    ? "match"
    : "conflict";
}

export async function getPrivateGenerationResult(input: {
  jobId: string;
  userId: string;
}): Promise<PrivateGenerationResult | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin
    .from("generation_jobs")
    .select(RESULT_COLUMNS)
    .eq("id", input.jobId)
    .eq("created_by", input.userId)
    .eq("status", "succeeded")
    .maybeSingle();
  if (error || !data) return null;
  return resultFromRow(data as unknown as Record<string, unknown>);
}

export async function getPrivateGenerationResultByIdempotency(input: {
  idempotencyKey: string;
  userId: string;
}): Promise<PrivateGenerationResult | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const direct = await admin
    .from("generation_jobs")
    .select(RESULT_COLUMNS)
    .eq("created_by", input.userId)
    .eq("idempotency_key", input.idempotencyKey)
    .eq("status", "succeeded")
    .maybeSingle();
  if (!direct.error && direct.data) {
    return resultFromRow(
      direct.data as unknown as Record<string, unknown>
    );
  }
  // Pack children keep a stable logical job id while every retry receives a
  // new attempt key. The server-owned pack_attempt_key is the replay binding.
  const packAttempt = await admin
    .from("generation_jobs")
    .select(RESULT_COLUMNS)
    .eq("created_by", input.userId)
    .eq("pack_attempt_key", input.idempotencyKey)
    .eq("status", "succeeded")
    .maybeSingle();
  if (packAttempt.error || !packAttempt.data) return null;
  return resultFromRow(
    packAttempt.data as unknown as Record<string, unknown>
  );
}

/**
 * Owner-scoped durable truth for recovering a live render when the original
 * browser POST disconnects or never closes. This is read-only and can never
 * reserve credits or invoke the provider.
 */
export async function getPrivateGenerationRecovery(input: {
  idempotencyKey: string;
  userId: string;
}): Promise<PrivateGenerationRecovery> {
  const admin = getSupabaseAdmin();
  if (!admin) return { state: "unavailable" };
  const direct = await admin
    .from("generation_jobs")
    .select(`${RESULT_COLUMNS},error_code`)
    .eq("created_by", input.userId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  let data = direct.data;
  if (!data) {
    const packAttempt = await admin
      .from("generation_jobs")
      .select(`${RESULT_COLUMNS},error_code`)
      .eq("created_by", input.userId)
      .eq("pack_attempt_key", input.idempotencyKey)
      .maybeSingle();
    if (packAttempt.error) {
      return direct.error ? { state: "unavailable" } : { state: "not_found" };
    }
    data = packAttempt.data;
  }
  if (direct.error && !data) return { state: "unavailable" };
  if (!data) return { state: "not_found" };

  const row = data as unknown as Record<string, unknown>;
  const jobId = typeof row.id === "string" ? row.id : "";
  const status = typeof row.status === "string" ? row.status : "unknown";
  if (!jobId) return { state: "unavailable" };

  if (status === "succeeded") {
    const result = resultFromRow(row);
    // A succeeded credit row without its owned output is not deliverable.
    // Keep polling/reconciliation fail-closed instead of exposing a raw URL.
    return result
      ? { state: "succeeded", result }
      : { state: "pending", jobId, status: "unknown" };
  }
  if (status === "failed" || status === "canceled") {
    return {
      state: "failed",
      jobId,
      status,
      // The current durable release RPC writes `failed` in the same
      // transaction that releases the reservation. `canceled` has no such
      // settlement guarantee and must remain refund-unconfirmed.
      creditsRefunded: status === "failed",
      ...(typeof row.error_code === "string" && row.error_code
        ? { errorCode: row.error_code }
        : {}),
    };
  }
  return {
    state: "pending",
    jobId,
    status:
      status === "queued" || status === "running" ? status : "unknown",
  };
}

/**
 * Owner-only durable Library rows. Object keys and provider URLs stay
 * server-side; callers expose only the controlled /api/downloads/{jobId} gate.
 */
export async function listPrivateGenerationResults(input: {
  userId: string;
  limit?: number;
}): Promise<PrivateGenerationResult[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const limit = Math.min(50, Math.max(1, Math.floor(input.limit ?? 50)));
  const { data, error } = await admin
    .from("generation_jobs")
    .select(RESULT_COLUMNS)
    .eq("created_by", input.userId)
    .eq("status", "succeeded")
    .not("output_object_key", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !Array.isArray(data)) return [];
  return data
    .map((row) =>
      resultFromRow(row as unknown as Record<string, unknown>)
    )
    .filter((row): row is PrivateGenerationResult => Boolean(row));
}

export async function signedPrivateResultUrl(
  objectKey: string,
  expiresInSeconds = 10 * 60,
  downloadFilename?: string
): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  try {
    const { data, error } = await admin.storage
      .from(PRIVATE_RESULTS_BUCKET)
      .createSignedUrl(
        objectKey,
        expiresInSeconds,
        downloadFilename ? { download: downloadFilename } : undefined
      );
    return error ? null : data.signedUrl || null;
  } catch {
    // Signing is ephemeral. A temporary signing failure must not turn a
    // durable private result into a credit release.
    return null;
  }
}

async function providerVideoBytes(
  providerOutputUrl: string
): Promise<
  | { ok: true; bytes: Uint8Array; contentType: "video/mp4"; checksum: string }
  | SaveFailure
> {
  if (
    !providerOutputHostAllowed(
      providerOutputUrl,
      configuredProviderHosts()
    )
  ) {
    return {
      ok: false,
      code: "PROVIDER_OUTPUT_HOST_BLOCKED",
      error:
        "Provider output host is not on the private-result allowlist",
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    PRIVATE_RESULT_FETCH_TIMEOUT_MS
  );
  try {
    const response = await fetch(providerOutputUrl, {
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        ok: false,
        code: "PROVIDER_OUTPUT_FETCH_FAILED",
        error: `Provider output returned HTTP ${response.status}`,
      };
    }
    const contentType = (response.headers.get("content-type") || "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (contentType !== "video/mp4") {
      return {
        ok: false,
        code: "PROVIDER_OUTPUT_CONTENT_TYPE",
        error: "Provider output was not an MP4 video",
      };
    }
    const declared = Number(response.headers.get("content-length") || "0");
    if (
      Number.isFinite(declared) &&
      declared > PRIVATE_RESULT_MAX_BYTES
    ) {
      return {
        ok: false,
        code: "PROVIDER_OUTPUT_TOO_LARGE",
        error: "Provider output exceeded the private-result size limit",
      };
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (
      bytes.byteLength < 32 ||
      bytes.byteLength > PRIVATE_RESULT_MAX_BYTES
    ) {
      return {
        ok: false,
        code: "PROVIDER_OUTPUT_INVALID_SIZE",
        error: "Provider output was empty or too large to save",
      };
    }
    return {
      ok: true,
      bytes,
      contentType: "video/mp4",
      checksum: createHash("sha256").update(bytes).digest("hex"),
    };
  } catch (error) {
    return {
      ok: false,
      code:
        error instanceof Error && error.name === "AbortError"
          ? "PROVIDER_OUTPUT_FETCH_TIMEOUT"
          : "PROVIDER_OUTPUT_FETCH_FAILED",
      error:
        error instanceof Error && error.name === "AbortError"
          ? "Timed out while saving the generated video"
          : "Could not fetch the generated video for private storage",
    };
  } finally {
    clearTimeout(timer);
  }
}

function privateStorageObjectMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const status = Number(record.statusCode ?? record.status ?? 0);
  const message =
    typeof record.message === "string" ? record.message.toLowerCase() : "";
  return status === 404 || /object[_\s-]*not[_\s-]*found/.test(message);
}

async function storedPrivateObjectState(input: {
  objectKey: string;
  byteLength: number;
  checksum: string;
}): Promise<"match" | "absent" | "conflict" | "unavailable"> {
  const admin = getSupabaseAdmin();
  if (!admin) return "unavailable";
  try {
    const { data, error } = await admin.storage
      .from(PRIVATE_RESULTS_BUCKET)
      .download(input.objectKey);
    if (error) {
      return privateStorageObjectMissing(error) ? "absent" : "unavailable";
    }
    if (!data) return "unavailable";
    const bytes = new Uint8Array(await data.arrayBuffer());
    const checksum = createHash("sha256").update(bytes).digest("hex");
    return privateStoredObjectMatches({
      expectedByteLength: input.byteLength,
      expectedChecksum: input.checksum,
      storedByteLength: bytes.byteLength,
      storedChecksum: checksum,
    })
      ? "match"
      : "conflict";
  } catch {
    return "unavailable";
  }
}

export async function savePrivateGenerationResult(
  input: SaveInput
): Promise<
  | {
      ok: true;
      result: PrivateGenerationResult;
      /**
       * Signing is an ephemeral delivery concern. A null value means the
       * private object and durable job metadata were saved successfully, but
       * the caller must retry signing (or let Library recovery do so). It must
       * never turn a completed private save into a credit release.
       */
      signedUrl: string | null;
    }
  | SaveFailure
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "PRIVATE_STORAGE_UNAVAILABLE",
      error: "Supabase private storage is unavailable",
    };
  }
  const objectKey = privateResultObjectKey(input);
  if (!objectKey) {
    return {
      ok: false,
      code: "PRIVATE_RESULT_ID_INVALID",
      error: "Private result identity was invalid",
    };
  }
  const downloaded = await providerVideoBytes(input.providerOutputUrl);
  if (!downloaded.ok) return downloaded;

  let uploadError: string | null = null;
  try {
    const uploaded = await admin.storage
      .from(PRIVATE_RESULTS_BUCKET)
      .upload(objectKey, downloaded.bytes, {
        contentType: downloaded.contentType,
        cacheControl: "private, max-age=0",
        upsert: false,
      });
    uploadError = uploaded.error?.message.slice(0, 160) || null;
  } catch (error) {
    uploadError =
      error instanceof Error
        ? error.message.slice(0, 160)
        : "Private Storage write response was interrupted";
  }
  if (uploadError) {
    const state = await storedPrivateObjectState({
      objectKey,
      byteLength: downloaded.bytes.byteLength,
      checksum: downloaded.checksum,
    });
    if (state !== "match") {
      if (state === "absent") {
        return {
          ok: false,
          code: "PRIVATE_STORAGE_WRITE_FAILED",
          error: uploadError,
        };
      }
      return {
        ok: false,
        code: "PRIVATE_STORAGE_WRITE_UNCERTAIN",
        error:
          "Private Storage write could not be confirmed; settlement requires reconciliation",
        settlementUncertain: true,
      };
    }
  }

  const { data, error } = await admin.rpc(
    "pikbo_attach_private_generation_output_v2",
    {
      p_user_id: input.userId,
      p_job_id: input.jobId,
      p_attempt_key: input.attemptKey ?? null,
      p_provider_request_id: input.providerRequestId.slice(0, 256),
      p_object_key: objectKey,
      p_content_type: downloaded.contentType,
      p_byte_length: downloaded.bytes.byteLength,
      p_sha256: downloaded.checksum,
      p_model_id: input.model.slice(0, 160),
      p_duration_seconds: input.duration,
      p_aspect_ratio: input.aspectRatio.slice(0, 16),
      p_resolution: input.resolution.slice(0, 32),
    }
  );
  let payload = (Array.isArray(data) ? data[0] : data) as
    | Record<string, unknown>
    | null;
  let attached =
    !error &&
    payload?.ok === true &&
    payload.jobId === input.jobId &&
    payload.objectKey === objectKey;
  if (!attached && (error || !payload || payload.ok === true)) {
    const state = await attachedOutputState({
      jobId: input.jobId,
      userId: input.userId,
      attemptKey: input.attemptKey,
      objectKey,
      checksum: downloaded.checksum,
      providerRequestId: input.providerRequestId,
      byteLength: downloaded.bytes.byteLength,
    });
    if (state === "match") {
      attached = true;
      payload = {
        ok: true,
        jobId: input.jobId,
        objectKey,
        idempotent: true,
      };
    } else if (state === "conflict" || state === "unavailable") {
      return {
        ok: false,
        code: "PRIVATE_RESULT_RECORD_UNCERTAIN",
        error:
          "Private output attachment could not be confirmed; settlement requires reconciliation",
        settlementUncertain: true,
      };
    }
  }
  if (!attached) {
    await admin.storage
      .from(PRIVATE_RESULTS_BUCKET)
      .remove([objectKey])
      .catch(() => undefined);
    return {
      ok: false,
      code:
        typeof payload?.code === "string"
          ? payload.code
          : "PRIVATE_RESULT_RECORD_FAILED",
      error:
        error?.message.slice(0, 160) ||
        "Could not bind the stored video to its generation job",
    };
  }

  const signedUrl = await signedPrivateResultUrl(objectKey);
  return {
    ok: true,
    result: {
      jobId: input.jobId,
      userId: input.userId,
      objectKey,
      contentType: downloaded.contentType,
      byteLength: downloaded.bytes.byteLength,
      checksum: downloaded.checksum,
      providerRequestId: input.providerRequestId,
      effect: input.effect,
      model: input.model,
      duration: input.duration,
      aspectRatio: input.aspectRatio,
      resolution: input.resolution,
      createdAt: new Date().toISOString(),
    },
    signedUrl,
  };
}

export async function privateResultsProbe(): Promise<{
  configured: boolean;
  bucketReady: boolean;
  schemaReady: boolean;
  rpcReady: boolean;
  warning?: string;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      configured: false,
      bucketReady: false,
      schemaReady: false,
      rpcReady: false,
      warning: "Supabase service role unavailable",
    };
  }
  const [bucket, schema, attachRpc] = await Promise.all([
    admin.storage.getBucket(PRIVATE_RESULTS_BUCKET),
    admin
      .from("generation_jobs")
      .select(
        "id,output_object_key,output_content_type,output_byte_length,output_sha256,pack_attempt_key"
      )
      .limit(1),
    admin.rpc("pikbo_attach_private_generation_output_v2", {
      p_user_id: null,
      p_job_id: null,
      p_provider_request_id: null,
      p_object_key: null,
      p_content_type: null,
      p_byte_length: null,
      p_sha256: null,
      p_model_id: null,
      p_duration_seconds: null,
      p_aspect_ratio: null,
      p_resolution: null,
      p_attempt_key: null,
    }),
  ]);
  const rpcPayload = (Array.isArray(attachRpc.data)
    ? attachRpc.data[0]
    : attachRpc.data) as Record<string, unknown> | null;
  const bucketReady = Boolean(bucket.data && bucket.data.public === false);
  const schemaReady = !schema.error;
  const rpcReady =
    !attachRpc.error &&
    rpcPayload?.ok === false &&
    rpcPayload.code === "INVALID_IDENTITY";
  if (!bucketReady || !schemaReady || !rpcReady) {
    return {
      configured: true,
      bucketReady,
      schemaReady,
      rpcReady,
      warning: (
        bucket.error?.message ||
        (!bucket.data
          ? "Private result bucket missing"
          : bucket.data.public
            ? "Private result bucket must not be public"
            : "") ||
        schema.error?.message ||
        attachRpc.error?.message ||
        "Private result RPC readiness probe returned an invalid result"
      ).slice(0, 160),
    };
  }
  return {
    configured: true,
    bucketReady: true,
    schemaReady: true,
    rpcReady: true,
  };
}
