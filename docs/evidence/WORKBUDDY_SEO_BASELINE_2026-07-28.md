# WorkBuddy SEO 基线 — pikbo.ai — 2026-07-28

**Agent:** WorkBuddy · **分支:** `agent/workbuddy/seo-baseline-2026-07-28` · **性质:** 只读基线，未请求收录、未改业务代码、未触生产。
**采集窗口:** 2026-07-28 02:53 – 03:47 (GMT+8) · **工具:** GSC（真实 Chrome + 登录态）、AITDK 浏览器扩展（SERP 注入数据）、Googlebot-UA curl 复测、Playwright CDP 截图。
**证据目录:** `docs/evidence/workbuddy-seo-baseline-2026-07-28/`（24 个文件：截图 PNG + 原始文本 JSON，均含时间戳）。

---

## 0. 一页结论

| 指标 | 数值 | 证据时间 | 证据 |
|---|---|---|---|
| 总点击（3 个月, Web） | **0** | 03:37:58 | gsc-01-performance.png |
| 总曝光（3 个月, Web） | **16** | 03:37:58 | gsc-01-performance.png |
| 平均 CTR | 0% | 03:37:58 | 同上 |
| 平均排名 | 4.1（样本极小，无统计意义） | 03:37:58 | 同上 |
| 已收录 | **30** 页（GSC 2026/7/24 数据） | 03:38:10 | gsc-02-index-pages.png |
| 未收录 | **67** 页（3 个原因） | 03:38:10 | 同上 |
| sitemap | /sitemap.xml 成功，**13 → 实测 7 URL**，0 视频被发现 | 03:38:21 / 03:46:50 | gsc-03-sitemaps.png |
| 视频增强 | 6 有效 / 0 无效 | 03:37:45 | gsc-00-overview.png |
| HTTPS | 11 良好 / 0 非 HTTPS | 03:39:06 | gsc-07-https.png |
| 外链 | GSC「正在处理数据，请过 1 天左右再来查看」 | 03:38:45 | gsc-05-links.png |
| CWw 核心网页指标 | 移动/桌面均无足够 CrUX 数据 | 03:38:55 | gsc-06-core-web-vitals.png |

**GSC 属性更正：** 有效属性是 URL 前缀 `https://pikbo.ai/`；`sc-domain:pikbo.ai` 无权限（02:53:39 实测「您无权访问此资源」）。后续 agent 请直接用 URL 前缀属性。

**结论（对齐 DISPATCH 红线）：** 曝光 16 / 点击 0，仍远低于可解释样本，**不得宣称任何排名成功**。当前站点处于「主动收录瘦身」过渡期（见 §3），GSC 收录数将回落，这是预期行为而非事故。

---

## 1. 效果（Performance, 3 个月, Web）

- 数据更新：GSC 显示「上次更新日期：5 小时前」（采集时刻 03:37:58 +08:00）。
- 仅 2 条查询有曝光：

| 查询 | 点击 | 曝光 |
|---|---|---|
| `"toy unboxing" -site:reddit.com …`（长布尔串，疑似某工具的自动查询） | 0 | 9 |
| `pikbo` | 0 | 3 |

- 判定：唯一「真人可信」查询是品牌词 `pikbo`（3 次曝光）。那条长布尔查询几乎不可能是自然用户，16 次曝光的真实有效样本更小。
- 复测：品牌 SERP `pikbo`（hl=en&gl=us, 03:44:28）首页第 1 位是 `pikbo.ai` 主页、第 2 位 `/create` —— 品牌词已可召回（serp-brand-pikbo.png）。
- 主词 SERP `ai toy video generator`（hl=en&gl=us, 03:44:37）：前两屏被 YouTube 教程 + AI Overview + GlobalGPT/App Store 占据，**pikbo.ai 在可见结果中完全未出现**（正文全文搜索 0 命中，serp-main-kw.png）。

## 2. 收录状态（Index Coverage, GSC 数据日期 2026/7/24）

30 已收录 / 67 未收录。未收录 3 个原因（gsc-02-index-pages.png, 03:38:10）：

| 原因 | 页数 | 明细样本（截图 + JSON） |
|---|---|---|
| 被 noindex 排除 | 3 | `/effects/melt-and-reform`、`/create?effect=paint-splash&…`、`/effects/collection-shelf-pan`（gsc-urls-noindex_3.png, 03:42:30） |
| 已发现 - 尚未编入索引 | 46 | `/apps`、`/explore`、`/effects/blind-box-unboxing` 等（gsc-urls-discovered_46.png, 03:42:45，前 10 行） |
| 已抓取 - 尚未编入索引 | 18 | `/effects/neon-city-night`、`/tools/toy-cgi-video-generator`、`/tools/toy-ugc-ad-generator` 等（gsc-urls-crawled_18.png, 03:43:00，前 10 行） |

已收录 30 页样本（gsc-urls-indexed_30.png, 03:43:15）：`/tools/ai-toy-video-generator`（主词页，确认在列）、`/tools/one-photo-product-video`、`/for/mercari-listing-videos`、`/projects/orbit-cgi` 等。

完整 URL 列表存 `gsc_url_lists.json`（GSC 界面每类仅展示分页样本，已按页面可见行数全部记录）。

## 3. 关键交叉发现：收录瘦身正在进行，GSC 数据滞后

对 GSC 名单逐页用 Googlebot-UA curl 复测服务端 HTML（03:45:20–03:47:13，两轮）：

**(a) sitemap 已收缩为 7 个 URL（GSC 7/27 读取时还是 13）**，全部可收录：

```
200 index,follow      https://pikbo.ai
200 无robots meta      /tools/ai-toy-video-generator   ← 主词页
200 无robots meta      /tools/blind-box-reveal-video-maker
200 无robots meta      /guides/how-to-photograph-toys-for-ai-video
200 index,follow      /pricing
200 index,follow      /privacy
200 index,follow      /terms                            (03:46:50 复测)
```

**(b) GSC「已收录 30」中的大部分页面现在实测是 `noindex, follow`**（03:47:13 复测，10 抽 8 中）：

```
noindex  /tools/one-photo-product-video      noindex  /projects/orbit-cgi
noindex  /toys/tabletop-miniatures           noindex  /tools/toy-social-content-pack
noindex  /tools/custom-toy-product-video     noindex  /for/mercari-listing-videos
noindex  /for/reddit-collector-showcase-videos  noindex  /tools/toy-launch-teaser-generator
可收录   /guides/how-to-photograph-toys-for-ai-video     可收录  /pricing
```

**(c) 「未收录」名单里的页面也同样是 noindex**（/explore、/apps、/effects/blind-box-unboxing、/tools/toy-ugc-ad-generator，03:45:39–03:46:27 浏览器 + curl 双确认）。

**解读：** 这与 main `c914eac`（AITDK Google-first SEO remediation, PR #31）的收录瘦身方向一致 —— 只保留 7 个核心页参与收录，长尾页 noindex。预期后果：GSC 已收录数将从 30 回落到 ≈7–11；「被 noindex 排除」将从 3 大幅上升。**这是设计行为，下轮基线不要误报为收录事故。**

## 4. 页面级技术复测（真实浏览器渲染后, 03:45:22–03:45:51）

| 页面 | robots | canonical | 结构化数据 | 复测结果 |
|---|---|---|---|---|
| `/`（首页） | index,follow | https://pikbo.ai | WebSite, Organization, SoftwareApplication, FAQPage | ✅ 正常；⚠️ 本机（zh locale 浏览器）H1 渲染为中文「你的潮玩。动起来。」。HANDOFF 称「新访客默认英文」——说明存在按 locale 切换；建议工程线确认 Googlebot（无 zh Accept-Language）拿到的是英文版且与 SERP 快照一致（本轮 SERP 快照标题为英文，方向正确） |
| `/tools/ai-toy-video-generator` | 无（可收录） | 自指 | FAQPage, SoftwareApplication, HowTo, **VideoObject** | ✅ 主词页健康，1 个视频 |
| `/effects/melt-and-reform` | noindex,follow | 自指 | FAQPage, HowTo, SoftwareApplication | ✅ 与 GSC noindex 判定一致 |
| `/explore` | noindex,follow | 自指 | ItemList, FAQPage | 一致（瘦身范围内） |
| `/apps` | noindex,follow | 自指 | ItemList, FAQPage | 一致 |

- robots.txt（03:45:20, 200）：Allow / + Disallow /api/ /profile /settings /library /login /auth/ /checkout /status /generate；Sitemap 声明正确。
- sitemap.xml（03:45:21, 200）：主词页含合法 `video:video` 结构（title/thumbnail/content_loc/duration/publication_date）；但 GSC sitemap 报告「已发现的视频 = 0」（7/27 读取），与站内视频标记存在落差，待 Google 下次读取后复查。

## 5. AITDK 数据

- `aitdk.com/website/pikbo.ai` 返回 404「Page not found」（03:44:06, aitdk-pikbo.png）——AITDK 网站库尚未收录该域。
- AITDK 浏览器扩展在 SERP 注入的数据（03:44:19, serp-site-pikbo.png）：**Monthly Visits: 0 · Avg. Visit Duration: 00:00:00 · Domain Created: 2026-07-21**。域龄 7 天，零第三方流量数据，符合新站冷启动事实。
- `site:pikbo.ai`（num=50）：Google 返回首页、/effects、/pricing、/community、/for、/modules、/create 等收录快照 —— 与 GSC 已收录 30 口径方向一致（部分是 noindex 生效前的旧快照）。

## 6. 阻塞与不可得项（只记录，未绕过）

| # | 阻塞 | 证据 | 需要谁 |
|---|---|---|---|
| B1 | `sc-domain:pikbo.ai` 属性无权限，只有 URL 前缀属性 `https://pikbo.ai/` | 02:53:39「您无权访问此资源」 | 老板（如需 domain 属性需 DNS 验证，受 GO 门禁） |
| B2 | GSC 外链报告「正在处理数据，请过 1 天左右再来查看」 | 03:38:45, gsc-05-links.png | 无 — 24h 后复采 |
| B3 | 视频专项报告 URL（video-indexing / video-unified）均 404，视频数据仅有概览「6 有效」 | 03:38:34, gsc-04-video-indexing.png | 无 — 该属性未开通独立视频报告 |
| B4 | CWV 无 CrUX 数据（流量不足） | 03:38:55 | 无 — 只能等流量 |
| B5 | AITDK 网站版无该域数据（404） | 03:44:06 | 无 — 域龄 7 天，正常 |
| B6 | GSC 收录数据日期停在 2026/7/24，与 7/27–7/28 部署的 noindex 瘦身之间有 3–4 天滞后 | §3 交叉复测 | 无 — 下轮基线复测 |

## 7. 给下一轮的复测清单（仍然只读）

1. 24h 后重采外链报告（B2）。
2. GSC 收录数回落到 ≈7–11 即证明瘦身生效；若 46 条「已发现未收录」不降，检查内链是否仍指向 noindex 页浪费抓取。
3. sitemap「已发现的视频」是否从 0 变 1（主词页 video sitemap 生效判定）。
4. 首页 H1 语言与目标市场（英文 SERP）的一致性问题，交工程线评估（本轮不改代码）。
5. 品牌词 `pikbo` 曝光是否突破个位数；主词页是否开始出现非品牌曝光。

---

*本报告由 WorkBuddy 生成。全程只读：未请求收录、未修改业务代码、未读取生产密钥、未触碰数据库/Vercel/Supabase/Stripe、未部署、未推 main。*
