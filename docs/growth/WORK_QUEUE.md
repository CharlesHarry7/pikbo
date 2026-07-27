# WorkBuddy 工作队列（GitHub 派工 · 老板/Grok 可写 · WB 必须清空）

**规则：** WorkBuddy 每次启动先同步 `main`，再读本文件。
凡 `status: open` 的任务必须执行，完成后改成 `status: done` 并写
`result`。WorkBuddy 不得读取生产密钥、改数据库/业务代码、操作
Vercel/Supabase 或直接更新 `main`；需要落盘时提交到获准的
`agent/grok/*` 分支等待审核。
Grok **不能**远程启动你的进程——只能把任务写在这里；**你**要自己跑起来。

---

## OPEN · 立即执行

### WQ-2026-07-27-10 · 收集 GSC / AITDK / 哥飞原始证据

```yaml
id: WQ-2026-07-27-10
status: open
priority: P0
assignee: workbuddy
why: |
  当前只有约 6 次 GSC 展现；intitle 结果不能证明搜索量、竞争或排名。
  收集原始数据，未知值保留 null，不写估算。
deliverables:
  - query/page/date_range/country/device/source
  - impressions/clicks/position 或 AITDK/哥飞 volume/KD 原始值
  - screenshot/export path
  - SERP intent notes
do_not:
  - 宣称 blue ocean、zero competition、already ranking
  - 改 Title/H1、sitemap 或业务代码
  - 打开生产配置或读取密钥
result: |
  (WB 填)
```

---

### WQ-2026-07-27-11 · 核验历史公开 listing 与 backlink

```yaml
id: WQ-2026-07-27-11
status: open
priority: P0
assignee: workbuddy
why: 历史报告记录了 submitted，但没有可审计 published / verified backlink URL
inputs:
  - docs/growth/DIRECTORY_LOG.md
  - docs/growth/runs/*
deliverables:
  - public_listing_url
  - checked_at
  - publication_status: published | not_found | pending
  - backlink_status: verified_backlink | no_crawlable_link | not_applicable
  - screenshot or public URL evidence
do_not:
  - 提交新的泛 AI 目录
  - 把 submitted/pending 计为 backlink
  - 绕过登录、验证码或付费墙
result: |
  (WB 填)
```

---

## DONE（最近）

### WQ-2026-07-27-09 · 生产登录配置（撤销 WorkBuddy 权限）

```yaml
id: WQ-2026-07-27-09
status: cancelled_reassigned
priority: P0
assignee: engineering
reason: |
  WorkBuddy 是只读增长执行，不得访问 Supabase/Vercel 密钥、运行 SQL、
  修改生产配置或 redeploy。认证工作归恢复波次的工程 owner。
result: no WorkBuddy production change authorized
```

### WQ-2026-07-27-08 · 泛 AI 目录持续提交（暂停）

```yaml
id: WQ-2026-07-27-08
status: paused
priority: P2
assignee: workbuddy
reason: |
  重复运行产生了提交记录，但没有 verified backlink 证据。只在老板批准
  潮玩/收藏品/电商卖家相关的限定清单后恢复。
result: no new automated submissions
```

### WQ-2026-07-27-06 · 教老板看 GSC 收录

```yaml
id: WQ-2026-07-27-06
status: done
priority: P0
assignee: workbuddy
prompt: docs/growth/WORKBUDDY_TEACH_GSC_PROMPT.md
why: 老板问谷歌收录了多少、怎么看；需中文手把手教学 + 截图 + report
command: |
  严格按 WORKBUDDY_TEACH_GSC_PROMPT 执行课 0–6；写 GSC-TEACH report + push
result: |
  已完成。老板问"谷歌收录了多少篇了"，WB 用 Chrome CDP 查 GSC + site:pikbo.ai 搜索。
  结果：13 个 sitemap URL 的逐条 URL Inspection 当时显示 indexed；
  site:pikbo.ai 曾显示约 48 的近似结果数，但不是精确收录页数。
  老板追问"咋看的 我怎么不会呢"，WB 提供两种方法教学：
  1) Google 搜 site:pikbo.ai（仅作发现线索，结果数不精确）
  2) GSC → 覆盖范围 → 已编入索引（最准）
  沟通记录见 docs/growth/COMMUNICATION_LOG.md
```

### WQ-2026-07-27-04 · 24h 外链冲刺（循环直到邮箱/新 free 站出量）

```yaml
id: WQ-2026-07-27-04
status: done
priority: P0
assignee: workbuddy
created_by: grok-eng
created_at: "2026-07-27T12:00:00Z"
why: |
  老板要求 24h 赶进度。Deploy/GSC 已 PASS。主战场=外链。
  directories.json 已加 betalist/startupbuffer/microlaunch/open-launch + 蓝海锚文本。
prompt: docs/growth/WORKBUDDY_GROWTH_ONLY_PROMPT.md
command: |
  git pull --ff-only origin main
  export GROWTH_CHROME_CHANNEL=chrome
  # 强烈建议环境已有 PIKBO_GROWTH_EMAIL
  python3 scripts/growth-auto/run_growth.py --all
  可重复跑 fail/captcha（continue 策略）；每次新 RUN_ID report + push
  禁止扩大 sitemap 全站索引
deliverables:
  - docs/growth/runs/<ts>-report.md（submitted 尽量 > prior-only）
  - AGENT_STATE writer=workbuddy
  - commit "[workbuddy] growth sprint: … (no sitemap expand)"
result: |
  Growth run 20260726T190951Z done.
  submitted=3 (insidr, freeaio, aitoolsdirectory — all prior/manual runs)
  captcha=3 (saaspo, startupbuffer, open-launch)
  login_required=7 (awesomeaitools, dang-ai, aivalley, productcool, indietools, builtbyme, betalist)
  paid_skip=3 (startupfa-me, bestaibrands, yaatd); skipped=11 (tap4ai, microlaunch, aitools-fyi, topai-tools, futuretools-io, aitoolnet, bestofai, aitools-inc, theresanaiforthat, toolify, futurepedia)
  fail=5 (aiwizard, aitoolhunt, saasaitools, ai-tools-io, launched-io)
  PIKBO_GROWTH_EMAIL 未设置；Google OAuth RAPT 阻断 login 目录自动化。
  Report: docs/growth/runs/20260726T190951Z-report.md
  AGENT_STATE: writer=workbuddy
```

### WQ-2026-07-27-05 · GSC 覆盖率复查（24h 内）

```yaml
id: WQ-2026-07-27-05
status: done
priority: P1
assignee: workbuddy
why: 长尾 5/6 已请求索引；复查是否编入、有无抓取异常
command: |
  Chrome → GSC → 覆盖率/网页索引 → 截图 13 白名单 URL 状态
  写入 docs/growth/runs/GSC-RECHECK-<ts>-report.md + push
result: |
  GSC recheck 20260727 done via Chrome debug CDP.
  13/13 production sitemap URLs indexed (URL Inspection: 网址已收录到 Google / 网页已编入索引).
  Screenshots: docs/growth/screenshots/gsc-recheck-20260727/
  Report: docs/growth/runs/GSC-RECHECK-20260727-report.md
```

### WQ-2026-07-27-02 · Vercel 发版 + 生产 SEO 验收 + 可选 GSC（替老板点）

```yaml
id: WQ-2026-07-27-02
status: done
priority: P0
assignee: workbuddy
created_by: grok-eng
created_at: "2026-07-27T06:00:00Z"
why: |
  老板不会点 Vercel。生产仍 sitemap 9 + 长尾 noindex；main 已是 13 + 蓝海 TDH。
  WorkBuddy 必须 Chrome/API 完成 Redeploy 并用线上 curl 验收。
prompt: docs/growth/WORKBUDDY_DEPLOY_PROMPT.md
command: |
  严格按 WORKBUDDY_DEPLOY_PROMPT 全文执行：
  pull → deploy prod → verify sitemap 13 + long-tail indexable → GSC if possible
  → growth-auto --all → DEPLOY-*-report.md + push
deliverables:
  - docs/growth/runs/DEPLOY-<ts>-report.md
  - screenshots under docs/growth/screenshots/deploy-*
  - AGENT_STATE writer=workbuddy
  - 本任务 status: done + result
do_not:
  - 问老板怎么点
  - 假报 PASS
result: |
  DEPLOY-20260726T181306Z / main_tip=991fe4d
  生产已满足全部验收标准，无需 redeploy：
  - sitemap=13 (含全部 5 个长尾 slug) ✅
  - blind-box 无 noindex，title="Blind Box AI Video Generator: Reveal From One Photo | Pikbo" ✅
  - figure-360 title="AI Figure 360 Video: Spin From One Photo | Pikbo" ✅
  - ai-toy-video-generator title="AI Toy Video Generator: Turn One Toy Photo into a Video | Pikbo" ✅
  - api/health ok=true degraded=false ✅
  GSC: sitemap 已重提 (success)，5/6 长尾 URL 已请求索引 (1 rate_limited)
  Growth run 20260726T181140Z: submitted=1(prior) captcha=2 login=3 paid_skip=1 fail=5 skipped=9
  Report: docs/growth/runs/DEPLOY-20260726T181306Z-report.md
  Screenshots: docs/growth/screenshots/deploy-20260727/
```

---

### WQ-2026-07-27-01 · 第二轮目录外链（优先 free）

```yaml
id: WQ-2026-07-27-01
status: done
priority: P0
assignee: workbuddy
created_by: grok-eng
created_at: "2026-07-27T04:10:00Z"
why: |
  首轮 20260726T161415Z 流水线通但净外链≈0。
  directories.json 已清洗 paid_skip=free:false，并加 3 个 free 候选。
command: |
  git fetch origin && git pull --ff-only origin main
  export GROWTH_CHROME_CHANNEL=chrome
  # 有则设：export PIKBO_GROWTH_EMAIL=...
  python3 scripts/growth-auto/run_growth.py --all
  # 若 git://github.com:443 不通：python3 scripts/growth-auto/push_via_api.py（若存在）
deliverables:
  - docs/growth/runs/<new-ts>-report.md
  - docs/growth/runs/<new-ts>.jsonl
  - docs/growth/screenshots/<new-ts>/
  - docs/growth/AGENT_STATE.md  writer: workbuddy
  - 本文件本任务 status: done + result 计数
  - git commit -m "[workbuddy] growth run <ts>: N submitted / …" && push main
priority_dirs:
  - awesomeaitools (login — need email)
  - dang-ai (login)
  - aivalley (login)
  - insidr (captcha)
  - aiwizard / aitoolhunt / saasaitools (fail retry)
  - startupfa-me / launched-io / saaspo (new free)
do_not:
  - 问老板确认
  - 等 Grok 传话
  - 改 Create/API 业务代码
  - 提交 pikbo.com
result: |
  Growth run 20260726T181140Z / report docs/growth/runs/20260726T181140Z-report.md
  submitted=1(prior) captcha=2 login=3 paid_skip=1 fail=5 skipped=9 (total=21)
  新提交=0 (PIKBO_GROWTH_EMAIL 未设置，login-wall 目录无法突破)
  PH pack 已刷新 (assets_ready_publish_blocked)
  下一步：老板设 PIKBO_GROWTH_EMAIL 后重跑可解锁 awesomeaitools/dang-ai/aivalley
```

---

### WQ-2026-07-26-01 · 首轮自动化（已完成）

```yaml
id: WQ-2026-07-26-01
status: done
result: |
  d308b46 / report 20260726T161415Z
  submitted=1(prior) captcha=1 login=3 paid_skip=6 fail=4 skipped=3
```

---

## 谁可以加任务

| 谁 | 怎么加 |
|----|--------|
| **Grok** | 顶部 prepend 新 `status: open` 块，push main |
| **老板** | 同左，或把提示词丢给 WorkBuddy 并说「先清 WORK_QUEUE」 |
| **WorkBuddy** | 只改自己任务的 status/result，禁止删别人 open 任务不执行 |
