/**
 * Seller Starter Pack product contract — single source of truth.
 *
 * PRD: docs/prd/SELLER_PACK.md §4
 * Three fixed children. Custom multi-effect batches must not use this label.
 * Cached golden path: 0 credits · no provider call when demos are served.
 *
 * Pure module — no path aliases (Node smoke imports this file directly).
 */

/** Must stay equal to CREDITS_PER_VIDEO in lib/pricing.ts (flat 10). */
export const SELLER_PACK_CREDITS_PER_CHILD = 10 as const;

export const SELLER_PACK_CHILD_COUNT = 3 as const;

/** Live full pack quote (3 × 10). */
export const SELLER_PACK_LIVE_TOTAL_CREDITS =
  SELLER_PACK_CHILD_COUNT * SELLER_PACK_CREDITS_PER_CHILD;

/**
 * Frozen v1 children — order is product contract.
 * Do not rename slugs without a PRD bump + golden-path smoke update.
 */
export const SELLER_PACK_ITEMS = [
  {
    key: "listing_spin",
    slug: "360-spin-showcase",
    label: "Listing Spin",
    channel: "Marketplace gallery",
    aspectRatio: "1:1" as const,
    durationSec: 5 as const,
  },
  {
    key: "blind_box_reveal",
    slug: "blind-box-unboxing",
    label: "Blind-box Reveal",
    channel: "Launch / restock",
    aspectRatio: "9:16" as const,
    durationSec: 5 as const,
  },
  {
    key: "social_flash",
    slug: "paparazzi-flash",
    label: "Social Flash",
    channel: "TikTok / Reels / Shorts",
    aspectRatio: "9:16" as const,
    durationSec: 5 as const,
  },
] as const;

export type SellerPackItem = (typeof SELLER_PACK_ITEMS)[number];
export type SellerPackSlug = SellerPackItem["slug"];

export const SELLER_PACK_SLUGS: readonly SellerPackSlug[] = SELLER_PACK_ITEMS.map(
  (i) => i.slug
);

export type SellerPackChildOutcomeStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "refunded"
  | "not_started"
  | "recovery_unavailable";

/** A retry may target only work that did not produce a retained success. */
export function isSellerPackRetryableStatus(
  status: SellerPackChildOutcomeStatus
): boolean {
  return (
    status === "failed" ||
    status === "refunded" ||
    status === "not_started"
  );
}

/** True when the slug list is exactly the frozen pack (order-insensitive). */
export function isExactSellerPackSelection(slugs: readonly string[]): boolean {
  if (slugs.length !== SELLER_PACK_SLUGS.length) return false;
  const set = new Set(slugs);
  return SELLER_PACK_SLUGS.every((s) => set.has(s));
}

/**
 * Pure golden-path settlement model (cached demos).
 * Zero provider: each child is 0 credits · demo · succeeded.
 * Partial fail does not invent refunds on cached path.
 */
export function sellerPackCachedGoldenSettlement(opts?: {
  /** Indices that "fail" as demo-path not_started / failed without debit */
  failedIndexes?: number[];
}): {
  childCount: number;
  totalCredits: 0;
  demo: true;
  providerCalls: 0;
  children: Array<{
    slug: SellerPackSlug;
    credits: 0;
    demo: true;
    status: Extract<
      SellerPackChildOutcomeStatus,
      "succeeded" | "failed" | "not_started"
    >;
    refund: "n/a";
  }>;
  creditsCharged: 0;
  creditsRefunded: 0;
} {
  const failed = new Set(opts?.failedIndexes ?? []);
  const children = SELLER_PACK_ITEMS.map((item, i) => ({
    slug: item.slug,
    credits: 0 as const,
    demo: true as const,
    status: (failed.has(i) ? "failed" : "succeeded") as
      | "succeeded"
      | "failed",
    refund: "n/a" as const,
  }));
  return {
    childCount: SELLER_PACK_CHILD_COUNT,
    totalCredits: 0,
    demo: true,
    providerCalls: 0,
    children,
    creditsCharged: 0,
    creditsRefunded: 0,
  };
}
