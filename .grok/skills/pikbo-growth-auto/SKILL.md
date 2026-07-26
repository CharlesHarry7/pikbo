---
name: pikbo-growth-auto
description: Fully automated Pikbo growth execution (AI directories, PH assets, browser submissions) with Chrome/Playwright. No human-in-the-loop. Use when WorkBuddy or agents run soft-launch growth for pikbo.ai.
---

# Pikbo Growth Auto (100% unattended)

## Coordination with engineering (Grok) — boss is NOT a messenger

1. **Source of truth = GitHub `main`** (remotes may be `guochao950518-wq/pikbo` or `CharlesHarry7/pikbo`).
2. **Real-time activity feed** = `git log origin/main --oneline -30` (Grok’s commits = what eng just shipped). Unpushed work does not exist for the other side.
3. **Always** before work:
   ```bash
   git fetch origin && git pull --ff-only origin main
   git log origin/main --oneline -30
   ```
   Then read `docs/growth/AGENT_BUS.md`, `docs/growth/AGENT_STATE.md`, `docs/HANDOFF.md` (first 40 lines), latest `docs/growth/runs/*-report.md`.
4. After every run: update `AGENT_STATE.md` (`writer: workbuddy`), commit growth artifacts with a scannable message (`[workbuddy] growth run <ts>: N submitted / M captcha`), **push** so Grok sees it without the boss.
5. Never ask the boss to “tell Grok”, “forward logs”, or “confirm eng status” — pull the repo instead.

## Hard rules

1. **Domain is only `https://pikbo.ai`** — never submit `pikbo.com`.
2. **No human questions mid-run.** Missing secrets → mark step `blocked_secret`, continue other steps.
3. **No Stripe, no product code changes, no new SEO pages** — only `scripts/growth-auto/**` + `docs/growth/**` (+ AGENT_STATE).
4. **No fake UGC / multi-model claims** in any form text.
5. Prefer **browser automation** (Playwright Chromium or system Chrome CDP). Headless OK; headed if CAPTCHA rate is high and `GROWTH_HEADED=1`.
6. Every action writes a row to `docs/growth/runs/*.jsonl` + screenshot under `docs/growth/screenshots/`.
7. Cap runtime: stop after `GROWTH_MAX_MINUTES` (default 90) and write final report.
8. **Push results to GitHub** before exit (main or `agent/workbuddy/growth-*`).

## Product copy (paste into forms)

| Field | Value |
|-------|--------|
| Name | Pikbo |
| URL | https://pikbo.ai |
| Rank URL | https://pikbo.ai/tools/ai-toy-video-generator |
| Tagline | Turn one designer-toy photo into a short AI video |
| Description | Pikbo is an AI video suite for designer toys, blind boxes, and figures. Upload one owned product photo, pick a recipe (360° spin, unbox, float), generate a short clip for listings and social. Free Mini trial — no card. Soft launch: Seedance Mini, honest limits, no fake multi-model zoo. |
| Categories | AI Video, Image to Video, Generative AI, E-commerce |
| Email | from env `PIKBO_GROWTH_EMAIL` |
| Twitter/X | @pikbo_ai if asked |
| Pricing | Free trial / freemium |

### Anchor text rotation

70% brand / 30% keyword-variant — cycle:

1. `Pikbo`
2. `Pikbo.ai`
3. `Pikbo — AI toy video generator`
4. `AI toy video generator by Pikbo`
5. `toy video from one photo`

## Entrypoint (must run)

```bash
# From repo root
python3 scripts/growth-auto/run_growth.py --all
# or phases:
python3 scripts/growth-auto/run_growth.py --phase directories
python3 scripts/growth-auto/run_growth.py --phase ph-assets
python3 scripts/growth-auto/run_growth.py --phase report
```

If Playwright missing:

```bash
python3 -m pip install --user playwright
python3 -m playwright install chromium
```

## Phases

### Phase 0 — Preflight (no browser)

- Assert network can reach `https://pikbo.ai` (HTTP 200).
- Load `scripts/growth-auto/directories.json`.
- Create run id + log files.
- Read secrets from env (never prompt):
  - `PIKBO_GROWTH_EMAIL`
  - `PIKBO_GROWTH_PASSWORD` (if any directory needs login)
  - `PIKBO_GSC_PROPERTY` (default `https://pikbo.ai/`)
  - `GOOGLE_APPLICATION_CREDENTIALS` (optional GSC API)
  - `GROWTH_HEADED=1` for headed Chrome
  - `GROWTH_MAX_MINUTES=90`

### Phase 1 — AI directories (browser)

For each entry in `directories.json`:

1. Navigate submit URL.
2. Screenshot full page → `docs/growth/screenshots/{run}/{slug}-01.png`.
3. Heuristically find form fields (name/url/description/email/tags).
4. Fill with product copy; submit.
5. Detect success text / thank-you / captcha / login wall.
6. Log status: `submitted` | `login_required` | `captcha` | `fail` | `skipped`.
7. On captcha: if no solver, screenshot + status `captcha` + **continue** (do not hang forever; max 60s wait).
8. Never ask the user to solve captcha.

### Phase 2 — Product Hunt assets (no publish without token)

- Write complete PH package to `docs/growth/producthunt_pack.md` (tagline, body, maker comment, gallery checklist).
- If `PRODUCTHUNT_TOKEN` or maker cookies path present, attempt draft via API/browser; else status `assets_ready_publish_blocked` (still automated deliverable).

### Phase 3 — GSC snapshot (API if available)

- If Google credentials exist: fetch Search Analytics for last 28d for queries containing `toy` / `pikbo` / `video generator`.
- Else: open GSC in browser only if cookies file `GROWTH_CHROME_USER_DATA` is set; scrape performance table; else log `gsc_no_credentials` and generate empty template for boss later **without stopping other phases**.

### Phase 4 — Report

Write `docs/growth/runs/{date}-report.md`:

- Directory results table
- PH pack path
- GSC summary or blocked reason
- Next auto-run suggestions
- **Never** leave “waiting for user”

## Success criteria (for one unattended run)

- ≥1 directory attempt fully automated end-to-end (submit or clear terminal status)
- PH pack file written
- Run JSONL + report exist
- Zero interactive prompts

## Failure policy

| Failure | Action |
|---------|--------|
| Site down | Abort with report |
| Single directory fail | Continue |
| Captcha | Mark + continue |
| No secrets | Skip gated steps, finish report |

## Related

- Agent bus: `docs/growth/AGENT_BUS.md`
- Shared state: `docs/growth/AGENT_STATE.md`
- Prompt for agent boot: `docs/growth/WORKBUDDY_AUTO_PROMPT.md`
- Config: `scripts/growth-auto/directories.json`
- Runner: `scripts/growth-auto/run_growth.py`
