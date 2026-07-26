# 通宵冲刺 — 老板睡觉 · 三 agent 不许停

**状态：** ACTIVE（2026-07-23 夜 · 老板已真睡）  
**协调：** Grok · 第一性原理 + 五步法  
**目标：** 世界上最好的潮玩图→片站点：出片稳、审美硬、数字诚实、可部署  

**老板信条：** 相信 Grok 扛引擎与合流；Claude 设计；Codex 文案。不许偷懒。  


---

## 硬规矩

| Agent | 目录 | 分支 | 节奏 |
|-------|------|------|------|
| **Claude** | `/Users/x/claude/pikbo-claude-ui` | `agent/claude/home-hf` | 每段 commit + **立刻 push** |
| **Codex** | `/Users/x/claude/pikbo` | `agent/gpt/*` | 每段 push；Grok 合流 |
| **Grok** | `/Users/x/claude/pikbo` | `main` | 合流 + 引擎 + 不抢 UI |

**禁止切别人的目录/分支。** 见 `docs/AGENT_WORKTREES.md`。

---

## 通宵任务板

### Claude（设计 · 最重要视觉）

1. HF 顶栏 / 视频墙密度 / 卡片 hover 继续打磨  
2. 手机 390px 首屏只出视频、少字  
3. **每 30–60 分钟** `git push origin agent/claude/home-hf`  
4. 未提交改动先 commit，别留 uncommitted 过夜  

### Codex（文案 · 诚实）

1. [x] 扫剩余 overclaim（Explore / PIKBO Lab / trust 条）  
2. [x] FAQ / 空态与 Mini Free 一致  
3. [x] wave2 honesty 已进 main（Lab labels · Mini trial）  
4. 下一波：pricing FAQ residual + any post-merge drift  

### Grok（引擎 · 生产）

1. [x] merge Codex wave2 honesty  
2. [x] 合流 Claude home-hf（community 4-col）  
3. [x] generate/image: MIME guard · Retry-After · PROVIDER_BALANCE/RATE codes · resolution in success  
4. [x] health ready ladder · library import/export + live/demo filter + richer meta  
5. [x] shared `generateClient` · Batch retry on 429 · Landing/Create aligned · image delete/demo · engine-smoke  
6. [x] honesty: cached demos **0 credits** (generate+image); client no longer blocks out-of-credit demo; entitlements probe on health  
7. [x] softLive: IP+session rate limit · in-flight lock · /api/me mode · softlive-checklist  
8. [x] prompt template always kept · library fal aging badge · checkout rate limits  
9. [x] batch free/live honesty · invoice webhook idempotency · image checkCredits parity  
10. [x] meClient · settings mode honesty · sample stills validate · health HEAD · preflight stills  
11. [x] merge Claude media-rich home promo · profile/landing meClient · promo honesty  
12. [x] merge Claude logo + feature cards · Logo useId · confirm idempotent · toy identity lock  
13. [x] merge Claude E3 preflight/rights · GPT SELLER_PACK+AUTH_CREDITS · server ownsRights  
14. [x] merge Claude unknown deep-link notice · result provenance (Cached demo / Live generation) · Local Library · softlive Stripe-optional  
15. [x] soft-launch primary nav + More · creditsRefunded on fail · Library export provenance · README demo free  
16. [x] merge GPT world-class-copy · Lab unique-demo wall (no shared-loop flood) · link-check G4 · refund smoke  
17. [x] merge GPT world-class-prd + retention-remix · cherry-pick +5 viral effects · HOME_PROOF_SLUGS enforce · g6-api-smoke · More Local/Preview tags  
18. [x] cherry-pick Claude /tools SEO cluster (18) · sitemap+index+footer · link-check sample · G7 topup smoke  
19. [x] G6 force-fail refund hook (non-prod) · remix history source/channel · i18n ES fix · remake link-check  
20. [x] projects SSG+sitemap · Library Remix again · health forceGenerateFail flag · image force-fail parity  
21. [x] one-tap Lab sample honesty (cached free vs Mini 10cr) · lab-sample Library provenance  
22. [x] Wave A: seller-pack Create mode · Library project groups · Explore cat filter · showcase registry  
23. [x] merge Wave A core loop branch · Create version stack + per-version Before/After metadata  
24. [x] Wave B trust: settlement · Retry/Variant · server echo · Free download gate · Explore focus · CI
25. [x] Phase D local job ledger · /api/downloads gate · demo critical-path acceptance
26. [x] Library Free-download honesty · local forkRetry · Create download via /api/downloads
27. [x] Landing Free-download honesty · HOME_PROOF quality ≥4 gate (provisional Lab scores)
28. [x] Signed-in durable shadow reserve on generate · /api/me auth+wallet · badge displayCredits
29. [x] Seller Pack shadow reserve 30 · settle/release 10 per child · BatchStudio wired
30. [x] G6 PASS (3 lives + refund) · Mode A runbook · video-provider webhook
31. [x] Job timeout sweep · T6 health status (blocked honest)
32. [x] Phase I payments readiness · live-key block · reservation TTL expire · vercel headers
33. [x] Batch assetId reuse · Mode A critical-path + mode-a-acceptance script
34. [x] Suite honesty: Modules JOB/PREVIEW · PRIMARY_NAV · Seller delivery T6 count
35. [x] Retry still freeze: re-upload must not steal version photo (resolveGenerateStill)
36. [x] Downloads resolve job id **or** provider requestId; GenerationSpec.assetId
37. [x] ASSET_NOT_FOUND → inline still recovery (Create/Landing/Batch); Library quota save
38. [x] Library session jobs visible when device history empty · Create fail recovery tip
39. [x] In-flight lock TTL recovery · JOB_IN_FLIGHT Retry-After · getJob by requestId
40. [x] Library cancel ledger + Seller Pack retry-failed-only · auth callback noindex
41. [x] Sliding asset TTL · health assets probe · re-register after ASSET recovery
42. [x] Phase H analytics funnel (upload/project/export) · profile honesty · robots /status
43. [x] Prod video-webhook secret required · jobs/assets health · Mode A honesty probes
44. [x] Pricing FAQ JSON-LD + Explore Lab≥4 provisional proof chips
45. [x] Asset id session-reservation + PUT NOT_OWNED · no dataUrl echo · abort copy
46. [x] Create Cancel request mid-generate · AbortController + sleep(signal)
47. [x] Batch/Seller Pack Cancel mid-pack · keep finished · preflight demos+2
48. [x] Image Cancel request + Tools/Guides ItemList JSON-LD
49. [x] Image costCredits echo · forkRetry by requestId · demo disk integrity
50. [x] ProjectCard AutoPlay budget · Apps/Community ItemList JSON-LD
51. [x] Auth magic-link/claim rate limits · safe download redirect URLs
52. [x] VideoTile AutoPlay budget · Effects proof-backed ItemList JSON-LD
53. [x] Safe provider videoUrl gate · timeout/content classify · generate Retry-After
54. [x] Image UNSAFE_URL gate + Create adoptImage useCallback / pending-still scheme filter
55. [x] Generate UNSAFE_URL code parity (was MODEL_EMPTY) · providerFailHttp timeout/content codes · webhook UNSAFE→422
56. [x] Flow + home viral: AutoPlay budget (kill multi-autoPlay) · flow PREVIEW_ROBOTS
57. [x] Round B Y5 sellerPackQuote · Pack balance strip · Library By SKU · NETWORK/CANCEL codes · CP /flow /apps
58. [x] Live generate beginSyncGenerateJob (running ledger) · complete/fail · Library cancel/timeout mid-flight
59. [x] jobId echo on success · jobs probe byStatus/open · NETWORK/CANCEL → refund unconfirmed
60. [x] Generate idempotencyKey: success/fail replay · running→JOB_IN_FLIGHT · client mint once per attempt
61. [x] Idempotency before image/asset resolve · health.product video-first · mode-a jobs.byStatus
62. [x] touchJob on poll · generations byStatus/open · idempotentReplay toast honesty
63. [x] List GET touches open jobs · /api/me freeTrial honesty · badge trial exhausted
64. [x] Download absolute /demos redirect + HEAD · health.billing.freeTrial · CP me freeTrial
65. [x] Profile/Settings freeTrial honesty · Library download HEAD codes · PRIVATE_ROBOTS settings
66. [x] freeTrial rehydrate after generate merge (stale exhausted/clipsLeft)
67. [x] free stills never burn Mini trial (`free_trial_video_only` · health/me scope)
68. [x] Seller Pack multi-download available + Modules freeTrial FAQ honesty
69. [x] health.demos disk probe · demoClip on-disk fallback · image mergeMeSession + aspect echo
70. [x] Library import/download URL safety · export downloadGate · me/generations HEAD · creditStatus server echo
71. [x] FreeTrialCta Apps/Explore/Community · Apps+Explore FAQPage
72. [x] StatusProbe demos/freeTrial · Seller Pack unsafe URL drop · CP HEAD me/generations
73. [x] Create/Landing Free raw share+download safety · assets content HEAD
74. [x] generateClient refuse unsafe 200 videoUrl · Batch download/player URL safety
75. [x] T6 live download gate recompute · never raw Free · HEAD X-Pikbo-T6/Bake
76. [x] Library/Create/Landing video URL safety · imageHistory sanitize · health.community
77. [x] community posts rate limits + HEAD · CP/Mode A community honesty
78. [x] Free Mini raw blocked from Community publish · safe UGC render · library smoke
79. [x] Image idempotencyKey + requestId ledger (no double Flux debit) · health.imageJobs
80. [x] Image TIMEOUT sweep + HEAD open probe · honest JOB_IN_FLIGHT Retry-After after crash
81. [x] Generate TIMEOUT/PROVIDER_NETWORK honesty · ledger Retry-After after crash · refundUnconfirmed echo
82. [x] imageClient postImageWithRetry · Still FailPanel Retry-After · PROVIDER_NETWORK auto-retry
83. [x] PROVIDER_TIMEOUT auto-retry (gen+image) · Library TIMEOUT refund-unconfirmed honesty
84. [x] Create settlement TIMEOUT→refund unconfirmed · generateClient flag · residual refund copy
85. [x] Batch/Landing TIMEOUT settlement parity · network abort refundUnconfirmed
86. [x] health/me refund policy when_confirmed · TIMEOUT unconfirmed · imageClient network
87. [x] rehydrateFreeTrial keeps refund policy · Settings Live fail refunds · guides honesty
88. [x] T6 fail-closed skeleton: no env unlock Free raw · server-owned worker IMPLEMENTED=false
89. [x] T6 hard gate: derivative must bind jobId+providerRequestId; canServe requires serving+storage
90. [x] Create empty remix honesty + first-fold (identity in Advanced · Lab collapsed)
91. [x] Free live generate never echoes provider raw URL · controlled /api/downloads only
92. [x] Seller Pack session recovery + Batch/Library Free live playable gate + login product-first guest
93. [x] T5 server-owned jobs hard-false on health · Community public URL gate · project product-first
94. [x] CD Phase A: Creative Director narrative + product-first suite exits · JobIntentBar goals all viewports
95. 下一拍：Mode A Vercel deploy (boss login) · SQL migration apply · T6 bake when worker

### 老板醒来验收

- [ ] `main` 最新  
- [ ] `/create` 能出片或诚实 demo  
- [ ] 首页视频墙像 App  
- [ ] 定价 1 / 5 / 15 + Mini  
- [ ] Mode A Vercel preview (not public DNS yet)  

---

## Grok 本拍状态（3 行）

- Profile refund policy honesty + viral rail Lab ≥4 (smoke before PASS).
- Image cancel settlement marker; engine-smoke green end-to-end.
- Mode A still needs boss Vercel login · SQL · real ffmpeg bake proof.










---

## 复制口令

### Claude（设计 worktree）

```text
通宵不许停。只在固定目录：
cd /Users/x/claude/pikbo-claude-ui
git checkout agent/claude/home-hf
git pull origin agent/claude/home-hf

每完成一块 UI：
git add -A && git commit -m "[claude] …" && git push origin agent/claude/home-hf

禁止 checkout main；禁止用 /Users/x/claude/pikbo。
读 docs/OVERNIGHT.md + AGENT_WORKTREES.md。
继续 HF 审美：顶栏、视频墙、hover、移动端。干到天亮。
```

### Codex

```text
通宵继续。cd /Users/x/claude/pikbo && git pull origin main
git checkout -B agent/gpt/overnight-copy
扫全站假/旧数字与 overclaim；只改文案。
禁止 app/api、session/credits 逻辑、Claude UI 目录。
commit [gpt] + push。读 docs/OVERNIGHT.md。
```

### Grok（自己）

```text
主目录 main：merge 一切绿的 agent 分支；加固 generate/library/health；
不抢 Claude 视觉。定时自检 DISPATCH。
```
