# 老板只需 3 步（不懂技术也能做）

## 你现在卡在哪？

| 地方 | 状态 |
|------|------|
| 代码（GitHub main） | ✅ 已经改好了（长尾 SEO、sitemap 13 等） |
| 网站 pikbo.ai | ❌ 还在跑**旧版本** |
| 原因 | 新代码**没有发到 Vercel 生产** |

类比：  
**Word 里改好了文档，但没点「发布」→ 网上还是旧文章。**

我这边**登录 Vercel 的钥匙已过期**（昨天失效），没法替你点发布。你点一次就行。

---

## 3 步发布（大约 3 分钟）

### 第 1 步：打开 Vercel

浏览器打开：

**https://vercel.com/dashboard**

用 **GitHub 账号**登录（当初部署 pikbo 的那个）。

### 第 2 步：找到项目 pikbo

点项目名字 **`pikbo`**（域名应是 pikbo.ai）。

### 第 3 步：Redeploy 最新 main

1. 顶部点 **Deployments**（部署记录）  
2. 最上面一条，看右边 **⋯**（三个点）  
3. 点 **Redeploy**  
4. 如果问 Use existing Build Cache：  
   - 第一次建议 **不勾缓存** / 选 **Redeploy with cleared cache**（更稳）  
5. 确认 **Redeploy**  
6. 等状态变成 **Ready**（绿色，大约 1–3 分钟）

---

## 做完怎么知道成功？

浏览器打开：

**https://pikbo.ai/sitemap.xml**

- **成功：** 里面大约 **13** 个 `<loc>`，并且能看到  
  `figure-360`、`blind-box-reveal`、`one-photo-product` 这类地址  
- **还没成功：** 还是只有 **9** 个地址，还有 `/explore`

或者直接回我说：**「发好了」** —— 我帮你网上检查。

---

## 发布成功后再做（可选，5 分钟）

### Google 收录（Search Console）

1. 打开 https://search.google.com/search-console  
2. 选属性 **pikbo.ai**  
3. 左侧 **Sitemaps** → 提交：  
   `https://pikbo.ai/sitemap.xml`  
4. 完事

### 增长（WorkBuddy）

发版成功后，再把增长提示词丢给 WorkBuddy 跑外链（那是另一件事）。

---

## 如果你找不到 Redeploy

备用路径：

1. Vercel → pikbo → **Settings** → **Git**  
2. 确认 Production Branch = **`main`**  
3. 回 **Deployments**，点最新一次旁边的 **⋯ → Redeploy**

或：GitHub 上对 main 随便空 commit 触发自动部署（有自动连接时）——优先还是 Redeploy 更直接。

---

## 我帮不了 / 帮得了

| 事 | 谁做 |
|----|------|
| 改代码、长尾 SEO、清单 | ✅ 我已做好，在 GitHub |
| 点 Vercel 发布 | ❌ 必须你（或重新登录 Vercel 授权我） |
| 发布后检查是否成功 | ✅ 你说一声，我立刻验 |
| Google 点提交 sitemap | 你点一下（或教你） |

**你现在只需要：Vercel → pikbo → Deployments → ⋯ → Redeploy → 等 Ready。**
