# 24 小时交付包 — 软上线就绪

**目标时刻：** 收到指令后 24 小时内  
**代码完成标准：** 地基稳、build 绿、配 key 即可出片/部署  
**你需要的时间：** 约 30～60 分钟（配 key + Vercel）

---

## A. 代码侧（Grok / 三家）— 必须绿

- [x] 地基文档 `docs/FOUNDATION.md`
- [x] 生成契约 `lib/contracts.ts` + generate `demo` 字段
- [x] 积分 Free1 / Creator5 / Shop15
- [x] Demo 用本地潮玩片（非 flower）
- [x] 免费 5s 锁 + cookie clamp
- [x] SEO effects/for/toys + FAQ
- [x] 定价页诚实文案（含 Codex pricing-mobile）
- [x] `npm run preflight` / production build
- [x] 本机 `.env.local` 已写 `SESSION_SECRET`（不进 git）

## B. 老板侧 — 打开水龙头

### 1）本机真出片（5 分钟）

编辑 **不要提交** 的文件：`/Users/x/claude/pikbo/.env.local`

```bash
# 已有 SESSION_SECRET
FAL_KEY=你的fal密钥
```

```bash
cd /Users/x/claude/pikbo && npm run dev
# 打开 http://127.0.0.1:3000/create 上传手办图
```

健康检查：`http://127.0.0.1:3000/api/health`  
- `"fal": true` → 真出片  
- `"fal": false` → demo-cached  

### 2）公网（30～60 分钟）

按 **`docs/LAUNCH.md`**：

1. Vercel Import `CharlesHarry7/pikbo`
2. Env：`SESSION_SECRET` + `FAL_KEY`（+ 可选 Stripe）  
3. Deploy → 加域名 pikbo.ai  

### 3）验收 5 条

1. 首页能滚视频  
2. `/create` 能生成（live 或诚实 demo）  
3. `/pricing` 数字：1 / 5 / 15  
4. `/effects/某slug` 同页工具  
5. health 不 degraded  

---

## C. 24h 内不做

- 大重写 HF 壳（product-foundation 等）  
- Supabase 全量（可进下一 24h）  
- 假 UGC  

---

## D. 完成后算什么

| 标签 | 含义 |
|------|------|
| **代码 24h 完成** | 本清单 A 全绿 |
| **产品软上线** | A + 老板 B1/B2 |
| **可收钱** | + Stripe 真价 + 持久账号（下一阶段） |
