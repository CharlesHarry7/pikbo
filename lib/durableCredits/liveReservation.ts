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
  supabaseReserveGenerationWithAssetAtomic,
} from "@/lib/durableCredits/supabaseStore";

export type StrictLiveReservation = {
  reservationId: string;
  jobId: string;
  accountId: string;
  userId: string;
  credits: number;
  status: "reserved";
  providerAuthorized: true;
  planId: PlanId;
  idempotencyKey: string;
  expiresAt: string;
  /** Set only for direct Moment reserves that bound an owner photo. */
  inputAssetId?: string;
};

export type StrictLiveReservationFailure = {
  ok: false;
  code:
    | "DURABLE_CREDITS_UNAVAILABLE"
    | "LIVE_ACCESS_REQUIRED"
    | "INSUFFICIENT_CREDITS"
    | "JOB_IN_FLIGHT"
    | "RESERVATION_FAILED"
    | "INPUT_ASSET_REQUIRED"
    | "INPUT_ASSET_NOT_FOUND"
    | "INPUT_ASSET_NOT_READY"
    | "RIGHTS_CONFIRMATION_REQUIRED"
    | "LEGACY_JOB_INPUT_UNBOUND"
    | "IDEMPOTENCY_CONFLICT";
  error: string;
  need?: number;
  have?: number;
};

function mapReserveFailure(
  reserved: {
    code: string;
    error: string;
    need?: number;
    have?: number;
  },
  credits: number
): StrictLiveReservationFailure {
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
  if (reserved.code === "INPUT_ASSET_REQUIRED") {
    return {
      ok: false,
      code: "INPUT_ASSET_REQUIRED",
      error: "A verified private toy photo is required for live Moment generation",
    };
  }
  if (reserved.code === "INPUT_ASSET_NOT_FOUND") {
    return {
      ok: false,
      code: "INPUT_ASSET_NOT_FOUND",
      error: "The private toy photo was not found for this account",
    };
  }
  if (reserved.code === "INPUT_ASSET_NOT_READY") {
    return {
      ok: false,
      code: "INPUT_ASSET_NOT_READY",
      error: "The private toy photo is not ready for live generation",
    };
  }
  if (reserved.code === "RIGHTS_CONFIRMATION_REQUIRED") {
    return {
      ok: false,
      code: "RIGHTS_CONFIRMATION_REQUIRED",
      error: "Confirm ownership rights before generating a live Moment",
    };
  }
  if (reserved.code === "LEGACY_JOB_INPUT_UNBOUND") {
    return {
      ok: false,
      code: "LEGACY_JOB_INPUT_UNBOUND",
      error:
        "This generation key belongs to a legacy job without a bound photo — mint a new idempotency key",
    };
  }
  if (reserved.code === "IDEMPOTENCY_CONFLICT") {
    return {
      ok: false,
      code: "IDEMPOTENCY_CONFLICT",
      error:
        "This generation key is already bound to a different private toy photo",
    };
  }
  return {
    ok: false,
    code: "RESERVATION_FAILED",
    error: "A durable credit reservation could not be committed",
  };
}

/**
 * Flux still path: no input asset binding.
 * Direct Moments must use {@link reserveStrictLiveGenerationWithAsset}.
 */
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
    return mapReserveFailure(reserved, credits);
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

/**
 * Direct live Moment: durable reserve that binds generation_jobs.input_asset_id
 * to the already-verified owner photo before Provider authorization.
 */
export async function reserveStrictLiveGenerationWithAsset(input: {
  userId: string;
  idempotencyKey: string;
  effectSlug: string;
  inputAssetId: string;
  rightsConfirmed: true;
}): Promise<
  | {
      ok: true;
      reservation: StrictLiveReservation & { inputAssetId: string };
      availableCredits: number;
    }
  | StrictLiveReservationFailure
> {
  const credits = jobCostCredits();
  if (
    typeof input.inputAssetId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.inputAssetId
    )
  ) {
    return {
      ok: false,
      code: "INPUT_ASSET_REQUIRED",
      error: "A verified private toy photo is required for live Moment generation",
    };
  }
  if (input.rightsConfirmed !== true) {
    return {
      ok: false,
      code: "RIGHTS_CONFIRMATION_REQUIRED",
      error: "Confirm ownership rights before generating a live Moment",
    };
  }

  const reserved = await supabaseReserveGenerationWithAssetAtomic({
    userId: input.userId,
    effectSlug: input.effectSlug,
    quotedCredits: credits,
    idempotencyKey: input.idempotencyKey,
    inputAssetId: input.inputAssetId,
    rightsConfirmed: true,
  });
  if (!reserved.ok) {
    return mapReserveFailure(reserved, credits);
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
    reserved.data.amount !== credits ||
    reserved.data.inputAssetId !== input.inputAssetId ||
    reserved.data.rightsConfirmed !== true
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
      inputAssetId: reserved.data.inputAssetId,
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
