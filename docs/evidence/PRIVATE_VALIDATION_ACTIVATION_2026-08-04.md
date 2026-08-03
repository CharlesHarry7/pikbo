# Private validation activation — 2026-08-04

This record contains no secret values, customer assets, email addresses, or
Provider responses.

## Outcome

- Created the dedicated Git branch `codex/private-validation` from
  `main@25b7f67`.
- Corrected the non-production Supabase origin to project
  `lpfvfybkggiugosugfcw` and added branch-only anon/service credentials.
- Created a dedicated Supabase secret API key for this validation branch.
- Added fresh branch-only session and internal-worker secrets.
- Added branch-only durable-credit, atomic reservation, reconciliation,
  private-live, strict Provider-host, Preview-validation and one-job budget
  gates. `PIKBO_PROVIDER_VALIDATION_BUDGET_USD=2` is below the fixed US$20
  ceiling.
- The non-secret validation switches are
  `PIKBO_PREVIEW_PROVIDER_VALIDATION_ENABLED=1`,
  `PIKBO_PROVIDER_VALIDATION_MODE=1`, and
  `PIKBO_PROVIDER_OUTPUT_HOST_ALLOWLIST=fal.media`.
- `PIKBO_SERVER_OWNED_JOBS`, `PIKBO_DEV_TOPUP`, and
  `PIKBO_FORCE_GENERATE_FAIL` were not enabled.
- Explicitly kept public payments, live payments, Stripe readiness, refund
  guard, development upgrade and the old T6 worker off on this branch.
- Reused the existing non-production database objects proven by the recorded
  SQL Editor rehearsals. Dashboard inspection confirmed the current private
  input/result buckets and the required generation, attachment,
  reconciliation, Provider-budget and Pack RPCs.
- Bootstrapped the existing owner account idempotently with one personal
  account, a 10-credit non-production wallet, owner membership and
  `live_generation_allowed=true`.
- Added the exact protected Preview callback URL to Supabase Auth.
- Created a dedicated FAL API key and scoped it only to
  `codex/private-validation`.

## Remaining hard gates

1. The separate `codex/private-validation-auth` code change that adds the
   exact Preview origin must be merged, then the protected
   `codex/private-validation` branch must advance to that merged commit.
2. Vercel must produce a fresh protected-branch deployment after the current
   daily deployment quota clears; old deployments do not receive the new
   branch environment.
3. The FAL account reports a current balance of `$0.00`. No real Provider call
   was attempted. A real owned-photo proof remains blocked until that account
   has enough balance for one 5-second Fast 720p request.
4. The redeployed `/api/health` must be green before any photo upload or model
   request. Production Provider validation and Stripe remain hard-closed.

## Verification

- `live-copy-smoke`, `seo-cold-start-smoke`,
  `auth-magic-link-regression`, `engine-smoke`,
  `seller-pack-atomic-regression`, `recovery-ledger`,
  `recovery-reconciliation`, `stripe-billing-regression`, `typecheck` and
  `lint`: passed.
- The default local Turbopack build was blocked only because this workspace's
  `node_modules` symlink points outside Turbopack's filesystem root.
  `next build --webpack` compiled, typechecked and generated all 201 pages.
- Grok Preview gate/environment red-team session:
  `c34e4a96-a0dd-4d13-9463-0d0f095c1fa4`.
- Grok current exact-origin auth red-team session:
  `fa451c02-4739-410d-9d98-e5f67134235e`.
- Luna produced the exact health/env/migration matrix. WorkBuddy had no
  callable endpoint, so no session ID was fabricated; Vercel and Supabase were
  inspected directly in the authenticated browser.

The owner wallet, Supabase callback setting, FAL key and FAL balance are
operator-observed dashboard facts, not repository-test assertions. They still
require a fresh protected-branch deployment and green runtime health proof.
