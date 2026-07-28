# Handoff log — quality work others should reuse

Newest first. One block per meaningful landing.

---

### 2026-07-28 — [gpt] immersive toy Recipe home V1
- Home now opens on a full-bleed toy-video hero, then the frozen `HOME_PROOF_SLUGS` wall with eight distinct cached demos; every card links directly to `/create?effect=<slug>` and exposes the upload step in one navigation.
- Primary navigation is only Explore, Recipes, Create, Library and Pricing. Existing routes remain intact; Launch Pack stays below the Recipe wall as the later upgrade.
- Browser QA: 390×844 and 1440×900 both have zero horizontal overflow, eight Recipe cards and no console errors. No API, Supabase, Stripe, credits, SEO route or production configuration changed.

---

### 2026-07-28 — [claude] responsive proof-loop regression
- Restored the intended proof funnel: all eight Home proof cards open their registered Inside Project page; the secondary Remake control still opens Create.
- Public landing tools fail closed while `/api/me` is unknown/cached: `0 credits`, upload not processed, and no transient Free/Live promise. Seller Pack steps use the same `demoMode` truth instead of a static `30 live` label.
- Added an accessible single-Create H1 and removed the unconditional Chinese 30-credit Live claim from the first-run Seller Pack card.
- Browser PASS at 390/768/1440 for Home → Project → Create → Library → Seller Pack: no horizontal overflow; keyboard path reaches evidence and job controls; seven visible mobile wall videos still produce at most one playing clip.
- PASS: `mobile-proof-regression`, ESLint, TypeScript and Webpack production build (193 routes). Screenshots and the matrix live in `docs/qa/MOBILE_PROOF_REGRESSION.md`.

---

### 2026-07-28 — [gpt] R0 capture safety merged; growth queue stopped
- PR #47 merged at `a7fff1b`; GitHub Actions #466 passed the new behavioral R0 step plus the full fail-closed suite and production build.
- PR #42 was closed as unsafe/stale and replaced; its branch remains recoverable but is not a task source.
- PR #41 was closed without merging stale board ownership. Its useful fact remains: five checked directory submissions produced 0 published listings and 0 verified backlinks.
- The next two product gates are mobile main-path truth and a real baked-watermark derivative; WorkBuddy remains idle until publishable product proof exists.
- Vercel preview checks are currently rate-limited at the account level; local and GitHub production builds are green.

---

### 2026-07-28 — [gpt] R0 capture-exception safety replacement
- Replaced stale PR #42 with clean PR #47 from `main@e0ab4f0`; no old STATUS/HANDOFF rows were replayed.
- A failed or throwing capture now becomes `withheld` before generic error handling, so valid provider output cannot be followed by a credit release.
- Failed release attempts are `release_pending`, and the `finally` path uses the route reconciliation helper rather than silently discarding failure truth.
- PASS locally: 20-way release race, video/image capture-throw adapters, T5/R0 and recovery suites, typecheck, strict lint, and the 193-route production build.
- The connected GitHub App added `r0-safety-net` to the real workflow after direct OAuth correctly rejected workflow-file mutation; merge still waits for GitHub CI.

---

### 2026-07-28 — [gpt] single active queue reset
- Closed 11 stale, duplicate or superseded PRs; their branches remain recoverable, but they are no longer task sources.
- R2 PR #44 is merged at `47688e6`; GitHub CI #456 and Vercel are green, and the one-photo Launch Pack path is recorded done.
- Remote now has exactly two non-Codex delivery PRs: #42 for Grok's reservation safety and #41 for WorkBuddy's read-only backlink evidence. WorkBuddy's duplicate #46 was closed without deleting its branch.
- Blocked #42 from merge because a thrown capture can escape into the generic catch and release after provider success. Required proof: capture throw → withheld → 0 release backend calls, plus the test in real CI.
- Restricted #41 to one consolidated 9-site truth report; no R0H/code ownership, production action or new directory submissions.
- `DISPATCH` and `STATUS` now contain one authoritative queue; old rows are history unless Codex explicitly promotes one.

---

### 2026-07-28 — [gpt] R2 one-photo Launch Pack main path
- Homepage upload now hands one owned-toy still straight to `/create?mode=seller-pack`; the fixed outputs remain Listing 1:1, Reveal 9:16 and Social Hook 9:16. Header, soft-launch, command, login, status and footer doors no longer point at the dead `#home-tool` anchor.
- The first run is ordered as three primary actions: upload → rights confirmation → generate. Direct 390px entry shows only Upload before a still exists; after upload it shows one mobile ownership control, then Generate. Browser QA found 0 horizontal overflow.
- The result action is now an honest Launch Pack export: Lab runs say “Download Lab previews”; Live runs say “Export Launch Pack”; failed, unsafe and Free raw files are omitted. Browser cached run produced three playable Lab videos with 0 credits/provider.
- PASS: `launch-pack-main-path-smoke`, product-proof, typecheck, lint (0 errors), 193-route production build, engine, SELLER-GOLD, R0 cost gate, recovery ledger/retry/reconciliation, SEO cold start, link-check, critical-path and running-server Seller Pack API golden.
- Safety: no provider key, paid generation, Supabase mutation, Stripe, DNS, production deploy or GSC action.

---

### 2026-07-28 — [gpt] PR #40 integration review + real CI gate
- Merged Grok's T5/R0 pure-engine and source-lock tests without overwriting the newer Seller Pack handoff; the tests prove code-side fail-closed/refund/idempotency behavior only, not applied Supabase production readiness.
- Synced the real `.github/workflows/ci.yml` to the reviewed template so recovery, T5/R0, showcase, SEO, Seller Pack and copy checks run on GitHub; removed the old `critical-path || true` false-green path.
- Cleared the pre-existing `HomeViralWall` unused-index warning so strict ESLint is green.
- PASS: T5/R0 smokes, recovery QA/ledger/retry/reconciliation, Seller Pack pure + API golden, engine/showcase/SEO/copy contracts, link/critical path, typecheck, strict lint and 193-route production build.
- Remaining external truth: local env names are present, but Vercel env, applied T5/R1 SQL, Email Magic Link and callback behavior still require console/integration verification; no secret, database, provider spend, Stripe, DNS or public-release action was taken.

---

### 2026-07-28 — [gpt] SELLER-GOLD final verification
- PR #39 is synchronized with `main@24949a0`; the cached listing/reveal/hook trio, partial-success retention, failed-child retry boundary and zero-provider/zero-credit contract are verified.
- PASS: typecheck; lint (0 errors); 193-route build; engine, SEO, Seller Pack contract/API golden, recovery ledger/retry/reconciliation, link and fail-closed critical-path checks.
- GitHub CI run #445 and the Vercel status check are green. No provider key, paid generation, database, Stripe, DNS, public deployment or GSC action was used.

---
### 2026-07-28 — [grok] T5+R0 critical-path: refund, idempotency, auth fail-closed
- `npm run t5-r0-critical-path`: R0 pure gate; generate/image source order (access→reserve→fal); release+refundUnconfirmed honesty; engine release restores balance; settle idempotent; magic-link `NOT_CONFIGURED`; CI template fail-closed.
- Boss blockers explicit in `docs/BLOCKERS_REQUEST.md` § T5 A–E (keys, SQL, Auth URL, email, workflow scope).
- PASS: t5-r0-critical-path · t5-auth-credits-smoke · recovery-qa.
- Evidence: `docs/evidence/T5_R0_CRITICAL_PATH_2026-07-28.md`.

### 2026-07-28 — [grok] T5 pure engine + auth fail-closed smoke (Codex DISPATCH)
- Branch `agent/grok/t5-auth-credits-smoke`: `npm run t5-auth-credits-smoke` (strip-types import of `lib/durableCredits/engine.ts`).
- Covers reserve/settle/release/idempotent settle, guest migrate once, discard cookie when durable non-empty, expire stale, authConfig disabled default, T5+R1 SQL present, liveReservation no session debit.
- Wired into `docs/ci/github-actions-ci.yml` (live workflow still needs boss `workflow` scope).
- Evidence: `docs/evidence/T5_AUTH_CREDITS_SMOKE_2026-07-28.md`.
- PASS: t5-auth-credits-smoke · recovery-qa · engine-smoke.

### 2026-07-28 — [grok] Residual R0 cookie-authority honesty (Profile / claim / Settings / badge)
- ProfilePanel + Settings: cookie is **not** live-spend authority; live needs durable atomic reserve or labeled cached demos.
- `/api/auth/claim`: migrates display balance only — no soft-launch generate-authority claim.
- CreditsBadge: unexpected cookie live-spend path labeled R0 expects false; no “cookie still generate authority”.
- engine-smoke doesNotMatch old dishonest phrases; match not-live-spend / cookie display only.
- PASS: typecheck + engine-smoke @ `bf2d120`.

### 2026-07-28 — [grok] CreditsBadge / FreeTrialCta / Settings residual R0 honesty
- Removed “cookie still generates / authoritative for generate” from CreditsBadge tooltips.
- Free Mini live chip only when `freeLive.liveEnabled !== false`; otherwise Lab/cached-only copy (blocked until T6).
- FreeTrialCta defaults to Lab sample while Free live is closed; Settings shows display credits + live spend authority.
- PASS: engine-smoke + seller-pack-cached-smoke + recovery-qa + typecheck.

### 2026-07-28 — [grok] Login R0 honesty + Create sticky demo credits + API golden CI
- Login / LoginForm: guests = cached Lab only (0 credits · upload not processed); no “softLive generate” or cookie live-spend claim.
- Create mobile sticky strip: `0 credits · cached prototype` in demoMode vs “when Live”; `data-create-sticky=mobile`.
- CI server step runs `seller-pack-api-golden` (no FAL_KEY) after critical-path.
- PASS: engine-smoke + seller-pack-cached-smoke + typecheck.

### 2026-07-28 — [workbuddy] Read-only SEO baseline (AITDK + GSC + real browser)
- Branch `agent/workbuddy/seo-baseline-2026-07-28`; report `docs/evidence/WORKBUDDY_SEO_BASELINE_2026-07-28.md` + timestamped artifacts (PNG screenshots + raw-text JSON) in `docs/evidence/workbuddy-seo-baseline-2026-07-28/`.
- GSC property correction: only URL-prefix `https://pikbo.ai/` is accessible; `sc-domain:pikbo.ai` returns no-permission. 3-month web: **16 impressions / 0 clicks / avg pos 4.1** — only 2 queries (`pikbo` ×3, one bot-like boolean string ×9); sample too small for any ranking claim, per dispatch.
- Index (GSC data 7/24): 30 indexed / 67 not (noindex ×3, discovered ×46, crawled ×18). **Cross-check with live Googlebot-UA curl (7/28 03:47): 8 of 10 sampled "indexed" URLs now serve `noindex,follow`** — c914eac slimming is live; sitemap is down to 7 URLs, all indexable. Expect indexed count to fall to ≈7–11; next baseline must not misread this as an incident.
- Sitemap /sitemap.xml success (13 URLs at 7/27 read, 7 live now), 0 videos discovered by GSC despite valid `video:video` block on the primary tool page — recheck after next Google read. Videos enhancement 6 valid / 0 invalid; HTTPS 11/0; CWV no CrUX data; links report "processing, come back in ~1 day".
- AITDK site profile 404 (domain 7 days old); AITDK extension SERP overlay: Monthly Visits 0, domain created 2026-07-21. Brand SERP `pikbo` returns pikbo.ai #1–2; main keyword `ai toy video generator` SERP has zero pikbo presence (YouTube/AI-Overview dominated).
- Blockers logged, not bypassed: domain-property permission, links-report delay, video report 404, CrUX insufficient. No indexing request, no code change, no secrets/DB/deploy, no main push.

### 2026-07-28 — [grok] Seller Pack frozen contract + cached golden-path smoke
- `lib/sellerPackContract.ts`: single source for 3 PRD slugs/aspects + pure cached golden settlement (0 provider, 0 credits).
- BatchStudio re-exports contract; quote reuses live total; recovery keeps dependency-free FIXED_CHILDREN locked by smoke.
- `npm run seller-pack-cached-smoke` (+ golden-path alias): Free Mini full-pack block, export honesty, demo skips shadow, R0 live gate.
- Durable sellerPack header: cookie is not live-spend authority.
- PASS: seller-pack-cached-smoke + engine-smoke + recovery-qa + typecheck.

### 2026-07-28 — [grok] SERP intent + attainable link evidence (no page gen)
- Paths: `docs/growth/SERP_INTENT_EVIDENCE_2026-07-28.md`, `docs/growth/LINK_OPPORTUNITIES_2026-07-28.csv`
- Why good: English SERP clusters mapped to honest product capability (owned toy photo → seller launch assets); competitor gaps vs HF/Creatify/CapCut/Etsy documented with live URLs; link table prioritizes toy-vertical directories/communities over bulk AI spam; every row has source URL + Beijing timestamp.
- Reuse: Keep five-page/index freeze; do not invent volume; prefer ToyListings / art-toy directory / PH personal launch after readiness; cite Etsy 3–15s silent listing rules when shaping exports.
- Out of scope this PR: no directory submit, SEO pages, business code, deploy, GSC, secrets.

### 2026-07-28 — [grok] local R1c withhold journal + mobile poster-first LCP
- Process-memory `localReconciliationJournal` when Supabase R1c off: idempotent withhold facts, never stores `outputRef`, health counts only.
- Phase G: mobile wall `preload=none`; featured wall not LCP-eager; hero keeps poster preload.
- PASS: recovery-reconciliation + engine-smoke + typecheck.

### 2026-07-28 — [gpt] Three-Agent GitHub control plane
- Canonical source is `https://github.com/CharlesHarry7/pikbo`; stale repository references are corrected and the local clone now fetches every remote branch.
- SEO PR #31 merged to `main` as `c914eac` after 3/3 GitHub checks passed with no conflicts; no production deployment, GSC request or public release was triggered.
- Active lanes are now one task/branch/PR each: Codex control plane, Grok sourced growth evidence, and WorkBuddy read-only AITDK/GSC baseline.
- Hourly thread heartbeat is active and emits full Beijing 09:00/21:00 summaries; it will not duplicate busy tasks and stops a lane after the same blocker repeats three times.
- Next Codex task after this control-plane PR: Seller Pack cached golden path. T6 remains fail-closed without ffmpeg, verified object storage and non-production proof.

### 2026-07-28 — [grok] Webhook late/orphan withhold + Seller Pack shadow copy
- `applyProviderWebhookEvent`: orphan live success → `WITHHELD_ORPHAN` (no free clip / no "10 used"); late success after cancel/timeout uses `providerCompletionDecision` and withholds media.
- Webhook JSON echoes `withheld`; only `running` pre-deadline attempts may complete to succeeded.
- Seller Pack shadow error: cookie is not live-spend authority (generate cost gate).
- PASS: engine-smoke + recovery-qa + recovery-reconciliation + typecheck.

### 2026-07-28 — [grok] Seller Pack Free Mini gate + webhook orphan withhold
- `sellerPackLiveStartAllowed`: live 3-child start fails closed when balance < 30 (`FREE_MINI_FULL_PACK`); cached demos still 0 credits.
- BatchStudio `runBatch` preflight; cookie no longer claimed live authority; Free Mini single-child Generate doors.
- Provider webhook: orphan/late live success withheld (no free `10 used` media); response `withheld` flag; Seller Pack `DURABLE_OFF` copy honest.
- PASS: engine-smoke + typecheck.

### 2026-07-28 — [gpt] AITDK / Google-first technical SEO remediation
- Branch: `agent/gpt/aitdk-google-seo`; no new SEO routes, generation API, billing, credits or provider logic.
- Social metadata now uses the real `/opengraph-image.png` and `/twitter-image.png` routes through `lib/site.ts`; dead `@pikbo_ai`, retired `SearchAction`, empty `sameAs` and emitted meta keywords were removed.
- Sitemap remains the five reviewed marketing URLs plus Privacy and Terms. Other tools, effects, use cases, toys, projects and non-core guides remain reachable with `noindex,follow`.
- Home defaults new visitors to English, removes mixed-language indexed CTAs and six decorative video entities, and adds a compact About/guide/Privacy/Terms/contact trust surface.
- The primary tool has one prominent, playable cached prototype plus one truthful `VideoObject`; the sitemap adds the same verified media values. The photography guide adds dated organizational authorship, a concrete preflight table and three primary sources.
- Added `public/llms.txt` with exactly the seven canonical URLs. Existing analytics remains environment-gated and privacy-sanitized; owner must supply a real `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
- PASS: SEO cold-start smoke; engine smoke (32/32); TypeScript; ESLint with zero warnings; production build (193 routes); link-check; seven-page rendered canonical/title/description/social-card audit; long-tail noindex samples; 1440px and 390px visual QA with no console errors or horizontal scrolling.
- Public deployment, AITDK rescan, sitemap refresh and GSC indexing requests were not performed: `GO` is still blocked. Run them only after the public-release owner authorizes the deployment.

---

### 2026-07-28 — [grok] Phase H five-page SEO cold-start budget
- Marketing index allowlist = 5 (`/`, primary tool, blind-box tool, photography guide, `/pricing`) per WorkBuddy `SEO_INDEXABLE_10_RELEASE.md`.
- Legal `/privacy` + `/terms` stay indexable; long-tail tools/for leave sitemap (reachable + noindex).
- `npm run seo-cold-start-smoke` + docs/ci gate; engine-smoke locks marketing count=5.
- GSC submit still NO-GO until deploy + live-copy/evidence gates green.
- Checks: seo-cold-start-smoke + engine-smoke + typecheck PASS.

### 2026-07-28 — [grok] Image R1c reconciliation enqueue parity
- Live `/api/image`: late Flux (cancel/timeout) and capture-fail both call `recordProviderSucceededWithheld` with private `outputRef` (never public free still).
- Release failure enqueues `recordConfirmedPreOutputFailure` / `recordSettlementUnknown` (generate parity).
- `recovery-reconciliation` locks generate + image route wiring.
- SQL still unapplied — follow `docs/ops/R1C_NON_PROD_REHEARSAL.md`.
- PASS: recovery-reconciliation + recovery-qa + engine-smoke + typecheck.

### 2026-07-28 — [claude] public Live capability copy gate
- Home, Create, Pricing, Apps, Modules, Flow, Cinema, core tool/use-case content and structured data now lead with `cached prototype · 0 credits · upload not processed`; a model key alone is never presented as public Live.
- Recipe doors are labeled READY/PREFILLED rather than LIVE. Seller Starter Pack static copy describes three recipes; a 30-credit Live quote appears only inside an eligible runtime state.
- Plan allowances remain visible as conditional planning estimates (`when Live is enabled`), while checkout and protected delivery stay explicitly closed during validation.
- Added `live-capability-copy-smoke`: 18 promise-bearing source files plus generated route HTML reject unconditional Live/Free-Mini phrases; the documented CI template runs it before and after build.
- PASS: source contract, product-proof contract, TypeScript, ESLint (0 errors / 1 pre-existing warning), Webpack production build (193 routes), rendered contract across 164 HTML routes.

---

### 2026-07-28 — [claude] R1c durable settlement reconciliation (source only)
- Added a service-role-only reconciliation queue and immutable event table for `provider_succeeded_output_withheld`, `capture_pending`, `release_pending`, `captured`, `released` and unknown-review state.
- Provider success after timeout/cancel or an ambiguous capture response is persisted as withheld; confirmed pre-output release failures are queued, while unknown provider failures stay manual/unconfirmed.
- `FOR UPDATE SKIP LOCKED` worker leases prevent double processing; expired leases can be reclaimed, and duplicate event/finish calls return the same terminal truth without a second ledger mutation.
- The finish RPC delegates to R1a atomic capture/release: confirmed capture proves financial settlement only; raw provider output remains service-private and withheld until a separate T6 server-owned derivative passes delivery checks. Only confirmed release can claim a refund. Health remains fail-closed until the R1c schema probe and operator flag both pass.
- Depends on pgcrypto + T5 + R1a. Migration was **not** applied anywhere; follow `docs/ops/R1C_NON_PROD_REHEARSAL.md` before any operator flag or live beta.
- PASS: 20-way lease race, duplicate facts, crash takeover, timeout-late capture, capture/release race, health 32/32, recovery suites, typecheck, lint (0 errors / 2 pre-existing warnings), and Webpack build (193 routes).

### 2026-07-28 — [claude] R4b verified showcase promotion gate
- `lib/showcaseEvidence.ts` is the canonical evidence schema: rights/source records, distinct hashed input, provider task+request IDs, model parameters, hashed output, named reviewer/time, and five 4–5 pass dimensions.
- Registry import and provenance labels call a fail-closed promotion gate; `official/live` without every evidence field now throws and fails the build.
- Current 12 rows stay cached prototypes with no public score. Homepage retains the same eight distinct videos; no media or layout was redesigned.
- Inside Project adds a compact evidence checklist and keeps the Recipe CTA prominent; prototypes remain visibly unscored and promotion-locked.
- PASS: promotion gate (1 valid + 8 invalid fixtures), showcase evidence, product proof, engine smoke, typecheck, lint (0 errors / 2 pre-existing warnings), webpack production build.

### 2026-07-27 — [grok] Image still R1b parity + CI recovery smokes
- `forkRetryImageJob` / `claimRetryImageJob`: exact parent/child id, one-time bearer (hashed), fixed `deadlineAt`; no prompt promote.
- Retry route returns real `retryToken` (not job id); Library stores `pikbo_retry_token:{id}`; Still studio one-shot claim.
- `docs/ci`: `recovery-retry-deadline` + `showcase-evidence-smoke` after ledger.
- Boss re-copy `docs/ci/github-actions-ci.yml` → `.github/workflows/ci.yml`.
- Checks: recovery-retry-deadline + recovery-qa + engine-smoke + typecheck PASS.

### 2026-07-27 — [claude] R4 showcase evidence truth at runtime
- The canonical Showcase registry now uses `cached_prototype` and `referencePoster`; it does not claim posters are provider inputs or expose invented 4/5 scores/reviewer notes.
- Home retains eight distinct cached videos for watch time, but every proof surface labels them `PIKBO Lab · cached prototype`; concepts remain static Recipe art.
- Inside Project discloses missing provider task ID, rights record and formal QA. Community/Explore no longer imply verified cases, customers, or a live public publish pipeline.
- Create and Seller Pack fail closed to 0-credit cached previews unless signed-in + durable credits + explicit live mode + enough balance are all present.
- PASS: `showcase-evidence-smoke`, `product-proof-smoke`, `engine-smoke`, typecheck, lint (0 errors / 2 pre-existing warnings), webpack build (193 routes).

### 2026-07-27 — [claude] R1b exact retry + fixed generation deadline
- Video retry now forks only from an exact terminal parent job ID and returns a new child ID plus a one-time bearer; Create claims that exact child and never guesses by effect, prompt or list order.
- The bearer is hashed server-side, handed through session storage, removed after hydration and consumed once; a 20-way concurrent claim regression has exactly one winner.
- Every video job receives an immutable `deadlineAt`; GET/list polling is read-only, while trusted worker heartbeat is separate and cannot move the deadline.
- Provider output is settled/delivered only while the exact attempt remains `running`; cancel, timeout, failure, queued or missing state withholds the late output and marks settlement unconfirmed.
- Scope is video generation only. Image/Seller Pack retry parity and durable settlement reconciliation remain open; no production Supabase migration was applied.

### 2026-07-27 — [workbuddy] fail-closed Soft Live health truth
- `/api/health` now requires auth, Supabase atomic reservation, provider, and a server-owned deliverable before `ready.softLive=true`.
- Any missing prerequisite reports `validation` or `cached-only`; the public health contract exposes zero free live clips and `cached-demo-only`.
- A provider/session secret alone can no longer make health advertise live generation.
- `health-truth-contract` exhaustively verifies all 16 prerequisite combinations and runs inside `engine-smoke`.
- Scope is health/read-only contracts only; no generate, image, session, credits, Stripe, Supabase, Vercel, or production mutation.
- PASS: bash syntax, engine smoke, typecheck, lint (0 errors / 2 pre-existing warnings), and Webpack production build (193 routes).

### 2026-07-27 — [grok] R1b explicit retryJobId + fixed deadline
- Process-memory promote only with client `retryJobId` fork token (generate/image/Create remix); never effect/prompt guess.
- TIMEOUT deadline fixed from `createdAt`; `touchJob` / poll cannot extend.
- `forkRetry` → remix `retryJobId` handoff; contracts accept body field.
- Checks: engine-smoke + typecheck PASS. R1a SQL apply + R1b durable reconciliation still boss/Claude.

### 2026-07-27 — [grok] R1a capture-ambiguity client + recovery-ledger CI
- `generateClient` / `imageClient`: `DURABLE_CREDITS_UNAVAILABLE` withholds output and never invents refund or "10 used"; AUTH/LIVE_ACCESS/RESERVATION fail copy honest.
- Health exposes `recoveryLedger` (r1a source true, appliedRequiresBoss, r1b open) — presence only.
- `docs/ci`: `npm run recovery-ledger` after recovery-qa; recovery-qa/engine-smoke lock CI + client honesty.
- Boss still re-copy `docs/ci/github-actions-ci.yml` → `.github/workflows/ci.yml`.
- Checks: recovery-qa + recovery-ledger + engine-smoke + typecheck PASS.

### 2026-07-27 — [claude] seller-first Create three-step path
- First run is now `upload owned toy photo → choose Listing/Unboxing/Social Hook/Starter Pack → review exact quote and generate`.
- Model shelf, workflow shelf, activation checklist, full recipe catalog, prompt, model, duration, seed and fidelity guidance no longer obstruct first activation; advanced controls remain available collapsed.
- Mobile keeps one sticky primary Generate action; the single-clip path emits `generation_quote_view`/`generate_start`, while only BatchStudio emits `pack_quote_view`/`pack_start`.
- Starter Pack stays three independent outputs at 30 live credits; the rule-based asset brief is labeled guidance, not an identity-scoring engine.
- PASS: recovery QA, atomic-ledger smoke, product-proof smoke, engine smoke, typecheck, lint (0 errors / 2 pre-existing warnings), webpack build (193 routes).

### 2026-07-27 — [grok] R3 recovery QA + image still R0 + CI fail-closed
- `scripts/recovery-qa.mjs`: R0 cost gate, concurrent overspend (50→5/6), confirmed-failure refund, no double settle/release, Seller Pack partial, generate+image route order, no Cookie debit, CI critical-path fail-closed.
- `/api/image` live Flux: same R0 gate as generate (cached demo for anonymous/Free; durable reserve + `invokeReservedProvider`; no Cookie debit).
- `docs/ci/github-actions-ci.yml`: runs `recovery-qa`; removes `critical-path || true` (demo-cached default).
- `npm run recovery-qa` (+ alias `recovery-cost-gate`); engine-smoke locks.
- Boss: re-copy `docs/ci/github-actions-ci.yml` → `.github/workflows/ci.yml` (OAuth lacks workflow scope).
- Checks: recovery-qa + engine-smoke + typecheck PASS.

### 2026-07-27 — [claude] R1a atomic durable generation ledger (source only)
- Added one-transaction Supabase RPCs for reserve + job binding + ledger debit, capture and release; the wallet and entitlement rows are locked and duplicate user/idempotency requests are idempotent.
- Only the transaction winner receives `providerAuthorized=true`; the provider guard rejects replay observers, missing reservations and insufficient balance before any paid call.
- Migration preflight aborts on duplicate personal accounts or duplicate generation keys; SQL was **not** applied to Supabase and still requires a reviewed non-production integration run.
- A provider success followed by an ambiguous capture failure now withholds output and reports settlement pending; it never claims `10 used` or a refund.
- R1b/R1c remained open at this point: retry/deadline mechanics plus reconciliation of ambiguous provider/capture outcomes.

### 2026-07-27 — [claude] R0 anonymous provider-cost gate
- Anonymous and Free Create requests now return official cached demos at 0 credits even when `FAL_KEY` exists.
- Live calls require verified Supabase auth, a non-Free durable account and a committed Supabase reservation; no Cookie/local-file fallback.
- Both FAL upload and subscribe are guarded by the reservation boundary; regression proves anonymous/Free/reserve-failure = 0 provider calls.
- Checks: recovery-cost-gate + engine-smoke PASS; TypeScript PASS; ESLint 0 errors (2 pre-existing unused-import warnings).
- R1 remains open: replace the current non-atomic Supabase adapter with one transaction/RPC before enabling live beta.

### 2026-07-27 — [claude] product proof + mobile playback convergence
- Non-mechanical logic: `lib/videoFeed.ts`, `app/page.tsx`, `VideoTile`, `PresetPreviewCard`, `AutoPlayVideo`, `HomeViralWall`, `HomeCinemaHero`, and `HfExploreHome`.
- Home now reads the same eight-item Showcase whitelist for hero and wall; the legacy viral helper is capped to that registry.
- Concept recipes use static Recipe art, open their notes, never borrow/autoplay another effect clip, and do not claim Remake.
- Global playback budget is one mobile / two desktop; featured video exposes pause/mute and reduced-motion remains poster-first.
- Remaining touched product files are mechanical `Seller Starter Pack` naming only; 12-clip Launch Pack appears only as `coming later`.
- PASS: product-proof smoke, engine-smoke, lint (0 errors / 2 pre-existing warnings), typecheck, webpack production build (193 routes).

### 2026-07-27 — [gpt] recovery audit and restored role split
- Audited production, generation accounting, product funnel and WorkBuddy growth claims.
- P0: public FAL is live while auth/durable credits are disabled; anonymous live must close.
- Restored Claude=engineering, GPT=product contract, Grok=growth/QA; WorkBuddy is read-only growth.
- Froze page expansion and directory automation until cost safety and Toy Launch Pack close.
- Full evidence and acceptance: `docs/AUDIT_2026-07-27.md` and top of `docs/DISPATCH.md`.

### 2026-07-27 — [gpt] outbound knowledge base → Pikbo execution gates
- Paths: `docs/outbound/README.md`, `PIKBO_TASK_MAP.csv`,
  `WEEKLY_REVIEW_TEMPLATE.md`, `.github/PULL_REQUEST_TEMPLATE.md`.
- Why good: maps the generic 16-week outbound plan onto Pikbo's current
  product-polish/private-Beta stage instead of restarting completed work.
- Reuse / pitfalls: GitHub owns code and task truth; Feishu should own
  interviews, decisions and restricted evidence. Do not duplicate the STATUS
  board in Feishu or treat provisional Beta thresholds as market facts.
- Depends on: Feishu publish/backlink is still pending because this environment
  has no available Lark write client. Public DNS, Stripe live and paid spend
  remain outside this delivery.

### 2026-07-27 — [grok] Cinema compose + /generate alias remix
- Cinema Render → createRemixHref(effect)+prompt+sku (ratio/duration/channel);
  data-cinema-compose=remix. Not bare /create?effect&prompt.
- Bare /generate → createRemixHref(360-spin); query strings still pass through.
- Smoke: cinema compose + generate alias locks.

### 2026-07-27 — [grok] Promote queued ledger-retry forks on re-POST
- `beginImageJob`: promote newest same-prompt `queued` fork (or sole queued)
  instead of orphan TIMEOUT; rebinds client idempotency key.
- `beginSyncGenerateJob`: promote newest queued fork with parentJobId+effect.
- Settings/Profile: HEAD `X-Pikbo-Image-Jobs-Queued`; health imageRetry +
  ledgerRetryPromote. Smoke locked.

### 2026-07-27 — [grok] /image studio ledger-fork Retry UI
- Still strip Retry → POST /api/image/[id]/retry then re-POST Flux (new key).
- Cancel covers queued forks; data-image-session-retry-mode=ledger-fork.

### 2026-07-27 — [grok] POST /api/image/[id]/retry still ledger fork
- `forkRetryImageJob` + ImageJobStatus `queued` + parentJobId (generations parity).
- POST `/api/image/[id]/retry` forks tracking child; client re-POSTs Flux.
- Sweep/touch/cancel/open counts include queued; GET list byStatus.queued.
- /image Retry + Library Ledger retry: fork then studio handoff.
- Smoke: imageRetryRoute + forkRetryImageJob + queued histogram locks.

### 2026-07-27 — [grok] Library stills + forkRetryImageJob
- LibraryGrid SessionStillJobsPanel: GET /api/image list+poll, DELETE cancel,
  Open/Retry → `/image?job|prompt|aspect`, Ledger retry → POST …/retry.
- `forkRetryImageJob` · queued status · parentJobId · byStatus.queued ·
  HEAD X-Pikbo-Image-Jobs-Queued · POST /api/image/[id]/retry (202 + imageUi).
- /image hydrates query prompt/aspect/job. Smoke: session-stills + forkRetry locks.

### 2026-07-27 — [grok] Library session stills recovery
- LibraryGrid SessionStillJobsPanel: GET /api/image list+poll (touch open TTL),
  DELETE /api/image/[id] cancel with refund-unconfirmed toast.
- Open → `/image?job=` · Retry → `/image?prompt=&aspect=` (createStillStudioHref).
- /image hydrates query prompt/aspect/job via single-job GET includeDataUrl.
- Smoke: data-library-panel=session-stills + cancel/retry locks.

### 2026-07-27 — [grok] GET/DELETE /api/image/[id] still poll parity
- `getImageJob` · `touchImageJob` · `toPublicImageJob({ includeDataUrl })` for
  single-job recovery (list still omits multi-KB data: bodies).
- GET/DELETE `/api/image/[id]` mirrors generations/[id]; list DELETE accepts body.id.
- Image studio ledger: Open (list URL or single-job GET), Cancel running,
  Retry terminal with prompt/aspect overrides (no setState race).
- Smoke: imageByIdRoute + session cancel/retry locks.

### 2026-07-27 — [grok] AppShell/Footer/Pricing residual Generate remix
- AppShell desktop + mobile top Generate CTAs → createRemixHref(360-spin)
  (data-appshell-cta); PRIMARY/MOBILE nav suite entry still bare /create.
- Pricing Full studio → remix + source pricing-*; Footer Product Generate remix.
- Community remake / apps detail / HomeFeatureCarousel fallbacks; browse/cinema
  prefetch use remix URL. Smoke: shell/footer/pricing residual locks.

### 2026-07-27 — [grok] GET /api/image session still ledger
- `listImageJobsForSession` · `touchOpenImageJobsForSession` · `toPublicImageJob`
  (safe http only; data: demos → hasImage, no multi-KB list JSON).
- GET /api/image parity with GET /api/generations: byStatus/open/total full-session,
  newest page, TIMEOUT sweep, touch open. HEAD echoes List-Limit.
- /image shows process-memory session ledger strip (failed/canceled honesty).
- Smoke: image GET + list/touch/public + data-image-session-ledger.

### 2026-07-27 — [grok] Residual Lab sample try → createLabSampleTryHref
- ModulesSuiteCtas · ModulesMobileCta · SoftLaunchStrip demo try ·
  HomeFeatureCarousel Seedance Mini use createLabSampleTryHref(scout)
  (remix + try/sample), not bare /create?try=1&sample=scout.
- Smoke: residualLabSampleDoors locks across FreeTrial/Fail/Library/cmd too.

### 2026-07-27 — [grok] Job + Lab-sample remix contract
- `createJobRemixHref` / `createLabSampleTryHref` / `createWorkbenchHref` in
  lib/jobIntents.ts — effect+ratio+duration+channel (+ job= or try/sample).
- Registries: workflows · catalog APPS · deliveryPack next/variant · CommandPalette
  jobs · GenerateSuiteChrome Generate · Flow core-i2v · Pricing Animate.
- FreeTrialCta · FailPanel Lab sample · Library session Lab sample use try remix.
- softLaunch PRIMARY/MOBILE nav still bare /create (suite entry). Smoke locked.

### 2026-07-27 — [grok] Residual product Generate doors → createRemixHref
- Page chrome + suite shelves (Library/Profile/Settings/Explore/Effects/Tools/
  Community/Apps/Guides/Modules/Flow/Models/Batch/Cinema/Status) +
  HfProductRail Seedance card + Open Generate, HfExploreHome, Hero try-photo,
  SeedanceCampaign, LandingSeoMesh, Image Create-video, BatchStudio Single
  Generate → createRemixHref(360-spin) (ratio/duration/channel).
- Zero bare href="/create" left in app/components tsx (seller-pack mode kept).
- Smoke: residualGenerateDoors data-*-generate=remix + HfProductRail order.

### 2026-07-27 — [grok] Header/Library/Profile Generate remix + cancel toast
- Header Create a clip · Library sticky/empty/session Open Create · Profile
  Generate → createRemixHref(360-spin).
- Library cancel toast uses DELETE refundUnconfirmed (never invent restore).
- Smoke: data-header-cta / library-empty / profile-generate + cancel toast.

### 2026-07-27 — [grok] Login/mobile remix + DELETE cancel refundUnconfirmed
- /login guest Continue → Generate + LoginForm disabled CTA use
  createRemixHref(360-spin) (not bare /create / partial query).
- MobileGenerateBar sticky Generate → same remix contract.
- DELETE cancel (generations list/id + image) echoes refundUnconfirmed when
  ledger stamps refund unconfirmed (downloads HEAD parity).
- Smoke: data-login-guest / data-mobile-bar + cancel refundUnconfirmed.

### 2026-07-27 — [grok] Login honesty: prod auth disabled; guest softLive
- Production: auth.mode=disabled (no Supabase). Guest cookie generate works.
- /login explains live-now vs needs-keys; guest Generate remix CTA.
- Boss to enable: Vercel SUPABASE_* + T5 SQL + Auth callback URLs.

### 2026-07-27 — [grok] beginSync aspect stamp for fail/cancel remake
- `beginSyncGenerateJob` stores duration/aspectRatio/resolution at open so
  Library remake/retry after fail/cancel still carries the attempted run.
- generate route passes secs/aspect/resolution into beginSync.
- Downloads CANCELED body echoes refundUnconfirmed; SuiteDoorLinks default
  Generate uses createRemixHref(360-spin); Create provenance when confirmed.
- Smoke: beginSync aspect/duration + cancel refundUnconfirmed.

### 2026-07-27 — [grok] Suite/HowItWorks/HomeSeo Generate remix doors
- HowItWorks Open Generate · SuiteEntryStrip flagship + open link · HomeSeoBody
  full Generate → createRemixHref(360-spin) (ratio/duration/channel).
- Smoke: data-how-it-works / data-suite-entry generate-remix; no bare href:/create
  as suite Generate first door.

### 2026-07-27 — [grok] AGENT_SYNC iron rule: all work must hit GitHub main
- `docs/growth/AGENT_SYNC.md`: pull → read log/STATE/COMMUNICATION/HANDOFF → work → push
- COMMUNICATION_LOG multi-agent; PLAYBOOK + AGENT_BUS linked
- Audit: main clean vs origin; growth runs + plans on remote; stashes = non-official WIP

### 2026-07-27 — [grok] 30d GeFei plan + unboxing-bridge guide (not toddler list)
- PLAN_30D_GEFEI_CROSSCHECK: correct product identity; Grok vs WB split.
- Guide toy-unboxing-video-from-one-photo bridges SERP probes without shopping-list intent.
- Blind-box tool Title/D CTR; WB week1 prompt. No sitemap expand, no main H1 change.

### 2026-07-27 — [grok] Soft-launch Generate remix + tool FAQ refund honesty
- SoftLaunchStrip Open Generate → createRemixHref(360-spin) remix contract
  (ratio/duration/channel), not bare /create.
- tools FAQ “motion looks off”: refund when server can confirm (not bare
  “refund the credits”).
- Smoke: data-soft-launch=generate-remix · tools.ts doesNotMatch bare refund.

### 2026-07-27 — [grok] GET generations full-session byStatus + touch all open
- `touchOpenJobsForSession`: Library poll slides TTL on **every** open job
  (not only the newest list page) — prevents false TIMEOUT on unlisted rows.
- GET `byStatus` / `open` / `total` from full-session `countJobsForSession`
  (queued/running split); list page still newest-N via `listLimit`/`listed`.
- Library session panel: honor server page (≤50), show “N of total” when
  truncated; drop silent `slice(0, 12)`.
- Modules Photo→Clip: `createRemixHref(360-spin)` remix contract.
- Smoke: touchOpenJobsForSession + no body.jobs.slice(0,12).

### 2026-07-27 — [grok] Full-session job HEAD counts + rate/balance download codes
- `countJobsForSession`: HEAD `/api/generations` no longer slices newest-30
  (under-counted failed/canceled). Image listImageJobCountsForSession parity.
- GET list page bumped to 50; `X-Pikbo-Jobs-List-Limit` echo for clients.
- `classifyDownloadHead`: PROVIDER_RATE_LIMIT / RATE_LIMITED / PROVIDER_BALANCE
  honest block toasts (not generic 409 “not ready”).
- Smoke: countJobsForSession + pure full vs page + rate/balance messages.

### 2026-07-27 — [grok] Refund copy: when confirmed (not bare refund)
- SoftLaunchStrip · TrustStrip · CreateStudio credit strip · i18n delivery:
  "refunds when confirmed" (matches freeTrial.failedLiveRefundPolicy).
- Drops bare "failed jobs refund" overclaim (TIMEOUT/cancel stay unconfirmed).
- Smoke: doesNotMatch bare refund on SoftLaunch/Trust/Create.

### 2026-07-27 — [grok] Profile still-image jobs probe (Phase C)
- ProfilePanel HEAD `/api/image` alongside video `/api/generations` (Settings
  parity): open/total/failed/canceled process-memory Flux stills.
- Video probe also surfaces failed·canceled counts; image door → `/image`.
- Smoke: data-profile-jobs=image|video + X-Pikbo-Image-Jobs headers.

### 2026-07-27 — [grok] Profile still-image jobs probe
- ProfilePanel HEADs `/api/image` for process-memory Flux counts (open/total/
  failed/canceled) — Settings parity with video `/api/generations` probe.
- Video strip: failed/canceled counts; `data-profile-jobs=video|image`.
- Smoke already locks Image-Jobs headers + dual strips.

### 2026-07-27 — [grok] Download HEAD fail-code honesty
- `classifyDownloadHead`: terminal fail codes (PROVIDER_NETWORK · CONTENT_POLICY ·
  MODEL_EMPTY · UNSAFE_URL · cancel) evaluated **before** generic 409/NOT_READY
  so Library/Create no longer toast “not ready” on failed jobs.
- `/api/downloads` failed gate: PROVIDER_NETWORK → 503; HEAD echoes
  `X-Pikbo-Credits-Outcome` when present.
- Webhook provider fail applies `failedLedgerCreditsOutcome` (failSync parity).
- Smoke: pure 409+PROVIDER_NETWORK → network message (not not-ready).

### 2026-07-27 — [grok] Fail ledger refund-unconfirmed parity
- `failedLedgerCreditsOutcome` + `isAmbiguousDebitFailureCode` in createTrust.
- generate failSync/recordFailed + image failImageJob stamp refund unconfirmed
  for TIMEOUT/PROVIDER_*/CONTENT_POLICY/UNSAFE_URL/MODEL_EMPTY/cancel when
  restore is not confirmed (was often undefined on the ledger).
- Library session jobs: broader unconfirmed codes + Lab sample door.
- Clients: MODEL_EMPTY on typed error body → refundUnconfirmed.
- Smoke: pure ledger map + Library PROVIDER_NETWORK/MODEL_EMPTY locks.

### 2026-07-27 — [grok] After-path + Image handoff remix contract
- GenerateAfterPath Full Generate / Next SKU use createRemixHref +
  remixOptsFromRecord (ratio/duration/channel); optional aspect/duration props.
- CreateStudio + LandingToolPanel pass last-run params into after-path.
- `/image` Animate → Create (header/footer/free-trial) → createRemixHref
  (360-spin default + sku); Seller Pack handoff unchanged.
- Smoke: after-path createRemixHref; image handoff not bare /create?sku=.

### 2026-07-27 — [grok] Image FailPanel shared settlement
- `/image` FailPanel no longer hand-rolls a partial code list (TIMEOUT ·
  UNSAFE_URL · REQUEST_CANCELED only) — uses `requestCreditStateFromFailure`
  (Create/Landing/Batch parity).
- Covers CONTENT_POLICY · PROVIDER_NETWORK · PROVIDER_TIMEOUT · MODEL_EMPTY ·
  NETWORK_ERROR · CANCELED without inventing restore.
- Smoke: image page imports createTrust settlement.

### 2026-07-27 — [grok] Remix job params + MODEL_EMPTY refund honesty
- createRemixHref(opts) + remixOptsFromRecord: Retry/Remake reopen Create with
  actual generation params (not preset defaults only).
- Library session remake · device history remake · POST /retry createUi · Pack
  Try chips (Listing 1:1 · Reveal/Flash 9:16).
- MODEL_EMPTY / empty 200 → refundUnconfirmed (generate+image clients + createTrust);
  fail-replay cancel → 409 REQUEST_CANCELED; image replay + PROVIDER_NETWORK 503.
- Smoke: remixOptsFromRecord · job remake params · MODEL_EMPTY settlement.

### 2026-07-27 — [grok] Pack retryEligible allows TIMEOUT unconfirmed
- BatchStudio retryEligible no longer blocks creditState refund unconfirmed
  (TIMEOUT/cancel settlement) or requires requestId — Retry mints new generate.
- CONTENT_POLICY without confirmed restore → refundUnconfirmed (createTrust +
  generate/image clients). Smoke locks eligibility + policy codes.

### 2026-07-27 — [grok] Library session Ledger retry (fork + createUi)
- SessionJobsPanel: failed|canceled → "Ledger retry" POSTs
  /api/generations/[id]/retry then navigates to next.createUi (remix).
- Honest toasts: JOB_IN_FLIGHT · NOT_RETRYABLE · network.
- Smoke: data-session-retry=ledger-fork + NOT_RETRYABLE locks.

### 2026-07-27 — [grok] forkRetryJob terminal-only eligibility
- Server forkRetry rejects succeeded / queued / running parents with
  NOT_RETRYABLE (422) or JOB_IN_FLIGHT (409); only failed|canceled fork.
- Retry route maps codes honestly; createUi already createRemixHref.
- Smoke: NOT_RETRYABLE|JOB_IN_FLIGHT + retry route status locks.

### 2026-07-27 — [grok] Retry createUi remix + FailPanel Seller Pack
- POST /api/generations/[id]/retry `next.createUi` → createRemixHref(effect)
  (ratio/duration/channel), not bare create?effect=.
- GenerateFailPanel: product-first Seller Pack chip (listing+reveal+hook).
- generate/image clients: UNSAFE_URL without confirmed refund → refundUnconfirmed.
- Smoke: retry route no bare createUi; data-fail-path=seller-pack.

### 2026-07-27 — [grok] Residual createRemixHref deep-link sweep
- BatchStudio brief recipe pick + free-trial single-recipe chips → remix href.
- HfExploreHome fallback feed, HeroVideoBanner, Community UGC remake,
  /effects/[slug] Open Generate → createRemixHref (ratio/channel/duration).
- Smoke: no create?effect=${ in BatchStudio; remake surfaces locked.

### 2026-07-27 — [grok] Landing tool paths: remix + Seller Pack first
- LandingToolPanel Full studio / Lab sample → createRemixHref(+sku).
- Product-first footer: Full studio · Seller Pack · Batch Preview (supercomputer demoted).
- LandingResults + SuiteDoorLinks: createRemixHref remake doors.
- generateClient/imageClient: PROVIDER_NETWORK → refundUnconfirmed echo.
- Smoke: data-landing-paths + data-landing-studio=seller-pack.

### 2026-07-27 — [grok] Community UGC fail-closed + PROVIDER_NETWORK settlement
- CommunityPublishButton: refuse session /api/downloads + Lab /demos before network;
  match server isPublicCommunityVideoUrl (no origin-absolute demos).
- requestCreditStateFromFailure: PROVIDER_NETWORK → refund unconfirmed (not null).
- HeroUpload + Library session Retry: createRemixHref (ratio/channel carry).
- HomeFeatureCarousel: remake remix hrefs + Seller Pack door (not /supercomputer).

### 2026-07-27 — [grok] Home feature carousel remake + Seller Pack path
- HomeFeatureCarousel: recipe cards use createRemixHref; Seller Pack door →
  /create?mode=seller-pack (not /supercomputer); Official · Lab ≥4 chips.
- HeroUpload: push createRemixHref(effect) with pending still (ratio/channel).
- Smoke: data-home-promo-path · no /supercomputer href · HeroUpload remix.

### 2026-07-27 — [grok] Cinema hero Seller Pack CTA + remake remix href
- HomeCinemaHero: Seller Pack door + createRemixHref remake (recipe carry).
- Smoke: data-cinema-cta=seller-pack.

### 2026-07-27 — [grok] 24h sprint: guides + About + home long-tail mesh + growth queue
- Guides: designer-toy-ai-video-vs-generic-tools; seller-pack-workflow-listing-reveal-hook
- `/about` trust page (CONCEPT_ROBOTS noindex); Footer links
- HomeSeoBody long-tail chips → rank URLs + guide (internal equity)
- directories.json: 4 free candidates + blue-ocean anchors; WORK_QUEUE 04/05 open
- `docs/growth/SPRINT_24H.md` dual-track mandate. No sitemap expand.

### 2026-07-27 — [grok] Deploy SEO checklist (prod lag vs main 7de8049)
- Prod still sitemap 9 + long-tail noindex; code on main is 13 + indexable TDH.
- Boss action: Vercel redeploy main; then GSC + WorkBuddy. Checklist:
  `docs/growth/DEPLOY_SEO_CHECKLIST.md`.

### 2026-07-27 — [grok] Explore noindex + LandingResults Lab ≥4 + Pack still
- `/explore`: CONCEPT_ROBOTS (noindex,follow) — matches cold-start sitemap drop
  (13 long-tail URLs; Lab wall not rank battlefield).
- LandingResults (tool SEO pages): Official · cached + provisional Lab ≥4;
  CTA Remake · your toy photo.
- BatchStudio adopts `pikbo_pending_still` from Image → Seller Pack (Create parity).
- Sitemap: drop dead `/explore` priority branch; tools 0.85 · for 0.75.
- Smoke: explore noindex · LandingResults proof · pending still.

### 2026-07-27 — [grok] Long-tail blue-ocean keyword cluster (7 terms)
- Map: `docs/growth/LONG_TAIL_KEYWORD_MAP.md` — one job per URL.
- On-page TD/H1/keywords: 360, blind-box AI, one-photo, product video AI,
  designer toy AI teaser, action figure AI generator; **main H1 frozen**.
- Cold-start sitemap **13** (was 9): +4 tools + action-figure /for; drop /explore.
- `COLD_START_INDEXABLE_TOOL_SLUGS` + smoke count locks.

### 2026-07-27 — [grok] AfterPath auto-SKU + Cinema + Pack try sample
- GenerateAfterPath: when `sku` prop omitted, load device-local bible SKU so
  Cinema / Supercomputer / any shelf still carries Next SKU · Seller Pack.
- Explicit sku prop (Create/Landing/Batch) still wins; empty string = no SKU.
- Cinema: primary Generate href + AfterPath pass effect + bible SKU.
- Seller Pack: `?try=1` / `?sample=` hydrates Lab still only (no auto 3× debit);
  supercomputer?pack=seller redirects keep sku/try/sample query.
- Smoke: AfterPath loadToyIdentity · BatchStudio initialSku multiline safe.

### 2026-07-27 — [grok] WorkBuddy WORK_QUEUE dispatch on GitHub
- `docs/growth/WORK_QUEUE.md`: open task WQ-2026-07-27-01 (second growth run).
- Grok cannot remote-start WorkBuddy; queue is the dispatch bus.
- WORKBUDDY_AUTO_PROMPT + AGENT_BUS + skill: pull then clear open queue.

### 2026-07-27 — [grok] WorkBuddy intake → SITE_WATCH + dirs clean + Modules proof
- Pulled WB `d308b46`/`bb7a6da`: run report 18 dirs (submitted=1 prior only).
- SITE_WATCH: full growth intake + secrets/PH blocked notes.
- directories.json: empirical paid_skip → free=false; +3 free candidates
  (startupfa.me, launched.io, saaspo).
- Modules ModuleCard: Official · cached + Lab ≥4 + Remake · your toy photo.

### 2026-07-27 — [grok] Flow matrix proof chips + Modules product-to-clip CTAs
- FlowMediaCard: Official · cached + provisional Lab ≥4 when exact demo recipe
  passes home-proof; hover/footer CTA = Remake · your toy photo (HF Flow density).
- flow page passes recipeSlug + exactDemo from DEMO_VIDEOS.
- ModulesSuiteCtas: Photo → Clip + mint Seller Pack (honest product-to-video path).
- SITE_WATCH: SERP site:pikbo.ai crawl notes + X radar (HF product-to-video / multi-model).
- engine-smoke: FlowMediaCard proof locks.

### 2026-07-27 — [grok] Multi-agent playbook + Grok self-ops on GitHub
- `docs/MULTI_AGENT_PLAYBOOK.md`: Grok/Claude/Codex/WorkBuddy lanes; GitHub bus.
- `docs/prompts/GROK_SELF_OPS.md`: paste prompt — Google watch + HF product + X radar.
- `docs/ops/SITE_WATCH.md`: living log (softLive / SERP / product gaps / X).
- AGENT_BUS expanded. Boss onboards Claude+Codex without messenger relay.

### 2026-07-27 — [grok] Seller Pack job.href AfterPath + Create redirect
- GenerateAfterPath: jobs with `href` (Seller Pack) use mode=seller-pack for
  Next SKU / Full Generate (+ sku · try), not /create?job=seller-pack.
- CreateStudio: ?job=seller-pack redirects to pack with sku/try carry.
- Smoke locks intent?.href + location.replace.

### 2026-07-26 — [grok] Landing/Image AfterPath SKU + PresetCard proof chips
- LandingToolPanel + Image studio: load device-local bible SKU → GenerateAfterPath
  (Next SKU / Create / Seller Pack hops; Create/Batch parity).
- Landing history push includes SKU; Create/Seller Pack hydrate `?sku=` via
  `hydrateToyIdentityFromQuery` (query wins over localStorage).
- PresetCard (SEO related recipes): Official · cached | Concept + Lab ≥4 when
  recipe passes home-proof quality.
- Smoke locks loadToyIdentity sku carry + PresetCard data-proof-quality.

### 2026-07-26 — [grok] Library Remake carries SKU into Create
- `createRemixHref(recipe, source?, sku?)` appends `?sku=` for bible hydrate.
- Library group + card Regenerate use sku-carry; Seller Pack group link too.
- Smoke: data-library-remake + remixIntent sku param.

### 2026-07-26 — [grok] CD AfterPath job+SKU carry (commercial loop)
- `GenerateAfterPath`: carries `job` + `sku` + `effect` into Next SKU / Full
  Generate / Seller Pack links; shows active job label when set.
- CreateStudio + BatchStudio wire jobIntentId/sku; `/create?sku=` hydrates bible.
- Smoke locks data-after-job + jobIntentId wiring. C-qc marked ✅ on north star.

### 2026-07-26 — [grok] Agent bus v2: GitHub = real-time brain (no boss relay)
- `docs/growth/AGENT_BUS.md`: git log = live activity feed; pull→work→push protocol;
  scannable commit messages; unpushed work does not exist for the other side.
- `AGENT_STATE.md` + `WORKBUDDY_AUTO_PROMPT.md` + skill `pikbo-growth-auto` aligned.
- Boss does not forward eng↔growth status. WorkBuddy/Grok self-sync on `main`.

### 2026-07-26 — [grok] Share/copy never leak session /api/downloads
- `isSessionGatedDownloadUrl` + `publicShareableVideoUrl` in createTrust.
- Create copy/share-X + Library copy: block gate URLs; absolute only when public.
- downloadVideoFile: after HEAD allow, CORS fail may open gate tab (302); HEAD
  block stays blocked (no JSON error tabs).
- Smoke pure + Create/Library locks.

### 2026-07-26 — [grok] Effects + VideoTile proof chips (Official · Lab ≥4)
- PresetPreviewCard (/effects wall): exact Lab → Official · cached + provisional
  Lab ≥4; concept recipes stay Concept only.
- VideoTile (community rails): Official badge + provisional Lab ≥4 when recipe
  passes home-proof quality.
- Smoke locks data-proof-quality on both surfaces.

### 2026-07-26 — [grok] tools rank TD CTR + friction line (no H1 change)
- Primary `/tools/ai-toy-video-generator`: seoTitle/Description SERP CTR rewrite;
  H1 unchanged; friction line above H1 (no sign-up / no card / free).
- Growth still owns outer links · GSC · PH. No new SEO URLs · Stripe off.

### 2026-07-26 — [grok] All surfaces blob-download /api/downloads (no JSON tabs)
- Create · Landing · Library session/history · Seller Pack child: allow path
  uses `downloadVideoFile` (blob) — never `window.open(gateUrl)`.
- `downloadVideoFile` rejects application/json · text/* Content-Type.
- Smoke locks downloads_api_blob + no window.open(gateUrl).

### 2026-07-26 — [grok] downloadVideoFile never opens /api/downloads JSON tabs
- On blob-fetch failure for controlled `/api/downloads/*`, return `blocked`
  instead of `window.open` (403/409 is JSON, not MP4). Protects Pack multi-save.

### 2026-07-26 — [grok] Profile refund honesty + viral rail Lab ≥4
- ProfilePanel: Live fail refunds · TIMEOUT/cancel unconfirmed (Settings parity).
- HomeViralPresetRail: Official · cached + provisional Lab ≥4 chips.
- Smoke asserts moved before PASS; image cancel `data-image-cancel=settlement`.
- Verified: typecheck · engine-smoke · lint 0 errors.

### 2026-07-26 — [grok] Viral preset rail Official + Lab ≥4 chips
- HomeViralPresetRail: Official · cached + provisional Lab ≥4 on recipes that
  pass home-proof quality (not external QA).
- Smoke locks data-proof-quality on rail.

### 2026-07-26 — [grok] Library history Open result HEAD-gated
- History card "Open result" is a button → `downloadClip` (HEAD first), not a
  raw `<a href=/api/downloads>` that can dump 403 JSON in a new tab.
- `data-history-open=gated`; session Download already gated.

### 2026-07-26 — [grok] Proof Lab ≥4 chips on cinema + community cards
- HomeCinemaHero, HomeProjectsExplore, ProjectCard show provisional Lab ≥4
  when recipe passes home-proof quality (not external QA).
- Extends wall/HfExplore chips; smoke locks data-proof-quality markers.

### 2026-07-26 — [grok] Image cancel settlement + canceled job honesty
- `/image` cancel: immediate `refund unconfirmed` + honest error (Create parity);
  fail path treats `CANCELED` like `REQUEST_CANCELED`.
- Library session jobs: canceled rows show refund unconfirmed + retry copy.
- Smoke pure rehydrate locks `ledgerCancelRefund`; critical-path/softlive print it.
- Verified: typecheck · engine-smoke · lint 0 errors.

### 2026-07-26 — [grok] Home proof Lab ≥4 provisional chips
- `provisionalLabQualityLabel` / recipe lookup for wall + home project grid.
- Premiere + dense wall + HfExploreHome show **Lab ≥4** (not external QA).
- Smoke locks `data-proof-quality=provisional-lab`.

### 2026-07-26 — [grok] meClient cancel-refund rehydrate + Status/Settings
- `MeFreeTrial.ledgerCancelRefund` preserved in `rehydrateFreeTrial` (default
  unconfirmed) so generate merges do not drop cancel honesty.
- StatusProbe + Settings show "cancel unconfirmed" next to TIMEOUT policy.
- Verified: typecheck · engine-smoke · lint 0 errors.

### 2026-07-26 — [grok] Library session-job download HEAD gate + cancel refund policy
- Session jobs panel: Download is HEAD-gated (`data-session-download=gated`) —
  no raw `<a href=/api/downloads>` dumping 403 JSON tabs.
- `/api/me` + health `freeTrial.ledgerCancelRefund: unconfirmed` (cancel never invents restore).
- mode-a accepts cancel refund policy when present.
- Verified: typecheck · engine-smoke · lint 0 errors.

### 2026-07-26 — [grok] Seller Pack per-child HEAD download gate
- BatchStudio `downloadChild`: HEAD /api/downloads first (CANCELED/TIMEOUT/IN_FLIGHT
  honest errors); no dead-tab open for failed ledger rows.
- `data-seller-download=gated`; multi-save already blocked-aware.
- Smoke locks downloadChild + classifyDownloadHead.

### 2026-07-26 — [grok] Shared download HEAD gate (Create/Landing/Library)
- `classifyDownloadHead` + `interpretDownloadHead` (CANCELED · JOB_IN_FLIGHT ·
  TIMEOUT · T6 bake).
- Create `downloadActiveResult` + Landing `downloadLandingResult` HEAD-first;
  Library uses interpret; history `downloadVideoFile` → `blocked` on gate fail.
- Batch multi-download counts blocked; softlive product cancel/download paths.
- Verified: typecheck · engine-smoke.

### 2026-07-26 — [grok] Download gate status honesty (CANCELED/TIMEOUT/IN_FLIGHT)
- `/api/downloads`: non-success jobs return typed codes (CANCELED · JOB_IN_FLIGHT ·
  TIMEOUT · GENERATION_FAILED) instead of blanket NOT_READY; HEAD `X-Pikbo-Job-Status`.
- Library HEAD toasts match codes (cancel/timeout/in-flight).
- `imageJobsProbe` zero-fills byStatus incl. canceled; health.product cancel+download paths.
- Cinema: drop unused media-has-caption eslint-disable.
- Verified: typecheck · engine-smoke · lint 0 errors.

### 2026-07-26 — [grok] Seller Pack cancel immediate settlement
- `cancelInFlightPack` marks running children failed + refund unconfirmed and
  queued → not_started immediately (Create cancel parity); finished siblings kept.
- Smoke locks cancelInFlightPack + setJobs settlement.

### 2026-07-26 — [grok] Cancel ops honesty + pack child idempotency
- Webhook cancel stamps `creditsOutcome: refund unconfirmed` (never invent restore).
- Seller Pack: per-child `idempotencyKey` so abort cancel hits the right ledger row.
- critical-path HEAD prints Jobs/Image canceled; mode-a requires jobs.byStatus.canceled.
- Lint: drop unused `primary` in for/toys SEO metadata.
- Verified: typecheck · engine-smoke · lint 0 errors.

### 2026-07-26 — [grok] StatusProbe byStatus canceled honesty
- Session + still ledgers show ok/fail/canceled from health `byStatus`.
- Video row tagged process-memory; image keeps Flux idempotency note.
- Smoke locks canceled histogram markers.

### 2026-07-26 — [grok] Settings canceled counts + cancel settlement UX
- Settings HEAD probes `X-Pikbo-Jobs-Canceled` / Image-Jobs-Canceled; detail
  lines separate failed vs canceled (process-memory honesty).
- Create + Landing cancel: immediate `refund unconfirmed` + ledger toast.
- Smoke locks data-settings-jobs-detail + setLastRequestCreditState.

### 2026-07-26 — [grok] Generate cancel-on-abort + idempotencyKey DELETE
- `cancelJob` accepts `idempotencyKey` (abort before jobId known); stamps
  `creditsOutcome: refund unconfirmed`.
- `DELETE /api/generations` collection cancel; HEAD `X-Pikbo-Jobs-Canceled`.
- `generateClient.cancelGenerateLedger` on AbortError (keepalive) — image parity.
- Verified: typecheck · engine-smoke · lint 0 errors.

### 2026-07-26 — [grok] Home cinema/wall i18n + create prefetch
- EN/ZH keys for cinema, wall filters, remake, browse CTA.
- Prefetch `/create` from hero mount + browse CTA; wall Links `prefetch`.

### 2026-07-26 — [grok] Home browse CTA above mobile nav + tab pause
- `HomeBrowseCta` bottom offset `4.75rem` on mobile (clears suite bar); z-35.
- `AutoPlayVideo`: pause all claimed clips on `visibilitychange` hidden.

### 2026-07-26 — [grok] Home wall premiere row + sticky browse CTA
- `HomeBrowseCta`: fixed bottom “看够了？用你的潮玩生成” while on wall;
  hides at `#home-create`.
- Wall premiere strip (4 large cards on “全部”) above dense grid.

### 2026-07-26 — [grok] Home wall viewport multi-play + denser toy chrome
- `AutoPlayVideo`: `wallDense` + viewport lazy load/play (budget 4 desktop / 2
  mobile); sources attach on intersection.
- Home wall: `desktopPlayMode=viewport` + wallDense; punchier mint/sticky chips;
  tighter grid; always-on 生成同款.

### 2026-07-26 — [grok] Home cinema dwell: multi-clip + sticky wall
- Hero rotates ≤6 Lab clips (7s) + dots + scroll cue; SoftLaunch under wall.
- Wall: sticky chips with counts, INITIAL 24, denser grid, 生成同款 always on.

### 2026-07-26 — [grok] Image cancel ledger + abort best-effort DELETE
- `ImageJobStatus` + `cancelImageJob` / `findImageJobByRequestOrId` (process-memory).
- `DELETE /api/image` (jobId | requestId | idempotencyKey); HEAD
  `X-Pikbo-Image-Jobs-Canceled`; canceled idempotency replay (409 + refund unconfirmed).
- complete wins over cancel; fail respects cancel (generate parity).
- `imageClient.cancelImageLedger` on AbortError (keepalive DELETE).
- Create soft recipe auto-apply deferred via setTimeout (lint set-state-in-effect).
- Verified: typecheck · engine-smoke · lint 0 errors.

### 2026-07-26 — [grok] Home cinema + toy video wall (HF-style)
- Home: `HomeCinemaHero` (video first) → `HomeViralWall` (360/开箱/漂浮/收藏/Listing) → `#home-create` generate.
- Wall cards: 生成同款. SoftLaunch strip thin. SEO body stays below.
- No suite tourism above the wall.

### 2026-07-26 — [grok] Landing result meta + T6 download policy labels
- `downloadPolicyLabel` / `downloadBlockedCtaLabel` (Held for T6 bake · Free raw
  blocked; Demo open · Lab). Create + Landing share helpers.
- LandingToolPanel: Create-parity result metadata (recipe/model/settlement/
  policy/cost/task id) + server-echo note.
- Settings product-first Seller Pack CTA. Smoke pure labels + markers.

### 2026-07-26 — [grok] CD: wire pack bible into generate extra
- BatchStudio `executeJob`: `composeExtraWithIdentity(toyIdentity)` on every
  pack child; real `ownsRights` (not hard-true); Director Plan shows bible +
  labSample.
- LandingToolPanel delivery checklist includes fidelity QC (parity with Create).
- smoke: packExtra / composeExtraWithIdentity.

### 2026-07-26 — [grok] CD: Seller Pack Asset Brief + fidelity QC
- BatchStudio: post-upload `AssetBriefPanel` + toy identity (shape probe, lab
  sample flag); recipe chips deep-link single Generate (pack trio stays fixed).
- `fidelityQcItems` on Create delivery + Seller Pack post checklist (edges /
  paint / logo / bg / proportions — human ticks, not vision).
- engine-smoke locks; no Soul ID / multi-image provider.

### 2026-07-26 — [grok] CD Phase C-lite: ZH brief + fidelity refs
- `buildAssetBrief` locale en|zh dynamic bullets + recipe labels.
- C-lite: `FIDELITY_ANGLE_CHIPS` + optional secondary still (client preview);
  `composeExtraWithIdentity` writes angle/secondary honesty into extra —
  **not** multi-image provider input / Soul ID.
- AssetBriefPanel `data-fidelity-refs=c-lite`; smoke locks.

### 2026-07-26 — [grok] CD Phase B3: Seller Pack Director Plan
- `buildSellerPackDirectorPlan`: Launch Pack 3 children, 30-cr quote, Free Mini
  shortfall honesty, Sales fidelity row.
- BatchStudio Seller Pack: `DirectorPlanPanel` when photo ready
  (`data-seller-pack-plan=director`); credit strip before photo.
- engine-smoke locks; no Stripe / Soul ID / multi-view.

### 2026-07-26 — [grok] CD Phase B2: Director Plan + soft recipe + materials
- `lib/directorPlan.ts` + `DirectorPlanPanel`: pre-generate confirm (goal/recipe/
  format/Sales mode/bible/cost/blockers) — `data-director-plan=cd-phase-b2`.
- Asset Brief: `primaryRecipeForShape` + one-shot soft auto-apply (skip deep-link/
  job/Lab); material chips append into preserve (PVC/Sofubi/…).
- Create preflight replaced by Director Plan; i18n plan.* EN/ZH; smoke locks.
- Still not Phase C (no Soul ID / multi-view / 3D).

### 2026-07-26 — [grok] CD Phase B: Asset Brief + character bible draft
- `lib/assetBrief.ts`: pure `buildAssetBrief` + `probeImageSize` (geometry only;
  disclaimer: not computer vision).
- `AssetBriefPanel`: post-upload brief bullets, suggested recipes, Seller Pack
  CTA, editable SKU/preserve bible (`data-asset-brief=cd-phase-b`).
- CreateStudio: probe on adoptImage; Lab samples flagged; brief after photo;
  identity still locks via `composeExtraWithIdentity`.
- North star §6 Phase B marked; i18n brief chrome EN/ZH; engine-smoke locks.
- No vision API · no SEO pages · no Stripe · no Wave C.

### 2026-07-26 — [grok] residual Flow · Preview on suite shelves
- Effects / tools / guides / apps / models / onboarding / PricingHero /
  SeedanceCampaign / WorkflowShelf: product CTAs first; Flow labeled Preview.
- No duplicate Seller Pack chips. Verified: engine-smoke · tsc.

### 2026-07-26 — [grok] CD Phase A + product-first suite exits
- North star §6: CD product layer (Launch Pack path, Sales fidelity, phased A/B/C).
- Create: commercial `JobIntentBar` all viewports; mobile CD strip; recipe rail
  “Toy recipes · 360 · Reveal · Zero-G · Dance · Glow”.
- i18n EN/ZH: Listing 360 / Social Hook / Box Reveal / Display Glow /
  Seller Pack · Launch; ready/next-job commercial copy.
- `GenerateAfterPath` + Footer/Profile/Explore/Community/Pricing/Modules:
  product path first; **Flow · Preview** last (`data-*-path=product-first`).
- `site.homeH1` launch-ready; description Creative Director (rank Title/keywords untouched).
- Verified: engine-smoke · tsc. No SEO page budget · no Stripe · no Wave C.

### 2026-07-26 — [grok] Project product-first + T5 jobs hard-false + Community gate
- `/projects/[slug]`: cold-start `CONCEPT_ROBOTS`; CTAs Seller Pack · Modules ·
  Library (Flow demoted); breadcrumb Home→Explore→title.
- `SERVER_OWNED_GENERATION_JOBS_IMPLEMENTED=false`; health paid/prod durable
  multi-node need jobs.effective (env alone never unlocks). Soft-live Mode A OK.
- Community publish: `isPublicCommunityVideoUrl` (no Free `/api/downloads` or Lab relative).
- Verified: engine-smoke PASS · tsc PASS.

### 2026-07-26 — [grok] T8 Seller Pack recovery + Free live player parity
- BatchStudio sessionStorage holds only active-pack child pointers (no photo/
  video/balance). `GET /api/generations` is authoritative after refresh; missing
  jobs → unavailable (not stale refund claims). Retry failed/restored only.
- Batch + Library mount via `isPlayableResultVideoUrl`; Free live shows
  “held for T6 bake” (not raw provider or dead `/api/downloads` player).
- Login guest path product-first: Generate · Seller Pack · Library · Modules.
- Verified: engine-smoke recovery fixture + playable/auth markers · tsc PASS.

### 2026-07-26 — [grok] Free live generate never echoes provider raw URL
- `customerFacingGenerateVideoUrl`: Free live success + idempotent replay return
  `/api/downloads/{jobId}` only; demos and paid raw keep their media URL.
  Server ledger still holds the provider URL for a future T6 worker.
- `isPlayableResultVideoUrl`: Create + Landing do not mount Free download
  endpoints as `<video>` (403 JSON until bake). Honest “held for T6 bake” panel.
- `historyFieldsFromSuccess` rewrites any residual free live absolute URL onto
  the controlled download path when a job id is present.
- Verified: engine-smoke PASS · tsc PASS.

### 2026-07-26 — [grok] Free live never exposes raw provider video URL
- `customerFacingGenerateVideoUrl` redacts Free live generate success to
  `/api/downloads/{jobId}` (T6 re-check). History pins legacy Free raw paths.
- Create + LandingToolPanel only mount playable results; held Free live shows
  honest T6-bake placeholder instead of a dead player URL.

### 2026-07-26 — [grok] Library first-run + device-local honesty (Phase F)
- Sticky mobile CTA: Generate · Seller Pack; clip count + “Saved on this device”.
- Empty state product-first (Generate/Seller before Lab); filled chip labels
  device-local only. Session jobs panel shows process-memory · not durable cloud.
- Storage banner + page copy use exact “Saved on this device”; smoke locks
  data-library-* markers.

### 2026-07-26 — [grok] Create first-run order + plain /create remix honesty
- Create: recipe chips before Lab samples; Toy Identity only under Advanced.
- `hasRemixSearchParams` — empty /create is not an implicit PRESETS[0] remix.
- Seller Pack first-run (prior): compact steps + sticky upload/generate/library/retry.

### 2026-07-26 — [grok] Seller Pack first-run conversion (Phase F 390px)
- SellerPackSteps: compact horizontal strip on phone; full cards from sm+.
- BatchStudio sticky: Upload owned photo · Lab sample · Generate with quote ·
  after success Library + Retry failed only (siblings kept) or Run pack again.
- Photo step labeled/data-marked; Lab samples honesty line; credit line on sticky.
- engine-smoke locks data-seller-pack-* markers.

### 2026-07-26 — [grok] T6 hard gate: bind Free derivative to job identity
- Free live download no longer trusts free-floating derivative metadata. Gate
  requires `canServeVerifiedT6Derivative({ jobId, providerRequestId, derivative })`:
  exact idempotencyKey/objectKey/deliveryPath, distinct checksums, baked-mark
  probe, **and** `t6DeliveryReadiness` (env + IMPLEMENTED + serving + storage;
  serving/storage stay hard-false).
- `downloadAllowedForJob` / `publicVideoUrlForJob` / `/api/downloads` pass
  `jobId` + `providerRequestId`. `updateJob` recomputes when `bakedDerivative`
  or `requestId` attaches.
- Worker rejects foreign terminal rows with `DERIVATIVE_IDENTITY_MISMATCH`.
  Fixture imports production `lib/t6Worker.ts` via `--experimental-strip-types`.
- Verified: engine-smoke PASS · tsc PASS · t6 fixture PASS.

### 2026-07-26 — [grok] Create first-run conversion (Phase F 390px)
- Mobile Create path is three steps: Upload → Choose recipe → Generate.
- Model/mode strip, ActivationChecklist, WorkflowShelf, and JobIntentBar are
  desktop-only so the phone first screen stays product-first.
- Sticky CTA labels ownership upload; recipe line shows credit cost; Lab sample
  remains a secondary free path; advanced controls stay collapsed by default.
- engine-smoke locks data-first-run markers + showAdvanced initial false.

### 2026-07-26 — [grok] fix(smoke): drop accidental T6 worker asserts
- engine-smoke again matches main download gate (`canDownloadResult` + bake path).
- Keeps HfProductRail product-first Explore locks; no T6 worker enablement.
- Verified: typecheck · engine-smoke.

### 2026-07-26 — [grok] T6 server-owned baked-watermark skeleton (source-only)
- Free live raw never unlocked by env force / external worker URL alone.
- `lib/t6Worker.ts` hard-disabled; downloads require verified owned derivative.
- Verified: typecheck · engine-smoke · t6 fixture.

### 2026-07-26 — [grok] HfProductRail + Explore jobs product-first
- HfProductRail: Generate · Seller · Modules · Presets before Flow/Cinema/Image Preview.
- HfExploreHome job grid: Seller/Modules/Library before Flow · Preview; Generate CTA.
- Verified: typecheck · engine-smoke.

### 2026-07-26 — [grok] Home suite product-first + Flow Preview tag
- SuiteEntryStrip: Generate · Seller · Modules · Recipes · Flow (Preview last).
- SuiteDoorLinks: Seller/Modules/Library before Flow · Preview; i18n suite.preview = Preview.
- Verified: typecheck · engine-smoke.

### 2026-07-26 — [grok] Batch Preview PREVIEW_ROBOTS + AfterPath
- `/supercomputer` + legacy pack=seller meta: `PREVIEW_ROBOTS`; GenerateAfterPath suite exits.
- Models page uses shared `PREVIEW_ROBOTS` (not inline robots object).
- Verified: typecheck · engine-smoke.

### 2026-07-26 — [grok] Suite chrome product-first + FailPanel settlement
- GenerateSuiteChrome: Generate · Seller · Recipes · Modules · Library first; Preview last.
- Batch/Landing: requestCreditStateFromFailure on fails; network abort → refundUnconfirmed.
- Verified: typecheck · engine-smoke.

### 2026-07-26 — [grok] Cold-start /create noindex + Preview door labels
- `/create` + Seller Pack: `CONCEPT_ROBOTS` (tool, not rank landing; 9-URL budget).
- CommandPalette + Footer: Preview/Local tags on Flow/Cinema/Image/Batch/Assets.
- Verified: typecheck · engine-smoke.

### 2026-07-26 — [grok] GSC P0: VideoObject DateTime + crawl/noindex contract

**Branch:** `agent/grok/seo-gsc-p0` · PR #25

#### Scope
- `lib/jsonLd.ts`: VideoObject `uploadDate` = **per-demo `publishedAt`** (ISO DateTime); optional `duration` from recipe (`PT5S`); no single forged global date.
- `lib/demoVideos.ts`: each demo has `publishedAt` from git first-commit (2026-07-22 theatre batch · 2026-07-23 Mini lab batch, stored as Zulu).
- Nav: PRIMARY = Explore · Create · Effects · Pricing; **removed right-rail duplicate Pricing**.
- Preview doors in More; robots allow Preview crawl + noindex; self-canonical on image/cinema/**privacy/terms**.
- `/image` single H1: suite chrome title is `div`.
- Analytics: GA4 env-gated + **AppShell `trackPageView(pathname)`** on route change; `send_page_view: false`; path only.
- **GenerateFailPanel** lint fix kept in this PR: `react-hooks/set-state-in-effect` made `npm run lint` red on branch tip — required for green CI gates, not product SEO scope. Revert-safe isolated change.

#### Sitemap
- **Still 9 URLs** (`COLD_START_INDEX_PATHS` unchanged).

#### Tests
- lint 0 errors · typecheck PASS · build PASS · engine-smoke PASS

#### Commit
- `a72d597` base GSC fix
- `43ea757`

#### Boss
**Deploy then open Search Console → click “验证修复” for the VideoObject uploadDate issue.**

---

### 2026-07-26 — [grok] SEO Intent P0 (canonical · 9-URL sitemap · main-term first screen)

**Branch:** `agent/grok/seo-intent-p0`

- 主词 `/tools/ai-toy-video-generator`：**未改** Title/H1/canonical；首屏加 collectible（非 selfie）句；三步紧贴工具。
- `LandingHowItWorks` = Photo → Recipe → Video draft（compact 近工具）；HowTo 仅当工具+三步真实渲染。
- 冲突审计 + 301：`action-figure-product-videos` · `blind-box-reveal-video-maker` · `blind-box-brand-marketing`。
- 原创潮玩话术；禁用 Marvel/Star Wars/Gundam/POP MART/Bearbrick/Sonny Angel/KAWS 作意图样例。
- **sitemap 真实 9 URL**（非 94）— `docs/growth/SEO_INTENT_P0_CANONICAL.md` + GEFEI checklist 已更新。

### 2026-07-26 — [grok] Cinema AfterPath + mobile suite bar + HowTo steps
- Cinema Preview: GenerateAfterPath + Library; mobile bar hides image/cinema, Seller Pack on Library.
- LandingHowItWorks: Photo → Recipe → Video draft + HowTo JSON-LD on tools/for with tools.
- Verified: typecheck · engine-smoke.

### 2026-07-26 — [grok] rehydrateFreeTrial keeps refund policy
- mergeMeSession no longer drops failedLiveRefundPolicy / ledgerTimeoutRefund after generate.
- Settings “Live fail refunds”; guides Free Mini SEO; critical-path prints policy.
- Verified: typecheck · engine-smoke.

### 2026-07-26 — [grok] health/me refund policy honesty
- billing.freeTrial: failedLiveRefundPolicy=when_confirmed · ledgerTimeoutRefund=unconfirmed.
- /api/me freeTrial same fields; imageClient network always refundUnconfirmed; StatusProbe labels.
- Mode A still requires failedLiveRefunds=true (ops gate). Verified: typecheck · engine-smoke.

### 2026-07-26 — [grok] Batch/Landing TIMEOUT settlement parity
- BatchStudio + LandingToolPanel: requestCreditStateFromFailure for child/landing fails.
- generateClient: network/abort always refundUnconfirmed; FailPanel creditState on Landing.
- Verified: typecheck · engine-smoke.

### 2026-07-26 — [grok] Create TIMEOUT settlement + residual refund honesty
- requestCreditStateFromFailure: TIMEOUT / refundUnconfirmed → chip; generateClient echoes flag.
- CreateStudio wires result.refundUnconfirmed; residual copy “when confirmed”.
- Verified: typecheck · engine-smoke.

### 2026-07-26 — [grok] PROVIDER_TIMEOUT auto-retry + Library TIMEOUT honesty
- generateClient + imageClient: one auto-retry on PROVIDER_TIMEOUT (not ledger TIMEOUT).
- Library session jobs: errorCode + refund unconfirmed; empty-state copy no longer overclaims refunds.
- Verified: typecheck · engine-smoke.

### 2026-07-25 — [grok] Still Studio imageClient + FailPanel Retry-After
- `lib/imageClient`: postImageWithRetry · PROVIDER_NETWORK auto-retry · refund unconfirmed.
- Image page uses client + FailPanel countdown; smoke locks FailPanel + imageClient.
- Verified: typecheck · engine-smoke.

### 2026-07-25 — [grok] Generate PROVIDER_NETWORK + ledger JOB_IN_FLIGHT
- Classify 502/503/ECONNRESET as PROVIDER_NETWORK (retryable); TIMEOUT refund unconfirmed.
- jobLedgerInFlightRetryAfterSec after kill; client auto-retry on PROVIDER_NETWORK.
- Verified: typecheck · engine-smoke.

### 2026-07-25 — [grok] GenerateAfterPath smoke fix + Still Studio suite
- engine-smoke: After generate asserts on shared `GenerateAfterPath` (Create inlined chips removed).
- Still Studio wires GenerateAfterPath; Profile/mobile done Library locks kept.
- Verified: typecheck · engine-smoke.

### 2026-07-25 — [grok] Generate closed-loop after-path (prior main)
- Shared GenerateAfterPath on Create/Landing/Batch; mobile done → Library.
- FreeTrial/#home-tool convert; suite density (cmd-K, footer, supercomputer).
- 哥飞 cold-start noindex whitelist + lean sitemap.

### 2026-07-25 — [grok] Generate TIMEOUT + PROVIDER_NETWORK honesty
- Ledger TIMEOUT fail-replay → 504 + refundUnconfirmed; JOB_IN_FLIGHT Retry-After max(lock, ledger age).
- classifyProviderError: network (ECONNRESET/502/503) → PROVIDER_NETWORK 503 · client Retry copy.
- Verified: typecheck · engine-smoke.

### 2026-07-25 — [grok] Image still TIMEOUT recovery + Status/Settings
- `sweepTimedOutImageJobs` · HEAD `/api/image` counts · refund unconfirmed on kill.
- StatusProbe/Settings surface still ledger; Models FreeTrialCta · Lab.
- Create After-generate path smoke-gated. Verified: typecheck · engine-smoke.

### 2026-07-25 — [grok] Image idempotency + Phase H apps/[slug] + Library still cap
- `/api/image`: session-scoped `idempotencyKey` (success/fail replay · running→JOB_IN_FLIGHT) · `lib/imageJobs` · health.imageJobs · client mints once per attempt.
- `/apps/[slug]`: index only live doors with unique Lab proof + FAQ/FAQPage; thin shells noindex.
- Sitemap lists proof-backed app doors; Create sticky CTA = Try free · Lab.
- Device Library: slimInputImage drops multi-MB Base64 (path samples / ≤8k only).
- Verified: typecheck · eslint · engine-smoke.

### 2026-07-24 — [grok] Flow path + Seller Pack WaitStage + HF smoke
- Flow: Photo→Clip → `/create` workbench; core path chips Generate→…→Community.
- Batch/Seller Pack: `GenerateWaitStage` while pack runs (1–3 min Mini pace).
- Cinema shot state typed as string (template chips compile).
- engine-smoke: wait phase math, WaitStage wire, LibraryStorage, CommunityPublish, Flow doors.
- Verified: typecheck · engine-smoke.

### 2026-07-24 — [grok] Free Mini raw blocked from Community publish
- `CommunityPublishButton`: watermark Free live → no publish (T6 raw bypass closed).
- Handles RATE_LIMITED / UNSAFE_URL; Community wall filters unsafe video/poster.
- engine-smoke: LibraryStorageBanner honesty (not stale "Saved on this device").
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] community posts rate limits + HEAD probe
- POST publish: IP 12/min + token 6/min with Retry-After (process-memory).
- GET list: IP 60/min scrape guard; HEAD `X-Pikbo-Community-Ugc` for ops.
- critical-path + mode-a-acceptance + softlive print community honesty.
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] Settings Phase C/D honesty + cmd-K Lab label
- Settings: cookie vs durable authority, reserved, session jobs HEAD, live T6 from health.
- FreeTrialCta; clear onboard uses `pikbo_onboard_v3` (matches banner).
- CommandPalette: Lab sample labeled 0 credits cached; Settings/status doors.
- Verified: typecheck · engine-smoke.

### 2026-07-24 — [grok] Library/Create video URL safety + health.community
- Library: safe video render, open/copy gates; Create/Landing player `src` only when safe.
- `imageHistory` load/push refuse non-image schemes (`isSafeImageHistoryUrl`).
- health.community.ugcConfigured + StatusProbe Community UGC row (Lab-only when empty).
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] Phase C Profile durable honesty + FreeTrial residual
- ProfilePanel: cookie vs durable authority, backend (local-file/supabase), reserved,
  process-memory open jobs via HEAD /api/generations.
- auth/claim returns wallet.backend + shadow authority labels.
- HfProductRail + Pricing free plan → FreeTrialCta (no static sample free claim).
- Verified: typecheck · engine-smoke.

### 2026-07-24 — [grok] FreeTrialCta auth + home suite residual
- SuiteDoorLinks, Login/LoginForm, Cinema, Seedance, Onboarding, Batch empty,
  HfExploreHome hero, SuiteEntryStrip — static Try free → FreeTrialCta.
- FreeTrialCta: optional `onNavigate` + `hideClipsChip` for dense rails.
- engine-smoke gates auth/home residual CTAs.
- Verified: typecheck · engine-smoke.

### 2026-07-24 — [grok] T6 live download gate recompute + HEAD bake honesty
- `/api/downloads` recomputes `canDownloadResult` at request time (not frozen job flag).
- Free watermark never redirects raw provider URL without force-bake or successful worker bake.
- HEAD: `X-Pikbo-T6` + `X-Pikbo-Bake`; toPublicJob recomputes downloadAllowed live.
- Library toast when T6 bake path is blocked.
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] Client unsafe videoUrl defense + Batch URL gate
- `interpretGenerateResponse` / `asSuccess`: 200 with unsafe videoUrl → `UNSAFE_URL` (not playable).
- BatchStudio: `<video>` + Download/open only when requestId or isSafeDeliverableUrl.
- engine-smoke pure interpret + source asserts.
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] FreeTrialCta sitewide residual surfaces
- LandingSeoMesh, Footer, effects/[slug], Flow, Library, Create Seller Pack header,
  projects detail, pricing bottom — static Try free / Generate free → FreeTrialCta.
- Exhausted Free Mini → plans; Lab sample still free. engine-smoke gates shared CTAs.
- Verified: typecheck · engine-smoke.

### 2026-07-24 — [grok] for/toys/guides FAQ + Mini 5s honesty
- Phase H: `/for` `/toys` `/guides` hubs → FAQ + FAQPage + FreeTrialCta.
- Guide detail + PricingHero: no free “10s” CTA; Free Mini 5s labels.
- i18n home.tryFree10s / suite.tryFree.blurb + Onboarding/HfProductRail Mini 5s.
- engine-smoke gates hubs + rejects Try free · 10s.
- Verified: typecheck · engine-smoke.

### 2026-07-24 — [grok] Free raw share/download honesty + assets HEAD
- Create: copyLink/shareX refuse Free Mini raw + unsafe schemes (T6 cannot bypass via clipboard/X).
- Create/Landing download href requires requestId or isSafeDeliverableUrl.
- HEAD /api/assets/[id]/content: meta-only existence (bytes/type/expires, no dataUrl).
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] StatusProbe demos + Seller Pack URL safety + CP HEAD
- StatusProbe surfaces Lab demos disk, freeTrial scope/stills, product, jobs open, T6 raw gate.
- sellerPackExport: filter/href refuse unsafe schemes; requestId still via /api/downloads.
- critical-path asserts HEAD /api/me + /api/generations (plan/credits/open headers).
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] Community/Tools/Effects FAQ + FreeTrial honesty
- Phase H: Community + Tools + Effects hubs get FAQ + FAQPage JSON-LD (not thin walls).
- Tools/Effects: static Try free / Generate free → `FreeTrialCta` (exhausted → plans).
- engine-smoke asserts COMMUNITY/TOOLS/EFFECTS FAQ + no thin free CTAs.
- Verified: typecheck · engine-smoke.

### 2026-07-24 — [grok] FreeTrialCta + Apps/Explore FAQ
- Shared `FreeTrialCta`: freeTrial exhausted → plans; Lab sample still free; clipsLeft chip.
- Wired Apps / Explore / Community (no static “Try free” when trial spent).
- Phase H: Apps + Explore FAQ + FAQPage JSON-LD (not thin shelves).
- engine-smoke asserts FreeTrialCta + FAQPage; Library session meta on prior SHA.
- Verified: typecheck · engine-smoke · `ec40875`.

### 2026-07-24 — [grok] Library URL safety + session HEAD probes
- `history` import/normalize + `downloadVideoFile` refuse unsafe schemes (`isSafeDeliverableUrl`).
- Export includes `downloadAllowed` / `downloadGate` (T6 Free-live honesty for support).
- `historyFieldsFromSuccess` prefers server `creditsOutcome` / `costCredits`.
- `HEAD /api/me` (plan/credits/trial) · `HEAD /api/generations` (open job counts).
- softlive-checklist prints health.demos + freeTrial scope.
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] health demos probe + demo clip disk reliability
- `lib/demoClips.probeDemoAssets` + health.demos (Lab mp4 + sample stills present/missing).
- `demoClipForEffect` prefers on-disk assets so missing exact clips do not 404 the player.
- Generate demo path validates `isSafeDeliverableUrl` before success ledger.
- Image: `mergeMeSession` after still job · history restores settlement · server echoes aspect.
- mode-a-acceptance fails if demos.ok false; freeTrial.scope/stillsOnFree gates.
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] Seller Pack multi-download + Modules freeTrial FAQ
- Phase F: `sellerPackAvailableDownloads` / download href prefers `/api/downloads`; Batch **Download available** sequential multi-file (no fake ZIP of failures).
- Modules: freeTrial-honest CTAs (`ModulesSuiteCtas` + mobile); FAQ + FAQPage JSON-LD; Mini 5s copy (not 10s).
- Verified: typecheck · engine-smoke.

### 2026-07-24 — [grok] Free stills never burn Mini video trial
- `/api/image`: Free plan always labeled demo (`free_trial_video_only`, 0 credits) so Flux cannot burn the 10-credit Seedance Mini trial.
- Paid plans only live-charge stills; health `freeTrial.scope=video-create-only` + me `stillsOnFree`.
- Still studio CTA/copy: demo 0cr on Free · upgrade/Create for live.
- Verified: typecheck · engine-smoke · eslint.

### 2026-07-24 — [grok] freeTrial honesty Batch + Landing tools
- BatchStudio / Seller Pack: freeTrialExhausted · clipsLeft · trial-used CTA.
- LandingToolPanel: exhausted → plans + Lab; live clips left from `/api/me`.
- engine-smoke asserts Batch + Landing freeTrial contract.
- Verified: typecheck · engine-smoke.

### 2026-07-24 — [grok] Profile/Settings freeTrial + Library download HEAD
- Profile + Settings surface `/api/me` freeTrial (clips left / exhausted / Mini).
- Settings uses `PRIVATE_ROBOTS`; T6 raw-download honesty row.
- Library HEAD-probes `/api/downloads` before open; blocked codes → honest toasts.
- Download HEAD: `X-Pikbo-Download-Code` + `X-Pikbo-Watermark`.
- Verified: typecheck · engine-smoke.

### 2026-07-24 — [grok] freeTrial honesty Create/SoftLaunch + P6 Inside
- Create mode banner + preflight: Free Mini clips left / trial exhausted.
- SoftLaunchStrip reads `/api/me` freeTrial (pricing CTA when exhausted).
- HomeProjectsExplore: Remake + Inside doors · interaction play (P6).
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] Phase D Library byStatus recovery + PRIVATE_ROBOTS
- Library SessionJobsPanel: open count · byStatus chips · timeout sweep note.
- Poll uses server `open` + jobs; Profile adds Flow/Status doors.
- Library/Profile/Login/Status use shared `PRIVATE_ROBOTS` (Phase H).
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] video-first gates + Image optional support
- Image studio: optional-support copy (not primary product).
- engine-smoke: `site` video-first tagline + suite mode order (stills last).
- Prior on main: H7 Batch quote · H1 Seedance doors · video-first site/i18n.
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] H7/Y5 Batch quote + H1 Seedance suite doors
- `batchQuoteLabel` + custom Batch credit strip (balance/shortfall/refund).
- Batch upload craft (mint empty · pack/batch copy).
- Seedance campaign: suite CTAs · Remake hover strip · interaction play.
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] Y2 Stills suite rail + Image studio craft
- `GenerateSuiteChrome`: Stills mode → `/image` (Preview badge · Flux honesty).
- Image studio: suite chrome · media-stage · safe handoff (`http(s)` + `/path`).
- Community header: Flow + Stills doors.
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] Delivery progress + Create controls density
- DeliveryChecklist: progress bar · complete state · denser ticks.
- ModulesMobileCta: Flow + Pack · sticky glass craft.
- Create: recipe cards active glow · selected recipe + aspect channel hints.
- WorkflowShelf Flow link · Footer suite CTAs · SellerPackSteps Now chip.
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] Create next-job grid + Pricing/Project craft
- Create success: same-photo next jobs as blurb cards + SKU chip.
- Pricing hero suite doors · soft-launch billing badge · free CTA → Lab sample.
- Project inside: media-stage I/O · Flow breadcrumb/CTAs · stronger Use recipe.
- Verified: typecheck · lint · engine-smoke.

### 2026-07-24 — [grok] Flow remake density + GenerateFailPanel wave
- FlowMediaCard / VideoTile / viral rail: interaction play + Remake hover CTAs.
- Home hero Browse Flow; Modules/Flow hero glow; Toast lime craft.
- GenerateFailPanel on Create/Batch/Landing/Image; Create error stage.
- Suite strip Flow door; Library empty media-stage; Toy Identity craft; ⌘K palette.
- completeSyncGenerateJob: provider success can recover canceled ledger (cancel ≠ kill fal).
- Verified: typecheck · lint · main.

### 2026-07-24 — [grok] GenerateFailPanel + error stage + Flow suite door
- Shared `GenerateFailPanel` on Create / Batch / Landing / Image with Retry + Lab/Recipes/Modules.
- Create result stage: dedicated **Clip didn't land** empty (not idle copy).
- SuiteEntryStrip: Flow door + tags; Library empty media-stage craft.
- generateClient error strings end in next actions.
- Verified: typecheck · lint · pages 200.

### 2026-07-24 — [grok] DeliveryChecklist + wall hover play + pack empty copy
- Interactive post-success checklist (session ticks) on Create / Landing / Seller Pack.
- `sellerPackPostItems` · denser walls use hover play + metadata promote on enter.
- Seller Pack queue empty state job-oriented CTAs.
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Flow/home viral AutoPlay budget (no multi-autoPlay)
- `FlowMediaCard` + home viral rail use shared AutoPlayVideo (mobile ≤1 concurrent).
- `/flow` PREVIEW_ROBOTS; HF/Yiha Round A acceptance checked off.
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] generate UNSAFE_URL + providerFailHttp
- Live unsafe videoUrl returns **`UNSAFE_URL`** (was mislabeled MODEL_EMPTY).
- Shared `providerFailHttp`: PROVIDER_TIMEOUT 504 + Retry-After · CONTENT_POLICY 422 · balance/rate/other.
- Webhook unsafe success → **422**. Client + contracts cover all codes.
- Verified: engine-smoke · typecheck · lint · main `7c12948`.

### 2026-07-24 — [grok] Image UNSAFE_URL gate + Create adoptImage useCallback
- `/api/image` live stills: `isSafeDeliverableUrl` or refund + `UNSAFE_URL` (generate parity).
- Image studio surfaces refunded copy; Create adoptImage useCallback + safe pending-still schemes.
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Safe provider videoUrl + timeout/content classify
- Generate validates `isSafeDeliverableUrl` before settle.
- Webhook job store rejects unsafe success URLs (`UNSAFE_URL`). Provider rate → Retry-After.
- classifyProviderError: timeout + content policy kinds; next.config X-Frame-Options DENY.
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] VideoTile AutoPlay budget + Effects proof ItemList
- VideoTile uses shared AutoPlayVideo (mobile ≤1 concurrent · preload none · focusable=false).
- Effects hub: ItemList JSON-LD for proof-backed recipes only; hub copy notes Lab-proof count.
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Auth rate limits + safe download redirects
- Magic-link: per-email 3/min + per-IP 8/min with Retry-After; generic success (no email echo).
- Claim POST: 12/min per user+IP. Downloads: `isSafeDeliverableUrl` (http(s) or /path only).
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] ProjectCard AutoPlay budget + Apps/Community ItemList
- ProjectCard uses shared AutoPlayVideo (mobile ≤1 concurrent · preload none · focusable=false).
- Apps + Community hubs: ItemList JSON-LD for live/official URLs only (no SOON/fake UGC).
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Image settlement echo + forkRetry requestId + demo disk check
- `/api/image`: costCredits/creditsOutcome (0 cached · 10 used); PROVIDER_RATE_LIMIT Retry-After.
- `forkRetryJob` resolves parent via findJobByRequestOrId; imageHistory slims huge data URLs.
- preflight + engine-smoke assert all demoClips/samples files on disk.
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Image Cancel + Tools/Guides ItemList JSON-LD
- `/image` Still studio: AbortController cancel + refund-unconfirmed honesty (Create parity).
- Tools hub + Guides hub: real ItemList structured data (registered URLs only).
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Batch/Seller Pack Cancel mid-pack
- BatchStudio AbortController: Cancel pack keeps finished children; aborts running child + waits.
- Shadow release for not_started/canceled; interrupted live → refund unconfirmed honesty.
- preflight requires scout-story-mode + beatbot-unboxed demos. Verified: engine-smoke · tsc · lint.

### 2026-07-24 — [grok] Create Cancel request mid-generate (AbortController)
- Create: Cancel request (desktop + mobile sticky + result spinner) aborts fetch.
- `sleep(ms, signal)` aborts rate-limit waits; status 0 → refund unconfirmed honesty.
- Server may still finish soft-launch fal — copy says check balance before retry.
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Asset session-reservation + PUT ownership
- `reserveLocalAssetId` on upload-url; PUT rejects `NOT_OWNED` / expired reservation.
- PUT success no longer echoes multi-MB `dataUrl` (server keeps still for generate).
- AbortError client copy marks refund unconfirmed; softlive-checklist lists assets/jobs/webhook.
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Pricing FAQ JSON-LD + Explore Lab≥4 proof chips
- `/pricing`: canonical + OG + FAQPage JSON-LD from shared `pricingFaqItems`.
- Explore cards: **Lab ≥4** / Review pending chips (provisional, not fake UGC).
- Use recipe tracks `recipe_use`; Explore header notes provisional proof gate.
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Prod video-webhook secret + jobs health probe
- `/api/webhooks/video-provider`: production refuses unsigned POSTs (`WEBHOOK_NOT_CONFIGURED`).
- health.jobs via `generationJobsProbe`; health.videoWebhook.secretConfigured (presence only).
- StatusProbe + mode-a-acceptance expanded for assets/jobs/rateLimit/webhook.
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Phase H analytics funnel + profile/robots honesty
- Wire no-op-safe funnel: `upload_ready`, `project_open` (Explore + ProjectOpenBeacon), `export_click` (Create/Library/Landing).
- Profile header no longer hardcodes guest-only; robots disallow `/status`.
- Analytics still no-ops without `NEXT_PUBLIC_ANALYTICS_URL` (never breaks UI).
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Sliding asset TTL + re-register after ASSET recovery
- `getLocalAsset` slides 15m TTL on every hit (Seller Pack mid-queue stays warm).
- `postGenerateWithRetry` sets `recoveredFromAssetMiss`; Create/Landing/Batch re-register still.
- health.assets via `localAssetsProbe` (count/ttl/maxBytes, never image bytes).
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Session job cancel + Seller Pack retry-failed
- Library SessionJobsPanel: Cancel ledger (DELETE /api/generations/[id]), Refresh, poll open jobs.
- Batch/Seller Pack: **Retry failed only** — siblings kept; sequential re-quote.
- Landing fail tip parity with Create; `/auth/callback` layout PRIVATE_ROBOTS.
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] In-flight lock TTL + job requestId resolve
- `rateLimit` inflight Map + TTL (~200s / `PIKBO_INFLIGHT_TTL_MS`) — stale locks free after hard kill.
- generate/image JOB_IN_FLIGHT returns `retryAfterSec` + Retry-After header.
- health.rateLimit.inflight + inflightTtlMs for ops; getJob/cancelJob via findJobByRequestOrId.
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Library session jobs when history empty + Create fail tip
- Library: `SessionJobsPanel` shows process-memory jobs even with empty device history.
- Empty CTA honesty when session jobs exist vs cold start.
- Create failure banner: Retry / try another recipe / free Lab sample next steps.
- Project Quality review: **Provisional Lab** chip (not fake formal scores).
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] ASSET_NOT_FOUND recovery + Library quota save
- `postGenerateWithRetry`: on ASSET_NOT_FOUND + assetId, one re-POST with `fallbackImage`.
- Create / Landing / Batch pass local still as fallback (Seller Pack mid-queue safe).
- `saveHistory`: QuotaExceeded → strip heavy inputImage → half-size last resort.
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Mobile Modules tab + Guides/Tools suite doors
- `MOBILE_NAV` freeze in softLaunch; bottom bar Home · Modules · Generate · Library · Profile.
- Lab remains desktop PRIMARY + More/footer (not bottom-tab peer).
- Guides hub + Tools hub + guide article CTA → Modules / Seller Pack / Generate.
- Create mobile sticky polish already on main (Try free + recipe line).
- Verified: typecheck · engine-smoke · lint.

### 2026-07-24 — [grok] Retry still freeze + download requestId resolve
- Bugfix: Create Retry used ambient composer `assetId` after re-upload → wrong photo.
- `resolveGenerateStill` freezes version still (or frozen assetId only if still missing).
- `GenerationSpec.assetId` recorded at success; downloads API uses `findJobByRequestOrId`.
- engine-smoke pure cases: retry-still / retry-asset / fresh asset modes.
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Suite IA: Modules in link-check, footer, pricing, Lab
- link-check: `/modules` `/apps` `/login` `/status` job deep-links `/flow`.
- Footer Product: Modules · Seller Pack · Lab · Apps; sitemap includes `/modules`.
- Pricing bottom CTAs + Lab sticky: Modules / Seller Pack doors.
- Effects/Flow suite chrome already on main (GenerateSuiteChrome + chips).
- Verified: typecheck · engine-smoke · lint.

### 2026-07-24 — [grok] Suite honesty: Modules JOB/PREVIEW + PRIMARY_NAV freeze
- Workflows: Image/Batch → `live:false` Preview (not Seedance job blocks).
- Modules: Job blocks vs Preview shelves; Lab proof still labeled; T6 note on deliver step.
- `PRIMARY_NAV` in softLaunch drives AppShell; critical-path includes `/modules`.
- Seller Pack delivery counts only downloadable children (T6 Free raw).
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Landing assetId + delivery honesty + Library SKU
- LandingToolPanel: registerLocalAsset + generate with assetId (parity with Create).
- Delivery checklist respects Free download block (T6); Library filters by Toy Identity SKU.
- History stores optional `sku`; engine-smoke covers toyIdentity/delivery/workflows/landing.
- HANDOFF catch-up: five-step Toy Identity + competitor landscape already on main.
- Verified: typecheck · engine-smoke · lint.

### 2026-07-24 — [grok] five-step: Toy Identity + delivery + same-photo next job
- Create: 2-field SKU lock into extra; post-clip delivery steps; same-image job switches.
- `lib/toyIdentity.ts` · `lib/deliveryPack.ts`. No Character cloud / 3D / fake models.

### 2026-07-24 — [grok] product polish: job intents + activation checklist
- Boss paused public launch; Grok research → product depth.
- Create: JobIntentBar (Etsy / TikTok / reveal / shelf / Seller Pack); ActivationChecklist first-clip steps.
- Library empty state outcome-first; deep link `?job=etsy-listing`.
- Synthesis: `docs/research/PRODUCT_POLISH_SYNTHESIS.md`. DISPATCH notes launch pause.

### 2026-07-24 — [grok] Batch assetId + Mode A critical-path expansion
- BatchStudio/Seller Pack registers still once via `registerLocalAsset`; children send `assetId` (fallback Base64).
- `critical-path`: /login /status /api/auth/status /api/generations + HEAD health; health payments/t6 fields.
- `npm run mode-a-acceptance` wraps critical-path + link-check + Mode A honesty gates.
- Verified: engine-smoke · typecheck · lint.

### 2026-07-24 — [grok] Phase D assetId generate + Library session jobs
- Generate accepts `assetId` (session local asset) to avoid re-posting large Base64.
- Create registers uploads via upload-url + PUT; prefers assetId on generate.
- Library shows process-memory session jobs from GET `/api/generations` (retry/download gates).
- Verified: typecheck · engine-smoke · lint.

### 2026-07-24 — [grok] no-boss-wait: preflight, env.example, website skills, /status
- Boss deferred Vercel/SQL; continued no-login work.
- `npm run preflight-launch` · expanded `.env.example` (Supabase/payments/G6).
- Local skills: `.grok/skills/website-{cro,seo-audit,launch,copy}` + frontend-design/webapp-testing refs.
- `/status` ops probe (noindex) → /api/health. Sitemap date 2026-07-24.

### 2026-07-24 — [grok] Phase I payments readiness + reservation TTL expire
- `paymentsReadiness()`: test/live secret mode, live keys blocked without `PAYMENTS_LIVE=1`, client flag gate.
- Checkout returns `PAYMENTS_DISABLED` / `LIVE_KEYS_BLOCKED` honestly; health exposes `payments` (no secrets).
- `expireStaleReservations` + health `reservationSweep` for local durable TTL holds.
- softlive-checklist: Supabase + payments + sk_live warn; vercel.json security headers.
- Verified: engine-smoke · typecheck · lint. Public pay still off.

### 2026-07-24 — [grok] Supabase Postgres durable adapter + schema probe
- `lib/durableCredits/supabaseStore.ts`: ensure/get wallet, reserve/settle/release, guest migrate via service role + optimistic version.
- Auto-use Postgres when T5 tables exist; else local file. Guest FK failures fall back to local.
- Health probe reports `schemaReady`; Settings shows durable backend; `/api/me` durable.backend.
- Cookie generate still authoritative. Apply migration to go multi-node. Verified: typecheck · engine-smoke · lint.

### 2026-07-24 — [grok] Job timeout recovery + T6 honest status
- `sweepTimedOutJobs`: queued/running past `jobTimeoutMs` (default 10m, `PIKBO_JOB_TIMEOUT_MS`) → failed `TIMEOUT` / refund unconfirmed note.
- GET `/api/generations` sweeps + reports `timedOutThisSweep`; get/list always sweep.
- `lib/t6Watermark.ts` + health `t6` report: **blocked** until `PIKBO_T6_FILE_BAKE=1` (operator-proven bake only). Free download still gated.
- Verified: engine-smoke · lint · typecheck. No ffmpeg claim.

### 2026-07-24 — [grok] Phase D video-provider webhook + blockers refresh
- `POST /api/webhooks/video-provider`: idempotent by `eventId`; maps requestId→job; optional `VIDEO_PROVIDER_WEBHOOK_SECRET`.
- Terminal jobs not overwritten; duplicate events return `duplicate:true`.
- `docs/BLOCKERS_REQUEST.md` updated (G6/Supabase code done; remaining Vercel login, SQL apply, T6, public DNS).
- Verified: typecheck · engine-smoke · lint.

### 2026-07-24 — [grok] G6 PASS + Mode A private launch path
- **2 additional live Mini** (Seedance Mini): scout `360-spin` `019f8fb8-7b20-77e2-af8c-fcb392e2276f`; moon `blind-box` `019f8fba-1b61-7ac1-9ab7-b41b05f1cb8c`.
- **Refund:** `PIKBO_FORCE_GENERATE_FAIL=1` → 500 `GENERATION_FAILED` · credits 10→10 · `creditsRefunded:true`.
- Prior 2026-07-23 live + 2 tonight = **3 lives**. Evidence: `docs/evidence/G6_LAUNCH_LOG.md`.
- Scripts: `npm run g6-launch-pass` · `npm run g6-refund-leg`.
- `GO_NO_GO.md`: G6 → **PASS**. Public `pikbo.ai` still needs Vercel login (boss) + domain OK. Soft Mode A: `docs/LAUNCH_MODE_A.md`.
- No Stripe live, no public DNS changed.

### 2026-07-23 — [grok] Seller Pack durable shadow reserve 30 / child 10
- `lib/durableCredits/sellerPack.ts`: reserve 30 (purpose seller_pack), settle/release 10 per child.
- APIs: `POST /api/seller-pack/reserve|settle|release` (Bearer preferred; DURABLE_OFF non-fatal).
- BatchStudio Seller Pack: reserve before run; settle live success; release fail/not_started siblings.
- Cookie still debits each `/api/generate` child. Verified: engine-smoke · lint · typecheck.

### 2026-07-23 — [grok] Phase G perf + proof notes + D cancel/upload local
- Home/AutoPlay: non-hero `preload=none`; hero metadata; rail `fetchPriority` on first poster.
- Project page surfaces `reviewerNotes` under quality review.
- Login: Google OAuth button when `SUPABASE_AUTH_GOOGLE=1` (else honest gate copy).
- `DELETE /api/generations/[id]` cancels queued/running local jobs; upload-url + PUT content local asset path (in-process, 15m).
- Verified: typecheck · engine-smoke · lint.

### 2026-07-23 — [grok] Signed-in durable shadow on generate + /api/me
- Generate prefers Bearer Supabase user for shadow reserve/settle; guest fallback.
- Durable auto-on when Supabase URL present; cookie still authoritative for live debit.
- `/api/me` returns signedIn/auth/durable wallet; `fetchMe` + `postGenerate` send Bearer.
- CreditsBadge shows durable available + "account" chip when signed-in.
- Verified: engine-smoke · lint · typecheck. REQUIRE_DURABLE_CREDITS still off (no force).

### 2026-07-23 — [grok] Phase C guest→durable claim after Supabase sign-in
- `POST/GET /api/auth/claim`: Bearer JWT → ensure Free account + one-time guest credit migrate (cap 10).
- Auth callback + Profile claim on load; Profile shows email, durable balance, Sign out.
- Health exposes `auth.supabase` probe (configured/reachable/serviceRole). Generate still cookie-authoritative.
- Verified: typecheck · engine-smoke · lint. Apply SQL migration in Supabase for production wallet tables.

### 2026-07-23 — [grok] Supabase keys detected · magic-link wiring
- Boss filled local `.env.local` (URL + publishable + service_role; values not logged).
- Added `@supabase/supabase-js`, `lib/supabase/*` clients, `POST /api/auth/magic-link`, `/auth/callback`.
- Login form sends OTP email when Supabase Email provider is enabled.
- Guest cookie path unchanged until durable wallet migration ships.

---

### 2026-07-23 — [grok] Landing Free-download honesty + home proof quality gate
- LandingToolPanel: Free live Download blocked; prefers `/api/downloads/[requestId]`.
- Showcase: `passesHomeProofQuality` (≥4 all dimensions); provisional Lab scores + reviewerNotes on registry.
- HOME_PROOF recipes assert scores at load; `listHomeShowcaseProjects` filters failures.
- Verified: engine-smoke · lint · typecheck. External human QA still open (provisional scores labeled).

### 2026-07-23 — [grok] Phase F mobile Create/Seller sticky craft
- Create 390px sticky: ownership checkbox + photo scroll target; launch-8 chips + More recipes on mobile.
- Result metadata shows Settlement + Download policy.
- Seller Pack/Batch sticky mobile CTA (ownership + run); desktop primary hidden on small screens.
- Batch children store requestId and open via `/api/downloads` when allowed.
- Verified: typecheck · engine-smoke. Next: performance/proof labels or remaining polish.

### 2026-07-23 — [grok] Library Free-download honesty + local job retry
- Library blocks Free live raw Open/Download/Copy (T6 parity with Create); uses `/api/downloads/[requestId]` when present.
- `historyItemDownloadAllowed` shared policy in `lib/history.ts`.
- `POST /api/generations/[id]/retry` forks local queued child via `forkRetryJob` (202) — not 501; client still re-POSTs generate with photo.
- Create Download prefers controlled download endpoint when version has requestId.
- Verified: engine-smoke · lint · typecheck. No fal spend this cycle.

### 2026-07-23 — [grok] Phase H SEO: no thin index pages / noindex private
- `lib/seoIndex.ts`: `recipeHasUniqueProof` from DEMO_VIDEOS; concept/private/preview robots.
- Effects without unique Lab sample → `noindex,follow` + chip; LandingResults no shared-loop fake proof.
- Tools/for/toys noindex when primary recipe lacks unique proof; sitemap omits those + preview doors.
- robots disallow cinema/image/apps/models/flow/supercomputer/generate; apps/models/flow/batch noindex.
- Verified: engine-smoke · typecheck. Next: Phase F Create mobile polish or retry local job.

### 2026-07-23 — [grok] Phase D local job ledger + download gate + demo critical-path
- In-process `lib/generationJobs` records sync generate success/fail (idempotency + ownership).
- `GET/POST /api/generations` + `GET /api/generations/[id]` return real local jobs (no longer 501).
- `GET /api/downloads/[id]` → 403 Free live raw (`DOWNLOAD_BLOCKED`); demo/paid redirect.
- Health `acceptance.demoCached|softLive|paid`; critical-path defaults demo (strict: `REQUIRE_SOFT_LIVE=1`).
- Verified: engine-smoke · lint · typecheck. Not multi-node durable — Supabase still required. T6 bake blocked.

### 2026-07-23 — [grok] continuous: Seller Pack export + Library honesty + retry stub
- `lib/sellerPackExport.ts`: CSV/manifest only for succeeded+downloadable children; no fake ZIP.
- BatchStudio Export CSV / Manifest; Library title says **Saved on this device**.
- `POST /api/generations/[id]/retry` → 501 honest. Home CTAs fire analytics no-ops.

### 2026-07-23 — [grok] continuous: Phase D stubs + Create analytics hooks
- `POST /api/assets/upload-url` and `POST /api/webhooks/video-provider` → honest 501.
- Create `track(generate_start|generate_result)` no-ops unless `NEXT_PUBLIC_ANALYTICS_URL`.
- `.github/workflows/ci.yml` still **cannot push** (OAuth lacks `workflow` scope) — template remains `docs/ci/`.

### 2026-07-23 — [grok] continuous: fonts offline, Create launch-8, analytics stub
- Removed next/font/google (CI/offline builds no longer need fonts.googleapis.com).
- Create shows 8 launch recipes first + “More recipes” expand.
- Optional `lib/analytics.ts` no-op without NEXT_PUBLIC_ANALYTICS_URL.
- robots disallow `/login`; More menu → Sign in; CI template adds prod link-check.
- G6 harness notes: `scripts/g6-harness.md`.

### 2026-07-23 — [grok] Auth shell + durable shadow + Phase D stubs
- `/login` honest gate: no fake form when Supabase keys missing; form shell when configured.
- `GET /api/auth/status` public readiness (no secrets).
- Generate live path optional **shadow** reserve/settle/release when `DURABLE_CREDITS=local|1` (Cookie still authoritative).
- Phase D stubs: `GET/POST /api/generations` + `GET /api/generations/[id]` return 501 with compatibility notes.
- Profile links to sign-in status.

### 2026-07-23 — [grok] Phase C start — T5 durable credits foundation
- SQL: `supabase/migrations/20260723120000_t5_auth_credits.sql` (wallets, ledger, reservations, jobs, guest migration, RLS read policies).
- Pure engine: `lib/durableCredits/engine.ts` reserve / settle / release / guest migrate + idempotency.
- Local file adapter: `data/durable-credits.json` (dev); production still Cookie until Supabase env + REQUIRE gate.
- Health probes `durableCredits`; Create session stills interned via `sourceKey` (no 8× Base64).
- engine-smoke: concurrent 5/6 reserves, Seller Pack 30 partial settle/release, idempotent reserve.
- Boss blockers consolidated: `docs/BLOCKERS_REQUEST.md` (workflow scope, Supabase keys, FAL budget).
- Soft-launch generate path still Cookie-authoritative; durable path not forced until Supabase wired.

### 2026-07-23 — [grok] Wave B generation trust (B1–B6)
- Branch: `agent/grok/higgsfield-wave-b-trust` → main.
- **B1** `lastRequestCreditState` separate from version `creditState`; success→fail keeps `refund unconfirmed` / `10 restored` (not overwritten by Vn used/cached).
- **B2** Immutable `GenerationSpec` per success; **Retry · same settings** reuses spec; **Make variant · current settings** uses Composer; Seller Pack `retryJob` still maps by slug only.
- **B3** `/api/generate` success echoes `effect`, `costCredits`, `creditsOutcome`; Create only labels server echo when present.
- **B4** Free live (`!demo && watermark`) Download disabled + reason; Batch same gate. **T6 remains blocked** (no ffmpeg bake).
- **B5** Explore `AutoPlayVideo focusable={false}` so Link is sole focus target.
- **B6** CI workflow authored at `docs/ci/github-actions-ci.yml` (conflict markers, engine-smoke, lint, typecheck, build). **Blocked pushing to `.github/workflows/`** — OAuth token has no `workflow` scope; boss should copy file with a token that has workflow scope.
- Pure helpers: `lib/createTrust.ts`. Regressions in `scripts/engine-smoke.mjs`.
- Verified: `npm run engine-smoke` · lint · typecheck · `npm run build` PASS.
- **Not done:** live G6×2, first GitHub Actions green URL (needs `.github` install), server watermark bake (T6), public launch still NO-GO.
- Next per `docs/GROK_FINAL_TAKEOVER.md`: durable auth/credits → async jobs → T6 bake → product finish.

### 2026-07-23 — [gpt] all remaining work reassigned to Grok
- Boss assigned Grok as the sole temporary implementation owner while Claude is unavailable and GPT quota is low.
- Canonical runbook: `docs/GROK_FINAL_TAKEOVER.md`; branch: `agent/grok/final-takeover`.
- Order: Wave B trust → CI → durable auth/credits → async jobs/assets → file watermark → product finish → proof/performance/SEO → Stripe test readiness → private RC.
- Grok must continue past external blockers and collect secrets, spend, login and DNS needs in one final `docs/BLOCKERS_REQUEST.md`.
- Live charging, paid model calls, public DNS and copied competitor content remain unauthorized without separate boss approval.

### 2026-07-23 — [gpt] Grok Wave B trust fixes dispatched
- Boss reassigned the next engineering pass to Grok on `agent/grok/higgsfield-wave-b-trust`.
- P0 order is frozen: settlement truth, Retry/Variant semantics, server metadata, free-download watermark gate, Explore focus, then visible CI.
- Existing successful versions and Seller Pack children must survive failed attempts; unknown refunds stay `refund unconfirmed`.
- Free live raw provider URLs cannot be downloadable; T6 stays blocked until the file itself is verified watermarked.
- Exact tests, forbidden scope, validation commands, and handoff evidence are in `docs/DISPATCH.md`; tracking row is `H-WAVE-B`.

### 2026-07-23 — [grok] Create version compare polish on Wave A
- Fast-forwarded `agent/grok/higgsfield-wave-a` onto main.
- Each success keeps source still + requestId/provider; switching versions restores Before still.
- Cap 8 session versions; creditState 0 cached / 10 used / 10 restored on fail.


### 2026-07-23 — [grok] Create version compare + server metadata polish
- Create session stack now stores source still / recipe / requestId / provider per version.
- Photo↔video compare uses the active version’s still (not the current compose upload).
- Result panel shows a server-metadata grid (recipe, model, duration, aspect, resolution, credits, task id).
- Failed regenerate keeps prior versions visible; stack capped at 8. Wave A code on main.

### 2026-07-23 — [grok] Higgsfield Wave A core loop ready for review
- Implementation SHA: `2e4a0a8` on `agent/grok/higgsfield-wave-a`.
- Scope: one canonical ShowcaseProject registry now drives Home, Explore, Inside Project, and recipe deep links; unknown project slugs return 404.
- Create keeps successful versions, labels cached/live and credit/refund state, and saves device-local project history without claiming cloud sync.
- Seller Pack canonical is `/create?mode=seller-pack`; its three fixed children settle independently, retain successes, and retry only failed items.
- Verification passed: engine-smoke, ESLint, TypeScript, production build, link-check, critical-path, and browser checks at 390/768/1440; public launch remains NO-GO.


### 2026-07-23 — [gpt] Wave A engineering reassigned to Grok
- Boss reassigned implementation because Claude is unavailable until Monday.
- Grok branch: `agent/grok/higgsfield-wave-a`; exact takeover block is in `docs/DISPATCH.md`.
- Order is fixed: ShowcaseProject → project detail → Home rail → Explore filters → Create versions → Library grouping → Seller Pack compatibility.
- Existing fal/API and Supabase product contracts remain authoritative; no second persistence layer or fake suite doors.
- Stripe, public DNS, copied Higgsfield content, and missing Audio/Canvas/MCP shells remain out of Wave A.

### 2026-07-23 — [gpt] Higgsfield full public-surface parity inventory
- `docs/prd/HIGGSFIELD_PUBLIC_PARITY.md` maps the inspected target's 17 top-level products plus presets, projects, assets, models, apps, profile, and settings.
- Wave A is the only immediate build: Home retention sequence, Explore, Create, Effects, Inside Project, Assets, and Seller Pack.
- Missing Image/Audio/Cinema/Canvas/Shorts/Explainer surfaces cannot enter primary navigation until they have a real provider-backed job.
- Exact target trademarks, copy, customer work, videos, lessons, and source code are excluded; PIKBO-owned replacements preserve the public interaction pattern.
- Claude owns Wave A engineering; Grok merges in the six-step order recorded in the parity contract.

### 2026-07-23 — [gpt] world-class contract final sync
- Seller Pack is canonical inside Create at `/create?mode=seller-pack`; `/supercomputer?pack=seller` remains a compatibility forward, not a primary product.
- Desktop and mobile navigation are frozen at five destinations; Generate is the only emphasized CTA.
- The Launch 12 now matches the boss-approved list, and homepage proof remains exactly eight distinct, traceable recipe assets.
- Official examples require five 1–5 review dimensions plus input, provider task ID, model, parameters, output, and reviewer notes.
- `SEO_INTENT_50.md` now has the exact 12 effect / 8 toy / 8 platform / 10 task / 6 problem / 6 role taxonomy; only ten proof-backed Wave 1 pages may ship.

### 2026-07-23 — [grok] G6 refund leg automation (dev/local)
- `PIKBO_FORCE_GENERATE_FAIL=1` on non-production generate: debit then `GENERATION_FAILED` + `creditsRefunded:true` (no fal burn).
- Verify: start `PIKBO_FORCE_GENERATE_FAIL=1 npm run dev`, then `G6_TEST_REFUND=1 npm run g6-api-smoke`.
- Still need: 2 more owned-toy **live** Mini successes for full G6 Pass (1 live already logged).
- Remix: Library history stores `sourceProject` + `channel` from Create remix handoff.


### 2026-07-23 — [grok] GPT research marked COMPLETE · shared hub
- GPT交付已在 main（含未推 origin 的 merge）：`WORLD_CLASS_PIKBO` · `SEO_INTENT_50` · `SOFT_NAV_AND_PRESETS` · **`RETENTION_REMIX_LOOP`**
- Notes: `docs/research/by-agent/GPT.md` → status ✅
- Consensus: `SHARED_SYNTHESIS` 增加 remake 闭环为 P0 抄项
- **Claude next:** implement `RETENTION_REMIX_LOOP.md`；填 `by-agent/CLAUDE.md` 实现矩阵
- Grok: push main to origin so all agents see GPT research

### 2026-07-23 — [gpt] home retention + official project Remix contract
- `RETENTION_REMIX_LOOP.md` converts live HF/Yiha inspection into a PIKBO-specific Toy Premiere → Before/After → recipe rail → Remix → Create loop.
- Current gap is explicit: `HfExploreHome` ignores projects, uses a low-opacity background, has no project detail, and loses context when the visitor leaves for Create.
- The contract freezes `ShowcaseProject`, validated `RemixIntent`, project detail fields, Create preflight, analytics events, performance limits, and 1440/768/390 acceptance.
- `WORLD_CLASS_PIKBO.md` now requires Home/Explore to preserve recipe context into the existing three-decision Create path.
- Claude handoff is in DISPATCH; no app/API/credits/Stripe/DNS implementation changed.

### 2026-07-23 — [grok] shared research hub for Grok+GPT+Claude
- Boss: all three agents research; results **in repo**; shared.
- Hub: `docs/research/README.md` · consensus `SHARED_SYNTHESIS.md` · notes `by-agent/{GROK,GPT,CLAUDE}.md`
- Paste tasks: `docs/PASTE_SHARED_RESEARCH.md`
- Merged onto main from GPT branch: `WORLD_CLASS_PIKBO.md`, `SEO_INTENT_50.md`, `SOFT_NAV_AND_PRESETS.md` (+ GO_NO_GO sync)
- Grok long-form remains: `COMPETITOR_PRODUCT_INTERACTION.md`
- **GPT/Claude:** pull main, fill your `by-agent/*.md`, push `[gpt]`/`[claude]`.


### 2026-07-23 — [gpt] world-class product contract + SEO Intent 50
- `WORLD_CLASS_PIKBO.md` freezes the four ICP paths, three-decision Create flow, Toy Identity assessment, SKU project model, Seller OS packs, state machine, and 12 launch recipes.
- Active prices remain unchanged; higher-ARPU tiers are research hypotheses gated by provider invoices, weighted credits, and paid pilots.
- `SEO_INTENT_50.md` maps 50 queries to canonical routes, recipes, internal links, capability gates, and thin-page protections.
- `SOFT_NAV_AND_PRESETS.md` freezes four primary nav routes, eight homepage proof slugs, route inventory, and the ten-step launch-day checklist.
- `GO_NO_GO.md` is formally product-complete but stays NO-GO until live/refund evidence and release checks pass.

### 2026-07-23 — [grok] G6 PARTIAL live path smoke (not full Pass)
- **1× live Mini OK:** POST `/api/generate` with `scout-still.webp` + `360-spin-showcase` + `ownsRights:true` → `demo:false`, fal `videoUrl`, credits **10→0**.
- **ownsRights gate OK:** without rights → **400**, credits unchanged (no false debit).
- **Still need for G6 Pass:** 2 more real owned-toy lives + 1 post-debit provider failure proving `creditsRefunded` (or HANDOFF notes from boss hand test).
- engine-smoke PASS · link-check PASS · main tip includes GPT seller-first copy + Lab unique demos.

### 2026-07-23 — [gpt] world-class seller copy + official proof + search intent
- Home now leads with “One toy photo. A clip ready to list or post.” and a seller/collector workflow instead of model-engineering language.
- Official examples, cached playback, and unverified concepts use distinct labels; Lab does not imply customer posts or engagement.
- Pricing frames finite output capacity and seller workload without promising sales; Free/Creator/Shop numbers remain on the active contract.
- Ten high-intent effect/use-case pages now use search-language H1s plus honest, page-specific FAQs; generated unseen angles require review.
- Technical SEO: buyer metadata, branded OG/X card, private-page noindex, stable sitemap dates, and `/create?effect=` canonical cleanup.

### 2026-07-23 — [claude] world-class Create + home proof wall (branch `agent/claude/world-class-create`)
- **Create flagship (390 mobile):** stepped Photo → Recipe → Generate → Result; sticky single primary CTA above bottom tab nav; demo/live/refund banner impossible to miss; advanced (model/duration/seed/prompt) collapsed; Text→Video / multi-model shelf off primary surface.
- **Home:** one ICP H1 + single CTA “Try free · Generate”; proof wall ≤8 unique Lab demos; multi-model theater / product shelf removed; thin Seller Pack entry only.
- **Seller Pack MVP:** `/supercomputer?pack=seller` freezes Listing Spin + Blind-box Reveal + Social Flash (1:1 / 9:16 / 9:16); Create links into pack; not full Seller OS (T5/atomic credits still TODO for GPT WORLD_CLASS PRD).
- **Perf:** kept `preload=metadata` + ≤2 concurrent autoplay.
- **Verified:** eslint changed files, `tsc --noEmit`, `next build` green (71 routes).
- **No Stripe / no fake multi-model / no extra top-nav.**

### 2026-07-23 — [grok] MOONSHOT world-class bar · $60k/day reverse plan
- Boss demand: world's best toy video site, Google traffic explosion, path to **$60k/day** sub revenue.
- Strategy: `docs/MOONSHOT_WORLD_CLASS.md` — unit-econ reverse, W1–W8 pillars, S0→S4 stages, kill HF shell theater.
- Dispatch: GPT `world-class-prd`, Codex `world-class-copy`, Claude `world-class-create` (spawned).
- Paste: `docs/PASTE_WORLD_CLASS.md`
- Honesty: $60k/day is **S4** (category leadership), not Sunday; build to that standard from S0.
- Public domain still GO-gated; quality bar upgraded from meh soft to W1–W5.

### 2026-07-23 — [claude] shell triage G1–G4/G7 soft (branch `agent/claude/shell-triage`)
- **G1 nav:** Primary = Explore · Create · Effects · Lab + Pricing/Generate CTAs. Models/Cinema/Batch/Feed/Image/Library under **More**. Mobile = Home · Effects · Generate · Lab · Pricing.
- **G2 density:** Homepage uses `buildHomeShowcaseFeed()` — max **8 unique** Lab demos; removed multi-pass shared-loop wall. Lab/Feed `buildVideoFeed()` no longer density-triplicates presets.
- **G4 404s:** `next.config.ts` permanent redirects for short/wrong `/for/*` slugs (e.g. `/for/etsy-sellers` → `/for/etsy-listing-videos`). Footer already uses real USE_CASES slugs.
- **Perf soft:** video `preload="metadata"` (no tile `preload=auto`); ≤2 concurrent autoplays in `AutoPlayVideo` + home `Clip`.
- **G7 topup:** `/api/dev/topup` forbidden on production (`NODE_ENV`/`VERCEL_ENV`); health `devTopup` matches.
- **Verified:** eslint changed files, `tsc --noEmit`, `next build` green (71 routes).
- **Remaining for GPT whitelist:** exact 8 preset slug list (`docs/prd/SOFT_NAV_AND_PRESETS.md`), formal G1/G2 Pass in GO_NO_GO; Codex honesty copy G3/G5; hand test G6.

### 2026-07-23 — [grok] merge shell-triage · G1/G2/G4/G7 soft yellow
- Merged `agent/claude/shell-triage` @ `fbe3bd6` → main (fast-forward).
- Homepage ≤8 unique demo feed; Lab showcase honesty partial; `/for/*` short slug redirects; video `preload=metadata` + concurrent play cap; prod topup hard-off.
- Earlier same day: soft primary nav + More; `creditsRefunded` client honesty (`237068e`/`7250d17`).
- **Still NO-GO public:** G3/G5 need Codex paste; G6 hand test; GPT formal whitelist PRD not pushed yet.
- Boss: paste `docs/PASTE_TO_GPT_CODEX_CLAUDE.md` ①② into GPT/Codex now.

### 2026-07-23 — [grok] NO-GO public launch · emergency dispatch GPT/Codex/Claude
- **Ruling:** Public `pikbo.ai` is **NO-GO** until G1–G7 green. Not a Stripe issue — empty nav, shared demo wall, footer 404s, unrun hand tests.
- Evidence: `docs/BRUTAL_EXPERT_ROAST_2026-07-23.md` · Gate: `docs/prd/GO_NO_GO.md` · Board: `docs/DISPATCH.md`
- **GPT NOW:** branch `agent/gpt/go-no-go-soft` → expand GO_NO_GO + `SOFT_NAV_AND_PRESETS.md` whitelist (paste block in DISPATCH).
- **Codex NOW:** branch `agent/gpt/shell-honesty-copy` → ICP/meta/Lab honesty (after or parallel safe strings).
- **Claude NOW:** branch `agent/claude/shell-triage` → cut nav, cap 8 presets, fix 404s, video preload.
- **Boss:** do **not** public-share domain until gate green; private `*.vercel.app` preview only if needed.
- Grok will merge triage + flip GO when evidence exists.

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
# 2026-07-27 — [grok] R4/R5 growth evidence and WorkBuddy boundary

- Added `docs/growth/SHOWCASE_EVIDENCE_LEDGER.md`: required schema plus an audit
  of all 12 registered examples; current result is 0 official / 12 prototype,
  with no numeric score until input rights, provider task, output and named
  reviewer evidence are complete.
- Rewrote the canonical keyword/performance/30-day reports to withdraw
  unsupported search-volume, blue-ocean, ranking, exact-48-indexed-page and
  submission-as-backlink claims.
- Standardized external status as `submitted / pending / published /
  verified_backlink`; historical forms currently yield 0 verified backlinks.
- WorkBuddy queue now contains only raw GSC/AITDK/哥飞 evidence and public
  listing verification; generic directory, auth, secrets, DB and deploy work is
  paused/reassigned.
- `scripts/growth-auto/push_via_api.py` is dry-run by default, never handles a
  token, refuses dirty trees and permits pushes only to `agent/grok/*`; safety
  tests cover main and branch-prefix rejection.

### 2026-07-28 — [gpt] Seller Pack cached golden path hardening
- Paths: `lib/sellerPackContract.ts`, `lib/sellerPackRecovery.ts`,
  `components/BatchStudio.tsx`, `scripts/seller-pack-cached-smoke.mjs`,
  `scripts/seller-pack-api-golden.mjs`, `scripts/engine-smoke.mjs`.
- Why good: the fixed three-child pack, recovery list and retry policy now share
  one contract. The smoke executes the real TypeScript modules instead of a
  mirrored test implementation, retains two successful child videos when the
  middle child fails, and permits retry only for failed/refunded/not-started
  children.
- Running-server evidence: one bundled Pikbo Lab still is posted through all
  three fixed API children; the test requires cached-only health, provider
  unavailable, three successful demo-cached jobs and unchanged credits.
- Browser evidence: the Seller Starter Pack surface shows three cached
  prototypes, fixed 1:1/9:16/9:16 outputs and “3 clips cached free (0 credits)”.
  Local interactive hydration could not be exercised through the isolated
  browser origin, so no browser-policy bypass was attempted; API and module
  smokes provide the interaction/settlement regression.
- Final Codex verification after merging `main@4d9efa9`: `typecheck`,
  `engine-smoke`, `seo-cold-start-smoke`, `seller-pack-cached-smoke`,
  `recovery-qa`, `recovery-ledger`, `recovery-retry-deadline`,
  `recovery-reconciliation`, the 193-route production build, running-server
  `link-check`, `critical-path` and `seller-pack-api-golden` all pass. ESLint
  reports 0 errors and one existing unused-variable warning in
  `components/HomeViralWall.tsx`.
- Review: PR #39. The functional Seller Pack files are already content-aligned
  with latest `main`; this final PR records the reproducible verification and
  board/handoff evidence without reopening production or billing gates.
- Remote evidence: GitHub Actions run #442 is green for conflict markers,
  engine smoke, lint, typecheck, build, production link-check and the
  fail-closed critical path.
- Safety: no provider key, paid call, database, Stripe, deployment, DNS or public
  indexing action. T5/T6 and public Mode A/B readiness remain fail-closed.
