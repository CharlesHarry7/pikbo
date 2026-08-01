# Pikbo board — claim before you code

**Last human intent:** Make the public website itself the product front door: one owned toy photo → the fixed three-video Launch Pack → private Library, with no empty suite shells or dead-end “preview” journey. Public Live and payment remain quality-gated.

Update this file in the same PR/commit as your work start/finish.

Legend: `todo` · `doing` · `review` · `done` · `blocked`

---

## Authoritative active queue

只有本表代表当前可执行工作；下面的大表保留历史上下文，不构成自动派工。

| ID | Outcome | Owner | Status | PR / branch | Reviewer gate |
|---|---|---|---|---|---|
| HOME-V1 | Immersive 8-demo toy Recipe home → auditable project → Create in ≤2 clicks | Codex | done | main via PR #50 | GitHub CI #476 green; 390/768/1440 browser proof, 8 distinct cached demos, Project/Recipe analytics, SEO/trust and 193-route build passed |
| CTRL-RESET | Close stale PRs, close R2 and enforce one active task per agent | Codex | done | main via PR #45 | Isolated worktrees and the one-task queue are now mandatory |
| R0-NET | Unexpected-exit reservation safety without double release/refund | Codex / Grok | done | main via PR #47 | GitHub CI #466 green; capture throw/failure withheld, 0 release calls, behavior test in real CI |
| PROVIDER-AMBIGUITY | Withhold credits and block retry when a provider may have accepted a job but its response is interrupted | Codex / Grok / WorkBuddy | review | `agent/gpt/post-provider-ambiguity` | GPT Pro APPROVE; Grok APPROVE `3fceeda9-6330-48da-9b55-e7ea275dc848`; WorkBuddy APPROVE `pikbo-post-provider-ambiguity-diff-review-20260730-max-v1` plus frozen-delta APPROVE `pikbo-post-provider-ambiguity-delta-review-20260730-max-v2`; focused behavior regression and full launch-gate suite pass |
| IMAGE-PROVIDER-AMBIGUITY | Apply the same fail-closed post-provider accounting semantics to the optional image-generation route | Codex / Grok / WorkBuddy | review | `agent/gpt/image-provider-ambiguity` | GPT Pro APPROVE in chat `6a6b4960-4dcc-83e8-8404-b5cb6748abf6`; Grok APPROVE `019fb369-5431-7041-8de0-7f5703fa7a00`; WorkBuddy APPROVE `pikbo-image-provider-final-gate-1d3d9e17-20260730-max-v1`; frozen runtime diff `1d3d9e17...`; fixed ten-command gate and 196-route build pass |
| PRIVATE-PREVIEW-READINESS | Make health, account UI and the real provider route agree on every private Preview prerequisite | Codex / Grok / WorkBuddy | done | main @ `74fdeb0` · PR #90 | CI `30564369299` and Vercel Production green; live health exposes exact missing requirements while validation, public generation, private Preview and paid mode remain closed. GPT Pro, Grok `019fb3ef-62ed-7653-9ba7-4669c3f66f4c` and WorkBuddy `pikbo-pr90-allowlist-final-delta-20260731-wb1` APPROVE |
| PRIVATE-INPUT-BINDING | Bind one owner-scoped private toy input to one fixed Pack and make active Pack recovery server-discoverable | Codex / Grok / WorkBuddy | doing | `codex/private-input-pack-binding` | GPT Pro found the runbook-only premise false: current input is process-memory and the active pointer is sessionStorage-only. Minimal data/API slice only; no new UI/page/model/pricing/Stripe/SEO or public/paid opening |
| PRESET-FRONTDOOR | Apply ImgAny outcome-first presets and ShipAny interaction polish to the existing Seller Pack without changing its backend | Codex / Grok / WorkBuddy | review | `agent/gpt/preset-first-frontdoor` · PR #93 | User-rejected primary-colour sticker styling was replaced by one premium Collector Cabinet system across Home, Create, Library and Pricing: near-black display case, warm bone, foil stone and one lacquer accent. Product media is the loudest surface; hard shadows, rotated stickers and full-card colour fills are gone. Grok visual direction `019fbd7c-32a7-7ab3-8042-c9cbe760ca8e`; frozen review APPROVE `019fbd96-3391-7b22-917a-27b5058375a9`, with its residual lime-shell P1 fixed. WorkBuddy's eight-route audit remains the before baseline at `outputs/pikbo-audit/pikbo-audit-report.md`. Chrome 1440/390 Preview proof and the fixed launch gate pass; no backend or public/paid gate changed. |
| MOBILE-PROOF | Mobile Home → Project → Create truth and playback regression | Codex | done | main via PR #49 | GitHub CI #470 green; 390/768/1440 proof path, truth copy and mobile single-play verified |
| T6-PROOF | Non-prod baked watermark proof + fail-closed controlled delivery source | Grok / Codex | done | main via PR #51 | GitHub CI #481 green; real ffmpeg/ffprobe decoded-pixel proof, SSRF/IPv6 gates, 20-way owned-write fixture and 193-route build passed |
| T6-PRODUCTION | Apply reviewed SQL, shared object storage and scheduled worker rehearsal | External / unassigned | blocked | none | `SERVER_OWNED_T6_BAKED_WATERMARK_IMPLEMENTED=false`; disposable DB rehearsal, shared storage and worker deployment are required before Free live download |
| WB-WAIT | No growth work before publishable product proof | WorkBuddy | blocked | none | #41/#46 closed; wait for explicit new queue row |
| REAL-LOOP | Authenticated owned-toy upload → private Seedance result → durable Library/download, then fixed 3-output Launch Pack | Codex | blocked | main via PRs #79–#82; protected Preview `f70dbc5` | Single-clip P0 passed; quality matrix is 1/10 and resumes only in the authenticated Preview within the US$20 cap. Production remains validation. |
| FRONTDOOR-V2 | Replace the homepage preview dead end with a real upload-first Launch Pack entry and move Create’s upload above marketing explanation | Codex | review | `codex/higgsfield-toy-front-door` | Homepage now renders the existing upload handoff above the fold; 390px visual check has 0 overflow and upload top=466px. Cached Pack calls transmit no image or asset and the API does not inspect one; the no-image three-child API golden passes. Pricing closed state leads to the Pack and still needs `/api/health.acceptance.paid=true` before Checkout. Source smokes, typecheck, strict lint, 196-route build, 165-route rendered truth contract and full link-check pass. |
| FRONTDOOR-V3 | Separate public format preview from invited private generation across Home/Create and close premature pricing signals | Codex | review | `codex/launch-pack-frontdoor-truth` | Grok frozen-diff PASS `ab6bdd83-e7fe-48c1-83f1-b5c35e8f7856`; WorkBuddy 5/5 PASS `55ce4191-630a-49a5-9c5c-f8f6e4af1f94`; 390px five-route browser proof, complete launch-gate suite, typecheck, lint and 196-route build pass. No API/Pack-engine rewrite or public payment. |
| MVP-CONVERGENCE | Remove suite clutter and make Home → fixed Launch Pack → Library → Pricing the only seller path | Codex | review | `agent/gpt/mvp-convergence` | Seller-first Home/Create/Library/Pricing and exact five-item nav are implemented. Grok product review: GO (`e8a670c9-c6c8-4882-ada0-58b73ad0fce2`). WorkBuddy confirmed truthful value/copy but could not exercise browser interaction (`pikbo-mvp-runtime-final-20260730`); Codex Chrome proof covers 3 cached results plus Library reload. Public provider spend, checkout and production gates remain closed. |

Completion of an old row below does not authorize a new branch. Codex must add a row here first.

---

## Now — LAUNCH GATE (public = NO-GO)

| ID | Task | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| CTRL-3A | Canonical repo, one-task/branch/PR control plane and safe handoffs | Codex | **done** | main @ `5885ade` · PR #32 | Canonical repo corrected; one-task/branch/PR handoffs and safe heartbeat reporting merged; no public/paid/production authority |
| GROK-GROWTH | Global-English SERP, seller intent, content-gap and attainable-link evidence | Grok | **done** | main @ `94fa50f` · PR #34 | Sourced SERP/intent report and 25-row attainable-link table merged; no invented volume, page generation, directory submission, deploy or direct-main push |
| WB-SEO-BASELINE | AITDK/GSC/browser baseline with URL, timestamp and before/after evidence | WorkBuddy | **done** | main @ `56f119b` · PR #33 | Read-only 2026-07-28 baseline merged: 16 impressions / 0 clicks / avg pos 4.1 (tiny sample); GSC 30 indexed / 67 not (data 7/24); seven-URL sitemap and noindex slimming confirmed with timestamped screenshots/JSON; no indexing request, code change, secrets, database or deploy |
| SELLER-GOLD | Seller Pack cached golden path + failure/retry/partial-success regression | Codex / Grok | **done** | agent/gpt/seller-pack-cached-golden-path · PR #39 | Synced to `main@24949a0`; contract/recovery/API golden tests, typecheck, lint (0 errors), 193-route build, link-check and fail-closed critical path pass. GitHub CI run #445 and Vercel check green; no paid/public/production action |
| R0H | Fail-closed public health truth for Soft Live | WorkBuddy | review | agent/workbuddy/health-truth | `ready.softLive` is true only when auth, reviewed Supabase atomic reservation, provider, and server-owned deliverable are all configured; otherwise health reports validation/cached-only and advertises 0 free live clips |
| R2a | Proof wall truth + mobile video budget + Starter Pack naming | Claude | review | agent/claude/product-proof-mobile | Home uses 8-item Showcase whitelist; concepts are static; autoplay 1 mobile / 2 desktop; three-output name frozen |
| R0 | Disable anonymous live generation; cached demo only until authenticated durable reserve | Claude / Grok / Codex | **done** | main via PR #43 + #47 | Anonymous never reaches the provider; capture exceptions withhold output and never release provider spend. GitHub CI #466 passed. Live multi-node still needs verified Vercel env and applied T5/R1 SQL before activation. |
| R1a | Atomic Supabase reserve/capture/release RPC + job binding | Claude | review | agent/claude/recovery-ledger | Source migration + strict RPC adapter ready; not applied to Supabase. Non-production DB integration required before deployment |
| R1b | Exact retry token + fixed deadline + worker/read separation | Claude / Grok | review | main | Video + image stills: exact parent→child + one-time bearer; fixed deadlineAt; CI recovery-retry-deadline; durable reconciliation still R1c |
| R1c | Durable settlement reconciliation worker | Claude / Grok | review | main | Generate + image enqueue withheld/release paths; source queue+lease+finish RPC. Non-prod SQL rehearsal still required |
| R2 | One owned-toy photo → three publishable assets → export Launch Pack | Codex | **done** | main @ `47688e6` · PR #44 | Homepage upload enters the fixed listing/reveal/hook trio; upload → rights → generate is at most 3 primary actions; export is downloadable-only. 390px QA: 0 overflow; cached browser: 3 videos, 0 provider, 0 credits. GitHub CI #456 and Vercel green; build, link, API golden, R0/recovery/engine smokes pass |
| R3 | Real integration tests + CI fail on critical path | Grok / Claude / Codex | done | main via PR #43 | Real workflow mirrors the recovery/T5/Seller Pack/copy suite, no longer permits `critical-path || true`, and all 21 PR checks plus Vercel passed. |
| R4 | Public-example evidence ledger and honest scoring | Grok / Claude | review | agent/claude/showcase-evidence-runtime | Runtime now matches ledger: 0 verified cases / 12 cached prototypes; no numeric scores; posters are references; homepage keeps 8 distinct labeled previews; live UI fails closed without explicit durable entitlement |
| R4b | Verified showcase promotion evidence gate | Claude | review | agent/claude/showcase-promotion-gate | Canonical evidence schema + fail-closed registry/label gate + 1 valid/8 invalid fixtures; current 12 prototypes and 8-video homepage remain unchanged |
| R4c | Public Live capability copy matrix + five-page contract | Claude | review | agent/claude/live-copy-matrix | Home/Create/Pricing plus Apps/Modules/Flow/Cinema and core SEO content fail public copy closed; source + 164 rendered-route contract passes |
| R4d | Responsive core-loop browser regression | Claude | review | agent/claude/mobile-proof-regression | 390/768/1440 core loop passes; Home proof cards now open Inside Project, cached landing/Seller Pack copy fails closed, Create has an accessible H1, and mobile playback stays at one |
| R5 | Growth claims cleanup and WorkBuddy permission boundary | GPT / Grok | review | agent/grok/growth-truth | Search/ranking/backlink claims corrected; generic directory automation and direct-main path disabled |
| KB-BRIDGE | Connect outbound knowledge base to Pikbo execution gates | GPT | **review** | agent/gpt/outbound-kb-bridge | GitHub bridge, task map, 8-week gates and PR template ready; Feishu publish blocked on missing local write client |
| GO | Public pikbo.ai Mode B | Grok | **blocked** | agent/grok/final-takeover | Grok owns readiness; boss still must explicitly approve public DNS and charging |
| GROK-TAKEOVER | Complete every remaining no-cost product, engineering, QA and private-release task | Grok | doing | main | T5/R0 code-side smokes reviewed through PR #40. **External blockers:** verify Vercel env, apply/rehearse SQL, confirm Email/callback; T6/Vercel DNS still blocked. |
| SUITE | 潮玩版 HF Generate + Yiha Modules 产品壳 | Grok | **review** | main | `/create` `/modules` suite chrome; softLaunch PRIMARY/MOBILE nav freeze; suite doors sitewide |
| G1 | Nav whitelist / kill empty doors | Grok | **review** | agent/grok/seo-gsc-p0 | GSC P0: PRIMARY = Explore·Create·Effects·Pricing; Preview/Lab in More |
| SEO-GSC | GSC VideoObject + crawl/noindex contract | Grok | **review** | main | Five-page marketing sitemap + legal (WorkBuddy budget); long-tail noindex; seo-cold-start-smoke in docs/ci; **boss: GSC after deploy still NO-GO** |
| SEO-AITDK | Google-first metadata, trust, content and AITDK remediation | GPT/Codex | **done** | main @ `c914eac` · PR #31 | 3/3 GitHub checks green; correct social cards, seven-URL sitemap, long-tail noindex, one primary-tool video, trust contacts, guide evidence, English default and llms.txt. Public deploy/GSC/AITDK rescan remain GO-gated; GA4 ID still required |
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
| T5 | Supabase auth + durable credits | Grok / Codex | **review** | main via PR #43 | Code-side smokes pass: R0 gate, refund/idempotency source locks and magic-link fail-closed. **Not production proof:** verify Vercel env, apply/rehearse T5+R1 SQL, and test Email callback (BLOCKERS T5 A–D). |
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
| T23 | CI build + conflict-marker gate | Grok / Codex | done | main via PR #43 | Real `.github/workflows/ci.yml` is synchronized; recovery/T5/Seller Pack/copy/link/critical checks are fail-closed and all 21 PR checks passed. |
| T24 | Generate honesty: demo vs live + regen/refund copy | Grok | review | main | Wave B: lastRequestCreditState, Retry/Variant, Free download gate, server costCredits/effect echo |
| T25 | Homepage truth labels + overclaim sweep | GPT | done | agent/gpt/claude-copy-audit | PR #6; cached/shared previews and provider-gated paths labeled |
| T26 | Unit economics doc + free-tier recommendation | GPT | done | agent/gpt/convert-truth | Superseded by C1–C5: implemented Free Mini 5s trial; current 1 / 5 / 15 allowances |
| T27 | Preset/SEO proof and copy wave 2 | Grok | review | main | Phase H: concept effects noindex; sitemap proof-only; private/preview robots; LandingResults honest empty |
| T28 | Pricing conversion copy A/B | GPT | done | agent/gpt/pricing-mobile | Outcome default; `?copy=cost` cost-control variant; C1–C5 aligns active 1 / 5 / 15 contract |
| T29 | Homepage first-screen 390px acceptance + polish | GPT | done | agent/gpt/pricing-mobile | No x-overflow; primary CTA visible; duplicate home floating CTA removed; accessible demo controls |
| T30 | Pricing UI matches active credit contract | GPT | done | agent/gpt/pricing-truth-main | Free 1 / Creator ~5 / Shop ~15; billing gate and future model-aware weights remain explicit |
| T5 | Supabase auth + durable credits | Grok / Codex | **review** | main via PR #43 | See primary T5 row + evidence; production multi-node integration remains external-gated. |
| T6 | Server-side free watermark (ffmpeg) | Grok | **blocked** | agent/grok/t6-watermark-worker-v1 | Fail-closed skeleton on main; Free raw blocked until owned derivative + ffmpeg proof |

---

## Done (keep short; detail → HANDOFF)

| ID | Task | Owner | SHA / link |
|---|---|---|---|
| D1 | Next.js shell + design system | mixed | early commits |
| D2 | Effects / for / toys pSEO axes | mixed | `lib/presets|usecases|toytypes` |
| D3 | Create studio + fal generate API | mixed | `app/create`, `app/api/generate` |
| D4 | Guest credits + paywall + pricing page | Grok | session cookie + `/pricing` |
| D5 | Repo published | Grok | https://github.com/CharlesHarry7/pikbo |
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
