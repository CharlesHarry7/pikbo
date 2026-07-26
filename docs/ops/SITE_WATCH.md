# Site Watch — 谷歌 · 生产 · 产品 · X 雷达

Grok 主写（见 `docs/prompts/GROK_SELF_OPS.md`）。Claude/Codex 可补产品体感。  
**Newest first。** 每条观察带 UTC 时间 + main tip。

---

## 2026-07-27 · 24h 冲刺启动（Grok）

```yaml
writer: grok-eng
mandate: "都做 · 24h 不停"
production:
  softLive: true
  sitemap: 13
  deploy: "WB DEPLOY PASS already"
growth:
  last_wb: "20260726T181140Z submitted=1(prior) captcha/login heavy"
  queue_open: ["WQ-04 growth loop", "WQ-05 GSC recheck"]
  need_email: "PIKBO_GROWTH_EMAIL for login walls"
product_content_shipped:
  - "2 deep guides (vs generic + Seller Pack workflow)"
  - "/about trust (noindex)"
  - "HomeSeoBody long-tail mesh chips"
next:
  grok: "Generate/home density residual; more guide polish if time"
  workbuddy: "clear WQ-04/05; growth --all loops; no sitemap expand"
```

---

## 2026-07-27 · 长尾蓝海 7 词布局（Grok）

```yaml
writer: grok-eng
decision: |
  老板：这些词无人做，我们做。竞争低→先占一词一页 + 冷启动 sitemap 扩到 13。
  主词 H1 冻结；不堆 franchise IP；不扩垃圾 URL。
map: docs/growth/LONG_TAIL_KEYWORD_MAP.md
index_new:
  - /tools/figure-360-product-video  # AI figure 360 video
  - /tools/blind-box-reveal-video-maker  # blind box AI video generator
  - /tools/one-photo-product-video  # one photo toy video AI
  - /tools/ai-product-video-generator-for-toys  # toy product video AI
  - /for/action-figure-product-videos  # AI action figure video generator
mesh:
  - designer toy AI video → designer-toy-teaser + main keywords
  - AI toy video generator → primary rank (unchanged H1)
dropped_from_sitemap: /explore
next:
  workbuddy: "外链锚文本可轮换 7 词；rank URL 仍以主词页为主"
  gsc: "老板侧：新 URL 提交 sitemap / 检查覆盖率（非工程阻塞）"
```

---

## 2026-07-27 · WorkBuddy intake + Modules density（Grok）

```yaml
writer: grok-eng
main_tip: "bb7a6da pulled · this cycle Modules proof + directories free-flags"
production:
  health: "softLive true · ok · paid false · T6 blocked"
  domain: "https://pikbo.ai only"
google_seo:
  site_operator: |
    前轮已确认 site:pikbo.ai 多路径收录；本轮不改 TDH/H1、不扩 SEO URL。
  rank_anchor: "/tools/ai-toy-video-generator"
  growth_runs: |
    ✅ WorkBuddy 已产出并 push main:
    - d308b46 [workbuddy] growth run 20260726T1622
    - bb7a6da [workbuddy] agent_state tip refresh
    - report: docs/growth/runs/20260726T161415Z-report.md
    - screenshots: docs/growth/screenshots/20260726T161415Z/
    Counts (18): submitted=1 (prior aitoolsdirectory only) · captcha=1 · login=3
    · paid_skip=6 · fail=4 · skipped=3
    preflight pikbo.ai=200
    PH pack refreshed; PRODUCTHUNT_TOKEN blocked_secret
    Secrets blocked: PIKBO_GROWTH_EMAIL / PASSWORD / PRODUCTHUNT_TOKEN
    Honest: pipeline works; net new backlinks this run ≈ 0 (walls + paid)
product_vs_hf:
  shipped_this_round:
    - "SITE_WATCH 写入 WB 报告（工程侧已 pull）"
    - "directories.json: paid_skip 标 free=false；加 startupfa/launched/saaspo 候选"
    - "Modules ModuleCard: Official·cached + Lab≥4 + Remake·your toy photo"
  gaps: |
    外链要出量：老板侧设 PIKBO_GROWTH_EMAIL（+可选密码）再让 WB 重跑 login/captcha。
    产品：HF multi-model 获客 vs 我们垂直 Remake 路径继续加压。
x_radar:
  - "AI directory lists 仍是 cold-start 标配；免费目录稀缺、大量变现墙 — 与 WB 数据一致"
  - "HF product-to-video 叙事不变 → Modules Remake CTA 对齐卖家 job"
next:
  grok: "继续 Generate/Home 密度；SITE_WATCH 跟 WB 下一轮"
  workbuddy: |
    pull main（吃 free=false 清洗 + 新 free 候选）→ 配 EMAIL 后 --all
    优先: awesomeaitools / dang-ai / aivalley / insidr / 新 free 三站
  boss_optional: "PIKBO_GROWTH_EMAIL 写入 WB 环境（非工程阻塞）"
  claude: "UI density"
  codex: "honest copy only"
```

---

## 2026-07-27 · ops cycle（Grok · SERP + X + Flow density ship）

```yaml
writer: grok-eng
main_tip: "pre-push · FlowMediaCard proof + Modules Photo→Clip (this cycle)"
production:
  health: "softLive true · ok · paid false · T6 blocked"
  home: 200
  create: 200
  tools_rank: 200
  effects: 200
  sitemap: 200
  domain: "https://pikbo.ai only"
google_seo:
  site_operator: |
    site:pikbo.ai 已被收录：home、/effects、/pricing、/community、/for、/modules、
    /create、/tools 及多条 /tools/* · /for/* 出现在 SERP 摘要中。
    最近抓取时间多在 2026-07-26（UTC 附近）——爬虫在访问 softLive。
  rank_anchor: |
    主词「AI toy video generator」查询：首页与 /tools 相关页可见；
    未改 TDH/H1。冷启动仍靠外链，不是再堆 URL。
  growth_runs: "none on main — WorkBuddy 仍无 [workbuddy] push"
product_vs_hf:
  shipped_this_round:
    - "FlowMediaCard: Official·cached + Lab≥4 + Remake·your toy photo（HF Flow 密度）"
    - "Modules CTAs: Photo→Clip + Seller Pack 高亮（product-to-video 诚实路径）"
  gaps: |
    HF 在推 multi-model free / Product-to-Video 场景合成 / Premiere 插件叙事。
    Pikbo 红线：多模型只 Soon 不假 live；我们强化「一玩具照片→配方 Remake」垂直路径。
    仍缺：真 UGC、云 Library、付费、T6 bake。
x_radar:
  - "HF Product-to-Video（产品图进场景）仍是内容创作者主话题 → 我们用 Seller Pack + Remake 对齐卖家 job，不抄场景库"
  - "HF 多模型免费获客话术常见 → Pikbo 保持 Seedance Mini softLive + Soon 诚实"
  - "用户在意 TOS/训练数据权属 → 持续强调 owned photo only（已有勾选路径，不扩假承诺）"
  - "Seedance 同模多平台比价讨论 → 产品差异靠潮玩垂直与 listing/unbox 工作流，不靠模型动物园"
next:
  grok: "下一刀 Generate/Home 密度或 fail 恢复；继续 SITE_WATCH"
  claude: "UI/IA 密度（Create 首屏 / Flow 矩阵）"
  codex: "诚实文案；不扩 URL"
  workbuddy: "必须跑 growth-auto 并 push runs（外链主线空转）"
```

---

## 2026-07-27 · seed（Grok · 多 Agent 作战架设）

```yaml
writer: grok-eng
main_tip: "38024e8 (pull for exact)"
production:
  health: "softLive true · ok · paid false · T6 blocked"
  home: 200
  tools_rank: 200
  sitemap: 200
  domain: "https://pikbo.ai only"
google_seo:
  note: |
    冷启动阶段：主词锚 /tools/ai-toy-video-generator；不擅自扩 SEO 内页、不改冻结 TDH。
    本轮未跑 site: 深度 SERP（架设观察文件）；下轮 Grok 应用 web 查 site:pikbo.ai 与主词印象。
    WorkBuddy：截至本条仍无 [workbuddy] 新 push / runs report → 外链主线空转风险。
product_vs_hf:
  shipped_recent:
    - "CD AfterPath job+SKU carry; Library remake SKU"
    - "Landing/Image SKU hydrate; PresetCard Official·Lab≥4"
    - "Seller Pack AfterPath intent.href deep-link fix"
  gaps_vs_hf: |
    壳约 55–65%：真 UGC 社区、云 Library、多模型 live（永不假）、付费未开。
    Generate 闭环与墙/Cinema 持续加压；密度与结果台恢复仍是主战场。
x_radar:
  - "待本轮执行 X 搜索：higgsfield 产品更新、designer toy AI video、listing/unbox 卖家痛点"
  - "结论占位：下轮填 3–7 条可行动要点 → 产品 backlog"
next:
  grok: "执行 GROK_SELF_OPS：X 雷达 + SERP 观察 + 1 个 HF 密度/闭环 ship"
  claude: "读 MULTI_AGENT_PLAYBOOK；UI/IA 密度（Create/Home）"
  codex: "诚实文案/元信息；不扩 URL"
  workbuddy: "Chrome growth-auto --all → push runs + AGENT_STATE"
```

---

## 模板（复制新开一条）

```yaml
writer: grok-eng | claude | codex
main_tip: "<sha>"
production:
  health: "softLive ? · degraded ?"
  home: 
  tools_rank:
  sitemap:
google_seo:
  site_operator: |
    site:pikbo.ai 印象 / 变化
  rank_anchor: "/tools/ai-toy-video-generator …"
  growth_runs: "path or none"
product_vs_hf:
  shipped_this_round: []
  gaps: |
    …
x_radar:
  - "…"
next:
  grok: ""
  claude: ""
  codex: ""
  workbuddy: ""
```
