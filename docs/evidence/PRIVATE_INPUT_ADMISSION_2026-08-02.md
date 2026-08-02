# Private input admission evidence — 2026-08-02

## Purpose

This slice proves one smaller boundary before real generation: an authenticated,
explicitly allowlisted seller may upload and verify an owned JPEG, PNG, or WebP
inside Pikbo's private input bucket when the input schema and asset RPCs are
ready. It does not create a Launch Pack, reserve credits, call a Provider, add a
Library result, or open Stripe.

## Frozen authority boundary

- `/api/assets/upload-url` requires authenticated identity, private-live
  allowlist membership, private input bucket/schema/RPC readiness, and a
  per-user request limit.
- `/api/assets/complete` requires authenticated ownership and a per-user
  request limit, then rechecks object bytes, MIME, size and hash. It may finish
  an already admitted signed upload if invite/readiness changes between PUT and
  completion; it cannot create an asset or authorize generation.
- Full `privatePreview` readiness remains unchanged for Seller Pack reserve,
  generation, private result delivery, credits, Provider budget, reconciliation,
  deployment admission, and Provider output-host admission.
- Public visitors still receive the Pikbo Lab sample path with no product-photo
  file input.
- An eligible input-only seller sees `Photo verified privately`,
  `Generation is temporarily unavailable`, and
  `0 credits reserved · 0 video jobs created`.
- Storage object keys, Provider identifiers, and internal accounting fields are
  not added to either public asset response.

## Automated proof

The focused route regression executes the real upload and completion handlers
with deterministic adapters and covers anonymous denial, upload-side non-invite
and missing-infrastructure denial, owner completion across gate drift, rate
limiting, and successful upload/complete while full private Preview is false.

PASS on 2026-08-02:

- `npm run private-input-admission-regression`
- `npm run capability-matrix`
- `npm run private-toy-input-pack-regression`
- `npm run nonprod-seller-pack-harness-regression`
- `npm run seller-pack-atomic-regression`
- `npm run p0-private-live-generation`
- `npm run provider-budget-regression`
- `npm run recovery-ledger`
- `npm run recovery-reconciliation`
- `npm run stripe-billing-regression`
- `npm run engine-smoke`
- `npm run live-copy-smoke`
- `npm run seo-cold-start-smoke`
- `npm run launch-pack-main-path-smoke`
- `npm run mobile-proof-regression`
- `npm run showcase-evidence-smoke`
- `npm run typecheck`
- `npm run lint`
- `npm run build` (199 generated pages; one pre-existing T6 dynamic NFT tracing warning)

## Collaboration evidence

- GPT Pro persistent chat: `6a6b4960-4dcc-83e8-8404-b5cb6748abf6`.
  Pro selected the separate zero-Provider private-input admission boundary and
  required the full generation gate to remain unchanged.
- Grok final frozen-diff verdict: **APPROVE**, P0=0 and blocking P1=0,
  collaboration task `/root/grok_code_audit`. Grok independently reran the
  focused security, accounting, UI, type and lint gates with `set -e`.
- WorkBuddy final seller-path verdict: **APPROVE**, collaboration task
  `/root/workbuddy_visual_redteam`. Its first review blocked three misleading
  input-only states; the frozen delta removed the false three-output cards,
  Library promise and generate analytics label before approval.

## Production truth

No Provider request, credit mutation, Stripe action, environment change,
Supabase mutation, DNS change, or public-live enablement was performed while
developing this slice. Production remains validation-only. A successful source
or CI test is not evidence that the protected Preview environment is configured;
that must be confirmed from the deployed health contract and an allowlisted
authenticated account.
