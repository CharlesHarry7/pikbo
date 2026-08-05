import {
  corsJson,
  marketingCorsPreflight,
} from "@/lib/cors";
import {
  EFFECT_CATEGORIES,
  effectStatusLabel,
  listToyEffects,
  type ToyEffect,
} from "@/lib/effects";
import { takeToken } from "@/lib/rateLimit";
import { clientIp } from "@/lib/requestMeta";
import { site } from "@/lib/site";

export const runtime = "nodejs";

function absoluteAssetUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = site.url.replace(/\/$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

function tagsForEffect(effect: ToyEffect): string[] {
  const tags = new Set<string>();
  tags.add(effect.status === "live" ? "live" : "coming-soon");
  tags.add(effect.category);
  tags.add(effect.aspectRatio);
  tags.add(`${effect.durationSec}s`);
  if (effect.nameZh) tags.add("bilingual");
  return [...tags];
}

function publicEffect(effect: ToyEffect) {
  return {
    slug: effect.slug,
    name: effect.name,
    nameZh: effect.nameZh ?? null,
    description: effect.description,
    longDescription: effect.longDescription,
    tagline: effect.tagline,
    tags: tagsForEffect(effect),
    thumbnail: absoluteAssetUrl(effect.previewImage),
    previewVideo: effect.previewVideo
      ? {
          poster: absoluteAssetUrl(effect.previewVideo.poster),
          mp4: absoluteAssetUrl(effect.previewVideo.mp4),
          ...(effect.previewVideo.webm
            ? { webm: absoluteAssetUrl(effect.previewVideo.webm) }
            : {}),
        }
      : null,
    status: effect.status,
    statusLabel: effectStatusLabel(effect.status),
    category: effect.category,
    aspectRatio: effect.aspectRatio,
    durationSec: effect.durationSec,
    tryHref:
      effect.status === "live" && effect.tryHref
        ? `${site.url.replace(/\/$/, "")}${effect.tryHref}`
        : null,
  };
}

export async function OPTIONS(req: Request) {
  return marketingCorsPreflight(req);
}

/**
 * GET /api/effects — marketing catalog for the static site.
 * Honest status: only Street Power-Up is live; others are Coming Soon.
 */
export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = takeToken(`marketing-effects:${ip || "unknown"}`, 120, 60_000);
  if (!rl.ok) {
    return corsJson(
      req,
      {
        ok: false,
        code: "RATE_LIMITED",
        error: `Too many effects list requests — try again in ${rl.retryAfterSec}s`,
        retryAfterSec: rl.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  const effects = listToyEffects().map(publicEffect);
  const liveCount = effects.filter((e) => e.status === "live").length;

  return corsJson(
    req,
    {
      ok: true,
      count: effects.length,
      liveCount,
      effects,
      categories: EFFECT_CATEGORIES,
      note:
        liveCount === 1
          ? "Only Street Power-Up is a live private-beta Moment. Other cards are Coming Soon concepts with cached Lab previews — not verified live generation."
          : "Effect catalog honesty note: check each item status before claiming live generation.",
      appUrl: site.url,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}
