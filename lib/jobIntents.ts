/**
 * Job-to-be-done intents for first-run Create (SaaS onboarding 2026 pattern:
 * route by outcome, not by model/feature list).
 *
 * Sources synthesized: progressive disclosure, outcome-first activation,
 * Etsy/TikTok seller workflows, empty-state primary CTA research.
 */

import {
  createRemixHref,
  type RemixHrefOpts,
} from "@/lib/remixIntent";

/**
 * Canonical listing-spin recipe for every product-shell "Generate" door.
 * Do not hardcode this slug in CTAs — use createWorkbenchHref / createRemixHref.
 */
export const DEFAULT_GENERATE_EFFECT = "360-spin-showcase" as const;

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
    return createWorkbenchHref();
  }
  if (intent.href) return intent.href;
  const base = createRemixHref(intent.effect, undefined, null, {
    ratio: intent.aspectRatio,
    channel: intent.channel,
  });
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}job=${encodeURIComponent(intent.id)}`;
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
  const base = createWorkbenchHref(source);
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}try=1&sample=${encodeURIComponent(sampleId)}`;
}

/**
 * Single Generate→360 door helper (AIT-75/88/100).
 * Always carries the full remix contract (effect/ratio/duration/channel).
 * Optional sourceId / sku / opts match createRemixHref for provenance carry.
 */
export function createWorkbenchHref(
  sourceId?: string,
  sku?: string | null,
  opts?: RemixHrefOpts
): string {
  return createRemixHref(DEFAULT_GENERATE_EFFECT, sourceId, sku, opts);
}
