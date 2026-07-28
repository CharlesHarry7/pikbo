# P0 private live prerequisites — Grok Build (Issue #54)

**Agent:** Grok · Branch `agent/grok/p0-private-live-generation`
**Base:** main `50db8e3`
**Date:** 2026-07-28
**Sanitized prod health sample:** `https://pikbo.ai/api/health` (no secrets)

## Exact missing runtime prerequisites (production snapshot)

From public health (values are presence/booleans only):

| Prerequisite | Pass? | Evidence field |
|---|---|---|
| Authenticated invited user | **NO** | `auth.mode=disabled`, `auth.configured=false` |
| Provider availability | **YES** | `ready.provider=true` / `softLiveChecklist.FAL_KEY=true` |
| Supabase atomic reservation | **NO** | `ready.durableAtomicReservation=false` |
| Durable reconciliation | **NO** | `ready.durableReconciliation=false` |
| Server-owned derivative storage/worker (T6) | **NO** | `t6.status=blocked`, `ready.serverOwnedDeliverable=false` |
| Soft live overall | **NO** | `acceptance.softLive=false`, `missingLiveRequirements` lists auth + durable + delivery |

`acceptance.missingLiveRequirements` on prod:

1. `authConfigured`
2. `durableAtomicReservationConfigured`
3. `durableReconciliationConfigured`
4. `serverOwnedDeliverableConfigured`

## Why the owner saw an astronaut Lab clip

Generate path uses `liveGenerationAccess`. Without auth, access is always:

- `kind: "cached"`, `reason: "anonymous_cached_only"`

Cached success returns `demo: true`, `model: "demo-cached"`, `creditsOutcome: "0 cached"`, and a Lab catalog URL — **not** the uploaded still. That matches the reported UI.

This branch adds honesty fields when an upload was present in cached mode:

- `processedUpload: false`
- `uploadIgnored: true`
- `uploadIgnoredReason: <access.reason>`

## Private-beta path prepared (no production enablement)

Env (see `.env.example`):

- `PIKBO_PRIVATE_LIVE_ENABLED=1`
- `PIKBO_PRIVATE_LIVE_ALLOWLIST=<owner email or user id>`
- `PIKBO_PRIVATE_LIVE_BUDGET_MAX=<per-process admission fuse, e.g. 3>`

Behavior:

- Anonymous still never live (R0)
- Invited Free user + remaining budget → `freeDeliveryReady` true for access gate
- Live still requires durable reserve + provider (no cookie spend)
- Process-local admission fuse consumes before reserve
- Durable wallet/reservation remains the cross-instance spend authority; the
  process-local fuse resets with an instance and must not be described as the
  production budget cap
- Free watermark responses still use `/api/downloads/...` (no raw provider URL)

Health exposes `privateLiveBeta` presence flags only (never the allowlist).

## Integration coverage

`npm run p0-private-live-generation` — pure/behavioral, no FAL spend.

## Boss-only consolidated blockers (ask once)

Do **not** paste secrets into GitHub or chat.

| # | Boss action | Unlocks |
|---|-------------|---------|
| 1 | Approve capped FAL spend for private beta | Real provider calls |
| 2 | Set Vercel env: Supabase URL/anon/service_role + `SESSION_SECRET` + existing `FAL_KEY` | Auth + durable |
| 3 | Apply T5 + R1 (+ R1c) SQL in non-prod then prod | Atomic reserve/capture/release |
| 4 | Set `REQUIRE_DURABLE_CREDITS=1`, `PIKBO_R1_ATOMIC_RESERVATION_READY=1`, `PIKBO_R1_RECONCILIATION_READY=1` only after non-prod proof | Soft-live durable flags |
| 5 | Configure private object storage + ffmpeg worker; set T6 env per `docs/ops/T6_NON_PROD_REHEARSAL.md` | Free downloadable derivative |
| 6 | Set `PIKBO_PRIVATE_LIVE_ENABLED=1`, allowlist owner, `BUDGET_MAX` (small) | Invited Free live access gate |
| 7 | Deploy private preview and approve owner login test | End-to-end acceptance |

**Not requested:** Stripe live · public paid generation · DNS · uncapped spend · anonymous live.

## 2026-07-28 recovery-race closure — PR #56

This follow-up closes the remaining slow-response race without making a paid
provider request or changing Preview/production state.

### Root cause

The first recovery implementation correctly ignored an early batch of four
failed/404 reads, but it still let the bounded recovery poll settle as
non-authoritative. A later 15-second fallback then aborted the still-healthy
original `/api/generate` request. The failure moved from roughly 27 seconds to
roughly 200 seconds; it was not eliminated.

### Enforced rule

- Only a saved owner-only private result, or a durable `failed` state with a
  confirmed release transaction, may win recovery and abort the stale primary
  response.
- `not_found`, database unavailable, auth failure, transport failure, and
  `canceled` without confirmed refund never cancel or replace the primary.
- When recovery is non-authoritative, the original POST stays authoritative
  until it settles or the user explicitly cancels.
- Recovery reuses the same idempotency key and is GET-only; it cannot reserve
  credits, create another provider job, or debit a second time.

### Executable evidence

- `npm run p0-private-live-generation` covers all five non-authoritative
  recovery outcomes above and proves zero primary aborts before the eventual
  primary success. It separately proves a saved durable result can win safely.
- `npm run typecheck`
- `npm run lint`
- `npm run recovery-qa`
- `npm run recovery-ledger`
- `npm run recovery-retry-deadline`
- `npm run recovery-reconciliation`
- `npm run r0-safety-net`
- `npm run engine-smoke`
- `next build --webpack`: 194/194 routes generated, including
  `/api/generations/recover`.

All checks passed locally with the bundled workspace Node runtime. No provider
call, environment-variable change, Supabase mutation, Stripe action, DNS
change, merge, or production deployment was performed during this closure.

## 2026-07-28 non-destructive long-wait acceptance — PR #56

Grok Build produced isolated commit `55cf25a` on
`agent/grok/p0-recovery-audit`. Codex reviewed and integrated it on top of the
latest deduplicated recovery tests.

### Acceptance contract

- `Open Library · keep generating` is hidden for Live work until 90 seconds,
  unless durable recovery has already reported `awaiting_primary`.
- Detach uses `router.push("/library")` and does not abort primary/recovery,
  cancel the ledger, or start a second generate.
- Ordinary React unmount is non-destructive. Only the explicit
  `Cancel generation` button aborts the caller signal; `cancelForUser` then
  aborts primary/recovery and performs the best-effort ledger cancel.
- `onInconclusiveRecovery` reports state only. An observer exception is caught
  and the eventual original primary response still wins.
- Background success writes a controlled Library item and never stores an
  uploaded Base64 still over 8 KB. A same-tab event refreshes an already-open
  Library; a page refresh independently lists Supabase results through
  authenticated `userId` ownership and `/api/downloads/{jobId}`.

### Codex review corrections

- Removed the unnecessary recovery-policy re-export from `generateClient`.
- Removed a duplicate desktop spinner/cancel panel and kept the shared
  `GenerateWaitStage`.
- Preserved the latest single non-authoritative `GENERATION_FAILED` case and
  the single refunded-failure exact-abort case.
- Added executable coverage for observer exceptions, explicit cancel wiring,
  same-tab Library notification and owner-only durable listing.

### Verification

PASS: TypeScript, ESLint, `p0-private-live-generation`, `recovery-qa`,
`recovery-ledger`, `recovery-retry-deadline`, `recovery-reconciliation`,
`r0-safety-net`, `engine-smoke`, `mobile-proof-regression`, and Next 16.2.11
Webpack build with 194/194 generated routes.

No paid/provider call, environment mutation, database write, Stripe/DNS action,
production deploy or merge occurred. Preview private-live remains closed by the
existing acceptance gate (`enabled=false`, `budgetMax=0`).
