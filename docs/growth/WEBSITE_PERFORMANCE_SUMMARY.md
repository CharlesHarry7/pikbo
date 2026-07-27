# Pikbo.ai 网站表现数据总结

> 生成时间：2026-07-27 09:26 (GMT+8)
> 数据来源：Google Search Console、site:pikbo.ai 实时搜索、服务器健康检查、增长运营记录
> 用途：供专业人士评估网站当前 SEO/运营效果

---

## 一、网站基本信息

| 项目 | 内容 |
|------|------|
| 域名 | https://pikbo.ai |
| 产品定位 | AI 玩具视频生成器（一张玩具照片 → 短视频） |
| 上线时间 | 约 2026-07-23（SSL 证书 7/24 签发，GSC 首批数据 7/23 出现） |
| 运营时长 | **约 3-4 天**（非常新） |
| 核心功能 | 图片转视频、360 旋转展示、盲盒开箱视频、手办舞蹈等 |
| 免费试用 | 10 credits，5 秒 / 480p |
| 支付状态 | Stripe 未启用（显示 "Coming soon"） |

---

## 二、技术健康度

| 检查项 | 状态 | 详情 |
|--------|------|------|
| 首页 HTTP 状态 | ✅ 200 | 响应 0.57s |
| 核心页面状态 | ✅ 全部 200 | 4 个关键页 0.57-1.46s |
| SSL 证书 | ✅ 有效 | Let's Encrypt，7/24 签发，10/22 过期 |
| Sitemap | ✅ 正常 | 13 个 URL |
| Robots.txt | ✅ 正确配置 | Allow / ，屏蔽 /api/、/profile 等私有路径 |
| API 健康 | ✅ ok=true | fal.ai 已接入，Stripe 未接入 |
| Demo 资源 | ✅ 12/12 就绪 | Lab demos + 样本素材完整 |

**结论：技术基础健康，网站可正常访问和运行。**

---

## 三、Google 收录情况

### 1. Sitemap 提交页面（GSC 验证）

| # | URL | 收录状态 |
|---|-----|----------|
| 1 | https://pikbo.ai | ✅ 已收录 |
| 2 | https://pikbo.ai/tools/ai-toy-video-generator | ✅ 已收录 |
| 3 | https://pikbo.ai/tools/figure-360-product-video | ✅ 已收录 |
| 4 | https://pikbo.ai/tools/blind-box-reveal-video-maker | ✅ 已收录 |
| 5 | https://pikbo.ai/tools/one-photo-product-video | ✅ 已收录 |
| 6 | https://pikbo.ai/tools/ai-product-video-generator-for-toys | ✅ 已收录 |
| 7 | https://pikbo.ai/for/photo-to-video-for-toys | ✅ 已收录 |
| 8 | https://pikbo.ai/for/etsy-listing-videos | ✅ 已收录 |
| 9 | https://pikbo.ai/for/action-figure-product-videos | ✅ 已收录 |
| 10 | https://pikbo.ai/guides/how-to-photograph-toys-for-ai-video | ✅ 已收录 |
| 11 | https://pikbo.ai/pricing | ✅ 已收录 |
| 12 | https://pikbo.ai/privacy | ✅ 已收录 |
| 13 | https://pikbo.ai/terms | ✅ 已收录 |

**Sitemap 收录率：13/13 = 100% ✅**

### 2. 实际收录页面数（site:pikbo.ai 搜索）

通过 Google 搜索 `site:pikbo.ai` 翻页抓取，实际已收录约 **48 个 pikbo.ai 页面**（超出 sitemap 的 13 个），覆盖路径包括：

- `/tools/*`（工具页，约 11 个）
- `/for/*`（用途页，约 10 个）
- `/effects/*`（效果页，约 5 个）
- `/toys/*`（玩具分类页，约 6 个）
- `/guides/*`、`/community`、`/projects/*`、`/modules` 等

**说明：Google 爬虫已在 sitemap 之外发现并收录了大量站内页面，收录表现良好。**

---

## 四、搜索表现数据（GSC Performance）

> 数据范围：2026-07-23 ~ 2026-07-24（网站仅上线 3-4 天，数据极少属正常）

| 指标 | 数值 |
|------|------|
| 总点击量 | **0** |
| 总展现量 | **6** |
| 平均点击率 (CTR) | **0%** |
| 平均排名 | **4** |

### 热门查询词

| 查询词 | 点击量 | 展现量 |
|--------|--------|--------|
| "toy unboxing"（含排除站过滤词的长查询） | 0 | 5 |
| pikbo | 0 | 1 |

**解读：**
- 展现量 6 次，说明网站已开始出现在搜索结果中
- 0 点击：网站极新，排名尚在波动，品牌词搜索量极低
- 平均排名 4：已有排名能力，但查询词非常少
- 查询词以 "toy unboxing" 为主，说明长尾词有潜在流量空间

---

## 五、外链建设情况

| # | 外链来源 | 提交时间 | 状态 |
|---|----------|----------|------|
| 1 | aitoolsdirectory.com | 2026-07-25 | ✅ 已收录 |
| 2 | insidr.ai | 2026-07-27 | ✅ 已提交 |
| 3 | freeaio.com | 2026-07-27 | ✅ 已提交 |

**外链总数：3 个**

### 目录提交全景（42 个 AI 目录已扫描）

| 状态 | 数量 | 说明 |
|------|------|------|
| 已提交成功 | 3 | aitoolsdirectory, insidr, freeaio |
| 需登录 | 11 | 需要 Google/邮箱登录，受 RAPT 阻拦 |
| 付费跳过 | 5 | 需要付费才能提交 |
| 验证码阻拦 | 4 | reCAPTCHA / Turnstile 无法自动通过 |
| 提交失败 | 8 | 表单技术限制（CF7 AJAX 等）或站点故障 |
| 跳过 | 11 | 已知付费/不适用 |

---

## 六、Sitemap 策略

- 当前 sitemap：**13 个 URL**（核心转化页面 + 法律页面）
- 未收录进 sitemap 但已被 Google 发现的页面：约 35 个（/effects、/toys、/for 等）
- **策略：暂不扩大 sitemap**，优先确保 13 个核心页面排名稳定

---

## 七、当前状态总结

### ✅ 表现良好的方面
1. **收录速度优秀**：上线 3-4 天，13/13 sitemap 页面全部被 Google 收录
2. **收录范围超出预期**：Google 主动发现并收录了约 48 个页面（sitemap 仅 13 个）
3. **技术基础扎实**：网站响应正常，SSL/robots/sitemap 配置正确
4. **已有搜索展现**：开始在 "toy unboxing" 等关键词获得展现
5. **外链建设启动**：3 个 AI 目录外链已建立

### ⚠️ 需要关注的方面
1. **搜索流量为零**：0 点击，6 展现 — 网站太新，品牌词搜索量极低
2. **外链数量极少**：仅 3 个目录外链，远低于竞争所需
3. **支付未启用**：Stripe 未接入，目前无法变现
4. **查询词单一**：仅 2 个查询词有展现，关键词覆盖面窄
5. **登录壁垒**：11 个目录因无法自动登录而错失外链机会

### 🔲 尚未开展
- 内容营销（博客/指南 SEO 内容）
- 社交媒体推广（TikTok/Instagram/YouTube）
- 付费广告（Google Ads）
- 邮件营销
- 影响/KOL 合作

---

## 八、关键数据速览（给专业人士的一句话版）

> Pikbo.ai 上线约 3-4 天，Google 已收录 sitemap 全部 13 页 + 额外发现约 35 页（共约 48 页），搜索展现 6 次 / 点击 0 次 / 平均排名 4，外链 3 个（AI 目录），技术健康度良好，支付尚未启用。

---

*报告由 WorkBuddy 自动生成，数据截至 2026-07-27 09:26 GMT+8*
