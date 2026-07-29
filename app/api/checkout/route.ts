import { NextResponse } from "next/server";
import {
  entitlementFixtureEnabled,
  upsertEntitlement,
} from "@/lib/entitlements";
import {
  supabaseEnsurePersonalAccount,
  supabasePaidDeliveryEligible,
} from "@/lib/durableCredits/supabaseStore";
import {
  getPlan,
  PAID_PLAN_ID,
  type PlanId,
} from "@/lib/pricing";
import { takeToken } from "@/lib/rateLimit";
import { clientIp } from "@/lib/requestMeta";
import {
  currentPeriodKey,
  ensureSession,
  publicSession,
  saveSession,
  setPlan,
} from "@/lib/session";
import { site } from "@/lib/site";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import {
  creditsForPlan,
  paymentsClientEnabled,
  paymentsReadiness,
  stripeGet,
  stripeLiveCheckoutAllowed,
  stripeSecretMode,
  trustedCheckoutOrigin,
} from "@/lib/stripe";
import { foundingStudioPriceContractIsValid } from "@/lib/stripeBillingContract";
import {
  getStripeBillingSnapshot,
  probeStripeBillingStore,
  stripeBillingRpcEnabled,
} from "@/lib/stripeBilling";

export const runtime = "nodejs";

/**
 * Start the single Founding Studio Stripe Checkout session.
 * Soft launch: requires NEXT_PUBLIC_PAYMENTS_ENABLED=1 (or PAYMENTS_ENABLED=1).
 * Live secrets require both production approval and the rehearsed
 * refund/dispute guard. Dev upgrade remains non-production fixture-only.
 */
export async function POST(req: Request) {
  let body: { plan?: string; dev?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // empty body ok
  }

  const requestedPlan = body.plan || PAID_PLAN_ID;
  if (requestedPlan === "free") {
    return NextResponse.json(
      { error: "Free plan does not require checkout" },
      { status: 400 }
    );
  }
  if (requestedPlan !== PAID_PLAN_ID) {
    return NextResponse.json(
      {
        error: "Only Founding Studio is available",
        code: "UNKNOWN_PAID_PLAN",
      },
      { status: 400 }
    );
  }
  const planId: PlanId = PAID_PLAN_ID;
  const plan = getPlan(planId);
  if (plan.id === "free") {
    return NextResponse.json({ error: "Unknown paid plan" }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceEnv = plan.stripePriceEnv;
  const priceId = priceEnv ? process.env[priceEnv] : undefined;
  const readiness = paymentsReadiness();
  const secretMode = stripeSecretMode(stripeKey);

  // Phase I: never open Checkout when client flag is off (Coming soon).
  if (!paymentsClientEnabled() && stripeKey && priceId) {
    return NextResponse.json(
      {
        error:
          "Paid checkout is not open. Enable it only on the approved private billing Preview after the database rehearsal.",
        code: "PAYMENTS_DISABLED",
        payments: readiness,
      },
      { status: 403 }
    );
  }

  // Never charge with live keys without explicit PAYMENTS_LIVE=1.
  if (secretMode === "live" && !stripeLiveCheckoutAllowed()) {
    return NextResponse.json(
      {
        error:
          "Live Stripe keys are blocked until the refund/dispute guard and every production billing gate pass.",
        code: "LIVE_KEYS_BLOCKED",
        payments: readiness,
      },
      { status: 403 }
    );
  }
  if (secretMode === "unknown") {
    return NextResponse.json(
      {
        error: "Stripe secret mode is not recognized.",
        code: "STRIPE_KEY_INVALID",
      },
      { status: 503 }
    );
  }

  // --- Stripe path ---
  if (stripeKey && priceId && paymentsClientEnabled()) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        {
          error: "Stripe webhook verification is not configured.",
          code: "WEBHOOK_NOT_READY",
        },
        { status: 503 }
      );
    }
    const auth = await getAuthUserFromRequest(req);
    if (!auth) {
      return NextResponse.json(
        {
          error: "Sign in before starting a paid subscription.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }
    if (!stripeBillingRpcEnabled()) {
      return NextResponse.json(
        {
          error:
            "Billing ledger is not ready. Checkout remains closed until the non-production database rehearsal passes.",
          code: "BILLING_STORE_NOT_READY",
        },
        { status: 503 }
      );
    }
    const billingStore = await probeStripeBillingStore();
    if (
      billingStore.backend !== "supabase" ||
      !billingStore.schemaReady ||
      !billingStore.operatorReady
    ) {
      return NextResponse.json(
        {
          error: "Transactional billing storage is unavailable.",
          code: "BILLING_STORE_NOT_READY",
        },
        { status: 503 }
      );
    }

    const ensured = await supabaseEnsurePersonalAccount(auth.id, 10);
    if (!ensured.ok) {
      return NextResponse.json(
        {
          error: "Could not bind checkout to your billing account.",
          code: "BILLING_ACCOUNT_UNAVAILABLE",
        },
        { status: 503 }
      );
    }
    const accountId = ensured.data.account.id;
    if (!(await supabasePaidDeliveryEligible(accountId, auth.id))) {
      return NextResponse.json(
        {
          error:
            "This account is not yet admitted to the private paid delivery cohort.",
          code: "PAID_DELIVERY_NOT_READY",
        },
        { status: 403 }
      );
    }
    try {
      const stripePrice = await stripeGet(
        `/prices/${encodeURIComponent(priceId)}`
      );
      if (!foundingStudioPriceContractIsValid(stripePrice, priceId)) {
        return NextResponse.json(
          {
            error:
              "Founding Studio Price must be active USD $49 recurring monthly.",
            code: "PRICE_CONTRACT_INVALID",
          },
          { status: 503 }
        );
      }
    } catch {
      return NextResponse.json(
        {
          error: "Could not verify the Founding Studio Price contract.",
          code: "PRICE_CONTRACT_UNAVAILABLE",
        },
        { status: 503 }
      );
    }
    try {
      const existing = await getStripeBillingSnapshot({
        accountId,
        userId: auth.id,
      });
      if (
        existing?.subscription &&
        [
          "trialing",
          "active",
          "past_due",
          "unpaid",
          "incomplete",
          "paused",
        ].includes(existing.subscription.status)
      ) {
        return NextResponse.json(
          {
            error: "This account already has a Founding Studio subscription",
            code: "SUBSCRIPTION_ALREADY_EXISTS",
          },
          { status: 409 }
        );
      }
    } catch {
      return NextResponse.json(
        {
          error: "Could not verify existing subscriptions",
          code: "BILLING_STORE_NOT_READY",
        },
        { status: 503 }
      );
    }
    const rl = takeToken(`checkout:${auth.id}:${clientIp(req)}`, 10, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        {
          error: `Too many checkout attempts — try again in ${rl.retryAfterSec}s`,
          code: "RATE_LIMITED",
          retryAfterSec: rl.retryAfterSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        }
      );
    }

    try {
      const origin = trustedCheckoutOrigin(
        process.env.NEXT_PUBLIC_SITE_URL,
        site.url
      );

      const params = new URLSearchParams();
      params.set("mode", "subscription");
      params.set(
        "success_url",
        `${origin}/create?checkout=return&session_id={CHECKOUT_SESSION_ID}`
      );
      params.set("cancel_url", `${origin}/pricing?canceled=1`);
      params.set("client_reference_id", auth.id);
      params.set("metadata[pikbo_user_id]", auth.id);
      params.set("metadata[pikbo_account_id]", accountId);
      params.set("metadata[plan]", plan.id);
      params.set("metadata[pikbo_price_id]", priceId);
      params.set("subscription_data[metadata][pikbo_user_id]", auth.id);
      params.set(
        "subscription_data[metadata][pikbo_account_id]",
        accountId
      );
      params.set("subscription_data[metadata][plan]", plan.id);
      params.set("subscription_data[metadata][pikbo_price_id]", priceId);
      params.set("line_items[0][price]", priceId);
      params.set("line_items[0][quantity]", "1");
      if (auth.email) params.set("customer_email", auth.email);

      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          // Concurrent clicks for the same account/month must resolve to the
          // same Stripe Checkout session. A random key can create two paid
          // subscriptions before either webhook reaches our unique DB guard.
          "Idempotency-Key":
            `pikbo-checkout-${accountId}-${plan.id}-${currentPeriodKey()}`,
        },
        body: params.toString(),
      });

      const data = (await res.json()) as {
        id?: string;
        url?: string;
        error?: { message?: string };
      };
      if (!res.ok || !data.url) {
        return NextResponse.json(
          { error: data.error?.message || "Stripe checkout failed" },
          { status: 502 }
        );
      }
      return NextResponse.json({ url: data.url, provider: "stripe" });
    } catch (err) {
      console.error("checkout error:", err);
      return NextResponse.json(
        { error: "Could not start checkout" },
        { status: 500 }
      );
    }
  }

  // --- Dev / demo upgrade (no Stripe keys) ---
  // Explicit local fixture only. It can never be enabled in production.
  const allowDev =
    process.env.ALLOW_DEV_UPGRADE === "1" &&
    entitlementFixtureEnabled() &&
    process.env.NODE_ENV !== "production" &&
    body.dev === true;

  if (allowDev) {
    const session = await ensureSession();
    const upgraded = setPlan(session, plan.id, { resetCredits: true });
    await saveSession(upgraded);
    await upsertEntitlement({
      sessionId: upgraded.id,
      plan: plan.id,
      credits: creditsForPlan(plan.id),
      periodKey: currentPeriodKey(),
      status: "active",
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({
      url: `/create?upgraded=1&plan=${plan.id}`,
      provider: "dev",
      session: publicSession(upgraded),
      message:
        "Local fixture upgrade applied. It is not a payment or a valid launch order.",
    });
  }

  return NextResponse.json(
    {
      error:
        "Payments not configured. Private test billing requires the single Founding Studio Price and durable billing RPC.",
      code: "STRIPE_NOT_CONFIGURED",
    },
    { status: 503 }
  );
}
