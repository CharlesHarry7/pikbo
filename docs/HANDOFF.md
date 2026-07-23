# Handoff log — quality work others should reuse

Newest first. One block per meaningful landing.

---

### 2026-07-23 — [gpt] Seller Pack + T5 durable-credit specifications (P4/P5)
- Paths: `docs/prd/SELLER_PACK.md` and `docs/prd/AUTH_CREDITS.md`; product/data specifications only.
- Seller Pack contract: one owned toy photo → Listing Spin, Blind-box Reveal, and Social Flash; cached preview costs 0, while three live children cost 30 credits at the current flat rate with no bundle discount.
- Failure rule: successful children remain deliverable; returned provider failures restore their own 10 credits; retry targets one failed child and never silently reruns a success.
- T5 contract: Supabase Auth + account membership + transactional wallet + append-only ledger + idempotent reserve/settle/release + durable Stripe event records.
- Priority: current 2–3 day soft-launch sprint remains first; Claude reviews these specs after soft launch and must not enable paid Seller Pack before the documented T5/Stripe gates.

### 2026-07-23 — [gpt] soft-launch product, credits, and Generate contracts (P1–P3)
- Paths: `docs/prd/SOFT_LAUNCH.md`, `docs/business/CREDITS_AND_PLANS.md`, and `docs/api/GENERATE.md`.
- Decision: invite-only cached/free Mini validation may proceed; real Stripe remains blocked until durable identity, transactional credits, idempotent billing, media protection, and operational gates pass.
- Pricing truth: Free 10 credits ≈ 1 Mini 5s 480p trial; Creator 50 ≈ 5; Shop 150 ≈ 15; cached demo playback costs 0 credits.
- API truth: current `/api/generate` is synchronous, Cookie-session based, flat 10 credits for live calls, refund-on-provider-failure, and returns a clearly distinguishable cached demo without `FAL_KEY`.
- Engineering handoff: Claude should implement only the documented soft-launch UI gaps after merge; no plan or endpoint semantics were changed in this docs-only delivery.

### 2026-07-23 — [gpt] wave2 Lab / Effects / empty-state honesty (T32)
- Paths: Community, Explore, Effects SEO/structured copy, Lab feed provenance, onboarding, trust, Library empty states, and homepage recipe CTAs.
- Provenance: cached media says Cached Lab; reused loops say Concept · shared loop; concept cards no longer read as Official UGC or offer a misleading Remake action.
- Free contract: one configured Seedance Mini 5s 480p live trial with an on-player mark; current flat allowances are approximately Free 1 / Creator 5 / Shop 15.
- Fallback: without provider access, Studio returns a labeled cached demo that does not animate the upload; effect reference clips are not claimed as exact preset outputs.
- Verified: full ESLint and TypeScript checks pass; no `app/api/**`, session, credits, Stripe, or layout/CSS changes.

### 2026-07-23 — [gpt] overnight cached/Lab/Mini truth pass (T31)
- Paths: Explore/navigation, PIKBO Lab cards, trust/empty states, preset/toy/use-case/guide copy, and truth-status docs.
- Labels: cached media is never called Live or Real; remix cards are Concept; the anonymous showcase is PIKBO Lab rather than a claimed user community.
- Free contract: one configured Seedance Mini 5s 480p trial with an on-player mark; without a provider, Studio uses a clearly labeled cached demo.
- Guardrails: removed exact-output, instant-speed, guaranteed-reach, and guaranteed-conversion claims; generated unseen angles and small details require review.
- Scope: presentation strings and content registries only; no API, session, credits, Stripe, layout, or CSS changes.

### 2026-07-23 — [gpt] truth-sync C1–C5
- Paths: pricing UI, CreateStudio/LandingToolPanel/Paywall/Profile/Credits copy, `README.md`, `docs/UNIT_ECONOMICS.md`, terms/preset FAQ, and audit docs.
- Contract: Free 10 credits ≈ one Mini 5s 480p live trial with an on-player mark; Creator 50 ≈ five; Shop 150 ≈ fifteen at the current flat 10-credit rate. No unlimited live generation claim remains.
- Demo truth: cached examples do not animate the upload or call the provider; cached homepage playback costs no credits, while Studio submissions follow the current API credit contract.
- Economics: current allowances are prototype estimates; 10s Standard Shop usage can still lose money, so weighted server metering, durable credits, and file-level watermarking remain launch gates.
- Verified: `eslint app components lib --max-warnings=0` and `git diff --check` pass. No `app/api/**`, session, credits, contracts, models, Stripe, or homepage-shell logic was changed.

### 2026-07-23 — [gpt] pricing UI aligned to the active credit contract (T30)
- Paths: `app/pricing/page.tsx`, `components/PricingPlanCards.tsx`, `components/PricingUsageEstimator.tsx`.
- Truth rule: Free 1 / Creator ~5 / Shop ~15 are the current server-backed flat-rate allowances, not stale prototype placeholders.
- Guardrail: billing remains gated, no unlimited claim is introduced, and future model/resolution/duration weighting is labeled as the next contract change.
- Reuse: pricing UI should derive quantities from `PLANS`, `CREDITS_PER_VIDEO`, and `clipsFromCredits` instead of inventing copy-only totals.
- Merged to main by Grok (PR #12).

### 2026-07-23 — [grok] Codex dispatched: truth-sync C1–C5
- Paths: `docs/DISPATCH.md`, `docs/GPT.md`, `docs/STATUS.md`
- Codex lane: conversion + pricing honesty; no API/session ownership.

### 2026-07-23 — [gpt] pricing messages + 390px first-screen pass (C4–C5 / T28–T29)
- Paths: `components/PricingHeroCopy.tsx`, pricing page/components, `HeroVideoBanner`, and `MobileGenerateBar`.
- Reuse: default pricing message is outcome-led; `/pricing?copy=cost` selects the cost-control variant via `data-pricing-copy-variant`.
- Truth rule (superseded by C1–C5): the current UI now follows the active flat-rate 1 / 5 / 15 allowance contract; billing remains gated.
- Mobile: 390×844 has no horizontal overflow, keeps both hero CTAs visible, and no longer overlays a duplicate floating CTA on Home.
- Verified: all-app ESLint, TypeScript + 69-route production build, both pricing variants, demo switch, and 390px browser geometry.

### 2026-07-23 — [gpt] conversion truth + unit economics (C3 / T26)
- Paths: `docs/UNIT_ECONOMICS.md`
- Decision (superseded by C1–C5): the implemented Free path is now one 5s Seedance Mini 480p trial with an on-player mark.
- Economics: Creator `$19` supports about five 5s Fast 720p or four 5s Standard 720p clips, not 50, at the reviewed fal rates.
- Reuse: charge credits by model + resolution + duration; **Grok implements** server-side ledger (not UI-only).
- Verified: sources linked in doc; arithmetic sensitivity included.

### 2026-07-23 — [claude] copy-seo-v2: taglines + shared objection FAQ (L1/L2)
- Paths: `lib/presets.ts` (all 22 taglines rewritten collector/seller-voiced; new `COMMON_FAQ` export), `app/effects/[slug]/page.tsx` (append `COMMON_FAQ` to render + FAQ JSON-LD).
- Reuse: import `COMMON_FAQ` and spread after page-specific FAQ on any tool landing.
- Pitfall: keep `COMMON_FAQ` generic; don't duplicate preset-local FAQ questions.
- Did NOT touch CreateStudio / generate API.

### 2026-07-23 — [gpt] promise-consistency audit (labels + overclaim sweep)
- Paths: `app/page.tsx`, `app/explore`, `app/community`, `app/apps`, `app/models`, `app/pricing`, `components/HeroVideoBanner.tsx`, `components/SeedanceCampaign.tsx`, `components/PresetPreviewCard.tsx`, `lib/videoFeed.ts`, `lib/site.ts`
- Why good: separates cached Lab examples, shared loops, concept recipes, configured workspaces, and live generation proof.
- Reuse / pitfalls:
  - `live` = implemented workspace, not proof FAL_KEY exists; UI may say `Configured`/`Wired`.
  - Presets without exact DemoVideo match: `Concept · shared loop`.
  - Community = PIKBO Lab until real accounts; no fictional authors.
  - `StatusBadge` is runtime live vs demo source.
- Merged to main by Grok 2026-07-23.

### 2026-07-23 — [grok] three-agent max push + CI + generate honesty
- Paths: `docs/DISPATCH.md`, `docs/STATUS.md`, `.github/workflows/ci.yml`, `components/CreateStudio.tsx`
- Why: boss wants Grok+Codex+Claude at full capacity; shared board is the coordination channel.
- Reuse:
  - Codex: only DISPATCH C1–C5; branch `agent/gpt/convert-truth`
  - Claude: only DISPATCH L1–L4; branch `agent/claude/copy-seo-v2`
  - Do not invent fake community clips; Official/Cached labels stay.
  - Generate result strip explains demo vs live and refund-on-fail.
- CI: push/PR runs lint + build + conflict-marker scan.

### 2026-07-22 — [gpt] pricing conversion + usage estimator (T21)
- Paths: `app/pricing/page.tsx`, `components/PricingUsageEstimator.tsx`
- Why good: turns a static three-card page into a transparent monthly-output calculator, recommendation flow, plan comparison table, and clear FAQ while preserving the real checkout buttons.
- Reuse / pitfalls:
  - Historical note: the old 3 / 50 / 150 clip allowances are retired; C1–C5 aligns the UI to current ~1 / ~5 / ~15 output at `CREDITS_PER_VIDEO = 10`.
  - The calculator is illustrative of included credits, not a quote for model overages; keep wording tied to the current credit estimate.
  - No annual toggle or unlimited claim exists because neither billing mode is implemented.
  - Checkout stays in `PricingCheckoutButton`; do not duplicate Stripe logic inside the estimator.
- Verified: production build; desktop and 390px visual passes; quick choices switch Creator → Shop correctly; no browser warnings/errors.
- Depends on: `PLANS`, `CREDITS_PER_VIDEO`, existing Stripe checkout component. No checkout API, credits, session, entitlement, or webhook code changed.

### 2026-07-22 — [gpt] live model shelf + demo-aware preset wall (T12)
- Paths: `app/page.tsx`, `components/HomeModelShelf.tsx`, `components/PresetPreviewCard.tsx`, `components/PresetsWall.tsx`
- Why good: live Seedance cards use cached toy footage on hover/focus, while Kling/Veo stay visibly marked `Roadmap`; six presets with matching T2 assets show real video/posters and all remaining presets stay honest `Recipe` cards.
- Reuse / pitfalls:
  - `MODEL_DEMOS` is presentation-only. Cached previews do not prove which provider rendered them and must retain the `Cached preview` badge.
  - Preset video matching is by `DemoVideo.preset`; adding a verified demo automatically upgrades that recipe card without changing the wall.
  - Touch layouts intentionally keep posters still; the immersive T2 showcase remains the single autoplay surface on mobile.
  - Do not mark a roadmap model live until its generate route/provider capability is wired.
- Verified: production build; desktop and 390px model/preset visual passes; no browser warnings/errors.
- Depends on: T2 `DemoVideo` registry, shared `MODELS` catalog, Claude `PresetsWall`. No generation, credits, history, batch, session, or billing code changed.

### 2026-07-22 — [gpt] toy-first homepage demo theatre (T2)
- Paths: `app/page.tsx`, `components/HomeDemoShowcase.tsx`, `lib/demoVideos.ts`, `public/demos/`
- Why good: replaces the model-name-only hero with a real encoded before/after stage and six playable toy clips while preserving the shared AppShell, Apps, Models, Cinema, Supercomputer, PresetsWall, community, Library, and billing paths. Copy stays vertical to owned-toy photos and makes Free watermark, trial allowance, and subscription expansion explicit.
- Reuse / pitfalls:
  - Demo assets are cached original PIKBO prototype footage, so playback never calls fal or spends credits. Do not relabel them as newly generated model output.
  - `DemoVideo` IDs and `/create?effect=...` deep links are the stable contract; verified fal renders can replace the files later without rebuilding the component.
  - Hero preloads one clip; gallery clips use posters plus viewport/hover playback, pause off-screen, and honor reduced-motion preferences.
  - Keep both MP4 and WebM plus a poster for every replacement clip.
- Verified: production build; 1440px and 390px browser passes; Studio deep-link selects `Floating Hero`; no browser warnings/errors.
- Depends on: latest shared AppShell/catalog home, existing preset slugs, and Create Studio query-param selection. No credits, session, generate API, history, or billing code changed.

### 2026-07-22 — [claude] +4 viral presets (density)
- Paths: `lib/presets.ts` (+smoke-burst-entrance, +paint-splash, +power-aura, +hologram-glitch)
- Why good: 4 distinct high-impact viral effects for the presets wall / clone density; each is a studio effect AND SEO page (full fields + promptTemplate). No IP/brand, no human-hand generation. Now 22 effects.
- Reuse / pitfalls: data-only → auto pages+sitemap+wall+footer; keep prompts on the user's own figure; quality-first, avoid thin duplicates.

### 2026-07-22 — [grok] Library history + denser HF-class home
- Paths: `lib/history.ts`, `components/LibraryGrid.tsx`, `CreateStudio` pushHistory, `app/page.tsx` + PresetsWall, pricing app padding
- Why: generate → appears in Library (device-local); home matches model shelf + viral wall pattern
- Reuse: don't replace localStorage until Supabase; keep `pushHistory` on successful generate only

### 2026-07-22 — [grok] ByteDance Seedance as default video model
- Paths: `lib/models.ts`, `app/api/generate/route.ts`, `.env.example`
- Why: boss wants 字节模型出片. Current defaults are Seedance 2.0 full (paid) + Mini 480p (Free) on fal.
- Reuse: change models only via `FAL_MODEL` / `FAL_MODEL_FREE`; keep input `prompt` + `image_url` + duration/aspect/resolution.
- Cost: Seedance is not free — always meter credits; Free uses Mini + 480p and the current 10-credit trial contract.

### 2026-07-22 — [grok] Stripe billing + entitlements (T4)
- Paths: `lib/entitlements.ts`, `lib/stripe.ts`, `lib/session.ts` (merge), `app/api/webhooks/stripe`, `app/api/checkout`, `app/api/checkout/confirm`, CreateStudio confirm on return, `/privacy` `/terms`, homepage pipeline demo
- Why good: real subscription path without Supabase yet. Webhooks update durable plan; browser confirm upgrades cookie; credits not clobbered on every request (periodKey reset only).
- Reuse / pitfalls:
  - Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_*`, `STRIPE_WEBHOOK_SECRET`
  - Webhook URL: `/api/webhooks/stripe`
  - Entitlements file default `data/entitlements.json` (gitignored); serverless should move to Redis/Supabase (T5)
  - Never overwrite cookie credits from entitlement unless `periodKey` changes or free→paid upgrade
- Depends on: existing pricing plans + cookie session

### 2026-07-22 — [claude] guides / informational content axis (T11)
- Paths: `lib/guides.ts` (3 articles), `app/guides/page.tsx` (index), `app/guides/[slug]/page.tsx` (article + Article/FAQ JSON-LD), `app/sitemap.ts` (+guides), `components/Footer.tsx` (+Guides link)
- Why good: adds a 4th, top-of-funnel keyword axis (informational how-to / tips / ideas) that funnels readers into /create + related effects. Data-driven — add a `Guide` object to get a new page + sitemap entry. Build green (52 static pages).
- Reuse / pitfalls: keep `relatedEffects` to valid preset slugs; write genuinely useful prose (no thin filler) or it won't rank; guides link out to effects to spread internal-link equity. Footer Guides link makes them crawlable from every page.
- Depends on: `getPreset` + `PresetCard`.

### 2026-07-22 — [claude] effect preset expansion (T9)
- Paths: `lib/presets.ts` (+assemble-reveal, +paparazzi-flash, +kaiju-rampage); internal-link rewire in `lib/toytypes.ts` (model-kits, action-figures) + `lib/usecases.ts` (instagram)
- Why good: 3 distinct high-intent viral/scene effects, each a studio effect **and** full SEO landing page (h1/title/description/faq/promptTemplate). Quality over quantity — no keyword padding. Cross-linked from relevant toy-type/use-case pages so new effects get inbound internal links.
- Reuse / pitfalls: a new preset needs a valid `category` (showcase/unboxing/comealive/scene) so the hub + homepage group it; keep `promptTemplate` emphasizing the user's real figure (no brand replication). Append order doesn't matter — pages group by category.
- Depends on: `/effects/[slug]` route + `presetsByCategory`.

### 2026-07-22 — [claude] long-tail SEO expansion (T3)
- Paths: `lib/usecases.ts` (+whatnot-live-selling, +depop-shop-videos), `lib/toytypes.ts` (+vinyl-figures, +resin-sofubi, +model-kits)
- Why good: extends the Use-case + Toy-type axes into distinct long-tail intents (live-selling / resale platforms; vinyl / sofubi / gunpla subcultures) picked from competitor-page keyword research. Data-only change → auto-generates pages + sitemap + footer.
- Reuse / pitfalls: to add a page, append one object to the array — page, sitemap, footer come free. Keep each entry's `recommendedEffects` to valid preset slugs (cross-link mesh). Keep prompts/content genuinely distinct to avoid thin-content; don't add brand-name (trademark) slugs.
- Depends on: existing `/for/[slug]` and `/toys/[slug]` route components.

### 2026-07-22 — [grok] collab protocol
- Paths: `COLLAB.md`, `docs/STATUS.md`, `docs/HANDOFF.md`, `AGENTS.md`
- Why: three agents can sync via GitHub without thrashing
- Reuse: always `git pull` + read STATUS before coding

### 2026-07-22 — [grok] guest credits + checkout scaffolding
- Paths: `lib/session.ts`, `lib/credits.ts`, `lib/pricing.ts`, `app/api/me`, `app/api/generate`, `app/api/checkout`, `app/pricing`, `components/CreateStudio.tsx`
- Why good: no DB required; 402 when out of credits; free watermark flag; Stripe-ready; dev upgrade without keys
- Reuse rules:
  - Deduct credits **before** fal call; **refund** on failure
  - Free plan → `watermark: true`; paid → false
  - Keep `CREDITS_PER_VIDEO = 10` unless pricing doc updates
  - Demo mode (no `FAL_KEY`) is **free** (0 credits) — labeled cached Lab only; live path deducts before fal and refunds on failure

### 2026-07-22 — [mixed] 3-axis pSEO
- Paths: `lib/presets.ts`, `lib/usecases.ts`, `lib/toytypes.ts` + `app/effects|for|toys`
- Why good: effects × seller use-cases × toy types internal link mesh
- Reuse: new preset = studio effect **and** SEO page fields; cross-link from usecases

---

## Template

```md
### YYYY-MM-DD — [agent] title
- Paths:
- Why good:
- Reuse / pitfalls:
- Depends on:
```
