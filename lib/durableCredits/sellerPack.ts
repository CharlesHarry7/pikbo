/**
 * Seller Pack durable authority.
 *
 * One atomic 30-credit pack reservation + three fixed child jobs. There is no
 * parallel shadow ledger: live generate with pack ids never opens a second
 * per-generation R1a reserve.
 */

import { durableCreditsActive } from "@/lib/durableCredits";
import {
  authorizeAtomicSellerPackChild,
  getActiveAtomicSellerPack,
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
  inputAssetId: string;
  inputSha256: string;
  inputMimeType: string;
  inputSizeBytes: number;
  inputSkuLabel: string | null;
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
  inputAssetId: string;
  rightsConfirmed: true;
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
  const inputAssetId = input.inputAssetId.trim();
  if (inputAssetId.length < 8 || input.rightsConfirmed !== true) {
    return {
      ok: false,
      code:
        input.rightsConfirmed === true
          ? "INPUT_ASSET_REQUIRED"
          : "RIGHTS_REQUIRED",
      error:
        input.rightsConfirmed === true
          ? "A ready private inputAssetId is required"
          : "Confirm photo rights before reserving the Launch Pack",
    };
  }
  const reserved = await reserveAtomicSellerPack({
    userId: input.ownerUserId,
    clientPackKey: key,
    inputAssetId,
    rightsConfirmed: true,
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
      inputAssetId: d.inputAssetId,
      inputSha256: d.inputSha256,
      inputMimeType: d.inputMimeType,
      inputSizeBytes: d.inputSizeBytes,
      inputSkuLabel: d.inputSkuLabel,
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
      attemptKey: string;
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
    attemptKey: d.attemptKey,
    providerAuthorized: d.providerAuthorized,
    idempotent: d.idempotent,
  };
}

export async function settleSellerPackChildAtomic(input: {
  userId: string;
  packRunId: string;
  jobId: string;
  attemptKey: string;
  providerRequestId?: string;
}) {
  return settleAtomicSellerPackChild(input);
}

export async function releaseSellerPackChildAtomic(input: {
  userId: string;
  packRunId: string;
  jobId: string;
  attemptKey: string;
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

export async function getActiveSellerPackAtomic(input: {
  userId: string;
}) {
  return getActiveAtomicSellerPack(input);
}
