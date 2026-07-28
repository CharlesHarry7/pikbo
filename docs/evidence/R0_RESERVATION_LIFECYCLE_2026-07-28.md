# R0 reservation lifecycle (PR #42) — 2026-07-28

**Branch:** `agent/grok/t5-r0-refund-idempotent`  
**Base:** main `6db8e68` (#43)  
**PR:** https://github.com/CharlesHarry7/pikbo/pull/42

## Guarantees (behavioral tests in `npm run r0-safety-net`)

| Rule | Test |
|------|------|
| Release backend ≤1 | double release + safety-net after release |
| Settled never releases | settle then release/safety-net → 0 backend |
| Concurrent release | 3 parallel releases → 1 backend |
| Exception terminal | throw in backend → phase released, second skip |
| Timeout race | slow release + safety-net share one call |
| Withhold blocks release | failed settle + markWithheld → 0 release |
| Failed release still once | ok:false still terminal |

## Route wiring

- `app/api/generate/route.ts` + `app/api/image/route.ts` use `createReservationLifecycle`
- capture fail / late completion → `markWithheld` (finally must not free a paid clip)
- finally → `safetyNetRelease()` only

## Local CI suite (no `|| true`, no FAL, no Supabase prod)

All PASS: r0-safety-net · t5-auth-credits-smoke · t5-r0-critical-path · recovery-qa · recovery-ledger · recovery-retry-deadline · recovery-reconciliation · seller-pack-cached-smoke · seo-cold-start-smoke · showcase-evidence-smoke · live-copy-smoke · engine-smoke · typecheck · lint (0 errors)

## Boss external (unchanged)

T5 multi-node still needs Supabase keys + SQL (BLOCKERS A–D). No Stripe/DNS/public GO.

## CI note

`docs/ci/github-actions-ci.yml` includes `npm run r0-safety-net`.
Live `.github/workflows/ci.yml` push requires GitHub `workflow` scope; after merge Codex can re-sync template→live if needed (main #43 already fail-closed).
