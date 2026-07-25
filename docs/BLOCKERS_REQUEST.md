# Blockers request — one consolidated ask for the boss

**Owner:** Grok (Wave C durable auth / CI)  
**Updated:** 2026-07-26  
**Rule:** Keep doing no-cost work; ask once with this list when external input is required.

## Already unblocked (do not re-ask)

| Item | Status |
|---|---|
| Supabase Email provider | **Done** — enabled |
| Confirm email | **Done** — enabled |
| Site URL = `http://localhost:3000` | **Done** |
| Redirect URL = `http://localhost:3000/auth/callback` | **Done** |
| Local Supabase / FAL / Session env vars | **Done** — present locally |
| Wave A core video loop | On `main` |
| Wave B generation trust (B1–B5) | On `main` |
| T5 table migration file | `supabase/migrations/20260723120000_t5_auth_credits.sql` |
| T5 credit RPC migration file | `supabase/migrations/20260726120000_t5_credit_rpcs.sql` |
| G6 3 live Mini + refund | **PASS** — `docs/evidence/G6_LAUNCH_LOG.md` |
| Seller Pack shadow reserve 30 / child 10 | On `main` |
| Mode A deploy runbook | `docs/LAUNCH_MODE_A.md` |
| CI false-green fix (code) | Wave C: single step start+link-check+critical-path, no `\|\| true` |

## Needs boss (secrets / SQL apply / deploy)

### 1. Apply T5 SQL migrations in Supabase SQL Editor

- **Why:** `/api/health` currently reports `schemaReady=false` / `transactionReady=false` when tables or RPCs are missing (or project URL was mis-pasted with `/rest/v1`). Production wallets need Postgres + transactional RPCs.
- **Ask:** Run in order (do not paste keys into chat):
  1. `supabase/migrations/20260723120000_t5_auth_credits.sql` (tables)
  2. `supabase/migrations/20260726120000_t5_credit_rpcs.sql` (FOR UPDATE RPCs)
- **Done when:** health shows `durableCredits.backend=supabase`, `schemaReady=true`, `transactionReady=true`, `ready.durableCredits=true`.

### 2. schemaReady=false root causes (ops diagnosis — no new secrets)

| Cause | How to recognize | Fix |
|---|---|---|
| Migration not applied | REST 404 / PGRST205 on `credit_wallets` | Apply SQL #1 |
| URL construction error | warning ≈ `Invalid path specified in request URL` | Project URL must be `https://<ref>.supabase.co` only — strip `/rest/v1` / `/auth/v1` (code now normalizes) |
| service-role ≠ project | 401/JWT audience errors | Service role key from same project as URL |
| Tables OK, RPCs missing | `schemaReady=true`, `transactionReady=false`, code `RPC_MISSING` | Apply SQL #2 |
| Probe/network error | code `PROBE_ERROR` / `ADMIN_INIT` | Check URL host + service role presence only (never log keys) |

Errors return **codes only** — never Key, Cookie, or Authorization values.

### 3. Vercel private preview (Mode A)

- **Why:** Shareable softLive URL for G4/G7.
- **Ask:** `vercel login` (or grant access) + env on Preview/Prod: `SESSION_SECRET`, `FAL_KEY`, Supabase URL/anon/service role, `NEXT_PUBLIC_PAYMENTS_ENABLED=0`. Optionally set `PIKBO_DURABLE_BACKEND=supabase` or `REQUIRE_DURABLE_CREDITS=1` after migrations.
- **Done when:** Preview URL + health recorded in HANDOFF.

### 4. GitHub Actions green URL

- **Why:** T23 done only with a real green Actions run URL.
- **Ask:** After Wave C PR merges (or on branch push with `workflow` scope), attach green run URL to HANDOFF.

### 5. Optional later (do not block Mode A)

| Item | Need |
|---|---|
| Stripe **test** keys + Price IDs | Phase I only; no live charge |
| `SUPABASE_AUTH_GOOGLE=1` + Google provider | Optional OAuth |
| Public DNS `pikbo.ai` | **Separate explicit approval** after Mode B gates |
| ffmpeg / media worker for T6 bake | Free raw download stays blocked until then |
| `VIDEO_PROVIDER_WEBHOOK_SECRET` | Required in production before async provider webhooks |

## Explicitly NOT requested

- Live Stripe charges  
- Public DNS cutover without Mode B green  
- Unlimited generation  
- Copying Higgsfield content  
- More fal spend (G6 already PASS)  
- Re-configuring Email / localhost callback (already done)

## Next code work without new secrets

1. Wave C PR: CI honesty, credit RPCs, fail-closed, signed-in wallet cutover, smoke tests.  
2. After boss applies SQL #1+#2: prove cross-browser balance + mark T5 review.  
3. T6 file watermark when worker/ffmpeg available.  
4. Stripe test-mode only after durable Postgres + boss test keys.
