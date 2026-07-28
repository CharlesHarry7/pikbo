# 免费目录提交日志（哥飞养站 · 不付费）

**状态口径：**

- `submitted`：表单已发送，未确认审核结果；
- `pending`：站点明确提示审核中；
- `published`：公开 listing URL 可访问；
- `verified_backlink`：公开 listing 含可抓取的 Pikbo 链接并已复查。

提交不等于发布，发布不一定等于 backlink。2026-07-27 起暂停泛 AI
目录自动提交，优先核验历史公开 URL。

**统一资料：** Pikbo · https://pikbo.ai · Free trial / Freemium · guochao950518@gmail.com  

---

## 2026-07-25（WorkBuddy）— 5 次表单提交（历史）

| # | 站 | 提交状态 | 公开 listing URL | backlink 状态 |
|---|-----|------|------|------|
| 1 | aitoolsdirectory.com | submitted | — | 未验证 |
| 2 | appsandwebsites.com | submitted | — | 未验证 |
| 3 | aisuperhub.io | submitted | — | 未验证 |
| 4 | library.phygital.plus | submitted | — | 未验证 |
| 5 | infrabase.ai | submitted | — | 未验证 |

**跳过：** 付费 10 · 需登录 10 · 404/SSL/崩 17 · 其它 6  

**本周表单提交：** 5；**published：0 已验证；verified_backlink：0**

---

## 2026-07-28 backlink 审计（WorkBuddy · 合并版）

核验全部 9 处历史提交，结果：**0/9 published，0/9 verified_backlink**。

| # | 站 | 提交日期 | 审计结果 | 公开 listing | backlink |
|---|-----|---------|:---:|:---:|
| 1 | aitoolsdirectory.com | 2026-07-25 | 搜索无结果 | ✗ | ✗ |
| 2 | appsandwebsites.com | 2026-07-25 | "No posts found" | ✗ | ✗ |
| 3 | aisuperhub.io | 2026-07-25 | 首页无 listing | ✗ | ✗ |
| 4 | library.phygital.plus | 2026-07-25 | 空页面 | ✗ | ✗ |
| 5 | infrabase.ai | 2026-07-25 | 品类不匹配，无 listing | ✗ | ✗ |
| 6 | insidr.ai | 2026-07-25 (重跑) | /ai-tools/pikbo/ → 404 | ✗ | ✗ |
| 7 | freeaio.com | 2026-07-25 (重跑) | 搜索零命中 | ✗ | ✗ |
| 8 | ai-hunter.io | 2026-07-27 | WordPress 致命错误，站点宕机 | ✗ | ✗ |
| 9 | aimarketing.directory | 2026-07-27 (Tally) | Tally 表单提交，目录无 listing | ✗ | ✗ |

**审计报告：** `docs/evidence/WORKBUDDY_LISTING_VERIFICATION_2026-07-28.md`

**根因：** PIKBO_GROWTH_EMAIL 未设置导致表单信息不完整；泛 AI 目录与潮玩品类不匹配。

**决策：** 暂停泛 AI 目录提交（WQ-2026-07-27-08 paused）。恢复需老板批准限定潮玩目录 + PIKBO_GROWTH_EMAIL 配置。
