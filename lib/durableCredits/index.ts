/**
 * Durable credits facade (T5 Phase C).
 *
 * Soft-launch still uses Cookie sessions for guest generate.
 * Prefers Supabase Postgres when service role + T5 schema are ready;
 * otherwise local file adapter (single-node).
 *
 * Production gate: REQUIRE_DURABLE_CREDITS=1 refuses to claim durable ready
 * without a writable store. Live Stripe still stays off until boss approval.
 */

export type { DurableState, CreditWallet, CreditReservation } from "./types";
export {
  emptyState,
  createPersonalAccount,
  grantCredits,
  reserveCredits,
  settleReservationItem,
  releaseReservationItem,
  expireStaleReservations,
  migrateGuestCredits,
} from "./engine";
export {
  loadDurableState,
  saveDurableState,
  probeDurableCreditsStore,
} from "./localStore";
export {
  probeSupabaseCreditsSchema,
  supabaseCreditsConfigured,
} from "./supabaseStore";

import {
  createPersonalAccount,
  expireStaleReservations,
  grantCredits,
  migrateGuestCredits,
  releaseReservationItem,
  reserveCredits,
  settleReservationItem,
} from "./engine";
import {
  loadDurableState,
  saveDurableState,
  withLocalStoreMutex,
} from "./localStore";
import type { DurableState, ReservationPurpose } from "./types";
import {
  probeSupabaseCreditsSchema,
  supabaseEnsurePersonalAccount,
  supabaseExpireReservations,
  supabaseGetPersonalWallet,
  supabaseMigrateGuest,
  supabaseRelease,
  supabaseReserve,
  supabaseSettle,
} from "./supabaseStore";

export function durableSupabaseRequired(): boolean {
  return (
    process.env.PIKBO_DURABLE_BACKEND === "supabase" ||
    process.env.REQUIRE_DURABLE_CREDITS === "1"
  );
}

/** Supabase terminal accounting is unsafe until jobs are persisted server-side. */
export function durableServerOwnedJobsReady(): boolean {
  return process.env.PIKBO_SERVER_OWNED_JOBS === "1";
}

type BackendDecision =
  | { kind: "supabase" }
  | { kind: "local" }
  | { kind: "unavailable"; code: string; error: string };

async function durableBackend(): Promise<BackendDecision> {
  const required = durableSupabaseRequired();
  if (!durableServerOwnedJobsReady()) {
    if (required) {
      return {
        kind: "unavailable",
        code: "SERVER_OWNED_JOBS_REQUIRED",
        error:
          "Supabase durable generation is disabled until server-owned jobs are ready",
      };
    }
    // Optional Supabase config must not create a remote reservation that this
    // process cannot terminally settle/release with a persisted job.
    return { kind: "local" };
  }
  if (process.env.PIKBO_DURABLE_BACKEND === "local" && !required) {
    return { kind: "local" };
  }
  const probe = await probeSupabaseCreditsSchema();
  if (probe.schemaReady) return { kind: "supabase" };
  if (required) {
    return {
      kind: "unavailable",
      code: "DURABLE_BACKEND_UNAVAILABLE",
      error:
        probe.warning ||
        "Supabase durable credits are required but schema/RPC probe failed",
    };
  }
  return { kind: "local" };
}

function unavailable(error: string, code = "DURABLE_BACKEND_UNAVAILABLE") {
  return {
    ok: false as const,
    code,
    error,
  };
}

async function withState<T>(
  fn: (state: DurableState) => {
    ok: boolean;
    state: DurableState;
    data?: T;
    code?: string;
    error?: string;
  }
): Promise<
  | { ok: true; data: T }
  | { ok: false; code: string; error: string }
> {
  return withLocalStoreMutex(async () => {
    const state = await loadDurableState();
    const result = fn(state);
    if (result.ok) {
      await saveDurableState(result.state);
      return { ok: true, data: result.data as T };
    }
    return {
      ok: false,
      code: result.code || "ERROR",
      error: result.error || "Durable credits error",
    };
  });
}

/** Ensure a personal Free account + wallet exist for a durable user id. */
export async function ensurePersonalAccount(
  userId: string,
  initialAvailable = 10
) {
  const backend = await durableBackend();
  if (backend.kind === "unavailable") return unavailable(backend.error, backend.code);
  if (backend.kind === "supabase") {
    // Remote errors are authoritative. Never leak into a local-file wallet.
    return supabaseEnsurePersonalAccount(userId, initialAvailable);
  }
  return withState((state) => {
    const existing = Object.values(state.accounts).find(
      (a) => a.ownerUserId === userId && a.kind === "personal"
    );
    if (existing) {
      return {
        ok: true,
        state,
        data: {
          account: existing,
          wallet: state.wallets[existing.id],
        },
      };
    }
    const created = createPersonalAccount(state, {
      userId,
      planId: "free",
      initialAvailable: 0,
    });
    if (!created.ok) {
      return {
        ok: false,
        state: created.state,
        code: created.code,
        error: created.error,
      };
    }
    if (initialAvailable > 0) {
      const granted = grantCredits(created.state, {
        accountId: created.data.account.id,
        credits: initialAvailable,
        sourceType: "free_period",
        sourceId: `free:${created.data.account.id}:bootstrap`,
        idempotencyKey: `free:${created.data.account.id}:bootstrap`,
      });
      if (!granted.ok) {
        return {
          ok: false,
          state: granted.state,
          code: granted.code,
          error: granted.error,
        };
      }
      return {
        ok: true,
        state: granted.state,
        data: {
          account: granted.state.accounts[created.data.account.id],
          wallet: granted.data.wallet,
        },
      };
    }
    return {
      ok: true,
      state: created.state,
      data: created.data,
    };
  });
}

export async function durableReserve(input: {
  accountId: string;
  createdBy: string;
  purpose: ReservationPurpose;
  quotedCredits: number;
  idempotencyKey: string;
}) {
  const backend = await durableBackend();
  if (backend.kind === "unavailable") return unavailable(backend.error, backend.code);
  if (backend.kind === "supabase") return supabaseReserve(input);
  return withState((state) => {
    const r = reserveCredits(state, input);
    if (!r.ok) {
      return { ok: false, state: r.state, code: r.code, error: r.error };
    }
    return { ok: true, state: r.state, data: r.data };
  });
}

export async function durableSettle(input: {
  reservationId: string;
  actorUserId: string;
  itemKey: string;
  idempotencyKey: string;
  jobId?: string;
}) {
  const backend = await durableBackend();
  if (backend.kind === "unavailable") return unavailable(backend.error, backend.code);
  if (backend.kind === "supabase") return supabaseSettle(input);
  return withState((state) => {
    const reservation = state.reservations[input.reservationId];
    const account = reservation
      ? state.accounts[reservation.accountId]
      : undefined;
    if (
      reservation &&
      reservation.createdBy !== input.actorUserId &&
      account?.ownerUserId !== input.actorUserId
    ) {
      return {
        ok: false,
        state,
        code: "UNAUTHORIZED",
        error: "Reservation does not belong to this account user",
      };
    }
    const r = settleReservationItem(state, {
      reservationId: input.reservationId,
      credits: 10,
      idempotencyKey: input.idempotencyKey,
      jobId: input.jobId,
    });
    if (!r.ok) {
      return { ok: false, state: r.state, code: r.code, error: r.error };
    }
    return { ok: true, state: r.state, data: r.data };
  });
}

export async function durableRelease(input: {
  reservationId: string;
  actorUserId: string;
  itemKey: string;
  idempotencyKey: string;
  reason?: string;
  jobId?: string;
}) {
  const backend = await durableBackend();
  if (backend.kind === "unavailable") return unavailable(backend.error, backend.code);
  if (backend.kind === "supabase") return supabaseRelease(input);
  return withState((state) => {
    const reservation = state.reservations[input.reservationId];
    const account = reservation
      ? state.accounts[reservation.accountId]
      : undefined;
    if (
      reservation &&
      reservation.createdBy !== input.actorUserId &&
      account?.ownerUserId !== input.actorUserId
    ) {
      return {
        ok: false,
        state,
        code: "UNAUTHORIZED",
        error: "Reservation does not belong to this account user",
      };
    }
    const r = releaseReservationItem(state, {
      reservationId: input.reservationId,
      credits: 10,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason,
      jobId: input.jobId,
    });
    if (!r.ok) {
      return { ok: false, state: r.state, code: r.code, error: r.error };
    }
    return { ok: true, state: r.state, data: r.data };
  });
}

export async function durableMigrateGuest(input: {
  guestSessionIdHash: string;
  userId: string;
  accountId: string;
  cookieCredits: number;
  idempotencyKey: string;
}) {
  const backend = await durableBackend();
  if (backend.kind === "unavailable") return unavailable(backend.error, backend.code);
  if (backend.kind === "supabase") return supabaseMigrateGuest(input);
  return withState((state) => {
    const r = migrateGuestCredits(state, input);
    if (!r.ok) {
      return { ok: false, state: r.state, code: r.code, error: r.error };
    }
    return { ok: true, state: r.state, data: r.data };
  });
}

/**
 * Shadow/audit ledger is on when explicitly enabled, or when Supabase Auth
 * is configured (signed-in claim path needs a wallet even before Postgres).
 * Cookie generate remains authoritative until REQUIRE_DURABLE_CREDITS=1.
 */
export function durableCreditsActive(): boolean {
  if (
    process.env.DURABLE_CREDITS === "local" ||
    process.env.DURABLE_CREDITS === "1" ||
    process.env.REQUIRE_DURABLE_CREDITS === "1" ||
    process.env.PIKBO_DURABLE_BACKEND === "supabase"
  ) {
    return true;
  }
  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim();
  return url.startsWith("http");
}

/** Look up personal wallet for a durable user id (null if none). */
export async function getPersonalWallet(userId: string): Promise<{
  accountId: string;
  availableCredits: number;
  reservedCredits: number;
  planId: string;
  backend?: "supabase" | "local-file";
} | null> {
  const backend = await durableBackend();
  if (backend.kind === "unavailable") return null;
  if (backend.kind === "supabase") {
    const w = await supabaseGetPersonalWallet(userId);
    return w ? { ...w, backend: "supabase" } : null;
  }
  const state = await loadDurableState();
  const account = Object.values(state.accounts).find(
    (a) => a.ownerUserId === userId && a.kind === "personal"
  );
  if (!account) return null;
  const wallet = state.wallets[account.id];
  if (!wallet) return null;
  return {
    accountId: account.id,
    availableCredits: wallet.availableCredits,
    reservedCredits: wallet.reservedCredits,
    planId: account.planId,
    backend: "local-file",
  };
}

/**
 * Sweep expired local-file reservations or the service-owned Supabase RPC.
 * Idempotent release keys `expire:{reservationId}`.
 */
let lastExpirySweepAt = 0;
const EXPIRY_SWEEP_TTL_MS = 60_000;

export async function durableExpireStaleReservations(): Promise<{
  expired: number;
  releasedCredits: number;
  backend: "local-file" | "supabase" | "skipped-remote" | "throttled";
}> {
  // /api/health is public: do not turn every probe into an accounting write.
  if (Date.now() - lastExpirySweepAt < EXPIRY_SWEEP_TTL_MS) {
    return { expired: 0, releasedCredits: 0, backend: "throttled" };
  }
  lastExpirySweepAt = Date.now();
  const backend = await durableBackend();
  if (backend.kind === "supabase") {
    const remote = await supabaseExpireReservations();
    if (!remote.ok) {
      console.warn("[durable-credits] remote expiry sweep failed", remote.code, remote.error);
      return { expired: 0, releasedCredits: 0, backend: "supabase" };
    }
    return { ...remote.data, backend: "supabase" };
  }
  if (backend.kind !== "local") {
    return { expired: 0, releasedCredits: 0, backend: "skipped-remote" };
  }
  const result = await withState((state) => {
    const r = expireStaleReservations(state);
    if (!r.ok) {
      return {
        ok: false as const,
        state,
        code: r.code || "EXPIRE_FAILED",
        error: r.error || "expire failed",
      };
    }
    return {
      ok: true as const,
      state: r.state,
      data: r.data,
    };
  });
  if (!result.ok) {
    return { expired: 0, releasedCredits: 0, backend: "local-file" };
  }
  return { ...result.data, backend: "local-file" };
}
