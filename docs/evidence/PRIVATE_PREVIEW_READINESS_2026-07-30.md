# Private Preview readiness — 2026-07-30

## Decision

Production remains closed. This change does not enable live generation,
payments, provider spend, authentication, database migrations, or private-beta
flags.

The previous `ready.privatePreview` value could report `true` even when the
real generate route would reject provider spend because the deployment
environment, validation budget, or provider-budget RPC was unavailable. The
account response also checked fewer prerequisites than health and the real
route.

Health and account UI now share one fail-closed private Preview readiness
decision. An invited account can see real-generation UI only when its
account-level admission and every global prerequisite are both ready.

## Capability matrix

| Capability | Code exists | Preview verified | Production enabled | Remaining prerequisite |
|---|---|---|---|---|
| Supabase authentication | Yes | Partial source/fixture evidence | No | Configure the deployment and prove the invited-account callback |
| Atomic credit reservation | Yes | SQL rollback/fixture evidence | No | Apply reviewed migrations and rehearse the deployed RPCs |
| Fixed 30-credit / three-child Pack | Yes | Contract and rollback evidence | No | One real same-input Pack in protected Preview |
| Durable reconciliation | Yes | Lease/race rollback evidence | No | Deploy worker scheduling and prove cross-instance recovery |
| Provider validation budget | Yes | Source and rollback evidence | No; production is hard-closed | Preview opt-in, budget, tables and reserve RPC |
| Private result storage | Yes | Single-clip source/fixture evidence | No | Private bucket, output columns, attach-v2 RPC and owner download proof |
| Library recovery | Yes | Source/fixture evidence | No | Refresh, re-login and three-output recovery in protected Preview |
| Stripe entitlement | Yes | Test fixture/rollback evidence | No | Networked test Checkout/webhook rehearsal and KYC |
| Readiness truth | Yes | Pure matrix and source contracts pass | No | Deploy this change; missing requirements remain explicit |

`Preview verified` never means that a complete external three-video Pack has
already passed. Database rollback tests, local fixtures, and source contracts
are not promoted to real Provider, Storage, Stripe, or cross-instance proof.

## Shared private Preview prerequisites

The readiness function requires every item below:

1. Auth configured and reachable.
2. Supabase atomic reservation enabled, writable, and schema-ready.
3. Durable reconciliation enabled and schema-ready.
4. Provider key configured.
5. Private output bucket exists and is not public.
6. Required `generation_jobs` private-output columns exist.
7. The attempt-fenced private-output attach RPC exists.
8. Provider output-host allowlist is configured.
9. Private live mode, invite allowlist, and process fuse budget are configured.
10. The deployment environment explicitly permits provider validation.
11. The non-production provider validation budget is greater than zero.
12. Provider-budget tables and the reserve RPC are ready.

The per-user route still independently checks authentication, invitation,
remaining private budget, durable wallet, plan/delivery eligibility, and
credits. `/api/generate` remains the final spend authority.

## Probe safety

The readiness probes do not create a reservation, output, job, or Storage
object:

- `pikbo_reserve_provider_spend_v1` is invoked with `p_user_id = null`; the
  reviewed SQL returns `AUTH_REQUIRED` before budget reads or writes.
- `pikbo_attach_private_generation_output_v2` is invoked with null identity;
  the reviewed SQL returns `INVALID_IDENTITY` before job reads or writes.

Any missing table, column, function, unexpected response, or network error
keeps private Preview closed.

The output-host prerequisite is not a non-empty-string check. Readiness and
delivery use the same hostname-only parser. A scheme, port, path, query,
fragment, credentials, wildcard, underscore, space, empty label or segment,
hyphen boundary, trailing dot, single-label name, localhost name, IP-shaped
value, overlong label/name, or any mixed valid/invalid list invalidates the
whole configuration. This prevents a malformed allowlist from admitting
Provider spend and rejecting the result only after the paid call.

## Verification

Passed locally:

- `npm run capability-matrix`
- `npm run p0-private-live-generation`
- `npm run provider-budget-regression`
- `node scripts/health-truth-contract.mjs` (`32/32`)
- `npm run live-copy-smoke`
- `npm run seo-cold-start-smoke`
- `npm run engine-smoke`
- `npm run seller-pack-atomic-regression`
- `npm run recovery-ledger`
- `npm run recovery-reconciliation`
- `npm run stripe-billing-regression`
- `npm run typecheck`
- `npm run lint`
- `npm run build -- --webpack` (`196/196` routes)

The default Turbopack build could not bind its internal helper port inside the
local managed sandbox. GitHub CI runs the exact `npm run build` command in its
normal runner and is the authoritative release build gate.

## Independent review

- Grok reproduced the false-ready combinations and returned **BLOCKER** before
  the fix: `019fb390-b1dd-75a3-a13b-599d8d3e44bc`.
- GPT Pro reviewed the frozen behavior, including both null-identity RPC
  probes, and returned **APPROVE** in the persistent Pikbo audit chat
  `6a6b4960-4dcc-83e8-8404-b5cb6748abf6`.
- WorkBuddy inspected the local diff and live `/api/health`, `/api/me`, and
  `/create`, then returned **APPROVE** with no P0 correction:
  `pikbo-private-preview-readiness-final-20260730-wb2`.
- GitHub's automated review then found that a malformed but non-empty
  provider-output allowlist could still report ready. The final delta makes
  readiness and runtime enforcement share one strict fail-closed parser.
- Grok returned **APPROVE** for that frozen delta:
  `019fb3ef-62ed-7653-9ba7-4669c3f66f4c`.
- GPT Pro returned **APPROVE** for the same delta in the persistent Pikbo chat
  `6a6b4960-4dcc-83e8-8404-b5cb6748abf6`.
- WorkBuddy returned **APPROVE** and `No P0 blockers.` after checking the
  parser matrix, every runtime caller, the pre-fetch output guard, accounting
  boundaries, and the public cached path:
  `pikbo-pr90-allowlist-final-delta-20260731-wb1`.

## Next execution

After this change is merged, the next no-secret task is the executable private
seller trial runbook: one invited account, one owned toy image, the fixed
three-video Pack, owner-only Library recovery/download, and exact accounting
evidence. It does not enable production; it makes the first protected
end-to-end rehearsal deterministic once the external prerequisites exist.
