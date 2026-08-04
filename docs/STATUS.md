# Pikbo active status

**Updated:** 2026-08-05

**Canonical code:** `main@d3ef284` plus in-flight operator acceptance harness work
— single Street Power-Up Moment with owner-only live input, reconciliation
hardening, honest guest Create proof, exact private Preview auth origin, and a
fail-closed one-SKU acceptance script (default dry-run, zero spend).

**Production:** `https://pikbo.ai` is deployed and operator-verified. It remains
hard-closed: `/api/health` is `validation`, `softLive=false`, and `paid=false`;
public upload, Provider spend, and Checkout are not enabled.

**Protected Preview:**
`https://pikbo-git-codex-private-validation-pi-kbo.vercel.app` is deployed and
operator-verified. Repeat `/api/health` probes are green with
`privatePreviewReadiness.ready=true` and no missing requirements.

This is the entire active queue. Historical task boards remain available in
Git history and must not be treated as current work.

| Priority | Outcome | GitHub | State | Done when |
|---|---|---|---|---|
| P0 | Owned photo produces the actual private Moment | #54 | protected Preview health is green; code-side one-SKU harness ready (dry-run default); blocked only on the dedicated FAL account's `$0.00` balance | owner Magic Link → owned photo → one `9:16` / 5s / 720p Street Power-Up → private object → Library/download |
| P1 | Stripe test subscription binds to the same durable account | #59 | blocked externally and remains closed | replay-safe test Checkout, webhook, subscription, and once-only credits |

## Completed in this convergence

- #129: production contains the single-Moment Home, Create, and Library while
  its deployed health contract remains validation-only.
- #132: direct live generation requires an owner-scoped ready private asset,
  every direct live allowance uses the fixed Street Power-Up contract, and R1c
  reconciliation is worker-only and fail-closed.
- #133: anonymous Create shows the existing cached Street Power-Up study before
  the private gate. It does not mount CreateStudio or expose upload, credits,
  Generate, Provider, or Checkout controls.
- #65: Magic Link callback handling now preserves the exact Street Power-Up
  next path and fails closed for hostile origins. The regression is covered by
  `npm run auth-magic-link-regression`.
- Operator-safe one-SKU acceptance harness: `npm run private-moment-acceptance`
  (default dry-run, zero network/spend) and
  `npm run private-moment-acceptance-regression` (fail-closed gates + one-call
  bound with mocks). Real mode requires explicit spend confirmation, operator
  session cookie, and owned-image path; runbook:
  `docs/ops/PRIVATE_MOMENT_ONE_SKU_ACCEPTANCE.md`.
- `codex/private-validation`: branch-only Supabase credentials, private-live
  allowlist, one-job budget, FAL key, durable gates, and Stripe-off overrides
  are configured. The owner account, non-production wallet, Supabase callback,
  and FAL balance are dashboard facts observed by an operator; the current FAL
  balance is `$0.00`. No Provider call, upload, or debit has occurred.

## Next gate

Fund the dedicated FAL account, then use the owner Magic Link (or the real mode
of the one-SKU acceptance harness with an operator session) to complete one
private `9:16` / 5-second / 720p Street Power-Up result with private recovery
and owner-only download. Until that proof exists, production generation and
payments remain closed.

## Frozen

- Public three-output Seller Pack
- Generic Studio and arbitrary prompt/model controls
- Explore, Community, Cinema, batch generation, and marketplace surfaces
- New SEO route expansion and directory campaigns
- Production Provider spend and live Stripe Checkout

## Branch policy

Every new task starts from current `main`; the protected Preview uses
`codex/private-validation` and only branch-scoped secrets. One active task gets
one new branch and one PR. Closed historical PRs are reference material, not
merge candidates.
