import { promises as fs } from "fs";
import path from "path";
import type { PlanId } from "@/lib/pricing";

/**
 * Durable plan state keyed by Pikbo session id.
 * Cookie sessions alone cannot be updated by Stripe webhooks (no browser).
 * This store is the source of truth for paid plan after checkout / renew / cancel.
 *
 * This legacy JSON store is now an explicit non-production fixture only.
 * Real Stripe state is written transactionally to Supabase by stripeBilling.
 */

export type Entitlement = {
  sessionId: string;
  plan: PlanId;
  credits?: number;
  /** When this differs from cookie periodKey, cookie credits are reset from `credits`. */
  periodKey?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  /** Last processed Stripe invoice id — webhook idempotency for invoice.paid */
  lastInvoiceId?: string;
  /** Last confirmed Checkout Session id — confirm route idempotency */
  lastCheckoutSessionId?: string;
  status: "active" | "canceled" | "past_due";
  updatedAt: string;
};

type Store = Record<string, Entitlement>;

export function entitlementFixtureEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.STRIPE_BILLING_FIXTURE_MODE === "1"
  );
}

function storePath(): string {
  if (process.env.ENTITLEMENTS_PATH) return process.env.ENTITLEMENTS_PATH;
  // Statically scoped under ./data so bundlers don't NFT the whole project
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "entitlements.json"
  );
}

async function readStore(): Promise<Store> {
  if (!entitlementFixtureEnabled()) return {};
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

async function writeStore(store: Store): Promise<void> {
  if (!entitlementFixtureEnabled()) {
    throw new Error(
      "LEGACY_ENTITLEMENT_STORE_DISABLED: use Supabase Stripe billing RPCs"
    );
  }
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(store, null, 2), "utf8");
}

export async function getEntitlement(
  sessionId: string
): Promise<Entitlement | null> {
  const store = await readStore();
  return store[sessionId] ?? null;
}

export async function upsertEntitlement(
  entry: Entitlement
): Promise<Entitlement> {
  const store = await readStore();
  const next: Entitlement = {
    ...store[entry.sessionId],
    ...entry,
    updatedAt: new Date().toISOString(),
  };
  store[entry.sessionId] = next;
  await writeStore(store);
  return next;
}

export async function findByStripeCustomer(
  customerId: string
): Promise<Entitlement | null> {
  const store = await readStore();
  return (
    Object.values(store).find((e) => e.stripeCustomerId === customerId) ?? null
  );
}

export async function findBySubscription(
  subscriptionId: string
): Promise<Entitlement | null> {
  const store = await readStore();
  return (
    Object.values(store).find(
      (e) => e.stripeSubscriptionId === subscriptionId
    ) ?? null
  );
}

/**
 * Ops probe: can this process persist entitlements?
 * On Vercel serverless the default `data/` path is ephemeral / often unwritable —
 * soft-live free is OK; real paid needs ENTITLEMENTS_PATH → durable store (R1).
 */
export async function probeEntitlementsStore(): Promise<{
  writable: boolean;
  path: string;
  backend: "file";
  warning?: string;
}> {
  const file = storePath();
  if (!entitlementFixtureEnabled()) {
    return {
      writable: false,
      path: file,
      backend: "file",
      warning:
        "Legacy JSON entitlements are disabled. Real billing requires the Supabase Stripe billing migration; set STRIPE_BILLING_FIXTURE_MODE=1 only for an explicit local fixture.",
    };
  }
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const probe = `${file}.probe`;
    await fs.writeFile(probe, String(Date.now()), "utf8");
    await fs.unlink(probe).catch(() => undefined);
    return { writable: true, path: file, backend: "file" };
  } catch {
    return {
      writable: false,
      path: file,
      backend: "file",
      warning:
        "Entitlements file not writable — Stripe webhooks will not stick across instances. Set ENTITLEMENTS_PATH to durable storage before real charges.",
    };
  }
}
