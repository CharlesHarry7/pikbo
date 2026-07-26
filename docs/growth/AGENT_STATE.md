# Agent State（覆盖写 · 最后写入者生效 · 老板不传话）

```yaml
updated_at: "2026-07-26T16:05:00Z"
writer: grok-eng
protocol: |
  GitHub main = real-time brain. Both agents: pull → read this + HANDOFF + git log → work → commit/push.
  Boss does not relay. Unpushed work does not exist for the other side.
main_tip_note: "git fetch && git log origin/main -15 --oneline for exact SHA"
status: |
  Engineering (grok): agent bus v2 — git log as live activity feed; AGENT_BUS/STATE/WORKBUDDY prompt
  reinforced. Prior on main: growth-auto runner+skill, tools TD CTR, video-first home, download honesty.
  Production softLive on pikbo.ai. No Stripe. No fake UGC.
  Local note: empty growth report skeleton may exist under docs/growth/runs/ (preflight only);
  WorkBuddy should run full --all and overwrite with real results.
next_for_workbuddy: |
  1) git pull --ff-only origin main
  2) read docs/growth/AGENT_BUS.md + this file + git log -30
  3) python3 scripts/growth-auto/run_growth.py --all
  4) update this AGENT_STATE (writer: workbuddy) + runs/*-report.md
  5) commit + push main (or agent/workbuddy/*) — do NOT ask boss to tell Grok
next_for_grok: |
  1) git pull often; treat origin/main log as WorkBuddy live feed
  2) after WB growth push: read latest runs/*-report.md + AGENT_STATE
  3) eng only if growth needs code (TD/copy/product) — then HANDOFF + push
  4) never wait for boss to forward WorkBuddy status
```
