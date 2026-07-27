# 发版检查清单 · SEO 长尾上线（Top1）

> 历史部署清单：2026-07-27 生产已是 13-URL sitemap。文中的“蓝海”仅
> 代表当时未经验证的关键词假设，不能作为竞争或需求结论。

**目的：** 当时用于把旧 9-URL 配置更新为 13-URL 观察集合。
**你要做的唯一阻塞动作：** 把 **main 最新 commit 部署到 Vercel 生产**（我这边无法登录你的 Vercel）。

---

## A. 发版前（仓库已就绪）

| # | 检查 | 期望 |
|---|------|------|
| 1 | `git log origin/main -1` | tip ≥ `7de8049` Long-tail blue-ocean SEO |
| 2 | `lib/seoIndex.ts` → `COLD_START_INDEX_PATHS` | **13** 条（含 4 tools 长尾 + action-figure） |
| 3 | `COLD_START_INDEXABLE_TOOL_SLUGS` | 含 figure-360 / blind-box / one-photo / product-video |
| 4 | 主词 H1 | **未改**（哥飞冻结） |

---

## B. 你在 Vercel 做

1. 打开 Vercel 项目 **pikbo**（域名 pikbo.ai）
2. 确认 Production 分支 = **`main`**
3. 若未自动部署：`Deploy` → 选最新 `main` commit **Redeploy**（Clear cache 可选）
4. 等 Production **Ready**

---

## C. 发版后 5 分钟自检（curl / 浏览器）

全部应通过：

```bash
# 1) sitemap 必须 13 条，且含长尾
curl -sS https://pikbo.ai/sitemap.xml | grep -c '<loc>'
# 期望: 13

curl -sS https://pikbo.ai/sitemap.xml | grep -E 'figure-360|blind-box-reveal|one-photo-product|ai-product-video|action-figure'
# 期望: 5 行匹配

# 2) 长尾不再 noindex
curl -sS https://pikbo.ai/tools/blind-box-reveal-video-maker | grep -i 'name="robots"'
# 期望: 无 noindex（或无 robots 限制索引）

# 3) 新 Title 上线
curl -sS https://pikbo.ai/tools/blind-box-reveal-video-maker | grep -o '<title>[^<]*</title>'
# 期望含: Blind Box AI Video Generator

curl -sS https://pikbo.ai/tools/figure-360-product-video | grep -o '<title>[^<]*</title>'
# 期望含: AI Figure 360

# 4) 主词仍在
curl -sS https://pikbo.ai/tools/ai-toy-video-generator | grep -o '<title>[^<]*</title>'
# 期望含: AI Toy Video Generator
```

浏览器再开：

- https://pikbo.ai/sitemap.xml
- https://pikbo.ai/tools/blind-box-reveal-video-maker（View Source → robots / title）

---

## D. 发版后 GSC（Top2 · 10 分钟）

1. Search Console → **属性 https://pikbo.ai/**
2. **Sitemaps** → 重新提交 `https://pikbo.ai/sitemap.xml`
3. **网址检查** 依次请求编入索引（优先）：
   - `/tools/ai-toy-video-generator`
   - `/tools/figure-360-product-video`
   - `/tools/blind-box-reveal-video-maker`
   - `/tools/one-photo-product-video`
   - `/tools/ai-product-video-generator-for-toys`
   - `/for/action-figure-product-videos`
4. 覆盖率里若仍见旧 `/explore` 为「已编入」→ 可观察 1–2 周；sitemap 已去掉即可

验证码已在站：`google-site-verification` meta 存在（生产 HTML 可见）。

---

## E. 外链（Top3 · WorkBuddy）

发版成功后，让 WorkBuddy：

1. `git pull` + 清 `docs/growth/WORK_QUEUE.md` open 任务
2. 锚文本轮换见 `docs/growth/LONG_TAIL_KEYWORD_MAP.md`
3. Rank URL 优先：`https://pikbo.ai/tools/ai-toy-video-generator`
4. 可选：`PIKBO_GROWTH_EMAIL` 提高 login 站成功率

---

## F. 发版成功判定（打勾）

- [ ] 生产 sitemap **13** loc
- [ ] 长尾 tools **可索引**（非 noindex）
- [ ] Title 与当前产品/搜索意图一致，不宣称“蓝海”
- [ ] GSC 已重提 sitemap
- [ ] WorkBuddy 进入第二轮外链

我无法替你点 Vercel；发版完成后说一声，我可以再 curl 帮你验收。
