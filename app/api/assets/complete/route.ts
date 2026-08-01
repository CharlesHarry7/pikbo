import { NextResponse } from "next/server";
import { ensureSession, publicSession } from "@/lib/session";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import { resolvePrivateLiveAccess } from "@/lib/privateLiveAccessServer";
import {
  completePrivateToyAsset,
  PRIVATE_TOY_INPUT_MAX_BYTES,
} from "@/lib/privateToyAssets";
import { takeToken } from "@/lib/rateLimit";

export const runtime = "nodejs";

/** Verify uploaded private bytes and atomically transition pending → ready. */
export async function POST(req: Request) {
  let body: { inputAssetId?: string; assetId?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const session = await ensureSession();
  const auth = await getAuthUserFromRequest(req);
  const privateAccess = resolvePrivateLiveAccess(auth);
  if (!auth?.id) {
    return NextResponse.json(
      {
        ok: false,
        code: "AUTH_REQUIRED",
        error: "Sign in to verify a private toy photo",
        session: publicSession(session),
      },
      { status: 401 }
    );
  }
  if (!privateAccess.invite.invited) {
    return NextResponse.json(
      {
        ok: false,
        code: "LIVE_ACCESS_REQUIRED",
        error: "Private toy-photo upload is limited to invited sellers",
        session: publicSession(session),
      },
      { status: 403 }
    );
  }
  const completeRate = takeToken(
    `private-input-complete:${auth.id}`,
    18,
    60_000
  );
  if (!completeRate.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        error: "Too many private verification attempts — wait before retrying",
        retryAfterSec: completeRate.retryAfterSec,
        session: publicSession(session),
      },
      {
        status: 429,
        headers: { "Retry-After": String(completeRate.retryAfterSec) },
      }
    );
  }
  const inputAssetId =
    typeof body.inputAssetId === "string"
      ? body.inputAssetId.trim()
      : typeof body.assetId === "string"
        ? body.assetId.trim()
        : "";
  if (inputAssetId.length < 8) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_REQUEST",
        error: "inputAssetId is required",
        maxBytes: PRIVATE_TOY_INPUT_MAX_BYTES,
        session: publicSession(session),
      },
      { status: 400 }
    );
  }

  const completed = await completePrivateToyAsset({
    userId: auth.id,
    inputAssetId,
  });
  if (!completed.ok) {
    const status =
      completed.code === "INPUT_ASSET_NOT_FOUND"
        ? 404
        : completed.code === "IMAGE_TOO_LARGE"
          ? 413
          : completed.code === "PRIVATE_INPUT_UNAVAILABLE" ||
              completed.code === "PRIVATE_INPUT_COMPLETE_FAILED"
            ? 503
            : 400;
    return NextResponse.json(
      {
        ok: false,
        code: completed.code,
        error: completed.error,
        maxBytes: PRIVATE_TOY_INPUT_MAX_BYTES,
        session: publicSession(session),
      },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    durable: true,
    private: true,
    inputAssetId: completed.asset.inputAssetId,
    sha256: completed.asset.sha256,
    mimeType: completed.asset.mimeType,
    sizeBytes: completed.asset.sizeBytes,
    skuLabel: completed.asset.skuLabel,
    state: completed.asset.state,
    idempotent: completed.idempotent,
    session: publicSession(session),
  });
}
