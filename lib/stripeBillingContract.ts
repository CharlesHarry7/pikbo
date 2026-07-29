/**
 * Pure Stripe billing contract shared by the webhook adapter and the
 * dependency-free regression fixture. No secrets, network, or browser state.
 */

export type StripePaidPlan = "founding_studio";

export type StripeBillingEventType =
  | "checkout.session.completed"
  | "invoice.paid"
  | "customer.subscription.updated"
  | "customer.subscription.deleted";

export type StripeSubscriptionState =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "paused";

export const FOUNDING_STUDIO_PRICE_CENTS = 4_900 as const;

type StripePriceRecord = {
  id?: unknown;
  active?: unknown;
  currency?: unknown;
  type?: unknown;
  unit_amount?: unknown;
  recurring?: unknown;
};

/**
 * A Price ID is not a price contract by itself. Checkout must verify the
 * immutable Stripe Price fields before accepting money for 90 credits.
 */
export function foundingStudioPriceContractIsValid(
  value: StripePriceRecord,
  expectedPriceId: string
): boolean {
  const recurring =
    value.recurring && typeof value.recurring === "object"
      ? (value.recurring as Record<string, unknown>)
      : {};
  return (
    value.id === expectedPriceId &&
    value.active === true &&
    value.currency === "usd" &&
    value.type === "recurring" &&
    value.unit_amount === FOUNDING_STUDIO_PRICE_CENTS &&
    recurring.interval === "month" &&
    recurring.interval_count === 1 &&
    recurring.usage_type === "licensed"
  );
}

/**
 * Stripe's terminal `incomplete_expired` value releases the account's open
 * subscription slot. `paused` remains explicit and non-entitled.
 */
export function normalizeStripeSubscriptionStatus(
  value: unknown
): StripeSubscriptionState | null {
  if (value === "incomplete_expired") return "canceled";
  if (
    value === "trialing" ||
    value === "active" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "unpaid" ||
    value === "incomplete" ||
    value === "paused"
  ) {
    return value;
  }
  return null;
}

export type NormalizedStripeBillingEvent = {
  eventId: string;
  eventType: StripeBillingEventType;
  payloadSha256: string;
  eventCreated: number;
  livemode: boolean;
  userId?: string;
  accountId?: string;
  checkoutSessionId?: string;
  customerId?: string;
  subscriptionId?: string;
  invoiceId?: string;
  priceId?: string;
  plan?: StripePaidPlan;
  subscriptionStatus?: StripeSubscriptionState;
  amountPaid?: number;
  currency?: string;
  periodStart?: number;
  periodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  grantCredits?: number;
};

export function strictPaidPlanFromPriceId(
  priceId: string | null | undefined,
  foundingStudioPriceId: string | null | undefined
): StripePaidPlan | null {
  if (!priceId) return null;
  if (foundingStudioPriceId && priceId === foundingStudioPriceId) {
    return "founding_studio";
  }
  return null;
}

export function paidCheckoutIsValid(input: {
  mode: unknown;
  status: unknown;
  paymentStatus: unknown;
  amountTotal: unknown;
}): boolean {
  return (
    input.mode === "subscription" &&
    input.status === "complete" &&
    input.paymentStatus === "paid" &&
    typeof input.amountTotal === "number" &&
    Number.isInteger(input.amountTotal) &&
    input.amountTotal === FOUNDING_STUDIO_PRICE_CENTS
  );
}

export function billingMetadataMatches(input: {
  metadata: Record<string, string | undefined>;
  expectedUserId: string;
  expectedAccountId: string;
  expectedPlan: StripePaidPlan;
  expectedPriceId: string;
}): boolean {
  return (
    input.metadata.pikbo_user_id === input.expectedUserId &&
    input.metadata.pikbo_account_id === input.expectedAccountId &&
    input.metadata.plan === input.expectedPlan &&
    input.metadata.pikbo_price_id === input.expectedPriceId
  );
}

export function stripeBillingEventRank(type: StripeBillingEventType): number {
  if (type === "customer.subscription.deleted") return 40;
  if (type === "customer.subscription.updated") return 30;
  if (type === "invoice.paid") return 20;
  return 10;
}

export type StripeEventOrder = {
  created: number;
  rank: number;
  eventId: string;
};

export function stripeEventIsNewer(
  incoming: StripeEventOrder,
  current: StripeEventOrder | null | undefined
): boolean {
  if (!current) return true;
  if (incoming.created !== current.created) {
    return incoming.created > current.created;
  }
  if (incoming.rank !== current.rank) {
    return incoming.rank > current.rank;
  }
  return incoming.eventId > current.eventId;
}

export type BillingFixtureSubscription = {
  accountId: string;
  userId: string;
  customerId: string;
  subscriptionId: string;
  checkoutSessionId?: string;
  lastPaidInvoiceId?: string;
  lastPaidInvoiceCreated?: number;
  priceId: string;
  plan: StripePaidPlan;
  status: StripeSubscriptionState;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd: boolean;
  lastOrder: StripeEventOrder;
};

export type BillingFixtureState = {
  processedEvents: Record<string, string>;
  subscriptions: Record<string, BillingFixtureSubscription>;
  walletCredits: Record<string, number>;
  invoiceGrants: Record<string, number>;
  accountPlans: Record<string, "free" | StripePaidPlan>;
};

export function emptyBillingFixtureState(): BillingFixtureState {
  return {
    processedEvents: {},
    subscriptions: {},
    walletCredits: {},
    invoiceGrants: {},
    accountPlans: {},
  };
}

function fixtureSubscriptionForEvent(
  state: BillingFixtureState,
  event: NormalizedStripeBillingEvent
): BillingFixtureSubscription | null {
  if (event.subscriptionId && state.subscriptions[event.subscriptionId]) {
    return state.subscriptions[event.subscriptionId];
  }
  if (!event.customerId) return null;
  return (
    Object.values(state.subscriptions).find(
      (subscription) => subscription.customerId === event.customerId
    ) ?? null
  );
}

function requirePaidIdentity(event: NormalizedStripeBillingEvent): {
  accountId: string;
  userId: string;
  customerId: string;
  subscriptionId: string;
  priceId: string;
  plan: StripePaidPlan;
} {
  if (
    !event.accountId ||
    !event.userId ||
    !event.customerId ||
    !event.subscriptionId ||
    !event.priceId ||
    !event.plan
  ) {
    throw new Error("BILLING_BINDING_REQUIRED");
  }
  return {
    accountId: event.accountId,
    userId: event.userId,
    customerId: event.customerId,
    subscriptionId: event.subscriptionId,
    priceId: event.priceId,
    plan: event.plan,
  };
}

function assertFixtureIdentityCompatible(
  subscription: BillingFixtureSubscription,
  event: NormalizedStripeBillingEvent
): void {
  const conflicts = [
    event.accountId && event.accountId !== subscription.accountId,
    event.userId && event.userId !== subscription.userId,
    event.customerId && event.customerId !== subscription.customerId,
    event.subscriptionId &&
      event.subscriptionId !== subscription.subscriptionId,
    event.priceId && event.priceId !== subscription.priceId,
    event.plan && event.plan !== subscription.plan,
    event.checkoutSessionId &&
      subscription.checkoutSessionId &&
      event.checkoutSessionId !== subscription.checkoutSessionId,
  ];
  if (conflicts.some(Boolean)) {
    throw new Error("STRIPE_IDENTITY_CONFLICT");
  }
}

function reconcileFixtureAccountPlan(
  state: BillingFixtureState,
  accountId: string
): void {
  const fundedActive = Object.values(state.subscriptions)
    .filter(
      (subscription) =>
        subscription.accountId === accountId &&
        subscription.status === "active" &&
        Boolean(subscription.lastPaidInvoiceId)
    )
    .sort((a, b) => {
      if (a.lastOrder.created !== b.lastOrder.created) {
        return b.lastOrder.created - a.lastOrder.created;
      }
      if (a.lastOrder.rank !== b.lastOrder.rank) {
        return b.lastOrder.rank - a.lastOrder.rank;
      }
      return b.lastOrder.eventId.localeCompare(a.lastOrder.eventId);
    })[0];
  state.accountPlans[accountId] = fundedActive?.plan ?? "free";
}

/**
 * Explicit test-only fixture for event idempotency, ordering, and invoice
 * grants. Production uses the single Postgres RPC in the billing migration.
 */
export function applyBillingEventFixture(
  previous: BillingFixtureState,
  event: NormalizedStripeBillingEvent
): {
  state: BillingFixtureState;
  idempotent: boolean;
  stale: boolean;
  grantedCredits: number;
} {
  const priorHash = previous.processedEvents[event.eventId];
  if (priorHash) {
    if (priorHash !== event.payloadSha256) {
      throw new Error("STRIPE_EVENT_PAYLOAD_CONFLICT");
    }
    return {
      state: previous,
      idempotent: true,
      stale: false,
      grantedCredits: 0,
    };
  }

  const state: BillingFixtureState = {
    processedEvents: {
      ...previous.processedEvents,
      [event.eventId]: event.payloadSha256,
    },
    subscriptions: { ...previous.subscriptions },
    walletCredits: { ...previous.walletCredits },
    invoiceGrants: { ...previous.invoiceGrants },
    accountPlans: { ...previous.accountPlans },
  };
  const order = {
    created: event.eventCreated,
    rank: stripeBillingEventRank(event.eventType),
    eventId: event.eventId,
  };
  let subscription = fixtureSubscriptionForEvent(state, event);
  const subscriptionExisted = Boolean(subscription);
  let stale = false;
  let grantedCredits = 0;

  if (event.eventType === "checkout.session.completed") {
    const identity = requirePaidIdentity(event);
    if (
      !event.checkoutSessionId ||
      !event.amountPaid ||
      event.amountPaid <= 0
    ) {
      throw new Error("PAID_CHECKOUT_REQUIRED");
    }
    if (subscription) {
      assertFixtureIdentityCompatible(subscription, event);
      const newer = stripeEventIsNewer(order, subscription.lastOrder);
      stale = !newer;
      subscription = {
        ...subscription,
        checkoutSessionId:
          subscription.checkoutSessionId ?? event.checkoutSessionId,
        ...(newer
          ? {
              status: "active" as const,
              currentPeriodStart:
                event.periodStart ?? subscription.currentPeriodStart,
              currentPeriodEnd:
                event.periodEnd ?? subscription.currentPeriodEnd,
              cancelAtPeriodEnd: false,
              lastOrder: order,
            }
          : {}),
      };
    } else {
      subscription = {
        ...identity,
        checkoutSessionId: event.checkoutSessionId,
        status: "active",
        currentPeriodStart: event.periodStart,
        currentPeriodEnd: event.periodEnd,
        cancelAtPeriodEnd: false,
        lastOrder: order,
      };
    }
    state.subscriptions[identity.subscriptionId] = subscription;
  } else {
    if (!subscription) {
      const identity = requirePaidIdentity(event);
      subscription = {
        ...identity,
        status: event.subscriptionStatus ?? "incomplete",
        currentPeriodStart: event.periodStart,
        currentPeriodEnd: event.periodEnd,
        cancelAtPeriodEnd: event.cancelAtPeriodEnd === true,
        lastOrder: order,
      };
      state.subscriptions[identity.subscriptionId] = subscription;
    } else {
      assertFixtureIdentityCompatible(subscription, event);
    }

    if (!subscriptionExisted) {
      // The inserted row already contains this event's lifecycle facts.
      stale = false;
    } else if (event.eventType === "invoice.paid") {
      // Funding is orthogonal to lifecycle. A paid invoice that arrives after a
      // cancellation must never move status/order back to active.
      stale = !stripeEventIsNewer(order, subscription.lastOrder);
    } else if (!stripeEventIsNewer(order, subscription.lastOrder)) {
      stale = true;
    } else {
      const status =
        event.eventType === "customer.subscription.deleted"
          ? "canceled"
          : (event.subscriptionStatus ?? subscription.status);
      subscription = {
        ...subscription,
        ...(event.priceId ? { priceId: event.priceId } : {}),
        ...(event.plan ? { plan: event.plan } : {}),
        status,
        currentPeriodStart:
          event.periodStart ?? subscription.currentPeriodStart,
        currentPeriodEnd: event.periodEnd ?? subscription.currentPeriodEnd,
        cancelAtPeriodEnd:
          event.cancelAtPeriodEnd ?? subscription.cancelAtPeriodEnd,
        lastOrder: order,
      };
      state.subscriptions[subscription.subscriptionId] = subscription;
    }
  }

  if (event.eventType === "invoice.paid") {
    if (
      !event.invoiceId ||
      !event.amountPaid ||
      event.amountPaid <= 0 ||
      event.grantCredits === undefined ||
      event.grantCredits < 0
    ) {
      throw new Error("PAID_INVOICE_REQUIRED");
    }
    const alreadyGranted = state.invoiceGrants[event.invoiceId];
    if (!alreadyGranted && event.grantCredits > 0) {
      state.invoiceGrants[event.invoiceId] = event.grantCredits;
      state.walletCredits[subscription.accountId] =
        (state.walletCredits[subscription.accountId] ?? 0) +
        event.grantCredits;
      grantedCredits = event.grantCredits;
    }
    if (event.grantCredits > 0) {
      const current = state.subscriptions[subscription.subscriptionId];
      const currentInvoiceCreated = current.lastPaidInvoiceCreated ?? 0;
      subscription =
        event.eventCreated > currentInvoiceCreated ||
        (event.eventCreated === currentInvoiceCreated &&
          event.invoiceId > (current.lastPaidInvoiceId ?? ""))
          ? {
              ...current,
              lastPaidInvoiceId: event.invoiceId,
              lastPaidInvoiceCreated: event.eventCreated,
            }
          : current;
      state.subscriptions[subscription.subscriptionId] = subscription;
    }
  }

  reconcileFixtureAccountPlan(state, subscription.accountId);

  return { state, idempotent: false, stale, grantedCredits };
}
