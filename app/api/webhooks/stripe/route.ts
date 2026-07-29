import { createHash } from "crypto";
import { NextResponse } from "next/server";
import {
  creditsForPlan,
  planFromPriceId,
  stripeLiveCheckoutAllowed,
  stripeSecretMode,
  verifyStripeSignature,
} from "@/lib/stripe";
import {
  applyStripeBillingEvent,
  stripeBillingFixtureEnabled,
} from "@/lib/stripeBilling";
import {
  billingMetadataMatches,
  normalizeStripeSubscriptionStatus,
  paidCheckoutIsValid,
  type NormalizedStripeBillingEvent,
  type StripeBillingEventType,
  type StripePaidPlan,
} from "@/lib/stripeBillingContract";

export const runtime = "nodejs";

type StripeRecord = Record<string, unknown>;

const SUPPORTED_EVENTS = new Set<StripeBillingEventType>([
  "checkout.session.completed",
  "invoice.paid",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

function object(value: unknown): StripeRecord {
  return value && typeof value === "object"
    ? (value as StripeRecord)
    : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringId(value: unknown): string | null {
  const direct = stringValue(value);
  if (direct) return direct;
  return stringValue(object(value).id);
}

function integer(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    Number.isSafeInteger(value)
    ? value
    : null;
}

function metadata(value: unknown): Record<string, string | undefined> {
  const source = object(value);
  return Object.fromEntries(
    Object.entries(source).filter(
      ([, candidate]) => typeof candidate === "string"
    )
  ) as Record<string, string | undefined>;
}

function billingMetadata(obj: StripeRecord): Record<string, string | undefined> {
  const direct = metadata(obj.metadata);
  const subscriptionDetails = metadata(
    object(obj.subscription_details).metadata
  );
  const parentDetails = metadata(
    object(object(obj.parent).subscription_details).metadata
  );
  return { ...parentDetails, ...subscriptionDetails, ...direct };
}

function firstPriceId(container: unknown): string | null {
  const data = object(container).data;
  if (!Array.isArray(data) || data.length === 0) return null;
  const row = object(data[0]);
  const legacy = stringId(row.price);
  if (legacy) return legacy;
  return stringValue(object(object(row.pricing).price_details).price);
}

function invoicePriceId(obj: StripeRecord): string | null {
  return firstPriceId(obj.lines);
}

function subscriptionPriceId(obj: StripeRecord): string | null {
  return firstPriceId(object(obj.items));
}

function subscriptionIdFromInvoice(obj: StripeRecord): string | null {
  return (
    stringId(obj.subscription) ||
    stringId(object(obj.subscription_details).subscription) ||
    stringId(object(object(obj.parent).subscription_details).subscription)
  );
}

function paidPlan(priceId: string | null): StripePaidPlan | null {
  const plan = planFromPriceId(priceId);
  return plan === "founding_studio" ? plan : null;
}

function validateOptionalMetadata(input: {
  values: Record<string, string | undefined>;
  userId: string | null;
  accountId: string | null;
  plan: StripePaidPlan;
  priceId: string;
}): boolean {
  const hasBinding =
    Boolean(input.values.pikbo_user_id) ||
    Boolean(input.values.pikbo_account_id) ||
    Boolean(input.values.plan) ||
    Boolean(input.values.pikbo_price_id);
  if (!hasBinding) return true;
  if (!input.userId || !input.accountId) return false;
  return billingMetadataMatches({
    metadata: input.values,
    expectedUserId: input.userId,
    expectedAccountId: input.accountId,
    expectedPlan: input.plan,
    expectedPriceId: input.priceId,
  });
}

function normalizeEvent(input: {
  eventId: string;
  eventType: StripeBillingEventType;
  eventCreated: number;
  livemode: boolean;
  payloadSha256: string;
  obj: StripeRecord;
}): NormalizedStripeBillingEvent {
  const base = {
    eventId: input.eventId,
    eventType: input.eventType,
    eventCreated: input.eventCreated,
    livemode: input.livemode,
    payloadSha256: input.payloadSha256,
  };
  const obj = input.obj;

  if (input.eventType === "checkout.session.completed") {
    if (
      !paidCheckoutIsValid({
        mode: obj.mode,
        status: obj.status,
        paymentStatus: obj.payment_status,
        amountTotal: obj.amount_total,
      })
    ) {
      throw new Error("PAID_CHECKOUT_REQUIRED");
    }
    const values = billingMetadata(obj);
    const userId = stringValue(values.pikbo_user_id);
    const accountId = stringValue(values.pikbo_account_id);
    const priceId = stringValue(values.pikbo_price_id);
    const plan = paidPlan(priceId);
    if (
      !userId ||
      !accountId ||
      !priceId ||
      !plan ||
      obj.client_reference_id !== userId ||
      !billingMetadataMatches({
        metadata: values,
        expectedUserId: userId,
        expectedAccountId: accountId,
        expectedPlan: plan,
        expectedPriceId: priceId,
      })
    ) {
      throw new Error("CHECKOUT_BINDING_INVALID");
    }
    const checkoutSessionId = stringId(obj.id);
    const customerId = stringId(obj.customer);
    const subscriptionId = stringId(obj.subscription);
    if (!checkoutSessionId || !customerId || !subscriptionId) {
      throw new Error("CHECKOUT_STRIPE_IDENTITY_INVALID");
    }
    const currency = stringValue(obj.currency)?.toLowerCase();
    if (currency !== "usd") throw new Error("BILLING_CURRENCY_INVALID");
    return {
      ...base,
      userId,
      accountId,
      checkoutSessionId,
      customerId,
      subscriptionId,
      priceId,
      plan,
      subscriptionStatus: "active",
      amountPaid: integer(obj.amount_total) ?? 0,
      currency,
      periodStart: integer(object(obj.subscription).current_period_start) ?? undefined,
      periodEnd: integer(object(obj.subscription).current_period_end) ?? undefined,
      cancelAtPeriodEnd: false,
    };
  }

  if (input.eventType === "invoice.paid") {
    const paid =
      obj.paid === true || stringValue(obj.status)?.toLowerCase() === "paid";
    const amountPaid = integer(obj.amount_paid);
    if (!paid || !amountPaid || amountPaid <= 0) {
      throw new Error("PAID_INVOICE_REQUIRED");
    }
    const invoiceId = stringId(obj.id);
    const customerId = stringId(obj.customer);
    const subscriptionId = subscriptionIdFromInvoice(obj);
    const priceId = invoicePriceId(obj);
    const plan = paidPlan(priceId);
    if (!invoiceId || !customerId || !subscriptionId || !priceId || !plan) {
      throw new Error("INVOICE_PRICE_OR_IDENTITY_INVALID");
    }
    const currency = stringValue(obj.currency)?.toLowerCase();
    if (currency !== "usd") throw new Error("BILLING_CURRENCY_INVALID");
    const values = billingMetadata(obj);
    const userId = stringValue(values.pikbo_user_id);
    const accountId = stringValue(values.pikbo_account_id);
    if (
      !validateOptionalMetadata({
        values,
        userId,
        accountId,
        plan,
        priceId,
      })
    ) {
      throw new Error("INVOICE_BINDING_INVALID");
    }
    const lines = object(obj.lines);
    const rows = Array.isArray(lines.data) ? lines.data : [];
    const first = object(rows[0]);
    const period = object(first.period);
    const billingReason = stringValue(obj.billing_reason);
    const grantsMonthlyAllotment =
      billingReason === "subscription_create" ||
      billingReason === "subscription_cycle";
    return {
      ...base,
      userId: userId ?? undefined,
      accountId: accountId ?? undefined,
      customerId,
      subscriptionId,
      invoiceId,
      priceId,
      plan,
      subscriptionStatus: "active",
      amountPaid,
      currency,
      periodStart:
        integer(period.start) ?? integer(obj.period_start) ?? undefined,
      periodEnd: integer(period.end) ?? integer(obj.period_end) ?? undefined,
      cancelAtPeriodEnd: false,
      grantCredits: grantsMonthlyAllotment ? creditsForPlan(plan) : 0,
    };
  }

  const subscriptionId = stringId(obj.id);
  const customerId = stringId(obj.customer);
  if (!subscriptionId) throw new Error("SUBSCRIPTION_ID_INVALID");
  const values = billingMetadata(obj);
  const userId = stringValue(values.pikbo_user_id);
  const accountId = stringValue(values.pikbo_account_id);
  const priceId = subscriptionPriceId(obj);
  const plan = priceId ? paidPlan(priceId) : null;
  if (priceId && !plan) throw new Error("UNKNOWN_SUBSCRIPTION_PRICE");
  if (
    priceId &&
    plan &&
    !validateOptionalMetadata({
      values,
      userId,
      accountId,
      plan,
      priceId,
    })
  ) {
    throw new Error("SUBSCRIPTION_BINDING_INVALID");
  }

  if (input.eventType === "customer.subscription.deleted") {
    return {
      ...base,
      userId: userId ?? undefined,
      accountId: accountId ?? undefined,
      customerId: customerId ?? undefined,
      subscriptionId,
      priceId: priceId ?? undefined,
      plan: plan ?? undefined,
      subscriptionStatus: "canceled",
      periodStart: integer(obj.current_period_start) ?? undefined,
      periodEnd: integer(obj.current_period_end) ?? undefined,
      cancelAtPeriodEnd: true,
    };
  }

  const status = normalizeStripeSubscriptionStatus(obj.status);
  if (!status) throw new Error("SUBSCRIPTION_STATUS_INVALID");
  if ((status === "active" || status === "trialing") && (!priceId || !plan)) {
    throw new Error("ACTIVE_SUBSCRIPTION_PRICE_REQUIRED");
  }
  return {
    ...base,
    userId: userId ?? undefined,
    accountId: accountId ?? undefined,
    customerId: customerId ?? undefined,
    subscriptionId,
    priceId: priceId ?? undefined,
    plan: plan ?? undefined,
    subscriptionStatus: status,
    periodStart: integer(obj.current_period_start) ?? undefined,
    periodEnd: integer(obj.current_period_end) ?? undefined,
    cancelAtPeriodEnd: obj.cancel_at_period_end === true,
  };
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  if (rawBody.length === 0 || rawBody.length > 1_000_000) {
    return NextResponse.json(
      { error: "Invalid webhook body" },
      { status: 413 }
    );
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  const explicitFixture =
    stripeBillingFixtureEnabled() &&
    req.headers.get("x-pikbo-stripe-fixture") === "1";
  if (
    !explicitFixture &&
    (!secret ||
      !verifyStripeSignature(
        rawBody,
        req.headers.get("stripe-signature"),
        secret
      ))
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: StripeRecord;
  try {
    event = JSON.parse(rawBody) as StripeRecord;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const eventId = stringId(event.id);
  const eventType = stringValue(event.type) as StripeBillingEventType | null;
  const eventCreated = integer(event.created);
  const livemode = event.livemode === true;
  if (!eventId?.startsWith("evt_") || !eventCreated) {
    return NextResponse.json(
      { error: "Invalid Stripe event envelope" },
      { status: 400 }
    );
  }
  if (!eventType || !SUPPORTED_EVENTS.has(eventType)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const secretMode = stripeSecretMode();
  if (
    !explicitFixture &&
    ((secretMode === "test" && livemode) ||
      (secretMode === "live" && !livemode) ||
      secretMode === "missing" ||
      secretMode === "unknown" ||
      (secretMode === "live" && !stripeLiveCheckoutAllowed()))
  ) {
    return NextResponse.json(
      { error: "Stripe mode is not authorized" },
      { status: 403 }
    );
  }

  try {
    const normalized = normalizeEvent({
      eventId,
      eventType,
      eventCreated,
      livemode,
      payloadSha256: createHash("sha256").update(rawBody).digest("hex"),
      obj: object(object(event.data).object),
    });
    if (
      normalized.currency &&
      normalized.currency.toLowerCase() !== "usd"
    ) {
      throw new Error("BILLING_CURRENCY_INVALID");
    }
    const applied = await applyStripeBillingEvent(normalized);
    return NextResponse.json({
      received: true,
      idempotent: applied.idempotent,
      stale: applied.stale,
      grantedCredits: applied.grantedCredits,
      backend: applied.backend,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("stripe webhook rejected:", eventType, message.split(":")[0]);
    const unavailable = /STORE_UNAVAILABLE|RPC_FAILED|RPC_REJECTED/.test(
      message
    );
    return NextResponse.json(
      {
        error: unavailable
          ? "Billing store unavailable"
          : "Stripe event rejected",
        code: unavailable
          ? "BILLING_STORE_UNAVAILABLE"
          : "STRIPE_EVENT_REJECTED",
      },
      { status: unavailable ? 503 : 400 }
    );
  }
}
