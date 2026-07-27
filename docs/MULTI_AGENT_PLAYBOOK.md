# 多 Agent 作战手册 — Grok · Claude · Codex · WorkBuddy

**总目标：** [pikbo.ai](https://pikbo.ai) = **潮玩版 [higgsfield.ai](https://higgsfield.ai/)**  
产品 OS 体感 + 谷歌/外链养站 **双抓**。GitHub 仓库 = 唯一实时大脑。老板不传话。

> **2026-07-28 当前覆盖规则：** 活跃车道只有 Codex 工程与集成、Grok
> 增长证据、WorkBuddy 只读外部审计。每个 Agent 同时一个任务/分支/PR；
> 禁止直接推 `main`。以下历史分工与本规则冲突时，以
> `docs/DISPATCH.md` 顶部的三 Agent 队列为准。

权威域名：**https://pikbo.ai**（禁止 pikbo.com）

仓库：

- `https://github.com/CharlesHarry7/pikbo.git`
- 可能 redirect：`https://github.com/CharlesHarry7/pikbo.git`

---

## 1. 权威顺序

| 序 | 文档 | 作用 |
|----|------|------|
| P0 | `docs/PRODUCT_NORTH_STAR.md` | 潮玩版 HF 是什么 |
| P0 | 本文件 | 谁干什么、怎么同步 |
| P1 | `docs/prompts/GROK_SELF_OPS.md` | Grok 自驱（含谷歌观察 + X 雷达） |
| P1 | `docs/growth/AGENT_BUS.md` | 增长总线（WorkBuddy） |
| P1 | `docs/ops/SITE_WATCH.md` | 谷歌 / 生产 / 产品 / X 观察日志 |
| — | `docs/HANDOFF.md` | 工程交付 newest-first |
| — | `docs/growth/AGENT_STATE.md` | 增长看板覆盖写 |

**冲突时：** 产品身份（潮玩 HF OS）> 纯 SEO 扩页；诚实 > 假 denseness；push 到 GitHub > 对话里说做了。

---

## 2. 角色车道（加快建设 · 少踩脚）

| Agent | 主责 | 默认可写 | 少碰 |
|-------|------|----------|------|
| **Codex** | 产品工程、集成、技术 SEO、测试与 PR/CI 验收 | 获准任务涉及的代码与控制文档 | 生产、付费、数据库、公开发布 |
| **Grok** | 全球英文 SERP、卖家意图、竞争差距、可获得外链和定位审查 | `docs/growth/**`、`docs/research/**` | 批量造页、目录提交、编造搜索量、业务代码 |
| **WorkBuddy** | AITDK/GSC/真实浏览器只读基线与复测 | 指定证据报告和最小 STATUS/HANDOFF | 请求收录、业务代码、密钥、生产系统 |
| **Claude** | 既有工程成果维护；仅在 STATUS 明确认领后进入新队列 | 被认领分支范围 | 未认领的当前三 Agent 工作线 |

交叉改同一文件：先 `git pull`，在 HANDOFF 留「交叉请求」一行，rebase 后 push。

---

## 3. 同步协议（所有人）— **铁令**

**完整细则：** `docs/growth/AGENT_SYNC.md`（开工必读）

```bash
git fetch origin --prune
git checkout main && git pull --ff-only origin main
git log origin/main --oneline -40   # 这就是别人实时做了什么
# 再读：AGENT_STATE · COMMUNICATION_LOG · HANDOFF · WORK_QUEUE · SITE_WATCH
```

收工：

```bash
# 可扫 commit；有老板沟通则 append COMMUNICATION_LOG.md
git commit -m "[grok|claude|codex|workbuddy] <一句话>"
git fetch origin && git rebase origin/main
git push -u origin HEAD
# 创建 PR；CI 与 Codex 验收通过后再合并
```

| 广播位置 | 谁写 |
|----------|------|
| `git log` commit message | 所有人 |
| `docs/HANDOFF.md` prepend | 有产品/工程交付的 agent |
| `docs/growth/COMMUNICATION_LOG.md` | **有老板决策/问答时全员 append** |
| `docs/ops/SITE_WATCH.md` | **Grok 主写**；Claude/Codex 可补「产品体感」段 |
| `docs/growth/AGENT_STATE.md` | WorkBuddy 主写；Grok 可注工程 tip |
| `docs/growth/runs/*-report.md` | WorkBuddy |
| `docs/growth/AGENT_SYNC.md` | 同步铁令（只改协议时） |

未 push = 对方不可见 = 等于没发生。禁止「请老板告诉某某」。禁止只写本地 memory 不写仓库。

---

## 4. 双抓验收（每 24h 至少一次写进 SITE_WATCH）

### 4.1 谷歌 / 养站

- [ ] `pikbo.ai` softLive / 主路径 200  
- [ ] sitemap 可达  
- [ ] 主词页 `/tools/ai-toy-video-generator` 仍是增长锚（不擅自换 H1/TDH）  
- [ ] 外链：只记录公开、可获得机会和已存在 listing 的核验；不自动提交目录
- [ ] 不新增 SEO 垃圾内页；哥飞 14d：外链优先于装 Stripe  

### 4.2 产品能力（对标 HF）

- [ ] 进站像视频 OS，不是 brochure  
- [ ] Generate 是中心；结果可下载/QC/Next SKU  
- [ ] 墙 / Cinema / Library 路径通  
- [ ] 玩具场景与诚实 Lab 标签  
- [ ] Seller Pack / job 意图商业闭环  

### 4.3 X 雷达（Grok 优势）

- [ ] HF 动态  
- [ ] 潮玩 / 手办 / listing video / seller AI 讨论  
- [ ] 可行动产品含义写入 SITE_WATCH  

---

## 5. 红线（全员）

- 域名仅 **pikbo.ai**  
- 不假 UGC、不假多模型 live  
- 不直接 push 或 force-push `main`
- 不提前 Stripe live / 装成熟收费  
- 不抄 HF 片源、商标、用户内容（可抄 IA/密度/工作流）  
- T5 SQL / T6 bake / Mode A Vercel 等老板事项写入 `docs/BLOCKERS_REQUEST.md`，不空等停工  

---

## 6. 老板如何拉齐三人

1. 仓库已含本手册 + `docs/prompts/GROK_SELF_OPS.md`。  
2. 给 **Grok**：执行 `DISPATCH` 顶部 `agent/grok/pikbo-growth-evidence`。
3. 给 **Claude**：  
   > 读 `docs/MULTI_AGENT_PLAYBOOK.md` + `docs/PRODUCT_NORTH_STAR.md`，你是 UI/IA 车道；pull main → 做密度/交互 → HANDOFF + push。  
4. 给 **Codex**：  
   > 读 PLAYBOOK + 北极星；你是诚实文案与 SEO 元信息车道；不扩 URL、不改冻结 TDH；pull → 改 → push。  
5. 给 **WorkBuddy**：执行 `DISPATCH` 顶部
   `agent/workbuddy/seo-baseline-2026-07-28`；旧 AUTO/DEPLOY 提示词均禁止执行。

进度只看 GitHub：`git log` · `SITE_WATCH` · `HANDOFF` · growth runs。
