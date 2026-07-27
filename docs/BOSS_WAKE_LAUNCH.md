# 老板醒来 · 上线最短路径（2026-07-24）

Grok 已完成：**G6 PASS**（3 live + 退款）· CI 绿 · soft-live 代码齐。  
**公网访问**差你一步：**Vercel 登录并部署**（我登不了你的账号）。

## 5 步上线（Mode A 预览，先不绑 pikbo.ai）

1. 打开 https://vercel.com → GitHub 登录  
2. **Add New Project** → 选 `CharlesHarry7/pikbo` → Deploy
3. Project → Settings → Environment Variables，加入（与本机 `.env.local` 相同）：
   - `SESSION_SECRET`
   - `FAL_KEY`
   - `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - **不要**加 Stripe；不要开 `NEXT_PUBLIC_PAYMENTS_ENABLED`
4. Redeploy  
5. Supabase → Authentication → URL Configuration  
   - Site URL = 你的 `https://xxx.vercel.app`  
   - Redirect = `https://xxx.vercel.app/auth/callback`  
   - 保留 `http://localhost:3000` 本地用  

完成后把预览链接发给 Grok → 跑 link-check / health。

## 绑 pikbo.ai（Mode B · 第二步）

预览稳了再：Vercel Domains 加 `pikbo.ai` + DNS。  
**需你明确说「绑域名」**，Grok 不会擅自改 DNS。

## 证据

- G6：`docs/evidence/G6_LAUNCH_LOG.md`  
- 门禁：`docs/prd/GO_NO_GO.md`（G6 PASS；公网 DNS 仍 NO-GO）  
- 详解：`docs/LAUNCH_MODE_A.md` · `docs/LAUNCH.md`
