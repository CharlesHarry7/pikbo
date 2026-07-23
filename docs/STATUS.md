# Pikbo board — claim before you code

**Last human intent:** NEW roles — Claude=all code; GPT=PRD/structure/API design; Grok=creative/growth/coordination. See docs/ROLES.md.

Update this file in the same PR/commit as your work start/finish.

Legend: `todo` · `doing` · `review` · `done` · `blocked`

---

## Now

| ID | Task | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| T1 | Multi-agent collab protocol + board | Grok | done | main | COLLAB.md + STATUS + HANDOFF |
| T2 | Real fal sample clips / homepage demos | GPT | done | agent/gpt/homepage-demos | 6 original encoded demos; cached/no FAL cost; verified fal renders can replace assets later |
| T3 | Keyword + preset expansion (long-tail SEO) | Claude | done | agent/claude/seo-keywords | +use-cases + toy-types |
| T4 | Stripe webhook (renew/cancel plan) | Grok | done | agent/grok/ship-billing-launch | webhook + confirm + entitlements |
| T5 | Supabase auth + durable credits | — | todo | — | **Block real Stripe** — file entitlements ephemeral on Vercel |
| T6 | Server-side free watermark (ffmpeg) | — | todo | — | Player overlay is temporary |
| T7 | Vercel deploy + domain pikbo.ai | boss | blocked | — | **Step-4 bottleneck** — LAUNCH.md; code soft-ready |
| FP0 | First-principles nav + Mini truth + doctrine | Grok | done | main | AppShell primary/more; docs/FIRST_PRINCIPLES.md |
| FP1 | critical-path smoke script | Grok | done | main | `npm run critical-path` |
| G-ops | demo map + rate limit + dev topup + preflight demos | Grok | done | agent/grok/foundation-ops | no UI aesthetic conflict |
| UI-q | UI quality r1–r3 aesthetic | Claude | doing | agent/claude/ui-quality | font/grain/craft — Grok hands off |
| C1–C5 | truth-sync: pricing numbers, estimator, economics, microcopy | Codex | done | agent/gpt/truth-sync | Free Mini 480p + 1 / 5 / 15 contract aligned; `eslint app components lib --max-warnings=0` passed |
| T31 | Overnight Explore/Lab/trust/FAQ honesty pass | Codex | done | agent/gpt/overnight-copy | Cached vs live labels, Mini 5s 480p path, no exact-output or conversion guarantees |
| T32 | Wave2 Community/Explore/Effects/empty-state honesty pass | Codex | done | agent/gpt/wave2-copy | Cached/concept/live labels aligned; Mini + 1 / 5 / 15 FAQ; lint + typecheck pass |
| P1–P3 | Soft-launch PRD, credits/plans rules, Generate API spec | GPT | done | agent/gpt/prd-soft-launch | Invite-only free validation; Stripe live no-go; synchronous Generate v1 documented from source |
| P4 | Seller Pack product specification | GPT | done | agent/gpt/prd-seller-pack | 3 fixed outputs; cached 0 / live 30; per-child settle/refund; partial failure and acceptance frozen |
| P5 / T5-design | Auth + durable credits data model draft | GPT | done | agent/gpt/prd-seller-pack | Supabase Auth, RLS, wallet, append-only ledger, reservations, Stripe idempotency and migration drafted |
| T10 | Boss one-command + Telegram bot | Grok | done | main | DISPATCH + tools/telegram_dispatch_bot.py |
| T11 | Higgsfield-class shell + Generate | Grok | done | main | AppShell + CreateStudio + Library history |
| T12 | Home model shelf + presets wall polish | GPT | done | agent/gpt/home-visuals | Live-model previews + demo-aware preset cards; roadmap models explicit |
| T13 | Presets/community density | Claude | done | main | PresetsWall on /effects + home |
| T14 | Local Library history | Grok | done | main | localStorage after generate |
| T15 | Generate duration/aspect/model controls | Grok | done | main | API + CreateStudio |
| T16 | Toy-native suite copy pass | Grok | done | main | catalog + pages |
| T17 | Batch generate (Shop agent) | Grok | done | main | /supercomputer BatchStudio |
| T18 | Profile live credits + Generate drag-drop | Grok | done | main | |
| T19 | Generate search/recent/progress/copy + mobile CTA | Grok | done | main | |
| T20 | Favorites, before/after, onboarding, trust strip | Grok | done | main | |
| T21 | Gap close: image API, resolution, settings, cmd-K, library, annual UI | Grok | done | main | docs/GAP_AUDIT.md |
| T22 | Pre-launch audit: lint green, pricing honesty, size guard, T2V honesty | Grok | done | main | docs/PRELAUNCH_AUDIT.md |
| T8 | Batch generate for Shop plan | — | todo | — | After auth/credits DB |
| T9 | Effect preset expansion (studio + SEO landing) | Claude | done | agent/claude/seo-presets | +3 effects |
| T11 | Guides: informational long-tail content | Claude | done | agent/claude/guides | 3 how-to/tips/ideas articles at /guides; Article+FAQ JSON-LD; cross-linked to effects |
| T23 | CI build + conflict-marker gate | Grok | doing | main | `.github/workflows/ci.yml` |
| T24 | Generate honesty: demo vs live + regen/refund copy | Grok | doing | main | CreateStudio result strip |
| T25 | Homepage truth labels + overclaim sweep | GPT | done | agent/gpt/claude-copy-audit | PR #6; cached/shared previews and provider-gated paths labeled |
| T26 | Unit economics doc + free-tier recommendation | GPT | done | agent/gpt/convert-truth | Superseded by C1–C5: implemented Free Mini 5s trial; current 1 / 5 / 15 allowances |
| T27 | Preset/SEO copy wave 2 (toy seller language) | Claude | todo | agent/claude/copy-seo-v2 | DISPATCH L1–L2 |
| T28 | Pricing conversion copy A/B | GPT | done | agent/gpt/pricing-mobile | Outcome default; `?copy=cost` cost-control variant; C1–C5 aligns active 1 / 5 / 15 contract |
| T29 | Homepage first-screen 390px acceptance + polish | GPT | done | agent/gpt/pricing-mobile | No x-overflow; primary CTA visible; duplicate home floating CTA removed; accessible demo controls |
| T30 | Pricing UI matches active credit contract | GPT | done | agent/gpt/pricing-truth-main | Free 1 / Creator ~5 / Shop ~15; billing gate and future model-aware weights remain explicit |
| T5 | Supabase auth + durable credits | — | todo | — | **Blocks serious Stripe** |
| T6 | Server-side free watermark (ffmpeg) | Grok | todo | — | After T23/T24 |

---

## Done (keep short; detail → HANDOFF)

| ID | Task | Owner | SHA / link |
|---|---|---|---|
| D1 | Next.js shell + design system | mixed | early commits |
| D2 | Effects / for / toys pSEO axes | mixed | `lib/presets|usecases|toytypes` |
| D3 | Create studio + fal generate API | mixed | `app/create`, `app/api/generate` |
| D4 | Guest credits + paywall + pricing page | Grok | session cookie + `/pricing` |
| D5 | Repo published | Grok | https://github.com/guochao950518-wq/pikbo |
| D6 | Stripe webhooks + confirm + legal pages | Grok | this branch |
| D7 | Toy-first homepage demo theatre | GPT | `agent/gpt/homepage-demos` |
| D8 | Model shelf + demo-aware PresetsWall | GPT | `agent/gpt/home-visuals` |
| D9 | Pricing estimator + comparison experience | GPT | `agent/gpt/pricing-conversion` |

---

## Locks (active file ownership)

| Path / area | Locked by | Until |
|---|---|---|
| — | — | — |

When you start: add a row. When you merge: clear it.

---

## How to claim (copy template)

```md
| T10 | Short task title | GPT | doing | agent/gpt/short-slug | started YYYY-MM-DD |
```

Then:

```bash
git checkout main && git pull
git checkout -b agent/gpt/short-slug
# edit docs/STATUS.md claim + your code
git commit -m "[gpt] claim T10 + implement ..."
git push -u origin HEAD
```
