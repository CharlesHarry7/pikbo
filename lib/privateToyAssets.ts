import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  PRIVATE_TOY_INPUT_BUCKET,
  type PrivateToyInputMime,
  privateToyInputBytesMatch,
  validatePrivateToyInputMetadata,
} from "@/lib/privateToyAssetsPure";

export {
  PRIVATE_TOY_INPUT_BUCKET,
  PRIVATE_TOY_INPUT_MAX_BYTES,
} from "@/lib/privateToyAssetsPure";

type RpcFailure = {
  ok: false;
  code: string;
  error: string;
};

export type PrivateToyAssetPublic = {
  inputAssetId: string;
  sha256: string;
  mimeType: PrivateToyInputMime;
  sizeBytes: number;
  skuLabel: string | null;
  state: "pending" | "ready";
};

type PrivateToyAssetInternal = PrivateToyAssetPublic & {
  objectKey: string;
};

function rpcPayload(value: unknown): Record<string, unknown> | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && typeof raw === "object"
    ? (raw as Record<string, unknown>)
    : null;
}

function stringField(
  value: Record<string, unknown>,
  key: string
): string | null {
  return typeof value[key] === "string" ? (value[key] as string) : null;
}

function numberField(
  value: Record<string, unknown>,
  key: string
): number | null {
  return typeof value[key] === "number" &&
    Number.isFinite(value[key] as number)
    ? (value[key] as number)
    : null;
}

function failure(
  code: string,
  error: string
): RpcFailure {
  return { ok: false, code, error };
}

function parseInternalAsset(
  payload: Record<string, unknown>
): PrivateToyAssetInternal | null {
  const inputAssetId = stringField(payload, "inputAssetId");
  const objectKey = stringField(payload, "objectKey");
  const sha256 = stringField(payload, "sha256");
  const mimeType = stringField(payload, "mimeType");
  const sizeBytes = numberField(payload, "sizeBytes");
  const state = stringField(payload, "state");
  if (
    !inputAssetId ||
    !objectKey ||
    !sha256 ||
    !(
      mimeType === "image/jpeg" ||
      mimeType === "image/png" ||
      mimeType === "image/webp"
    ) ||
    sizeBytes == null ||
    !(state === "pending" || state === "ready")
  ) {
    return null;
  }
  return {
    inputAssetId,
    objectKey,
    sha256,
    mimeType,
    sizeBytes,
    skuLabel: stringField(payload, "skuLabel"),
    state,
  };
}

function publicAsset(
  asset: PrivateToyAssetInternal
): PrivateToyAssetPublic {
  return {
    inputAssetId: asset.inputAssetId,
    sha256: asset.sha256,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    skuLabel: asset.skuLabel,
    state: asset.state,
  };
}

export async function createPrivateToyAssetUpload(input: {
  userId: string;
  clientAssetKey: string;
  sha256: string;
  mimeType: string;
  sizeBytes: number;
  skuLabel?: string | null;
}): Promise<
  | {
      ok: true;
      asset: PrivateToyAssetPublic;
      uploadUrl: string | null;
      expiresAt: string | null;
      idempotent: boolean;
    }
  | RpcFailure
> {
  const valid = validatePrivateToyInputMetadata({
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    sha256: input.sha256,
    clientAssetKey: input.clientAssetKey,
  });
  if (!valid.ok) return valid;
  const admin = getSupabaseAdmin();
  if (!admin) {
    return failure(
      "PRIVATE_INPUT_UNAVAILABLE",
      "Private input storage is unavailable"
    );
  }

  const { data, error } = await admin.rpc("pikbo_create_toy_asset_v1", {
    p_user_id: input.userId,
    p_client_asset_key: valid.clientAssetKey,
    p_sha256: valid.sha256,
    p_mime_type: valid.mimeType,
    p_size_bytes: valid.sizeBytes,
    p_sku_label:
      typeof input.skuLabel === "string"
        ? input.skuLabel.trim().slice(0, 120) || null
        : null,
  });
  if (error) {
    return failure(
      "PRIVATE_INPUT_UNAVAILABLE",
      error.message.slice(0, 160)
    );
  }
  const payload = rpcPayload(data);
  if (!payload || payload.ok !== true) {
    return failure(
      stringField(payload ?? {}, "code") || "PRIVATE_INPUT_CREATE_FAILED",
      "Could not create a private toy input"
    );
  }
  const asset = parseInternalAsset(payload);
  if (!asset || asset.sha256 !== valid.sha256) {
    return failure(
      "PRIVATE_INPUT_INVALID_RESPONSE",
      "Private input service returned an invalid asset"
    );
  }
  if (asset.state === "ready") {
    return {
      ok: true,
      asset: publicAsset(asset),
      uploadUrl: null,
      expiresAt: null,
      idempotent: true,
    };
  }

  const signed = await admin.storage
    .from(PRIVATE_TOY_INPUT_BUCKET)
    .createSignedUploadUrl(asset.objectKey, { upsert: false });
  if (signed.error || !signed.data?.signedUrl) {
    return failure(
      "PRIVATE_INPUT_UPLOAD_URL_FAILED",
      (signed.error?.message || "Could not create signed upload URL").slice(
        0,
        160
      )
    );
  }
  return {
    ok: true,
    asset: publicAsset(asset),
    uploadUrl: signed.data.signedUrl,
    // Supabase signed upload tokens are valid for two hours.
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    idempotent: payload.idempotent === true,
  };
}

async function rejectPrivateToyAsset(input: {
  userId: string;
  inputAssetId: string;
  objectKey: string;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await Promise.all([
    admin
      .from("toy_assets")
      .update({ state: "rejected" })
      .eq("id", input.inputAssetId)
      .eq("owner_user_id", input.userId)
      .eq("state", "pending"),
    admin.storage.from(PRIVATE_TOY_INPUT_BUCKET).remove([input.objectKey]),
  ]);
}

export async function completePrivateToyAsset(input: {
  userId: string;
  inputAssetId: string;
}): Promise<
  | { ok: true; asset: PrivateToyAssetPublic; idempotent: boolean }
  | RpcFailure
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return failure(
      "PRIVATE_INPUT_UNAVAILABLE",
      "Private input storage is unavailable"
    );
  }
  const rowQuery = await admin
    .from("toy_assets")
    .select(
      "id,owner_user_id,object_key,sha256,mime_type,size_bytes,sku_label,state"
    )
    .eq("id", input.inputAssetId)
    .eq("owner_user_id", input.userId)
    .maybeSingle();
  if (rowQuery.error || !rowQuery.data) {
    return failure(
      "INPUT_ASSET_NOT_FOUND",
      "Private toy input was not found"
    );
  }
  const row = rowQuery.data as unknown as Record<string, unknown>;
  const objectKey = stringField(row, "object_key");
  const expectedSha256 = stringField(row, "sha256");
  const expectedMimeType = stringField(row, "mime_type");
  const expectedSizeBytes = numberField(row, "size_bytes");
  if (
    !objectKey ||
    !expectedSha256 ||
    !(
      expectedMimeType === "image/jpeg" ||
      expectedMimeType === "image/png" ||
      expectedMimeType === "image/webp"
    ) ||
    expectedSizeBytes == null
  ) {
    return failure(
      "PRIVATE_INPUT_INVALID_RECORD",
      "Private toy input record is invalid"
    );
  }

  const downloaded = await admin.storage
    .from(PRIVATE_TOY_INPUT_BUCKET)
    .download(objectKey);
  if (downloaded.error || !downloaded.data) {
    return failure(
      "INPUT_ASSET_UPLOAD_MISSING",
      "Upload is not available yet"
    );
  }
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  const verified = privateToyInputBytesMatch({
    bytes,
    expectedMimeType,
    expectedSizeBytes,
    expectedSha256,
  });
  if (!verified.ok) {
    await rejectPrivateToyAsset({
      userId: input.userId,
      inputAssetId: input.inputAssetId,
      objectKey,
    });
    return verified;
  }

  const completed = await admin.rpc("pikbo_complete_toy_asset_v1", {
    p_user_id: input.userId,
    p_asset_id: input.inputAssetId,
    p_actual_sha256: verified.sha256,
    p_actual_mime_type: verified.mimeType,
    p_actual_size_bytes: bytes.byteLength,
  });
  if (completed.error) {
    return failure(
      "PRIVATE_INPUT_COMPLETE_FAILED",
      completed.error.message.slice(0, 160)
    );
  }
  const payload = rpcPayload(completed.data);
  if (!payload || payload.ok !== true) {
    return failure(
      stringField(payload ?? {}, "code") || "PRIVATE_INPUT_COMPLETE_FAILED",
      "Could not verify the private toy input"
    );
  }
  const publicReady: PrivateToyAssetPublic = {
    inputAssetId: stringField(payload, "inputAssetId") || "",
    sha256: stringField(payload, "sha256") || "",
    mimeType: verified.mimeType,
    sizeBytes: numberField(payload, "sizeBytes") ?? bytes.byteLength,
    skuLabel: stringField(payload, "skuLabel"),
    state: "ready",
  };
  if (
    publicReady.inputAssetId !== input.inputAssetId ||
    publicReady.sha256 !== verified.sha256
  ) {
    return failure(
      "PRIVATE_INPUT_INVALID_RESPONSE",
      "Private input completion returned an invalid record"
    );
  }
  return {
    ok: true,
    asset: publicReady,
    idempotent: payload.idempotent === true,
  };
}

export async function resolvePrivateToyAssetForPack(input: {
  userId: string;
  packRunId: string;
  packJobId: string;
}): Promise<
  | {
      ok: true;
      inputAssetId: string;
      sha256: string;
      mimeType: PrivateToyInputMime;
      sizeBytes: number;
      skuLabel: string | null;
      dataUrl: string;
    }
  | RpcFailure
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return failure(
      "PRIVATE_INPUT_UNAVAILABLE",
      "Private input storage is unavailable"
    );
  }
  const resolved = await admin.rpc("pikbo_resolve_seller_pack_input_v1", {
    p_user_id: input.userId,
    p_pack_run_id: input.packRunId,
    p_job_id: input.packJobId,
  });
  if (resolved.error) {
    return failure(
      "PRIVATE_INPUT_UNAVAILABLE",
      resolved.error.message.slice(0, 160)
    );
  }
  const payload = rpcPayload(resolved.data);
  if (!payload || payload.ok !== true) {
    return failure(
      stringField(payload ?? {}, "code") || "PACK_INPUT_NOT_FOUND",
      "The Pack input is missing or does not belong to this account"
    );
  }
  const asset = parseInternalAsset({ ...payload, state: "ready" });
  if (!asset) {
    return failure(
      "PRIVATE_INPUT_INVALID_RESPONSE",
      "Pack input resolver returned an invalid record"
    );
  }
  const downloaded = await admin.storage
    .from(PRIVATE_TOY_INPUT_BUCKET)
    .download(asset.objectKey);
  if (downloaded.error || !downloaded.data) {
    return failure(
      "PACK_INPUT_NOT_FOUND",
      "The private Pack input is unavailable"
    );
  }
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  const verified = privateToyInputBytesMatch({
    bytes,
    expectedMimeType: asset.mimeType,
    expectedSizeBytes: asset.sizeBytes,
    expectedSha256: asset.sha256,
  });
  if (!verified.ok) {
    return failure(
      "PACK_INPUT_CORRUPT",
      "The private Pack input failed its integrity check"
    );
  }
  return {
    ok: true,
    inputAssetId: asset.inputAssetId,
    sha256: verified.sha256,
    mimeType: verified.mimeType,
    sizeBytes: bytes.byteLength,
    skuLabel: asset.skuLabel,
    dataUrl: `data:${verified.mimeType};base64,${Buffer.from(bytes).toString(
      "base64"
    )}`,
  };
}

export async function privateToyAssetsProbe(): Promise<{
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
  const [
    bucket,
    assets,
    packs,
    jobs,
    createRpc,
    completeRpc,
    reserveRpc,
    statusRpc,
    activeRpc,
    resolveRpc,
  ] = await Promise.all([
      admin.storage.getBucket(PRIVATE_TOY_INPUT_BUCKET),
      admin
        .from("toy_assets")
        .select("id,owner_user_id,object_key,sha256,mime_type,size_bytes,state")
        .limit(1),
      admin
        .from("seller_pack_runs")
        .select("id,input_asset_id,rights_confirmed_at")
        .limit(1),
      admin
        .from("generation_jobs")
        .select("id,pack_run_id,input_asset_id")
        .limit(1),
      admin.rpc("pikbo_create_toy_asset_v1", {
        p_user_id: null,
        p_client_asset_key: null,
        p_sha256: null,
        p_mime_type: null,
        p_size_bytes: null,
        p_sku_label: null,
      }),
      admin.rpc("pikbo_complete_toy_asset_v1", {
        p_user_id: null,
        p_asset_id: null,
        p_actual_sha256: null,
        p_actual_mime_type: null,
        p_actual_size_bytes: null,
      }),
      admin.rpc("pikbo_reserve_seller_pack_v2", {
        p_user_id: null,
        p_client_pack_key: null,
        p_input_asset_id: null,
        p_rights_confirmed: null,
      }),
      admin.rpc("pikbo_get_seller_pack_status_v2", {
        p_user_id: null,
        p_pack_run_id: null,
      }),
      admin.rpc("pikbo_get_active_seller_pack_v1", {
        p_user_id: null,
      }),
      admin.rpc("pikbo_resolve_seller_pack_input_v1", {
        p_user_id: null,
        p_pack_run_id: null,
        p_job_id: null,
      }),
    ]);
  const createPayload = rpcPayload(createRpc.data);
  const completePayload = rpcPayload(completeRpc.data);
  const reservePayload = rpcPayload(reserveRpc.data);
  const statusPayload = rpcPayload(statusRpc.data);
  const activePayload = rpcPayload(activeRpc.data);
  const resolvePayload = rpcPayload(resolveRpc.data);
  const bucketReady = Boolean(bucket.data && bucket.data.public === false);
  const schemaReady =
    !assets.error && !packs.error && !jobs.error;
  const rpcReady =
    !createRpc.error &&
    createPayload?.ok === false &&
    createPayload.code === "AUTH_REQUIRED" &&
    !completeRpc.error &&
    completePayload?.ok === false &&
    completePayload.code === "INVALID_IDENTITY" &&
    !reserveRpc.error &&
    reservePayload?.ok === false &&
    reservePayload.code === "AUTH_REQUIRED" &&
    !statusRpc.error &&
    statusPayload?.ok === false &&
    statusPayload.code === "AUTH_REQUIRED" &&
    !activeRpc.error &&
    activePayload?.ok === false &&
    activePayload.code === "AUTH_REQUIRED" &&
    !resolveRpc.error &&
    resolvePayload?.ok === false &&
    resolvePayload.code === "INVALID_IDENTITY";
  if (!bucketReady || !schemaReady || !rpcReady) {
    return {
      configured: true,
      bucketReady,
      schemaReady,
      rpcReady,
      warning: (
        bucket.error?.message ||
        assets.error?.message ||
        packs.error?.message ||
        jobs.error?.message ||
        createRpc.error?.message ||
        completeRpc.error?.message ||
        reserveRpc.error?.message ||
        statusRpc.error?.message ||
        activeRpc.error?.message ||
        resolveRpc.error?.message ||
        "Private input readiness probe returned an invalid result"
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
