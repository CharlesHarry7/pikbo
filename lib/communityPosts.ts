/**
 * Real community UGC via Supabase. Never invent fake posts.
 * Table: public.community_posts (see migrations/20260725120000_community_ugc.sql)
 */

import { createClient } from "@supabase/supabase-js";
import {
  isPublicCommunityVideoUrl,
  isSafeDeliverableUrl,
} from "@/lib/createTrust";

export type CommunityPost = {
  id: string;
  userId: string;
  title: string;
  caption: string;
  effectSlug: string | null;
  videoUrl: string;
  posterUrl: string | null;
  createdAt: string;
};

function supabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function supabaseAnonWithToken(accessToken: string) {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  if (!url || !anon) return null;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function communityUgcConfigured(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY)
  );
}

export async function listPublicCommunityPosts(
  limit = 24
): Promise<{ posts: CommunityPost[]; configured: boolean; error?: string }> {
  const admin = supabaseAdmin();
  if (!admin) {
    return { posts: [], configured: false };
  }
  try {
    const { data, error } = await admin
      .from("community_posts")
      .select(
        "id,user_id,title,caption,effect_slug,video_url,poster_url,created_at"
      )
      .eq("visibility", "public")
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .limit(Math.min(48, Math.max(1, limit)));
    if (error) {
      // Table missing until migration applied
      return {
        posts: [],
        configured: true,
        error: error.message,
      };
    }
    const posts: CommunityPost[] = (data || [])
      .map((row) => ({
        id: String(row.id),
        userId: String(row.user_id),
        title: String(row.title || "Untitled"),
        caption: String(row.caption || ""),
        effectSlug: row.effect_slug ? String(row.effect_slug) : null,
        videoUrl: String(row.video_url || ""),
        posterUrl: row.poster_url ? String(row.poster_url) : null,
        createdAt: String(row.created_at || ""),
      }))
      .filter((p) => isSafeDeliverableUrl(p.videoUrl));
    return { posts, configured: true };
  } catch (e) {
    return {
      posts: [],
      configured: true,
      error: e instanceof Error ? e.message : "list failed",
    };
  }
}

export async function publishCommunityPost(input: {
  accessToken: string;
  title: string;
  caption?: string;
  effectSlug?: string;
  videoUrl: string;
  posterUrl?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string; code: string }> {
  // Public UGC only — Free /api/downloads paths and relative Lab demos fail closed.
  if (!isPublicCommunityVideoUrl(input.videoUrl)) {
    return {
      ok: false,
      code: "UNSAFE_URL",
      error:
        "videoUrl must be a public http(s) media URL (not Free download or app-local paths)",
    };
  }
  if (
    input.posterUrl &&
    !(
      isPublicCommunityVideoUrl(input.posterUrl) ||
      (isSafeDeliverableUrl(input.posterUrl) &&
        input.posterUrl.startsWith("https://"))
    )
  ) {
    return {
      ok: false,
      code: "UNSAFE_URL",
      error: "posterUrl must be a public http(s) image URL",
    };
  }
  const client = supabaseAnonWithToken(input.accessToken);
  if (!client) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      error: "Supabase not configured for community publish",
    };
  }
  const { data: userData, error: userErr } = await client.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, code: "UNAUTHORIZED", error: "Sign in required" };
  }
  const title = input.title.trim().slice(0, 120) || "My toy video";
  const caption = (input.caption || "").trim().slice(0, 500);
  const { data, error } = await client
    .from("community_posts")
    .insert({
      user_id: userData.user.id,
      title,
      caption,
      effect_slug: input.effectSlug?.slice(0, 80) || null,
      video_url: input.videoUrl.trim(),
      poster_url: input.posterUrl?.trim() || null,
      visibility: "public",
      moderation_status: "approved",
    })
    .select("id")
    .single();
  if (error || !data?.id) {
    return {
      ok: false,
      code: "INSERT_FAILED",
      error: error?.message || "Could not publish (run UGC SQL migration?)",
    };
  }
  return { ok: true, id: String(data.id) };
}
