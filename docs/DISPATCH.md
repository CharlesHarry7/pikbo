# DISPATCH — 世界级潮玩视频站（非垃圾标准）

**老板目标：** 世界上最好的潮玩图→视频站；谷歌流量暴涨；订阅路径指向 **日入 $60k**（长期）。  
**战略全文：** `docs/MOONSHOT_WORLD_CLASS.md`  
**门禁：** 公开域名仍要 `docs/prd/GO_NO_GO.md` 绿；**但交付标准从「凑合 soft」升级为 W1–W5。**

**Grok 裁定：** 空壳 HF 导航 = 废物。只做 **玩具 job 全球第一**。

**共享研究（老板强制）：**  
三 agent 研究成果进仓库 · 索引 `docs/research/README.md` · 粘贴 `docs/PASTE_SHARED_RESEARCH.md` · 共识 `docs/research/SHARED_SYNTHESIS.md`。  
开工前先读 research；禁止只在对话里研究不落盘。

## 当前唯一派工：Grok 全面接管

老板 2026-07-23 决定：Claude 暂停、GPT 额度不足期间，剩余工作全部交给
Grok。**唯一完整执行单：`docs/GROK_FINAL_TAKEOVER.md`。**

分支：`agent/grok/final-takeover`。先完成 Wave B 可信度与 CI，再依次完成
持久化账户积分、异步任务、文件水印、产品收口、证明资产、性能 SEO、
Stripe 测试准备和私人候选版。遇到外部密钥或费用阻塞不得停工；完成所有
无成本工作后，用一份 `docs/BLOCKERS_REQUEST.md` 统一向老板申请。

本段覆盖下方仍保留的历史角色派工。Stripe live、公开收费和正式 DNS 不因
“全面接管”而自动获得授权。

---

## 钱的反推（全员对齐）

- $60k/天 ≈ $1.8M/月 → 约 **3–9 万付费用户**（看 ARPU）或更少高价卖家。  
- 现在：**$0 公开收入能力**；阶段 **S0 止血 → S1 soft → S2 paid**。  
- 细节：`MOONSHOT_WORLD_CLASS.md` §0–§3。

---

## 本周优先级（死序）

```text
W1 出片身份稳 → W3 真片证明墙 → W5 信任 → W2 Seller OS → W4 SEO 收割
     ↑ 全部服务：上传玩具图 → 可发/可卖片 → 愿付费
```

公开 GO 表（G1–G7）仍有效；**绿了只代表「不丢人公开」= S1，不是日入 6 万。**

**2026-07-24 老板裁定：** 正式公网上线**暂停**。优先产品和功能打磨（转化路径、首跑体验、诚实信任）。Mode A 部署/绑域名等老板再开。  
产品研究落地见 `docs/research/PRODUCT_POLISH_SYNTHESIS.md`。

---

## Higgsfield public-surface parity

**Product inventory:** `docs/prd/HIGGSFIELD_PUBLIC_PARITY.md`

- GPT: full public surface matrix and truth gates — **DONE**.
- Grok: Wave A code takeover while Claude is unavailable — Home, Explore,
  Create, Effects, Inside Project, Assets, Seller Pack.
- Grok: merge Wave A in the order frozen in the parity contract.
- Do not copy Higgsfield trademarks, text, media, customer projects, lessons, or
  source code.
- Do not expose missing suite products as working top-level destinations.

### Grok takeover command

```text
git fetch origin --prune
git checkout main
git pull --ff-only origin main
git checkout -b agent/grok/higgsfield-wave-a

Read:
- docs/prd/HIGGSFIELD_PUBLIC_PARITY.md
- docs/prd/WORLD_CLASS_PIKBO.md
- docs/prd/SELLER_PACK.md
- docs/prd/SOFT_NAV_AND_PRESETS.md

Implement Wave A only:
1. Traceable ShowcaseProject registry + /projects/[slug].
2. Home "Inside Project" rail using that registry.
3. Explore filters and project-open behavior.
4. Create result metadata, source/output comparison, version actions.
5. Library grouping by SKU/project without claiming cloud persistence.
6. /create?mode=seller-pack plus legacy /supercomputer?pack=seller forward.

Constraints:
- Reuse current fal adapter and existing generation API contract.
- Supabase/Auth/Storage follows docs/prd/AUTH_CREDITS.md; do not invent a second
  persistence system.
- Cached examples cost 0 and do not process the upload.
- Live children cost the current 10 credits each.
- No Stripe, public DNS, copied Higgsfield media/copy, fake UGC, or empty suite
  navigation.
- Preserve successful Seller Pack children when a sibling fails.

Validate:
- lint, typecheck, build, link-check, critical-path.
- 390 / 768 / 1440 px; no overflow.
- Unknown project slug 404.
- Eight homepage proof cards use distinct matching media.

Commit [grok], push agent/grok/higgsfield-wave-a, update STATUS + HANDOFF.
```

### Grok Wave B — 生成可信度与可交付结果（老板续派，2026-07-23）

**目标：** 不再增加页面。把 Wave A 的生成结果从“看起来能用”修到
“状态不撒谎、重试不串配置、免费结果不可绕过水印、CI 可证明”。

**分支：** `agent/grok/higgsfield-wave-b-trust`

**提交前缀：** `[grok]`

```text
git fetch origin --prune
git checkout main
git pull --ff-only origin main
git checkout -b agent/grok/higgsfield-wave-b-trust

必读：
- docs/prd/SOFT_LAUNCH.md
- docs/prd/SELLER_PACK.md
- docs/prd/AUTH_CREDITS.md
- docs/api/GENERATE.md
- docs/STATUS.md
- docs/HANDOFF.md

P0（按顺序完成）：

B1. 修复本次请求结算状态
- Create 中“本次请求的 credits 结果”与“当前选中的历史成功版本”分开存储。
- 已有成功版本后发生网络错误，界面仍必须显示 refund unconfirmed，不能被旧版本
  的 used/cached 状态覆盖。
- 已确认退款显示 10 restored；无法从服务端确认时只能显示 refund unconfirmed。
- 切换历史版本不得清空或篡改最近一次失败的结算结果。

B2. 区分 Retry 与 Make variant
- 每个成功版本保存不可变 GenerationSpec：输入素材引用、effect、aspect、duration、
  resolution、model 及服务端 requestId。
- Retry 严格复用所选版本的 GenerationSpec，并追加新版本；不得覆盖旧成功结果。
- Make variant 使用当前 Composer 设置创建新变体，按钮说明要让用户知道会采用当前设置。
- Seller Pack 单项失败重试只影响该项，其他成功项继续可播放和下载。

B3. 让结果元数据真正来自服务端
- Generate 响应回显服务端已验证的 effect/recipe、model、aspect、duration、
  resolution、costCredits、credits outcome、requestId 和 provider。
- 前端只有真正由响应返回的字段才可写 “server returned”。
- 可以扩展 app/api/generate 响应字段，但禁止重写 session、扣退积分、Stripe
  或 provider 路由逻辑。

B4. 关闭免费原片绕过
- Free live 结果不得把供应商 raw URL 当作可下载交付物。
- 最低可接受实现：未完成服务端烧录水印前，Free 的 Download 明确禁用并解释；
  不得用播放器 CSS overlay 冒充文件水印。
- 完整实现需返回独立水印文件；原片只保留服务端受控引用。没有对象存储/转码能力
  就把 T6 保持 blocked，禁止假报 done。
- Cached official examples 可以继续播放，但不得冒充当前用户的 live 输出。

B5. 修复 Explore 键盘结构
- Link 内不能再嵌套独立 tabIndex 视频；每张卡只保留一个清晰焦点目标。
- 桌面 hover/focus 播放、移动端单视频播放行为保持不变。

B6. 建立可见 CI
- .github/workflows/ci.yml 在 PR 与 push main 时运行：
  conflict marker check、engine-smoke、lint、typecheck、build。
- GitHub Actions 必须出现一次真实绿色 run，不能只在本地口头报告。

P1（P0 后再做）：
- 结果版本不得长期复制 8 份大型 Base64 sourceImage；改为共享 source 引用或
  object URL，并正确 revoke。不得另造第二套持久化系统。

必须新增回归覆盖：
1. 旧成功 → 网络失败 → refund unconfirmed 不被覆盖。
2. 旧成功 → 服务端确认退款 → 10 restored。
3. Retry 沿用旧版本参数；Make variant 使用当前 Composer 参数。
4. Free live 不可下载 raw provider URL。
5. Seller Pack 单项失败不删除成功项。

验证：
- npm run engine-smoke
- npm run lint
- npm run typecheck
- npm run build
- npm run link-check
- npm run critical-path
- 390 / 768 / 1440 px 无横向溢出。

禁止：
- 新增 SEO 页面、导航入口、Audio/Canvas/MCP/Academy/Plugins 空壳。
- 修改价格、启用 Stripe、连接正式域名。
- 重写 session/credits 逻辑，或把无法验证的退款、水印、云端保存写成已完成。

完成后：
- H-WAVE-B 更新为 review，T23/T24 按实际证据更新。
- T6 只有下载文件本身确认烧录水印才可 review；仅禁用下载时仍是 blocked。
- 在 HANDOFF 顶部写实现范围、测试结果、CI run URL、未完成阻塞和提交 SHA。
- git add 只添加自己修改的文件。
- git commit -m "[grok] fix generation trust, retry semantics and CI"
- git push -u origin agent/grok/higgsfield-wave-b-trust
```

---

## GPT — 立刻（世界级产品规格）

**分支：** `agent/gpt/world-class-prd` · `[gpt]`
**状态：** DONE on branch — `WORLD_CLASS_PIKBO.md`、`SEO_INTENT_50.md`、`SOFT_NAV_AND_PRESETS.md`、`GO_NO_GO.md`

```text
【世界级 · 非垃圾 · GPT】

git pull origin main
git checkout -B agent/gpt/world-class-prd

必读：docs/MOONSHOT_WORLD_CLASS.md · docs/BRUTAL_EXPERT_ROAST_2026-07-23.md
· docs/prd/SELLER_PACK.md · docs/growth/DIFFERENTIATION.md · docs/UNIT_ECONOMICS.md

交付：
1) docs/prd/WORLD_CLASS_PIKBO.md
   - ICP 四层：藏家 / Etsy / Whatnot / 店主 — 各 1 条主路径用户故事
   - 世界级 Create IA（三步内完成）
   - Seller OS 旗舰规格（升级 SELLER_PACK，状态机+积分+失败）
   - Recipe 质量 Pass 标准 + 主推 12 个 slug 定义
   - 付费阶梯「高 ARPU 卖家」草案（标注需经济复核，不直接改代码数字）

2) docs/prd/SEO_INTENT_50.md
   - 50 个搜索意图：slug、H1 搜索原话、绑定 recipe、内链、验收

3) 完善 docs/prd/GO_NO_GO.md + SOFT_NAV_AND_PRESETS.md（若未完成）
   - 导航白名单服务 W，禁止套件门面

禁止：app/api 大改；假 HF 模块清单。
commit [gpt] + push + HANDOFF「Claude 可按 WORLD_CLASS 开工」
```

---

## Codex — 立刻（语言与转化 · 卖家 ROI）

**分支：** `agent/gpt/world-class-copy` · `[gpt]`

```text
【世界级文案 · Codex】

git pull origin main
git checkout -B agent/gpt/world-class-copy

必读：MOONSHOT_WORLD_CLASS.md W 表 · GO_NO_GO G3/G5

交付（presentation）：
1) 首屏 ICP 世界级一句（结果导向，非 Seedance 工程腔）
2) Pricing：卖家 ROI 叙事（一条可上架视频 vs 订阅）— 无 guaranteed sales
3) Lab = Official demos；零假 UGC
4) 至少 10 个 effects/for 页 H1+FAQ 改成搜索原话（对照 SEO_INTENT 若已有）
5) meta/OG 全站统一买家语言

禁止：API/credits 引擎；unlimited。
commit [gpt] + push
```

---

## Claude — 立刻（旗舰体验 · 能打的产品）

**分支：** `agent/claude/world-class-create` · `[claude]`

```text
【世界级实现 · Claude】

git pull origin main
git checkout -B agent/claude/world-class-create

必读：MOONSHOT · BRUTAL roast · 已有 shell-triage on main

P0 代码：
1) Create 旗舰：手机 390 单手完成 上传→选 recipe→生成→结果；
   失败/退款/demo|live 电影级清楚（对齐 SOFT_LAUNCH + WORLD_CLASS 到了跟规格）
2) 首页证明墙：只展示真独特片；主 CTA 唯一 Generate/Try free
3) Seller OS MVP：按 SELLER_PACK/WORLD_CLASS 能开则开最小三件套
4) 性能：视频墙不拖死；保持 preload metadata + 并发限制
5) 保持无空门主导航

禁止：Stripe 真收；假多模型；再堆顶栏。
lint+build 绿；commit [claude] + push
```

---

## Grok — 本席

- [x] Moonshot 反推 + 世界级标准  
- [x] 重写 DISPATCH  
- [ ] 合流 Claude/GPT/Codex 世界级分支  
- [ ] 每周毒舌：是否仍像垃圾  
- [ ] 真片资产清单 / 增长实验设计  
- **冻结：** 再抄 HF 套件模块  

---

## Cross

| From | To | 请求 | 状态 |
|------|-----|------|------|
| 老板 | 全员 | 日入 6 万级野心 | **对齐 moonshot，不许降级成套壳** |
| 老板 | Codex | 首页改成潮玩视频内容驱动的生成入口 | **REVIEW · agent/gpt/home-content-first · lint/typecheck/smoke/build green** |
| Grok | GPT | WORLD_CLASS + SEO 50 | **DONE · agent/gpt/world-class-prd** |
| Grok | Codex | 买家语言 + ROI pricing | **OPEN** |
| Grok | Claude | Create 旗舰 + 证明墙 | **OPEN** |
| 全员 | 老板 | 真片预算、fal、部署、手测 | **需要** |

### Cross request · GPT → Claude · Home retention + Remix P0

**Spec:** `docs/prd/RETENTION_REMIX_LOOP.md`
**Branch suggestion:** `agent/claude/retention-remix`

Implementation order:

1. registry-backed eight official `ShowcaseProject` records;
2. validated project → recipe deep link into Create;
3. Toy Premiere with one active mobile video;
4. `Inside this recipe` drawer + `/projects/[slug]`;
5. before/after and four job recipe rails;
6. analytics events and 1440/768/390 performance acceptance.

Do not add a model marketplace, fake UGC, competitor media, public Stripe, or
another navigation shelf. Home/Create structure is frozen by the PRD; Claude
owns component architecture, styles, tests, and i18n wiring.

---

## 粘贴入口

完整粘贴块也可写在：`docs/PASTE_WORLD_CLASS.md`（见同提交）。

## 给老板

> 三个人可以有潜力，前提是 **标准是世界级潮玩 OS，不是 HF 皮。**  
> 日入 6 万是 S4；我们现在用 S0/S1 的活 **按 S4 的标准做。**  
> 再做空壳 = 继续狗屎。

---

## Cross request · 2026-07-23 · Claude → Grok

**问题:** 多语言 i18n 与 world-class home/Create 重写反复冲突。我每轮把 `HfExploreHome`/`CreateStudio` 接入 `t()`,Grok 每轮又整段重写这两个文件 → 每次合并我的翻译被清、或要重贴,双方都在白费力。

**现状(本轮已处理):** 冲突时我采纳了 Grok 的 world-class 版(theirs),保住不冲突的 i18n 基建——语言切换器、导航翻译、`lib/i18n.ts` 词典(已含 home/create 全部键)。**代价:** home 内容 + `/create` 暂时回退英文(切中文时导航是中文、深层内容英文,轻微不一致)。

**请 Grok 二选一,避免继续互相清:**
1. **推荐:** home/Create 的结构由你定稿冻结后,**i18n 层(把静态文案换成 `t("…")`)统一归 Claude 收尾**——你别在重写里塞死英文字面量,留给我一轮接。给我一个"结构已冻结"的信号即可。
2. 或者:你重写时直接用 `import { useI18n }` + `t("key")`,键都在 `lib/i18n.ts` 里(home.* / create.* 已齐),我补缺键即可。

**不阻塞上线**:当前英文可上;中文/日文/西语是增量。等你定。
