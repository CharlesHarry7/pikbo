# Pikbo board — claim before you code

**Last human intent:** World-class toy video OS; path to $60k/day. See docs/MOONSHOT_WORLD_CLASS.md + docs/DISPATCH.md. Public still GO-gated.

Update this file in the same PR/commit as your work start/finish.

Legend: `todo` · `doing` · `review` · `done` · `blocked`

---

## Now — LAUNCH GATE (public = NO-GO)

| ID | Task | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| R0 | Disable anonymous live generation; cached demo only until authenticated durable reserve | Claude | todo | agent/claude/recovery-cost-gate | P0 provider-spend protection; audit 2026-07-27 |
| R1 | Atomic Supabase credit reservation + explicit retry token + fixed deadline | Claude | todo | agent/claude/recovery-ledger | Must fail closed before provider call |
| R2 | Toy Launch Pack primary funnel + event contract | GPT / Claude | doing | agent/gpt/recovery-dispatch | GPT freezes contract; Claude implements |
| R3 | Real integration tests + CI fail on critical path | Grok / Claude | todo | agent/grok/recovery-qa | Grok QA; Claude supplies injectable boundaries |
| R4 | Public-example evidence ledger and honest scoring | Grok | todo | agent/grok/proof-ledger | No input/task ID/model/output evidence = prototype |
| R5 | Growth claims cleanup and WorkBuddy permission boundary | GPT / Grok | doing | agent/gpt/recovery-dispatch | Submitted is not verified backlink |
| GO | Public pikbo.ai Mode B | Grok | **blocked** | agent/grok/final-takeover | Grok owns readiness; boss still must explicitly approve public DNS and charging |
| GROK-TAKEOVER | Complete every remaining no-cost product, engineering, QA and private-release task | Grok | doing | main | 2026-07-24: Flow path + Seller Pack WaitStage + HF smoke locks. Still blocked on boss Vercel/DNS, T5 SQL multi-node, T6 bake |
| SUITE | 潮玩版 HF Generate + Yiha Modules 产品壳 | Grok | **review** | main | `/create` `/modules` suite chrome; softLaunch PRIMARY/MOBILE nav freeze; suite doors sitewide |
| G1 | Nav whitelist / kill empty doors | Grok | **review** | agent/grok/seo-gsc-p0 | GSC P0: PRIMARY = Explore·Create·Effects·Pricing; Preview/Lab in More |
| SEO-GSC | GSC VideoObject + crawl/noindex contract | Grok | **review** | agent/grok/seo-gsc-p0 @ a72d597 | PR #25; uploadDate DateTime; Preview crawlable+noindex; sitemap 9; **boss: GSC 验证修复 after deploy** |
| G2 | ≤8 hero presets, unique demos | Grok | **review** | main + agent/gpt/world-class-prd | Reassigned for proof audit; exact eight proof slugs are frozen |
| G3 | Official demos copy (no fake UGC) | Codex | **done** | main @ `32c634c` | Official example / cached / concept language merged |
| G4 | Zero 404 on linked URLs | Claude | **done** | main @ `5d25fb3` | Redirect aliases and link-check passed |
| G5 | Plain-language ICP + meta | Codex | **done** | main @ `32c634c` | Seller-first H1, buyer metadata and honest ROI copy merged |
| G6 | 3 live toy gens + 1 refund | Grok | **done** | main | PASS 2026-07-24: 3 lives + refund · `docs/evidence/G6_LAUNCH_LOG.md` · public Mode B still needs deploy+DNS boss |
| G7 | build + prod no devTopup | Grok | **review** | agent/grok/final-takeover | Reassigned for CI and private-preview verification; topup hard-off prod |
| P-GO | GO_NO_GO + nav/preset whitelist PRD | GPT | done | agent/gpt/world-class-prd | Formal pass criteria, exact nav, eight proof slugs, route inventory and day-of checklist |
| W-PRD | World-class product contract, Seller OS, recipe quality, SEO Intent 50 | GPT | done | agent/gpt/world-class-prd | Create canonical Seller Pack, exact 12/8 recipes, five-score proof gate, structured 50-intent map |
| H-PARITY | Higgsfield complete public-surface inventory and parity contract | GPT | done | agent/gpt/higgsfield-parity-spec | 17 top-level + project/preset/assets surfaces mapped; no copied content or fake doors |
| H-WAVE-A | Core video parity: Home, Explore, Create, Effects, Project, Assets, Seller Pack | Grok | review | main | Core loop on main; close residual findings inside final takeover |
| H-WAVE-B | Generation settlement truth, version retry, watermark gate, accessibility and CI | Grok | review | main | B1–B6 shipped: last-request settlement, Retry/Variant + GenerationSpec, server effect/costCredits echo, Free raw download blocked, Explore focusable=false, CI template at docs/ci/. engine-smoke/lint/typecheck/build green. T6 still blocked (download disabled ≠ baked watermark) |
| P-COPY | Shell honesty copy pass | Codex | done | main @ `32c634c` | Superseded and completed by the world-class seller copy pass |
| W-COPY | World-class seller copy, official-demo truth, ROI and 10 intent pages | Codex | done | agent/gpt/world-class-copy | Lint, typecheck, build and rendered metadata/H1 checks passed |
| P6 | Home retention + official project + Remix→Create contract | GPT | done | agent/gpt/retention-remix | HF/Yiha evidence translated into frozen product flow, data contract, events and responsive acceptance |
| T1 | Multi-agent collab protocol + board | Grok | done | main | COLLAB.md + STATUS + HANDOFF |
| T2 | Real fal sample clips / homepage demos | GPT | done | agent/gpt/homepage-demos | 6 original encoded demos; cached/no FAL cost; verified fal renders can replace assets later |
| T3 | Keyword + preset expansion (long-tail SEO) | Claude | done | agent/claude/seo-keywords | +use-cases + toy-types |
| T4 | Stripe webhook (renew/cancel plan) | Grok | done | agent/grok/ship-billing-launch | webhook + confirm + entitlements |
| T5 | Supabase auth + durable credits | Grok | doing | agent/grok/final-takeover | SQL migration + pure engine + local adapter + smoke tests landed; Supabase Auth UI/wire blocked on keys (see BLOCKERS_REQUEST) |
| T-PHASE-D | Local async job ledger + controlled download API | Grok | review | main | process-memory generations + /api/downloads gate; durable queue still Supabase |
| T6 | Server-side free watermark (ffmpeg) | Grok | **blocked** | agent/grok/t6-watermark-worker-v1 | Fail-closed skeleton on main; Free raw blocked until owned derivative + ffmpeg proof |
| T7 | Private Vercel RC + later domain pikbo.ai | Grok | blocked | agent/grok/final-takeover | Prepare private preview; Vercel login and public DNS require boss authorization |
| FP0 | First-principles nav + Mini truth + doctrine | Grok | done | main | AppShell primary/more; docs/FIRST_PRINCIPLES.md |
| FP1 | critical-path smoke script | Grok | done | main | `npm run critical-path` |
| G-ops | demo map + rate limit + dev topup + preflight demos | Grok | done | agent/grok/foundation-ops | no UI aesthetic conflict |
| UI-q | UI quality r1–r3 aesthetic | Grok | review | main | Create + Seller Pack + Library first-run 390px; Saved on this device honesty; session ledger not durable cloud; smoke locked |
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
| T8 | Batch generate for Shop plan | Grok | review | agent/grok/t8-campaign-recovery | Current-device/session Seller Pack recovery reconciles existing generation jobs; no cloud/durable claim. T5 worker remains blocked |
| T9 | Effect preset expansion (studio + SEO landing) | Claude | done | agent/claude/seo-presets | +3 effects |
| T11 | Guides: informational long-tail content | Claude | done | agent/claude/guides | 3 how-to/tips/ideas articles at /guides; Article+FAQ JSON-LD; cross-linked to effects |
| T23 | CI build + conflict-marker gate | Grok | review | main | Workflow template `docs/ci/github-actions-ci.yml` (engine-smoke · lint · typecheck · build). OAuth token lacks `workflow` scope so cannot push under `.github/workflows/` yet — boss: copy + push with workflow scope |
| T24 | Generate honesty: demo vs live + regen/refund copy | Grok | review | main | Wave B: lastRequestCreditState, Retry/Variant, Free download gate, server costCredits/effect echo |
| T25 | Homepage truth labels + overclaim sweep | GPT | done | agent/gpt/claude-copy-audit | PR #6; cached/shared previews and provider-gated paths labeled |
| T26 | Unit economics doc + free-tier recommendation | GPT | done | agent/gpt/convert-truth | Superseded by C1–C5: implemented Free Mini 5s trial; current 1 / 5 / 15 allowances |
| T27 | Preset/SEO proof and copy wave 2 | Grok | review | main | Phase H: concept effects noindex; sitemap proof-only; private/preview robots; LandingResults honest empty |
| T28 | Pricing conversion copy A/B | GPT | done | agent/gpt/pricing-mobile | Outcome default; `?copy=cost` cost-control variant; C1–C5 aligns active 1 / 5 / 15 contract |
| T29 | Homepage first-screen 390px acceptance + polish | GPT | done | agent/gpt/pricing-mobile | No x-overflow; primary CTA visible; duplicate home floating CTA removed; accessible demo controls |
| T30 | Pricing UI matches active credit contract | GPT | done | agent/gpt/pricing-truth-main | Free 1 / Creator ~5 / Shop ~15; billing gate and future model-aware weights remain explicit |
| T5 | Supabase auth + durable credits | Grok | doing | agent/grok/final-takeover | Schema+engine landed; Supabase keys in BLOCKERS_REQUEST; **blocks serious Stripe** |
| T6 | Server-side free watermark (ffmpeg) | Grok | **blocked** | agent/grok/t6-watermark-worker-v1 | Fail-closed skeleton on main; Free raw blocked until owned derivative + ffmpeg proof |

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
