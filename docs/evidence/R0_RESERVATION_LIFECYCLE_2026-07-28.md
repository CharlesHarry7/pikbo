# R0 reservation lifecycle (PR #42) — 2026-07-28

**Branch:** `agent/grok/t5-r0-refund-idempotent`  
**Base:** main `e0ab4f0` (#45 active queue)  
**PR:** https://github.com/CharlesHarry7/pikbo/pull/42  
**Worktree:** `~/claude/pikbo-worktrees/r0-net-pr42`

## Codex gate (DISPATCH R0-NET)

| Requirement | Proof |
|-------------|--------|
| capture RPC **throw** → withhold, **0** release backend calls | `r0-safety-net` §7b behavioral |
| capture ok:false → withhold | §7 auto-withhold |
| settle success → release never runs | §2 |
| release ≤1 (concurrent / finally / exception) | §1, §3, §4, §5 |
| real CI runs behavioral test | `docs/ci/github-actions-ci.yml` step `npm run r0-safety-net` (not source regex) |

## Local PASS

`npm run r0-safety-net` · typecheck · lint · recovery-qa · engine-smoke (as available)

## External (not this PR)

T5 multi-node SQL/keys — BLOCKERS A–D. No Stripe/DNS/public GO.

## Live workflow scope note

OAuth cannot update `.github/workflows/ci.yml` from this agent.
`docs/ci/github-actions-ci.yml` includes `npm run r0-safety-net`.
Main already fail-closed via #43. Codex can re-sync template→live after merge if the live workflow step is still missing.
