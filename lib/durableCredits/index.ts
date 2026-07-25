/**
 * Durable credits facade (T5 Wave C).
 *
 * - Guest soft-launch: Cookie Free Trial remains until login.
 * - Signed-in / production: Supabase RPC transactions only — fail closed.
 * - Never fall back to local file store when Supabase is required.
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
  supabaseCreditsConfigured,
  supabaseEnsurePersonalAccount,
  supabaseGetPersonalWallet,
  supabaseMigrateGuest,
  supabaseRelease,
  supabaseReserve,
  supabaseSettle,
} from "./supabaseStore";

export type DurableBackendMode = "supabase" | "local-file" | "none";

/** Force Supabase path (no local-file fallback). */
export function requireSupabaseDurable(): boolean {
  if (process.env.PIKBO_DURABLE_BACKEND === "local") return false;
  if (process.env.PIKBO_DURABLE_BACKEND === "supabase") return true;
  if (process.env.REQUIRE_DURABLE_CREDITS === "1") return true;
  // Production / Vercel production: never silent local wallet
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  ) {
    return true;
  }
  return false;
}

/** Explicit local demo only (dev without Supabase). */
export function allowLocalFileDurable(): boolean {
  if (requireSupabaseDurable()) return false;
  if (process.env.PIKBO_DURABLE_BACKEND === "local") return true;
  if (process.env.DURABLE_CREDITS === "local") return true;
  // Dev auto: local file only when Supabase not configured
  if (process.env.NODE_ENV !== "production" && !supabaseCreditsConfigured()) {
    return true;
  }
  return false;
}

/**
 * Signed-in Generate should treat Supabase wallet as authority when
 * transactionReady (or REQUIRE_DURABLE_CREDITS / force supabase).
 */
export async function durableIsAuthoritative(): Promise<boolean> {
  if (process.env.PIKBO_DURABLE_BACKEND === "local") return false;
  if (
    process.env.REQUIRE_DURABLE_CREDITS === "1" ||
    process.env.PIKBO_DURABLE_AUTHORITY === "supabase"
  ) {
    const p = await probeSupabaseCreditsSchema();
    return p.transactionReady === true;
  }
  const p = await probeSupabaseCreditsSchema();
  return p.transactionReady === true;
}

async function prefersSupabaseBackend(): Promise<boolean> {
  if (process.env.PIKBO_DURABLE_BACKEND === "local") return false;
  if (requireSupabaseDurable() || process.env.PIKBO_DURABLE_BACKEND === "supabase") {
    return true; // try supabase even if not ready — fail closed later
  }
  const p = await probeSupabaseCreditsSchema();
  return p.transactionReady || p.schemaReady;
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
  if (requireSupabaseDurable()) {
    return {
      ok: false,
      code: "LOCAL_FILE_FORBIDDEN",
      error: "Local-file durable store disabled — Supabase required",
    };
  }
  if (!allowLocalFileDurable()) {
    return {
      ok: false,
      code: "NO_DURABLE_BACKEND",
      error: "No durable credits backend available",
    };
  }
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

async function failClosedIfNeeded(
  remote: { ok: false; code: string; error: string }
): Promise<{ ok: false; code: string; error: string } | null> {
  if (requireSupabaseDurable()) {
    return {
      ok: false,
      code: remote.code || "SUPABASE_FAIL_CLOSED",
      error: remote.error || "Supabase durable credits unavailable",
    };
  }
  return null; // allow local fallback only when not required
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
    if (remote.ok) return remote;
    const closed = await failClosedIfNeeded(remote);
    if (closed) return closed;
    // Guest cookie ids are not auth.users — FK fails; local only if allowed
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
    const closed = await failClosedIfNeeded(remote);
    if (closed) return closed;
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
    const closed = await failClosedIfNeeded(remote);
    if (closed) return closed;
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
    const closed = await failClosedIfNeeded(remote);
    if (closed) return closed;
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
    const closed = await failClosedIfNeeded(remote);
    if (closed) return closed;
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
 * is configured. Cookie generate remains authoritative for guests until
 * durableIsAuthoritative() for signed-in users.
 */
export function durableCreditsActive(): boolean {
  if (
    process.env.DURABLE_CREDITS === "local" ||
    process.env.DURABLE_CREDITS === "1" ||
    process.env.REQUIRE_DURABLE_CREDITS === "1" ||
    process.env.PIKBO_DURABLE_BACKEND === "supabase" ||
    process.env.PIKBO_DURABLE_BACKEND === "local"
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
  authority?: "cookie" | "supabase";
} | null> {
  if (await prefersSupabaseBackend()) {
    const w = await supabaseGetPersonalWallet(userId);
    if (w) {
      return {
        ...w,
        backend: "supabase",
        authority: (await durableIsAuthoritative()) ? "supabase" : "cookie",
      };
    }
    if (requireSupabaseDurable()) return null;
  }
  if (!allowLocalFileDurable()) return null;
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
    authority: "cookie",
  };
}

/**
 * Sweep expired local-file reservations (Postgres TTL later).
 */
export async function durableExpireStaleReservations(): Promise<{
  expired: number;
  releasedCredits: number;
  backend: "local-file" | "skipped-remote";
}> {
  if (await prefersSupabaseBackend()) {
    return { expired: 0, releasedCredits: 0, backend: "skipped-remote" };
  }
  if (!allowLocalFileDurable()) {
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
