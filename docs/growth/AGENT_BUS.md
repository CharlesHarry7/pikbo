# Agent Bus — Grok 工程 ↔ WorkBuddy 增长

## 老板一句话

**GitHub 仓库 = 实时大脑。** 谁在干什么、推了什么、下一步是什么，都写在 `main` 上。  
**老板不传话。** 禁止「请告诉 Grok / 请告诉 WorkBuddy」。双方自己 `pull` / `push`。

---

## 单一事实源

| 通道 | 路径 / 命令 | 用途 |
|------|-------------|------|
| **实时活动流** | `git log origin/main --oneline -40` | 对方刚做了什么（commit message 就是广播） |
| **工程交付** | `docs/HANDOFF.md` | Grok 可复用交付摘要（newest first） |
| **多 Agent 手册** | `docs/MULTI_AGENT_PLAYBOOK.md` | Grok / Claude / Codex / WorkBuddy 车道 |
| **Grok 自驱提示** | `docs/prompts/GROK_SELF_OPS.md` | 谷歌观察 + 产品迭代 + X 雷达 |
| **站点观察日志** | `docs/ops/SITE_WATCH.md` | softLive / SERP / HF 缺口 / X |
| **增长状态看板** | `docs/growth/AGENT_STATE.md` | 覆盖写：谁、何时、tip、下一步 |
| **增长报告** | `docs/growth/runs/*-report.md` | 每次目录/外链跑完的结果表 |
| **本协议** | `docs/growth/AGENT_BUS.md` | 协作铁律（本文件） |

**未 push 的本地改动 = 对方不可见 = 等于没发生。**

---

## 角色

| 角色 | 写什么 | 推什么 |
|------|--------|--------|
| **Grok（工程 + 观察）** | Generate 闭环 / 诚实度 / HF 密度 / SITE_WATCH·X | `main`：代码 + HANDOFF + `docs/ops/` |
| **Claude（UI/IA）** | 密度 / 交互 / i18n | `main`：components/app UI；HANDOFF |
| **Codex（文案/元信息）** | 诚实文案、SEO 元信息（不乱扩 URL） | `main`：copy / 元信息；HANDOFF |
| **WorkBuddy（增长）** | 外链 / 目录 / PH / GSC 快照 | `docs/growth/**`（或 `agent/workbuddy/*`） |

权威域名：**https://pikbo.ai**（禁止提交 pikbo.com）

仓库（`git remote -v` 自检）：

- `https://github.com/guochao950518-wq/pikbo.git`
- 可能 redirect：`https://github.com/CharlesHarry7/pikbo.git`

---

## 实时感知协议（双方强制）

### 每次开工 / 每轮循环开始

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git log origin/main --oneline -30   # ← 这就是「对方实时做了什么」
```

然后**必读**（按优先级）：

1. `docs/growth/AGENT_STATE.md` — 对方写的最新看板
2. `docs/HANDOFF.md` 前 40 行 — 工程最近交付
3. 最新 `docs/growth/runs/*-report.md` — 增长最近一次结果
4. 若涉及文案/SEO：`lib/site.ts` / `lib/tools.ts`

从 **git log commit message** 自行推断对方进度，**禁止**问老板「工程/增长那边怎样了」。

### 每次收工 / 每完成一块可复用工作

1. **Grok**：有交付则 prepend `docs/HANDOFF.md`；更新 `AGENT_STATE.md`（`writer: grok-eng`）
2. **WorkBuddy**：写 `runs/<ts>-report.md`（+ jsonl 本地可 gitignore）；更新 `AGENT_STATE.md`（`writer: workbuddy`）
3. **双方强制**：

```bash
git add <相关文件>
git commit -m "[grok|workbuddy] <一句话对方能看懂的进度>"
git pull --rebase origin main   # 先合再推，禁止等老板合并
git push origin HEAD:main
```

无 main 写权限时：推 `agent/<name>/<topic>-<date>`，并在 `AGENT_STATE` 写清 branch 名。

### Commit message 约定（= 实时广播文案）

对方只靠 log 扫一眼就要懂：

- 好：`[grok] tools rank TD CTR + no-signup friction`
- 好：`[workbuddy] growth run 20260726: 12 dirs, 3 submitted, 2 captcha`
- 差：`update` / `fix` / `wip`（禁止）

---

## 禁止

- 禁止要求老板「跟 Grok / WorkBuddy 说一声」
- 禁止假设对方知道**未 push** 的本地改动
- 禁止不 pull 就改同一文件（先 pull 再改）
- 禁止卡在「等老板合并 / 等老板确认对方收到」
- 禁止用聊天代替仓库（进度只认 GitHub）

---

## 工程关键事实（摘要 · 可能滞后 · 以 git log 为准）

- 生产 softLive on **pikbo.ai**
- tools 主词页 TD 已为 CTR 优化（`lib/tools.ts` → `ai-toy-video-generator`）
- 首页视频墙优先（Cinema → wall → create）
- 下载/取消诚实门控已铺全表面
- 增长自动化：`scripts/growth-auto/run_growth.py` + skill `pikbo-growth-auto`
- 老板不传话；本 bus 生效后双方只认 push 到 GitHub 的状态

---

## WorkBuddy 一键入口

完整无人 prompt：`docs/growth/WORKBUDDY_AUTO_PROMPT.md`  
跑：`python3 scripts/growth-auto/run_growth.py --all` → commit push `docs/growth/**`
