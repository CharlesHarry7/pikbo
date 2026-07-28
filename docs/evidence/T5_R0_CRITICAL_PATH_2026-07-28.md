# T5 + R0 critical path — 2026-07-28

**Agent:** Grok · **Commander:** Codex
**Branch:** `agent/grok/t5-auth-credits-smoke` (PR #40)
**Command:** `npm run t5-r0-critical-path`

## Priority coverage

| DISPATCH item | How verified |
|---------------|--------------|
| T5 durable credits | Pure engine reserve → release (fail refund) and reserve → settle (idempotent) |
| R0 anonymous cost gate | `liveGenerationAccess` + generate/image route source locks; provider never without reservation |
| Failure refund honesty | `releaseStrictLiveGeneration` / `creditsRefunded` / `refundUnconfirmed` on generate fail paths |
| Idempotency | `findJobByIdempotencyKey` + engine settle same key |
| Auth without keys | magic-link `NOT_CONFIGURED` 503 |

## Local PASS (2026-07-28)

- `npm run t5-r0-critical-path` → PASS
- `npm run t5-auth-credits-smoke` → PASS
- `npm run recovery-qa` → PASS

## Boss blockers (multi-node T5 incomplete without these)

See **`docs/BLOCKERS_REQUEST.md`** top section **T5 最小阻塞 A–E**:

1. Supabase URL + anon + service_role on Vercel
2. Apply T5 + R1 (+ optional R1c) SQL in Supabase
3. Auth callback URLs
4. Email magic link enabled
5. Confirm the synchronized GitHub Actions workflow finishes green

**Do not paste secrets into chat.**
