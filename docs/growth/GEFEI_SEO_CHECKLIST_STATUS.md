# 哥飞式 SEO 自检 — pikbo.ai 现状与动作

**日期：** 2026-07-24（公网 soft live 后）  
**域：** https://pikbo.ai  
**原则：** TDH 1–4 周冻结 · 一词一页 · 页页带工具 · 诚实 demo

---

## 总表（对照清单 7 类）

| # | 类 | 状态 | 说明 |
|---|----|------|------|
| 1 | TDH 冻结 | ✅ | `lib/site.ts` title/description/homeH1 已冻结；首页 metadata 自引用 |
| 2 | 内页关键词覆盖 | ✅→加厚 | 原有 for/tools/effects/guides；**新增 5 个 /for 高意图页** |
| 3 | 结构化数据 | ✅ 补齐 | 首页 WebSite+Organization+SoftwareApplication+VideoObject；Create/for SoftwareApplication |
| 4 | 技术 SEO | ✅ | robots / sitemap / canonical / SSG generateStaticParams；管理路径 disallow |
| 5 | 速度 / CWV | ⚠️ 持续 | 墙视频 interaction 播放 + preload 节制；LCP 需 PSI 实测 |
| 6 | 外链 / 初始信任 | ❌ 老板动作 | 代码无法代提 GSC/导航站 — 见下方清单 |
| 7 | 内容与停留 | ✅ 软化 | 主 CTA 突出；次要入口改文字链；Lab proof 诚实标注 |

---

## 一、TDH（两周内别动）

| 字段 | 当前值 | 判定 |
|------|--------|------|
| Title | `Pikbo — AI Toy Video Generator \| Photo to Short Video` | ✅ 含核心词 |
| Description | 154 字 · who/what/CTA · Free Mini · no card | ✅ 140–160 带 |
| H1 | `Turn one toy photo into a short video` | ✅ 与 title 呼应，非纯品牌 |

**冻结规则：** 只改 `lib/site.ts` 且需老板明确批准。

---

## 二、一词一页（新增 / 已有）

### 新增（本轮）

| URL | 意图 |
|-----|------|
| `/for/photo-to-video-for-toys` | photo to video toys |
| `/for/action-figure-product-videos` | action figure product video |
| `/for/toy-photography-to-video` | toy photography → video |
| `/for/collectible-ai-video` | AI video for collectibles |
| `/for/designer-toy-marketing-videos` | designer toy marketing |

短别名 redirect：`/for/photo-to-video`、`/for/action-figure-video`、`/for/toy-photography`、`/for/collectibles` 等。

### 原有簇（仍有效）

- `/for/*` Etsy / TikTok Shop / Amazon / IG / Whatnot / Depop / blind-box brand  
- `/tools/*` 十余个工具意图页（页内 CTA → Create）  
- `/effects/*` 证明齐全的 recipe 页  
- `/guides/*` 长文指南  

每页：独立 TDH · H2/H3 · FAQ/HowTo JSON-LD · **页内 LandingToolPanel** · 300+ 词量级 body。

---

## 三、JSON-LD

| 表面 | 类型 |
|------|------|
| `/` | WebSite · Organization · SoftwareApplication · VideoObject×N |
| `/create` | SoftwareApplication |
| `/for/*` | FAQPage · HowTo · SoftwareApplication |
| `/effects/*` | FAQ · HowTo · SoftwareApplication（原有） |
| `/tools` | ItemList（`numberOfItems` === 条目数） |
| `/guides/*` | Article · FAQ |

验：https://search.google.com/test/rich-results · Schema Markup Validator

---

## 四、技术 SEO

| 项 | 状态 |
|----|------|
| SSR/SSG 意图页 | `generateStaticParams` on for/tools/effects/guides |
| canonical | 首页 + 各意图页 `alternates.canonical` |
| sitemap.xml | 自动 · 仅 proof / 静态可索引 URL |
| robots.txt | 挡 `/api` `/library` `/login` 等 |
| 图片 alt / video label | LandingResults + AutoPlayVideo label |

---

## 五、速度（待 PSI）

建议跑：

1. PageSpeed Insights：`https://pikbo.ai/`  
2. 同一工具：`https://pikbo.ai/create` 或 `/for/photo-to-video-for-toys`  

已做：非首屏 preload=none · 桌面墙 interaction 播放 · 并发 autoplay 预算。

---

## 六、外链 / 信任（老板本周 P0）

### Google Search Console

1. 属性：`https://pikbo.ai`  
2. 提交 sitemap：`https://pikbo.ai/sitemap.xml`  
3. 请求编入索引：首页 + `/for/photo-to-video-for-toys` + `/create`  

### 工具导航站（目标 10–20，先铺广度）

按「能提交就提交」：

1. There's An AI For That  
2. Futurepedia  
3. AI Tool Hunt  
4. Toolify  
5. Product Hunt（软上线帖，可后做）  
6. Hacker News Show HN（可选）  
7. Indie Hackers  
8. Dang.ai / Similar AI directories  
9. AlternativeTo（若适用）  
10. BetaList / Launching Next（可选）  
11. Reddit r/SideProject / r/artificial（守规矩）  
12. 中文：小众软件 / 独立开发者社群（按渠道规范）  

每条外链落地页优先：`/` 或 `/for/photo-to-video-for-toys` 或 `/create`。

---

## 七、内容与停留

- 3 秒读懂：H1 + SoftLaunchStrip + 主 CTA「Try free」  
- 主路径：上传照片 → 生成视频（Generate）  
- Proof：Lab 缓存 demo，标注 official / not customer UGC  
- 无假多模型、无假 UGC 墙  

---

## 代码本轮改动（实现清单）

- `lib/jsonLd.ts` · `components/JsonLd.tsx`  
- `app/page.tsx` — metadata canonical + JSON-LD  
- `app/create/page.tsx` — SoftwareApplication  
- `lib/usecases.ts` — 5 新页 + 别名 + Etsy body 加厚  
- `app/for/[slug]/page.tsx` — SoftwareApplication  
- `LandingResults` / `AutoPlayVideo` / `HomeViralWall` / `HfExploreHome` CTA  
- `app/tools/page.tsx` — ItemList helper  

---

## 不做（冷启动）

- 改 TDH 蹭词  
- 为单关键词买新域名  
- 假 UGC / 假评分 Schema  
- ItemList 条目数造假  
