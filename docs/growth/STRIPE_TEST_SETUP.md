# Stripe Test Mode 开通（Round C · S1）

**先 test，后 live。** 生产已 soft live；开收款前把下面 env 配进 Vercel。

## 1. Stripe Dashboard（test mode 开关打开）

1. 创建 Products：
   - **Creator** → recurring price → 复制 `price_...` → `STRIPE_PRICE_CREATOR`
   - **Shop** → recurring price → 复制 `price_...` → `STRIPE_PRICE_SHOP`
2. Developers → API keys → `sk_test_...` → `STRIPE_SECRET_KEY`
3. Developers → Webhooks → Add endpoint：
   - URL: `https://pikbo.ai/api/webhooks/stripe`
   - 事件至少：`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`
   - 复制 `whsec_...` → `STRIPE_WEBHOOK_SECRET`

## 2. Vercel 环境变量（Production + Preview）

```
NEXT_PUBLIC_PAYMENTS_ENABLED=1
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_CREATOR=price_...
STRIPE_PRICE_SHOP=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
# 不要设 PAYMENTS_LIVE=1 除非你明确要真卡
```

Redeploy 后：

```bash
curl -s https://pikbo.ai/api/health | jq '.payments'
# 期望: readyForTestCheckout true, secretMode test, clientEnabled true
```

## 3. 本地测 webhook

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# 把 CLI 的 whsec_ 写进 .env.local STRIPE_WEBHOOK_SECRET
```

## 4. Live 收款（单独批准）

仅当老板说「开 live」：

```
PAYMENTS_LIVE=1
STRIPE_SECRET_KEY=sk_live_...
# 换 live price + live webhook secret
```

无 `PAYMENTS_LIVE=1` 时 `sk_live` 会被代码挡掉。

## 5. 验收

- `/pricing` 可点结账（非 Coming soon）
- test 卡 `4242…` 完成 Checkout
- webhook 后 `/api/me` plan 变为 creator/shop
