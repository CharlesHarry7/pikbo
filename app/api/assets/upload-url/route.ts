import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import { resolvePrivateLiveAccess } from "@/lib/privateLiveAccessServer";
import { probeSoftLiveReadiness } from "@/lib/liveReadinessServer";
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
  if (!access.invite.invited || !access.budget.ok) {
    return NextResponse.json(
      { ok: false, code: "PRIVATE_PREVIEW_REQUIRED", error: "Private seller Preview access is required" },
      { status: 403 }
    );
  }
  const readiness = await probeSoftLiveReadiness();
  if (!readiness.privatePreview.ready) {
    return NextResponse.json(
      { ok: false, code: "PRIVATE_PREVIEW_NOT_READY", error: "Private input delivery is not ready" },
      { status: 503 }
    );
  }

  let body: {
    filename?: string;
    mimeType?: string;
    contentType?: string;
    sizeBytes?: number;
    byteLength?: number;
    sha256?: string;
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
    skuLabel: typeof body.skuLabel === "string" ? body.skuLabel : null,
  });
  if (!prepared.ok) {
    const status =
      prepared.code === "IMAGE_TOO_LARGE" ? 413 :
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
      uploadUrl: prepared.uploadUrl,
      method: "PUT",
      expiresAt: prepared.expiresAt,
      maxBytes: prepared.maxBytes,
      private: true,
      durable: true,
    },
    { status: 201 }
  );
}
