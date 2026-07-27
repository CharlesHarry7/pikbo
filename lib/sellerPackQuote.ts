/**
 * Seller Pack live quote helpers — Y5 credit transparency.
 * Pure client-safe math only (no fs / durableCredits / server stores).
 */

import { CREDITS_PER_VIDEO } from "@/lib/pricing";

/** Fixed Seller Pack child count (must match durableCredits/sellerPack server). */
export const SELLER_PACK_CHILD_COUNT = 3;
export const SELLER_PACK_QUOTE_CREDITS =
  SELLER_PACK_CHILD_COUNT * CREDITS_PER_VIDEO; // 30

export type SellerPackQuote = {
  childCount: number;
  creditsPerChild: number;
  totalCredits: number;
  demo: boolean;
};

/** Fixed 3-child Seller Pack quote (or N×10 for custom childCount). */
export function sellerPackQuote(opts: {
  demo: boolean;
  childCount?: number;
}): SellerPackQuote {
  const childCount = Math.max(
    1,
    Math.min(12, opts.childCount ?? SELLER_PACK_CHILD_COUNT)
  );
  if (opts.demo) {
    return {
      childCount,
      creditsPerChild: 0,
      totalCredits: 0,
      demo: true,
    };
  }
  return {
    childCount,
    creditsPerChild: CREDITS_PER_VIDEO,
    totalCredits: childCount * CREDITS_PER_VIDEO,
    demo: false,
  };
}

/** Default live pack quote is always 30 (3×10). */
export function sellerPackDefaultLiveTotal(): number {
  return SELLER_PACK_QUOTE_CREDITS;
}

/**
 * Whether cookie/me balance covers the live quote.
 * `undefined` balance = me not loaded yet → do not hard-block.
 */
export function sellerPackBalanceCovers(
  quote: SellerPackQuote,
  balance: number | undefined
): boolean {
  if (quote.demo) return true;
  if (balance === undefined) return true;
  return balance >= quote.totalCredits;
}

export function sellerPackShortfall(
  quote: SellerPackQuote,
  balance: number
): number {
  if (quote.demo) return 0;
  return Math.max(0, quote.totalCredits - balance);
}

/**
 * Preflight for starting a live multi-child pack.
 * Cached demos always ok. Unknown balance does not hard-block.
 * Free Mini (10 credits) cannot start a 30-credit full pack — PRD §6.
 */
export function sellerPackLiveStartAllowed(opts: {
  demo: boolean;
  balance: number | undefined;
  childCount: number;
  creditsPerChild?: number;
}):
  | { ok: true }
  | {
      ok: false;
      code: "INSUFFICIENT_CREDITS" | "FREE_MINI_FULL_PACK";
      need: number;
      have: number;
      message: string;
    } {
  if (opts.demo) return { ok: true };
  if (opts.balance === undefined) return { ok: true };
  const per = opts.creditsPerChild ?? CREDITS_PER_VIDEO;
  const need = Math.max(1, opts.childCount) * per;
  const have = opts.balance;
  if (have >= need) return { ok: true };
  // Exactly or at most one live child on Free Mini — never sell a full pack start.
  if (have < need && have < SELLER_PACK_QUOTE_CREDITS && need >= SELLER_PACK_QUOTE_CREDITS) {
    return {
      ok: false,
      code: "FREE_MINI_FULL_PACK",
      need,
      have,
      message:
        "Full Seller Starter Pack needs 30 live credits. Free Mini covers one 10-credit child — open single Generate for that recipe, or use cached previews at 0 credits.",
    };
  }
  return {
    ok: false,
    code: "INSUFFICIENT_CREDITS",
    need,
    have,
    message: `Need ${need} credits for this pack, session has ${have}. Failed children refund 10 when confirmed.`,
  };
}

/** One-line CTA / strip copy for the pack run button. */
export function sellerPackQuoteLabel(quote: SellerPackQuote): string {
  if (quote.demo) {
    return `${quote.childCount} clips · cached free (0 credits)`;
  }
  return `${quote.childCount} × ${quote.creditsPerChild} = ${quote.totalCredits} credits · failed child refunds 10`;
}

/**
 * Custom multi-preset batch quote line (H7 / Y5).
 * Same math as Seller Pack; wording says jobs not fixed pack.
 */
export function batchQuoteLabel(quote: SellerPackQuote): string {
  if (quote.demo) {
    return `${quote.childCount} jobs · cached free (0 credits)`;
  }
  return `${quote.childCount} jobs × ${quote.creditsPerChild} = ${quote.totalCredits} credits · fail refunds ${quote.creditsPerChild}`;
}
