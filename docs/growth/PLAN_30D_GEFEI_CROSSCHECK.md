# pikbo.ai · 30 天作战计划（哥飞工具箱 × 工程交叉校准）

**日期：** 2026-07-27  
**原则：** 新站优待期 ≈ 14 天 · 有曝光无点击 = 改吸引力 · 外链求量与多样 · **不扩 sitemap 垃圾页 · 不改主词 H1 · 不开 Stripe · 不假 UGC**

---

## 0. 先纠正提示词里的定位错误（必须遵守）

| 错误假设 | 真相 |
|----------|------|
| 站是「免费迷你玩具开箱内容站」 | **Pikbo = 潮玩/手办/盲盒「照片 → AI 短视频」工具**（softLive Free Mini） |
| 核心赛道 = toy unboxing | 核心 = **AI toy video generator** + 垂直长尾（blind box / 360 / one photo / action figure） |
| 应做「best unboxing toys for toddlers」清单页 | 那是 **选购/联盟** 意图，产品接不住 → 浪费优待期与内链 |
| free mini toy unboxing | Free Mini = **试用额度**，不是「迷你开箱玩具 SKU」 |

**正确承接 unboxing 搜索：**  
「不会拍 / 只有一张图 → 生成 reveal/unbox **风格视频**」→ 工具与指南，**不是**玩具导购榜。

→ 为什么：优待期流量若点进「玩具推荐」却落到 AI 生成器，跳出更高，谷歌会认为页不对题。

---

## 1. Grok vs WorkBuddy 分工

| 事项 | **Grok（工程）** | **WorkBuddy（增长）** |
|------|------------------|----------------------|
| Title/Description CTR | ✅ 改 `lib/site.ts` / `lib/tools.ts` / guides（**不动主词 H1**） | ❌ 不改业务代码 |
| 精品落地页 / 指南 | ✅ 写进 `lib/guides.ts` 或 tools，内链到主词页 | 只提交外链指向这些 URL |
| Generate 闭环 / 诚实度 | ✅ 持续 | ❌ |
| Sitemap / 冷启动 13 | ✅ 维护白名单，**禁止全站塞索引** | 只 GSC 提交现有 sitemap |
| 外链目录 / 评论 / 可发就发 | 写 directories.json 候选 | ✅ **主责执行** |
| Guest Post / 社群真实分享 | 可写素材包 | ✅ 浏览器执行 |
| GSC 监控 / 教老板看数 | 写提示词与解读 | ✅ 截图 + 教学 |
| Stripe / T5 / T6 | 等老板密钥 | 不碰 |
| 锚文本 | 定比例写进 plan | 提交时轮换执行 |

**同步通道：** 只认 GitHub `main`（`AGENT_STATE` · `WORK_QUEUE` · `runs/*`）。老板不传话。

→ 为什么：工程改错词 = 产品自杀；增长不 push = 工程看不见。

---

## 2. 第 0–7 天（优待期抢救）— 最高优先级

### 内容侧

| 动作 | 词/页 | → 为什么 |
|------|-------|----------|
| **改 SERP 吸引力** | 首页 Title/D 已偏利益点；主词页保持 **AI Toy Video Generator** 前置；**禁止**为 unboxing 大词改主词 H1 | 0 点击先动 CTR；主词页已是战场，别错改成 free mini / unboxing |
| **上线 1 个精品桥接页** | `/guides/toy-unboxing-video-from-one-photo`（一图生成 unbox/reveal **视频**，收尾进 Generate / blind-box tool） | 接住 unboxing 相关展现，但不做导购榜；KGR/难度低于硬刚 toy unboxing |
| **不写** best unboxing toys for toddlers 清单 | — | 意图=买玩具，产品=生成视频，意图错配 |
| **不写** pure ASMR 站 | 可在桥接页用一小节「安静、特写、慢速 reveal 更像 ASMR 向」链到 soft recipe | ASMR 大词难、且与工具转化弱 |

### 外链侧

| 动作 | 量 | 锚文本 | → 为什么 |
|------|----|--------|----------|
| 目录 + 可提交站「能发就发」 | 目标 **本周 15–40 次尝试**（submitted 不保证） | 70% 品牌（Pikbo / Pikbo.ai）· 30% 行业（AI toy video generator / blind box AI video / one photo toy video） | 哥飞：量 + 多样；新站先让爬虫频繁来 |
| 链到 | 主词 tools 为主，穿插 blind-box tool + 新 guide | 页面多样性 | |
| **必须** | WorkBuddy 设 `PIKBO_GROWTH_EMAIL` | — | 无邮箱 login 墙过不去（已验证） |

### 监控

| 指标 | 好 | 坏 | 坏了怎么办 |
|------|----|----|------------|
| GSC 展现 | 周环比↑ 或 CTR 从 0→>1% | 展现有、CTR 持续 0 | 改 **有展现的那一页** Title/D，不是乱改全站 |
| GSC 点击 | 出现第 1 次真点 | 优待期结束仍 0 点 | 查 query 是否全是错词；加强主词页与桥接页差异 |
| 收录 | 13 白名单保持 | 核心 URL 掉索引 | 网址检查 + 内链加固 |
| 外链尝试 | 每天有 push report | 连续 3 天 0 尝试 | 换目录 / 查自动化挂了 |

→ 为什么：优待期考核的是「露脸后有没有人点、点了有没有用」。

---

## 3. 第 8–14 天（优待期末 / 可能变凉）

### 内容侧

| 动作 | 词 | → 为什么 |
|------|-----|----------|
| 巩固主词页内链 | 从 about、guides、home mesh 指回 rank tool | 权重与爬取 |
| 第 2 精品页 | 已有 `designer-toy-ai-video-vs-generic`；补强 FAQ 或新写「listing video from one photo for Etsy sellers」变体若 GSC 有相关 query | 跟数据走，不跟感觉 |
| 明确放弃 | toy unboxing 进前十幻想 | KD/盘面不可破 |

### 外链侧

| 类型 | 量 | → 为什么 |
|------|----|----------|
| 目录续跑 + 评论/论坛能发则发 | 尝试 **30+** | 哥飞量优先 |
| 1 篇 Guest / 工具站介绍（若有） | 1 | 类型多样性 |
| 锚文本 | 60% 品牌 · 40% 行业（略提行业） | 开始要一点词相关 |

### 监控

| 信号 | 含义 |
|------|------|
| 展现骤降 | 优待期结束常态 → 外链+内容别停 |
| 有点击无转化 | 产品路径/文案问题 → Grok 查 Generate 闭环 |
| 有点击有停留 | 加码同词簇内页（仍不扩 sitemap 垃圾） |

---

## 4. 第 15–21 天（冷启动）

### 内容侧

| 动作 | → 为什么 |
|------|----------|
| 每周 **1** 精品页或深度更新旧 guide | 稳定频率 > 日更垃圾 |
| 用 GSC 查询报告选题（有曝光的长尾优先） | 数据驱动 |
| 仍不做 toddlers 买玩具榜 | 意图错配 |

### 外链侧

| 动作 | → 为什么 |
|------|----------|
| 周尝试 **20–40**；类型混：目录 + 书签 + 可发社区 | 多样性 |
| 开始给 **内页** 外链（tools 长尾 + guide） | 页面多样性 |

### 监控

| 好 | 坏 |
|----|----|
| 出现非品牌点击 | 只剩品牌 0 量 |
| 主词 tools 有展现 | 全站只有 noindex 薄页被抓 |

---

## 5. 第 22–30 天（复盘与加码）

| 侧 | 动作 | → 为什么 |
|----|------|----------|
| 内容 | 复盘 30 天 Top query；加强 CTR 前 3 页 | 把优待期教训固化 |
| 外链 | 维持节奏；淘汰废站；PH 素材已有则评估发布 | 付费目录仍谨慎 |
| 产品 | softLive 稳定；仍不开 Stripe 除非有搜索信号+老板令 | 哥飞节奏 |
| 决策 | 是否把 **1 个** 高表现 guide 升入冷启动 sitemap（仅当有 proof 与内链） | 克制扩索引 |

---

## 6. 三个「提示词方向」词怎么处理（最终裁决）

| 词 | 是否做落地页 | 做法 |
|----|--------------|------|
| best unboxing toys for toddlers | **不做导购页** | 若以后做内容营销，最多 blog「拍 toddler 玩具视频要注意」，链到工具；现在不做 |
| free mini toy unboxing | **不做成开箱玩具 SKU 页** | Free Mini = 试用；文案在 soft launch + free limits guide；可在 unboxing-video guide 解释 Free Mini |
| toy unboxing ASMR | **不做纯 ASMR 站** | 桥接页一节：慢速、近景、静音向 reveal 配方 → Generate |

**统一落地：**  
`/guides/toy-unboxing-video-from-one-photo` + 收尾 CTA → `/tools/blind-box-reveal-video-maker` 与 `/tools/ai-toy-video-generator`

→ 为什么：同一产品、同一意图簇（「开箱感视频」），避免三套互相抢流量的假页面。

---

## 7. WorkBuddy 本周执行清单（复制即可）

见 `docs/growth/WORKBUDDY_30D_WEEK1_PROMPT.md`（若存在）或：

1. `PIKBO_GROWTH_EMAIL` 必配  
2. 每日 `run_growth.py --all`，链主词 + blind-box + unboxing guide  
3. 锚文本 70/30 品牌/行业  
4. GSC：看查询报告里 6 次展现是谁；截图 push  
5. **禁止** 改 sitemap 扩全站  

---

## 8. Grok 本周执行清单

1. 上线 unboxing-video 桥接 guide（诚实）  
2. 主词/首页 SERP 仅 CTR 微操（不改主词 H1）  
3. Generate 闭环与诚实度持续  
4. 解读 GSC 截图，决定是否再改哪页 Title  

---

**一句话：**  
哥飞工具箱的「优待期 + 0 点击危险 + 外链要量 + 别硬刚 unboxing 大词」**全听**；「站是 unboxing 内容站 / 做 toddlers 选购榜 / 主词改 free mini」**不听**。  
Grok 管页与产品，WorkBuddy 管链与 GSC 执行，GitHub 同步。
