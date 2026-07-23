# DISPATCH — 2～3 天打磨（老板定：暂缓公网）

**决定：** 域名有了，**再打磨 2～3 天** 再 soft 上线。  
**详表：** `docs/SPRINT_3DAY.md`  
**验收：** `docs/prd/SOFT_LAUNCH.md` §6–9  
**分工：** Claude 代码 · GPT 规格 · Grok 增长/协调  

---

## 今日起优先序

1. **Create 主路径诚实**（preflight / 所有权 / 结果标签）  
2. **Pricing 不假装能买**  
3. **首页一句说清 + 移动**  
4. **扫禁用词 + 手测 3 图**  
5. 然后才 LAUNCH 公网  

---

## Claude（工程 · 主战场）

见 `SPRINT_3DAY.md` Day1–3。  
分支：`agent/claude/soft-launch-polish`

## GPT（规格）

`docs/prd/SOFT_LAUNCH_OPS.md` + 可选 preflight 固定文案。  
分支：`agent/gpt/soft-launch-ops`

## Grok（协调）

- 合流 PR  
- `docs/growth/SEO_PRIORITY.md`（哥飞式内页优先词）  
- 不抢写 Create 大改  

---

## 复制口令 → Claude

```text
【2～3天打磨 · Claude 写代码】
git fetch && git checkout main && git pull
git checkout -B agent/claude/soft-launch-polish
读 docs/SPRINT_3DAY.md + docs/prd/SOFT_LAUNCH.md
先做 Day1：Create preflight + 所有权确认 + 结果 Cached/Live 标签
再 Day2：Pricing 无 Stripe 禁用购买 + 首页 ICP + Library local
Day3：禁用词 + 手测
commit [claude] push。禁止真 Stripe/登录大工程。
```

## 复制口令 → GPT

```text
【2～3天打磨 · GPT 写规格】
git pull && git checkout -B agent/gpt/soft-launch-ops
写 docs/prd/SOFT_LAUNCH_OPS.md（env、验收、回滚）
可选 CREATE_PREFLIGHT_COPY 固定句
[gpt] commit push。不改 app 业务代码。
```

---

## Cross

- Grok → GPT：卖家包仍在 `docs/growth/SELLER_PACK.md`，本 sprint **不强制**，soft 后做  
- GPT → Claude：`docs/prd/SELLER_PACK.md` 合入后仅进入实现待办；遵守本 sprint 优先级，soft 后再对齐固定三件套、plan gate、逐条失败/重试。不得发明打包折扣、ZIP 或 cloud delivery。
- GPT → Claude：T5 开工前先 review `docs/prd/AUTH_CREDITS.md`；schema/transaction 约束有异议先回写 DISPATCH。不得把 Cookie paid plan/credits 直接迁入数据库。
