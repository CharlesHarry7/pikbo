import { NextResponse } from "next/server";
import { supabaseEnsurePersonalAccount } from "@/lib/durableCredits/supabaseStore";
import { takeToken } from "@/lib/rateLimit";
import { clientIp } from "@/lib/requestMeta";
import {
  planFromPriceId,
  stripeGet,
  stripeSecretMode,
} from "@/lib/stripe";
import {
  billingMetadataMatches,
  paidCheckoutIsValid,
  type StripePaidPlan,
} from "@/lib/stripeBillingContract";
import {
  getStripeBillingSnapshot,
  probeStripeBillingStore,
  stripeBillingRpcEnabled,
} from "@/lib/stripeBilling";
import { getAuthUserFromRequest } from "@/lib/supabase/user";

export const runtime = "nodejs";

type StripeRecord = Record<string, unknown>;

function object(value: unknown): StripeRecord {
  return value && typeof value === "object"
    ? (value as StripeRecord)
    : {};
}

function stringId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  const id = object(value).id;
  return typeof id === "string" && id.trim() ? id : null;
}

function lineItemPriceId(session: StripeRecord): string | null {
  const lineItems = object(session.line_items);
  const data = Array.isArray(lineItems.data) ? lineItems.data : [];
  if (data.length !== 1) return null;
  const item = object(data[0]);
  if (Number(item.quantity) !== 1) return null;
  return stringId(item.price);
}

/**
 * The browser return is verification-only. It cannot mint an entitlement or
 * reset credits. A signed Stripe webhook must have already committed the
 * subscription and invoice grant in Postgres.
 */
export async function POST(req: Request) {
  let body: { session_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const checkoutId = body.session_id?.trim();
  if (!checkoutId || !checkoutId.startsWith("cs_")) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const secretMode = stripeSecretMode();
  if (secretMode === "missing" || secretMode === "unknown") {
    return NextResponse.json(
      { error: "Stripe test billing is not configured" },
      { status: 503 }
    );
  }
  if (secretMode === "live" && process.env.PAYMENTS_LIVE !== "1") {
    return NextResponse.json(
      { error: "Live Stripe billing is blocked", code: "LIVE_KEYS_BLOCKED" },
      { status: 403 }
    );
  }
  if (!stripeBillingRpcEnabled()) {
    return NextResponse.json(
      {
        error: "Billing ledger is not ready",
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
        error: "Transactional billing storage is unavailable",
        code: "BILLING_STORE_NOT_READY",
      },
      { status: 503 }
    );
  }

  const auth = await getAuthUserFromRequest(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Valid sign-in required", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }
  const rl = takeToken(`confirm:${auth.id}:${clientIp(req)}`, 12, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: `Too many confirm attempts — try again in ${rl.retryAfterSec}s`,
        code: "RATE_LIMITED",
        retryAfterSec: rl.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  const ensured = await supabaseEnsurePersonalAccount(auth.id, 10);
  if (!ensured.ok) {
    return NextResponse.json(
      {
        error: "Billing account unavailable",
        code: "BILLING_ACCOUNT_UNAVAILABLE",
      },
      { status: 503 }
    );
  }
  const accountId = ensured.data.account.id;

  try {
    const cs = await stripeGet(
      `/checkout/sessions/${encodeURIComponent(checkoutId)}?expand[]=line_items&expand[]=subscription`
    );
    if (cs.id !== checkoutId) {
      return NextResponse.json(
        { error: "Checkout identity mismatch" },
        { status: 409 }
      );
    }
    if (
      !paidCheckoutIsValid({
        mode: cs.mode,
        status: cs.status,
        paymentStatus: cs.payment_status,
        amountTotal: cs.amount_total,
      })
    ) {
      return NextResponse.json(
        {
          error: "A paid, non-zero completed subscription is required",
          code: "PAID_CHECKOUT_REQUIRED",
        },
        { status: 402 }
      );
    }
    if (String(cs.currency || "").toLowerCase() !== "usd") {
      return NextResponse.json(
        { error: "Unexpected checkout currency" },
        { status: 409 }
      );
    }
    if (
      (secretMode === "test" && cs.livemode !== false) ||
      (secretMode === "live" && cs.livemode !== true)
    ) {
      return NextResponse.json(
        { error: "Stripe mode mismatch", code: "STRIPE_MODE_MISMATCH" },
        { status: 409 }
      );
    }

    const priceId = lineItemPriceId(cs);
    const plan = planFromPriceId(priceId) as StripePaidPlan | null;
    if (!priceId || !plan) {
      return NextResponse.json(
        { error: "Checkout price is not recognized", code: "UNKNOWN_PRICE" },
        { status: 409 }
      );
    }
    const metadata = object(cs.metadata) as Record<
      string,
      string | undefined
    >;
    if (
      cs.client_reference_id !== auth.id ||
      !billingMetadataMatches({
        metadata,
        expectedUserId: auth.id,
        expectedAccountId: accountId,
        expectedPlan: plan,
        expectedPriceId: priceId,
      })
    ) {
      return NextResponse.json(
        {
          error: "Checkout is not bound to this signed-in account",
          code: "CHECKOUT_BINDING_MISMATCH",
        },
        { status: 403 }
      );
    }

    const customerId = stringId(cs.customer);
    const subscriptionId = stringId(cs.subscription);
    if (!customerId || !subscriptionId) {
      return NextResponse.json(
        { error: "Stripe subscription identity is incomplete" },
        { status: 409 }
      );
    }

    const snapshot = await getStripeBillingSnapshot({
      accountId,
      userId: auth.id,
    });
    const subscription = snapshot?.subscription;
    const webhookCommitted =
      snapshot &&
      subscription &&
      subscription.status === "active" &&
      subscription.checkoutSessionId === checkoutId &&
      subscription.customerId === customerId &&
      subscription.subscriptionId === subscriptionId &&
      subscription.priceId === priceId &&
      subscription.plan === plan &&
      Boolean(subscription.lastPaidInvoiceId);

    if (!webhookCommitted) {
      return NextResponse.json(
        {
          ok: false,
          pending: true,
          code: "WEBHOOK_PENDING",
          message:
            "Payment is verified. Subscription activation is waiting for the signed webhook.",
        },
        { status: 202 }
      );
    }

    return NextResponse.json({
      ok: true,
      plan,
      credits: snapshot.availableCredits,
      subscription: {
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      authority: "stripe-webhook-supabase",
    });
  } catch (err) {
    console.error("checkout confirm error:", err);
    return NextResponse.json(
      {
        error: "Could not verify checkout",
        code: "CHECKOUT_VERIFY_FAILED",
      },
      { status: 502 }
    );
  }
}
