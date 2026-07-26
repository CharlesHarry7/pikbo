# Agent Bus — Grok 工程 ↔ WorkBuddy 增长（老板不传话）

**单一事实源 = GitHub `main`。** 老板不负责在 agent 之间转发进度。

| 角色 | 仓库职责 |
|------|----------|
| **Grok（工程）** | 产品 / Generate 闭环 / 诚实度；写 `docs/HANDOFF.md`、推 `main` |
| **WorkBuddy（增长）** | 外链 / 目录 / PH 素材 / GSC 快照；写 `docs/growth/**`、可推 `agent/workbuddy/*` 或 `main`（仅 growth 文件） |

## 仓库

- Primary remote（常见）: `https://github.com/guochao950518-wq/pikbo.git`
- 可能 redirected 至: `https://github.com/CharlesHarry7/pikbo.git`
- 权威域名: **https://pikbo.ai**（禁止提交 pikbo.com）

## 每次开工前（双方强制）

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git log -15 --oneline
# 读：
#   docs/HANDOFF.md          （工程最近交付）
#   docs/growth/AGENT_BUS.md （本协议）
#   docs/growth/AGENT_STATE.md （对方最新状态，若存在）
#   docs/growth/runs/*-report.md （最近增长报告）
#   lib/site.ts / lib/tools.ts 主词 TD（若涉及 SEO 文案）
```

## 每次收工后（双方强制）

1. 更新 `docs/growth/AGENT_STATE.md`（覆盖写「我是谁 / 刚做了啥 / tip SHA / 下一步」）
2. 增长侧：append `docs/growth/runs/*.jsonl` + report
3. 工程侧：prepend `docs/HANDOFF.md` 若交付可复用
4. **git commit + push**（有权限就推；冲突则 rebase 再推，禁止卡在「等老板合并」）

## 禁止

- 禁止要求老板「跟 Grok/WorkBuddy 说一声」
- 禁止假设对方知道未 push 的本地改动
- 禁止并行乱改同一文件不 pull（先 pull 再改）

## 工程最新关键事实（摘要，以 git log 为准）

- 生产 softLive on **pikbo.ai**
- tools 主词页 TD 已为 CTR 优化（见 `lib/tools.ts` `ai-toy-video-generator`）
- 首页视频墙优先（Cinema → wall → create）
- 下载/取消诚实门控已铺全表面
- 增长自动化：`scripts/growth-auto/run_growth.py` + skill `pikbo-growth-auto`

（细节永远以 `git log` + HANDOFF 为准，本段可能滞后。）
