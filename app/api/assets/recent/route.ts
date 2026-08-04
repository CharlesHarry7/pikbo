import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import { resolvePrivateLiveAccess } from "@/lib/privateLiveAccessServer";
import { takeToken } from "@/lib/rateLimit";
import {
  listOwnerRecentReadyToyAssets,
  RECENT_PRIVATE_TOY_ASSETS_DEFAULT_LIMIT,
  RECENT_PRIVATE_TOY_ASSETS_MAX_LIMIT,
} from "@/lib/ownerRecentToyAssets";

export const runtime = "nodejs";

const NO_STORE = {
  "Cache-Control": "private, no-store",
} as const;

/**
 * Owner-only recent ready private toy photos for Create reuse.
 * Bearer auth required; never returns object keys, SHA, signed URLs, or owner PII.
 */
export async function GET(req: Request) {
  const auth = await getAuthUserFromRequest(req);
  if (!auth?.id) {
    return NextResponse.json(
      {
        ok: false,
        code: "AUTH_REQUIRED",
        error: "Sign in to load recent private toy photos",
      },
      { status: 401, headers: NO_STORE }
    );
  }
  const access = resolvePrivateLiveAccess(auth);
  if (!access.invite.invited) {
    return NextResponse.json(
      {
        ok: false,
        code: "PRIVATE_INPUT_ACCESS_REQUIRED",
        error: "Private seller input access is required",
      },
      { status: 403, headers: NO_STORE }
    );
  }
  const rateLimit = takeToken(`private-input-recent:${auth.id}`, 30, 60_000);
  if (!rateLimit.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        error: `Too many recent-photo requests — try again in ${rateLimit.retryAfterSec}s`,
        retryAfterSec: rateLimit.retryAfterSec,
      },
      {
        status: 429,
        headers: {
          ...NO_STORE,
          "Retry-After": String(rateLimit.retryAfterSec),
        },
      }
    );
  }

  const url = new URL(req.url);
  const rawLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit)
    ? Math.min(
        RECENT_PRIVATE_TOY_ASSETS_MAX_LIMIT,
        Math.max(1, Math.floor(rawLimit))
      )
    : RECENT_PRIVATE_TOY_ASSETS_DEFAULT_LIMIT;

  const assets = await listOwnerRecentReadyToyAssets({
    ownerUserId: auth.id,
    limit,
  });

  return NextResponse.json(
    {
      ok: true,
      assets,
      limit,
    },
    { status: 200, headers: NO_STORE }
  );
}
