# Pikbo current launch contract

**Effective:** 2026-07-29
**Code sources:** `lib/pricing.ts`, `lib/sellerPackContract.ts`,
`app/api/generate/route.ts`, and the `20260729*` migrations
**Runtime state:** validation; public live generation and production payments
remain closed

This document supersedes the old Free/Creator/Shop, cookie-credit, public Mini,
and synchronous public-provider descriptions elsewhere in the repository.
Historical documents remain for decision history only.

## Product

The paid candidate is one fixed product:

- **Founding Studio** — candidate `$49/month`.
- **3 Launch Packs / billing month**.
- **90 credits / 9 fixed outputs**.
- The planned four-Pack default is deliberately reduced to three: at the
  recorded Fast 720p / 5-second rate, 12 fully used outputs cost about `$14.52`
  before Storage, retries, support, or payment fees, which already misses the
  required 70% gross-margin floor on a `$49` charge. The fourth Pack may return
  only after measured p95 retry cost supports it.
- One Pack atomically reserves 30 credits and contains:
  - Listing Spin — `1:1`, Fast 720p, 5 seconds, 10 credits.
  - Blind-box Reveal — `9:16`, Fast 720p, 5 seconds, 10 credits.
  - Social Flash — `9:16`, Fast 720p, 5 seconds, 10 credits.
- Confirmed failed children restore only their own 10 credits.
- Credits roll over while the subscription remains active.
- Paid credits cannot be used for arbitrary single clips, Flux stills, other
  models, or longer durations.

Free/public sessions receive labeled cached prototypes. Their upload is not
processed and no provider call occurs.

## Delivery and accounting

A real validation job requires all of the following:

1. Supabase authentication.
2. An operator-invited account with live access in non-production.
3. A database-atomic credit or Pack-child reservation.
4. A durable provider-spend reservation under the immutable US$20 validation
   ceiling.
5. Seedance Fast 720p / 5-second provider execution.
6. Copying the trusted provider result into Pikbo private Storage.
7. Attaching the private object key, byte size, SHA-256, and provider request
   to the owner job before settlement.
8. A short-lived owner-only signed URL for playback or download.

Failure before provider work releases both spend and credits. An ambiguous
post-provider state is withheld for reconciliation; it is not falsely reported
as refunded or delivered. Browser routes cannot settle or release Pack credits.

## Billing

Stripe has one Price environment variable:

```text
STRIPE_PRICE_FOUNDING_STUDIO
```

Checkout is auth/account bound. Webhooks are signature verified and a single
Postgres transaction provides event idempotency, deterministic subscription
ordering, and once-only invoice grants. One account cannot hold multiple open
Stripe subscriptions.

Production must remain:

```text
PIKBO_PROVIDER_VALIDATION_MODE=0
NEXT_PUBLIC_PAYMENTS_ENABLED=0
PAYMENTS_LIVE=0
STRIPE_BILLING_RPC_READY=0
```

Test Checkout may be exercised only on a private Preview after the new
migrations pass a disposable/non-production database rehearsal.

## Privacy and growth

Analytics may emit only:

- `create_view`
- `asset_upload_complete`
- `generation_start`
- `generation_success`
- `download`
- `regenerate_7d`

Only explicit safe counters/categories leave the browser. Photos, emails,
prompts, object keys, provider URLs, asset URLs, and arbitrary metadata do not.

SEO work is limited to the three existing high-intent jobs:

- AI toy video generator.
- 360 toy listing video.
- Blind-box reveal video.

No page may claim a verified real result until its input, private output,
purpose, measured time, and limitations have been recorded.

## Release gates

Before production generation or payment:

- At least 3 SKUs and 10 real calls within the US$20 cap.
- Technical success ≥70%.
- Toy clearly recognizable ≥60%.
- Download rate ≥70%.
- Library refresh recovery ≥90%.
- Median time to downloadable result ≤8 minutes.
- Privacy leaks and double charges = 0.
- Ten target toy sellers/studios: at least 8 upload; at least 50% of successful
  users would use a result for a listing/social post; 7-day reuse ≥30%.
- p95 retries, fees, and model cost leave at least 70% gross margin.

Any privacy, accounting, unrecoverable-output, or threshold failure keeps
production generation, Stripe, launch promotion, and SEO expansion closed.

## Verified evidence

- [Non-production database rehearsal — 2026-07-29](./evidence/NONPROD_DB_REHEARSAL_2026-07-29.md)
- [Grok and WorkBuddy red-team evidence — 2026-07-29](./evidence/GROK_WORKBUDDY_REDTEAM_2026-07-29.md)
