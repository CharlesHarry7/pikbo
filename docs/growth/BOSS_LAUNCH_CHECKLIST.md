# 老板公网 Soft Launch 清单（哥飞 P0）

**目标：** `https://pikbo.ai` 可访问、可试用，不收费。  
**更新：** 2026-07-24 — DNS / Vercel / env **已完成**（外网验收 softLive=true）。

---

## 已完成 ✅

| 项 | 状态 |
|----|------|
| Vercel 部署 | ✅ |
| `SESSION_SECRET` + `FAL_KEY` | ✅ health 显示 fal + sessionSecret |
| DNS A/CNAME | ✅ `pikbo.ai` → 76.76.21.21 · www → vercel-dns |
| 域名绑定 + SSL | ✅ Let's Encrypt 已签发 |
| Generate soft live | ✅ 外网可 live-generate |
| TDH 冻结 | ✅ `lib/site.ts` |
| SEO 意图页矩阵 | ✅ /for /tools /toys /guides + IndexNow 脚本 |

**主域名：** https://pikbo.ai  
（`*.vercel.app` 本环境可能超时，以自定义域名为准）

---

## 你还差的（Google 只能你点一次）

### Google Search Console（约 5 分钟）

1. 打开 https://search.google.com/search-console  
2. 添加资源：`https://pikbo.ai`（网址前缀）  
3. 验证：推荐 **DNS TXT**（Spaceship）或 HTML 标签（验证码发我可代写进代码）  
4. 验证通过后 → **站点地图** → 提交：  
   `https://pikbo.ai/sitemap.xml`

工程侧 **Bing/Yandex** 已走 IndexNow（`npm run indexnow`，部署 key 文件后）。

### 外链（可本周慢慢铺）

见 `docs/growth/GEFEI_SEO_CHECKLIST_STATUS.md` 导航站列表。  
落地页优先：`/` · `/for/photo-to-video-for-toys` · `/create`

---

## 冻结纪律

- **1–4 周不要改**首页 Title / Description / H1（`lib/site.ts`）  
- Stripe live：先不要开  

---

## 工程自检命令

```bash
curl -s https://pikbo.ai/api/health | jq '.acceptance,.fal,.sessionSecret,.mode'
npm run indexnow   # 部署含 key 文件后
```
