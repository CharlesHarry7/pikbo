# Agent 同步铁令（全员 · 开工必读）

**老板 2026-07-27：** 所有工作与沟通必须同步到 GitHub，否则其他 agent 不知道做了什么。

## 单一事实源

**GitHub 仓库（`main` + 独立分支 + PR）** = 唯一大脑。
对话窗口、本地 stash、未 push 的改动 = **不存在**。

```bash
# 每次开工（强制）
git fetch origin
git checkout main
git pull --ff-only origin main
git log origin/main --oneline -40
git branch -r
```

## 开工必读（按序，5 分钟）

| 序 | 文件 | 看什么 |
|----|------|--------|
| 1 | `git log -40` | 谁刚 push 了什么（commit message = 广播） |
| 2 | `docs/growth/AGENT_STATE.md` | 当前看板（最后 writer 生效） |
| 3 | `docs/growth/COMMUNICATION_LOG.md` | 老板决策与沟通要点 |
| 4 | `docs/HANDOFF.md` 前 50 行 | 工程可复用交付 |
| 5 | `docs/growth/WORK_QUEUE.md` | open 任务（WorkBuddy 必须清空） |
| 6 | `docs/ops/SITE_WATCH.md` 最新条 | 生产 / 谷歌 / X 观察 |
| 7 | `docs/MULTI_AGENT_PLAYBOOK.md` | 车道与红线 |
| 8 | 最新 `docs/growth/runs/*-report.md` | 增长最近结果 |

## 收工强制（未做 = 任务失败）

1. 有交付 → prepend `docs/HANDOFF.md`（工程）或 `runs/*`（增长）  
2. 有老板沟通 → **append** `docs/growth/COMMUNICATION_LOG.md`（不覆盖历史）  
3. 更新 `docs/growth/AGENT_STATE.md`（覆盖写自己段落）  
4. commit message 可扫：`[grok|workbuddy|claude|codex] <一句话>`  
5. `git fetch origin && git rebase origin/main && git push -u origin HEAD`
6. 创建 PR；确认工作树干净、CI 可复现，等待 Codex 验收合并

## 禁止

- 禁止「只在对话里说做完了」不 push  
- 禁止要求老板在 agent 间传话  
- 禁止直接 push 或 force-push main
- 禁止把重要结论只写在 `~/.workbuddy` 本地记忆而不写仓库  
- 禁止假设对方读过你未 push 的文件  

## Commit 前缀约定

| 前缀 | 谁 |
|------|-----|
| `[grok]` | 工程 / 产品 / SEO 代码 / 计划文档 |
| `[workbuddy]` | 增长 runs / GSC / 目录 / 沟通日志 |
| `[claude]` | UI/IA |
| `[codex]` | 文案/元信息 |

## 当前 main tip 怎么查

永远以远程为准：

```bash
git fetch origin && git log origin/main -1 --oneline
```

不要用过期的对话摘要当 tip。
