# WorkBuddy 工作队列（GitHub 派工 · 老板/Grok 可写 · WB 必须清空）

**规则：** WorkBuddy 每次启动 **先 pull main**，再读本文件。  
凡 `status: open` 的任务 **必须执行**，完成后改成 `status: done` 并写 `result`，**commit + push**。  
Grok **不能**远程启动你的进程——只能把任务写在这里；**你**要自己跑起来。

---

## OPEN · 立即执行

### WQ-2026-07-27-04 · 24h 外链冲刺（循环直到邮箱/新 free 站出量）

```yaml
id: WQ-2026-07-27-04
status: open
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
  (WB 填；若仍无 EMAIL 写 blocked_secret 但必须仍跑完 free 站)
```

### WQ-2026-07-27-05 · GSC 覆盖率复查（24h 内）

```yaml
id: WQ-2026-07-27-05
status: open
priority: P1
assignee: workbuddy
why: 长尾 5/6 已请求索引；复查是否编入、有无抓取异常
command: |
  Chrome → GSC → 覆盖率/网页索引 → 截图 13 白名单 URL 状态
  写入 docs/growth/runs/GSC-RECHECK-<ts>-report.md + push
result: |
  (WB 填)
```

---

## DONE（最近）

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
