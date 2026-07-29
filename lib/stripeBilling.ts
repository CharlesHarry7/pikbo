import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  applyBillingEventFixture,
  emptyBillingFixtureState,
  type BillingFixtureState,
  type NormalizedStripeBillingEvent,
} from "@/lib/stripeBillingContract";

type BillingApplyResult = {
  ok: true;
  backend: "supabase" | "explicit-test-fixture";
  idempotent: boolean;
  stale: boolean;
  grantedCredits: number;
};

export type StripeBillingSnapshot = {
  accountId: string;
  userId: string;
  availableCredits: number;
  reservedCredits: number;
  plan: "free" | "founding_studio";
  subscription: null | {
    customerId: string | null;
    subscriptionId: string | null;
    checkoutSessionId: string | null;
    priceId: string | null;
    plan: "founding_studio";
    status:
      | "trialing"
      | "active"
      | "past_due"
      | "canceled"
      | "unpaid"
      | "incomplete"
      | "paused";
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    lastPaidInvoiceId: string | null;
  };
};

type FixtureGlobal = typeof globalThis & {
  __pikboStripeBillingFixtureState?: BillingFixtureState;
};

function fixtureState(): BillingFixtureState {
  const target = globalThis as FixtureGlobal;
  target.__pikboStripeBillingFixtureState ??= emptyBillingFixtureState();
  return target.__pikboStripeBillingFixtureState;
}

export function stripeBillingFixtureEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.STRIPE_BILLING_FIXTURE_MODE === "1"
  );
}

export function stripeBillingRpcEnabled(): boolean {
  return process.env.STRIPE_BILLING_RPC_READY === "1";
}

export async function applyStripeBillingEvent(
  event: NormalizedStripeBillingEvent
): Promise<BillingApplyResult> {
  const admin = getSupabaseAdmin();
  if (admin && stripeBillingRpcEnabled()) {
    const { data, error } = await admin.rpc(
      "pikbo_apply_stripe_billing_event_v1",
      {
        p_event_id: event.eventId,
        p_event_type: event.eventType,
        p_payload_sha256: event.payloadSha256,
        p_event_created: event.eventCreated,
        p_livemode: event.livemode,
        p_user_id: event.userId ?? null,
        p_account_id: event.accountId ?? null,
        p_checkout_session_id: event.checkoutSessionId ?? null,
        p_customer_id: event.customerId ?? null,
        p_subscription_id: event.subscriptionId ?? null,
        p_invoice_id: event.invoiceId ?? null,
        p_price_id: event.priceId ?? null,
        p_plan_id: event.plan ?? null,
        p_subscription_status: event.subscriptionStatus ?? null,
        p_amount_paid: event.amountPaid ?? null,
        p_currency: event.currency ?? null,
        p_period_start: event.periodStart ?? null,
        p_period_end: event.periodEnd ?? null,
        p_cancel_at_period_end: event.cancelAtPeriodEnd ?? null,
        p_grant_credits: event.grantCredits ?? 0,
      }
    );
    if (error) {
      throw new Error(`STRIPE_BILLING_RPC_FAILED:${error.message}`);
    }
    const result = (data ?? {}) as Record<string, unknown>;
    if (result.ok !== true) {
      throw new Error(
        typeof result.code === "string"
          ? result.code
          : "STRIPE_BILLING_RPC_REJECTED"
      );
    }
    return {
      ok: true,
      backend: "supabase",
      idempotent: result.idempotent === true,
      stale: result.stale === true,
      grantedCredits:
        typeof result.grantedCredits === "number"
          ? result.grantedCredits
          : 0,
    };
  }

  if (stripeBillingFixtureEnabled()) {
    const target = globalThis as FixtureGlobal;
    const applied = applyBillingEventFixture(fixtureState(), event);
    target.__pikboStripeBillingFixtureState = applied.state;
    return {
      ok: true,
      backend: "explicit-test-fixture",
      idempotent: applied.idempotent,
      stale: applied.stale,
      grantedCredits: applied.grantedCredits,
    };
  }

  throw new Error(
    "STRIPE_BILLING_STORE_UNAVAILABLE: apply migration and set STRIPE_BILLING_RPC_READY=1"
  );
}

export async function getStripeBillingSnapshot(input: {
  accountId: string;
  userId: string;
}): Promise<StripeBillingSnapshot | null> {
  const admin = getSupabaseAdmin();
  if (admin && stripeBillingRpcEnabled()) {
    const { data, error } = await admin.rpc(
      "pikbo_get_stripe_billing_snapshot_v1",
      {
        p_account_id: input.accountId,
        p_user_id: input.userId,
      }
    );
    if (error) {
      throw new Error(`STRIPE_BILLING_SNAPSHOT_FAILED:${error.message}`);
    }
    const result = (data ?? {}) as Record<string, unknown>;
    if (result.ok !== true) return null;
    return {
      accountId: String(result.accountId),
      userId: String(result.userId),
      availableCredits: Number(result.availableCredits) || 0,
      reservedCredits: Number(result.reservedCredits) || 0,
      plan: result.plan === "founding_studio" ? result.plan : "free",
      subscription: result.subscription
        ? (result.subscription as StripeBillingSnapshot["subscription"])
        : null,
    };
  }

  if (!stripeBillingFixtureEnabled()) return null;
  const state = fixtureState();
  const subscriptions = Object.values(state.subscriptions)
    .filter(
      (candidate) =>
        candidate.accountId === input.accountId &&
        candidate.userId === input.userId
    )
    .sort((left, right) => {
      const open = new Set([
        "trialing",
        "active",
        "past_due",
        "unpaid",
        "incomplete",
        "paused",
      ]);
      const openDelta =
        Number(open.has(right.status)) - Number(open.has(left.status));
      if (openDelta !== 0) return openDelta;
      if (left.lastOrder.created !== right.lastOrder.created) {
        return right.lastOrder.created - left.lastOrder.created;
      }
      return right.lastOrder.eventId.localeCompare(left.lastOrder.eventId);
    });
  const subscription = subscriptions[0] ?? null;
  return {
    accountId: input.accountId,
    userId: input.userId,
    availableCredits: state.walletCredits[input.accountId] ?? 0,
    reservedCredits: 0,
    plan: state.accountPlans[input.accountId] ?? "free",
    subscription: subscription
      ? {
          customerId: subscription.customerId,
          subscriptionId: subscription.subscriptionId,
          checkoutSessionId: subscription.checkoutSessionId ?? null,
          priceId: subscription.priceId,
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart
            ? new Date(subscription.currentPeriodStart * 1000).toISOString()
            : null,
          currentPeriodEnd: subscription.currentPeriodEnd
            ? new Date(subscription.currentPeriodEnd * 1000).toISOString()
            : null,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          lastPaidInvoiceId: subscription.lastPaidInvoiceId ?? null,
        }
      : null,
  };
}

export async function probeStripeBillingStore(): Promise<{
  configured: boolean;
  schemaReady: boolean;
  operatorReady: boolean;
  backend: "supabase" | "explicit-test-fixture" | "disabled";
  warning?: string;
}> {
  if (stripeBillingFixtureEnabled()) {
    return {
      configured: true,
      schemaReady: true,
      operatorReady: true,
      backend: "explicit-test-fixture",
      warning: "Process-local fixture; forbidden in production.",
    };
  }
  const operatorReady = stripeBillingRpcEnabled();
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      configured: false,
      schemaReady: false,
      operatorReady,
      backend: "disabled",
      warning: "Supabase service role unavailable.",
    };
  }
  const { error } = await admin
    .from("stripe_events")
    .select("event_id,event_created")
    .limit(1);
  if (error) {
    return {
      configured: true,
      schemaReady: false,
      operatorReady,
      backend: "supabase",
      warning: error.message.slice(0, 160),
    };
  }
  return {
    configured: true,
    schemaReady: true,
    operatorReady,
    backend: "supabase",
    ...(!operatorReady
      ? {
          warning:
            "Migration may exist, but STRIPE_BILLING_RPC_READY is not 1.",
        }
      : {}),
  };
}

/** Regression helper; only effective when explicit fixture mode is enabled. */
export function __resetStripeBillingFixture(): void {
  if (!stripeBillingFixtureEnabled()) return;
  (globalThis as FixtureGlobal).__pikboStripeBillingFixtureState =
    emptyBillingFixtureState();
}
