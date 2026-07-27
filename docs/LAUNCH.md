# pikbo.ai 上线作战手册（老板点这里）

预计总时间：30～60 分钟（等 DNS 可能更久）。

---

## 公开上线门禁（先看这个）

**2026-07-23 裁定：公开 `pikbo.ai` = NO-GO，直到门禁全绿。**

| 模式 | 何时可以 | 说明 |
|------|----------|------|
| **A 内测预览** | build 绿即可 | 仅 `*.vercel.app`，不绑主域、不公开分享 |
| **B 公开 soft** | `docs/prd/GO_NO_GO.md` **G1–G7 全 Pass** | 域名 + 小范围试玩；**仍无 Stripe** |

详细任务：`docs/DISPATCH.md` · 毒舌证据：`docs/BRUTAL_EXPERT_ROAST_2026-07-23.md`

**不够资格公开上线的原因（现状）：** 空门导航、预设共用片、页脚 404、真机出片/退分未验收——**不是**「等 Stripe」。

### 门禁全绿后 · 公开 soft（无 Stripe）必做

| # | 项 |
|---|-----|
| 1 | Vercel Import `CharlesHarry7/pikbo` → Deploy |
| 2 | Env **Production**：`SESSION_SECRET` + `FAL_KEY` |
| 3 | **不要**加 `STRIPE_*`、**不要**加 `NEXT_PUBLIC_PAYMENTS_ENABLED`、**不要**加 `ALLOW_DEV_UPGRADE` |
| 4 | 域名 pikbo.ai / www 绑到 Vercel（阶段 2） |
| 5 | 手机打开 Create，上传一张自己的手办图试一条 |

### 任何时候都不要做

- 开通 Stripe 收款（未过 T5）  
- 承诺「已付费无限生成」  
- **门禁未绿就绑主域大声宣传**  
- 未测退积分就加大公开传播  

### Stripe 以后再开

等：账号 + 持久积分（T5）+ Stripe Price + Webhook 齐了，再设：

- `STRIPE_SECRET_KEY` / Price IDs / `STRIPE_WEBHOOK_SECRET`  
- `NEXT_PUBLIC_PAYMENTS_ENABLED=1`  

在此之前，付费按钮显示 **Coming soon**。

### 当前窗口

- **立刻：** DISPATCH 止血（GPT 规格 → Codex 文案 → Claude 砍壳）  
- **门禁绿后：** 才按本文阶段 1+2 部署公开  

---

## 阶段 1 — 先让网站在公网跑起来（必须）

### 1.1 部署到 Vercel
1. 打开 https://vercel.com/signup  
2. **Continue with GitHub**  
3. 授权后 **Add New → Project**  
4. 选仓库 **`CharlesHarry7/pikbo`** → **Import**
5. 不要改构建命令，直接 **Deploy**  
6. 等绿勾，点开 `https://xxx.vercel.app`  
7. 确认能看见 Pikbo 首页、能进 Create

### 1.2 环境变量（先加这两个就够演示）
Vercel 项目 → **Settings → Environment Variables** → 对 Production 添加：

| Name | Value |
|---|---|
| `SESSION_SECRET` | 随便一串长密码（例如 32 位随机） |
| `FAL_KEY` | （有 fal 账号再填；没有也能打开站，生成是 demo 片） |

保存后 **Deployments → 最新一次 → Redeploy**。

生成 `SESSION_SECRET`（在自己电脑终端）：
```bash
openssl rand -base64 32
```

---

## 阶段 2 — 域名 pikbo.ai 指到 Vercel（必须）

你的域名在 **Spaceship**（DNS：launch1/2.spaceship.net）。

### 2.1 在 Vercel 添加域名
1. 项目 → **Settings → Domains**  
2. 添加 `pikbo.ai`  
3. 添加 `www.pikbo.ai`  
4. **照抄 Vercel 页面上显示的记录**（若与下表不同，以 Vercel 为准）

### 2.2 常见 DNS（Spaceship → DNS）

| Type | Host/Name | Value | TTL |
|---|---|---|---|
| **A** | `@` | `76.76.21.21` | 自动/300 |
| **CNAME** | `www` | `cname.vercel-dns.com` | 自动/300 |

操作：
1. 登录 https://www.spaceship.com  
2. 域名 **pikbo.ai** → **DNS**  
3. **删除** 旧的 A 记录（现在指 AWS 占位页的那些）  
4. 按上表 **新增**  
5. 保存  

### 2.3 怎么算成功
- Vercel Domains 显示 **Valid**  
- 浏览器打开 https://pikbo.ai 是 Pikbo 站（不是旧占位页）  
- 可能要等 5 分钟～24 小时，多数 30 分钟内  

---

## 阶段 3 — 真出片（强烈建议当天或次日）

1. 注册 https://fal.ai → Keys → 复制  
2. Vercel 加 `FAL_KEY` → Redeploy  
3. /create 上传玩具图试一条  

---

## 阶段 4 — 收钱（可本周内）

1. https://dashboard.stripe.com/register → 先用 **Test mode**  
2. 建 Creator $19 / Shop $49 订阅，复制 Price ID  
3. Vercel 加：
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_CREATOR`
   - `STRIPE_PRICE_SHOP`
   - `STRIPE_WEBHOOK_SECRET`（Webhook 指到 `https://pikbo.ai/api/webhooks/stripe`）
   - `NEXT_PUBLIC_SITE_URL=https://pikbo.ai`
4. Redeploy  

---

## 阶段 5 — Telegram 总控（可并行）

见 `tools/README_TELEGRAM.md`：
1. @BotFather → `/newbot` → Token  
2. 本机 `python3 tools/telegram_dispatch_bot.py`  
3. 手机发「派活：…」  

---

## 验收清单（上线完成定义）

- [ ] https://pikbo.ai 打开是 Pikbo  
- [ ] /create 能上传并生成（demo 或真片）  
- [ ] /pricing 能打开  
- [ ] 免费有积分/水印逻辑  
- [ ] （可选）Stripe 测试订阅走通  
- [ ] （可选）Telegram 能写入 DISPATCH  

---

## 卡住了怎么喊 Grok

直接说：
- 「卡在 Vercel 第几步，屏幕写…」  
- 「Spaceship 没有 A 记录怎么加」  
- 「域名还是旧页面」  
- 「Token 是 …」（密钥请私聊，不要发群）
