import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ensureSession, publicSession } from "@/lib/session";
import {
  localAssetMaxBytes,
  localAssetTtlMs,
  reserveLocalAssetId,
} from "@/lib/localAssets";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import { resolvePrivateLiveAccess } from "@/lib/privateLiveAccessServer";
import {
  createPrivateToyAssetUpload,
  PRIVATE_TOY_INPUT_MAX_BYTES,
} from "@/lib/privateToyAssets";
import { takeToken } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Phase D — local upload contract (no object storage yet).
 * Returns a same-origin PUT target for soft-launch demos. Clients may still
 * post Base64 to /api/generate; this path avoids repeating large payloads when
 * the local content route is used.
 *
 * Mints a session-scoped reservation so another cookie cannot PUT the same id.
 */
export async function POST(req: Request) {
  let body: {
    private?: boolean;
    filename?: string;
    contentType?: string;
    mimeType?: string;
    byteLength?: number;
    sizeBytes?: number;
    sha256?: string;
    clientAssetKey?: string;
    skuLabel?: string;
  } = {};
  let contentType = "image/jpeg";
  let byteLength: number | undefined;
  try {
    body = (await req.json()) as typeof body;
    if (typeof body.contentType === "string" && body.contentType.startsWith("image/")) {
      contentType = body.contentType.slice(0, 64);
    }
    if (typeof body.byteLength === "number") byteLength = body.byteLength;
  } catch {
    // empty body ok
  }

  const session = await ensureSession();
  if (body.private === true) {
    const auth = await getAuthUserFromRequest(req);
    const privateAccess = resolvePrivateLiveAccess(auth);
    if (!auth?.id) {
      return NextResponse.json(
        {
          ok: false,
          code: "AUTH_REQUIRED",
          error: "Sign in before uploading a private toy photo",
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
    const uploadRate = takeToken(
      `private-input-prepare:${auth.id}`,
      12,
      60_000
    );
    if (!uploadRate.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: "RATE_LIMITED",
          error: "Too many private upload attempts — wait before retrying",
          retryAfterSec: uploadRate.retryAfterSec,
          session: publicSession(session),
        },
        {
          status: 429,
          headers: { "Retry-After": String(uploadRate.retryAfterSec) },
        }
      );
    }
    const created = await createPrivateToyAssetUpload({
      userId: auth.id,
      clientAssetKey:
        typeof body.clientAssetKey === "string" ? body.clientAssetKey : "",
      sha256: typeof body.sha256 === "string" ? body.sha256 : "",
      mimeType:
        typeof body.mimeType === "string"
          ? body.mimeType
          : typeof body.contentType === "string"
            ? body.contentType
            : "",
      sizeBytes:
        typeof body.sizeBytes === "number"
          ? body.sizeBytes
          : typeof body.byteLength === "number"
            ? body.byteLength
            : 0,
      skuLabel:
        typeof body.skuLabel === "string" ? body.skuLabel : null,
    });
    if (!created.ok) {
      const status =
        created.code === "IMAGE_TOO_LARGE"
          ? 413
          : created.code === "IDEMPOTENCY_CONFLICT"
            ? 409
            : created.code === "PRIVATE_INPUT_UNAVAILABLE" ||
                created.code === "PRIVATE_INPUT_UPLOAD_URL_FAILED"
              ? 503
              : 400;
      return NextResponse.json(
        {
          ok: false,
          code: created.code,
          error: created.error,
          maxBytes: PRIVATE_TOY_INPUT_MAX_BYTES,
          session: publicSession(session),
        },
        { status }
      );
    }
    return NextResponse.json(
      {
        ok: true,
        mode: "private-storage",
        durable: true,
        inputAssetId: created.asset.inputAssetId,
        sha256: created.asset.sha256,
        mimeType: created.asset.mimeType,
        sizeBytes: created.asset.sizeBytes,
        skuLabel: created.asset.skuLabel,
        state: created.asset.state,
        uploadUrl: created.uploadUrl,
        method: created.uploadUrl ? "PUT" : null,
        headers: created.uploadUrl
          ? {
              "x-upsert": "false",
            }
          : {},
        maxBytes: PRIVATE_TOY_INPUT_MAX_BYTES,
        expiresAt: created.expiresAt,
        idempotent: created.idempotent,
        session: publicSession(session),
      },
      { status: created.asset.state === "ready" ? 200 : 201 }
    );
  }

  const maxBytes = localAssetMaxBytes();
  if (typeof byteLength === "number" && byteLength > maxBytes) {
    return NextResponse.json(
      {
        ok: false,
        code: "IMAGE_TOO_LARGE",
        error: `Max upload ${maxBytes} bytes`,
        maxBytes,
      },
      { status: 413 }
    );
  }

  // Rare: re-mint if the first id collides with a foreign reservation (UUID clash).
  let assetId = "";
  let expiresAt = "";
  for (let i = 0; i < 3; i++) {
    assetId = `asset_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const reserved = reserveLocalAssetId({
      id: assetId,
      sessionId: session.id,
    });
    if (reserved.ok) {
      expiresAt = reserved.expiresAt;
      break;
    }
  }
  if (!expiresAt) {
    return NextResponse.json(
      {
        ok: false,
        code: "RESERVE_FAILED",
        error: "Could not reserve asset id — retry upload",
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      mode: "local-memory",
      durable: false,
      assetId,
      uploadUrl: `/api/assets/${assetId}/content`,
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "X-Pikbo-Session": "cookie",
      },
      maxBytes,
      ttlMs: localAssetTtlMs(),
      expiresAt,
      sessionId: session.id,
      note:
        "Local PUT target for soft-launch (session-reserved id). Object storage not wired. Soft-launch generate still accepts data URLs.",
      planned: {
        production: "signed PUT to private bucket; never expose permanent raw provider URLs",
      },
    },
    { status: 201 }
  );
}
