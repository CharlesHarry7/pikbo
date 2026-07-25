/**
 * Supabase Postgres durable credits adapter (T5 Wave C).
 * Mutations go ONLY through transactional RPCs (FOR UPDATE).
 * Never log service keys. Errors return codes only.
 */

import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  supabaseServiceRoleKey,
  supabaseUrl,
  supabaseUrlHost,
} from "@/lib/supabase/env";
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
  transactionReady: boolean;
  /** Desensitized host only */
  projectHost?: string | null;
  warning?: string;
  /** Machine-readable: SCHEMA_MISSING | URL_INVALID | RPC_MISSING | ADMIN_INIT | PROBE_ERROR */
  code?: string;
};

let schemaReadyCache: {
  at: number;
  ready: boolean;
  transactionReady: boolean;
  warning?: string;
  code?: string;
} | null = null;
const SCHEMA_TTL_MS = 15_000;

export function supabaseCreditsConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseServiceRoleKey());
}

/** Health must not hang on dead Supabase — fail closed after budget. */
const PROBE_TIMEOUT_MS = 4_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label}_timeout_${ms}ms`)),
      ms
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

function sanitizeErr(msg: string): string {
  // Never leak JWT-like strings or service role fragments
  return msg
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[redacted]")
    .replace(/service_role|apikey|Bearer\s+\S+/gi, "[redacted]")
    .slice(0, 160);
}

function mapWalletFromRpc(w: Record<string, unknown> | null | undefined): CreditWallet | null {
  if (!w || typeof w !== "object") return null;
  const accountId = String(w.accountId ?? w.account_id ?? "");
  if (!accountId) return null;
  return {
    accountId,
    availableCredits: Number(w.availableCredits ?? w.available_credits ?? 0),
    reservedCredits: Number(w.reservedCredits ?? w.reserved_credits ?? 0),
    lifetimeUsedCredits: Number(
      w.lifetimeUsedCredits ?? w.lifetime_used_credits ?? 0
    ),
    version: Number(w.version ?? 0),
    updatedAt: String(w.updatedAt ?? w.updated_at ?? new Date().toISOString()),
  };
}

function mapReservationFromRpc(
  r: Record<string, unknown> | null | undefined
): CreditReservation | null {
  if (!r || typeof r !== "object") return null;
  const id = String(r.id ?? "");
  if (!id) return null;
  return {
    id,
    accountId: String(r.account_id ?? r.accountId ?? ""),
    purpose: (r.purpose as ReservationPurpose) || "generation",
    quotedCredits: Number(r.quoted_credits ?? r.quotedCredits ?? 0),
    settledCredits: Number(r.settled_credits ?? r.settledCredits ?? 0),
    releasedCredits: Number(r.released_credits ?? r.releasedCredits ?? 0),
    status: (r.status as CreditReservation["status"]) || "reserved",
    idempotencyKey: String(r.idempotency_key ?? r.idempotencyKey ?? ""),
    expiresAt: String(r.expires_at ?? r.expiresAt ?? ""),
    createdBy: String(r.created_by ?? r.createdBy ?? ""),
    createdAt: String(r.created_at ?? r.createdAt ?? ""),
    updatedAt: String(r.updated_at ?? r.updatedAt ?? ""),
  };
}

function mapAccountFromRpc(
  a: Record<string, unknown> | null | undefined
): DurableAccount | null {
  if (!a || typeof a !== "object") return null;
  const id = String(a.id ?? "");
  if (!id) return null;
  return {
    id,
    kind: a.kind === "shop" ? "shop" : "personal",
    ownerUserId: String(a.ownerUserId ?? a.owner_user_id ?? ""),
    planId: (String(a.planId ?? a.plan_id ?? "free") as PlanId) || "free",
    status:
      a.status === "restricted" || a.status === "closed"
        ? a.status
        : "active",
    createdAt: String(a.createdAt ?? a.created_at ?? ""),
    updatedAt: String(a.updatedAt ?? a.updated_at ?? ""),
  };
}

/** Probe tables + transactional RPC surface (cached briefly). */
export async function probeSupabaseCreditsSchema(): Promise<SupabaseCreditsProbe> {
  const host = supabaseUrlHost();
  if (!supabaseCreditsConfigured()) {
    return {
      configured: false,
      schemaReady: false,
      transactionReady: false,
      projectHost: host,
      code: "NOT_CONFIGURED",
      warning: "SUPABASE_URL or SERVICE_ROLE missing",
    };
  }
  if (!supabaseUrl()) {
    return {
      configured: true,
      schemaReady: false,
      transactionReady: false,
      projectHost: host,
      code: "URL_INVALID",
      warning: "Supabase URL invalid after normalize (strip /rest/v1 etc.)",
    };
  }

  const now = Date.now();
  if (schemaReadyCache && now - schemaReadyCache.at < SCHEMA_TTL_MS) {
    return {
      configured: true,
      schemaReady: schemaReadyCache.ready,
      transactionReady: schemaReadyCache.transactionReady,
      projectHost: host,
      warning: schemaReadyCache.warning,
      code: schemaReadyCache.code,
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    schemaReadyCache = {
      at: now,
      ready: false,
      transactionReady: false,
      code: "ADMIN_INIT",
      warning: "admin client init failed",
    };
    return {
      configured: true,
      schemaReady: false,
      transactionReady: false,
      projectHost: host,
      code: "ADMIN_INIT",
      warning: "admin client init failed",
    };
  }

try {
    const result = await withTimeout(
      (async (): Promise<SupabaseCreditsProbe> => {
        // Prefer RPC probe (tables + functions)
        const { data: probeData, error: probeErr } = await admin.rpc(
          "pikbo_probe_ready"
        );
        if (!probeErr && probeData && typeof probeData === "object") {
          const p = probeData as Record<string, unknown>;
          const ok = p.ok === true || p.transactionReady === true;
          const schemaReady = p.schemaReady === true || ok;
          const transactionReady = p.transactionReady === true || ok;
          return {
            configured: true,
            schemaReady,
            transactionReady,
            projectHost: host,
            code: transactionReady
              ? undefined
              : String(p.code || "RPC_NOT_READY"),
            warning: transactionReady
              ? undefined
              : String(p.code || "RPC_NOT_READY"),
          };
        }

        // RPC missing — check table only (migration 1 applied, migration 2 not)
        if (
          probeErr &&
          /Could not find the function|function.*does not exist|PGRST202/i.test(
            probeErr.message || ""
          )
        ) {
          const { error: tableErr } = await admin
            .from("credit_wallets")
            .select("account_id")
            .limit(1);
          if (!tableErr) {
            return {
              configured: true,
              schemaReady: true,
              transactionReady: false,
              projectHost: host,
              code: "RPC_MISSING",
              warning:
                "credit_wallets OK — apply 20260726120000_t5_credit_rpcs.sql for transactionReady",
            };
          }
          const msg = sanitizeErr(tableErr?.message || probeErr.message || "");
          const missing = /does not exist|relation|schema cache|PGRST205/i.test(
            msg
          );
          const badPath = /Invalid path|invalid.*url|404/i.test(msg);
          return {
            configured: true,
            schemaReady: false,
            transactionReady: false,
            projectHost: host,
            code: badPath
              ? "URL_INVALID"
              : missing
                ? "SCHEMA_MISSING"
                : "PROBE_ERROR",
            warning: badPath
              ? "Invalid path in Supabase URL — use project root only (no /rest/v1)"
              : missing
                ? "T5 migration not applied — run 20260723120000_t5_auth_credits.sql"
                : msg,
          };
        }

        // Fallback table probe
        const { error } = await admin
          .from("credit_wallets")
          .select("account_id")
          .limit(1);
        if (error) {
          const msg = sanitizeErr(error.message || String(error));
          const missing = /does not exist|relation|schema cache|PGRST205/i.test(
            msg
          );
          const badPath = /Invalid path|invalid.*url/i.test(msg);
          return {
            configured: true,
            schemaReady: false,
            transactionReady: false,
            projectHost: host,
            code: badPath
              ? "URL_INVALID"
              : missing
                ? "SCHEMA_MISSING"
                : "PROBE_ERROR",
            warning: badPath
              ? "Invalid path in Supabase URL — use project root only (no /rest/v1)"
              : missing
                ? "T5 migration not applied — run 20260723120000_t5_auth_credits.sql"
                : msg,
          };
        }

        // Table OK but no RPC result — partial
        return {
          configured: true,
          schemaReady: true,
          transactionReady: false,
          projectHost: host,
          code: "RPC_MISSING",
          warning: "Tables present — apply t5_credit_rpcs migration",
        };
      })(),
      PROBE_TIMEOUT_MS,
      "credits_probe"
    );

    schemaReadyCache = {
      at: now,
      ready: result.schemaReady,
      transactionReady: result.transactionReady,
      code: result.code,
      warning: result.warning,
    };
    return result;
  } catch (e) {
    const msg = sanitizeErr(
      e instanceof Error ? e.message : "probe failed"
    );
    const timedOut = /timeout/i.test(msg);
    schemaReadyCache = {
      at: now,
      ready: false,
      transactionReady: false,
      code: timedOut ? "PROBE_TIMEOUT" : "PROBE_ERROR",
      warning: msg,
    };
    return {
      configured: true,
      schemaReady: false,
      transactionReady: false,
      projectHost: host,
      code: timedOut ? "PROBE_TIMEOUT" : "PROBE_ERROR",
      warning: msg,
    };
  }
}

export function __resetSupabaseSchemaCache() {
  schemaReadyCache = null;
}

type RpcResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; code: string; error: string };

async function callRpc(
  name: string,
  args: Record<string, unknown>
): Promise<RpcResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, code: "NO_ADMIN", error: "Supabase admin unavailable" };
  }
  try {
    const { data, error } = await admin.rpc(name, args);
    if (error) {
      const msg = sanitizeErr(error.message || "rpc failed");
      if (/Could not find the function|PGRST202/i.test(msg)) {
        return { ok: false, code: "RPC_MISSING", error: msg };
      }
      return { ok: false, code: "RPC_ERROR", error: msg };
    }
    if (!data || typeof data !== "object") {
      return { ok: false, code: "RPC_EMPTY", error: "Empty RPC response" };
    }
    const body = data as Record<string, unknown>;
    if (body.ok === false) {
      return {
        ok: false,
        code: String(body.code || "RPC_DENIED"),
        error: sanitizeErr(String(body.error || body.code || "denied")),
      };
    }
    return {
      ok: true,
      data: (body.data as Record<string, unknown>) || body,
    };
  } catch (e) {
    return {
      ok: false,
      code: "RPC_THROW",
      error: sanitizeErr(e instanceof Error ? e.message : "rpc throw"),
    };
  }
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
  const account = accounts[0] as {
    id: string;
    plan_id: string;
  };
  const { data: wallets, error: wErr } = await admin
    .from("credit_wallets")
    .select("*")
    .eq("account_id", account.id)
    .limit(1);
  if (wErr || !wallets?.length) return null;
  const w = wallets[0] as {
    available_credits: number;
    reserved_credits: number;
  };
  return {
    accountId: account.id,
    availableCredits: w.available_credits,
    reservedCredits: w.reserved_credits,
    planId: account.plan_id || "free",
  };
}

export async function supabaseEnsurePersonalAccount(
  userId: string,
  initialAvailable = 10
): Promise<
  | { ok: true; data: { account: DurableAccount; wallet: CreditWallet } }
  | { ok: false; code: string; error: string }
> {
  const rpc = await callRpc("pikbo_ensure_personal_account", {
    p_user_id: userId,
    p_initial_available: initialAvailable,
  });
  if (!rpc.ok) return rpc;
  const account = mapAccountFromRpc(
    rpc.data.account as Record<string, unknown>
  );
  const wallet = mapWalletFromRpc(rpc.data.wallet as Record<string, unknown>);
  if (!account || !wallet) {
    return { ok: false, code: "RPC_SHAPE", error: "ensure response shape" };
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
  const rpc = await callRpc("pikbo_reserve_credits", {
    p_account_id: input.accountId,
    p_created_by: input.createdBy,
    p_purpose: input.purpose,
    p_quoted_credits: input.quotedCredits,
    p_idempotency_key: input.idempotencyKey,
  });
  if (!rpc.ok) return rpc;
  const reservation = mapReservationFromRpc(
    rpc.data.reservation as Record<string, unknown>
  );
  const wallet = mapWalletFromRpc(rpc.data.wallet as Record<string, unknown>);
  if (!reservation || !wallet) {
    return { ok: false, code: "RPC_SHAPE", error: "reserve response shape" };
  }
  return { ok: true, data: { reservation, wallet } };
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
  const rpc = await callRpc("pikbo_settle_credits", {
    p_reservation_id: input.reservationId,
    p_credits: input.credits,
    p_idempotency_key: input.idempotencyKey,
    p_job_id: input.jobId ?? null,
  });
  if (!rpc.ok) return rpc;
  const reservation = mapReservationFromRpc(
    rpc.data.reservation as Record<string, unknown>
  );
  const wallet = mapWalletFromRpc(rpc.data.wallet as Record<string, unknown>);
  if (!reservation || !wallet) {
    return { ok: false, code: "RPC_SHAPE", error: "settle response shape" };
  }
  return { ok: true, data: { reservation, wallet } };
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
  const rpc = await callRpc("pikbo_release_credits", {
    p_reservation_id: input.reservationId,
    p_credits: input.credits,
    p_idempotency_key: input.idempotencyKey,
    p_reason: input.reason ?? null,
    p_job_id: input.jobId ?? null,
  });
  if (!rpc.ok) return rpc;
  const reservation = mapReservationFromRpc(
    rpc.data.reservation as Record<string, unknown>
  );
  const wallet = mapWalletFromRpc(rpc.data.wallet as Record<string, unknown>);
  if (!reservation || !wallet) {
    return { ok: false, code: "RPC_SHAPE", error: "release response shape" };
  }
  return { ok: true, data: { reservation, wallet } };
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
  const rpc = await callRpc("pikbo_migrate_guest_credits", {
    p_guest_session_id_hash: input.guestSessionIdHash,
    p_user_id: input.userId,
    p_account_id: input.accountId,
    p_cookie_credits: input.cookieCredits,
    p_idempotency_key: input.idempotencyKey,
  });
  if (!rpc.ok) return rpc;
  const wallet = mapWalletFromRpc(rpc.data.wallet as Record<string, unknown>);
  if (!wallet) {
    return { ok: false, code: "RPC_SHAPE", error: "migrate response shape" };
  }
  return {
    ok: true,
    data: {
      migrated: Number(rpc.data.migrated ?? 0),
      wallet,
    },
  };
}

export async function supabaseGrantFree(input: {
  accountId: string;
  credits: number;
  idempotencyKey: string;
  sourceId?: string;
}): Promise<
  | { ok: true; data: { wallet: CreditWallet; replay?: boolean } }
  | { ok: false; code: string; error: string }
> {
  const rpc = await callRpc("pikbo_grant_free_allowance", {
    p_account_id: input.accountId,
    p_credits: input.credits,
    p_idempotency_key: input.idempotencyKey,
    p_source_id: input.sourceId ?? null,
  });
  if (!rpc.ok) return rpc;
  const wallet = mapWalletFromRpc(rpc.data.wallet as Record<string, unknown>);
  if (!wallet) {
    return { ok: false, code: "RPC_SHAPE", error: "grant response shape" };
  }
  return {
    ok: true,
    data: { wallet, replay: Boolean(rpc.data.replay) },
  };
}
