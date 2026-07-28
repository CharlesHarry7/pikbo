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
