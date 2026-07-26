/**
 * Optional shadow ledger for soft-launch generate.
 * Cookie remains authoritative until REQUIRE_DURABLE_CREDITS=1.
 * Enable with DURABLE_CREDITS=local|1, or auto when Supabase is configured.
 *
 * Prefer signed-in Supabase user id; fall back to guest cookie session id.
 */

import {
  durableCreditsActive,
  durableSupabaseRequired,
  durableRelease,
  durableReserve,
  durableSettle,
  ensurePersonalAccount,
} from "@/lib/durableCredits";
import { jobCostCredits } from "@/lib/contracts";

export type ShadowReservation = {
  accountId: string;
  reservationId: string;
  credits: number;
  /** durable owner used for this reserve */
  ownerUserId: string;
  kind: "auth" | "guest";
};

async function reserveForOwner(
  ownerUserId: string,
  kind: "auth" | "guest"
): Promise<ShadowReservation | null> {
  if (!durableCreditsActive()) return null;
  try {
    const ensured = await ensurePersonalAccount(ownerUserId, 10);
    if (!ensured.ok) {
      if (durableSupabaseRequired()) {
        throw new Error(`DURABLE_REQUIRED:${ensured.code}`);
      }
      return null;
    }
    const accountId = ensured.data.account.id;
    const credits = jobCostCredits();
    const key = `shadow-reserve:${kind}:${ownerUserId}:${Date.now()}`;
    const reserved = await durableReserve({
      accountId,
      createdBy: ownerUserId,
      purpose: "generation",
      quotedCredits: credits,
      idempotencyKey: key,
    });
    if (!reserved.ok) {
      if (durableSupabaseRequired()) {
        throw new Error(`DURABLE_REQUIRED:${reserved.code}`);
      }
      // Shadow must never block live cookie path — log and continue.
      console.warn(
        "[durable-shadow] reserve failed",
        reserved.code,
        reserved.error
      );
      return null;
    }
    return {
      accountId,
      reservationId: reserved.data.reservation.id,
      credits,
      ownerUserId,
      kind,
    };
  } catch (e) {
    if (durableSupabaseRequired()) throw e;
    console.warn("[durable-shadow] reserve error", e);
    return null;
  }
}

/** Signed-in Supabase user — preferred durable owner. */
export async function shadowReserveForAuthUser(
  userId: string
): Promise<ShadowReservation | null> {
  if (!userId) return null;
  return reserveForOwner(userId, "auth");
}

export async function shadowReserveForGuest(
  guestSessionId: string
): Promise<ShadowReservation | null> {
  return reserveForOwner(guestSessionId, "guest");
}

/**
 * Prefer auth user wallet; otherwise guest cookie mapping.
 * Cookie debit still happens on generate regardless of shadow outcome.
 */
export async function shadowReserveForGenerate(input: {
  authUserId?: string | null;
  guestSessionId: string;
}): Promise<ShadowReservation | null> {
  if (input.authUserId) {
    const auth = await shadowReserveForAuthUser(input.authUserId);
    if (auth) return auth;
  }
  return shadowReserveForGuest(input.guestSessionId);
}

export async function shadowSettle(
  shadow: ShadowReservation | null,
  jobId?: string
): Promise<void> {
  if (!shadow) return;
  try {
    await durableSettle({
      reservationId: shadow.reservationId,
      actorUserId: shadow.ownerUserId,
      itemKey: "generation",
      idempotencyKey: `shadow-settle:${shadow.reservationId}:${jobId || "ok"}`,
      jobId,
    });
  } catch (e) {
    console.warn("[durable-shadow] settle error", e);
  }
}

export async function shadowRelease(
  shadow: ShadowReservation | null,
  reason: string,
  jobId?: string
): Promise<void> {
  if (!shadow) return;
  try {
    await durableRelease({
      reservationId: shadow.reservationId,
      actorUserId: shadow.ownerUserId,
      itemKey: "generation",
      idempotencyKey: `shadow-release:${shadow.reservationId}:${reason}`,
      reason,
      jobId,
    });
  } catch (e) {
    console.warn("[durable-shadow] release error", e);
  }
}
