/**
 * Seller Pack durable authority.
 *
 * Preferred path: one atomic 30-credit pack reservation + three fixed child
 * jobs (service-role RPCs). Legacy shadow reserve/settle helpers remain for
 * offline adapters and name-stable smoke locks; live generate with pack ids
 * never opens a second per-generation R1a reserve.
 */

import { CREDITS_PER_VIDEO } from "@/lib/pricing";
import {
  durableCreditsActive,
  durableReserve,
  ensurePersonalAccount,
} from "@/lib/durableCredits";
import {
  authorizeAtomicSellerPackChild,
  getAtomicSellerPackStatus,
  releaseAtomicSellerPackChild,
  reserveAtomicSellerPack,
  retryAtomicSellerPackChild,
  settleAtomicSellerPackChild,
  SELLER_PACK_CHILD_CREDITS,
  SELLER_PACK_QUOTED_CREDITS,
} from "@/lib/durableCredits/sellerPackAtomic";
import type { StrictLiveReservation } from "@/lib/durableCredits/liveReservation";

export const SELLER_PACK_CHILD_COUNT = 3;
export const SELLER_PACK_QUOTE_CREDITS = SELLER_PACK_QUOTED_CREDITS;

export type SellerPackShadow = {
  accountId: string;
  reservationId: string;
  quotedCredits: number;
  childCredits: number;
  ownerUserId: string;
  kind: "auth" | "guest";
};

export type SellerPackAtomicReserve = {
  mode: "atomic";
  packRunId: string;
  reservationId: string;
  accountId: string;
  quotedCredits: number;
  childCredits: number;
  settledCredits: number;
  releasedCredits: number;
  status: string;
  contractFingerprint: string;
  clientPackKey: string;
  ownerUserId: string;
  availableCredits: number;
  reservedCredits: number;
  idempotent: boolean;
  jobs: Array<{
    jobId: string;
    childKey: string;
    effectSlug: string;
    aspectRatio: string;
    durationSec: number;
    status: string;
    quotedCredits: number;
    settledCredits: number;
    attemptKey: string | null;
  }>;
};

/**
 * Atomic reserve: one 30-credit hold + three fixed jobs for an authenticated
 * owner + client pack key. Idempotent on (owner, clientPackKey).
 */
export async function reserveSellerPackAtomic(input: {
  ownerUserId: string;
  clientPackKey: string;
}): Promise<
  | { ok: true; data: SellerPackAtomicReserve }
  | { ok: false; code: string; error: string; need?: number; have?: number }
> {
  if (!durableCreditsActive()) {
    return {
      ok: false,
      code: "DURABLE_OFF",
      error:
        "Durable credits not active — Seller Pack atomic reserve unavailable",
    };
  }
  const key = input.clientPackKey.trim();
  if (key.length < 8 || key.length > 128) {
    return {
      ok: false,
      code: "INVALID_PACK_KEY",
      error: "clientPackKey must be 8–128 characters",
    };
  }
  const reserved = await reserveAtomicSellerPack({
    userId: input.ownerUserId,
    clientPackKey: key,
  });
  if (!reserved.ok) {
    return {
      ok: false,
      code: reserved.code,
      error: reserved.error,
      need: reserved.need,
      have: reserved.have,
    };
  }
  const d = reserved.data;
  return {
    ok: true,
    data: {
      mode: "atomic",
      packRunId: d.packRunId,
      reservationId: d.reservationId,
      accountId: d.accountId,
      quotedCredits: d.quotedCredits,
      childCredits: SELLER_PACK_CHILD_CREDITS,
      settledCredits: d.settledCredits,
      releasedCredits: d.releasedCredits,
      status: d.status,
      contractFingerprint: d.contractFingerprint,
      clientPackKey: d.clientPackKey,
      ownerUserId: d.userId,
      availableCredits: d.availableCredits,
      reservedCredits: d.reservedCredits,
      idempotent: d.idempotent,
      jobs: d.jobs.map((job) => ({
        jobId: job.jobId,
        childKey: job.childKey,
        effectSlug: job.effectSlug,
        aspectRatio: job.aspectRatio,
        durationSec: job.durationSec,
        status: job.status,
        quotedCredits: job.quotedCredits,
        settledCredits: job.settledCredits,
        attemptKey: job.attemptKey,
      })),
    },
  };
}

export async function authorizeSellerPackChildLive(input: {
  userId: string;
  packRunId: string;
  jobId: string;
  effectSlug: string;
  durationSec: number;
  aspectRatio: string;
  attemptKey: string;
}): Promise<
  | {
      ok: true;
      reservation: StrictLiveReservation;
      availableCredits: number;
      packRunId: string;
      childKey: string;
      providerAuthorized: boolean;
      idempotent: boolean;
    }
  | {
      ok: false;
      code: string;
      error: string;
      need?: number;
      have?: number;
    }
> {
  const authorized = await authorizeAtomicSellerPackChild(input);
  if (!authorized.ok) {
    return {
      ok: false,
      code: authorized.code,
      error: authorized.error,
    };
  }
  const d = authorized.data;
  if (!d.providerAuthorized && !d.idempotent) {
    return {
      ok: false,
      code: "RESERVATION_FAILED",
      error: "Pack child was not authorized for provider spend",
    };
  }
  if (!d.providerAuthorized && d.idempotent) {
    return {
      ok: false,
      code: "JOB_IN_FLIGHT",
      error: "This Seller Pack child is already running",
    };
  }
  return {
    ok: true,
    reservation: {
      reservationId: d.reservationId,
      jobId: d.jobId,
      accountId: d.accountId,
      userId: d.userId,
      credits: d.credits,
      status: "reserved",
      providerAuthorized: true,
      planId: d.planId,
      idempotencyKey: d.attemptKey,
      expiresAt: d.expiresAt,
    },
    availableCredits: d.availableCredits,
    packRunId: d.packRunId,
    childKey: d.childKey,
    providerAuthorized: d.providerAuthorized,
    idempotent: d.idempotent,
  };
}

export async function settleSellerPackChildAtomic(input: {
  userId: string;
  packRunId: string;
  jobId: string;
  providerRequestId?: string;
}) {
  return settleAtomicSellerPackChild(input);
}

export async function releaseSellerPackChildAtomic(input: {
  userId: string;
  packRunId: string;
  jobId: string;
  reason: string;
}) {
  return releaseAtomicSellerPackChild(input);
}

export async function retrySellerPackChildAtomic(input: {
  userId: string;
  packRunId: string;
  jobId: string;
  attemptKey: string;
}) {
  return retryAtomicSellerPackChild(input);
}

export async function getSellerPackStatusAtomic(input: {
  userId: string;
  packRunId: string;
}) {
  return getAtomicSellerPackStatus(input);
}

/**
 * Legacy shadow reserve (audit ledger only). Prefer reserveSellerPackAtomic
 * for authenticated live Launch Packs.
 */
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

/**
 * Settle 10 credits. Prefer packRunId + packJobId + userId (atomic).
 * Legacy reservationId-only calls are no-ops for pack-purpose reservations so
 * a client shadow settle cannot double-capture after generate already settled.
 */
export async function settleSellerPackChild(input: {
  reservationId?: string;
  childCredits?: number;
  jobId?: string;
  childKey?: string;
  userId?: string;
  packRunId?: string;
  packJobId?: string;
  providerRequestId?: string;
}): Promise<{ ok: boolean; code?: string; error?: string; skipped?: boolean }> {
  if (!durableCreditsActive()) return { ok: true };
  if (input.userId && input.packRunId && (input.packJobId || input.jobId)) {
    const r = await settleAtomicSellerPackChild({
      userId: input.userId,
      packRunId: input.packRunId,
      jobId: (input.packJobId || input.jobId)!,
      providerRequestId: input.providerRequestId,
    });
    if (!r.ok) {
      console.warn("[seller-pack-atomic] settle failed", r.code, r.error);
      return { ok: false, code: r.code, error: r.error };
    }
    return { ok: true };
  }
  // Legacy client path: do not re-settle a parent pack reservation by amount.
  // Generate route owns terminal settlement for pack children.
  if (input.reservationId) {
    return {
      ok: true,
      skipped: true,
      code: "PACK_SETTLE_SERVER_OWNED",
    };
  }
  return {
    ok: false,
    code: "INVALID_REQUEST",
    error: "packRunId and packJobId required for Seller Pack settle",
  };
}

/**
 * Release 10 credits on confirmed child failure. Prefer atomic pack binding.
 * Legacy reservationId-only is a no-op so client shadow release cannot
 * double-refund after generate already released.
 */
export async function releaseSellerPackChild(input: {
  reservationId?: string;
  childCredits?: number;
  reason?: string;
  jobId?: string;
  childKey?: string;
  userId?: string;
  packRunId?: string;
  packJobId?: string;
}): Promise<{
  ok: boolean;
  code?: string;
  error?: string;
  skipped?: boolean;
  creditsRefunded?: boolean;
}> {
  if (!durableCreditsActive()) return { ok: true };
  if (input.userId && input.packRunId && (input.packJobId || input.jobId)) {
    const r = await releaseAtomicSellerPackChild({
      userId: input.userId,
      packRunId: input.packRunId,
      jobId: (input.packJobId || input.jobId)!,
      reason: input.reason || "child_failed",
    });
    if (!r.ok) {
      console.warn("[seller-pack-atomic] release failed", r.code, r.error);
      return { ok: false, code: r.code, error: r.error };
    }
    return { ok: true, creditsRefunded: true };
  }
  if (input.reservationId) {
    return {
      ok: true,
      skipped: true,
      code: "PACK_RELEASE_SERVER_OWNED",
    };
  }
  return {
    ok: false,
    code: "INVALID_REQUEST",
    error: "packRunId and packJobId required for Seller Pack release",
  };
}

/** Pure quote math for smoke tests — reserve N children × flat cost. */
export function sellerPackQuoteCredits(
  childCount = SELLER_PACK_CHILD_COUNT
): number {
  return childCount * CREDITS_PER_VIDEO;
}
