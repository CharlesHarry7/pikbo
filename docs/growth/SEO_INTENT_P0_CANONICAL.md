# SEO Intent P0 — 一词一页 · Canonical · 301

**Branch:** `agent/grok/seo-intent-p0`  
**Date:** 2026-07-26  
**Rule:** 不新增重复意图页；别名只 301 到已有 canonical。

---

## Sitemap 真相（冷启动）

| 项 | 值 |
|---|---|
| **Sitemap URL 数** | **9**（不是 94） |
| 来源 | `lib/seoIndex.ts` → `COLD_START_INDEX_PATHS` → `app/sitemap.ts` |

### 当前 9 个可索引 URL

1. `/`
2. `/tools/ai-toy-video-generator` ← **主词页**
3. `/for/photo-to-video-for-toys`
4. `/for/etsy-listing-videos`
5. `/guides/how-to-photograph-toys-for-ai-video`
6. `/explore`
7. `/pricing`
8. `/privacy`
9. `/terms`

其余 `/for/*` `/tools/*` `/effects/*` `/toys/*` 等可达但 **noindex**（无独立输入/输出样片或非白名单），**不进 sitemap**。

---

## 主词页（不得改 Title / H1 / canonical）

| 字段 | 值 |
|---|---|
| Path | `/tools/ai-toy-video-generator` |
| Title | `AI Toy Video Generator from One Photo \| Pikbo` |
| H1 | `AI Toy Video Generator — Photo to Short Video for Designer Toys` |
| Canonical | `/tools/ai-toy-video-generator` |

**本轮 UI（可改）：**

- 首屏补充：*Upload a photo of a collectible you own—not a selfie—and turn it into a short video draft for listings and social.*
- 三步 **Photo → Recipe → Video draft** 紧贴页内工具
- HowTo JSON-LD 仅在三步真实渲染时输出；保留既有 FAQPage + SoftwareApplication（不重复第二套）

---

## 关键词冲突审计（三页）

| Path | Canonical 职责 | 主关键词簇 | robots / sitemap |
|---|---|---|---|
| `/for/action-figure-product-videos` | 关节手办 **listing / product** 运动片 | action figure product/listing video | noindex（冷启动非白名单） |
| `/tools/blind-box-reveal-video-maker` | **单次 pull/reveal 工具** | blind box reveal video maker | noindex |
| `/for/blind-box-brand-marketing` | **品牌 drop / 营销战役** | blind box brand marketing / drop teaser | noindex |

### 意图区分（原创潮玩素材 · 禁用 IP 名）

- **禁止在意图页作为目标词或样例：** Marvel、Star Wars、Gundam、POP MART、Bearbrick、Sonny Angel、KAWS。
- 文案只谈：原创设计师玩具、indie blind-box、rights-owned figures、collectible photo（非 selfie）。

### 301 / 别名（一词一页）

| Source（别名） | Destination（唯一 canonical） |
|---|---|
| `/for/action-figure-video-generator` | `/for/action-figure-product-videos` |
| `/for/action-figure-product-video` | `/for/action-figure-product-videos` |
| `/for/action-figure-video` · `/for/action-figures` | `/for/action-figure-product-videos` |
| `/for/blind-box-video-generator` | `/for/blind-box-brand-marketing` |
| `/for/blind-box-drop-videos` · `/for/blind-box-marketing` · `/for/blind-box` | `/for/blind-box-brand-marketing` |
| `/for/blind-box-reveal` | `/tools/blind-box-reveal-video-maker` |
| `/for/toy-unboxing-video-generator` | `/tools/blind-box-reveal-video-maker` |
| `/for/blind-box-unboxing-video` | `/tools/blind-box-reveal-video-maker` |

实现：`next.config.ts` redirects + `FOR_SLUG_ALIASES`（同段 `/for/[slug]` 内 redirect）。

**禁止：** 为 SEO_INTENT_50 再生成第二套 `/for/*` 页面。

---

## Schema 规则

| 类型 | 规则 |
|---|---|
| FAQPage | 保留既有；不重复添加第二份 |
| SoftwareApplication | 保留既有；不重复 |
| HowTo | **仅当**页面渲染 `LandingHowItWorks`（Photo→Recipe→Video draft）且页内有工具 |

---

## 验收

- 主词 Title/H1/canonical 未改
- 首屏 collectible 句 + 三步近工具
- 三页关键词不互抢
- sitemap = 9
- lint · typecheck · build · link-check
