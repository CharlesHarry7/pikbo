/**
 * Phase H + 哥飞 cold-start crawl budget:
 * - Index: home + primary rank tool + few quality pages only
 * - noindex: thin hubs, Lab-only community, preview suite, extra landings
 * Concept recipes without unique Lab proof stay noindex until proof lands.
 *
 * 2026-07-29 launch focus: home, pricing, and exactly three high-intent product
 * jobs. Long-tail tools/for remain reachable + noindex until real proof exists.
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

/**
 * Preview / Lab suite doors (not cold-start rank pages).
 * noindex so they stay out of the index — but follow + crawlable
 * (must NOT also be disallowed in robots.txt, or Google cannot read noindex).
 */
export const PREVIEW_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: true,
};

/**
 * Marketing index allowlist — exactly five pages (WorkBuddy release budget).
 * Paths have no trailing slash; root is "/".
 */
export const COLD_START_MARKETING_INDEX_PATHS = [
  "/",
  "/tools/ai-toy-video-generator",
  "/effects/360-spin-showcase",
  "/tools/blind-box-reveal-video-maker",
  "/pricing",
] as const;

/** Legal surfaces kept indexable (not marketing crawl budget). */
export const COLD_START_LEGAL_INDEX_PATHS = [
  "/privacy",
  "/terms",
] as const;

/** Full sitemap / robots allowlist = marketing five + legal. */
export const COLD_START_INDEX_PATHS = [
  ...COLD_START_MARKETING_INDEX_PATHS,
  ...COLD_START_LEGAL_INDEX_PATHS,
] as const;

/**
 * Tools allowed to index in cold start (must also appear in COLD_START_INDEX_PATHS).
 * Release budget: primary category tool + one distinct commercial tool only.
 */
export const COLD_START_INDEXABLE_TOOL_SLUGS = [
  "ai-toy-video-generator",
  "blind-box-reveal-video-maker",
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
  if (slug === "360-spin-showcase" && recipeHasUniqueProof(slug)) {
    return undefined;
  }
  return CONCEPT_ROBOTS;
}

/** Tools: cold-start allowlist only (primary + one commercial tool). */
export function robotsForToolSlug(slug: string): Metadata["robots"] | undefined {
  if (
    (COLD_START_INDEXABLE_TOOL_SLUGS as readonly string[]).includes(slug)
  ) {
    return undefined;
  }
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
