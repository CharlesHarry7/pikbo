/**
 * Supabase Postgres durable credits adapter (T5).
 * Uses service role only. All money mutations call SECURITY DEFINER RPCs so
 * wallet, reservation and ledger changes commit in one Postgres transaction.
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
  schemaVersion?: number;
  requiredVersion?: number;
  missing?: string[];
  warning?: string;
};

let schemaReadyCache: {
  at: number;
  ready: boolean;
  schemaVersion?: number;
  requiredVersion?: number;
  missing?: string[];
  warning?: string;
} | null = null;
const SCHEMA_TTL_MS = 30_000;

export function supabaseCreditsConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseServiceRoleKey());
}

/**
 * Probe the versioned T5 contract (cached briefly). A single table existing is
 * insufficient: production requires every critical table and transactional RPC.
 */
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
      schemaVersion: schemaReadyCache.schemaVersion,
      requiredVersion: schemaReadyCache.requiredVersion,
      missing: schemaReadyCache.missing,
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
    const { data, error } = await admin.rpc("pikbo_credits_schema_probe");
    if (error) {
      const msg = error.message || String(error);
      const missing =
        /does not exist|function|schema cache|Could not find/i.test(msg);
      schemaReadyCache = {
        at: now,
        ready: false,
        warning: missing
          ? "T5 RPC migration not applied — apply both durable credit migrations in order"
          : msg.slice(0, 160),
      };
      return {
        configured: true,
        schemaReady: false,
        warning: schemaReadyCache.warning,
      };
    }
    const raw = (data ?? {}) as {
      ready?: unknown;
      schemaVersion?: unknown;
      requiredVersion?: unknown;
      missing?: unknown;
    };
    const schemaVersion = Number(raw.schemaVersion) || 0;
    const requiredVersion = Number(raw.requiredVersion) || 2;
    const missingItems = Array.isArray(raw.missing)
      ? raw.missing.filter((v): v is string => typeof v === "string")
      : [];
    const ready =
      raw.ready === true &&
      schemaVersion >= requiredVersion &&
      missingItems.length === 0;
    const warning = ready
      ? undefined
      : `T5 schema incomplete (v${schemaVersion}/${requiredVersion})${
          missingItems.length ? `: ${missingItems.slice(0, 8).join(", ")}` : ""
        }`;
    schemaReadyCache = {
      at: now,
      ready,
      schemaVersion,
      requiredVersion,
      missing: missingItems,
      warning,
    };
    return {
      configured: true,
      schemaReady: ready,
      schemaVersion,
      requiredVersion,
      missing: missingItems,
      warning,
    };
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

type RpcErrorLike = { message?: string; details?: string; hint?: string };

function rpcFailure(error: RpcErrorLike | null | undefined): {
  ok: false;
  code: string;
  error: string;
} {
  const message = error?.message || "Supabase credit RPC failed";
  const match = /PIKBO_CREDITS:([A-Z0-9_]+)/.exec(message);
  return {
    ok: false,
    code: match?.[1] || "SUPABASE_RPC_FAILED",
    error: message.slice(0, 200),
  };
}

function mutationData(raw: unknown): {
  reservation: CreditReservation;
  wallet: CreditWallet;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { reservation?: unknown; wallet?: unknown };
  if (!obj.reservation || !obj.wallet) return null;
  return {
    reservation: mapReservation(obj.reservation as ReservationRow),
    wallet: mapWallet(obj.wallet as WalletRow),
  };
}

/** Atomic profile/account/wallet bootstrap with a server-fixed 10-credit grant. */
export async function supabaseEnsurePersonalAccount(
  userId: string,
  _initialAvailable = 10
): Promise<
  | { ok: true; data: { account: DurableAccount; wallet: CreditWallet } }
  | { ok: false; code: string; error: string }
> {
  const admin = getSupabaseAdmin();
  void _initialAvailable; // RPC owns the Free bootstrap amount (always 10).
  if (!admin) return rpcFailure({ message: "Supabase admin unavailable" });
  const { data, error } = await admin.rpc("pikbo_ensure_personal_account", {
    p_user_id: userId,
  });
  if (error) return rpcFailure(error);
  const raw = data as { account?: unknown; wallet?: unknown } | null;
  if (!raw?.account || !raw.wallet) {
    return rpcFailure({ message: "Malformed ensure-account RPC response" });
  }
  return {
    ok: true,
    data: {
      account: mapAccount(raw.account as AccountRow),
      wallet: mapWallet(raw.wallet as WalletRow),
    },
  };
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
  if (!admin) return rpcFailure({ message: "Supabase admin unavailable" });
  const expected = input.purpose === "seller_pack" ? 30 : 10;
  if (input.quotedCredits !== expected) {
    return {
      ok: false,
      code: "SERVER_QUOTE_MISMATCH",
      error: `${input.purpose} is server-priced at ${expected} credits`,
    };
  }
  const { data, error } = await admin.rpc("pikbo_reserve_credits", {
    p_account_id: input.accountId,
    p_created_by: input.createdBy,
    p_purpose: input.purpose,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) return rpcFailure(error);
  const mapped = mutationData(data);
  if (!mapped) return rpcFailure({ message: "Malformed reserve RPC response" });
  if (mapped.reservation.quotedCredits !== expected) {
    return rpcFailure({ message: "Server quote invariant failed" });
  }
  return { ok: true, data: mapped };
}

export async function supabaseSettle(input: {
  reservationId: string;
  actorUserId: string;
  itemKey: string;
  idempotencyKey: string;
  jobId?: string;
}): Promise<
  | { ok: true; data: { reservation: CreditReservation; wallet: CreditWallet } }
  | { ok: false; code: string; error: string }
> {
  const admin = getSupabaseAdmin();
  if (!admin) return rpcFailure({ message: "Supabase admin unavailable" });
  const { data, error } = await admin.rpc(
    "pikbo_settle_reservation_item",
    {
      p_reservation_id: input.reservationId,
      p_actor_user_id: input.actorUserId,
      p_item_key: input.itemKey,
      p_job_id: input.jobId ?? null,
      p_idempotency_key: input.idempotencyKey,
    }
  );
  if (error) return rpcFailure(error);
  const mapped = mutationData(data);
  if (!mapped) return rpcFailure({ message: "Malformed settle RPC response" });
  return { ok: true, data: mapped };
}

export async function supabaseRelease(input: {
  reservationId: string;
  actorUserId: string;
  itemKey: string;
  idempotencyKey: string;
  reason?: string;
  jobId?: string;
}): Promise<
  | { ok: true; data: { reservation: CreditReservation; wallet: CreditWallet } }
  | { ok: false; code: string; error: string }
> {
  const admin = getSupabaseAdmin();
  if (!admin) return rpcFailure({ message: "Supabase admin unavailable" });
  const { data, error } = await admin.rpc(
    "pikbo_release_reservation_item",
    {
      p_reservation_id: input.reservationId,
      p_actor_user_id: input.actorUserId,
      p_item_key: input.itemKey,
      p_job_id: input.jobId ?? null,
      p_reason: input.reason ?? null,
      p_idempotency_key: input.idempotencyKey,
    }
  );
  if (error) return rpcFailure(error);
  const mapped = mutationData(data);
  if (!mapped) return rpcFailure({ message: "Malformed release RPC response" });
  return { ok: true, data: mapped };
}

/** Atomically return pending items for expired reservations (service role only). */
export async function supabaseExpireReservations(): Promise<
  | { ok: true; data: { expired: number; releasedCredits: number } }
  | { ok: false; code: string; error: string }
> {
  const admin = getSupabaseAdmin();
  if (!admin) return rpcFailure({ message: "Supabase admin unavailable" });
  const { data, error } = await admin.rpc("pikbo_expire_reservations");
  if (error) return rpcFailure(error);
  const raw = data as { expired?: unknown; releasedCredits?: unknown } | null;
  if (!raw) return rpcFailure({ message: "Malformed expiry RPC response" });
  return {
    ok: true,
    data: {
      expired: Math.max(0, Math.floor(Number(raw.expired) || 0)),
      releasedCredits: Math.max(0, Math.floor(Number(raw.releasedCredits) || 0)),
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
  if (!admin) return rpcFailure({ message: "Supabase admin unavailable" });
  const { data, error } = await admin.rpc("pikbo_migrate_guest_credits", {
    p_guest_session_id_hash: input.guestSessionIdHash,
    p_user_id: input.userId,
    p_account_id: input.accountId,
    p_cookie_credits: Math.min(10, Math.max(0, Math.floor(input.cookieCredits))),
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) return rpcFailure(error);
  const raw = data as { migrated?: unknown; wallet?: unknown } | null;
  if (!raw?.wallet) {
    return rpcFailure({ message: "Malformed guest-migrate RPC response" });
  }
  return {
    ok: true,
    data: {
      migrated: Math.min(10, Math.max(0, Number(raw.migrated) || 0)),
      wallet: mapWallet(raw.wallet as WalletRow),
    },
  };
}
