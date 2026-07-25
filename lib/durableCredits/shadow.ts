/**
 * Durable shadow / authority path for generate.
 * - Guest: Cookie remains authoritative; optional shadow when durable active.
 * - Signed-in + durableIsAuthoritative(): Supabase reserve is required (fail closed).
 */

import {
  durableCreditsActive,
  durableIsAuthoritative,
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
  /** When true, cookie debit should be skipped (wallet is authority). */
  authoritative: boolean;
};

async function reserveForOwner(
  ownerUserId: string,
  kind: "auth" | "guest",
  opts?: { authoritative?: boolean; idempotencyKey?: string }
): Promise<
  | { ok: true; shadow: ShadowReservation }
  | { ok: false; code: string; error: string }
> {
  if (!durableCreditsActive() && !opts?.authoritative) {
    return { ok: false, code: "DURABLE_OFF", error: "durable inactive" };
  }
  try {
    const ensured = await ensurePersonalAccount(ownerUserId, 10);
    if (!ensured.ok) {
      return {
        ok: false,
        code: ensured.code || "ENSURE_FAILED",
        error: ensured.error || "ensure account failed",
      };
    }
    const accountId = ensured.data.account.id;
    const credits = jobCostCredits();
    const key =
      opts?.idempotencyKey ||
      `shadow-reserve:${kind}:${ownerUserId}:${Date.now()}`;
    const reserved = await durableReserve({
      accountId,
      createdBy: ownerUserId,
      purpose: "generation",
      quotedCredits: credits,
      idempotencyKey: key,
    });
    if (!reserved.ok) {
      if (!opts?.authoritative) {
        console.warn(
          "[durable-shadow] reserve failed",
          reserved.code
        );
      }
      return {
        ok: false,
        code: reserved.code || "RESERVE_FAILED",
        error: reserved.error || "reserve failed",
      };
    }
    return {
      ok: true,
      shadow: {
        accountId,
        reservationId: reserved.data.reservation.id,
        credits,
        ownerUserId,
        kind,
        authoritative: Boolean(opts?.authoritative),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 120) : "reserve error";
    if (!opts?.authoritative) {
      console.warn("[durable-shadow] reserve error", msg);
    }
    return { ok: false, code: "RESERVE_THROW", error: msg };
  }
}

/** Signed-in Supabase user — preferred durable owner. */
export async function shadowReserveForAuthUser(
  userId: string,
  opts?: { authoritative?: boolean; idempotencyKey?: string }
): Promise<ShadowReservation | null> {
  if (!userId) return null;
  const r = await reserveForOwner(userId, "auth", opts);
  return r.ok ? r.shadow : null;
}

export async function shadowReserveForAuthUserStrict(
  userId: string,
  idempotencyKey: string
): Promise<
  | { ok: true; shadow: ShadowReservation }
  | { ok: false; code: string; error: string }
> {
  return reserveForOwner(userId, "auth", {
    authoritative: true,
    idempotencyKey: `auth-gen:${userId}:${idempotencyKey}`,
  });
}

export async function shadowReserveForGuest(
  guestSessionId: string
): Promise<ShadowReservation | null> {
  const r = await reserveForOwner(guestSessionId, "guest");
  return r.ok ? r.shadow : null;
}

/**
 * Prefer auth user wallet; otherwise guest cookie mapping.
 * Cookie debit still happens on generate unless shadow.authoritative.
 */
export async function shadowReserveForGenerate(input: {
  authUserId?: string | null;
  guestSessionId: string;
  idempotencyKey?: string;
}): Promise<ShadowReservation | null> {
  if (input.authUserId) {
    const authoritative = await durableIsAuthoritative();
    if (authoritative) {
      const strict = await shadowReserveForAuthUserStrict(
        input.authUserId,
        input.idempotencyKey || `t:${Date.now()}`
      );
      if (strict.ok) return strict.shadow;
      // Fail closed for signed-in authoritative path — caller must check null
      // and treat as hard error when durableIsAuthoritative was true.
      return null;
    }
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
      credits: shadow.credits,
      idempotencyKey: `shadow-settle:${shadow.reservationId}:${jobId || "ok"}`,
      jobId,
    });
  } catch {
    console.warn("[durable-shadow] settle error");
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
      credits: shadow.credits,
      idempotencyKey: `shadow-release:${shadow.reservationId}:${reason}:${jobId || "x"}`,
      reason,
      jobId,
    });
  } catch {
    console.warn("[durable-shadow] release error");
  }
}

export { durableIsAuthoritative };
