/**
 * Supabase Postgres durable credits adapter (T5).
 * Uses service role only. Falls back when schema is not applied yet.
 * Cookie generate remains soft-launch authority until REQUIRE_DURABLE_CREDITS=1.
 */

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase/env";
import type {
  CreditReservation,
  CreditWallet,
  DurableAccount,
  PlanId,
  ReservationPurpose,
} from "@/lib/durableCredits/types";

export type SupabaseCreditsProbe = {
  configured: boolean;
  schemaReady: boolean;
  warning?: string;
};

let schemaReadyCache: { at: number; ready: boolean; warning?: string } | null =
  null;
const SCHEMA_TTL_MS = 30_000;

export function supabaseCreditsConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseServiceRoleKey());
}

/** Probe credit_wallets table presence (cached briefly). */
export async function probeSupabaseCreditsSchema(): Promise<SupabaseCreditsProbe> {
  if (!supabaseCreditsConfigured()) {
    return {
      configured: false,
      schemaReady: false,
      warning: "SUPABASE_URL or SERVICE_ROLE missing",
    };
  }
  const now = Date.now();
  if (schemaReadyCache && now - schemaReadyCache.at < SCHEMA_TTL_MS) {
    return {
      configured: true,
      schemaReady: schemaReadyCache.ready,
      warning: schemaReadyCache.warning,
    };
  }
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      configured: true,
      schemaReady: false,
      warning: "admin client init failed",
    };
  }
  try {
    const { error } = await admin
      .from("credit_wallets")
      .select("account_id")
      .limit(1);
    if (error) {
      const msg = error.message || String(error);
      const missing =
        /does not exist|relation|schema cache|Could not find/i.test(msg);
      schemaReadyCache = {
        at: now,
        ready: false,
        warning: missing
          ? "T5 migration not applied — run supabase/migrations/20260723120000_t5_auth_credits.sql"
          : msg.slice(0, 160),
      };
      return {
        configured: true,
        schemaReady: false,
        warning: schemaReadyCache.warning,
      };
    }
    schemaReadyCache = { at: now, ready: true };
    return { configured: true, schemaReady: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 160) : "probe failed";
    schemaReadyCache = { at: now, ready: false, warning: msg };
    return { configured: true, schemaReady: false, warning: msg };
  }
}

/** Test helper — clear schema probe cache. */
export function __resetSupabaseSchemaCache() {
  schemaReadyCache = null;
}

type AccountRow = {
  id: string;
  kind: string;
  owner_user_id: string;
  plan_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type WalletRow = {
  account_id: string;
  available_credits: number;
  reserved_credits: number;
  lifetime_used_credits: number;
  version: number;
  updated_at: string;
};

type ReservationRow = {
  id: string;
  account_id: string;
  purpose: string;
  quoted_credits: number;
  settled_credits: number;
  released_credits: number;
  status: string;
  idempotency_key: string;
  expires_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function mapAccount(row: AccountRow): DurableAccount {
  return {
    id: row.id,
    kind: row.kind === "shop" ? "shop" : "personal",
    ownerUserId: row.owner_user_id,
    planId: (row.plan_id as PlanId) || "free",
    status:
      row.status === "restricted" || row.status === "closed"
        ? row.status
        : "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWallet(row: WalletRow): CreditWallet {
  return {
    accountId: row.account_id,
    availableCredits: row.available_credits,
    reservedCredits: row.reserved_credits,
    lifetimeUsedCredits: Number(row.lifetime_used_credits) || 0,
    version: Number(row.version) || 0,
    updatedAt: row.updated_at,
  };
}

function mapReservation(row: ReservationRow): CreditReservation {
  return {
    id: row.id,
    accountId: row.account_id,
    purpose: row.purpose as ReservationPurpose,
    quotedCredits: row.quoted_credits,
    settledCredits: row.settled_credits,
    releasedCredits: row.released_credits,
    status: row.status as CreditReservation["status"],
    idempotencyKey: row.idempotency_key,
    expiresAt: row.expires_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function supabaseGetPersonalWallet(userId: string): Promise<{
  accountId: string;
  availableCredits: number;
  reservedCredits: number;
  planId: string;
} | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data: accounts, error } = await admin
    .from("accounts")
    .select("*")
    .eq("owner_user_id", userId)
    .eq("kind", "personal")
    .limit(1);
  if (error || !accounts?.length) return null;
  const account = mapAccount(accounts[0] as AccountRow);
  const { data: wallets, error: wErr } = await admin
    .from("credit_wallets")
    .select("*")
    .eq("account_id", account.id)
    .limit(1);
  if (wErr || !wallets?.length) return null;
  const wallet = mapWallet(wallets[0] as WalletRow);
  return {
    accountId: account.id,
    availableCredits: wallet.availableCredits,
    reservedCredits: wallet.reservedCredits,
    planId: account.planId,
  };
}

/**
 * Ensure profile + personal account + wallet. Bootstraps Free grant once via
 * ledger idempotency key free:{accountId}:bootstrap.
 */
export async function supabaseEnsurePersonalAccount(
  userId: string,
  initialAvailable = 10
): Promise<
  | { ok: true; data: { account: DurableAccount; wallet: CreditWallet } }
  | { ok: false; code: string; error: string }
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, code: "NO_ADMIN", error: "Supabase admin unavailable" };
  }

  // Profile (ignore conflict)
  await admin.from("profiles").upsert(
    { id: userId, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );

  const { data: existingAccounts } = await admin
    .from("accounts")
    .select("*")
    .eq("owner_user_id", userId)
    .eq("kind", "personal")
    .limit(1);

  let account: DurableAccount;
  if (existingAccounts?.length) {
    account = mapAccount(existingAccounts[0] as AccountRow);
  } else {
    const { data: created, error } = await admin
      .from("accounts")
      .insert({
        kind: "personal",
        owner_user_id: userId,
        plan_id: "free",
        status: "active",
      })
      .select("*")
      .single();
    if (error || !created) {
      return {
        ok: false,
        code: "ACCOUNT_CREATE_FAILED",
        error: error?.message?.slice(0, 160) || "account create failed",
      };
    }
    account = mapAccount(created as AccountRow);
    await admin.from("account_memberships").upsert(
      {
        account_id: account.id,
        user_id: userId,
        role: "owner",
      },
      { onConflict: "account_id,user_id" }
    );
  }

  const { data: walletRows } = await admin
    .from("credit_wallets")
    .select("*")
    .eq("account_id", account.id)
    .limit(1);

  let wallet: CreditWallet;
  if (walletRows?.length) {
    wallet = mapWallet(walletRows[0] as WalletRow);
  } else {
    const { data: w, error: wErr } = await admin
      .from("credit_wallets")
      .insert({
        account_id: account.id,
        available_credits: 0,
        reserved_credits: 0,
        lifetime_used_credits: 0,
        version: 0,
      })
      .select("*")
      .single();
    if (wErr || !w) {
      return {
        ok: false,
        code: "WALLET_CREATE_FAILED",
        error: wErr?.message?.slice(0, 160) || "wallet create failed",
      };
    }
    wallet = mapWallet(w as WalletRow);
  }

  // One-time free bootstrap grant
  if (initialAvailable > 0 && wallet.availableCredits === 0) {
    const idem = `free:${account.id}:bootstrap`;
    const { data: existingLedger } = await admin
      .from("credit_ledger")
      .select("id")
      .eq("idempotency_key", idem)
      .limit(1);
    if (!existingLedger?.length) {
      const nextAvailable = wallet.availableCredits + initialAvailable;
      const { data: updated, error: uErr } = await admin
        .from("credit_wallets")
        .update({
          available_credits: nextAvailable,
          version: wallet.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("account_id", account.id)
        .eq("version", wallet.version)
        .select("*")
        .maybeSingle();
      if (!uErr && updated) {
        wallet = mapWallet(updated as WalletRow);
        await admin.from("credit_ledger").insert({
          account_id: account.id,
          kind: "grant",
          delta_available: initialAvailable,
          delta_reserved: 0,
          available_after: wallet.availableCredits,
          reserved_after: wallet.reservedCredits,
          source_type: "free_period",
          source_id: idem,
          idempotency_key: idem,
          metadata: {},
        });
      }
    }
  }

  return { ok: true, data: { account, wallet } };
}

export async function supabaseReserve(input: {
  accountId: string;
  createdBy: string;
  purpose: ReservationPurpose;
  quotedCredits: number;
  idempotencyKey: string;
}): Promise<
  | { ok: true; data: { reservation: CreditReservation; wallet: CreditWallet } }
  | { ok: false; code: string; error: string }
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, code: "NO_ADMIN", error: "Supabase admin unavailable" };
  }
  if (input.quotedCredits <= 0) {
    return { ok: false, code: "INVALID_AMOUNT", error: "quotedCredits must be > 0" };
  }

  // Idempotent reserve
  const { data: existingRes } = await admin
    .from("credit_reservations")
    .select("*")
    .eq("idempotency_key", input.idempotencyKey)
    .limit(1);
  if (existingRes?.length) {
    const reservation = mapReservation(existingRes[0] as ReservationRow);
    const { data: w } = await admin
      .from("credit_wallets")
      .select("*")
      .eq("account_id", input.accountId)
      .limit(1);
    if (!w?.length) {
      return { ok: false, code: "WALLET_NOT_FOUND", error: "Wallet missing" };
    }
    return {
      ok: true,
      data: {
        reservation,
        wallet: mapWallet(w[0] as WalletRow),
      },
    };
  }

  const { data: walletRows } = await admin
    .from("credit_wallets")
    .select("*")
    .eq("account_id", input.accountId)
    .limit(1);
  if (!walletRows?.length) {
    return { ok: false, code: "WALLET_NOT_FOUND", error: "Wallet not found" };
  }
  const wallet = mapWallet(walletRows[0] as WalletRow);
  if (wallet.availableCredits < input.quotedCredits) {
    return {
      ok: false,
      code: "INSUFFICIENT_CREDITS",
      error: `Need ${input.quotedCredits}, have ${wallet.availableCredits}`,
    };
  }

  const nextAvailable = wallet.availableCredits - input.quotedCredits;
  const nextReserved = wallet.reservedCredits + input.quotedCredits;
  const { data: updated, error: uErr } = await admin
    .from("credit_wallets")
    .update({
      available_credits: nextAvailable,
      reserved_credits: nextReserved,
      version: wallet.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", input.accountId)
    .eq("version", wallet.version)
    .select("*")
    .maybeSingle();
  if (uErr || !updated) {
    return {
      ok: false,
      code: "CONCURRENT_UPDATE",
      error: uErr?.message?.slice(0, 160) || "Wallet version conflict — retry",
    };
  }
  const nextWallet = mapWallet(updated as WalletRow);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { data: resRow, error: rErr } = await admin
    .from("credit_reservations")
    .insert({
      account_id: input.accountId,
      purpose: input.purpose,
      quoted_credits: input.quotedCredits,
      settled_credits: 0,
      released_credits: 0,
      status: "reserved",
      idempotency_key: input.idempotencyKey,
      expires_at: expiresAt,
      created_by: input.createdBy,
    })
    .select("*")
    .single();
  if (rErr || !resRow) {
    // best-effort rollback wallet
    await admin
      .from("credit_wallets")
      .update({
        available_credits: wallet.availableCredits,
        reserved_credits: wallet.reservedCredits,
        version: nextWallet.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("account_id", input.accountId)
      .eq("version", nextWallet.version);
    return {
      ok: false,
      code: "RESERVE_FAILED",
      error: rErr?.message?.slice(0, 160) || "reservation insert failed",
    };
  }
  const reservation = mapReservation(resRow as ReservationRow);
  await admin.from("credit_ledger").insert({
    account_id: input.accountId,
    kind: "reserve",
    delta_available: -input.quotedCredits,
    delta_reserved: input.quotedCredits,
    available_after: nextWallet.availableCredits,
    reserved_after: nextWallet.reservedCredits,
    reservation_id: reservation.id,
    source_type: "reservation",
    source_id: reservation.id,
    idempotency_key: `ledger:reserve:${input.idempotencyKey}`,
    metadata: { purpose: input.purpose },
  });
  return { ok: true, data: { reservation, wallet: nextWallet } };
}

export async function supabaseSettle(input: {
  reservationId: string;
  credits: number;
  idempotencyKey: string;
  jobId?: string;
}): Promise<
  | { ok: true; data: { reservation: CreditReservation; wallet: CreditWallet } }
  | { ok: false; code: string; error: string }
> {
  return settleOrRelease("settle", input);
}

export async function supabaseRelease(input: {
  reservationId: string;
  credits: number;
  idempotencyKey: string;
  reason?: string;
  jobId?: string;
}): Promise<
  | { ok: true; data: { reservation: CreditReservation; wallet: CreditWallet } }
  | { ok: false; code: string; error: string }
> {
  return settleOrRelease("release", input);
}

async function settleOrRelease(
  kind: "settle" | "release",
  input: {
    reservationId: string;
    credits: number;
    idempotencyKey: string;
    reason?: string;
    jobId?: string;
  }
): Promise<
  | { ok: true; data: { reservation: CreditReservation; wallet: CreditWallet } }
  | { ok: false; code: string; error: string }
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, code: "NO_ADMIN", error: "Supabase admin unavailable" };
  }
  if (input.credits <= 0) {
    return { ok: false, code: "INVALID_AMOUNT", error: "credits must be > 0" };
  }

  const { data: led } = await admin
    .from("credit_ledger")
    .select("id")
    .eq("idempotency_key", input.idempotencyKey)
    .limit(1);
  if (led?.length) {
    const { data: resRows } = await admin
      .from("credit_reservations")
      .select("*")
      .eq("id", input.reservationId)
      .limit(1);
    const { data: wRows } = await admin
      .from("credit_wallets")
      .select("*")
      .eq(
        "account_id",
        resRows?.[0] ? (resRows[0] as ReservationRow).account_id : ""
      )
      .limit(1);
    if (resRows?.length && wRows?.length) {
      return {
        ok: true,
        data: {
          reservation: mapReservation(resRows[0] as ReservationRow),
          wallet: mapWallet(wRows[0] as WalletRow),
        },
      };
    }
  }

  const { data: resRows, error: rErr } = await admin
    .from("credit_reservations")
    .select("*")
    .eq("id", input.reservationId)
    .limit(1);
  if (rErr || !resRows?.length) {
    return {
      ok: false,
      code: "RESERVATION_NOT_FOUND",
      error: "Reservation not found",
    };
  }
  const reservation = mapReservation(resRows[0] as ReservationRow);
  const remaining =
    reservation.quotedCredits -
    reservation.settledCredits -
    reservation.releasedCredits;
  if (input.credits > remaining) {
    return {
      ok: false,
      code: "OVER_BUDGET",
      error: `Only ${remaining} credits left on reservation`,
    };
  }

  const { data: walletRows } = await admin
    .from("credit_wallets")
    .select("*")
    .eq("account_id", reservation.accountId)
    .limit(1);
  if (!walletRows?.length) {
    return { ok: false, code: "WALLET_NOT_FOUND", error: "Wallet not found" };
  }
  const wallet = mapWallet(walletRows[0] as WalletRow);

  const deltaAvailable = kind === "release" ? input.credits : 0;
  const deltaReserved = -input.credits;
  const lifetimeDelta = kind === "settle" ? input.credits : 0;
  const nextAvailable = wallet.availableCredits + deltaAvailable;
  const nextReserved = wallet.reservedCredits + deltaReserved;
  if (nextReserved < 0) {
    return {
      ok: false,
      code: "RESERVED_UNDERFLOW",
      error: "Reserved credits would go negative",
    };
  }

  const { data: updatedWallet, error: uErr } = await admin
    .from("credit_wallets")
    .update({
      available_credits: nextAvailable,
      reserved_credits: nextReserved,
      lifetime_used_credits: wallet.lifetimeUsedCredits + lifetimeDelta,
      version: wallet.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", reservation.accountId)
    .eq("version", wallet.version)
    .select("*")
    .maybeSingle();
  if (uErr || !updatedWallet) {
    return {
      ok: false,
      code: "CONCURRENT_UPDATE",
      error: uErr?.message?.slice(0, 160) || "Wallet version conflict",
    };
  }
  const nextWallet = mapWallet(updatedWallet as WalletRow);

  const settled =
    reservation.settledCredits + (kind === "settle" ? input.credits : 0);
  const released =
    reservation.releasedCredits + (kind === "release" ? input.credits : 0);
  const closed = settled + released >= reservation.quotedCredits;
  let status: CreditReservation["status"] = reservation.status;
  if (closed) {
    status =
      released > 0 && settled === 0
        ? "released"
        : released > 0
          ? "partially_settled"
          : "settled";
    if (settled > 0 && released === 0) status = "settled";
    if (settled === 0 && released > 0) status = "released";
    if (settled > 0 && released > 0) status = "partially_settled";
  } else if (settled > 0 || released > 0) {
    status = "partially_settled";
  }

  const { data: nextRes, error: resUpErr } = await admin
    .from("credit_reservations")
    .update({
      settled_credits: settled,
      released_credits: released,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservation.id)
    .select("*")
    .single();
  if (resUpErr || !nextRes) {
    return {
      ok: false,
      code: "RESERVATION_UPDATE_FAILED",
      error: resUpErr?.message?.slice(0, 160) || "reservation update failed",
    };
  }

  await admin.from("credit_ledger").insert({
    account_id: reservation.accountId,
    kind,
    delta_available: deltaAvailable,
    delta_reserved: deltaReserved,
    available_after: nextWallet.availableCredits,
    reserved_after: nextWallet.reservedCredits,
    reservation_id: reservation.id,
    source_type: kind,
    source_id: input.jobId || reservation.id,
    idempotency_key: input.idempotencyKey,
    metadata: {
      reason: input.reason,
      jobId: input.jobId,
    },
  });

  return {
    ok: true,
    data: {
      reservation: mapReservation(nextRes as ReservationRow),
      wallet: nextWallet,
    },
  };
}

export async function supabaseMigrateGuest(input: {
  guestSessionIdHash: string;
  userId: string;
  accountId: string;
  cookieCredits: number;
  idempotencyKey: string;
}): Promise<
  | { ok: true; data: { migrated: number; wallet: CreditWallet } }
  | { ok: false; code: string; error: string }
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, code: "NO_ADMIN", error: "Supabase admin unavailable" };
  }

  const { data: consumed } = await admin
    .from("consumed_guest_sessions")
    .select("*")
    .eq("guest_session_id_hash", input.guestSessionIdHash)
    .limit(1);
  if (consumed?.length) {
    const { data: w } = await admin
      .from("credit_wallets")
      .select("*")
      .eq("account_id", input.accountId)
      .limit(1);
    if (!w?.length) {
      return { ok: false, code: "WALLET_NOT_FOUND", error: "Wallet not found" };
    }
    return {
      ok: true,
      data: { migrated: 0, wallet: mapWallet(w[0] as WalletRow) },
    };
  }

  const { data: walletRows } = await admin
    .from("credit_wallets")
    .select("*")
    .eq("account_id", input.accountId)
    .limit(1);
  if (!walletRows?.length) {
    return { ok: false, code: "WALLET_NOT_FOUND", error: "Wallet not found" };
  }
  let wallet = mapWallet(walletRows[0] as WalletRow);

  // If durable already has balance, mark guest consumed with 0 migrate.
  if (wallet.availableCredits > 0 || wallet.reservedCredits > 0) {
    await admin.from("consumed_guest_sessions").upsert({
      guest_session_id_hash: input.guestSessionIdHash,
      user_id: input.userId,
      account_id: input.accountId,
      migrated_credits: 0,
    });
    return { ok: true, data: { migrated: 0, wallet } };
  }

  const migrated = Math.min(10, Math.max(0, Math.floor(input.cookieCredits)));
  if (migrated === 0) {
    await admin.from("consumed_guest_sessions").upsert({
      guest_session_id_hash: input.guestSessionIdHash,
      user_id: input.userId,
      account_id: input.accountId,
      migrated_credits: 0,
    });
    return { ok: true, data: { migrated: 0, wallet } };
  }

  const { data: existingLed } = await admin
    .from("credit_ledger")
    .select("id")
    .eq("idempotency_key", input.idempotencyKey)
    .limit(1);
  if (existingLed?.length) {
    await admin.from("consumed_guest_sessions").upsert({
      guest_session_id_hash: input.guestSessionIdHash,
      user_id: input.userId,
      account_id: input.accountId,
      migrated_credits: 0,
    });
    return { ok: true, data: { migrated: 0, wallet } };
  }

  const nextAvailable = wallet.availableCredits + migrated;
  const { data: updated, error } = await admin
    .from("credit_wallets")
    .update({
      available_credits: nextAvailable,
      version: wallet.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", input.accountId)
    .eq("version", wallet.version)
    .select("*")
    .maybeSingle();
  if (error || !updated) {
    return {
      ok: false,
      code: "CONCURRENT_UPDATE",
      error: error?.message?.slice(0, 160) || "migrate wallet conflict",
    };
  }
  wallet = mapWallet(updated as WalletRow);
  await admin.from("credit_ledger").insert({
    account_id: input.accountId,
    kind: "migration",
    delta_available: migrated,
    delta_reserved: 0,
    available_after: wallet.availableCredits,
    reserved_after: wallet.reservedCredits,
    source_type: "migration",
    source_id: input.guestSessionIdHash,
    idempotency_key: input.idempotencyKey,
    metadata: {},
  });
  await admin.from("consumed_guest_sessions").upsert({
    guest_session_id_hash: input.guestSessionIdHash,
    user_id: input.userId,
    account_id: input.accountId,
    migrated_credits: migrated,
  });
  return { ok: true, data: { migrated, wallet } };
}

// R1a: the live provider path must use only these atomic RPC wrappers. The
// legacy multi-call functions above remain for non-live migration work until a
// later cleanup, but are not spend authority for /api/generate.

export type AtomicGenerationReservation = {
  reservationId: string;
  jobId: string;
  userId: string;
  accountId: string;
  amount: number;
  status: "reserved";
  idempotencyKey: string;
  expiresAt: string;
  planId: PlanId;
  availableCredits: number;
  reservedCredits: number;
  idempotent: boolean;
  providerAuthorized: boolean;
};

export type AtomicGenerationSettlement = {
  reservationId: string;
  jobId: string;
  status: "captured" | "released";
  availableCredits: number;
  reservedCredits: number;
  idempotent: boolean;
};

type AtomicRpcFailure = {
  ok: false;
  code: string;
  error: string;
  need?: number;
  have?: number;
};

function rpcPayload(data: unknown): Record<string, unknown> | null {
  const value = Array.isArray(data) ? data[0] : data;
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function numberField(
  value: Record<string, unknown>,
  key: string
): number | null {
  const n = value[key];
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function rpcFailure(
  payload: Record<string, unknown> | null,
  fallback: string
): AtomicRpcFailure {
  return {
    ok: false,
    code:
      typeof payload?.code === "string" ? payload.code : "ATOMIC_RPC_FAILED",
    error:
      typeof payload?.error === "string" ? payload.error : fallback,
    ...(numberField(payload || {}, "need") != null
      ? { need: numberField(payload || {}, "need")! }
      : {}),
    ...(numberField(payload || {}, "have") != null
      ? { have: numberField(payload || {}, "have")! }
      : {}),
  };
}

export async function supabaseReserveGenerationAtomic(input: {
  userId: string;
  idempotencyKey: string;
  effectSlug: string;
  quotedCredits: number;
}): Promise<
  | { ok: true; data: AtomicGenerationReservation }
  | AtomicRpcFailure
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: "Supabase service role unavailable",
    };
  }
  const { data, error } = await admin.rpc("pikbo_reserve_generation_v1", {
    p_user_id: input.userId,
    p_idempotency_key: input.idempotencyKey,
    p_effect_slug: input.effectSlug,
    p_quoted_credits: input.quotedCredits,
  });
  if (error) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: error.message.slice(0, 160),
    };
  }
  const payload = rpcPayload(data);
  if (!payload || payload.ok !== true) {
    return rpcFailure(payload, "Atomic generation reservation failed");
  }

  const planId = payload.planId;
  const amount = numberField(payload, "amount");
  const availableCredits = numberField(payload, "availableCredits");
  const reservedCredits = numberField(payload, "reservedCredits");
  if (
    typeof payload.reservationId !== "string" ||
    typeof payload.jobId !== "string" ||
    typeof payload.userId !== "string" ||
    typeof payload.accountId !== "string" ||
    typeof payload.idempotencyKey !== "string" ||
    typeof payload.expiresAt !== "string" ||
    payload.status !== "reserved" ||
    typeof payload.idempotent !== "boolean" ||
    typeof payload.providerAuthorized !== "boolean" ||
    (planId !== "free" && planId !== "creator" && planId !== "shop") ||
    amount == null ||
    availableCredits == null ||
    reservedCredits == null ||
    payload.userId !== input.userId ||
    payload.idempotencyKey !== input.idempotencyKey ||
    amount !== input.quotedCredits ||
    payload.providerAuthorized === payload.idempotent
  ) {
    return {
      ok: false,
      code: "ATOMIC_RPC_INVALID_RESPONSE",
      error: "Atomic reservation returned an invalid payload",
    };
  }

  return {
    ok: true,
    data: {
      reservationId: payload.reservationId,
      jobId: payload.jobId,
      userId: payload.userId,
      accountId: payload.accountId,
      amount,
      status: "reserved",
      idempotencyKey: payload.idempotencyKey,
      expiresAt: payload.expiresAt,
      planId,
      availableCredits,
      reservedCredits,
      idempotent: payload.idempotent === true,
      providerAuthorized: payload.providerAuthorized === true,
    },
  };
}

async function settleGenerationAtomic(
  rpcName:
    | "pikbo_capture_generation_v1"
    | "pikbo_release_generation_v1",
  input: {
    userId: string;
    reservationId: string;
    jobId: string;
    providerRequestId?: string;
    reason?: string;
  }
): Promise<
  | { ok: true; data: AtomicGenerationSettlement }
  | AtomicRpcFailure
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: "Supabase service role unavailable",
    };
  }
  const args =
    rpcName === "pikbo_capture_generation_v1"
      ? {
          p_user_id: input.userId,
          p_reservation_id: input.reservationId,
          p_job_id: input.jobId,
          p_provider_request_id: input.providerRequestId || null,
        }
      : {
          p_user_id: input.userId,
          p_reservation_id: input.reservationId,
          p_job_id: input.jobId,
          p_reason: input.reason || "confirmed_pre_output_failure",
        };
  const { data, error } = await admin.rpc(rpcName, args);
  if (error) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: error.message.slice(0, 160),
    };
  }
  const payload = rpcPayload(data);
  if (!payload || payload.ok !== true) {
    return rpcFailure(payload, "Atomic generation settlement failed");
  }
  const availableCredits = numberField(payload, "availableCredits");
  const reservedCredits = numberField(payload, "reservedCredits");
  const expectedStatus =
    rpcName === "pikbo_capture_generation_v1" ? "captured" : "released";
  if (
    typeof payload.reservationId !== "string" ||
    typeof payload.jobId !== "string" ||
    payload.reservationId !== input.reservationId ||
    payload.jobId !== input.jobId ||
    typeof payload.idempotent !== "boolean" ||
    payload.status !== expectedStatus ||
    availableCredits == null ||
    reservedCredits == null
  ) {
    return {
      ok: false,
      code: "ATOMIC_RPC_INVALID_RESPONSE",
      error: "Atomic settlement returned an invalid payload",
    };
  }
  return {
    ok: true,
    data: {
      reservationId: payload.reservationId,
      jobId: payload.jobId,
      status: expectedStatus,
      availableCredits,
      reservedCredits,
      idempotent: payload.idempotent === true,
    },
  };
}

export async function supabaseCaptureGenerationAtomic(input: {
  userId: string;
  reservationId: string;
  jobId: string;
  providerRequestId?: string;
}) {
  return settleGenerationAtomic("pikbo_capture_generation_v1", input);
}

export async function supabaseReleaseGenerationAtomic(input: {
  userId: string;
  reservationId: string;
  jobId: string;
  reason: string;
}) {
  return settleGenerationAtomic("pikbo_release_generation_v1", input);
}

// ── Atomic Seller Pack (Launch Pack) RPCs ─────────────────────────────────
// Service-role only. Source: 20260729020000_atomic_seller_pack.sql

export type AtomicSellerPackJobPublic = {
  jobId: string;
  childKey: string;
  effectSlug: string;
  aspectRatio: string;
  durationSec: number;
  status: string;
  quotedCredits: number;
  settledCredits: number;
  attemptKey: string | null;
  errorCode?: string | null;
  hasPrivateResult?: boolean;
  modelId?: string | null;
  resolution?: string | null;
};

export type AtomicSellerPackReserveResult = {
  packRunId: string;
  reservationId: string;
  userId: string;
  accountId: string;
  quotedCredits: number;
  settledCredits: number;
  releasedCredits: number;
  status: string;
  contractFingerprint: string;
  clientPackKey: string;
  planId: PlanId;
  availableCredits: number;
  reservedCredits: number;
  idempotent: boolean;
  jobs: AtomicSellerPackJobPublic[];
};

export type AtomicSellerPackChildAuthorization = {
  packRunId: string;
  jobId: string;
  reservationId: string;
  childKey: string;
  effectSlug: string;
  aspectRatio: string;
  durationSec: number;
  credits: number;
  status: string;
  attemptKey: string;
  userId: string;
  accountId: string;
  planId: PlanId;
  availableCredits: number;
  reservedCredits: number;
  expiresAt: string;
  idempotent: boolean;
  providerAuthorized: boolean;
};

export type AtomicSellerPackStatusResult = {
  packRunId: string;
  status: string;
  quotedCredits: number;
  settledCredits: number;
  releasedCredits: number;
  reservationId: string;
  contractFingerprint: string | null;
  clientPackKey: string | null;
  mode: string;
  createdAt: string;
  completedAt: string | null;
  availableCredits: number;
  reservedCredits: number;
  jobs: AtomicSellerPackJobPublic[];
};

function stringField(
  value: Record<string, unknown>,
  key: string
): string | null {
  const v = value[key];
  return typeof v === "string" ? v : null;
}

function mapPackJobs(raw: unknown): AtomicSellerPackJobPublic[] | null {
  if (!Array.isArray(raw)) return null;
  const jobs: AtomicSellerPackJobPublic[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const jobId = stringField(row, "jobId");
    const childKey = stringField(row, "childKey");
    const effectSlug = stringField(row, "effectSlug");
    const aspectRatio = stringField(row, "aspectRatio");
    const status = stringField(row, "status");
    const durationSec = numberField(row, "durationSec");
    const quotedCredits = numberField(row, "quotedCredits");
    const settledCredits = numberField(row, "settledCredits");
    if (
      !jobId ||
      !childKey ||
      !effectSlug ||
      !aspectRatio ||
      !status ||
      durationSec == null ||
      quotedCredits == null ||
      settledCredits == null
    ) {
      return null;
    }
    jobs.push({
      jobId,
      childKey,
      effectSlug,
      aspectRatio,
      durationSec,
      status,
      quotedCredits,
      settledCredits,
      attemptKey:
        row.attemptKey == null
          ? null
          : typeof row.attemptKey === "string"
            ? row.attemptKey
            : null,
      errorCode:
        row.errorCode == null
          ? null
          : typeof row.errorCode === "string"
            ? row.errorCode
            : null,
      hasPrivateResult:
        typeof row.hasPrivateResult === "boolean"
          ? row.hasPrivateResult
          : undefined,
      modelId:
        row.modelId == null
          ? null
          : typeof row.modelId === "string"
            ? row.modelId
            : null,
      resolution:
        row.resolution == null
          ? null
          : typeof row.resolution === "string"
            ? row.resolution
            : null,
    });
  }
  return jobs;
}

function planIdField(value: unknown): PlanId | null {
  return value === "free" || value === "creator" || value === "shop"
    ? value
    : null;
}

export async function supabaseReserveSellerPackAtomic(input: {
  userId: string;
  clientPackKey: string;
}): Promise<
  | { ok: true; data: AtomicSellerPackReserveResult }
  | AtomicRpcFailure
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: "Supabase service role unavailable",
    };
  }
  const { data, error } = await admin.rpc("pikbo_reserve_seller_pack_v1", {
    p_user_id: input.userId,
    p_client_pack_key: input.clientPackKey,
  });
  if (error) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: error.message.slice(0, 160),
    };
  }
  const payload = rpcPayload(data);
  if (!payload || payload.ok !== true) {
    return rpcFailure(payload, "Atomic seller pack reserve failed");
  }
  const jobs = mapPackJobs(payload.jobs);
  const planId = planIdField(payload.planId);
  const quotedCredits = numberField(payload, "quotedCredits");
  const settledCredits = numberField(payload, "settledCredits");
  const releasedCredits = numberField(payload, "releasedCredits");
  const availableCredits = numberField(payload, "availableCredits");
  const reservedCredits = numberField(payload, "reservedCredits");
  if (
    typeof payload.packRunId !== "string" ||
    typeof payload.reservationId !== "string" ||
    typeof payload.userId !== "string" ||
    typeof payload.accountId !== "string" ||
    typeof payload.status !== "string" ||
    typeof payload.contractFingerprint !== "string" ||
    typeof payload.clientPackKey !== "string" ||
    typeof payload.idempotent !== "boolean" ||
    !jobs ||
    jobs.length !== 3 ||
    !planId ||
    quotedCredits !== 30 ||
    settledCredits == null ||
    releasedCredits == null ||
    availableCredits == null ||
    reservedCredits == null ||
    payload.userId !== input.userId
  ) {
    return {
      ok: false,
      code: "ATOMIC_RPC_INVALID_RESPONSE",
      error: "Atomic seller pack reserve returned an invalid payload",
    };
  }
  return {
    ok: true,
    data: {
      packRunId: payload.packRunId,
      reservationId: payload.reservationId,
      userId: payload.userId,
      accountId: payload.accountId,
      quotedCredits,
      settledCredits,
      releasedCredits,
      status: payload.status,
      contractFingerprint: payload.contractFingerprint,
      clientPackKey: payload.clientPackKey,
      planId,
      availableCredits,
      reservedCredits,
      idempotent: payload.idempotent === true,
      jobs,
    },
  };
}

export async function supabaseAuthorizeSellerPackChildAtomic(input: {
  userId: string;
  packRunId: string;
  jobId: string;
  effectSlug: string;
  durationSec: number;
  aspectRatio: string;
  attemptKey: string;
}): Promise<
  | { ok: true; data: AtomicSellerPackChildAuthorization }
  | AtomicRpcFailure
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: "Supabase service role unavailable",
    };
  }
  const { data, error } = await admin.rpc(
    "pikbo_authorize_seller_pack_child_v1",
    {
      p_user_id: input.userId,
      p_pack_run_id: input.packRunId,
      p_job_id: input.jobId,
      p_effect_slug: input.effectSlug,
      p_duration_sec: input.durationSec,
      p_aspect_ratio: input.aspectRatio,
      p_attempt_key: input.attemptKey,
    }
  );
  if (error) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: error.message.slice(0, 160),
    };
  }
  const payload = rpcPayload(data);
  if (!payload || payload.ok !== true) {
    return rpcFailure(payload, "Atomic seller pack child authorize failed");
  }
  const planId = planIdField(payload.planId);
  const credits = numberField(payload, "credits");
  const durationSec = numberField(payload, "durationSec");
  const availableCredits = numberField(payload, "availableCredits");
  const reservedCredits = numberField(payload, "reservedCredits");
  if (
    typeof payload.packRunId !== "string" ||
    typeof payload.jobId !== "string" ||
    typeof payload.reservationId !== "string" ||
    typeof payload.childKey !== "string" ||
    typeof payload.effectSlug !== "string" ||
    typeof payload.aspectRatio !== "string" ||
    typeof payload.status !== "string" ||
    typeof payload.attemptKey !== "string" ||
    typeof payload.userId !== "string" ||
    typeof payload.accountId !== "string" ||
    typeof payload.expiresAt !== "string" ||
    typeof payload.idempotent !== "boolean" ||
    typeof payload.providerAuthorized !== "boolean" ||
    !planId ||
    credits !== 10 ||
    durationSec == null ||
    availableCredits == null ||
    reservedCredits == null ||
    payload.packRunId !== input.packRunId ||
    payload.jobId !== input.jobId ||
    payload.userId !== input.userId ||
    payload.effectSlug !== input.effectSlug
  ) {
    return {
      ok: false,
      code: "ATOMIC_RPC_INVALID_RESPONSE",
      error: "Atomic seller pack authorize returned an invalid payload",
    };
  }
  return {
    ok: true,
    data: {
      packRunId: payload.packRunId,
      jobId: payload.jobId,
      reservationId: payload.reservationId,
      childKey: payload.childKey,
      effectSlug: payload.effectSlug,
      aspectRatio: payload.aspectRatio,
      durationSec,
      credits,
      status: payload.status,
      attemptKey: payload.attemptKey,
      userId: payload.userId,
      accountId: payload.accountId,
      planId,
      availableCredits,
      reservedCredits,
      expiresAt: payload.expiresAt,
      idempotent: payload.idempotent === true,
      providerAuthorized: payload.providerAuthorized === true,
    },
  };
}

export async function supabaseSettleSellerPackChildAtomic(input: {
  userId: string;
  packRunId: string;
  jobId: string;
  providerRequestId?: string;
}): Promise<
  | {
      ok: true;
      data: {
        packRunId: string;
        jobId: string;
        reservationId: string;
        settledCredits: number;
        availableCredits: number;
        reservedCredits: number;
        packSettledCredits: number;
        packReleasedCredits: number;
        idempotent: boolean;
      };
    }
  | AtomicRpcFailure
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: "Supabase service role unavailable",
    };
  }
  const { data, error } = await admin.rpc("pikbo_settle_seller_pack_child_v1", {
    p_user_id: input.userId,
    p_pack_run_id: input.packRunId,
    p_job_id: input.jobId,
    p_provider_request_id: input.providerRequestId || null,
  });
  if (error) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: error.message.slice(0, 160),
    };
  }
  const payload = rpcPayload(data);
  if (!payload || payload.ok !== true) {
    return rpcFailure(payload, "Atomic seller pack child settle failed");
  }
  const settledCredits = numberField(payload, "settledCredits");
  const availableCredits = numberField(payload, "availableCredits");
  const reservedCredits = numberField(payload, "reservedCredits");
  const packSettledCredits = numberField(payload, "packSettledCredits");
  const packReleasedCredits = numberField(payload, "packReleasedCredits");
  if (
    typeof payload.packRunId !== "string" ||
    typeof payload.jobId !== "string" ||
    typeof payload.reservationId !== "string" ||
    typeof payload.idempotent !== "boolean" ||
    payload.status !== "captured" ||
    settledCredits !== 10 ||
    availableCredits == null ||
    reservedCredits == null ||
    packSettledCredits == null ||
    packReleasedCredits == null ||
    payload.packRunId !== input.packRunId ||
    payload.jobId !== input.jobId
  ) {
    return {
      ok: false,
      code: "ATOMIC_RPC_INVALID_RESPONSE",
      error: "Atomic seller pack settle returned an invalid payload",
    };
  }
  return {
    ok: true,
    data: {
      packRunId: payload.packRunId,
      jobId: payload.jobId,
      reservationId: payload.reservationId,
      settledCredits,
      availableCredits,
      reservedCredits,
      packSettledCredits,
      packReleasedCredits,
      idempotent: payload.idempotent === true,
    },
  };
}

export async function supabaseReleaseSellerPackChildAtomic(input: {
  userId: string;
  packRunId: string;
  jobId: string;
  reason: string;
}): Promise<
  | {
      ok: true;
      data: {
        packRunId: string;
        jobId: string;
        reservationId: string;
        releasedCredits: number;
        availableCredits: number;
        reservedCredits: number;
        packSettledCredits: number;
        packReleasedCredits: number;
        creditsRefunded: true;
        idempotent: boolean;
      };
    }
  | AtomicRpcFailure
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: "Supabase service role unavailable",
    };
  }
  const { data, error } = await admin.rpc("pikbo_release_seller_pack_child_v1", {
    p_user_id: input.userId,
    p_pack_run_id: input.packRunId,
    p_job_id: input.jobId,
    p_reason: input.reason || "child_failed",
  });
  if (error) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: error.message.slice(0, 160),
    };
  }
  const payload = rpcPayload(data);
  if (!payload || payload.ok !== true) {
    return rpcFailure(payload, "Atomic seller pack child release failed");
  }
  const releasedCredits = numberField(payload, "releasedCredits");
  const availableCredits = numberField(payload, "availableCredits");
  const reservedCredits = numberField(payload, "reservedCredits");
  const packSettledCredits = numberField(payload, "packSettledCredits");
  const packReleasedCredits = numberField(payload, "packReleasedCredits");
  if (
    typeof payload.packRunId !== "string" ||
    typeof payload.jobId !== "string" ||
    typeof payload.reservationId !== "string" ||
    typeof payload.idempotent !== "boolean" ||
    payload.status !== "released" ||
    payload.creditsRefunded !== true ||
    releasedCredits !== 10 ||
    availableCredits == null ||
    reservedCredits == null ||
    packSettledCredits == null ||
    packReleasedCredits == null ||
    payload.packRunId !== input.packRunId ||
    payload.jobId !== input.jobId
  ) {
    return {
      ok: false,
      code: "ATOMIC_RPC_INVALID_RESPONSE",
      error: "Atomic seller pack release returned an invalid payload",
    };
  }
  return {
    ok: true,
    data: {
      packRunId: payload.packRunId,
      jobId: payload.jobId,
      reservationId: payload.reservationId,
      releasedCredits,
      availableCredits,
      reservedCredits,
      packSettledCredits,
      packReleasedCredits,
      creditsRefunded: true,
      idempotent: payload.idempotent === true,
    },
  };
}

export async function supabaseRetrySellerPackChildAtomic(input: {
  userId: string;
  packRunId: string;
  jobId: string;
  attemptKey: string;
}): Promise<
  | {
      ok: true;
      data: {
        packRunId: string;
        jobId: string;
        reservationId: string;
        childKey: string;
        status: string;
        attemptKey: string;
        availableCredits: number;
        reservedCredits: number;
        packSettledCredits: number;
        packReleasedCredits: number;
        idempotent: boolean;
      };
    }
  | AtomicRpcFailure
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: "Supabase service role unavailable",
    };
  }
  const { data, error } = await admin.rpc("pikbo_retry_seller_pack_child_v1", {
    p_user_id: input.userId,
    p_pack_run_id: input.packRunId,
    p_job_id: input.jobId,
    p_attempt_key: input.attemptKey,
  });
  if (error) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: error.message.slice(0, 160),
    };
  }
  const payload = rpcPayload(data);
  if (!payload || payload.ok !== true) {
    return rpcFailure(payload, "Atomic seller pack child retry failed");
  }
  const availableCredits = numberField(payload, "availableCredits");
  const reservedCredits = numberField(payload, "reservedCredits");
  const packSettledCredits = numberField(payload, "packSettledCredits");
  const packReleasedCredits = numberField(payload, "packReleasedCredits");
  if (
    typeof payload.packRunId !== "string" ||
    typeof payload.jobId !== "string" ||
    typeof payload.reservationId !== "string" ||
    typeof payload.childKey !== "string" ||
    typeof payload.status !== "string" ||
    typeof payload.attemptKey !== "string" ||
    typeof payload.idempotent !== "boolean" ||
    availableCredits == null ||
    reservedCredits == null ||
    packSettledCredits == null ||
    packReleasedCredits == null ||
    payload.packRunId !== input.packRunId ||
    payload.jobId !== input.jobId
  ) {
    return {
      ok: false,
      code: "ATOMIC_RPC_INVALID_RESPONSE",
      error: "Atomic seller pack retry returned an invalid payload",
    };
  }
  return {
    ok: true,
    data: {
      packRunId: payload.packRunId,
      jobId: payload.jobId,
      reservationId: payload.reservationId,
      childKey: payload.childKey,
      status: payload.status,
      attemptKey: payload.attemptKey,
      availableCredits,
      reservedCredits,
      packSettledCredits,
      packReleasedCredits,
      idempotent: payload.idempotent === true,
    },
  };
}

export async function supabaseGetSellerPackStatusAtomic(input: {
  userId: string;
  packRunId: string;
}): Promise<
  | { ok: true; data: AtomicSellerPackStatusResult }
  | AtomicRpcFailure
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: "Supabase service role unavailable",
    };
  }
  const { data, error } = await admin.rpc("pikbo_get_seller_pack_status_v1", {
    p_user_id: input.userId,
    p_pack_run_id: input.packRunId,
  });
  if (error) {
    return {
      ok: false,
      code: "DURABLE_CREDITS_UNAVAILABLE",
      error: error.message.slice(0, 160),
    };
  }
  const payload = rpcPayload(data);
  if (!payload || payload.ok !== true) {
    return rpcFailure(payload, "Atomic seller pack status failed");
  }
  const jobs = mapPackJobs(payload.jobs);
  const quotedCredits = numberField(payload, "quotedCredits");
  const settledCredits = numberField(payload, "settledCredits");
  const releasedCredits = numberField(payload, "releasedCredits");
  const availableCredits = numberField(payload, "availableCredits");
  const reservedCredits = numberField(payload, "reservedCredits");
  if (
    typeof payload.packRunId !== "string" ||
    typeof payload.status !== "string" ||
    typeof payload.reservationId !== "string" ||
    typeof payload.mode !== "string" ||
    !jobs ||
    quotedCredits == null ||
    settledCredits == null ||
    releasedCredits == null ||
    availableCredits == null ||
    reservedCredits == null ||
    payload.packRunId !== input.packRunId
  ) {
    return {
      ok: false,
      code: "ATOMIC_RPC_INVALID_RESPONSE",
      error: "Atomic seller pack status returned an invalid payload",
    };
  }
  return {
    ok: true,
    data: {
      packRunId: payload.packRunId,
      status: payload.status,
      quotedCredits,
      settledCredits,
      releasedCredits,
      reservationId: payload.reservationId,
      contractFingerprint:
        typeof payload.contractFingerprint === "string"
          ? payload.contractFingerprint
          : null,
      clientPackKey:
        typeof payload.clientPackKey === "string"
          ? payload.clientPackKey
          : null,
      mode: payload.mode,
      createdAt:
        typeof payload.createdAt === "string" ? payload.createdAt : "",
      completedAt:
        payload.completedAt == null
          ? null
          : typeof payload.completedAt === "string"
            ? payload.completedAt
            : null,
      availableCredits,
      reservedCredits,
      jobs,
    },
  };
}
