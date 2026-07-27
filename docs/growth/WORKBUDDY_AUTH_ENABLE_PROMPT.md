# WorkBuddy：打开用户登录（整段复制给 WorkBuddy）

> **撤销，禁止执行（2026-07-27）：** WorkBuddy 不再有生产密钥、数据库、
> Supabase、Vercel 或部署权限。认证配置已转交恢复波次工程 owner。本文件只
> 保留历史，不得复制执行。

**仅历史存档：不得复制下方 fenced 块给 WorkBuddy。**

---

```text
你是 Pikbo 全自动运维 Agent（WorkBuddy）。任务：尽量打开生产用户登录（Supabase Auth）。
100% 无人。禁止问老板密码。禁止改 Create 业务逻辑（可改 docs/growth/** 与必要 env 文档）。
禁止开 Stripe。禁止扩 sitemap。域名只 https://pikbo.ai。

════════════════════════════════════
## 0. 背景（先读懂再动手）
════════════════════════════════════
- 代码已有：/login · Magic Link API · Google 可选 · /auth/callback
- 生产当前：auth.mode=disabled（Grok 核查 /api/health）
- 游客 cookie 已可 softLive 生成；跨设备账号需要密钥
- 权威说明：docs/BLOCKERS_REQUEST.md §2 · lib/authConfig.ts

REPO:
- https://github.com/CharlesHarry7/pikbo.git
- 可能 redirect: https://github.com/CharlesHarry7/pikbo.git

启动：
git fetch origin && git checkout main && git pull --ff-only origin main
git log -15 --oneline

基线（写入 report）：
curl -sS https://pikbo.ai/api/health | 解析 auth / durableCredits
curl -sS https://pikbo.ai/api/me | 看 authConfigured signedIn
打开 https://pikbo.ai/login 截图：应看到 “Sign-in not live yet” 若仍 disabled

════════════════════════════════════
## 1. 成功标准（生产）
════════════════════════════════════
全部满足才算 PASS：
1) GET https://pikbo.ai/api/health → auth.configured=true 且 mode 不是 disabled
2) https://pikbo.ai/login 显示可填邮箱的 Magic Link 表单（不是 “not live yet”）
3) （尽量）用测试邮箱发 magic link 不报 500；截图
4) docs/growth/runs/AUTH-ENABLE-<ts>-report.md 写清做了什么 + 截图路径
5) git commit push [workbuddy] auth-enable: PASS|BLOCKED …

════════════════════════════════════
## 2. 密钥从哪来（按优先级试，禁止把密钥写进 git）
════════════════════════════════════
A) 环境变量已有（最稳）：
   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
   SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   可选：SUPABASE_AUTH_GOOGLE=1

B) 浏览器已登录 Vercel + Supabase 控制台 → 你用 Chrome 代操作配置

C) 都没有 → status=blocked_secret:supabase_vercel
   report 写老板需一次性提供上述 env（可只给 WorkBuddy 环境，不进聊天）
   然后跳到 §5 继续外链，不要干等

════════════════════════════════════
## 3. 配置步骤（有权限时强制做）
════════════════════════════════════

### 3.1 Supabase 项目
1) 打开 https://supabase.com/dashboard
2) 选/建项目（与 Pikbo 绑定的那个）
3) Project Settings → API：复制 Project URL、anon public、service_role
4) Authentication → URL Configuration：
   - Site URL: https://pikbo.ai
   - Redirect URLs 加入：
     https://pikbo.ai/auth/callback
     http://localhost:3000/auth/callback
5) Authentication → Providers → Email：Enable（Magic Link）
6) （可选）Google provider 若要开：配 OAuth 后 env SUPABASE_AUTH_GOOGLE=1
7) SQL Editor：执行仓库文件
   supabase/migrations/20260723120000_t5_auth_credits.sql
   （若文件名略有不同，用 supabase/migrations/ 下 T5 auth credits 最新迁移）
   成功/失败截图

### 3.2 Vercel 生产环境变量
1) https://vercel.com → 项目 pikbo → Settings → Environment Variables
2) 对 Production（建议也 Preview）设置：
   NEXT_PUBLIC_SUPABASE_URL = <Project URL>
   SUPABASE_URL = <同 URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY = <anon>
   SUPABASE_ANON_KEY = <anon>
   SUPABASE_SERVICE_ROLE_KEY = <service_role>   # 切勿提交 git / 截图打码
   NEXT_PUBLIC_PAYMENTS_ENABLED = 0
3) Deployments → 最新 → Redeploy（Clear cache 更稳）
4) 等到 Ready

### 3.3 若有 VERCEL_TOKEN
可用 CLI 写 env + deploy（密钥只走 env，不 echo 到 report）：
  npx vercel env add … --token
  npx vercel deploy --prod --yes --token

════════════════════════════════════
## 4. 验收（Redeploy 后）
════════════════════════════════════
curl -sS https://pikbo.ai/api/health → auth.configured 应为 true
curl -sS https://pikbo.ai/login → 页面应可提交邮箱
可选：POST /api/auth/magic-link 用测试邮箱（若有 PIKBO_GROWTH_EMAIL）
截图：login-form-live.png · health-auth-on.png

若仍 disabled：查 env 是否只加在 Preview、是否未 Redeploy、public 变量名是否缺 NEXT_PUBLIC_

════════════════════════════════════
## 5. 无论登录 PASS 或 BLOCKED — 继续增长
════════════════════════════════════
export GROWTH_CHROME_CHANNEL=chrome
# 有则：export PIKBO_GROWTH_EMAIL=...
python3 scripts/growth-auto/run_growth.py --all

链：
- https://pikbo.ai/tools/ai-toy-video-generator
- https://pikbo.ai/tools/blind-box-reveal-video-maker
- https://pikbo.ai/guides/toy-unboxing-video-from-one-photo

禁止扩 sitemap。commit 可合并或分两条：
[workbuddy] auth-enable: PASS|BLOCKED …
[workbuddy] growth: submitted=N … (no sitemap expand)

════════════════════════════════════
## 6. 写回 GitHub
════════════════════════════════════
docs/growth/runs/AUTH-ENABLE-<ts>-report.md 必须含：
- baseline_auth
- steps_done[]
- sql_migration: ok|fail|skipped
- vercel_env: ok|blocked
- redeploy: ok|skipped
- final_auth (health JSON 摘要，无密钥)
- growth summary
- screenshots[]

更新 AGENT_STATE writer=workbuddy
append COMMUNICATION_LOG 一句结果（无密钥）
WORK_QUEUE 本任务 done

git add docs/growth/
git commit + pull --rebase + push origin HEAD:main

════════════════════════════════════
立即开始：pull → 基线 curl → 试 Supabase/Vercel 配置 → redeploy 验收
→ 增长 --all → report push。不要问老板。
```

---

## 老板备注

1. 把上面 fenced 丢给 WorkBuddy。  
2. 若它报 **blocked_secret**：在 Vercel/Supabase 控制台登录态给 WorkBuddy 用的 Chrome，或把密钥放进 **WorkBuddy 环境变量**（不要贴到群聊）。  
3. 成功标志：GitHub 出现 `[workbuddy] auth-enable: PASS`，且 https://pikbo.ai/login 能填邮箱发 magic link。
