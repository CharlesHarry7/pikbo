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
import { loadDurableState, saveDurableState } from "./localStore";
import type { DurableState, ReservationPurpose } from "./types";
import {
  probeSupabaseCreditsSchema,
  supabaseEnsurePersonalAccount,
  supabaseGetPersonalWallet,
  supabaseMigrateGuest,
  supabaseRelease,
  supabaseReserve,
  supabaseSettle,
} from "./supabaseStore";

/**
 * Deliberate launch capability, not an env toggle. Stay false until a server
 * worker creates durable generation_jobs and atomically settles/releases.
 */
export const SERVER_OWNED_GENERATION_JOBS_IMPLEMENTED = false;

export function durableServerOwnedJobsStatus(): {
  envRequested: boolean;
  implemented: boolean;
  effective: boolean;
  reason: string;
} {
  const envRequested = process.env.PIKBO_SERVER_OWNED_JOBS === "1";
  const implemented = SERVER_OWNED_GENERATION_JOBS_IMPLEMENTED;
  return {
    envRequested,
    implemented,
    effective: envRequested && implemented,
    reason: implemented
      ? "Server-owned generation jobs ready when env-requested"
      : "Hard-disabled until a durable generation_jobs worker settles provider completion",
  };
}

/** True only when env request AND implementation flag are both real. */
export function durableServerOwnedJobsReady(): boolean {
  return durableServerOwnedJobsStatus().effective;
}

async function prefersSupabaseBackend(): Promise<boolean> {
  if (process.env.PIKBO_DURABLE_BACKEND === "local") return false;
  if (process.env.PIKBO_DURABLE_BACKEND === "supabase") {
    const p = await probeSupabaseCreditsSchema();
    return p.schemaReady;
  }
  // Auto when T5 tables exist; DURABLE_CREDITS=local still allows shadow via file
  // when schema is not ready.
  const p = await probeSupabaseCreditsSchema();
  return p.schemaReady;
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
}

/** Ensure a personal Free account + wallet exist for a durable user id. */
export async function ensurePersonalAccount(
  userId: string,
  initialAvailable = 10
) {
  if (await prefersSupabaseBackend()) {
    const remote = await supabaseEnsurePersonalAccount(
      userId,
      initialAvailable
    );
    // Guest cookie ids are not auth.users rows — FK fails; fall back to local.
    if (remote.ok) return remote;
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
  if (await prefersSupabaseBackend()) {
    const remote = await supabaseReserve(input);
    if (remote.ok) return remote;
    // Local-file account ids won't exist in Postgres — fall back.
  }
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
  credits: number;
  idempotencyKey: string;
  jobId?: string;
}) {
  if (await prefersSupabaseBackend()) {
    const remote = await supabaseSettle(input);
    if (remote.ok) return remote;
  }
  return withState((state) => {
    const r = settleReservationItem(state, input);
    if (!r.ok) {
      return { ok: false, state: r.state, code: r.code, error: r.error };
    }
    return { ok: true, state: r.state, data: r.data };
  });
}

export async function durableRelease(input: {
  reservationId: string;
  credits: number;
  idempotencyKey: string;
  reason?: string;
  jobId?: string;
}) {
  if (await prefersSupabaseBackend()) {
    const remote = await supabaseRelease(input);
    if (remote.ok) return remote;
  }
  return withState((state) => {
    const r = releaseReservationItem(state, input);
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
  if (await prefersSupabaseBackend()) {
    const remote = await supabaseMigrateGuest(input);
    if (remote.ok) return remote;
  }
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
    process.env.REQUIRE_DURABLE_CREDITS === "1"
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
  if (await prefersSupabaseBackend()) {
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
 * Sweep expired local-file reservations (Postgres TTL job later).
 * Idempotent release keys `expire:{reservationId}`.
 */
export async function durableExpireStaleReservations(): Promise<{
  expired: number;
  releasedCredits: number;
  backend: "local-file" | "skipped-remote";
}> {
  if (await prefersSupabaseBackend()) {
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
