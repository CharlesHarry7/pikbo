# Pikbo — AI toy video generator

**Public site:** [https://pikbo.ai](https://pikbo.ai) · validation mode · payments off

Turn **one rights-owned photo** of a designer toy, figure, or blind box into
three private launch videos for listings and social posts.

```text
Owned SKU photo → Listing Spin 1:1 + Blind-box Reveal 9:16 + Social Flash 9:16
```

Anonymous and ordinary Free visitors receive labeled cached prototypes; their
upload is not processed. Real generation is restricted to invited,
authenticated non-production validation accounts. It requires an atomic
Supabase reservation, Seedance Fast 720p/5s, private Pikbo Storage, an
owner-only signed download, and server-side settlement. Production Stripe and
public live generation remain closed until the documented quality, privacy,
accounting, margin, and target-buyer Beta gates pass.

## Try
1. Open [pikbo.ai/create](https://pikbo.ai/create)  
2. Confirm you own the photo  
3. Preview a labeled cached example; invited validation accounts can run the
   private Launch Pack

## Stack
- **Next.js 16** (App Router) + **Tailwind v4**
- **ByteDance Seedance Fast** via fal.ai, pinned to 5 seconds / 720p for
  non-production validation
- **Supabase Auth + Postgres** for accounts, atomic credits, Pack jobs,
  provider-budget authority, and Stripe idempotency
- **Private Supabase Storage** with short-lived owner-only signed downloads
- **Stripe test integration** for one future Founding Studio subscription;
  purchase remains disabled

## Run
```bash
cp .env.example .env.local
# Cached mode needs no provider key. Private validation additionally requires
# Supabase, FAL, allowlist, atomic migrations, and the durable US$20 budget.
npm run dev      # http://localhost:3000
```

| Mode | When | Behavior |
|---|---|---|
| **Cached** | default / public | Labeled prototype · 0 credits · upload not processed |
| **Private validation** | invited non-production account + all durable gates | Real Fast 720p/5s output copied to private Storage |
| **Stripe test** | private Preview + rehearsed billing RPC | Test Checkout only; invoice grants are idempotent |
| **Production paid** | all launch gates pass | Currently hard-closed |

## Credits & plans (see `docs/UNIT_ECONOMICS.md` + `lib/pricing.ts`)
| Plan | Candidate price | Allowance | Availability |
|---|---:|---:|---|
| Free | $0 | Cached prototypes only | Public |
| Founding Studio | $49/month | 3 fixed Launch Packs = 90 credits = 9 outputs | Closed until gates pass |

Each Pack atomically reserves 30 credits and settles or restores 10 per child.
Credits roll over while the subscription remains active. There is no unlimited
usage and paid credits cannot be redirected into unpriced models or durations.

## Where things live
| Path | What |
|---|---|
| `lib/presets.ts` | Effect presets — each is a studio effect **and** an SEO page |
| `lib/pricing.ts` | Plans + credit cost |
| `lib/session.ts` | Signed guest cookie; never paid-spend authority |
| `lib/durableCredits/*` | Postgres reservation, settlement, Pack authority |
| `app/api/generate` | Durable gate → provider → private object → settle |
| `app/api/me` | Current balance / plan |
| `app/api/checkout` | Auth-bound Stripe Checkout, disabled by default |
| `app/pricing` | Pricing page + checkout buttons |
| `app/create` + `components/CreateStudio.tsx` | Upload → effect → generate |
| `app/sitemap.ts`, `app/robots.ts` | SEO plumbing |

## Deploy checklist
1. Host on Vercel (or any Node host) from this repo.
2. Keep Production at `PIKBO_PROVIDER_VALIDATION_MODE=0`,
   `NEXT_PUBLIC_PAYMENTS_ENABLED=0`, `PAYMENTS_LIVE=0`, and
   `STRIPE_BILLING_RPC_READY=0`.
3. Apply new migrations and exercise provider/Stripe only in a disposable or
   isolated non-production project.
4. Do not copy Preview credentials or validation flags into Production.

## Roadmap
1. Rehearse the private P0 single-video loop against non-production Postgres.
2. Run the atomic three-video Pack for at least 3 SKUs / 10 provider calls
   within the durable US$20 cap.
3. Invite 10 independent toy sellers or studios and measure real reuse.
4. Open one Founding Studio offer only after every release gate passes.

## Multi-agent workflow (Grok · GPT · Claude)
Single source of truth: **this GitHub repo**.

| Doc | Purpose |
|---|---|
| [`docs/LAUNCH.md`](./docs/LAUNCH.md) | **上线作战手册（Vercel + 域名）** |
| [`docs/BOSS.md`](./docs/BOSS.md) | **老板怎么只说一遍就指挥三个人** |
| [`docs/DISPATCH.md`](./docs/DISPATCH.md) | **当前总指令**（老板改这一份） |
| [`docs/outbound/README.md`](./docs/outbound/README.md) | **出海知识库 ↔ GitHub Gate 与 8 周落地计划** |
| [`COLLAB.md`](./COLLAB.md) | Branch rules, how to pull each other’s good commits |
| [`docs/STATUS.md`](./docs/STATUS.md) | Live task board — **claim before coding** |
| [`docs/HANDOFF.md`](./docs/HANDOFF.md) | Quality landings worth reusing |
| [`AGENTS.md`](./AGENTS.md) | Short entrypoint for any agent session |
| [`tools/README_TELEGRAM.md`](./tools/README_TELEGRAM.md) | 手机 Telegram 派活 |

```bash
git fetch origin --prune && git pull --ff-only
# claim a row in docs/STATUS.md, then:
git checkout -b agent/<grok|gpt|claude>/<topic>
```

## Guardrails
- Users animate **their own photos** of toys they own — no brand-name generation.
- Never offer true "unlimited" on expensive models. Cost control = survival.
