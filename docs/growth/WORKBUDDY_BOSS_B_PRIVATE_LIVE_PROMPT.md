# WorkBuddy：老板 B 授权 — 私有真出片（Vercel + Supabase Chrome 代操作）

**老板拍板（2026-08）：** `B 给 WorkBuddy`  
= 用 **已登录 Vercel / Supabase 的 Chrome**（或 WB 环境里已有控制台会话）代配  
**私有真 live 出片**所需 env + SQL + Redeploy。  

**本任务是对 WORK_QUEUE 默认「禁止碰 Vercel/Supabase」的一次性例外。**  
只做下面清单。禁止 Stripe live、禁止扩 sitemap、禁止公网 uncapped spend、  
禁止把任何密钥写进 git / report / 群聊。

**老板用法：** 复制下方 fenced **全文** → 丢给 WorkBuddy。  
你要先保证 WorkBuddy 用的 Chrome 已登录：Vercel 项目 pikbo + Supabase 项目。

---

```text
你是 Pikbo 运维 Agent（WorkBuddy）。老板明确授权：B 模式。
任务：打开「受邀老板账号私有真出片」运行时前置（Auth + Durable + Private Live 门控 + Redeploy）。
100% 无人。禁止问老板密码。禁止把密钥写进 git / 截图明文 / report。
禁止 Stripe live。禁止扩 sitemap。禁止匿名 live。禁止公网 uncapped FAL。
域名只 https://pikbo.ai。

本任务授权例外：允许在 Chrome 已登录前提下操作 Vercel Env + Supabase SQL/Auth URL + Redeploy。
未登录控制台 → status=blocked_secret:console_login 写报告后停，不要空转。

════════════════════════════════════
## 0. 启动
════════════════════════════════════
git fetch origin && git checkout main && git pull --ff-only origin main
git log -10 --oneline

基线（写入 report，无密钥）：
curl -sS https://pikbo.ai/api/health | 记录 acceptance / auth / ready / privateLiveBeta / t6 / missingLiveRequirements
打开 https://pikbo.ai/login 截图（打码邮箱）

读：
- docs/evidence/P0_PRIVATE_LIVE_PREREQS_2026-07-28.md
- .env.example 中 PRIVATE_LIVE / SUPABASE / R1 相关注释
- docs/growth/WORK_QUEUE.md 本 WQ 条目

════════════════════════════════════
## 1. 成功标准（PASS 尽量全满足；否则诚实 BLOCKED）
════════════════════════════════════
P0（必须尽力）：
1) health：auth.configured=true 且 mode 不是 disabled
2) /login 可填邮箱发 magic link（不是 “not live yet”）
3) Vercel Production（建议 Preview 同步）已设且 Redeploy Ready：
   - SESSION_SECRET（若已有勿覆盖除非空）
   - FAL_KEY（若已有勿覆盖）
   - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - PIKBO_PRIVATE_LIVE_ENABLED=1
   - PIKBO_PRIVATE_LIVE_ALLOWLIST=<老板邮箱，小写>
   - PIKBO_PRIVATE_LIVE_BUDGET_MAX=3
   - NEXT_PUBLIC_PAYMENTS_ENABLED=0
4) Supabase Auth URL：
   - Site URL: https://pikbo.ai
   - Redirect: https://pikbo.ai/auth/callback 与 localhost callback
   - Email magic link 开启
5) SQL Editor 按顺序执行仓库 migrations（成功/失败截图打码）：
   优先：
   - supabase/migrations/20260723120000_t5_auth_credits.sql
   - supabase/migrations/20260723121000_pgcrypto_extensions.sql（若存在）
   - supabase/migrations/20260727213000_r1_atomic_generation_credits.sql
   - supabase/migrations/20260727233000_r1c_generation_reconciliation.sql
   若文件有更新以 main 最新为准；失败写清错误摘要（无密钥）

P1（有权限再做，否则 BLOCKED 写原因）：
6) 仅在 SQL 非生产验证看起来 OK 后，再设（Production）：
   - REQUIRE_DURABLE_CREDITS=1
   - PIKBO_R1_ATOMIC_RESERVATION_READY=1
   - PIKBO_R1_RECONCILIATION_READY=1
   再 Redeploy
7) T6 对象存储/ffmpeg 若本机/控制台没有 → 不要瞎开 PIKBO_T6_*；报告 blocked_t6

验收 curl（Redeploy 后）：
curl -sS https://pikbo.ai/api/health → 记录 auth / privateLiveBeta / ready / acceptance
成功标志：auth 开 + privateLiveBeta.enabled=true + allowlistConfigured=true
（softLive 可能仍 false 直到 T6；诚实记录）

════════════════════════════════════
## 2. 密钥与白名单
════════════════════════════════════
- 密钥只走 Vercel UI / 已登录会话；禁止 echo 到 terminal log 文件上传 git
- ALLOWLIST 用老板邮箱（从已登录 Google/邮件推断或控制台已有用户）；不确定就 blocked 问一次「允许用的邮箱」写在 report，不要猜错邮箱开全站 live
- BUDGET_MAX 默认 3；禁止改成超大数字

════════════════════════════════════
## 3. 写回 GitHub（无密钥）
════════════════════════════════════
docs/growth/runs/BOSS-B-PRIVATE-LIVE-<ts>-report.md 必须含：
- baseline_health 摘要
- steps_done[]
- sql: ok|fail|skipped per file
- vercel_env: which keys set (names only) | blocked
- redeploy: ok|fail
- final_health 摘要
- screenshots[]（路径；密钥 UI 打码）
- status: PASS | BLOCKED:<reason>

更新：
- docs/growth/AGENT_STATE.md writer=workbuddy
- docs/growth/COMMUNICATION_LOG.md 一句结果
- WORK_QUEUE 本 WQ → done + result

commit + pull --rebase + push：
[workbuddy] boss-B private-live: PASS|BLOCKED …

可改 docs/growth/** 与 evidence 路径；禁止改 Create 业务逻辑 / 开 Stripe。

════════════════════════════════════
立即开始：pull → 基线 curl → Chrome 控制台 → SQL → env → redeploy → 验收 → report push。
不要问老板密码。搞不定就 BLOCKED 诚实写。
```

---

## 老板备注

1. 先让 WorkBuddy 的 **Chrome 登录** Vercel 项目 pikbo + Supabase。  
2. 把上面 fenced 丢给 WorkBuddy。  
3. 成功：GitHub 出现 `[workbuddy] boss-B private-live: PASS`，且 `/login` 可发 magic link。  
4. softLive / 可下载水印片可能仍要 T6——那是下一步，先过 **登录 + 私有 live 门控**。
