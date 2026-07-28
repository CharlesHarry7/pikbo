# WorkBuddy 历史公开外链审计报告（合并版）

**日期：** 2026-07-28  
**来源：** docs/growth/DIRECTORY_LOG.md + 2026-07-25 至 2026-07-27 全部提交记录  
**方法：** 逐站点搜索 `pikbo`（站内搜索 + Google site: 搜索）  
**权限：** 只读；未绕过登录/验证码/付费墙

---

## 审计结果：全部 9 处历史提交

| # | 站 | 提交日期 | 审计结果 | 公开 listing | 可抓取 backlink | 证据 |
|---|---|---|---|---|---|---|
| 1 | aitoolsdirectory.com | 2026-07-25 | **not_found** | ✗ | ✗ | 站内搜 `?s=pikbo` 无结果 |
| 2 | appsandwebsites.com | 2026-07-25 | **not_found** | ✗ | ✗ | 站内搜 `?s=pikbo` → "No posts found!" |
| 3 | aisuperhub.io | 2026-07-25 | **not_found** | ✗ | ✗ | `/ai-tools` 目录全量浏览 + `?s=pikbo` 均无 |
| 4 | library.phygital.plus | 2026-07-25 | **not_found** | ✗ | ✗ | 站内搜 `?s=pikbo` 返回 "AI Library" 空白页 |
| 5 | infrabase.ai | 2026-07-25 | **not_found** | ✗ | ✗ | AI 基础设施目录（向量DB/推理API），品类不匹配；搜 `?s=pikbo` 无结果 |
| 6 | insidr.ai | 2026-07-25 (重跑) | **not_found** | ✗ | ✗ | 搜索标题存在但 `/ai-tools/pikbo/` → 404 |
| 7 | freeaio.com | 2026-07-25 (重跑) | **not_found** | ✗ | ✗ | "Search results for: pikbo" — 零命中 |
| 8 | ai-hunter.io | 2026-07-27 | **site_error** | ✗ | ✗ | WordPress 致命错误 — 网站宕机 |
| 9 | aimarketing.directory | 2026-07-27 (Tally) | **not_found** | ✗ | ✗ | 目录首页；无 Pikbo listing；Tally 表单提交不触发后端收录 |

---

## 汇总

| 指标 | 数量 |
|------|------|
| 审计总数 | **9** |
| **published**（公开 listing 可访问） | **0** |
| **not_found**（提交后未发布/被拒/待审） | **8** |
| **site_error**（网站不可用） | **1** |
| **verified_backlink**（可抓取 Pikbo 链接） | **0** |

---

## 根因分析

1. **PIKBO_GROWTH_EMAIL 未设置**：多个目录提交表单 email 字段留空或使用无效值，可能导致目录自动过滤/标记为 spam。
2. **品类不匹配**：泛 AI 目录（infrabase.ai、library.phygital.plus 等）收录范围与潮玩 AI 视频工具不重叠，即使通过审核也极难产生有效流量或 backlink。
3. **第三方表单提交 vs. 目录后端收录**：`aimarketing.directory` 等提交通过 Tally iframe 表单，不一定触发目录管理后台的实际收录流程。
4. **人工审核周期**：部分免费目录需要 1–4 周人工审核。2026-07-25 的提交距审计仅 3 天，时间不足是可能因素，但结合品类不匹配，预期通过率仍极低。
5. **网站宕机**：`ai-hunter.io` 当前 WordPress 致命错误，提交记录不可验证，也不产生任何 backlink。

---

## 决策记录

- **暂停泛 AI 目录自动提交**（已执行：WQ-2026-07-27-08 paused）。
- **恢复条件**：需老板批准限定潮玩/收藏品/电商卖家相关的目录清单，且 `PIKBO_GROWTH_EMAIL` 配置正确后。
- **未来核验时机**：5 个 2026-07-25 提交的站点可于 2026-08-08 以后重新核验（提交后 2 周）。
- **已产出潮玩垂直外链机会报告**：`docs/growth/runs/TOY_VERTICAL_LINK_OPPORTUNITIES_2026-07-28.md`（23 个真实目标，PR #46 已关闭为重复；仅供后续参考）。

---

## 边界遵守

- 未提交新的泛 AI 目录 ✅
- 未把 submitted/pending 计为 backlink ✅
- 未绕过登录、验证码或付费墙 ✅
- 未使用生产密钥、未改业务代码、未操作数据库 ✅
- 未新建分支或 PR（在已有 PR #41 上工作） ✅
