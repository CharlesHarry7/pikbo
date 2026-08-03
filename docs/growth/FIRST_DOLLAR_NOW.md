# 第一块钱：现在差什么

**产品/账本侧已就绪：** 原子预留、对账、Stripe billing RPC 表与函数已在 Supabase。  
**收款侧未开：** 生产没有 `STRIPE_SECRET_KEY` / Price / Webhook。

## 你只做 5 分钟（我做不了替你登录银行）

1. 打开 https://dashboard.stripe.com （**Test mode 打开**）
2. Product → **Founding Studio** → monthly **$49 USD** recurring → 复制 `price_...`
3. Developers → API keys → 复制 `sk_test_...`
4. Webhooks → Add endpoint  
   URL: `https://pikbo.ai/api/webhooks/stripe`  
   事件: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`  
   复制 `whsec_...`
5. 本地写文件 `.env.stripe.local`（勿提交）：

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_FOUNDING_STUDIO=price_...
```

6. 回我一句：**stripe 写好了**  
   我执行 `./scripts/wire-stripe-test-env.sh` → redeploy → `/pricing` 可 Checkout。

## 真钱（live）

需要 `sk_live` + `PAYMENTS_LIVE=1` + 退款/争议守卫演练。  
代码故意挡住未演练的 live，避免先收钱再炸交付。

## 在 Stripe 接通前怎么卖

- 你白名单账号可 private live 真出片 → 用成片私域卖预售/代运营  
- 定价页仍是 Coming soon（诚实）  
- HF 套件壳已上线，负责转化与信任，不代替收款

