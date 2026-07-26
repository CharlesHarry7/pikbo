/**
 * Seller Pack durable shadow — reserve 30, settle/release 10 per child.
 * Cookie debit on each /api/generate remains soft-launch authority.
 * This ledger audits signed-in (or guest) wallet when durableCreditsActive().
 */

import { CREDITS_PER_VIDEO } from "@/lib/pricing";
import {
  durableCreditsActive,
  durableRelease,
  durableReserve,
  durableSettle,
  ensurePersonalAccount,
} from "@/lib/durableCredits";

export const SELLER_PACK_CHILD_COUNT = 3;
export const SELLER_PACK_QUOTE_CREDITS =
  SELLER_PACK_CHILD_COUNT * CREDITS_PER_VIDEO; // 30
export const SELLER_PACK_ITEM_KEYS = [
  "360-spin-showcase",
  "blind-box-unboxing",
  "paparazzi-flash",
] as const;
export type SellerPackItemKey = (typeof SELLER_PACK_ITEM_KEYS)[number];

function sellerPackItemKey(raw: string | undefined): SellerPackItemKey | null {
  return SELLER_PACK_ITEM_KEYS.includes(raw as SellerPackItemKey)
    ? (raw as SellerPackItemKey)
    : null;
}

export type SellerPackShadow = {
  accountId: string;
  reservationId: string;
  quotedCredits: number;
  childCredits: number;
  ownerUserId: string;
  kind: "auth" | "guest";
};

export async function reserveSellerPackShadow(input: {
  ownerUserId: string;
  kind?: "auth" | "guest";
  idempotencyKey?: string;
}): Promise<
  | { ok: true; data: SellerPackShadow }
  | { ok: false; code: string; error: string }
> {
  if (!durableCreditsActive()) {
    return {
      ok: false,
      code: "DURABLE_OFF",
      error: "Durable credits not active — Seller Pack uses cookie debit only",
    };
  }
  const kind = input.kind ?? "guest";
  const childCredits = CREDITS_PER_VIDEO;
  const quoted = SELLER_PACK_QUOTE_CREDITS;
  try {
    const ensured = await ensurePersonalAccount(input.ownerUserId, 10);
    if (!ensured.ok) {
      return {
        ok: false,
        code: ensured.code || "ACCOUNT",
        error: ensured.error || "Could not ensure account",
      };
    }
    const accountId = ensured.data.account.id;
    const key =
      input.idempotencyKey ||
      `seller-pack:${kind}:${input.ownerUserId}:${Date.now()}`;
    const reserved = await durableReserve({
      accountId,
      createdBy: input.ownerUserId,
      purpose: "seller_pack",
      quotedCredits: quoted,
      idempotencyKey: key,
    });
    if (!reserved.ok) {
      return {
        ok: false,
        code: reserved.code,
        error: reserved.error,
      };
    }
    return {
      ok: true,
      data: {
        accountId,
        reservationId: reserved.data.reservation.id,
        quotedCredits: quoted,
        childCredits,
        ownerUserId: input.ownerUserId,
        kind,
      },
    };
  } catch (e) {
    return {
      ok: false,
      code: "ERROR",
      error: e instanceof Error ? e.message : "Seller Pack reserve failed",
    };
  }
}

export async function settleSellerPackChild(input: {
  reservationId: string;
  actorUserId: string;
  jobId?: string;
  childKey: string;
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  if (!durableCreditsActive()) return { ok: true };
  const itemKey = sellerPackItemKey(input.childKey);
  if (!itemKey) {
    return {
      ok: false,
      code: "INVALID_ITEM",
      error: "Unknown Seller Pack child",
    };
  }
  const key = `seller-pack-settle:${input.reservationId}:${itemKey}`;
  try {
    const r = await durableSettle({
      reservationId: input.reservationId,
      actorUserId: input.actorUserId,
      itemKey,
      idempotencyKey: key,
      jobId: input.jobId,
    });
    if (!r.ok) {
      console.warn("[seller-pack-shadow] settle failed", r.code, r.error);
      return { ok: false, code: r.code, error: r.error };
    }
    return { ok: true };
  } catch (e) {
    console.warn("[seller-pack-shadow] settle error", e);
    return {
      ok: false,
      code: "ERROR",
      error: e instanceof Error ? e.message : "settle failed",
    };
  }
}

export async function releaseSellerPackChild(input: {
  reservationId: string;
  actorUserId: string;
  reason?: string;
  jobId?: string;
  childKey: string;
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  if (!durableCreditsActive()) return { ok: true };
  const itemKey = sellerPackItemKey(input.childKey);
  if (!itemKey) {
    return {
      ok: false,
      code: "INVALID_ITEM",
      error: "Unknown Seller Pack child",
    };
  }
  const reason = input.reason || "child_failed";
  const key = `seller-pack-release:${input.reservationId}:${itemKey}`;
  try {
    const r = await durableRelease({
      reservationId: input.reservationId,
      actorUserId: input.actorUserId,
      itemKey,
      idempotencyKey: key,
      reason,
      jobId: input.jobId,
    });
    if (!r.ok) {
      console.warn("[seller-pack-shadow] release failed", r.code, r.error);
      return { ok: false, code: r.code, error: r.error };
    }
    return { ok: true };
  } catch (e) {
    console.warn("[seller-pack-shadow] release error", e);
    return {
      ok: false,
      code: "ERROR",
      error: e instanceof Error ? e.message : "release failed",
    };
  }
}

/**
 * Pure quote math for smoke tests — reserve N children × flat cost.
 */
export function sellerPackQuoteCredits(childCount = SELLER_PACK_CHILD_COUNT): number {
  return childCount * CREDITS_PER_VIDEO;
}
