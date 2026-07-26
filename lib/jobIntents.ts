/**
 * Job-to-be-done intents for first-run Create (SaaS onboarding 2026 pattern:
 * route by outcome, not by model/feature list).
 *
 * Sources synthesized: progressive disclosure, outcome-first activation,
 * Etsy/TikTok seller workflows, empty-state primary CTA research.
 */

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
  /** Optional deep link into Seller Pack mode */
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
    label: "Box Reveal",
    blurb: "Unbox beat for restocks, drops, and open-box posts",
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
    label: "Seller Pack · Launch",
    blurb: "Default commercial path: listing + reveal + hook",
    effect: "360-spin-showcase",
    aspectRatio: "1:1",
    channel: "etsy",
    href: "/create?mode=seller-pack",
  },
];

export function getJobIntent(id: string): JobIntent | undefined {
  return JOB_INTENTS.find((j) => j.id === id);
}
