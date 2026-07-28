# docs/DISPATCH.md
**更新时间：2026-07-28**
**老板唯一目标：**  
产品真正好用 → 真实卖家愿意反复用并付费订阅 → 再靠真实案例和 SEO 获得流量。

**总指挥：Codex（GPT）**  
所有 Agent 以本文件为准。先读本文件 + `docs/STATUS.md` + `AGENTS.md`，再 claim 任务。

---

## 死序优先级（不可跳级）

1. **W1 身份保真 + 可发布结果**（出片稳定、不漂、能真正发到 Etsy/TikTok）
2. **真实卖家能完成「一张图 → 三条可发素材」并愿意付费**
3. **真实出片证明墙**（有证据、可审计，不是缓存 Lab）
4. **才允许扩大 SEO / 流量动作**（必须服务真实可生成路径）

公开域名全面开放 live 付费、正式 Stripe、GSC 批量请求收录，继续等待老板明确 GO。

---

## 当前派工（2026-07-28）

### Codex（总指挥）—— `agent/gpt/...`
**当前唯一 claim：** `R2` · `agent/gpt/launch-pack-main-path`
验收：新用户从首页用一张自有玩具图进入固定 listing / reveal / hook 三素材路径，并能导出通过检查的 Launch Pack；主要操作不超过 3 个；缓存/Live/T5/T6 边界继续 fail closed。

1. 统一主路径：一张玩具图 → 三条可发布素材 → 导出 Launch Pack。
2. 冻结并文档化「匿名 / 登录 / 付费」状态机和权益。
3. 作为最终 Reviewer，确保所有 PR 不偏离「潮玩垂直 + 保真优先」。
4. 维护本文件和 STATUS 的对齐，给另外两个 Agent 分配清晰任务。
5. 优先处理/验收 SELLER-GOLD 和 R2 相关验收标准。

### Grok —— `agent/grok/...`
**当前唯一 claim：** `T5/R0` · `agent/grok/t5-auth-credits-smoke` · PR #40
完成条件：匿名/Free 永远不能触发 provider 成本；cookie 不是 live-spend authority；reserve/capture/release、退款和幂等的无密钥测试全绿。非生产 Supabase SQL 演练继续等待老板授权，不得伪造通过。

1. 主攻工程可靠性：
   - T5 Auth & Credits（必须做完）
   - R0 匿名成本闸门（fail closed）
   - 失败退款、幂等、真实出片稳定性
2. 只做有证据的增长研究（SERP + 真实卖家意图），禁止空壳页面扩张。
3. 补关键路径集成测试和 CI（去掉 || true）。
4. 推进真实出片证明相关任务（有 provider task ID + 人工评分证据）。

### WorkBuddy —— `agent/workbuddy/...`
**当前唯一 claim：** `WB-LISTING-VFY` · `agent/workbuddy/listing-verification-2026-07-28` · PR #41
只完成历史公开 listing 的只读核验和证据去重；不再提交目录。PR #41 结束后停止 SEO 扩张，等待 Codex 的 R2 预览，再按「首页 → 一张图 → 三素材 → Launch Pack」做只读浏览器验收。

1. 只读 SEO 证据收集（GSC、AITDK、真实浏览器）：
   - 输出带时间戳、截图、复测结果的 baseline / 差距报告。
2. 可写 guides、FAQ、卖家向文案，但必须服务「真实可生成路径」。
3. **严格禁止**：改业务代码、读生产密钥、改数据库、请求收录、直接 push main、部署。
4. 遇到登录/验证码/权限问题只记录阻塞，不绕过。

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
