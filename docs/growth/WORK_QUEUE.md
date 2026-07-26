# WorkBuddy 工作队列（GitHub 派工 · 老板/Grok 可写 · WB 必须清空）

**规则：** WorkBuddy 每次启动 **先 pull main**，再读本文件。  
凡 `status: open` 的任务 **必须执行**，完成后改成 `status: done` 并写 `result`，**commit + push**。  
Grok **不能**远程启动你的进程——只能把任务写在这里；**你**要自己跑起来。

---

## OPEN · 立即执行

### WQ-2026-07-27-01 · 第二轮目录外链（优先 free）

```yaml
id: WQ-2026-07-27-01
status: open
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
  (WB 填)
```

---

## DONE（最近）

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
