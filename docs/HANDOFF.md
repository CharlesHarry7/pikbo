# Handoff log — quality work others should reuse

Newest first. One block per meaningful landing.

---


### 2026-07-26 — [grok] Wave C: durable auth · transactional credits · CI honesty

**Branch:** `agent/grok/durable-auth-ci-cutover` (rebased onto current `main`) · PR https://github.com/CharlesHarry7/pikbo/pull/23

#### Implemented
1. **P0-1 CI false-green:** Honest template `docs/ci/github-actions-ci.yml` — single step start+link-check+critical-path, **no `|| true`**. OAuth lacks `workflow` scope so live `.github/workflows/ci.yml` unchanged. Boss must copy template. `durable-credits-smoke` wired.
2. **P0-2 schemaReady:** URL normalize (strip `/rest/v1`). Local health: backend=supabase, schemaReady=false, code=SCHEMA_MISSING — **not** local-file dual ledger. ready.durableCredits=false until SQL.
3. **P0-3 transactional RPCs:** `20260726120000_t5_credit_rpcs.sql` FOR UPDATE + idempotent. JS RPC-only.
4. **P0-4 fail closed:** production never silent local-file dual ledger.
5. **P0-5 signed-in SoT:** Generate uses Supabase when durableIsAuthoritative(); guests keep Cookie Free Trial; migrate max 10 once.
6. **P0-6 tests:** durable-credits-smoke PASS (6×10@50, idempotency, Seller Pack 30→20+10).

#### Migration required (boss — Email/localhost callback already done)
1. `20260723120000_t5_auth_credits.sql`
2. `20260726120000_t5_credit_rpcs.sql`

#### Verify (rebased)
check:conflicts · durable-credits-smoke · engine-smoke · lint · typecheck · build · link-check · critical-path — **all PASS** (strict, no `|| true`).

Local health (NODE_ENV=production): backend=supabase · schemaReady=false · transactionReady=false · code=SCHEMA_MISSING · ready.durableCredits=false · **not** local-file dual ledger · softLive guest Cookie still works.

#### Gates
- **T5 → review** only after boss applies both SQL migrations → transactionReady=true.
- **T23 → done** only after boss copies `docs/ci/github-actions-ci.yml` → `.github/workflows/ci.yml` (workflow scope) + green Actions URL.
- **T6** stays **blocked**.

#### PR
- https://github.com/CharlesHarry7/pikbo/pull/23

#### CI URL
- Engine/lint/typecheck/build green (live CI still masks critical-path with `|| true`): https://github.com/CharlesHarry7/pikbo/actions/runs/30190344863
- Full T23 (honest critical-path) pending boss copy of `docs/ci/github-actions-ci.yml` → `.github/workflows/ci.yml`.
- Local strict path **PASS**.

#### Commit SHAs (rebased)
- `c2597a8` [grok] HANDOFF: Wave C PR #23 link
- `196c732` [grok] ship honest CI as docs/ci template (workflow scope)
- `62b356e` [grok] prove durable concurrency and idempotency
- `9288adc` [grok] fail closed and cut over signed-in credits
- `7420899` [grok] add transactional Supabase credit RPCs
- `88e4098` [grok] make CI critical path fail honestly

---

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
