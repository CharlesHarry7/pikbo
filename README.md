# Pikbo — designer-toy AI video Moments

**Product:** turn one rights-owned designer-toy photo into a directed, private,
downloadable video Moment.

**Public site:** [pikbo.ai](https://pikbo.ai) · validation mode · production
provider spend and payments are closed.

## The current product

Pikbo is converging on one complete seller journey:

```text
Sign in → upload an owned toy photo → Street Power-Up → private result
→ Library recovery → owner-only download → create the next SKU
```

The first priced contract is **Street Power-Up**: vertical `9:16`, 5 seconds,
Fast 720p, and 10 credits per completed Moment. The server owns the prompt and
priced fields. A failed job releases its reservation; retries are idempotent.

The former three-output Seller Pack remains private compatibility code. It is
not the public product, homepage promise, or default Create path. Explore,
Community, Cinema, batch tools, broad model catalogs, and mass SEO expansion
are frozen until the single-Moment loop works with real toy sellers.

## Runtime truth

| Surface | Current rule |
|---|---|
| Public visitors | Labeled cached previews; no photo processing or provider spend |
| Invited validation accounts | Authenticated private generation behind durable gates |
| Production generation | Closed until quality, privacy, recovery, and cost gates pass |
| Stripe | Integration code exists; production checkout remains closed |

The authoritative commercial, accounting, privacy, and release contract is
[`docs/CURRENT_LAUNCH_CONTRACT.md`](./docs/CURRENT_LAUNCH_CONTRACT.md).

## Stack

- Next.js 16 on Vercel
- Supabase Auth, Postgres, RLS, atomic credits, and private Storage
- Seedance Fast through fal.ai for non-production validation
- Stripe test integration for one future Founding Studio subscription

## Run locally

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Cached mode needs no provider key. Real validation additionally requires the
reviewed Supabase migrations, allowlist, private buckets, provider key, and
durable budget authority.

## Required checks

```bash
npm run engine-smoke
npm run recovery-qa
npm run private-toy-input-pack-regression
npm run auth-magic-link-regression
npm run stripe-billing-regression
npm run live-copy-smoke
npm run typecheck
npm run lint
npm run build
```

The complete required suite runs in [GitHub Actions](./.github/workflows/ci.yml).

## Repository map

| Path | Purpose |
|---|---|
| `app/create` | Single-Moment creation path |
| `app/library` | Owner result recovery and download entry |
| `app/api/generate` | Auth, reservation, provider, private object, settlement |
| `lib/durableCredits` | Durable accounting authority |
| `supabase/migrations` | Auth, RLS, credits, jobs, private assets and billing |
| `docs/CURRENT_LAUNCH_CONTRACT.md` | Current product and release contract |
| `docs/STATUS.md` | Small active execution queue |
| `AGENTS.md` | Mandatory rules for every coding agent |

## Contribution rule

Start every task from current `origin/main`. Use one short-lived branch, one
bounded outcome, and one pull request. Do not revive an old agent branch or
merge an obsolete multi-feature PR. Historical plans remain available in Git
history but do not authorize product work.
