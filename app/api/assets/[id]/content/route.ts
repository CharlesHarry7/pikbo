import { NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import {
  getLocalAsset,
  localAssetMaxBytes,
  putLocalAsset,
} from "@/lib/localAssets";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import { signedPrivateToyAssetPreview } from "@/lib/privateToyAssets";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const NO_STORE = {
  "Cache-Control": "private, no-store",
} as const;

function isUuidAssetId(id: string): boolean {
  return UUID_RE.test(id);
}

function notFoundPrivate(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      code: "NOT_FOUND",
      error: "Asset missing, expired, or not owned by this session",
    },
    { status: 404, headers: NO_STORE }
  );
}

/**
 * Phase D local asset body — PUT bytes after POST /api/assets/upload-url.
 * GET returns the stored data URL for the owning session (soft-launch only).
 * UUID private toy assets: owner Bearer auth → short-lived signed redirect.
 */
export async function PUT(req: Request, { params }: Props) {
  const { id } = await params;
  if (!id.startsWith("asset_")) {
    return NextResponse.json(
      { ok: false, code: "INVALID_ID", error: "Unknown asset id shape" },
      { status: 400 }
    );
  }
  const session = await ensureSession();
  const contentType =
    req.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const buf = Buffer.from(await req.arrayBuffer());
  const result = putLocalAsset({
    id,
    sessionId: session.id,
    contentType,
    bytes: buf,
  });
  if (!result.ok) {
    const status =
      result.code === "IMAGE_TOO_LARGE"
        ? 413
        : result.code === "NOT_OWNED"
          ? 403
          : result.code === "EXPIRED"
            ? 410
            : 400;
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        error: result.error,
        maxBytes: localAssetMaxBytes(),
      },
      { status }
    );
  }
  // Never echo multi-MB dataUrl back — client already has the still locally.
  // Generate reads via getLocalAsset(session) on the server.
  return NextResponse.json({
    ok: true,
    mode: "local-memory",
    durable: false,
    assetId: result.asset.id,
    byteLength: result.asset.byteLength,
    contentType: result.asset.contentType,
    expiresAt: result.asset.expiresAt,
    note: "In-process only · session-owned · expires ~15m · not multi-node durable",
  });
}

/**
 * Meta-only probe — Create/Seller Pack can confirm the still still exists
 * without downloading multi-MB dataUrl (multi-instance / TTL recovery).
 * UUID private assets: owner + ready only (indistinguishable 404 otherwise).
 */
export async function HEAD(req: Request, { params }: Props) {
  const { id } = await params;
  if (isUuidAssetId(id)) {
    const auth = await getAuthUserFromRequest(req);
    if (!auth?.id) {
      return new NextResponse(null, {
        status: 401,
        headers: {
          ...NO_STORE,
          "X-Pikbo-Asset": "auth-required",
        },
      });
    }
    const preview = await signedPrivateToyAssetPreview({
      ownerUserId: auth.id,
      assetId: id,
    });
    if (!preview) {
      return new NextResponse(null, {
        status: 404,
        headers: {
          ...NO_STORE,
          "X-Pikbo-Asset": "missing",
        },
      });
    }
    return new NextResponse(null, {
      status: 200,
      headers: {
        ...NO_STORE,
        "X-Pikbo-Asset": "ok",
        "X-Pikbo-Asset-Id": preview.asset.id,
        "X-Pikbo-Asset-Bytes": String(preview.asset.sizeBytes),
        "X-Pikbo-Asset-Type": preview.asset.mimeType.slice(0, 64),
        "X-Pikbo-Asset-Mode": "private-ready",
      },
    });
  }

  const session = await ensureSession();
  const asset = getLocalAsset(id, session.id);
  if (!asset) {
    return new NextResponse(null, {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Pikbo-Asset": "missing",
      },
    });
  }
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Pikbo-Asset": "ok",
      "X-Pikbo-Asset-Id": asset.id,
      "X-Pikbo-Asset-Bytes": String(asset.byteLength),
      "X-Pikbo-Asset-Type": asset.contentType.slice(0, 64),
      "X-Pikbo-Asset-Expires": asset.expiresAt,
    },
  });
}

export async function GET(req: Request, { params }: Props) {
  const { id } = await params;

  // Durable private toy input (UUID): re-auth owner + ready, then short-lived
  // signed redirect. Cross-owner and missing are both 404 (no ownership leak).
  // Signed URL lives only in Location — never in a JSON Create DTO.
  if (isUuidAssetId(id)) {
    const auth = await getAuthUserFromRequest(req);
    if (!auth?.id) {
      return NextResponse.json(
        {
          ok: false,
          code: "AUTH_REQUIRED",
          error: "Sign in to view this private toy photo",
        },
        { status: 401, headers: NO_STORE }
      );
    }
    const preview = await signedPrivateToyAssetPreview({
      ownerUserId: auth.id,
      assetId: id,
    });
    if (!preview) {
      return notFoundPrivate();
    }
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: preview.url,
        ...NO_STORE,
        "X-Pikbo-Asset": "private-ready",
        "X-Pikbo-Asset-Id": preview.asset.id,
      },
    });
  }

  const session = await ensureSession();
  const asset = getLocalAsset(id, session.id);
  if (!asset) {
    return NextResponse.json(
      {
        ok: false,
        code: "NOT_FOUND",
        error: "Asset missing, expired, or not owned by this session",
      },
      { status: 404, headers: NO_STORE }
    );
  }
  return NextResponse.json({
    ok: true,
    mode: "local-memory",
    assetId: asset.id,
    contentType: asset.contentType,
    byteLength: asset.byteLength,
    expiresAt: asset.expiresAt,
    dataUrl: asset.dataUrl,
  });
}
