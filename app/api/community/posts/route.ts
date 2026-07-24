import { NextResponse } from "next/server";
import {
  communityUgcConfigured,
  listPublicCommunityPosts,
  publishCommunityPost,
} from "@/lib/communityPosts";
import { takeToken } from "@/lib/rateLimit";
import { clientIp } from "@/lib/requestMeta";

export const runtime = "nodejs";

/**
 * Cheap ops probe — configured flag only (no post bodies / secrets).
 * Mode A / softlive can HEAD without pulling UGC list.
 */
export async function HEAD() {
  const configured = communityUgcConfigured();
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Pikbo-Community-Ugc": configured ? "1" : "0",
      "X-Pikbo-Community-Note": configured
        ? "supabase-ready"
        : "lab-only-until-configured",
    },
  });
}

/** GET public approved UGC (empty list if table missing / no posts — never fake). */
export async function GET(req: Request) {
  const ip = clientIp(req);
  // Light scrape guard — public list only.
  const listRl = takeToken(`community-list:${ip || "unknown"}`, 60, 60_000);
  if (!listRl.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        error: `Too many community list requests — try again in ${listRl.retryAfterSec}s`,
        retryAfterSec: listRl.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(listRl.retryAfterSec) },
      }
    );
  }

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || 24);
  const { posts, configured, error } = await listPublicCommunityPosts(limit);
  return NextResponse.json({
    ok: true,
    configured,
    ugc: true,
    count: posts.length,
    posts,
    labOnly: posts.length === 0,
    note:
      posts.length === 0
        ? "No real community posts yet — UI should show PIKBO Lab only, never fake UGC."
        : "Real user posts only.",
    ...(error ? { warning: error } : {}),
  });
}

/** POST publish — requires Bearer access_token from Supabase auth. */
export async function POST(req: Request) {
  if (!communityUgcConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        code: "NOT_CONFIGURED",
        error: "Supabase not configured for community",
      },
      { status: 503 }
    );
  }
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", error: "Sign in required" },
      { status: 401 }
    );
  }

  const ip = clientIp(req);
  // Per-IP + per-token suffix (never store full JWT). Soft-launch process memory.
  const ipRl = takeToken(`community-post-ip:${ip || "unknown"}`, 12, 60_000);
  if (!ipRl.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        error: `Too many community publishes — try again in ${ipRl.retryAfterSec}s`,
        retryAfterSec: ipRl.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(ipRl.retryAfterSec) },
      }
    );
  }
  const tokenKey = token.length > 24 ? token.slice(-24) : token;
  const userRl = takeToken(`community-post:${tokenKey}`, 6, 60_000);
  if (!userRl.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        error: `Too many publishes for this account — try again in ${userRl.retryAfterSec}s`,
        retryAfterSec: userRl.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(userRl.retryAfterSec) },
      }
    );
  }

  let body: {
    title?: string;
    caption?: string;
    effectSlug?: string;
    videoUrl?: string;
    posterUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_JSON", error: "Invalid JSON" },
      { status: 400 }
    );
  }
  if (!body.videoUrl || typeof body.videoUrl !== "string") {
    return NextResponse.json(
      { ok: false, code: "INVALID_REQUEST", error: "videoUrl required" },
      { status: 400 }
    );
  }
  const result = await publishCommunityPost({
    accessToken: token,
    title: typeof body.title === "string" ? body.title : "My toy video",
    caption: typeof body.caption === "string" ? body.caption : "",
    effectSlug: typeof body.effectSlug === "string" ? body.effectSlug : undefined,
    videoUrl: body.videoUrl,
    posterUrl: typeof body.posterUrl === "string" ? body.posterUrl : undefined,
  });
  if (!result.ok) {
    const status =
      result.code === "UNAUTHORIZED"
        ? 401
        : result.code === "UNSAFE_URL"
          ? 400
          : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
}
