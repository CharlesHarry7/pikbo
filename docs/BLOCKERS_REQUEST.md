# Blockers request — one consolidated ask for the boss

**Owner:** Grok (final takeover)  
**Updated:** 2026-07-24  
**Rule:** Keep doing no-cost work; ask once with this list when external input is required.

## Already unblocked in code (no boss action)

| Item | Status |
|---|---|
| Wave A core video loop | On `main` |
| Wave B generation trust (B1–B5) | On `main` |
| CI workflow | `.github/workflows/ci.yml` present on main (confirm green URL) |
| T5 SQL migration file | `supabase/migrations/20260723120000_t5_auth_credits.sql` |
| T5 pure engine + local durable + shadow on generate | `lib/durableCredits/*` |
| Supabase magic-link + claim + guest migrate | Keys in local env; code on main |
| G6 3 live Mini + refund | **PASS** — `docs/evidence/G6_LAUNCH_LOG.md` |
| Seller Pack shadow reserve 30 / child 10 | On `main` |
| Phase D local jobs, download gate, cancel, upload-url, webhook | On `main` |
| Mode A deploy runbook | `docs/LAUNCH_MODE_A.md` |

## Needs boss (secrets / spend / login / DNS)

### 1. Vercel private preview (Mode A)

- **Why:** Public crawl + softLive on a shareable URL; G4/G7 final check.
- **Ask:** `vercel login` (or grant project access) and set env on Preview/Prod:
  - `SESSION_SECRET`, `FAL_KEY`
  - `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_PAYMENTS_ENABLED=0`
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-…` after the owner creates or selects the
    Pikbo GA4 web data stream (public measurement ID only; never invent one)
- **Then:** Deploy; run `BASE_URL=https://….vercel.app npm run link-check` + health.
- **Done when:** Preview URL + green health `ready.softLive` (or honest demo) recorded in HANDOFF.

### 2. Supabase SQL migration apply

- **Why:** Local file durable ledger is not multi-node; production wallets need Postgres.
- **Ask:** In Supabase SQL Editor, run  
  `supabase/migrations/20260723120000_t5_auth_credits.sql`  
  (or approve CLI with service role — do not paste keys into chat).
- **Also:** Auth → URL config for Vercel + localhost `/auth/callback`.
- **Email provider:** Enable Email (magic link) / SMTP so login delivers.

### 3. GitHub Actions green URL (if not already)

- **Why:** Confirm CI runs on `main` after workflow install.
- **Ask:** One green Actions run URL for `main` if CI is still yellow/missing.

### 4. Optional later (do not block Mode A)

| Item | Need |
|---|---|
| Stripe **test** keys + Price IDs | Phase I only; no live charge |
| `SUPABASE_AUTH_GOOGLE=1` + Google provider | Optional OAuth |
| Public DNS `pikbo.ai` | **Separate explicit approval** after Mode B gates |
| ffmpeg / media worker for T6 bake | Free raw download stays blocked until then |
| `VIDEO_PROVIDER_WEBHOOK_SECRET` | **Required in production** before async provider webhooks (unsigned POSTs return 503) |

## Explicitly NOT requested

- Live Stripe charges  
- Public DNS cutover without Mode B green  
- Unlimited generation  
- Copying Higgsfield content  
- More fal spend (G6 already PASS)

## Next code work without new secrets

1. Mode A polish after Vercel URL exists (deployed link-check evidence).  
2. ~~Supabase Postgres adapter~~ — code on main (`lib/durableCredits/supabaseStore.ts`); activates when T5 migration is applied.  
3. T6 file watermark when worker/ffmpeg available.  
4. Stripe test-mode wiring only after durable Postgres + boss test keys.
