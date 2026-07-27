/**
 * Seller Pack durable shadow — reserve 30, settle/release 10 per child.
 * Live child spend is enforced by /api/generate cost gate (R0) — cookie is not
 * live-spend authority. This ledger audits wallets when durableCreditsActive().
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
  /** Override for tests; default 3× CREDITS_PER_VIDEO */
  childCount?: number;
  idempotencyKey?: string;
}): Promise<
  | { ok: true; data: SellerPackShadow }
  | { ok: false; code: string; error: string }
> {
  if (!durableCreditsActive()) {
    return {
      ok: false,
      code: "DURABLE_OFF",
      error:
        "Durable credits not active — Seller Pack shadow not opened. Live children still use /api/generate cost gate (anonymous/Free = labeled demos only; cookie is not live-spend authority)",
    };
  }
  const kind = input.kind ?? "guest";
  const childCount = input.childCount ?? SELLER_PACK_CHILD_COUNT;
  const childCredits = CREDITS_PER_VIDEO;
  const quoted = childCount * childCredits;
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
  childCredits?: number;
  jobId?: string;
  childKey?: string;
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  if (!durableCreditsActive()) return { ok: true };
  const credits = input.childCredits ?? CREDITS_PER_VIDEO;
  const key = `seller-pack-settle:${input.reservationId}:${input.childKey || input.jobId || Date.now()}`;
  try {
    const r = await durableSettle({
      reservationId: input.reservationId,
      credits,
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
  childCredits?: number;
  reason?: string;
  jobId?: string;
  childKey?: string;
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  if (!durableCreditsActive()) return { ok: true };
  const credits = input.childCredits ?? CREDITS_PER_VIDEO;
  const reason = input.reason || "child_failed";
  const key = `seller-pack-release:${input.reservationId}:${input.childKey || reason}:${input.jobId || Date.now()}`;
  try {
    const r = await durableRelease({
      reservationId: input.reservationId,
      credits,
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
