/**
 * Stripe billing regression — pure event engine + production source locks.
 * No Stripe/Supabase network, secrets, or production mutation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const contract = await import(
  pathToFileURL(join(root, "lib/stripeBillingContract.ts")).href
);
const {
  FOUNDING_STUDIO_PRICE_CENTS,
  applyBillingEventFixture,
  billingMetadataMatches,
  emptyBillingFixtureState,
  foundingStudioPriceContractIsValid,
  normalizeStripeSubscriptionStatus,
  paidCheckoutIsValid,
  strictPaidPlanFromPriceId,
} = contract;

const foundingPrice = "price_founding_studio_test";
const validPrice = {
  id: foundingPrice,
  active: true,
  currency: "usd",
  type: "recurring",
  unit_amount: FOUNDING_STUDIO_PRICE_CENTS,
  recurring: {
    interval: "month",
    interval_count: 1,
    usage_type: "licensed",
  },
};
assert.equal(
  foundingStudioPriceContractIsValid(validPrice, foundingPrice),
  true,
  "the exact active USD $49 monthly Price is accepted"
);
for (const [label, price] of [
  ["wrong id", { ...validPrice, id: "price_attacker" }],
  ["inactive", { ...validPrice, active: false }],
  ["wrong currency", { ...validPrice, currency: "eur" }],
  ["one time", { ...validPrice, type: "one_time", recurring: null }],
  ["old $29 amount", { ...validPrice, unit_amount: 2_900 }],
  [
    "yearly",
    { ...validPrice, recurring: { ...validPrice.recurring, interval: "year" } },
  ],
  [
    "multi-month",
    {
      ...validPrice,
      recurring: { ...validPrice.recurring, interval_count: 3 },
    },
  ],
  [
    "metered",
    {
      ...validPrice,
      recurring: { ...validPrice.recurring, usage_type: "metered" },
    },
  ],
]) {
  assert.equal(
    foundingStudioPriceContractIsValid(price, foundingPrice),
    false,
    `${label} Stripe Price must fail closed`
  );
}

assert.equal(
  strictPaidPlanFromPriceId(foundingPrice, foundingPrice),
  "founding_studio"
);
assert.equal(
  strictPaidPlanFromPriceId("price_attacker", foundingPrice),
  null,
  "unknown price must fail closed"
);
assert.equal(
  strictPaidPlanFromPriceId("price_creator_test", foundingPrice),
  null,
  "retired Creator prices must fail closed"
);
assert.equal(
  strictPaidPlanFromPriceId("price_shop_test", foundingPrice),
  null,
  "retired Shop prices must fail closed"
);

assert.equal(
  paidCheckoutIsValid({
    mode: "subscription",
    status: "complete",
    paymentStatus: "paid",
    amountTotal: FOUNDING_STUDIO_PRICE_CENTS,
  }),
  true
);
assert.equal(
  paidCheckoutIsValid({
    mode: "subscription",
    status: "complete",
    paymentStatus: "paid",
    amountTotal: 2_900,
  }),
  false,
  "the retired $29 Checkout fixture must fail closed"
);
assert.equal(
  paidCheckoutIsValid({
    mode: "subscription",
    status: "complete",
    paymentStatus: "unpaid",
    amountTotal: FOUNDING_STUDIO_PRICE_CENTS,
  }),
  false,
  "complete without paid is not an entitlement"
);
assert.equal(
  paidCheckoutIsValid({
    mode: "subscription",
    status: "complete",
    paymentStatus: "paid",
    amountTotal: 0,
  }),
  false,
  "zero-dollar checkout cannot satisfy first real subscription"
);
assert.equal(
  normalizeStripeSubscriptionStatus("incomplete_expired"),
  "canceled",
  "terminal incomplete subscriptions release the open-subscription slot"
);
assert.equal(normalizeStripeSubscriptionStatus("paused"), "paused");
assert.equal(normalizeStripeSubscriptionStatus("future_status"), null);

const userId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
const customerId = "cus_fixture";
const subscriptionId = "sub_fixture";
assert.equal(
  billingMetadataMatches({
    metadata: {
      pikbo_user_id: userId,
      pikbo_account_id: accountId,
      plan: "founding_studio",
      pikbo_price_id: foundingPrice,
    },
    expectedUserId: userId,
    expectedAccountId: accountId,
    expectedPlan: "founding_studio",
    expectedPriceId: foundingPrice,
  }),
  true
);
assert.equal(
  billingMetadataMatches({
    metadata: {
      pikbo_user_id: "attacker",
      pikbo_account_id: accountId,
      plan: "founding_studio",
      pikbo_price_id: foundingPrice,
    },
    expectedUserId: userId,
    expectedAccountId: accountId,
    expectedPlan: "founding_studio",
    expectedPriceId: foundingPrice,
  }),
  false
);

let state = emptyBillingFixtureState();
const checkout = {
  eventId: "evt_checkout",
  eventType: "checkout.session.completed",
  payloadSha256: "a".repeat(64),
  eventCreated: 100,
  livemode: false,
  userId,
  accountId,
  checkoutSessionId: "cs_fixture",
  customerId,
  subscriptionId,
  priceId: foundingPrice,
  plan: "founding_studio",
  subscriptionStatus: "active",
  amountPaid: FOUNDING_STUDIO_PRICE_CENTS,
  currency: "usd",
};
let applied = applyBillingEventFixture(state, checkout);
state = applied.state;
assert.equal(applied.grantedCredits, 0, "checkout does not grant credits");
assert.equal(state.subscriptions[subscriptionId].status, "active");

const invoice = {
  eventId: "evt_invoice",
  eventType: "invoice.paid",
  payloadSha256: "b".repeat(64),
  eventCreated: 110,
  livemode: false,
  customerId,
  subscriptionId,
  invoiceId: "in_fixture",
  priceId: foundingPrice,
  plan: "founding_studio",
  subscriptionStatus: "active",
  amountPaid: FOUNDING_STUDIO_PRICE_CENTS,
  currency: "usd",
  grantCredits: 90,
};
applied = applyBillingEventFixture(state, invoice);
state = applied.state;
assert.equal(applied.grantedCredits, 90);
assert.equal(state.walletCredits[accountId], 90);
assert.equal(
  state.accountPlans[accountId],
  "founding_studio",
  "a paid monthly invoice activates the current active subscription"
);

applied = applyBillingEventFixture(state, invoice);
assert.equal(applied.idempotent, true);
assert.equal(applied.state.walletCredits[accountId], 90);
state = applied.state;

applied = applyBillingEventFixture(state, {
  ...invoice,
  eventId: "evt_invoice_duplicate_delivery",
  payloadSha256: "c".repeat(64),
});
state = applied.state;
assert.equal(
  state.walletCredits[accountId],
  90,
  "same invoice with another event id still grants once"
);

assert.throws(
  () =>
    applyBillingEventFixture(state, {
      ...invoice,
      payloadSha256: "d".repeat(64),
    }),
  /STRIPE_EVENT_PAYLOAD_CONFLICT/
);

applied = applyBillingEventFixture(state, {
  ...invoice,
  eventId: "evt_proration_invoice",
  invoiceId: "in_proration_fixture",
  payloadSha256: "9".repeat(64),
  eventCreated: 111,
  grantCredits: 0,
});
state = applied.state;
assert.equal(
  state.walletCredits[accountId],
  90,
  "paid proration can update billing truth but cannot mint a monthly allotment"
);
assert.equal(
  state.subscriptions[subscriptionId].lastPaidInvoiceId,
  "in_fixture",
  "zero-grant proration cannot replace monthly funding proof"
);

applied = applyBillingEventFixture(state, {
  eventId: "evt_deleted",
  eventType: "customer.subscription.deleted",
  payloadSha256: "e".repeat(64),
  eventCreated: 120,
  livemode: false,
  customerId,
  subscriptionId,
  subscriptionStatus: "canceled",
});
state = applied.state;
assert.equal(state.subscriptions[subscriptionId].status, "canceled");
assert.equal(state.accountPlans[accountId], "free");

applied = applyBillingEventFixture(state, {
  eventId: "evt_late_active",
  eventType: "customer.subscription.updated",
  payloadSha256: "f".repeat(64),
  eventCreated: 115,
  livemode: false,
  customerId,
  subscriptionId,
  priceId: foundingPrice,
  plan: "founding_studio",
  subscriptionStatus: "active",
});
state = applied.state;
assert.equal(applied.stale, true);
assert.equal(
  state.subscriptions[subscriptionId].status,
  "canceled",
  "late active event cannot resurrect a newer deletion"
);

const canceledLifecycleOrder = state.subscriptions[subscriptionId].lastOrder;
applied = applyBillingEventFixture(state, {
  ...invoice,
  eventId: "evt_invoice_after_cancel",
  invoiceId: "in_after_cancel",
  payloadSha256: "8".repeat(64),
  eventCreated: 130,
});
state = applied.state;
assert.equal(applied.grantedCredits, 90);
assert.equal(state.walletCredits[accountId], 180);
assert.equal(state.subscriptions[subscriptionId].status, "canceled");
assert.deepEqual(
  state.subscriptions[subscriptionId].lastOrder,
  canceledLifecycleOrder,
  "invoice funding facts must not advance a canceled subscription lifecycle"
);
assert.equal(
  state.accountPlans[accountId],
  "free",
  "a late paid invoice cannot resurrect entitlement after cancellation"
);

// Stripe can deliver checkout and invoice facts out of lifecycle timestamp
// order. Orthogonal bindings must still converge in both directions.
{
  let permuted = emptyBillingFixtureState();
  let result = applyBillingEventFixture(permuted, {
    ...checkout,
    eventId: "evt_checkout_newer_first",
    checkoutSessionId: "cs_newer_first",
    eventCreated: 300,
    payloadSha256: "2".repeat(64),
  });
  permuted = result.state;
  result = applyBillingEventFixture(permuted, {
    ...invoice,
    eventId: "evt_invoice_older_second",
    invoiceId: "in_older_second",
    eventCreated: 290,
    payloadSha256: "3".repeat(64),
  });
  permuted = result.state;
  assert.equal(result.stale, true);
  assert.equal(
    permuted.subscriptions[subscriptionId].lastPaidInvoiceId,
    "in_older_second"
  );
  assert.equal(permuted.accountPlans[accountId], "founding_studio");
}

{
  let permuted = emptyBillingFixtureState();
  let result = applyBillingEventFixture(permuted, {
    ...invoice,
    userId,
    accountId,
    eventId: "evt_invoice_first",
    invoiceId: "in_first",
    eventCreated: 500,
    payloadSha256: "4".repeat(64),
  });
  permuted = result.state;
  assert.equal(
    permuted.subscriptions[subscriptionId].checkoutSessionId,
    undefined
  );
  result = applyBillingEventFixture(permuted, {
    ...checkout,
    eventId: "evt_checkout_older_second",
    checkoutSessionId: "cs_older_second",
    eventCreated: 490,
    payloadSha256: "5".repeat(64),
  });
  permuted = result.state;
  assert.equal(result.stale, true);
  assert.equal(
    permuted.subscriptions[subscriptionId].checkoutSessionId,
    "cs_older_second",
    "stale checkout must still backfill the confirm identity"
  );
  assert.equal(permuted.accountPlans[accountId], "founding_studio");
}

// Account entitlement is derived across every Stripe subscription, not merely
// the row touched by the latest event. A canceled A must not downgrade active B.
{
  let twoSubscriptions = state;
  const customerB = "cus_fixture_b";
  const subscriptionB = "sub_fixture_b";
  let result = applyBillingEventFixture(twoSubscriptions, {
    ...checkout,
    eventId: "evt_checkout_b",
    checkoutSessionId: "cs_fixture_b",
    customerId: customerB,
    subscriptionId: subscriptionB,
    eventCreated: 200,
    payloadSha256: "6".repeat(64),
  });
  twoSubscriptions = result.state;
  result = applyBillingEventFixture(twoSubscriptions, {
    ...invoice,
    eventId: "evt_invoice_b",
    customerId: customerB,
    subscriptionId: subscriptionB,
    invoiceId: "in_fixture_b",
    eventCreated: 210,
    payloadSha256: "7".repeat(64),
  });
  twoSubscriptions = result.state;
  assert.equal(twoSubscriptions.subscriptions[subscriptionId].status, "canceled");
  assert.equal(twoSubscriptions.subscriptions[subscriptionB].status, "active");
  assert.equal(twoSubscriptions.accountPlans[accountId], "founding_studio");

  result = applyBillingEventFixture(twoSubscriptions, {
    eventId: "evt_deleted_a_again",
    eventType: "customer.subscription.deleted",
    payloadSha256: "0".repeat(64),
    eventCreated: 140,
    livemode: false,
    customerId,
    subscriptionId,
    subscriptionStatus: "canceled",
  });
  twoSubscriptions = result.state;
  assert.equal(
    twoSubscriptions.accountPlans[accountId],
    "founding_studio",
    "an event on canceled A cannot downgrade funded active B"
  );

  const paused = applyBillingEventFixture(twoSubscriptions, {
    eventId: "evt_paused_b",
    eventType: "customer.subscription.updated",
    payloadSha256: "b".repeat(64),
    eventCreated: 220,
    livemode: false,
    customerId: customerB,
    subscriptionId: subscriptionB,
    priceId: foundingPrice,
    plan: "founding_studio",
    subscriptionStatus: "paused",
  }).state;
  assert.equal(paused.subscriptions[subscriptionB].status, "paused");
  assert.equal(
    paused.accountPlans[accountId],
    "free",
    "paused is explicit but non-entitled"
  );
}

applied = applyBillingEventFixture(state, {
  eventId: "evt_same_second_active",
  eventType: "customer.subscription.updated",
  payloadSha256: "1".repeat(64),
  eventCreated: 120,
  livemode: false,
  customerId,
  subscriptionId,
  priceId: foundingPrice,
  plan: "founding_studio",
  subscriptionStatus: "active",
});
state = applied.state;
assert.equal(applied.stale, true);
assert.equal(
  state.subscriptions[subscriptionId].status,
  "canceled",
  "same-second deletion rank must beat subscription.updated"
);

assert.throws(
  () =>
    applyBillingEventFixture(emptyBillingFixtureState(), {
      ...checkout,
      amountPaid: 0,
    }),
  /PAID_CHECKOUT_REQUIRED/
);

const checkoutRoute = readFileSync(
  join(root, "app/api/checkout/route.ts"),
  "utf8"
);
const pricingCheckoutButton = readFileSync(
  join(root, "components/PricingCheckoutButton.tsx"),
  "utf8"
);
assert.match(checkoutRoute, /getAuthUserFromRequest/);
assert.match(checkoutRoute, /pikbo_user_id/);
assert.match(checkoutRoute, /pikbo_account_id/);
assert.match(checkoutRoute, /pikbo_price_id/);
assert.match(checkoutRoute, /trustedCheckoutOrigin/);
assert.match(checkoutRoute, /SUBSCRIPTION_ALREADY_EXISTS/);
assert.match(checkoutRoute, /supabasePaidDeliveryEligible/);
assert.match(checkoutRoute, /PAID_DELIVERY_NOT_READY/);
assert.match(checkoutRoute, /foundingStudioPriceContractIsValid/);
assert.match(checkoutRoute, /\/prices\/\$\{encodeURIComponent\(priceId\)\}/);
assert.match(checkoutRoute, /PRICE_CONTRACT_INVALID/);
assert.match(checkoutRoute, /PAID_PLAN_ID/);
assert.match(
  checkoutRoute,
  /pikbo-checkout-\$\{accountId\}-\$\{plan\.id\}-\$\{currentPeriodKey\(\)\}/
);
assert.match(checkoutRoute, /"unpaid",\s*"incomplete",\s*"paused"/);
assert.doesNotMatch(
  checkoutRoute,
  /allow_promotion_codes/,
  "unvalidated discounts must not undermine the single-price margin gate"
);
assert.doesNotMatch(
  checkoutRoute,
  /randomUUID/,
  "concurrent checkout clicks need a stable account-period idempotency key"
);
assert.doesNotMatch(
  checkoutRoute,
  /headers\.get\(["']origin["']\)/i,
  "checkout must not trust request Origin"
);
assert.match(
  pricingCheckoutButton,
  /const PRICING_LOGIN_HREF = `\/login\?next=\$\{encodeURIComponent\(["']\/pricing["']\)\}`/,
  "anonymous pricing checkout must preserve the pricing intent through login"
);
assert.match(
  pricingCheckoutButton,
  /data\.code === ["']AUTH_REQUIRED["'][\s\S]{0,120}window\.location\.assign\(PRICING_LOGIN_HREF\)/,
  "server AUTH_REQUIRED checkout responses must hand off to auth instead of trapping on an inline error"
);

const confirmRoute = readFileSync(
  join(root, "app/api/checkout/confirm/route.ts"),
  "utf8"
);
assert.match(confirmRoute, /getAuthUserFromRequest/);
assert.match(confirmRoute, /paidCheckoutIsValid/);
assert.match(confirmRoute, /billingMetadataMatches/);
assert.match(confirmRoute, /UNKNOWN_PRICE/);
assert.match(confirmRoute, /WEBHOOK_PENDING/);
assert.match(confirmRoute, /lastPaidInvoiceId/);
assert.doesNotMatch(confirmRoute, /upsertEntitlement|setPlan|saveSession/);

const meRoute = readFileSync(join(root, "app/api/me/route.ts"), "utf8");
assert.match(meRoute, /Signed-in account plan is authoritative/);
assert.match(meRoute, /plan:\s*durablePlan\.id/);

const webhookRoute = readFileSync(
  join(root, "app/api/webhooks/stripe/route.ts"),
  "utf8"
);
assert.match(webhookRoute, /verifyStripeSignature/);
assert.match(webhookRoute, /applyStripeBillingEvent/);
assert.match(webhookRoute, /STRIPE_BILLING_FIXTURE_MODE|stripeBillingFixtureEnabled/);
assert.match(webhookRoute, /UNKNOWN_SUBSCRIPTION_PRICE|INVOICE_PRICE_OR_IDENTITY_INVALID/);
assert.doesNotMatch(webhookRoute, /upsertEntitlement|lastInvoiceId/);

const legacyEntitlements = readFileSync(
  join(root, "lib/entitlements.ts"),
  "utf8"
);
assert.match(legacyEntitlements, /STRIPE_BILLING_FIXTURE_MODE/);
assert.match(legacyEntitlements, /NODE_ENV !== "production"/);

const migration = readFileSync(
  join(
    root,
    "supabase/migrations/20260729030000_stripe_billing_idempotency.sql"
  ),
  "utf8"
);
assert.match(migration, /pikbo_apply_stripe_billing_event_v1/);
assert.match(migration, /on conflict \(event_id\) do nothing/i);
assert.match(migration, /for update/i);
assert.match(migration, /stripe:invoice:.*:grant/i);
assert.match(migration, /last_stripe_event_created/i);
assert.match(migration, /p_plan_id <> 'founding_studio'/i);
assert.match(migration, /Checkout identity is orthogonal to lifecycle ordering/i);
assert.match(
  migration,
  /from public\.subscription_records active_subscription[\s\S]*active_subscription\.account_id = p_account_id[\s\S]*active_subscription\.status = 'active'[\s\S]*active_subscription\.last_paid_invoice_id is not null/i
);
assert.match(
  migration,
  /p_event_type = 'invoice\.paid' and p_grant_credits > 0[\s\S]*last_paid_invoice_id = p_invoice_id/i
);
assert.match(
  migration,
  /Existing invoice events update only immutable funding facts below[\s\S]*v_is_newer := false/i
);
assert.match(
  migration,
  /status in \([\s\S]*'paused'[\s\S]*\) desc/i,
  "snapshot must surface paused/open subscriptions before canceled history"
);
assert.match(migration, /grant execute[\s\S]*to service_role/i);
assert.match(migration, /from public, anon, authenticated/i);

const statusMigration = readFileSync(
  join(
    root,
    "supabase/migrations/20260729024000_stripe_subscription_statuses.sql"
  ),
  "utf8"
);
assert.match(statusMigration, /add value if not exists 'paused'/i);

const foundingMigration = readFileSync(
  join(
    root,
    "supabase/migrations/20260729025000_founding_studio_plan.sql"
  ),
  "utf8"
);
assert.match(foundingMigration, /add value if not exists 'founding_studio'/i);
assert.match(
  foundingMigration,
  /subscription_records_one_open_stripe_subscription_idx/i
);
assert.match(foundingMigration, /'paused'/i);

const stripeSource = readFileSync(join(root, "lib/stripe.ts"), "utf8");
const webhookSource = readFileSync(
  join(root, "app/api/webhooks/stripe/route.ts"),
  "utf8"
);
assert.match(stripeSource, /STRIPE_REFUND_DISPUTE_GUARD_READY/);
assert.match(
  stripeSource,
  /PAYMENTS_LIVE === "1"[\s\S]*STRIPE_REFUND_DISPUTE_GUARD_READY === "1"/
);
assert.match(
  webhookSource,
  /secretMode === "live"[\s\S]{0,120}!stripeLiveCheckoutAllowed\(\)/,
  "live webhook grants must remain closed with the same refund/dispute guard as Checkout"
);

const envExample = readFileSync(join(root, ".env.example"), "utf8");
assert.match(envExample, /STRIPE_REFUND_DISPUTE_GUARD_READY=0/);

console.log(
  "stripe-billing-regression: PASS — paid/bound confirm, atomic event idempotency, ordered subscription state, and once-only invoice credits"
);
