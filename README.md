# Pikbo — AI toy video generator

**Live:** [https://pikbo.ai](https://pikbo.ai) · Free Mini trial · no card  

Turn **one photo** of a designer toy / figure / blind box you own into a short AI video for listings, TikTok, and drops.

```text
Photo you own → recipe (spin / float / unbox) → short video
```

Recovery honesty: anonymous visitors are cached-demo-only until authenticated
durable reservation and server-owned delivery are ready. Existing Lab media is
not customer UGC; its proof status is being audited. Stripe remains off during
recovery, but future payment validation depends on sellers producing publishable
packs—not on an arbitrary search-traffic threshold.

## Try
1. Open [pikbo.ai/create](https://pikbo.ai/create)  
2. Confirm you own the photo  
3. Generate (live Mini when configured; otherwise labeled demo)

## Stack
- **Next.js 16** (App Router) + **Tailwind v4**
- **ByteDance Seedance** image-to-video via **fal.ai** (`@fal-ai/client`)
  - Free tier → `bytedance/seedance-2.0/mini/image-to-video` at 480p
  - Paid → `bytedance/seedance-2.0/image-to-video`
- **Signed cookie session** — guest credits + plan (no DB required yet)
- **Stripe Checkout** (optional, soft launch off) — Creator / Shop subscriptions
- Programmatic SEO: `/effects/*`, `/for/*`, `/tools/*`, `/toys/*`, `/guides/*`

## Run
```bash
cp .env.example .env.local
# required for live gen: FAL_KEY, SESSION_SECRET
npm run dev      # http://localhost:3000
```

| Mode | When | Behavior |
|---|---|---|
| **Demo** | no `FAL_KEY` | Labeled **Cached demo** clip · **0 credits** (does not animate your upload) |
| **Live gen** | `FAL_KEY` set | Real image-to-video via fal.ai · 10 credits · refund on failure |
| **Dev billing** | no Stripe keys, non-prod | `/api/checkout` upgrades plan instantly (never in production soft launch) |
| **Live billing** | Stripe keys + price IDs + gate | Soft launch: paid CTAs stay **Coming soon** |

## Credits & plans (see `docs/UNIT_ECONOMICS.md` + `lib/pricing.ts`)
| Plan | Price | Credits/mo | Approx clips | On-player mark |
|---|---|---|---|---|
| Free | $0 | 10 | ~1 trial | yes |
| Creator | $19 | 50 | ~5 | no |
| Shop | $49 | 150 | ~15 | no |

Rule: **1 live clip = 10 credits** (flat until model×duration metering). Failed **live** jobs refund and return `creditsRefunded: true`.
Free live path: Seedance Mini · 5s · 480p · on-player mark. Cached demos and homepage Lab examples use **0 credits**.

## Where things live
| Path | What |
|---|---|
| `lib/presets.ts` | Effect presets — each is a studio effect **and** an SEO page |
| `lib/pricing.ts` | Plans + credit cost |
| `lib/session.ts` | Signed cookie guest session |
| `lib/credits.ts` | Check / deduct / refund |
| `app/api/generate` | Credits gate → fal.ai (or demo) |
| `app/api/me` | Current balance / plan |
| `app/api/checkout` | Stripe or dev upgrade |
| `app/pricing` | Pricing page + checkout buttons |
| `app/create` + `components/CreateStudio.tsx` | Upload → effect → generate |
| `app/sitemap.ts`, `app/robots.ts` | SEO plumbing |

## Deploy checklist
1. Host on Vercel (or any Node host) from this repo.
2. Env: `SESSION_SECRET`, `FAL_KEY`, Stripe keys (see `.env.example`).
3. Stripe webhook → `https://YOUR_DOMAIN/api/webhooks/stripe`  
   Events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`, `customer.subscription.updated`.
4. Create products/prices for Creator ($19) and Shop ($49); paste Price IDs into env.
5. Point domain (`pikbo.ai`) DNS to host.

## Roadmap
1. ~~Credits + free watermark + pricing checkout path~~ (done — cookie session)
2. ~~Stripe webhooks + checkout confirm~~ (done — file entitlements)
3. **Auth + credits DB** (Supabase) — multi-device balance, history
4. **Server-side video watermark** (ffmpeg) for free downloads
5. **Verified live case studies** to replace cached Lab examples when fal renders are approved
6. Vertical seller acquisition after activation, repeat use, and unit economics
   are measurable

## Multi-agent workflow (Grok · GPT · Claude)
Single source of truth: **this GitHub repo**.

| Doc | Purpose |
|---|---|
| [`docs/LAUNCH.md`](./docs/LAUNCH.md) | **上线作战手册（Vercel + 域名）** |
| [`docs/BOSS.md`](./docs/BOSS.md) | **老板怎么只说一遍就指挥三个人** |
| [`docs/DISPATCH.md`](./docs/DISPATCH.md) | **当前总指令**（老板改这一份） |
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
