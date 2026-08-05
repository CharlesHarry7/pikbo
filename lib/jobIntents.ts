/**
 * Job-to-be-done intents for first-run Create (SaaS onboarding 2026 pattern:
 * route by outcome, not by model/feature list).
 *
 * Sources synthesized: progressive disclosure, outcome-first activation,
 * Etsy/TikTok seller workflows, empty-state primary CTA research.
 */

import { createRemixHref } from "@/lib/remixIntent";

export type JobIntentId =
  | "etsy-listing"
  | "tiktok-hook"
  | "blind-box-drop"
  | "shelf-display"
  | "seller-pack";

export type JobIntent = {
  id: JobIntentId;
  label: string;
  blurb: string;
  /** Recipe to select */
  effect: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  channel: "etsy" | "tiktok" | "reels" | "whatnot" | "pdp";
  /** Optional deep link override for a legacy intent */
  href?: string;
};

/** Commercial goals first (Creative Director) — not model/feature names. */
export const JOB_INTENTS: JobIntent[] = [
  {
    id: "etsy-listing",
    label: "Listing · 360° Spin",
    blurb: "1:1 packshot for Etsy / Shopify / Amazon galleries",
    effect: "360-spin-showcase",
    aspectRatio: "1:1",
    channel: "etsy",
  },
  {
    id: "tiktok-hook",
    label: "Social Hook",
    blurb: "9:16 first-second flash for TikTok / Reels / 小红书",
    effect: "paparazzi-flash",
    aspectRatio: "9:16",
    channel: "tiktok",
  },
  {
    id: "blind-box-drop",
    label: "Unboxing",
    blurb: "9:16 reveal beat for restocks, drops, and open-box posts",
    effect: "blind-box-unboxing",
    aspectRatio: "9:16",
    channel: "tiktok",
  },
  {
    id: "shelf-display",
    label: "Display Glow",
    blurb: "Clean shelf / case hold for collectors and PDP",
    effect: "display-case-glam",
    aspectRatio: "9:16",
    channel: "pdp",
  },
  {
    id: "seller-pack",
    label: "Street Power-Up Moment",
    blurb: "One directed 9:16 launch clip from one toy photo",
    effect: "street-power-up",
    aspectRatio: "9:16",
    channel: "tiktok",
  },
];

export function getJobIntent(id: string): JobIntent | undefined {
  return JOB_INTENTS.find((j) => j.id === id);
}

/**
 * Outcome-first Create deep link: remix contract (effect/ratio/duration/channel)
 * plus `job=` so CreateStudio can still highlight the commercial intent chip.
 * Legacy Seller Pack intents resolve to one public Moment; the private
 * multi-output validation route is never emitted by this public helper.
 */
export function createJobRemixHref(jobId: JobIntentId | string): string {
  const intent = getJobIntent(jobId);
  if (!intent) {
    return createGenerate360Href();
  }
  if (intent.href) return intent.href;
  const base = createRemixHref(intent.effect, undefined, null, {
    ratio: intent.aspectRatio,
    channel: intent.channel,
  });
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}job=${encodeURIComponent(intent.id)}`;
}

/** Canonical listing-spin recipe for every Generate door. */
export const GENERATE_360_EFFECT = "360-spin-showcase" as const;

/**
 * Frozen chrome / home-secondary Generate source tags (AIT-122).
 * Keep identical to `CHROME_GENERATE_SOURCE_TAGS` in guestCreateIntent.ts.
 * Chrome doors deep-link create only; guest login uses guestCreateIntent.
 */
export const CHROME_GENERATE_SOURCE = {
  header: "header",
  mobileBar: "mobile-bar",
  homeProofWall: "home-proof-wall",
  homeToolShelf: "home-tool-shelf",
  homeBrowse: "home-browse",
  hfProductRail: "hf-product-rail",
} as const;

/**
 * Single Generate → 360° studio deep link.
 * Optional `source` tags the entry surface (nav, suite, library-empty, …)
 * via the remix `source` query so Create can keep honest intent.
 * Never emits bare `/create`.
 */
export function createGenerate360Href(source?: string): string {
  const tag = (source || "").trim().slice(0, 64);
  return createRemixHref(GENERATE_360_EFFECT, tag || undefined);
}

/** Lab sample first-run path — remix + try/sample flags CreateStudio hydrates. */
export function createLabSampleTryHref(sampleId = "scout"): string {
  const source =
    sampleId === "scout"
      ? "scout-spin"
      : sampleId === "orbit"
        ? "orbit-cgi"
        : sampleId === "moon"
          ? "moon-reveal"
          : undefined;
  const base = createGenerate360Href(source);
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}try=1&sample=${encodeURIComponent(sampleId)}`;
}

/**
 * Workbench Generate door — alias of createGenerate360Href.
 * Prefer createGenerate360Href for new call sites.
 */
export function createWorkbenchHref(source?: string): string {
  return createGenerate360Href(source);
}
