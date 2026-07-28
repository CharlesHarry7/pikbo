# R0 reservation lifecycle capture-safety review — 2026-07-28

**Branch:** `agent/gpt/r0-capture-safety-review`
**Base:** main `e0ab4f0` (#45)
**PR:** https://github.com/CharlesHarry7/pikbo/pull/47

## Guarantees (behavioral tests in `npm run r0-safety-net`)

| Rule | Test |
|------|------|
| Release backend ≤1 | double release + safety-net after release |
| Settled never releases | settle then release/safety-net → 0 backend |
| Concurrent release | 20 parallel explicit/finally releases → 1 backend |
| Capture exception is withheld | generate + image adapters: settle throws → 0 release calls |
| Release exception is honest | throw in release backend → `release_pending`, second skip |
| Timeout race | slow release + safety-net share one call |
| Withhold blocks release | failed settle immediately enters `withheld` → 0 release |
| Failed release still once | `ok:false` enters `release_pending`; reconciliation helper records the event |

## Route wiring

- `app/api/generate/route.ts` + `app/api/image/route.ts` use `createReservationLifecycle`
- failed or thrown capture becomes `withheld` inside the lifecycle before generic error handling can release
- late completion closes the release path before reconciliation I/O
- finally uses the route reconciliation helper; a failed safety-net release is not silently discarded
- both the template and real `.github/workflows/ci.yml` run the behavioral test

## Local CI suite (no `|| true`, no FAL, no Supabase prod)

All PASS: r0-safety-net · t5-auth-credits-smoke · t5-r0-critical-path · recovery-qa · recovery-ledger · recovery-retry-deadline · recovery-reconciliation · typecheck · lint (0 errors) · 193-route production build.

## Boss external (unchanged)

T5 multi-node still needs Supabase keys + SQL (BLOCKERS A–D). No Stripe/DNS/public GO.

## CI note

The branch adds `npm run r0-safety-net` to the real workflow. Merge remains blocked until the resulting GitHub Actions run is green.
