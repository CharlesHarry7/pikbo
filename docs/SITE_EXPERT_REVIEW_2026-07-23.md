# 专家视角审站 · Pikbo（2026-07-23）

**对象：** 本机 softLive 站（`localhost:3000` · `live-generate` · 无 Stripe）  
**仓库：** https://github.com/CharlesHarry7/pikbo
**方法：** 竞品优先（HF 类）+ 哥飞 SEO（辅）+ Namya/AIDA 转化（辅）  
**目标：** 周日 soft 上线前，老板能看懂「专家会挑什么」  

---

## 1. 请了哪些「专家镜头」（不是真人外包）

| 镜头 | 代表 | 看什么 |
|------|------|--------|
| **竞品站** | Higgsfield 类 | 市场已验证的模块：视频墙、Generate、积分、预设 |
| **哥飞** | SEO/工具站 | 关键词内页、一页完成工作、一个域名养内页 |
| **Namya / 转化** | SaaS 落地 | 谁·问题·结果、CTA 动作、信任 |
| **工程审站 API** | PageSpeed / Lighthouse | 速度与基础 SEO 技术分（需公网 URL） |

说明：无法代替真人顾问付费诊断；这是 **按大神框架 + 实站对照** 的专业审。

---

## 2. 竞品 parity 记分卡（vs HF 类）

| 模块 | HF 类 | Pikbo | 分 | 说明 |
|------|-------|-------|----|------|
| 进站满屏可播视频 | 强 | 强 | **8/10** | 视频墙/横滑有，密度够 soft |
| 一点进 Generate | 强 | 强 | **8/10** | 导航 + CTA 清晰 |
| 预设/病毒墙 | 强 | 中强 | **7/10** | 有；部分 Concept 共用片 |
| 社区真 UGC | 强 | 弱 | **3/10** | 官方 Lab，不是真用户（诚实） |
| 多模型货架 | 强 | 弱/诚实 | **5/10** | 只真 Seedance；不装 Kling |
| Library | 云 | 本机 | **5/10** | soft 可接受，须写清 |
| Pricing 诚实 | 中 | 强 | **8/10** | 1/5/15 + Coming soon |
| 真出片水管 | 有 | 有 | **8/10** | fal Mini live 已通 |
| SEO 工具页 | 中 | 中 | **6/10** | effects/for 有；内容待养 |

**总评（产品形态）：** 已是 **AI 工具 App 壳**，不是空落地页。适合 soft 上线验证。

---

## 3. 哥飞镜头（人话）

| 哥飞点 | 我们 | 专家会说 |
|--------|------|----------|
| 一域名 + 内页 | pikbo.ai + effects/for/toys | ✅ 方向对 |
| 工具页能完成工作 | effects 可进 Create | ✅ 骨架对；文案再「搜索语言」化 |
| 先上站再完美 | soft · 无 Stripe | ✅ 符合 |
| 判词再开新站 | 不新买词域 | ✅ 正确 |
| 养内容 | Lab 片有限 | ⚠️ soft 后每周加厚 Top10 内页 |

---

## 4. 转化镜头（Namya / AIDA）

| 项 | 现状 | P0 建议 |
|----|------|---------|
| 谁·问题·结果 | 有 Mini trial / 玩具图→片 | 首屏再短一句英文 ICP |
| 先看结果 | 视频墙强 | 保持，别改成博客首页 |
| CTA | Generate / Try Mini | 统一动词，少 Pricing 抢主 CTA |
| 信任 | Lab 标签、退积分 | 加「toys you own」所有权一句（Create 已有 gate） |
| 付费 | Coming soon | ✅ soft 正确；别开假支付 |

---

## 5. 钱路径缺口（P0 上线前）

1. **公网部署** — Vercel + `SESSION_SECRET` + `FAL_KEY` + 域名（老板）  
2. **Create preflight 必须一眼懂** demo vs live（代码已大量对齐 PRD，需真机点一遍）  
3. **付费 Coming soon** — 已做；生产勿开 `NEXT_PUBLIC_PAYMENTS_ENABLED`  
4. **3 张真玩具图手测** + 故意失败看退分  

**P1（周日后）：** 真 UGC、登录积分、硬水印、卖家三件套实现。

---

## 6. 可用的「审站 / 数据」API（你要的 API）

> **完整清单 + curl + 流水线：** [`docs/SITE_AUDIT_APIS.md`](./SITE_AUDIT_APIS.md)  
> **真相：** 哥飞/Namya 等大神 **没有**「专家审站 API」；他们用的是下面这些公开接口。

### A. 网站体检（公网 URL 上线后立刻用）

| API / 工具 | 用途 | 链接 |
|------------|------|------|
| **PageSpeed Insights API** | 移动/桌面速度、LCP、SEO 基础分 | https://developers.google.com/speed/docs/insights/v5/get-started |
| **PageSpeed 网页版** | 不用写代码，贴 URL 分析 | https://pagespeed.web.dev/ |
| **Lighthouse（本地）** | `npx lighthouse https://pikbo.ai --view` | Chrome DevTools |
| **Google Search Console** | 索引、搜索词（哥飞后半程） | https://search.google.com/search-console |
| **Ahrefs Webmaster Tools** | 哥飞最爱：自有站 Site Audit 170+ | https://ahrefs.com/webmaster-tools |
| **DataForSEO On-Page** | 程序化全站 SEO 审计 API | https://dataforseo.com/apis/on-page-api |
| **GTmetrix API** | 性能瀑布 + Lighthouse | https://gtmetrix.com/api/docs/2.0/ |

脚本：`scripts/audit-pagespeed.sh`（需 `PSI_API_KEY` + 公网 URL）

公网未上时：**PSI 扫不了 localhost**；可用本地 Lighthouse（见 SITE_AUDIT_APIS）。

### B. 产品出片相关 API（已用 / 可选）

| API | 状态 | 用途 |
|-----|------|------|
| **fal Seedance Mini/Fast/2.0** | ✅ 已接 | 图→片主水管 |
| **fal Flux** | ✅ 已接 | 静图 |
| Stripe Checkout / Webhook | 代码有，**周日不用** | 以后订阅 |
| OpenRouter / 其他视频模型 | 未接 | 多模型以后再诚实加 |

### C. 建站/SEO 辅助（哥飞生态常见）

| 工具 | 用途 |
|------|------|
| Ahrefs / Similarweb | 判词、竞品流量（付费） |
| 哥飞社群 / 工具箱 | 流程与案例（人工） |
| 本仓库 `docs/growth/SEO_PRIORITY.md` | 优先 10 个内页 |

---

## 7. 真人专家怎么找（若要付费问诊）

| 方向 | 找谁 | 怎么问 |
|------|------|--------|
| 出海 SEO | 哥飞系社群、做工具站的 builder | 「一个域名、AI 图生视频、潮玩垂直，内页矩阵怎么排」 |
| SaaS 转化 | 做过 AI 工具付费的独立开发者 | 「soft 免费试玩 → 付费，首屏与 Pricing 怎么写」 |
| 产品形态 | 对标 HF 的产品经理 | 「视频墙 App 壳 vs 落地页，冷启动选哪个」 |

**不建议：** 花大价钱做品牌站/宣传片站；你现在要的是 **工具能用**。

---

## 8. 给老板的一句话

> 建站专家会说：形态已经像能赚钱的 AI 工具站，不是空壳；  
> 周日可以 soft 上；先不要 Stripe；上线后用 **PageSpeed API + 真人试玩** 继续抠。  
> 最大风险不是「不像 HF」，而是 **公网还没挂上去、真人还没跑通一次**。
