/**
 * Strict live-generation reservation path.
 *
 * Unlike the historical shadow ledger, this module never falls back to a
 * guest, Cookie balance, local JSON file, or best-effort reserve. Every state
 * transition delegates to the R1a Supabase transaction RPC.
 */

import { jobCostCredits } from "@/lib/contracts";
import type { PlanId } from "@/lib/pricing";
import {
  supabaseCaptureGenerationAtomic,
  supabaseReleaseGenerationAtomic,
  supabaseReserveGenerationAtomic,
} from "@/lib/durableCredits/supabaseStore";

export type StrictLiveReservation = {
  reservationId: string;
  jobId: string;
  accountId: string;
  userId: string;
  credits: number;
  status: "reserved";
  providerAuthorized: true;
  planId: Exclude<PlanId, "free">;
  idempotencyKey: string;
  expiresAt: string;
};

export type StrictLiveReservationFailure = {
  ok: false;
  code:
    | "DURABLE_CREDITS_UNAVAILABLE"
    | "LIVE_ACCESS_REQUIRED"
    | "INSUFFICIENT_CREDITS"
    | "JOB_IN_FLIGHT"
    | "RESERVATION_FAILED";
  error: string;
  need?: number;
  have?: number;
};

export async function reserveStrictLiveGeneration(input: {
  userId: string;
  idempotencyKey: string;
  effectSlug: string;
}): Promise<
  | {
      ok: true;
      reservation: StrictLiveReservation;
      availableCredits: number;
    }
  | StrictLiveReservationFailure
> {
  const credits = jobCostCredits();
  const reserved = await supabaseReserveGenerationAtomic({
    userId: input.userId,
    effectSlug: input.effectSlug,
    quotedCredits: credits,
    idempotencyKey: input.idempotencyKey,
  });
  if (!reserved.ok) {
    if (reserved.code === "INSUFFICIENT_CREDITS") {
      return {
        ok: false,
        code: "INSUFFICIENT_CREDITS",
        error: reserved.error,
        need: reserved.need ?? credits,
        have: reserved.have ?? 0,
      };
    }
    if (reserved.code === "LIVE_ACCESS_REQUIRED") {
      return {
        ok: false,
        code: "LIVE_ACCESS_REQUIRED",
        error:
          "This account does not have server-authorized live generation access",
      };
    }
    if (
      reserved.code === "DURABLE_CREDITS_UNAVAILABLE" ||
      reserved.code === "DURABLE_WALLET_NOT_FOUND"
    ) {
      return {
        ok: false,
        code: "DURABLE_CREDITS_UNAVAILABLE",
        error:
          "Live generation is unavailable until the durable credit service is ready",
      };
    }
    return {
      ok: false,
      code: "RESERVATION_FAILED",
      error: "A durable credit reservation could not be committed",
    };
  }
  if (!reserved.data.providerAuthorized) {
    return {
      ok: false,
      code: "JOB_IN_FLIGHT",
      error: "This generation request is already running",
    };
  }
  if (
    reserved.data.userId !== input.userId ||
    reserved.data.idempotencyKey !== input.idempotencyKey ||
    reserved.data.amount !== credits
  ) {
    return {
      ok: false,
      code: "RESERVATION_FAILED",
      error: "The durable reservation did not match this generation request",
    };
  }

  return {
    ok: true,
    reservation: {
      reservationId: reserved.data.reservationId,
      jobId: reserved.data.jobId,
      accountId: reserved.data.accountId,
      userId: input.userId,
      credits,
      status: "reserved",
      providerAuthorized: true,
      planId: reserved.data.planId,
      idempotencyKey: reserved.data.idempotencyKey,
      expiresAt: reserved.data.expiresAt,
    },
    availableCredits: reserved.data.availableCredits,
  };
}

export async function settleStrictLiveGeneration(
  reservation: StrictLiveReservation,
  providerRequestId: string
) {
  return supabaseCaptureGenerationAtomic({
    userId: reservation.userId,
    reservationId: reservation.reservationId,
    jobId: reservation.jobId,
    providerRequestId,
  });
}

export async function releaseStrictLiveGeneration(
  reservation: StrictLiveReservation,
  reason: string
) {
  return supabaseReleaseGenerationAtomic({
    userId: reservation.userId,
    reservationId: reservation.reservationId,
    jobId: reservation.jobId,
    reason,
  });
}
