import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import { resolvePrivateLiveAccess } from "@/lib/privateLiveAccessServer";
import { probeSoftLiveReadiness } from "@/lib/liveReadinessServer";
import { takeToken } from "@/lib/rateLimit";
import {
  createPrivateToyAssetUpload,
  PRIVATE_TOY_INPUT_MAX_BYTES,
} from "@/lib/privateToyAssets";

export const runtime = "nodejs";

/** Invited, authenticated sellers only. No anonymous/local-memory fallback. */
export async function POST(req: Request) {
  const auth = await getAuthUserFromRequest(req);
  if (!auth?.id) {
    return NextResponse.json(
      { ok: false, code: "AUTH_REQUIRED", error: "Sign in to upload a private toy photo" },
      { status: 401 }
    );
  }
  const access = resolvePrivateLiveAccess(auth);
  if (!access.invite.invited) {
    return NextResponse.json(
      { ok: false, code: "PRIVATE_INPUT_ACCESS_REQUIRED", error: "Private seller input access is required" },
      { status: 403 }
    );
  }
  const readiness = await probeSoftLiveReadiness();
  if (!readiness.privateInputAdmission.ready) {
    return NextResponse.json(
      { ok: false, code: "PRIVATE_INPUT_NOT_READY", error: "Private photo upload is temporarily unavailable" },
      { status: 503 }
    );
  }
  const rateLimit = takeToken(`private-input-prepare:${auth.id}`, 12, 60_000);
  if (!rateLimit.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        error: `Too many private photo attempts — try again in ${rateLimit.retryAfterSec}s`,
        retryAfterSec: rateLimit.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSec) },
      }
    );
  }

  let body: {
    filename?: string;
    mimeType?: string;
    contentType?: string;
    sizeBytes?: number;
    byteLength?: number;
    sha256?: string;
    clientAssetKey?: string;
    skuLabel?: string;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const prepared = await createPrivateToyAssetUpload({
    ownerUserId: auth.id,
    mimeType: String(body.mimeType || body.contentType || ""),
    sizeBytes: Number(body.sizeBytes ?? body.byteLength),
    sha256: String(body.sha256 || "").toLowerCase(),
    clientAssetKey: String(body.clientAssetKey || ""),
    skuLabel: typeof body.skuLabel === "string" ? body.skuLabel : null,
  });
  if (!prepared.ok) {
    const status =
      prepared.code === "IMAGE_TOO_LARGE" ? 413 :
      prepared.code === "IDEMPOTENCY_CONFLICT" ? 409 :
      prepared.code === "PRIVATE_INPUT_INVALID_RESPONSE" ? 503 :
      prepared.code === "PRIVATE_INPUTS_UNAVAILABLE" ? 503 : 400;
    return NextResponse.json(
      { ...prepared, maxBytes: PRIVATE_TOY_INPUT_MAX_BYTES },
      { status }
    );
  }
  return NextResponse.json(
    {
      ok: true,
      assetId: prepared.assetId,
      inputAssetId: prepared.assetId,
      uploadUrl: prepared.uploadUrl,
      method: prepared.uploadUrl ? "PUT" : null,
      expiresAt: prepared.expiresAt,
      maxBytes: prepared.maxBytes,
      state: prepared.state,
      idempotent: prepared.idempotent,
      private: true,
      durable: true,
    },
    { status: prepared.state === "ready" ? 200 : 201 }
  );
}
