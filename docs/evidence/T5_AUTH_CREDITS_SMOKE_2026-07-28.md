# T5 Auth + durable credits smoke — 2026-07-28

**Agent:** Grok  
**Commander:** Codex (DISPATCH 2026-07-28)  
**Branch:** `agent/grok/t5-auth-credits-smoke`  
**Repo:** https://github.com/CharlesHarry7/pikbo  

## Scope (DISPATCH Grok #1)

Code-side T5 finish: pure durable engine contract + auth fail-closed defaults + migration source locks.  
**Not** claimed: applying SQL on Supabase, Vercel env keys, multi-node production wallets.

## Command

```bash
npm run t5-auth-credits-smoke
# → node --experimental-strip-types scripts/t5-auth-credits-smoke.mjs
```

## Local result (2026-07-28)

| Check | Result |
|-------|--------|
| create/grant/reserve/settle/release | PASS |
| idempotent settle (no double lifetime) | PASS |
| insufficient reserve fail-closed | PASS |
| guest migrate once; second=0 | PASS |
| non-empty durable discards cookie migrate | PASS |
| expire stale → status `expired` | PASS |
| `authConfig` disabled without keys | PASS (source) |
| T5 + R1 SQL files present | PASS |
| liveReservation no `deductCredits(session` | PASS |
| generate route capture-fail honesty | PASS (source) |
| `recovery-qa` | PASS |
| `engine-smoke` | PASS |

## CI

- Template: `docs/ci/github-actions-ci.yml` includes `npm run t5-auth-credits-smoke`
- Live `.github/workflows/ci.yml` still lags (OAuth lacks `workflow` scope) — same boss action as R3 PR #37

## Boss remaining for T5 multi-node

See `docs/BLOCKERS_REQUEST.md` §2 (SQL apply + Auth URL + keys on Vercel).
