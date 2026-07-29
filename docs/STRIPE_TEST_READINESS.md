# Stripe test readiness (Phase I) — not live charges

**Status:** Preparation only. Live keys and public payment stay off until the
quality, privacy, accounting, and target-buyer Beta gates pass.

## Already in repo

- Checkout + webhook routes under `app/api/checkout` and `app/api/webhooks/stripe`
- Service-role-only transactional billing RPC:
  `supabase/migrations/20260729030000_stripe_billing_idempotency.sql`
- Legacy JSON entitlements are an explicit local fixture only and cannot make
  production billing ready.
- Feature flag pattern: payments disabled without keys / `NEXT_PUBLIC_PAYMENTS_ENABLED`
- **`paymentsReadiness()`** on `/api/health` → `payments` (test vs live secret mode, never echoes keys)
- Checkout refuses when the flag is off (`PAYMENTS_DISABLED`). `sk_live` also
  requires both `PAYMENTS_LIVE=1` and a rehearsed refund/dispute guard.

## Before enabling test mode

1. Durable auth/credits (T5) green with Supabase — Cookie is not enough for paid.
2. Create one Stripe **test** recurring Price for **Founding Studio** and supply
   `STRIPE_PRICE_FOUNDING_STUDIO` plus the test secret and webhook secret.
3. Apply `20260729024000_stripe_subscription_statuses.sql`, then
   `20260729025000_founding_studio_plan.sql`, and then
   `20260729030000_stripe_billing_idempotency.sql` in a disposable/non-production
   Supabase project,
   run redelivery/order/grant races, then set `STRIPE_BILLING_RPC_READY=1`.
4. Free watermark file bake (T6) so free users cannot raw-download.
5. `npm run stripe-billing-regression` passes. A real non-production rehearsal
   must still prove concurrent redelivery against Postgres.

## Explicitly forbidden until separate approval

- Live secret keys
- Public payment buttons on pikbo.ai
- Yearly prices without a real Price ID
- `STRIPE_REFUND_DISPUTE_GUARD_READY=1`: refund/dispute credit revocation is
  not implemented or rehearsed, so live Checkout is deliberately hard-closed

Founding Studio is a candidate **$49/month** offer with **3 fixed Launch Packs
(90 credits / 9 outputs)**. Credits roll over while the subscription remains
active. This offer must stay unavailable until ten real provider runs establish
that p95 retry cost still leaves at least 70% gross margin.

## Operator checklist (private test Preview only)

- [ ] `STRIPE_SECRET_KEY` (test)
- [ ] `STRIPE_WEBHOOK_SECRET` (test)
- [ ] `STRIPE_PRICE_FOUNDING_STUDIO` (active USD $49 monthly recurring Price;
      the server rejects inactive, one-time, non-USD, yearly, metered, or $29)
- [ ] Test account is active, personal, owner-bound, and has durable
      `accounts.live_generation_allowed=true`
- [ ] Confirm `NEXT_PUBLIC_PAYMENTS_ENABLED=1` only on private preview
- [ ] Confirm production still reports `paid=false`
- [ ] Verify `incomplete_expired` becomes canceled, `paused` blocks a second
      Checkout and has no entitlement, late invoices cannot revive canceled A,
      and an event on canceled A cannot downgrade funded active B
