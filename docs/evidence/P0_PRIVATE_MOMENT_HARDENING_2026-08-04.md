# P0 private Moment hardening — 2026-08-04

**Issue:** [#54 — One owned toy photo → one private Street Power-Up Moment](https://github.com/CharlesHarry7/pikbo/issues/54)

This slice closes two server-side bypasses before the first paid-quality real
run. It does not enable production provider spend or Stripe.

## Changes

- A direct live Moment now requires a valid UUID for an authenticated owner's
  `ready` private toy asset. Inline image bytes and legacy process-local
  `asset_*` identifiers cannot cross the live provider boundary.
- A live client cannot recover `ASSET_NOT_FOUND` by dropping the private asset
  id and reposting inline image bytes. It must re-register the private asset.
- Every non-Pack live request, including an invited validation account, must
  match `toy-moment-v1`: Street Power-Up, 9:16, 5 seconds, Fast 720p.
- A worker-only single-generation reconciliation endpoint now consumes leased
  R1c cases and finishes only their claimed capture/release action. The caller
  can bound work count but cannot supply user, job, reservation, lease, or
  provider identifiers. Responses contain counters only.
- The new reconciliation worker regression is part of GitHub CI.

## Independent review

- Grok CLI discovery red-team session: `74ae34e9-0902-4ae8-9d8f-bcdb1a41a751`.
- Grok CLI final diff review session: `9fe946ac-a212-4a74-8f5c-c897fc4e2157`
  — all three security contracts passed with no P0 finding.
- Seller-path QA checked production Home, Create, Login, Library, Pricing, and
  beta-request paths. Its conclusion remains that one authorized real SKU
  input/output proof is the next conversion requirement; no fake case was
  added in this slice.

## Verification

Passed locally:

```text
npm run engine-smoke
npm run p0-private-live-generation
npm run moment-contract-regression
npm run provider-budget-regression
npm run capability-matrix
npm run seller-pack-atomic-regression
npm run private-toy-input-pack-regression
npm run private-input-admission-regression
npm run auth-magic-link-regression
npm run recovery-ledger
npm run recovery-reconciliation
npm run generation-reconciliation-worker-regression
npm run stripe-billing-regression
npm run privacy-analytics-regression
npm run live-copy-smoke
npm run seo-cold-start-smoke
npm run product-proof-smoke
npm run typecheck
npm run lint
git diff --check
```

The local `next build` cannot traverse this Codex workspace's external
`node_modules` symlink and exits with the Turbopack filesystem-root guard. This
is an environment limitation, not accepted build evidence. GitHub CI and the
Vercel Preview build remain mandatory before merge.

## Runtime evidence boundary

A current-main Vercel Preview was created at
`https://pikbo-cpy2peaoo-pi-kbo.vercel.app`. It correctly remains fail-closed,
but exposed that the global Preview environment has an absent provider key and
stale Supabase values. No provider call or model spend was made. Production
remains validation-only and provider validation remains hard-closed.

The next proof must use a protected Preview with the reviewed branch-scoped
environment and record one owner upload → private result → settlement →
Library refresh → owner-only download. Customer media, secrets, raw provider
URLs, and signed URLs must not be committed.
