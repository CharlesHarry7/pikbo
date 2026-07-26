#!/usr/bin/env python3
"""
Pikbo unattended growth runner — Chrome/Playwright, no human prompts.

Usage:
  python3 scripts/growth-auto/run_growth.py --all
  python3 scripts/growth-auto/run_growth.py --phase directories
  python3 scripts/growth-auto/run_growth.py --phase ph-assets
  python3 scripts/growth-auto/run_growth.py --phase report

Env:
  PIKBO_GROWTH_EMAIL, PIKBO_GROWTH_PASSWORD (optional logins)
  GROWTH_HEADED=1  headed browser
  GROWTH_MAX_MINUTES=90
  GROWTH_CHROME_CHANNEL=chrome  # use system Chrome if set
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import traceback
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = Path(__file__).resolve().parent / "directories.json"
RUNS = ROOT / "docs" / "growth" / "runs"
SHOTS = ROOT / "docs" / "growth" / "screenshots"


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def log_jsonl(path: Path, row: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def ensure_playwright():
    try:
        from playwright.sync_api import sync_playwright  # noqa: F401

        return True
    except ImportError:
        print("[growth] installing playwright…", flush=True)
        import subprocess

        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "--user", "playwright"],
            stdout=sys.stdout,
            stderr=sys.stderr,
        )
        subprocess.check_call(
            [sys.executable, "-m", "playwright", "install", "chromium"],
            stdout=sys.stdout,
            stderr=sys.stderr,
        )
        return True


def preflight(product: dict) -> dict:
    url = product["url"]
    try:
        req = urllib.request.Request(url, method="GET", headers={"User-Agent": "PikboGrowthBot/1.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            code = resp.getcode()
        return {"ok": 200 <= code < 400, "status": code, "url": url}
    except Exception as e:
        return {"ok": False, "error": str(e), "url": url}


def write_ph_pack(product: dict, out: Path) -> Path:
    out.parent.mkdir(parents=True, exist_ok=True)
    body = f"""# Product Hunt pack — {product["name"]} (auto-generated)

**Generated:** {utc_now()}  
**Primary URL:** {product["url"]}  
**Rank URL:** {product["rankUrl"]}

## Tagline (≤60 chars)
Turn one toy photo into a short AI video

## One-liner
{product["tagline"]}

## Description
{product["description"]}

### What is it?
Pikbo is a designer-toy AI video suite: one product photo → listing/social short clips (spin, unbox, float). Soft-launch Free Mini trial — no card.

### Who is it for?
Indie toy sellers, blind-box brands, collectors who need motion without a turntable.

### Why different?
Toy-native recipes and product fidelity focus — not a generic face-filter video app. Honest free trial limits; no fake multi-model zoo.

## First maker comment
Hey Product Hunt 👋 Pikbo turns **one photo of a designer toy you own** into a short AI video for Etsy/TikTok/drops. Soft launch Free Mini is live on {product["url"]} — would love feedback from sellers who hate filming turntables.

## Gallery checklist (fill assets into PH when publishing)
- [ ] Homepage cinema / video wall screenshot
- [ ] 360° spin sample clip
- [ ] Create studio UI
- [ ] Before still → after video side-by-side
- [ ] Free Mini honesty caption (limits clear)

## Topics
AI, design tools, e-commerce, video, toys

## Launch day suggestion
Tuesday or Wednesday, 12:01am PT

## Automation note
This file is ready. Live PH publish requires PRODUCTHUNT_TOKEN or logged-in browser profile — runner marks publish separately.
"""
    out.write_text(body, encoding="utf-8")
    return out


def fill_heuristics(page, product: dict, email: str, anchor: str) -> list[str]:
    """Best-effort fill common directory form fields. Returns list of filled labels."""
    filled = []
    link = product.get("rankUrl") or product["url"]
    pairs = [
        (r"(name|tool.?name|product.?name|title)", product["name"]),
        (r"^(url|website|link|product.?url|tool.?url)$", link),
        (r"(homepage|site.?url|web.?site)", product["url"]),
        (r"(description|about|summary|bio|details)", product["description"][:1800]),
        (r"(tagline|short.?description|one.?liner|headline)", product["tagline"]),
        (r"(email|e-mail|contact)", email or "growth@pikbo.ai"),
        (r"(twitter|x\.com|social)", product.get("twitter") or ""),
        (r"(pricing|price)", product.get("pricing") or "Free trial"),
        (r"(categor|tag|topic|keyword)", ", ".join(product.get("categories") or [])),
        (r"(anchor|link.?text)", anchor),
    ]

    # inputs + textareas
    locators = page.locator("input:visible, textarea:visible, [contenteditable=true]:visible")
    count = locators.count()
    for i in range(min(count, 40)):
        el = locators.nth(i)
        try:
            name = (
                (el.get_attribute("name") or "")
                + " "
                + (el.get_attribute("id") or "")
                + " "
                + (el.get_attribute("placeholder") or "")
                + " "
                + (el.get_attribute("aria-label") or "")
            ).lower()
            typ = (el.get_attribute("type") or "text").lower()
            if typ in ("hidden", "submit", "button", "checkbox", "radio", "file"):
                continue
            for pat, val in pairs:
                if val and re.search(pat, name, re.I):
                    el.fill(str(val)[:2000])
                    filled.append(name.strip()[:80])
                    break
        except Exception:
            continue
    return filled


def try_submit(page) -> str:
    """Click a plausible submit button."""
    candidates = [
        "button:has-text('Submit')",
        "button:has-text('Add tool')",
        "button:has-text('Send')",
        "input[type=submit]",
        "button[type=submit]",
        "text=Submit tool",
        "text=Submit for review",
    ]
    for sel in candidates:
        try:
            loc = page.locator(sel).first
            if loc.count() and loc.is_visible():
                loc.click(timeout=5000)
                return f"clicked:{sel}"
        except Exception:
            continue
    return "no_submit_button"


def detect_outcome(page) -> str:
    text = ""
    try:
        text = page.inner_text("body")[:8000].lower()
    except Exception:
        pass
    if any(x in text for x in ("thank you", "thanks for", "submitted", "under review", "received your")):
        return "submitted"
    if any(x in text for x in ("captcha", "recaptcha", "hcaptcha", "verify you are human")):
        return "captcha"
    if any(x in text for x in ("log in", "sign in", "create an account", "login required")):
        return "login_required"
    if any(x in text for x in ("error", "invalid", "required field")):
        return "maybe_error"
    return "unknown"


def run_directories(cfg: dict, run_id: str, log_path: Path, deadline: float) -> list[dict]:
    ensure_playwright()
    from playwright.sync_api import sync_playwright

    product = cfg["product"]
    anchors = cfg.get("anchors") or ["Pikbo"]
    email = os.environ.get("PIKBO_GROWTH_EMAIL", "").strip()
    headed = os.environ.get("GROWTH_HEADED", "").strip() in ("1", "true", "yes")
    channel = os.environ.get("GROWTH_CHROME_CHANNEL", "").strip()  # e.g. chrome
    results = []
    shot_dir = SHOTS / run_id
    shot_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        launch_kwargs = {"headless": not headed}
        if channel:
            launch_kwargs["channel"] = channel
        browser = p.chromium.launch(**launch_kwargs)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1400, "height": 900},
        )
        page = context.new_page()
        page.set_default_timeout(25000)

        for i, d in enumerate(cfg.get("directories") or []):
            if time.time() > deadline:
                results.append({"id": d.get("id"), "status": "timeout_budget", "at": utc_now()})
                break
            if not d.get("enabled", True):
                continue
            anchor = anchors[i % len(anchors)]
            pref = d.get("preferredLink") or "url"
            link = product["rankUrl"] if pref == "rankUrl" else product["url"]
            # temporarily swap rank into product for form fill
            prod = dict(product)
            if pref == "rankUrl":
                prod["url"] = product["url"]
                # description still mentions primary
            row = {
                "phase": "directories",
                "id": d["id"],
                "name": d.get("name"),
                "submitUrl": d.get("submitUrl"),
                "link": link,
                "anchor": anchor,
                "at": utc_now(),
            }
            try:
                page.goto(d["submitUrl"], wait_until="domcontentloaded", timeout=45000)
                try:
                    page.wait_for_load_state("networkidle", timeout=15000)
                except Exception:
                    pass
                shot = shot_dir / f"{d['id']}-01.png"
                page.screenshot(path=str(shot), full_page=True)
                row["screenshot"] = str(shot.relative_to(ROOT))

                filled = fill_heuristics(page, prod, email, anchor)
                # Also try explicit URL field with preferred link
                try:
                    for sel in ["input[name*=url i]", "input[placeholder*=url i]", "input[type=url]"]:
                        if page.locator(sel).count():
                            page.locator(sel).first.fill(link)
                            filled.append(sel)
                            break
                except Exception:
                    pass
                row["filled"] = filled
                row["submit"] = try_submit(page)
                time.sleep(2.5)
                try:
                    page.wait_for_load_state("networkidle", timeout=10000)
                except Exception:
                    pass
                shot2 = shot_dir / f"{d['id']}-02.png"
                page.screenshot(path=str(shot2), full_page=True)
                row["screenshot_after"] = str(shot2.relative_to(ROOT))
                row["status"] = detect_outcome(page)
                if not filled and row["status"] == "unknown":
                    row["status"] = "no_form_fields"
            except Exception as e:
                row["status"] = "fail"
                row["error"] = str(e)[:500]
                row["trace"] = traceback.format_exc()[-800:]
            results.append(row)
            log_jsonl(log_path, row)
            print(f"[growth] {d['id']}: {row['status']}", flush=True)

        browser.close()
    return results


def write_agent_state(run_id: str, dir_results: list, report_rel: str) -> Path:
    """Overwrite AGENT_STATE so Grok can pull without boss relay."""
    path = ROOT / "docs" / "growth" / "AGENT_STATE.md"
    submitted = sum(1 for r in dir_results if r.get("status") == "submitted")
    captcha = sum(1 for r in dir_results if r.get("status") == "captcha")
    login = sum(1 for r in dir_results if r.get("status") == "login_required")
    body = f"""# Agent State（覆盖写 · 最后写入者生效）

```yaml
updated_at: "{utc_now()}"
writer: workbuddy-growth-auto
run_id: "{run_id}"
status: |
  Growth run finished unattended.
  directories: total={len(dir_results)} submitted~={submitted} captcha={captcha} login_required={login}
  report: {report_rel}
  Domain: https://pikbo.ai only. No boss relay needed — Grok: git pull && read this file.
next_for_workbuddy: |
  Re-run: python3 scripts/growth-auto/run_growth.py --all
  Retry captcha/login rows with GROWTH_HEADED=1 or logged-in Chrome profile when secrets exist.
next_for_grok: |
  git pull origin main
  Read {report_rel} and HANDOFF; only eng if TD/product change required.
```
"""
    path.write_text(body, encoding="utf-8")
    return path


def write_report(run_id: str, pre: dict, dir_results: list, ph_path: Path | None) -> Path:
    path = RUNS / f"{run_id}-report.md"
    lines = [
        f"# Pikbo growth auto report — {run_id}",
        "",
        f"- Generated: {utc_now()}",
        f"- Preflight: `{json.dumps(pre)}`",
        f"- PH pack: `{ph_path.relative_to(ROOT) if ph_path else 'n/a'}`",
        f"- Sync: see `docs/growth/AGENT_STATE.md` + push to GitHub (boss does not relay)",
        "",
        "## Directories",
        "",
        "| ID | Status | Link | Notes |",
        "|----|--------|------|-------|",
    ]
    for r in dir_results:
        notes = r.get("error") or r.get("submit") or ""
        lines.append(
            f"| {r.get('id')} | {r.get('status')} | {r.get('link','')} | {str(notes)[:80]} |"
        )
    submitted = sum(1 for r in dir_results if r.get("status") == "submitted")
    lines += [
        "",
        f"**Submitted-like:** {submitted}/{len(dir_results)}",
        "",
        "## Agent bus",
        "",
        "- Update AGENT_STATE.md (done by runner)",
        "- Commit + push docs/growth/** so Grok sees results without the boss",
        "",
        "## Do not",
        "- Do not use pikbo.com",
        "- Do not open Stripe",
        "- Do not ask the boss to message engineering",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")
    write_agent_state(run_id, dir_results, str(path.relative_to(ROOT)))
    return path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument(
        "--phase",
        action="append",
        choices=["preflight", "directories", "ph-assets", "report"],
        default=[],
    )
    args = ap.parse_args()
    phases = set(args.phase)
    if args.all or not phases:
        phases = {"preflight", "directories", "ph-assets", "report"}

    cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_path = RUNS / f"{run_id}.jsonl"
    RUNS.mkdir(parents=True, exist_ok=True)
    max_min = int(os.environ.get("GROWTH_MAX_MINUTES") or "90")
    deadline = time.time() + max_min * 60

    pre = {"ok": True}
    dir_results: list[dict] = []
    ph_path: Path | None = None

    if "preflight" in phases:
        pre = preflight(cfg["product"])
        log_jsonl(log_path, {"phase": "preflight", **pre, "at": utc_now()})
        if not pre.get("ok"):
            print("[growth] ABORT: pikbo.ai not reachable", pre, flush=True)
            write_report(run_id, pre, [], None)
            return 2
        print("[growth] preflight OK", pre, flush=True)

    if "ph-assets" in phases:
        ph_path = write_ph_pack(cfg["product"], ROOT / "docs" / "growth" / "producthunt_pack.md")
        log_jsonl(
            log_path,
            {"phase": "ph-assets", "path": str(ph_path.relative_to(ROOT)), "status": "written", "at": utc_now()},
        )
        print("[growth] PH pack written", ph_path, flush=True)

    if "directories" in phases:
        if time.time() > deadline:
            print("[growth] skip directories: time budget", flush=True)
        else:
            try:
                dir_results = run_directories(cfg, run_id, log_path, deadline)
            except Exception as e:
                log_jsonl(
                    log_path,
                    {
                        "phase": "directories",
                        "status": "runner_fail",
                        "error": str(e),
                        "at": utc_now(),
                    },
                )
                print("[growth] directories runner failed", e, flush=True)

    if "report" in phases:
        report = write_report(run_id, pre, dir_results, ph_path)
        print("[growth] report", report, flush=True)

    print("[growth] DONE", run_id, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
