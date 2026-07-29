# Stripe Test Mode 开通（Round C · S1）

**先 test，后 live。** 当前只允许私有 Preview 测试；生产收费仍关闭。

先在一次性/非生产 Supabase 依次应用
`supabase/migrations/20260729024000_stripe_subscription_statuses.sql`、
`supabase/migrations/20260729025000_founding_studio_plan.sql` 与
`supabase/migrations/20260729030000_stripe_billing_idempotency.sql`，完成并发
重放、乱序订阅事件和 invoice credit grant 验证。未验证前不要设置
`STRIPE_BILLING_RPC_READY=1`。

## 1. Stripe Dashboard（test mode 开关打开）

1. 创建一个 Product：
   - **Founding Studio** → active、USD、$49、monthly recurring、
     quantity licensed Price（不是 metered、yearly、$29 或 one-time）→
     复制 `price_...` → `STRIPE_PRICE_FOUNDING_STUDIO`
2. Developers → API keys → `sk_test_...` → `STRIPE_SECRET_KEY`
3. Developers → Webhooks → Add endpoint：
   - URL: `https://YOUR_PRIVATE_PREVIEW/api/webhooks/stripe`
   - 事件至少：`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`
   - 复制 `whsec_...` → `STRIPE_WEBHOOK_SECRET`

## 2. Vercel 环境变量（仅私有 Preview）

```
NEXT_PUBLIC_PAYMENTS_ENABLED=1
STRIPE_BILLING_RPC_READY=1
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_FOUNDING_STUDIO=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYMENTS_LIVE=0
# 保持 0；退款/争议后的积分撤销尚未实现与演练
STRIPE_REFUND_DISPUTE_GUARD_READY=0
```

不要把这些值写入 Production。Founding Studio 当前是 3 个固定 Launch
Packs/月（90 credits、9 个 5 秒 Fast 720p 输出），余额在订阅有效期间
结转；只有 10 次真实生成和 10 人目标买家 Beta 通过后才可评估 live。
测试账户还必须是 active personal account、当前登录用户为 owner，且
durable `accounts.live_generation_allowed=true`；否则 Checkout 返回
`PAID_DELIVERY_NOT_READY`，避免先收钱再发现真实交付被关闭。

Redeploy 后：

```bash
curl -s https://YOUR_PRIVATE_PREVIEW/api/health | jq '{payments, stripeBillingStore, ready: .ready.paid}'
# 测试 Checkout 就绪仍不等于生产 ready.paid=true。
```

## 3. 本地测 webhook

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# 把 CLI 的 whsec_ 写进 .env.local STRIPE_WEBHOOK_SECRET
npm run stripe-billing-regression
```

## 4. Live 收款（单独批准）

仅当计划中的技术、质量、隐私、Beta 和毛利门槛全部通过：

```
PAYMENTS_LIVE=1
STRIPE_SECRET_KEY=sk_live_...
# 换 Founding Studio live price + live webhook secret
```

Live Checkout 同时要求 `PAYMENTS_LIVE=1` 与
`STRIPE_REFUND_DISPUTE_GUARD_READY=1`。后者所代表的退款/争议积分撤销目前
尚未实现，因此不得设置，`sk_live` 会继续被代码挡掉。

## 5. 验收

- `/pricing` 可点结账（非 Coming soon）
- 必须先登录；Checkout metadata 绑定当前 Supabase user/account/price
- test 卡 `4242…` 完成 Checkout
- `checkout.session.completed` 本身不送积分；首次 `invoice.paid` 原子到账
- 重放相同 event/invoice 不重复送积分
- 旧 `subscription.updated` 不覆盖更新的 `subscription.deleted`
- `incomplete_expired` 归一为 canceled；`paused` 不享有权益且阻止重复结账
- canceled 订阅收到晚到 invoice 不复活；同账户 canceled A 的事件不降级
  funded active B
- webhook 后 `/api/me` 从 durable account 显示 plan/credits
- 同一 account 不能同时创建第二个未结束订阅
- 首笔有效订单必须来自外部客户、非零美元真实订阅；test、自购、免费不计
