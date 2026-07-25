/**
 * File-backed durable credits for local / single-node **dev only**.
 * Production must use Supabase RPCs (fail closed — never silent dual ledger).
 */

import { promises as fs } from "fs";
import path from "path";
import type { DurableState } from "@/lib/durableCredits/types";
import { emptyState } from "@/lib/durableCredits/engine";

function storePath(): string {
  if (process.env.DURABLE_CREDITS_PATH) return process.env.DURABLE_CREDITS_PATH;
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "durable-credits.json"
  );
}

export async function loadDurableState(): Promise<DurableState> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as DurableState;
    if (!parsed || typeof parsed !== "object" || !parsed.wallets) {
      return emptyState();
    }
    return {
      ...emptyState(),
      ...parsed,
      accounts: parsed.accounts ?? {},
      wallets: parsed.wallets ?? {},
      reservations: parsed.reservations ?? {},
      ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
      ledgerByIdempotency: parsed.ledgerByIdempotency ?? {},
      reservationByIdempotency: parsed.reservationByIdempotency ?? {},
      consumedGuests: parsed.consumedGuests ?? {},
    };
  } catch {
    return emptyState();
  }
}

export async function saveDurableState(state: DurableState): Promise<void> {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(state, null, 2), "utf8");
}

export async function probeDurableCreditsStore(): Promise<{
  writable: boolean;
  path: string;
  backend: "local-file" | "supabase" | "none";
  required: boolean;
  configured: boolean;
  schemaReady?: boolean;
  transactionReady?: boolean;
  authority?: "cookie" | "supabase" | "none";
  warning?: string;
  code?: string;
}> {
  const required =
    process.env.REQUIRE_DURABLE_CREDITS === "1" ||
    process.env.PIKBO_DURABLE_BACKEND === "supabase" ||
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  const { probeSupabaseCreditsSchema, supabaseCreditsConfigured } =
    await import("@/lib/durableCredits/supabaseStore");

  if (supabaseCreditsConfigured()) {
    const schema = await probeSupabaseCreditsSchema();
    if (schema.transactionReady) {
      return {
        writable: true,
        path: "supabase:rpc",
        backend: "supabase",
        required,
        configured: true,
        schemaReady: true,
        transactionReady: true,
        authority: "supabase",
      };
    }
    if (schema.schemaReady && !schema.transactionReady) {
      // Tables exist, RPCs missing — fail closed in production
      if (required) {
        return {
          writable: false,
          path: "supabase:tables-only",
          backend: "supabase",
          required: true,
          configured: true,
          schemaReady: true,
          transactionReady: false,
          authority: "none",
          code: schema.code || "RPC_MISSING",
          warning: schema.warning,
        };
      }
    }
    if (required) {
      return {
        writable: false,
        path: "supabase:not-ready",
        backend: "supabase",
        required: true,
        configured: true,
        schemaReady: schema.schemaReady,
        transactionReady: false,
        authority: "none",
        code: schema.code,
        warning: schema.warning,
      };
    }
    // Dev: optional local-file fallback only when not required
  }

  // Explicit local or dev without Supabase
  if (
    process.env.PIKBO_DURABLE_BACKEND === "local" ||
    process.env.DURABLE_CREDITS === "local" ||
    (!required && !supabaseCreditsConfigured())
  ) {
    const file = storePath();
    let localWritable = false;
    try {
      await fs.mkdir(path.dirname(file), { recursive: true });
      const probe = `${file}.probe`;
      await fs.writeFile(probe, "ok", "utf8");
      await fs.unlink(probe);
      localWritable = true;
    } catch {
      localWritable = false;
    }
    return {
      writable: localWritable,
      path: file,
      backend: localWritable ? "local-file" : "none",
      required: false,
      configured: localWritable,
      schemaReady: false,
      transactionReady: false,
      authority: "cookie",
      warning: localWritable
        ? "Dev local-file demo only — not multi-node"
        : "Local durable path not writable",
    };
  }

  return {
    writable: false,
    path: "none",
    backend: "none",
    required,
    configured: false,
    schemaReady: false,
    transactionReady: false,
    authority: "none",
    code: "NO_BACKEND",
    warning: required
      ? "Production requires Supabase T5 schema + credit RPCs"
      : "No durable backend configured",
  };
}
