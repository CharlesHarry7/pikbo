/**
 * Phase H + 哥飞 cold-start crawl budget (2026-07-25 二轮拍板):
 * - Index: home + primary rank tool + few quality pages only
 * - noindex: thin hubs, Lab-only community, preview suite, extra landings
 * Concept recipes without unique Lab proof stay noindex until proof lands.
 */

import type { Metadata } from "next";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { PRESETS } from "@/lib/presets";

/** Recipes that have at least one distinct DEMO_VIDEOS entry (unique preset match). */
export function recipeHasUniqueProof(slug: string): boolean {
  return DEMO_VIDEOS.some((d) => d.preset === slug);
}

/** All preset slugs that currently have unique Lab proof. */
export function proofBackedRecipeSlugs(): string[] {
  const set = new Set(
    DEMO_VIDEOS.map((d) => d.preset).filter((s): s is string => Boolean(s))
  );
  return PRESETS.map((p) => p.slug).filter((slug) => set.has(slug));
}

/** Public SEO landings may still be followed so deep links work. */
export const CONCEPT_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: true,
};

/** Private / device / account surfaces. */
export const PRIVATE_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
};

/** Preview suite doors (not soft-launch primary product). */
export const PREVIEW_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
};

/**
 * 哥飞: 冷启动只保首页 + 主词页 + 3–5 高质量页（+ 法务）。
 * 路径无尾斜杠；根为 "/"。
 */
export const COLD_START_INDEX_PATHS = [
  "/",
  "/tools/ai-toy-video-generator",
  "/for/photo-to-video-for-toys",
  "/for/etsy-listing-videos",
  "/guides/how-to-photograph-toys-for-ai-video",
  "/explore",
  "/pricing",
  "/privacy",
  "/terms",
] as const;

const COLD_START_SET = new Set<string>(COLD_START_INDEX_PATHS);

export function normalizeSitePath(path: string): string {
  if (!path || path === "/") return "/";
  const p = path.startsWith("/") ? path : `/${path}`;
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

/** true → default indexable; false → noindex,follow (unless private). */
export function isColdStartIndexablePath(path: string): boolean {
  return COLD_START_SET.has(normalizeSitePath(path));
}

/**
 * Cold-start robots: allowlist only.
 * Use on public marketing/suite pages that would otherwise index.
 */
export function robotsForColdStartPath(
  path: string
): NonNullable<Metadata["robots"]> | undefined {
  if (isColdStartIndexablePath(path)) return undefined;
  return CONCEPT_ROBOTS;
}

export function robotsForRecipe(slug: string): Metadata["robots"] | undefined {
  // Cold-start: effect landings are not the rank battlefield — noindex.
  void slug;
  return CONCEPT_ROBOTS;
}

/** Tools: only primary rank slug indexes during cold start. */
export function robotsForToolSlug(slug: string): Metadata["robots"] | undefined {
  if (slug === "ai-toy-video-generator") return undefined;
  return CONCEPT_ROBOTS;
}

export function robotsForPrimaryEffect(
  primaryEffect: string | undefined
): Metadata["robots"] | undefined {
  // Legacy helper: use path-based cold start where possible.
  if (!primaryEffect || !recipeHasUniqueProof(primaryEffect)) {
    return CONCEPT_ROBOTS;
  }
  return CONCEPT_ROBOTS;
}

export function robotsForForSlug(slug: string): Metadata["robots"] | undefined {
  return robotsForColdStartPath(`/for/${slug}`);
}

export function robotsForGuideSlug(slug: string): Metadata["robots"] | undefined {
  return robotsForColdStartPath(`/guides/${slug}`);
}

export function robotsForToySlug(slug: string): Metadata["robots"] | undefined {
  return robotsForColdStartPath(`/toys/${slug}`);
}
