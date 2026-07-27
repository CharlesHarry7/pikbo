# 复制即派 · 紧急止血（2026-07-23）

仓库：https://github.com/CharlesHarry7/pikbo
先 `git pull origin main`。

---

## ① 粘贴给 GPT（Codex 产品模式）

```
【紧急 · NO-GO 公开上线 · GPT 规格 · 立刻做】

git pull origin main
git checkout -B agent/gpt/go-no-go-soft

必读：
- docs/BRUTAL_EXPERT_ROAST_2026-07-23.md
- docs/prd/GO_NO_GO.md
- docs/prd/SOFT_LAUNCH.md
- docs/DISPATCH.md
- docs/ROLES.md

交付（docs only，今天推完）：

1) 完善 docs/prd/GO_NO_GO.md
   - 公开上线 = NO-GO 的理由（引用 roast 证据）
   - G1–G9 每条：Pass 标准 + 如何测 + 负责人
   - 「内测预览 URL」vs「pikbo.ai 公开」两档定义

2) 新建 docs/prd/SOFT_NAV_AND_PRESETS.md
   - Soft 期允许露出的导航白名单（≤6 主入口）
   - 必须隐藏/降级的入口列表
   - 首页主推恰好 8 个预设 slug + 禁止 shared-loop 墙
   - 页脚/内链允许 URL；404 删或补的决策表

3) 更新 docs/prd/SOFT_LAUNCH.md：公开 GO 门槛，周日无条件上作废
4) 更新 docs/STATUS.md + docs/HANDOFF.md

禁止改 app/api、session、credits、Stripe。
commit [gpt] + push。写完在 HANDOFF 写「Claude 可按白名单开工」。
```

---

## ② 粘贴给 Codex（文案模式 · 规格后或可先安全文案）

```
【紧急 · 壳诚实文案 · Codex · 立刻】

git pull origin main
git checkout -B agent/gpt/shell-honesty-copy

必读：docs/prd/GO_NO_GO.md、docs/DISPATCH.md、docs/BRUTAL_EXPERT_ROAST_2026-07-23.md
若存在 docs/prd/SOFT_NAV_AND_PRESETS.md 以它为准。

只改正文案/内容字符串（presentation）：
1) 首页首屏 ICP：一张自有潮玩照片 → 5s 可发 TikTok/Etsy 的片；Free Mini；No card。去掉 Seedance-ready / when live generation is enabled 工程腔
2) meta description + OG 同步
3) Lab/Community/Feed：Official demos / PIKBO Lab，禁止真 UGC 暗示
4) 若 Models 等仍可见：Preview/Soon，不承诺可用
5) Pricing 保持 Coming soon；扫 unlimited / guaranteed conversion
6) Library：this browser only

禁止 API/session/credits/大 CSS 重构。
eslint 相关文件；commit [gpt] + push + HANDOFF。
```

---

## ③ 粘贴给 Claude（工程 · 可与 GPT 并行）

```
【紧急 · 壳止血 · Claude 写代码 · 立刻】

git pull origin main
git checkout -B agent/claude/shell-triage

必读：docs/BRUTAL_EXPERT_ROAST_2026-07-23.md、docs/DISPATCH.md、docs/prd/GO_NO_GO.md
有 SOFT_NAV_AND_PRESETS.md 跟白名单；没有则用默认：

主栏仅：Explore · Create · Effects · Lab · Pricing · Generate
其余进 More 或软隐藏。

P0：
1) AppShell/移动底栏砍空门
2) 首页主推 ≤8 预设，禁止同一 demo 刷墙
3) 全站链接：/for/* 404 删链接或补最小页
4) 视频 preload=metadata，视口外不播，同时 ≤2
5) 生产 devTopup 必须关
6) lint + build 绿

禁止 Stripe、假多模型、卖家包 scope。
commit [claude] + push，@Grok 合流。
```
