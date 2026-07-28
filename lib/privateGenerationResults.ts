import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  privateResultObjectKey,
  providerOutputHostAllowed,
} from "@/lib/privateGenerationResultsPure.mjs";

export {
  privateResultObjectKey,
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
};

type SaveInput = {
  jobId: string;
  userId: string;
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
};

function configuredProviderHosts(): string[] {
  return (process.env.PIKBO_PROVIDER_OUTPUT_HOST_ALLOWLIST || "")
    .split(",")
    .map((value) => value.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
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
].join(",");

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
  const { data, error } = await admin
    .from("generation_jobs")
    .select(RESULT_COLUMNS)
    .eq("created_by", input.userId)
    .eq("idempotency_key", input.idempotencyKey)
    .eq("status", "succeeded")
    .maybeSingle();
  if (error || !data) return null;
  return resultFromRow(data as unknown as Record<string, unknown>);
}

export async function signedPrivateResultUrl(
  objectKey: string,
  expiresInSeconds = 60 * 60,
  downloadFilename?: string
): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin.storage
    .from(PRIVATE_RESULTS_BUCKET)
    .createSignedUrl(
      objectKey,
      expiresInSeconds,
      downloadFilename ? { download: downloadFilename } : undefined
    );
  return error ? null : data.signedUrl || null;
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

export async function savePrivateGenerationResult(
  input: SaveInput
): Promise<
  | {
      ok: true;
      result: PrivateGenerationResult;
      signedUrl: string;
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

  const uploaded = await admin.storage
    .from(PRIVATE_RESULTS_BUCKET)
    .upload(objectKey, downloaded.bytes, {
      contentType: downloaded.contentType,
      cacheControl: "private, max-age=0",
      upsert: false,
    });
  if (uploaded.error) {
    return {
      ok: false,
      code: "PRIVATE_STORAGE_WRITE_FAILED",
      error: uploaded.error.message.slice(0, 160),
    };
  }

  const { data, error } = await admin.rpc(
    "pikbo_attach_private_generation_output_v1",
    {
      p_user_id: input.userId,
      p_job_id: input.jobId,
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
  const payload = (Array.isArray(data) ? data[0] : data) as
    | Record<string, unknown>
    | null;
  if (
    error ||
    !payload ||
    payload.ok !== true ||
    payload.jobId !== input.jobId ||
    payload.objectKey !== objectKey
  ) {
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
  if (!signedUrl) {
    return {
      ok: false,
      code: "PRIVATE_RESULT_SIGN_FAILED",
      error: "The generated video was saved but could not be opened",
    };
  }
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
    },
    signedUrl,
  };
}

export async function privateResultsProbe(): Promise<{
  configured: boolean;
  bucketReady: boolean;
  warning?: string;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      configured: false,
      bucketReady: false,
      warning: "Supabase service role unavailable",
    };
  }
  const { data, error } = await admin.storage.getBucket(
    PRIVATE_RESULTS_BUCKET
  );
  if (error || !data) {
    return {
      configured: true,
      bucketReady: false,
      warning: error?.message.slice(0, 160) || "Private result bucket missing",
    };
  }
  return {
    configured: true,
    bucketReady: data.public === false,
    ...(data.public
      ? { warning: "Private result bucket must not be public" }
      : {}),
  };
}
