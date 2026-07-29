# PIKBO credits and plans

> **Superseded on 2026-07-29.** Use
> [`../CURRENT_LAUNCH_CONTRACT.md`](../CURRENT_LAUNCH_CONTRACT.md). The old
> Free/Creator/Shop flat-credit contract below is retained only as decision
> history and must not drive UI, checkout, entitlements, or operations.

**Status:** Commercial contract v1 — current implementation truth  
**Owner:** GPT (business rules)  
**Last reviewed:** 2026-07-23  
**Numeric source of truth:** `lib/pricing.ts`

## 1. Current plan contract

PIKBO currently uses a flat allowance of:

```text
1 live generation job = 10 credits
```

`clipsFromCredits()` is therefore `floor(credits / 10)`.

| Plan | Price | Monthly credits | Honest clip estimate | Enforced path | Watermark label | Commercial use |
|---|---:|---:|---:|---|---|---|
| Free | $0 | 10 | ~1 live trial | Seedance Mini, 5s, 480p | On-player mark | No |
| Creator | $19/month | 50 | ~5 clips | Seedance, 720p default | No player mark | Yes, for toys/assets the customer may use |
| Shop | $49/month | 150 | ~15 clips | Seedance, 720p default, batch UI | No player mark | Yes, for toys/assets the customer may use |

These are job estimates, not guaranteed successful outputs. One generation may still need creative retries, and the present flat cost does not yet vary by model, duration, or resolution.

## 2. What consumes credits

### Costs 0 credits

- Playing cached PIKBO Lab examples.
- Browsing recipes, effects, and official examples.
- A `/api/generate` response with `demo: true` and `demoReason: "no_provider_key"`.
- Validation rejected before a live provider call.

“Unlimited cached demo playback” means exactly this. It must never be shortened to “unlimited videos” or “unlimited generation.”

### Costs 10 credits

- One live `/api/generate` provider job submitted while `FAL_KEY` is configured.

The current route checks the balance, deducts 10 credits immediately before provider work, and returns the updated session. Provider/upload failures after that debit restore the same 10 credits.

### Current refund rule

Credits are restored when live processing fails because:

- The decoded image cannot be read or is empty.
- The provider returns no video.
- The provider account has insufficient balance.
- The provider rate-limits the request.
- Another provider/generation error occurs.

There is no partial charge today. A successful provider response consumes the full 10 credits even if the user dislikes the creative result.

## 3. Plan behavior

### Free

- Receives 10 credits when a guest session is created.
- Refreshes to 10 credits when the UTC calendar month changes.
- Existing legacy Free cookies above 10 credits are clamped to the current allowance.
- Live requests are server-forced to Mini, 5 seconds, and 480p.
- Cached demos remain available after the live credit is used.
- Output is non-commercial under the current product offer.
- The current watermark is described only as an `on-player mark`; it is not a server-burned file watermark.

The Free allowance is currently tied to a signed browser Cookie, not an authenticated person. Clearing or changing browsers can create a new guest identity. That makes Free acceptable only for low-volume, invite-only validation until durable identity and abuse controls exist.

### Creator

- $19 monthly product position.
- 50 credits per plan period.
- Approximately five jobs at the current flat rate.
- 720p default with the paid Seedance path.
- No player overlay mark.
- Priority flag is enabled in plan data.
- Commercial use is limited to assets the customer owns or is licensed to use.

### Shop

- $49 monthly product position.
- 150 credits per plan period.
- Approximately fifteen jobs at the current flat rate.
- 720p default with the paid Seedance path.
- Batch generation UI is included.
- No player overlay mark.
- Priority flag is enabled.
- Commercial use is limited to authorized assets.

## 4. Copy rules

### Allowed

- `10 credits — about 1 Mini live trial`
- `50 credits — about 5 clips at the current rate`
- `150 credits — about 15 clips at the current rate`
- `Cached demos stay free to watch`
- `Free live trial: Mini · 5 seconds · 480p`
- `Failed provider jobs restore the reserved credits`

### Forbidden

- `50 credits = 50 videos`
- `Unlimited free videos`
- `Unlimited Fast generation`
- `Free 720p`
- `Guaranteed 5 or 15 publish-ready videos`
- `No watermark` for Free while the player mark exists
- `Cloud-synced credits` or `account balance` while Cookie state is authoritative
- `Stripe-ready` merely because Checkout and webhook route files exist

## 5. Current persistence limitations

The implemented system is suitable for prototypes, not real subscriptions:

- Guest identity, plan, and spendable credits live in a signed browser Cookie.
- The Cookie is not a durable account and does not sync across devices.
- Paid entitlements are stored in `data/entitlements.json` by default.
- A local JSON file is not reliable across serverless instances, redeploys, or ephemeral filesystems.
- Credit mutation is not backed by a transactional, append-only ledger.
- The in-memory in-flight guard cannot provide cross-instance concurrency guarantees.
- Stripe webhook handling has partial duplicate protection for invoices, but there is no durable Stripe event ledger.
- Missing `SESSION_SECRET` currently falls back to a known development secret; this is never acceptable for paid production.

Therefore the fact that a checkout route exists does not authorize live charging.

## 6. Stripe modes

| Mode | Allowed now? | Purpose |
|---|---|---|
| No Stripe configuration | Yes | Cached demo or free soft-live validation |
| Stripe test mode | Yes, internal QA only | Exercise Checkout and webhook scenarios without real money |
| Stripe live mode | No | Blocked by the gates below |
| Dev upgrade | Local/non-production only | UI and entitlement testing; never a public paid substitute |

`ALLOW_DEV_UPGRADE` must be off in production. A development upgrade must always identify itself as a non-billing test.

## 7. Gates for live Stripe

Live Stripe may open only after **all** gates below pass and the owner records an explicit go-live decision.

### A. Durable identity and data

- [ ] Users authenticate with a durable user ID; paid entitlement is not keyed only to a browser Cookie.
- [ ] Plan, balance, subscription, and period are stored in a production database.
- [ ] Every credit grant, reservation, debit, refund, expiry, and manual adjustment is an append-only ledger entry.
- [ ] Credit reservation/debit is transactional and safe under concurrent requests.
- [ ] Cross-browser login shows the same subscription and balance.
- [ ] Backup and restore have been tested.

### B. Metering and unit economics

- [ ] The server calculates a preflight quote from actual model, duration, resolution, and variant count.
- [ ] The exact same quote is enforced at debit time.
- [ ] Provider cost has been measured with representative owned-toy inputs for every sellable combination.
- [ ] Creator and Shop remain margin-positive under expected retry, failure, payment, storage, and support costs.
- [ ] Plan allowances are updated if measured economics differ from `docs/UNIT_ECONOMICS.md`.
- [ ] No UI advertises a selectable option the server does not enforce.

### C. Stripe correctness

- [ ] Separate Stripe test and live environments use verified Product and Price IDs.
- [ ] Webhook signatures are mandatory in production.
- [ ] Every Stripe event ID is persisted and processed idempotently.
- [ ] Checkout completion cannot grant the same allowance twice.
- [ ] `invoice.paid` renews exactly once.
- [ ] Upgrade, downgrade, cancellation, trialing, past-due, unpaid, and failed-payment behavior is specified and tested.
- [ ] A Customer Portal or equivalent self-service cancellation path exists.
- [ ] Test clocks or equivalent fixtures cover renewals and state transitions.
- [ ] Refund and chargeback operations define whether credits are revoked and how negative balances behave.

### D. Media and abuse safety

- [ ] Free downloadable media receives a server-burned PIKBO watermark, or download is explicitly disabled.
- [ ] Original and watermarked assets use access controls appropriate to the plan.
- [ ] Free-trial abuse controls use durable identity and reasonable device/IP signals.
- [ ] Upload type, size, timeout, storage retention, and deletion behavior are enforced.
- [ ] Ownership confirmation and an infringement report process are available.

### E. Operations and customer promise

- [ ] A unique production `SESSION_SECRET` and all required provider/Stripe secrets are configured securely.
- [ ] Rate limits work across production instances.
- [ ] Provider budget alerts and a kill switch are rehearsed.
- [ ] Terms, privacy, refund policy, support contact, and commercial-use scope match the product.
- [ ] Billing and credit reconciliation can be audited per customer.
- [ ] Production has error monitoring and alerts for checkout, webhook, debit, refund, and provider failures.
- [ ] A 72-hour private beta runs without unreconciled balances or high-severity billing errors.

## 8. Stripe opening sequence

1. Keep production Stripe disabled during soft launch.
2. Build durable identity, database entitlements, and the credit ledger.
3. Implement model-aware quote/reserve/debit/refund.
4. Run all billing scenarios in Stripe test mode.
5. Run a free or manually invoiced private beta and reconcile every generation.
6. Review measured unit economics and freeze plan allowances.
7. Complete legal, support, monitoring, and rollback readiness.
8. Obtain explicit owner approval for live charging.
9. Configure live Price IDs and webhook secret, then admit a small paid cohort.
10. Expand only after the first renewal cycle reconciles correctly.

Skipping a step requires a new written risk decision; engineering convenience is not approval.

## 9. Source-of-truth order

When values conflict, resolve them in this order:

1. `lib/pricing.ts` for current price, credits, watermark, resolution, and feature flags.
2. `lib/contracts.ts` for the current 10-credit job meter and public session fields.
3. Server enforcement in `app/api/generate/route.ts`.
4. This document for commercial interpretation and launch gates.
5. UI copy and older launch documents.

Any intended pricing change starts as a product decision, then updates `lib/pricing.ts`, metering tests, this document, Pricing, Paywall, FAQ, estimator, and README in one coordinated release.

## 10. Current decision

As of 2026-07-23:

- Free cached/demo validation: **go**.
- Small invite-only live Mini validation with a capped FAL budget: **conditional go** after soft-live checks.
- Stripe test mode: **go for internal QA**.
- Stripe live mode: **no-go**.

The no-go remains until every section 7 checkbox is complete. It is not lifted by traffic, demand, or a successful manual Checkout alone.
