import { createHmac, timingSafeEqual } from "crypto";
import { getPlan, type PlanId } from "@/lib/pricing";

export function stripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_FOUNDING_STUDIO
  );
}

/**
 * Phase I — payment readiness (presence only; never echoes secrets).
 * Soft launch keeps public pay off. Live secret keys require explicit launch
 * approval plus the separately implemented/rehearsed refund-dispute guard.
 */
export type PaymentsReadiness = {
  /** UI may show buy buttons */
  clientEnabled: boolean;
  /** Server will start Checkout sessions when keys+prices ok */
  serverCheckoutAllowed: boolean;
  secretPresent: boolean;
  secretMode: "missing" | "test" | "live" | "unknown";
  webhookSecretPresent: boolean;
  billingRpcOperatorReady: boolean;
  priceFoundingStudioPresent: boolean;
  refundDisputeGuardReady: boolean;
  liveKeysBlocked: boolean;
  readyForTestCheckout: boolean;
  notes: string[];
};

export function paymentsClientEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "1" ||
    process.env.PAYMENTS_ENABLED === "1"
  );
}

export function stripeSecretMode(
  key = process.env.STRIPE_SECRET_KEY || ""
): PaymentsReadiness["secretMode"] {
  if (!key) return "missing";
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  return "unknown";
}

/**
 * Live Checkout remains hard-closed until refund/dispute credit revocation is
 * implemented and rehearsed. Test Checkout does not need this production gate.
 */
export function stripeLiveCheckoutAllowed(): boolean {
  return (
    process.env.PAYMENTS_LIVE === "1" &&
    process.env.STRIPE_REFUND_DISPUTE_GUARD_READY === "1"
  );
}

export function paymentsReadiness(): PaymentsReadiness {
  const clientEnabled = paymentsClientEnabled();
  const secretPresent = Boolean(process.env.STRIPE_SECRET_KEY);
  const secretMode = stripeSecretMode();
  const webhookSecretPresent = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const billingRpcOperatorReady =
    process.env.STRIPE_BILLING_RPC_READY === "1";
  const priceFoundingStudioPresent = Boolean(
    process.env.STRIPE_PRICE_FOUNDING_STUDIO
  );
  const refundDisputeGuardReady =
    process.env.STRIPE_REFUND_DISPUTE_GUARD_READY === "1";
  const liveAllowed = stripeLiveCheckoutAllowed();
  const liveKeysBlocked = secretMode === "live" && !liveAllowed;
  const notes: string[] = [];
  if (!clientEnabled) {
    notes.push("NEXT_PUBLIC_PAYMENTS_ENABLED is not 1 — Coming soon UI");
  }
  if (liveKeysBlocked) {
    notes.push(
      "sk_live Checkout blocked until PAYMENTS_LIVE=1 and refund/dispute guard is rehearsed"
    );
  }
  if (!refundDisputeGuardReady) {
    notes.push(
      "refund/dispute credit handling is not ready — live Checkout remains closed"
    );
  }
  if (secretMode === "test") {
    notes.push("test secret present — private preview only");
  }
  if (!webhookSecretPresent) {
    notes.push("webhook secret missing — Checkout stays closed");
  }
  if (!billingRpcOperatorReady) {
    notes.push(
      "STRIPE_BILLING_RPC_READY is not 1 — transactional billing stays closed"
    );
  }
  const readyForTestCheckout =
    clientEnabled &&
    secretMode === "test" &&
    !liveKeysBlocked &&
    webhookSecretPresent &&
    billingRpcOperatorReady &&
    priceFoundingStudioPresent;
  const serverCheckoutAllowed =
    clientEnabled &&
    (secretMode === "test" || (secretMode === "live" && liveAllowed)) &&
    !liveKeysBlocked &&
    webhookSecretPresent &&
    billingRpcOperatorReady &&
    priceFoundingStudioPresent;

  return {
    clientEnabled,
    serverCheckoutAllowed,
    secretPresent,
    secretMode,
    webhookSecretPresent,
    billingRpcOperatorReady,
    priceFoundingStudioPresent,
    refundDisputeGuardReady,
    liveKeysBlocked,
    readyForTestCheckout,
    notes,
  };
}

export function planFromPriceId(
  priceId: string | undefined | null
): PlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_FOUNDING_STUDIO) {
    return "founding_studio";
  }
  return null;
}

/**
 * Checkout return URLs come only from an operator-controlled canonical URL.
 * Request Origin/Host are never trusted for a payment redirect.
 */
export function trustedCheckoutOrigin(
  configuredUrl: string | undefined,
  fallbackUrl: string
): string {
  const candidates = [configuredUrl, fallbackUrl].filter(
    (candidate): candidate is string => Boolean(candidate?.trim())
  );
  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      const localHttp =
        process.env.NODE_ENV !== "production" &&
        parsed.protocol === "http:" &&
        (parsed.hostname === "localhost" ||
          parsed.hostname === "127.0.0.1" ||
          parsed.hostname === "::1");
      if (parsed.protocol !== "https:" && !localHttp) continue;
      return parsed.origin;
    } catch {
      // Try the next operator-controlled candidate.
    }
  }
  throw new Error("TRUSTED_CHECKOUT_ORIGIN_INVALID");
}

export async function stripeGet(
  apiPath: string
): Promise<Record<string, unknown>> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY missing");
  const res = await fetch(`https://api.stripe.com/v1${apiPath}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = data.error as { message?: string } | undefined;
    throw new Error(err?.message || `Stripe GET ${apiPath} failed`);
  }
  return data;
}

/** Verify Stripe webhook signature (t + v1 HMAC). */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "t" && !timestamp) timestamp = value;
    if (key === "v1" && value) signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return false;
  }

  const signed = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  for (const signature of signatures) {
    try {
      const candidate = Buffer.from(signature, "utf8");
      if (
        expectedBuffer.length === candidate.length &&
        timingSafeEqual(expectedBuffer, candidate)
      ) {
        return true;
      }
    } catch {
      // Keep checking rotated v1 signatures.
    }
  }
  return false;
}

export function creditsForPlan(planId: PlanId): number {
  return getPlan(planId).credits;
}
