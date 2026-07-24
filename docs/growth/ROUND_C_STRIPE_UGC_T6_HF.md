# Round C — Stripe · 真 UGC · T6 bake · HF 像素对标

**状态（2026-07-25 晚）：休眠 / 后补。**  
**老板更正：**「哥飞说什么就做什么；我说的不算，听哥飞的。」  
→ 以 `GEFEI_LAUNCH_DECISION_2026-07-24.md` 为准。  
→ **不**把本 Round 当当前主线；**不**开 Stripe live、**不**强推假 UGC、**不**为 HF 全站阻塞 SEO/Generate。  

工程可保留预埋（SQL / API / bake 契约），等有流量与行为数据、且哥飞节奏允许再启。

**前提：** Mode A soft live + GSC 已完成；**TDH 仍冻结 1–4 周**。

---

## 0. 总原则（启用时才适用）

| 项 | 原则 |
|----|------|
| Stripe | 先 **test mode 可结账**，`sk_live` 须你二次口头确认 `PAYMENTS_LIVE=1` |
| 真 UGC | **真用户发布**；无帖时只显示 Lab，**永不编假帖** |
| T6 | Free 下载必须是 **文件内烧录水印**（或明确 blocked）；CSS 角标不算 |
| HF | 抄 **IA/密度/工作流**；不抄片源/商标/假多模型 live |

---

## 1. Stripe（付费）

### 工程现状
- Checkout / webhook / entitlements 代码已在  
- 生产默认 `NEXT_PUBLIC_PAYMENTS_ENABLED` 未开 → Coming soon  
- `sk_live` 无 `PAYMENTS_LIVE=1` 会被挡  

### 你需要提供（Vercel Production + Preview）

```bash
NEXT_PUBLIC_PAYMENTS_ENABLED=1
STRIPE_SECRET_KEY=sk_test_...          # 先 test
STRIPE_PRICE_CREATOR=price_...
STRIPE_PRICE_SHOP=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
# 仅当要用真卡收款时再加：
# PAYMENTS_LIVE=1
# STRIPE_SECRET_KEY=sk_live_...
```

Webhook URL：`https://pikbo.ai/api/webhooks/stripe`  
事件：`checkout.session.completed` · `customer.subscription.*` · `invoice.paid`（按现有 handler）

### 阶段
| 阶段 | 目标 | 依赖你 |
|------|------|--------|
| S1 | test Checkout 能付、webhook 改 plan | test keys + prices + webhook |
| S2 | Pricing UI 不再 Coming soon（test 徽章） | S1 env 上线 |
| S3 | live 收款 | 你明确说开 live + live keys |

### 验收
`/api/health` → `payments.readyForTestCheckout: true`（test）或 live 就绪字段

---

## 2. 真 UGC（Community）

### 工程现状
- `/community` = **PIKBO Lab only**（诚实 FAQ）  
- Supabase 已有 T5 迁移；需 **community_posts** 表  

### 阶段
| 阶段 | 目标 |
|------|------|
| U1 | SQL 迁移 + list/publish API |
| U2 | 登录用户从 Library「发布到 Community」 |
| U3 | Community 双墙：真帖（有则显示）+ Lab（永远有） |
| U4 | 审核字段 `moderation_status`（默认 pending / approved） |

### 依赖你
- Supabase SQL 编辑器跑新 migration  
- 生产 env 已有 `SUPABASE_*`（本地 `.env.local` 已有 key）  
- Auth 可用（magic link / Google）  

### 验收
- 未登录：只见 Lab + 「登录后可发布」  
- 登录发布 1 条：Community 出现真帖，**无假点赞数**  

---

## 3. T6 文件水印 bake

### 工程现状
- Free live **禁止 raw 下载**（诚实 blocked）  
- 播放器 on-player mark ≠ 文件水印  
- `PIKBO_T6_FILE_BAKE=1` 仅运维断言开关  

### 阶段
| 阶段 | 目标 |
|------|------|
| T1 | Worker 契约：`POST {videoUrl,text}` → `{bakedUrl}` |
| T2 | `/api/downloads` Free 路径：有 worker 则 bake 后下载 |
| T3 | 生产 worker（ffmpeg 容器 / 外部服务）+ 设 `PIKBO_WATERMARK_WORKER_URL` |
| T4 | 验收后 `PIKBO_T6_FILE_BAKE=1` 或 health 自动 `fileBake:true` |

### 依赖你 / 基建
- 可跑 ffmpeg 的 worker URL（Vercel serverless 不适合长视频转码）  
- 或先用 **test 短片 worker**  

### 验收
- Free 成片：下载文件打开可见烧录字样  
- health `t6.status` 最终 `ready`  

---

## 4. 全站像 HF（像素对标剩余）

### 已 live（P1–P8 等）
首页墙、产品轨、导航、Generate 中心、Flow/Modules 密度、Seedance 条…

### 本轮要推
| ID | 项 | 动作 |
|----|-----|------|
| P9 | Library 云端感 | 登录 + Supabase 资产时显示 Cloud；否则 Local 诚实 |
| P11 | 真 UGC Community | 接 U1–U3 |
| P12 | Cinema | 密度/入口对齐 suite，Preview 标诚实 |
| P10 | 多模型 | **仍不写假 live**；有 Kling key 再上 |

### 验收
老板打开 `/` 仍「先被视频墙砸中」；Community 有真帖区；Library 标明 Local/Cloud。

---

## 5. 执行顺序（推荐）

```
1) UGC schema + API + Community 双墙（不依赖付费）
2) T6 worker 契约 + downloads 接入
3) Stripe test keys 到位 → 开 payments UI
4) HF P9/P12 抛光
5) 你确认后 Stripe live
```

## 6. 老板输入清单（缺一则对应轨停）

- [ ] Stripe **test** secret + 两个 price id + webhook secret  
- [ ] 是否授权 **live**（是/否）  
- [ ] Supabase 是否已跑 T5 SQL（是/否）→ 再跑 UGC migration  
- [ ] T6 worker 是否已有 URL（无则我们先 stub + 本地/脚本）  

---

**文档版本：** 2026-07-25 · Grok
