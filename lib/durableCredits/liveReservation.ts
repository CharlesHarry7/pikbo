/**
 * Strict live-generation reservation path.
 *
 * Unlike the historical shadow ledger, this module never falls back to a
 * guest, Cookie balance, local JSON file, or best-effort reserve. R1 will
 * replace the current Supabase multi-call adapter with one atomic RPC; R0
 * makes even that incomplete adapter fail closed before provider spend.
 */

import { jobCostCredits } from "@/lib/contracts";
import type { PlanId } from "@/lib/pricing";
import {
  probeSupabaseCreditsSchema,
  supabaseEnsurePersonalAccount,
  supabaseRelease,
  supabaseReserve,
  supabaseSettle,
} from "@/lib/durableCredits/supabaseStore";

export type StrictLiveReservation = {
  reservationId: string;
  accountId: string;
  userId: string;
  credits: number;
  status: "reserved";
  planId: Exclude<PlanId, "free">;
};

export type StrictLiveReservationFailure = {
  ok: false;
  code:
    | "DURABLE_CREDITS_UNAVAILABLE"
    | "LIVE_ACCESS_REQUIRED"
    | "INSUFFICIENT_CREDITS"
    | "RESERVATION_FAILED";
  error: string;
  need?: number;
  have?: number;
};

export async function reserveStrictLiveGeneration(input: {
  userId: string;
  idempotencyKey: string;
}): Promise<
  | {
      ok: true;
      reservation: StrictLiveReservation;
      availableCredits: number;
    }
  | StrictLiveReservationFailure
> {
  const probe = await probeSupabaseCreditsSchema();
  if (!probe.configured || !probe.schemaReady) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error:
        "Live generation is unavailable until the durable credit service is ready",
    };
  }

  // Never grant a fresh trial here. Free accounts remain cached-demo-only.
  const ensured = await supabaseEnsurePersonalAccount(input.userId, 0);
  if (!ensured.ok) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: "Could not open the durable credit wallet",
    };
  }
  const { account, wallet } = ensured.data;
  if (
    account.ownerUserId !== input.userId ||
    account.status !== "active" ||
    account.planId === "free"
  ) {
    return {
      ok: false,
      code: "LIVE_ACCESS_REQUIRED",
      error:
        "This account does not have server-authorized live generation access",
    };
  }

  const credits = jobCostCredits();
  const reserved = await supabaseReserve({
    accountId: account.id,
    createdBy: input.userId,
    purpose: "generation",
    quotedCredits: credits,
    idempotencyKey: `live:${input.userId}:${input.idempotencyKey}`,
  });
  if (!reserved.ok) {
    if (reserved.code === "INSUFFICIENT_CREDITS") {
      return {
        ok: false,
        code: "INSUFFICIENT_CREDITS",
        error: reserved.error,
        need: credits,
        have: wallet.availableCredits,
      };
    }
    return {
      ok: false,
      code: "RESERVATION_FAILED",
      error: "A durable credit reservation could not be committed",
    };
  }
  if (reserved.data.reservation.status !== "reserved") {
    return {
      ok: false,
      code: "RESERVATION_FAILED",
      error: "The durable reservation is no longer available for provider use",
    };
  }

  return {
    ok: true,
    reservation: {
      reservationId: reserved.data.reservation.id,
      accountId: account.id,
      userId: input.userId,
      credits,
      status: "reserved",
      planId: account.planId,
    },
    availableCredits: reserved.data.wallet.availableCredits,
  };
}

export async function settleStrictLiveGeneration(
  reservation: StrictLiveReservation,
  jobId: string
) {
  return supabaseSettle({
    reservationId: reservation.reservationId,
    credits: reservation.credits,
    idempotencyKey: `live:capture:${reservation.reservationId}`,
    jobId,
  });
}

export async function releaseStrictLiveGeneration(
  reservation: StrictLiveReservation,
  reason: string,
  jobId?: string
) {
  return supabaseRelease({
    reservationId: reservation.reservationId,
    credits: reservation.credits,
    idempotencyKey: `live:release:${reservation.reservationId}`,
    reason,
    jobId,
  });
}
