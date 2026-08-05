# Production ship checklist

**Audience:** Multica / Grok agents shipping to `pikbo.ai`
**Hard constraints:** Vercel deploy budget · health `softLive` honesty · no fake UGC

This is the executable ops contract for a production-safe handoff. Prefer a
merge-ready PR over burning deploy quota. Soft-live / production is allowed only
when the product path is honest and private gates hold.

## Before any work session

1. Start from fresh `origin/main` (or continue one existing PR branch — do not
   open parallel spam PRs for the same outcome).
2. Read `docs/CURRENT_LAUNCH_CONTRACT.md` and `docs/STATUS.md`.
3. Run the offline gate (no deploy, no secrets required):

```bash
npm run production-ship-checklist
# offline only:
SKIP_REMOTE=1 npm run production-ship-checklist
```

## Vercel budget (HARD — no exceptions)

Counter file: `~/.multica/mission/vercel-deploy-count.day`
Host tool: `vercel-budget` · in-repo: `npm run vercel-budget -- {check|status|add}`
Usable max: **8 deploys / UTC day** (leave headroom under ~10 free).

| Step | Command | When |
|------|---------|------|
| Check | `npm run vercel-budget -- check` | **Before** any `vercel` CLI, force production promote, or intentional prod deploy |
| Status | `npm run vercel-budget -- status` | Anytime |
| Add | `npm run vercel-budget -- add` | **Only after** a successful deploy |

Rules:

- Exit code `1` from `check` → **do not deploy**. Ship the PR only.
- Batch commits → **one `git push` per session** so Git-integration previews do
  not burn the day.
- Prefer merge-to-main (controlled Git deploy) over `vercel --prod` spam.
- Never run `vercel` “just to see”; never loop deploys to “fix green”.

Mission policy: `~/.multica/mission/SHIP_AND_DEPLOY.md`.

## Health `softLive` public truth

Authoritative probe: `GET /api/health` (production: `https://pikbo.ai/api/health`).

Public soft-live is an **all-five AND**. A provider key or session secret alone
must never advertise live:

1. `authConfigured`
2. `durableAtomicReservationConfigured`
3. `durableReconciliationConfigured`
4. `providerConfigured`
5. `serverOwnedDeliverableConfigured`

When `ready.softLive === false` (current honest production default):

| Field | Required honesty |
|-------|------------------|
| `ready.mode` | `validation` or `cached-only` |
| `ready.paid` | `false` |
| `acceptance.softLive` | `false` |
| `billing.freeTrial.available` | `false` |
| `billing.freeTrial.scope` | `cached-demo-only` |
| `billing.freeTrial.clipsPerPeriod` | `0` |

When `ready.softLive === true` (only after all five gates + product proof):

| Field | Required honesty |
|-------|------------------|
| `ready.mode` | `live-generate` |
| `billing.freeTrial.available` | `true` |
| `billing.freeTrial.scope` | `video-create-only` |
| `billing.freeTrial.clipsPerPeriod` | `1` |

Offline pure contract:

```bash
npm run health-truth-contract
```

Remote honesty (also part of `npm run production-ship-checklist`):

```bash
BASE=https://pikbo.ai npm run production-ship-checklist
# Fail if production still closed:
REQUIRE_SOFT_LIVE=1 BASE=https://pikbo.ai npm run production-ship-checklist
```

`REQUIRE_SOFT_LIVE=1` is **not** the default. Default ship accepts honest
`softLive=false` on production.

## Product honesty (never ship without)

- No fake UGC / invented community posts / simulated seller results.
- Guests stay on labeled cached Lab prototypes; upload not processed.
- Public generate + Stripe stay fail-closed until launch contract gates pass.
- Private invite path is independent; never open anonymous provider spend.
- Secrets stay out of the repo.

## Code change ship path (agents)

```text
1. Implement on one short-lived branch
2. Run relevant unit/regression scripts + typecheck as needed
3. npm run production-ship-checklist   # or SKIP_REMOTE=1 if offline
4. npm run vercel-budget -- check
5. If budget blocked → open/update PR only (one push)
6. If budget allows AND change is main-worthy Moment/HF path → optional one prod
   deploy after merge, then npm run vercel-budget -- add
7. Multica: comment with PR URL; open next atomic issue
```

## Related scripts

| npm script | Role |
|------------|------|
| `production-ship-checklist` | Full offline + remote honesty gate (no deploy) |
| `vercel-budget` | Deploy quota gate |
| `health-truth-contract` | Pure softLive all-five contract |
| `softlive-checklist` | Env presence checklist (health remains authoritative) |
| `mode-a-acceptance` | Broader Mode A acceptance against a BASE |
| `critical-path` | Page + health smoke against a BASE |
| `preflight-launch` | Local build/typecheck/engine-smoke |

## Snapshot (operator, 2026-08-05 UTC)

Production `https://pikbo.ai/api/health` observed:

- `ok=true`, `mode=validation`, `ready.softLive=false`, `ready.paid=false`
- Missing public live requirement: `serverOwnedDeliverableConfigured`
- Free trial: `available=false`, `scope=cached-demo-only` — honest

That state is a **PASS** for soft-launch honesty, not a reason to force-open live.
