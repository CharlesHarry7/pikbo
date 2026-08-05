import {
  corsJson,
  marketingCorsPreflight,
} from "@/lib/cors";
import {
  communityUgcConfigured,
  listPublicCommunityPosts,
  type CommunityPost,
} from "@/lib/communityPosts";
import { takeToken } from "@/lib/rateLimit";
import { clientIp } from "@/lib/requestMeta";
import { site } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Marketing feed item. Never invent creator handles, view counts, or likes.
 * Real UGC only — empty list when none approved.
 */
function marketingItem(post: CommunityPost) {
  return {
    id: post.id,
    title: post.title,
    caption: post.caption,
    effectUsed: post.effectSlug,
    /** Display name is not stored yet — do not invent handles. */
    creatorName: null as string | null,
    creatorId: post.userId,
    thumbnail: post.posterUrl,
    videoUrl: post.videoUrl,
    /** Engagement counters are not product-tracked — omit fake stats. */
    stats: null as null,
    createdAt: post.createdAt,
    provenance: "user_ugc" as const,
  };
}

export async function OPTIONS(req: Request) {
  return marketingCorsPreflight(req);
}

export async function HEAD() {
  const configured = communityUgcConfigured();
  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Pikbo-Community-Ugc": configured ? "1" : "0",
    },
  });
}

/**
 * GET /api/community — marketing community feed for the static site.
 * Never returns fake creators, fake stats, or synthetic UGC.
 */
export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = takeToken(`marketing-community:${ip || "unknown"}`, 60, 60_000);
  if (!rl.ok) {
    return corsJson(
      req,
      {
        ok: false,
        code: "RATE_LIMITED",
        error: `Too many community list requests — try again in ${rl.retryAfterSec}s`,
        retryAfterSec: rl.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || 24);
  const { posts, configured, error } = await listPublicCommunityPosts(limit);
  const items = posts.map(marketingItem);

  return corsJson(req, {
    ok: true,
    configured,
    ugc: true,
    count: items.length,
    items,
    /** Alias for clients that expect `posts` (mirrors /api/community/posts). */
    posts: items,
    labOnly: items.length === 0,
    note:
      items.length === 0
        ? "No real community posts yet. Static marketing pages must not invent creators, view counts, or likes — show Lab prototypes or an empty state."
        : "Real moderated user posts only. creatorName and stats are null until those fields exist product-side.",
    appUrl: site.url,
    ...(error ? { warning: error } : {}),
  });
}
