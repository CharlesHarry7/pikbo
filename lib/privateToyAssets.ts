import { createHash, randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  PRIVATE_TOY_INPUT_MAX_BYTES,
  sniffToyImageMime,
  validateToyAssetRequest,
} from "@/lib/privateToyAssetsPure.mjs";

export {
  PRIVATE_TOY_INPUT_MAX_BYTES,
  sniffToyImageMime,
  validateToyAssetRequest,
} from "@/lib/privateToyAssetsPure.mjs";

export const PRIVATE_TOY_INPUTS_BUCKET = "pikbo-toy-inputs";
export const PRIVATE_TOY_INPUT_SIGNED_SECONDS = 15 * 60;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ToyAssetState = "pending" | "ready" | "rejected" | "deleted";

export type PrivateToyAsset = {
  id: string;
  ownerUserId: string;
  objectKey: string;
  sha256: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  skuLabel: string | null;
  state: ToyAssetState;
  createdAt: string;
  verifiedAt: string | null;
};

type Failure = { ok: false; code: string; error: string };

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function rowToAsset(row: Record<string, unknown>): PrivateToyAsset | null {
  if (
    typeof row.id !== "string" ||
    typeof row.owner_user_id !== "string" ||
    typeof row.object_key !== "string" ||
    typeof row.sha256 !== "string" ||
    !ALLOWED_MIME.has(String(row.mime_type)) ||
    typeof row.size_bytes !== "number" ||
    !["pending", "ready", "rejected", "deleted"].includes(String(row.state))
  ) {
    return null;
  }
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    objectKey: row.object_key,
    sha256: row.sha256,
    mimeType: row.mime_type as PrivateToyAsset["mimeType"],
    sizeBytes: row.size_bytes,
    skuLabel: typeof row.sku_label === "string" ? row.sku_label : null,
    state: row.state as ToyAssetState,
    createdAt:
      typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString(),
    verifiedAt: typeof row.verified_at === "string" ? row.verified_at : null,
  };
}

export async function createPrivateToyAssetUpload(input: {
  ownerUserId: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  skuLabel?: string | null;
}): Promise<
  | {
      ok: true;
      assetId: string;
      uploadUrl: string;
      expiresAt: string;
      maxBytes: number;
    }
  | Failure
> {
  const invalid = validateToyAssetRequest(input);
  if (invalid) return invalid as Failure;
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, code: "PRIVATE_INPUTS_UNAVAILABLE", error: "Private storage unavailable" };
  }
  const assetId = randomUUID();
  const objectKey = `${input.ownerUserId}/${assetId}/input.${extensionForMime(input.mimeType)}`;
  const { error: insertError } = await admin.from("toy_assets").insert({
    id: assetId,
    owner_user_id: input.ownerUserId,
    object_key: objectKey,
    sha256: input.sha256,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    sku_label: input.skuLabel?.trim() || null,
    state: "pending",
  });
  if (insertError) {
    return {
      ok: false,
      code: "PRIVATE_INPUTS_UNAVAILABLE",
      error: insertError.message.slice(0, 160),
    };
  }
  const { data, error } = await admin.storage
    .from(PRIVATE_TOY_INPUTS_BUCKET)
    .createSignedUploadUrl(objectKey, { upsert: false });
  if (error || !data?.signedUrl || !data.token) {
    await admin.from("toy_assets").delete().eq("id", assetId).eq("owner_user_id", input.ownerUserId);
    return {
      ok: false,
      code: "PRIVATE_INPUTS_UNAVAILABLE",
      error: (error?.message || "Could not create private upload URL").slice(0, 160),
    };
  }
  return {
    ok: true,
    assetId,
    uploadUrl: data.signedUrl,
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    maxBytes: PRIVATE_TOY_INPUT_MAX_BYTES,
  };
}

export async function completePrivateToyAsset(input: {
  ownerUserId: string;
  assetId: string;
}): Promise<{ ok: true; asset: PrivateToyAsset } | Failure> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, code: "PRIVATE_INPUTS_UNAVAILABLE", error: "Private storage unavailable" };
  }
  const found = await admin
    .from("toy_assets")
    .select("*")
    .eq("id", input.assetId)
    .eq("owner_user_id", input.ownerUserId)
    .maybeSingle();
  const asset = found.data
    ? rowToAsset(found.data as unknown as Record<string, unknown>)
    : null;
  if (found.error || !asset) {
    return { ok: false, code: "INPUT_ASSET_NOT_FOUND", error: "Private input not found" };
  }
  if (asset.state === "ready") return { ok: true, asset };
  if (asset.state !== "pending") {
    return { ok: false, code: "INPUT_ASSET_REJECTED", error: "Private input is not usable" };
  }
  const downloaded = await admin.storage
    .from(PRIVATE_TOY_INPUTS_BUCKET)
    .download(asset.objectKey);
  if (downloaded.error || !downloaded.data) {
    return { ok: false, code: "INPUT_UPLOAD_MISSING", error: "Uploaded object was not found" };
  }
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  const actualMime = sniffToyImageMime(bytes);
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  const verified =
    bytes.byteLength === asset.sizeBytes &&
    bytes.byteLength <= PRIVATE_TOY_INPUT_MAX_BYTES &&
    actualMime === asset.mimeType &&
    actualHash === asset.sha256;
  const now = new Date().toISOString();
  const updated = await admin
    .from("toy_assets")
    .update({ state: verified ? "ready" : "rejected", verified_at: now })
    .eq("id", asset.id)
    .eq("owner_user_id", input.ownerUserId)
    .eq("state", "pending")
    .select("*")
    .maybeSingle();
  const finalAsset = updated.data
    ? rowToAsset(updated.data as unknown as Record<string, unknown>)
    : null;
  if (updated.error || !finalAsset) {
    return { ok: false, code: "PRIVATE_INPUTS_UNAVAILABLE", error: "Input verification could not be recorded" };
  }
  if (!verified) {
    await admin.storage.from(PRIVATE_TOY_INPUTS_BUCKET).remove([asset.objectKey]);
    return {
      ok: false,
      code: "INPUT_VERIFICATION_FAILED",
      error: "Image bytes, size, type, or checksum did not match",
    };
  }
  return { ok: true, asset: finalAsset };
}

export async function getReadyPrivateToyAsset(input: {
  ownerUserId: string;
  assetId: string;
}): Promise<PrivateToyAsset | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin
    .from("toy_assets")
    .select("*")
    .eq("id", input.assetId)
    .eq("owner_user_id", input.ownerUserId)
    .eq("state", "ready")
    .maybeSingle();
  if (error || !data) return null;
  return rowToAsset(data as unknown as Record<string, unknown>);
}

export async function signedPrivateToyAssetPreview(input: {
  ownerUserId: string;
  assetId: string;
}): Promise<{ asset: PrivateToyAsset; url: string } | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const asset = await getReadyPrivateToyAsset(input);
  if (!asset) return null;
  const { data, error } = await admin.storage
    .from(PRIVATE_TOY_INPUTS_BUCKET)
    .createSignedUrl(asset.objectKey, PRIVATE_TOY_INPUT_SIGNED_SECONDS);
  if (error || !data?.signedUrl) return null;
  return { asset, url: data.signedUrl };
}

export async function resolveBoundToyAssetDataUrl(input: {
  ownerUserId: string;
  packRunId: string;
  jobId: string;
}): Promise<{ assetId: string; dataUrl: string; skuLabel: string | null } | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const pack = await admin
    .from("seller_pack_runs")
    .select("input_asset_id,rights_confirmed_at")
    .eq("id", input.packRunId)
    .eq("created_by", input.ownerUserId)
    .maybeSingle();
  const assetId =
    pack.data && typeof pack.data.input_asset_id === "string"
      ? pack.data.input_asset_id
      : null;
  if (pack.error || !assetId || !pack.data?.rights_confirmed_at) return null;
  const job = await admin
    .from("generation_jobs")
    .select("id")
    .eq("id", input.jobId)
    .eq("pack_run_id", input.packRunId)
    .eq("created_by", input.ownerUserId)
    .eq("input_asset_id", assetId)
    .maybeSingle();
  if (job.error || !job.data) return null;
  const asset = await getReadyPrivateToyAsset({ ownerUserId: input.ownerUserId, assetId });
  if (!asset) return null;
  const downloaded = await admin.storage
    .from(PRIVATE_TOY_INPUTS_BUCKET)
    .download(asset.objectKey);
  if (downloaded.error || !downloaded.data) return null;
  const bytes = Buffer.from(await downloaded.data.arrayBuffer());
  if (
    bytes.byteLength !== asset.sizeBytes ||
    createHash("sha256").update(bytes).digest("hex") !== asset.sha256 ||
    sniffToyImageMime(bytes) !== asset.mimeType
  ) {
    return null;
  }
  return {
    assetId,
    dataUrl: `data:${asset.mimeType};base64,${bytes.toString("base64")}`,
    skuLabel: asset.skuLabel,
  };
}

export async function resolveReadyPrivateToyAssetDataUrl(input: {
  ownerUserId: string;
  assetId: string;
}): Promise<{ assetId: string; dataUrl: string; skuLabel: string | null } | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const asset = await getReadyPrivateToyAsset(input);
  if (!asset) return null;
  const downloaded = await admin.storage
    .from(PRIVATE_TOY_INPUTS_BUCKET)
    .download(asset.objectKey);
  if (downloaded.error || !downloaded.data) return null;
  const bytes = Buffer.from(await downloaded.data.arrayBuffer());
  if (
    bytes.byteLength !== asset.sizeBytes ||
    createHash("sha256").update(bytes).digest("hex") !== asset.sha256 ||
    sniffToyImageMime(bytes) !== asset.mimeType
  ) return null;
  return {
    assetId: asset.id,
    dataUrl: `data:${asset.mimeType};base64,${bytes.toString("base64")}`,
    skuLabel: asset.skuLabel,
  };
}

export type OwnerSellerPackInput = {
  packRunId: string;
  status: string;
  createdAt: string;
  inputAssetId: string;
  skuLabel: string | null;
  inputPreviewUrl: string | null;
};

export async function listOwnerSellerPackInputs(input: {
  ownerUserId: string;
  activeOnly?: boolean;
  limit?: number;
}): Promise<OwnerSellerPackInput[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  let query = admin
    .from("seller_pack_runs")
    .select("id,status,created_at,input_asset_id")
    .eq("created_by", input.ownerUserId)
    .not("input_asset_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(Math.min(20, Math.max(1, input.limit || 10)));
  if (input.activeOnly) query = query.in("status", ["queued", "running", "partial"]);
  const { data, error } = await query;
  if (error || !data) return [];
  const items: OwnerSellerPackInput[] = [];
  for (const row of data as Array<Record<string, unknown>>) {
    if (
      typeof row.id !== "string" ||
      typeof row.status !== "string" ||
      typeof row.created_at !== "string" ||
      typeof row.input_asset_id !== "string"
    ) continue;
    const preview = await signedPrivateToyAssetPreview({
      ownerUserId: input.ownerUserId,
      assetId: row.input_asset_id,
    });
    items.push({
      packRunId: row.id,
      status: row.status,
      createdAt: row.created_at,
      inputAssetId: row.input_asset_id,
      skuLabel: preview?.asset.skuLabel || null,
      inputPreviewUrl: preview?.url || null,
    });
  }
  return items;
}

export async function getOwnerSellerPackInput(input: {
  ownerUserId: string;
  packRunId: string;
}): Promise<OwnerSellerPackInput | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin
    .from("seller_pack_runs")
    .select("id,status,created_at,input_asset_id")
    .eq("id", input.packRunId)
    .eq("created_by", input.ownerUserId)
    .maybeSingle();
  if (
    error ||
    !data ||
    typeof data.id !== "string" ||
    typeof data.status !== "string" ||
    typeof data.created_at !== "string" ||
    typeof data.input_asset_id !== "string"
  ) return null;
  const preview = await signedPrivateToyAssetPreview({
    ownerUserId: input.ownerUserId,
    assetId: data.input_asset_id,
  });
  return {
    packRunId: data.id,
    status: data.status,
    createdAt: data.created_at,
    inputAssetId: data.input_asset_id,
    skuLabel: preview?.asset.skuLabel || null,
    inputPreviewUrl: preview?.url || null,
  };
}

export async function probePrivateToyAssets(): Promise<{
  bucketReady: boolean;
  schemaReady: boolean;
  reserveRpcReady: boolean;
  discoveryReady: boolean;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { bucketReady: false, schemaReady: false, reserveRpcReady: false, discoveryReady: false };
  }
  const [bucket, table, rpc, discovery] = await Promise.all([
    admin.storage.getBucket(PRIVATE_TOY_INPUTS_BUCKET),
    admin.from("toy_assets").select("id", { head: true, count: "exact" }).limit(1),
    admin.rpc("pikbo_reserve_seller_pack_with_asset_v1", {
      p_user_id: null,
      p_client_pack_key: "readiness-probe",
      p_input_asset_id: null,
      p_rights_confirmed: false,
    }),
    admin.from("seller_pack_runs").select("id,input_asset_id,rights_confirmed_at").limit(1),
  ]);
  const rpcPayload = rpc.data as Record<string, unknown> | null;
  return {
    bucketReady: !bucket.error && bucket.data?.public === false,
    schemaReady: !table.error,
    reserveRpcReady: !rpc.error && rpcPayload?.code === "AUTH_REQUIRED",
    discoveryReady: !discovery.error,
  };
}
