# docs/DISPATCH.md
**更新时间：2026-07-28**
**老板唯一目标：**  
产品真正好用 → 真实卖家愿意反复用并付费订阅 → 再靠真实案例和 SEO 获得流量。

**总指挥：Codex（GPT）**  
所有 Agent 以本文件为准。先读本文件 + `docs/STATUS.md` + `AGENTS.md`，再 claim 任务。

---

## 唯一活动队列（高于本文其余历史内容）

除下表外，所有旧 STATUS 行、旧 PR、旧分支、旧接管文档都只是历史记录，**不能自行恢复为任务**。

| Agent | 唯一任务 | 当前入口 | 完成标准 |
|---|---|---|---|
| Codex | 移动端真实主路径回归审查 | `agent/claude/mobile-proof-regression` | 基于最新 main；390/768/1440 首页→项目→Create 无误导、无横向溢出、移动端只播一条 |
| Grok | 免费下载服务端水印闭环 | `agent/grok/t6-deliverable-proof` | 基于最新 main；真实 ffmpeg/ffprobe 非生产证明；原片不可下载；失败 fail closed |
| WorkBuddy | 等待产品证明 | 无活动分支 | 不提交目录、不写新 SEO；等待真实可发布案例后再派工 |

规则：

- 一个 Agent 同时只有上表中的一个任务；没有 Codex 新派工就等待。
- PR 必须从最新 `main` 创建；旧分支内容只能按明确缺口选择性复用。
- 测试数量、文档页数和提交次数不是产品进度。
- 有效进度必须改善至少一项：真实生成成功、可发布导出、第二次 SKU 使用、真实外部获客证据。
- 外部阻塞只记录一次，由 Codex 统一处理；禁止换一种文档重复汇报。
- #47 已合并，#41 已关闭。当前只补移动端主路径与免费水印交付安全；完成后进入真实卖家私有验收，不扩张 SEO。

### 2026-07-29 owner override — current Codex implementation

- 唯一任务：`REAL-LOOP`，分支 `agent/gpt/real-launch-loop`。
- 顺序：先完成非生产私有单片闭环，再扩成固定 Listing Spin / Blind-box Reveal / Social Flash 三条 Launch Pack。
- 只选择性复用 PR #56 的私有生成、私有结果和 Library 恢复；不合入旧 `$49` 意向表或无关视觉改动。
- 生产继续 `validation` / `softLive=false` / `paid=false`，直到非生产 SQL、私有对象、Worker-only 结算、错账/越权测试和真实调用门槛全部通过。
- Stripe 只补测试模式、幂等和订阅到账代码；没有真实质量与成本证据前不开放收费。

---

## 死序优先级（不可跳级）

1. **W1 身份保真 + 可发布结果**（出片稳定、不漂、能真正发到 Etsy/TikTok）
2. **真实卖家能完成「一张图 → 三条可发素材」并愿意付费**
3. **真实出片证明墙**（有证据、可审计，不是缓存 Lab）
4. **才允许扩大 SEO / 流量动作**（必须服务真实可生成路径）

公开域名全面开放 live 付费、正式 Stripe、GSC 批量请求收录，继续等待老板明确 GO。

---

## 角色边界（不是额外待办清单）

### Codex（总指挥）—— `agent/gpt/...`
**当前唯一 claim：** `MOBILE-PROOF` · review `agent/claude/mobile-proof-regression`

1. 唯一最终 Reviewer；负责派工、冲突处理、验收和低风险合并。
2. 不接受“写完文档/测试”作为完成，必须核对用户路径或可审计外部证据。
3. 生产、付费、数据库、DNS 等动作继续单独过门禁。

### Grok —— `agent/grok/...`
**当前唯一 claim：** `T6-DERIVATIVE` · `agent/grok/t6-deliverable-proof`

1. 先 rebase 最新 main，只补免费结果的服务端水印交付闭环。
2. 必须用真实 ffmpeg/ffprobe 做非生产验证；无二进制或对象存储时保持 fail closed。
3. 不恢复 #42，不新开 T5、SEO、首页或接管任务。

### WorkBuddy —— `agent/workbuddy/...`
1. PR #41 与 #46 已关闭；五个历史提交均为 0 已发布 / 0 已验证外链。
2. 当前等待；不得新开 SEO/外链任务。
3. **严格禁止**：产品代码、测试归属、生产密钥、数据库、请求收录、直接 push main、部署。
4. 遇到登录、验证码、权限或未发布结果只记录事实，不猜测、不绕过。

---

## 执行与报告规则

- 每个 Agent 同时只占 **一个任务、一个独立分支、一个 PR**。
- 分支命名：`agent/<你>/<topic>`
- 提交前缀：`[gpt]` / `[grok]` / `[workbuddy]`
- 完成必须：更新 `docs/STATUS.md` + 提 PR + 有测试/证据。
- 每小时可自检远端 PR 和 STATUS，忙时不重复派工。
- 同一失败连续三轮后停止该线，记录证据，等老板最小动作。

---

## 硬性禁止（直到老板明确 GO）

- 公开 pikbo.ai 全面开放 live 付费生成
- 批量新增 SEO 页面或目录自动化
- 任何没有真实出片证据的「看起来很忙」动作
- 直接 push main
- 把缓存 Lab 说成客户真实结果

---

**钱的对齐（全员记住）**  
现在是 S0→S1 阶段。目标不是先堆流量，而是先让产品好到「有人愿意付钱」。  
SEO 只放大已经验证过的真实卖家路径。
