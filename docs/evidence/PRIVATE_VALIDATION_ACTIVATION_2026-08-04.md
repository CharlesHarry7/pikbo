# Private validation activation — 2026-08-04

This record contains no secret values, customer assets, email addresses, or
Provider responses.

## Current deployment state

- `main@e50945c` is deployed at `https://pikbo.ai` and was operator-verified.
  Production remains hard-closed: its health contract is `validation`,
  `softLive=false`, and `paid=false`.
- The protected `codex/private-validation` Preview is deployed at
  `https://pikbo-git-codex-private-validation-pi-kbo.vercel.app` and was
  operator-verified. Repeat `/api/health` probes are green with
  `privatePreviewReadiness.ready=true` and no missing requirements.
- The dedicated FAL dashboard currently shows a balance of `$0.00`
  (operator-observed). No Provider call, Provider upload, or Provider debit has
  occurred, and no real Moment result is claimed.

## Validation boundary

- The protected Preview uses branch-only Supabase credentials, private-live
  allowlisting, durable-credit and reconciliation gates, a one-job budget, and
  Stripe-off overrides. No secret values are recorded here.
- The branch-only owner account, non-production wallet, Supabase callback, FAL
  key, and FAL balance are dashboard facts observed by an operator, not
  repository-test assertions.
- Public upload, production Provider validation, live payments, and Stripe stay
  disabled.

## Next gate

1. Fund the dedicated FAL account.
2. Use the owner Magic Link on the protected Preview.
3. Complete one private Street Power-Up result at `9:16`, 5 seconds, and 720p,
   then verify private recovery and owner-only download.

Retry, accounting, privacy, and any billing proof remain after that single
result. Until the result exists, production generation and payments remain
closed.

## Verification

- `npm run auth-magic-link-regression` — PASS, including trusted and hostile
  origin handling plus the exact Street Power-Up next path.
- `git diff --check` — PASS.
- Production deployment, protected Preview deployment, and repeat protected
  Preview health probes are operator-observed runtime facts.
- Grok exact-origin/auth regression review session:
  `fa451c02-4739-410d-9d98-e5f67134235e`.

The Grok session above is recorded only for the exact-origin/auth regression
scope. It is not evidence of a Provider call, upload, debit, or generated
Moment.
