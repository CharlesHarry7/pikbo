# 老板公网 Soft Launch 清单（哥飞 P0）

**目标：** `https://pikbo.ai` 可访问、可试用，不收费。  
**更新：** 2026-07-25 — **Mode A soft live + GSC 全链路完成**（WorkBuddy 回报 + 外网复核）。

---

## 已完成 ✅

| 项 | 状态 |
|----|------|
| Vercel 部署 | ✅ 项目 `pikbo` · 生产 `https://pikbo.ai` |
| `SESSION_SECRET` + `FAL_KEY` | ✅ softLive · fal · live-generate |
| DNS A/CNAME + SSL | ✅ |
| Generate 冒烟 | ✅ Seedance Mini 真出片（WorkBuddy 2026-07-25） |
| TDH 冻结 | ✅ `lib/site.ts`（1–4 周勿改） |
| SEO 意图页 + IndexNow | ✅ Bing/api.indexnow 已推 |
| **GSC 验证** | ✅ 已进后台（verification meta） |
| **GSC Sitemap** | ✅ `/sitemap.xml` **成功** · 已发现 **94** 页 · 读取 2026-07-25 |
| **GSC 请求收录** | ✅ 首页/create/for/photo-to-video/tools 等 6 URL 进优先队列 |

**主域名：** https://pikbo.ai

---

## 可选 / 后补（非 blocker）

### 付费目录站（WorkBuddy 探测 2026-07-25）

| 站 | 状态 |
|----|------|
| TAAFT | 付费 launch，跳过 |
| Futurepedia | $247+，跳过 |
| Toolify | $99，跳过 |
| AI Tool Hunt | 无免费提交入口 |

→ **不付费先不做**。可改走免费渠道：Product Hunt（时机自选）、Indie Hackers、Reddit 合规发帖、中文独立开发社群、免费「submit tool」小站。

### 工程后补

- T6 文件水印 bake（收费前）
- Supabase 多机积分
- Stripe live（刻意后开）

---

## 冻结纪律

- 1–4 周 **不要改** 首页 Title / Description / H1  
- Stripe live 先别开  

---

## 外网自检

```bash
curl -s https://pikbo.ai/api/health | jq '.acceptance,.fal,.mode'
curl -s https://pikbo.ai/sitemap.xml | grep -c '<loc>'
```
