# Backlink Audit Report — 2026-07-28

**Writer:** workbuddy  
**Branch:** `agent/workbuddy/backlink-audit`  
**Audit time:** 2026-07-28T03:30:00Z (Beijing 11:30)  

## Scope

核验全部 9 处历史提交记录，确认是否产生公开 listing 或可爬取 backlink。

---

## Verification Results

| # | Site | Submission Date | Search Method | URL Checked | public_listing | backlink | Notes |
|---|------|----------------|---------------|-------------|:---:|:---:|-------|
| 1 | aitoolsdirectory.com | 2026-07-25 | site search `?s=pikbo` | https://aitoolsdirectory.com/?s=pikbo | **not_found** | **not_found** | Search returned generic homepage; no Pikbo listing in results |
| 2 | appsandwebsites.com | 2026-07-25 | site search `?s=pikbo` | https://www.appsandwebsites.com/?s=pikbo | **not_found** | **not_found** | "No posts found!" |
| 3 | aisuperhub.io | 2026-07-25 | site search `?s=pikbo` | https://aisuperhub.io/?s=pikbo | **not_found** | **not_found** | Generic homepage; /ai-tools/ directory browsed — no Pikbo |
| 4 | library.phygital.plus | 2026-07-25 | site search `?s=pikbo` | https://library.phygital.plus/?s=pikbo | **not_found** | **not_found** | Returns "AI Library" blank page |
| 5 | infrabase.ai | 2026-07-25 | site search `?s=pikbo` | https://infrabase.ai/?s=pikbo | **not_found** | **not_found** | AI infra directory — Pikbo not relevant; no listing found |
| 6 | insidr.ai | 2026-07-25 (rerun) | site search `?s=pikbo` | https://www.insidr.ai/?s=pikbo | **not_found** | **not_found** | Search title resolves but /ai-tools/pikbo/ → 404 |
| 7 | freeaio.com | 2026-07-25 (rerun) | site search `?s=pikbo` | https://freeaio.com/?s=pikbo | **not_found** | **not_found** | "Search results for: pikbo" — zero hits |
| 8 | ai-hunter.io | 2026-07-27 | site search + direct | https://ai-hunter.io/?s=pikbo | **site_error** | **site_error** | WordPress critical error — site is down |
| 9 | aimarketing.directory | 2026-07-27 (manual Tally) | site search `?s=pikbo` | https://www.aimarketing.directory/?s=pikbo | **not_found** | **not_found** | Directory home page; no Pikbo listing |

---

## Summary

| Metric | Count |
|--------|-------|
| Total submissions audited | 9 |
| **published** (公开 listing 可访问) | **0** |
| **not_found** (提交后未发布/被拒/待审) | 8 |
| **site_error** (网站不可用) | 1 |
| **verified_backlink** (可爬取 Pikbo 链接) | **0** |

---

## Root Cause Analysis

1. **No PIKBO_GROWTH_EMAIL set**: 多个目录提交表单 email 字段留空或使用无效值，可能导致自动过滤/标记为 spam。
2. **Manual/Tally form submissions**: `aimarketing.directory` 和 `nextgentools.me` 提交通过第三方 iframe 表单（Tally），不一定触发目录后端收录。
3. **Moderation delay**: 部分目录需要人工审核，可能在数天到数周后才发布。但给定距离首次提交已超过 72 小时，0/9 发布率说明提交质量或审核通过率有问题。
4. **Niche mismatch**: 若干目录（infrabase.ai, library.phygital.plus）与 AI 视频生成器品类不匹配，即使通过审核也不太可能产生有效 referral。
5. **Site down**: `ai-hunter.io` 当前 WordPress 致命错误，提交记录无法验证也不产生 backlink。

---

## Recommendation

- **暂停泛 AI 目录自动提交**（已执行：WQ-2026-07-27-08 paused）。
- **恢复条件**：老板批准限定潮玩/收藏品/电商卖家相关目录清单后，且 `PIKBO_GROWTH_EMAIL` 已配置。
- **替代方向**：潮玩垂直社群（Reddit r/vinyltoys、Discord 设计师玩具社区）天然关联，backlink 质量高于泛目录。
- **审计节奏**：2 周后对 `submitted` 状态条目重新扫描，检查是否有延迟发布。

---

## Deliverables

- Report: `docs/growth/runs/BACKLINK-AUDIT-20260728-report.md`
- Updated: `docs/growth/DIRECTORY_LOG.md` (backlink status updated)
- Updated: `docs/growth/WORK_QUEUE.md` (WQ-2026-07-27-11 → done, WQ-2026-07-28-12 → done)
