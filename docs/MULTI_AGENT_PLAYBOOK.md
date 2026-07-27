# 多 Agent 作战手册 — Grok · Claude · Codex · WorkBuddy

**总目标：** [pikbo.ai](https://pikbo.ai) = **潮玩版 [higgsfield.ai](https://higgsfield.ai/)**  
产品 OS 体感 + 谷歌/外链养站 **双抓**。GitHub `main` = 唯一实时大脑。老板不传话。

权威域名：**https://pikbo.ai**（禁止 pikbo.com）

仓库：

- `https://github.com/guochao950518-wq/pikbo.git`
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
| **Grok** | Generate 闭环、诚实度门控、HF 同构密度、SITE_WATCH、X 竞品雷达、growth 脚本加固 | `app/` `components/` `lib/` `scripts/` `docs/ops/` `docs/growth/`（状态） | 无老板令不开 Stripe live |
| **Claude** | UI/IA、首页与 Create 视觉密度、i18n、交互打磨、无障碍 | `components/` `app/**/page.tsx` 样式与结构 | 计费 / durable SQL / 假 UGC |
| **Codex** | 诚实文案、信任条、SEO 元信息与结构化数据（**不乱扩 URL**）、lint/type 洁癖 | `lib/site.ts` 文案字段、FAQ、少量 copy；测试锁 | 批量新 pSEO 页、改主词 H1/TDH 需明示 |
| **WorkBuddy** | 外链目录、PH 素材、GSC 快照、Chrome 无人提交 | `docs/growth/**` `scripts/growth-auto/**` | 业务 Create/API |

交叉改同一文件：先 `git pull`，在 HANDOFF 留「交叉请求」一行，rebase 后 push。

---

## 3. 同步协议（所有人）— **铁令**

**完整细则：** `docs/growth/AGENT_SYNC.md`（开工必读）

```bash
git fetch origin && git pull --ff-only origin main
git log origin/main --oneline -40   # 这就是别人实时做了什么
# 再读：AGENT_STATE · COMMUNICATION_LOG · HANDOFF · WORK_QUEUE · SITE_WATCH
```

收工：

```bash
# 可扫 commit；有老板沟通则 append COMMUNICATION_LOG.md
git commit -m "[grok|claude|codex|workbuddy] <一句话>"
git pull --rebase origin main && git push origin HEAD:main
# 确认：git status 干净且 main == origin/main
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
- [ ] 外链/目录：WorkBuddy report 或记「无 push」  
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
- 不 force-push `main`  
- 不提前 Stripe live / 装成熟收费  
- 不抄 HF 片源、商标、用户内容（可抄 IA/密度/工作流）  
- T5 SQL / T6 bake / Mode A Vercel 等老板事项写入 `docs/BLOCKERS_REQUEST.md`，不空等停工  

---

## 6. 老板如何拉齐三人

1. 仓库已含本手册 + `docs/prompts/GROK_SELF_OPS.md`。  
2. 给 **Grok**：粘贴 `GROK_SELF_OPS.md` 里 fenced 提示词。  
3. 给 **Claude**：  
   > 读 `docs/MULTI_AGENT_PLAYBOOK.md` + `docs/PRODUCT_NORTH_STAR.md`，你是 UI/IA 车道；pull main → 做密度/交互 → HANDOFF + push。  
4. 给 **Codex**：  
   > 读 PLAYBOOK + 北极星；你是诚实文案与 SEO 元信息车道；不扩 URL、不改冻结 TDH；pull → 改 → push。  
5. 给 **WorkBuddy**：`docs/growth/WORKBUDDY_AUTO_PROMPT.md`。  

进度只看 GitHub：`git log` · `SITE_WATCH` · `HANDOFF` · growth runs。
