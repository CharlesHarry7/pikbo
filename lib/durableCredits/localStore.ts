/**
 * File-backed durable credits for local / single-node dev.
 * Not a production multi-region store — Supabase is the production path.
 */

import { promises as fs } from "fs";
import { randomUUID } from "crypto";
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
  // Rename is atomic on the local filesystem: a reader sees either the prior
  // complete ledger or the next complete ledger, never a truncated JSON file.
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(temp, file);
}

// Process-local serialization only. The local-file adapter is deliberately a
// single-node/dev verification backend; it is not a production multi-node
// accounting store (Supabase RPCs are the production path).
let mutationTail: Promise<void> = Promise.resolve();

export async function withLocalStoreMutex<T>(work: () => Promise<T>): Promise<T> {
  let release: (() => void) | undefined;
  const previous = mutationTail;
  mutationTail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await work();
  } finally {
    release?.();
  }
}

export async function probeDurableCreditsStore(): Promise<{
  writable: boolean;
  path: string;
  backend: "local-file" | "supabase" | "none";
  required: boolean;
  configured: boolean;
  schemaReady?: boolean;
  schemaVersion?: number;
  requiredVersion?: number;
  missing?: string[];
  warning?: string;
}> {
  const required =
    process.env.REQUIRE_DURABLE_CREDITS === "1" ||
    process.env.PIKBO_DURABLE_BACKEND === "supabase";
  // Lazy import avoids circular deps with supabase clients at module load.
  const { probeSupabaseCreditsSchema, supabaseCreditsConfigured } =
    await import("@/lib/durableCredits/supabaseStore");
  // Keep health aligned with the facade: an env request alone cannot enable
  // a Supabase generation ledger before its durable job worker exists.
  const serverOwnedJobsReady = false;

  if (required && !serverOwnedJobsReady) {
    return {
      writable: false,
      path: "supabase",
      backend: "none",
      required,
      configured: supabaseCreditsConfigured(),
      schemaReady: false,
      warning:
        "Supabase durable generation is hard-disabled: server-owned job persistence is not implemented",
    };
  }

  if (supabaseCreditsConfigured()) {
    const schema = await probeSupabaseCreditsSchema();
    if (schema.schemaReady && serverOwnedJobsReady) {
      return {
        writable: true,
        path: "supabase:credit_wallets",
        backend: "supabase",
        required,
        configured: true,
        schemaReady: true,
        schemaVersion: schema.schemaVersion,
        requiredVersion: schema.requiredVersion,
        missing: schema.missing,
      };
    }
    // Explicit/required Supabase is an accounting boundary: never report a
    // local file as a valid fallback.
    if (required) {
      return {
        writable: false,
        path: "supabase",
        backend: "none",
        required,
        configured: true,
        schemaReady: false,
        schemaVersion: schema.schemaVersion,
        requiredVersion: schema.requiredVersion,
        missing: schema.missing,
        warning:
          schema.warning ||
          "Supabase durable credits required but versioned schema/RPC probe failed",
      };
    }
    // Optional development mode may retain the single-node local adapter.
    const file = storePath();
    let localWritable = false;
    try {
      await fs.mkdir(path.dirname(file), { recursive: true });
      const probe = `${file}.probe`;
      await fs.writeFile(probe, String(Date.now()), "utf8");
      await fs.unlink(probe).catch(() => undefined);
      localWritable = true;
    } catch {
      localWritable = false;
    }
    return {
      writable: localWritable,
      path: localWritable ? file : "supabase",
      backend: localWritable ? "local-file" : "none",
      required,
      configured: true,
      schemaReady: schema.schemaReady,
      schemaVersion: schema.schemaVersion,
      requiredVersion: schema.requiredVersion,
      missing: schema.missing,
      warning:
        !serverOwnedJobsReady
          ? "Supabase schema is ready but mutations stay on local-file until server-owned jobs are implemented"
          : schema.warning ||
            "Supabase keys present; T5 SQL migration not applied — using local file fallback",
    };
  }

  const file = storePath();
  if (required) {
    return {
      writable: false,
      path: "supabase",
      backend: "none",
      required,
      configured: false,
      schemaReady: false,
      warning:
        "Supabase durable credits required but URL/service role is not configured",
    };
  }
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const probe = `${file}.probe`;
    await fs.writeFile(probe, String(Date.now()), "utf8");
    await fs.unlink(probe).catch(() => undefined);
    return {
      writable: true,
      path: file,
      backend: "local-file",
      required,
      configured: true,
      schemaReady: false,
    };
  } catch {
    return {
      writable: false,
      path: file,
      backend: required ? "none" : "local-file",
      required,
      configured: false,
      schemaReady: false,
      warning: required
        ? "REQUIRE_DURABLE_CREDITS=1 but store unwritable and Supabase unset"
        : "Local durable store unwritable",
    };
  }
}
