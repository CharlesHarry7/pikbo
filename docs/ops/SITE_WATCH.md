# Site Watch — 谷歌 · 生产 · 产品 · X 雷达

Grok 主写（见 `docs/prompts/GROK_SELF_OPS.md`）。Claude/Codex 可补产品体感。  
**Newest first。** 每条观察带 UTC 时间 + main tip。

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
