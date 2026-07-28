# Blockers request — one consolidated ask for the boss

**Owner:** Grok (T5 / recovery under Codex DISPATCH)  
**Updated:** 2026-07-28  
**Rule:** Keep doing no-cost work; ask once with this list when external input is required.

## T5 最小阻塞（老板一眼看完）

代码侧 T5（引擎、R0 闸门、magic-link fail-closed、退款/幂等回归）已在 PR 分支完成。  
**多节点真登录 + durable 钱包** 仍卡外部，缺下面 **最小信息/动作**（不要贴密钥到聊天，放进 Vercel/Supabase 控制台即可）：

| # | 老板最小动作 | 用途 |
|---|--------------|------|
| A | Supabase 项目 API：`URL` + `anon` + `service_role` 写入 Vercel Production/Preview | 打开 magic link + durable RPC |
| B | SQL Editor 依次执行：`20260723120000_t5_auth_credits.sql` → `20260727213000_r1_atomic_generation_credits.sql` →（可选）`20260727233000_r1c_generation_reconciliation.sql` | 多节点钱包/预留 |
| C | Auth → URL：Site `https://pikbo.ai`，Redirect 含 `https://pikbo.ai/auth/callback` 与本地 callback | 登录回调 |
| D | Auth → Email Magic Link 开启 | 能发信 |
| E |（可选）GitHub token 加 **`workflow` scope**，把 `docs/ci/github-actions-ci.yml` 拷到 `.github/workflows/ci.yml` | live CI fail-closed（R3） |

**不要：** 密钥贴群聊 · 现在开 Stripe · 现在 GO 公网收费。

证据：`docs/evidence/T5_AUTH_CREDITS_SMOKE_2026-07-28.md` · `docs/evidence/T5_R0_CRITICAL_PATH_2026-07-28.md` · PR #40。

## Already unblocked in code (no boss action)

| Item | Status |
|---|---|
| Wave A core video loop | On `main` |
| Wave B generation trust (B1–B5) | On `main` |
| CI workflow | `.github/workflows/ci.yml` present on main (confirm green URL) |
| T5 SQL migration file | `supabase/migrations/20260723120000_t5_auth_credits.sql` |
| T5 pure engine + local durable + shadow on generate | `lib/durableCredits/*` |
| T5 pure-engine smoke + R0 critical-path smoke | `npm run t5-auth-credits-smoke` · `npm run t5-r0-critical-path` (PR #40) |
| Supabase magic-link + claim + guest migrate | Code on main; **keys still boss** — magic-link returns `NOT_CONFIGURED` without them |
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
