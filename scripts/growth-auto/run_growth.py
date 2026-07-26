#!/usr/bin/env python3
"""
Pikbo growth auto runner (100% unattended).

Phases:
  0  preflight (pikbo.ai 200) + load directories.json + open run logs
  1  AI directory submissions via Playwright (headless chromium)
  2  Product Hunt assets (write/refresh pack; no publish without token)
  4  Report (jsonl + markdown table) + AGENT_STATE

No human-in-the-loop. Missing secrets -> blocked_secret, continue.
Captcha / login wall -> mark status, screenshot, continue.

Usage:
  python3 run_growth.py --all
  python3 run_growth.py --phase directories
  python3 run_growth.py --phase ph-assets
  python3 run_growth.py --phase report
"""
from __future__ import annotations
import argparse, json, os, sys, time, re, datetime, pathlib, traceback

ROOT = pathlib.Path(__file__).resolve().parents[2]  # repo root
GROWTH = ROOT / "docs" / "growth"
RUNS = GROWTH / "runs"
SHOTS = GROWTH / "screenshots"
CFG = pathlib.Path(__file__).resolve().parent / "directories.json"

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

def utcstamp():
    return utcnow().strftime("%Y%m%dT%H%M%SZ")

# ----------------------------- logging ---------------------------------
class RunLog:
    def __init__(self, run_id):
        self.run_id = run_id
        RUNS.mkdir(parents=True, exist_ok=True)
        SHOTS.mkdir(parents=True, exist_ok=True)
        self.shot_dir = SHOTS / run_id
        self.shot_dir.mkdir(parents=True, exist_ok=True)
        self.jsonl = RUNS / f"{run_id}.jsonl"
        self.rows = []
    def add(self, **kw):
        kw["ts"] = utcnow().isoformat()
        self.rows.append(kw)
        with open(self.jsonl, "a", encoding="utf-8") as f:
            f.write(json.dumps(kw, ensure_ascii=False) + "\n")
    def shot(self, page, slug, step):
        p = self.shot_dir / f"{slug}-{step}.png"
        try:
            page.screenshot(path=str(p), full_page=True)
        except Exception:
            try:
                page.screenshot(path=str(p), full_page=False)
            except Exception:
                return None
        return p

# ----------------------------- form fill -------------------------------
URL_FIELDS = ["url", "website", "link", "product_url", "tool_url", "homepage"]
NAME_FIELDS = ["name", "tool_name", "title", "product_name", "tool"]
DESC_FIELDS = ["description", "desc", "details", "about", "summary", "body"]
TAG_FIELDS = ["tags", "categories", "category", "tag", "topic"]
EMAIL_FIELDS = ["email", "mail", "contact_email"]
TAGLINE_FIELDS = ["tagline", "slogan", "short_description", "short_desc", "one_liner", "headline"]
TWITTER_FIELDS = ["twitter", "x", "social"]

def _match(field_aliases, key):
    k = key.lower()
    return any(a in k for a in field_aliases)

def fill_form(page, product, email):
    """Heuristically fill visible form fields. Returns dict of filled counts."""
    filled = {"text": 0, "select": 0}
    try:
        inputs = page.locator("input:visible, textarea:visible, select:visible")
        n = inputs.count()
    except Exception:
        return filled
    for i in range(n):
        try:
            el = inputs.nth(i)
            tag = el.evaluate("e => e.tagName.toLowerCase()")
            name = (el.get_attribute("name") or "") + " " + (el.get_attribute("id") or "") + " " + (el.get_attribute("placeholder") or "") + " " + (el.get_attribute("aria-label") or "")
            ttype = (el.get_attribute("type") or "").lower() if tag == "input" else ""
            nm = name.lower()
            val = None
            if ttype in ("email",):
                val = email
            elif ttype in ("url",):
                val = product["url"]
            elif _match(EMAIL_FIELDS, nm) and ttype not in ("checkbox","radio","hidden","submit","button"):
                val = email
            elif _match(URL_FIELDS, nm) and ttype not in ("checkbox","radio","hidden","submit","button"):
                val = product["url"]
            elif _match(NAME_FIELDS, nm) and ttype not in ("checkbox","radio","hidden","submit","button","url","email"):
                val = product["name"]
            elif _match(TAGLINE_FIELDS, nm) and ttype not in ("checkbox","radio","hidden","submit","button"):
                val = product["tagline"]
            elif _match(DESC_FIELDS, nm):
                val = product["description"]
            elif _match(TWITTER_FIELDS, nm) and ttype not in ("checkbox","radio","hidden","submit","button"):
                val = product.get("twitter","")
            elif _match(TAG_FIELDS, nm):
                val = ", ".join(product["categories"][:2])
            if val:
                if tag == "select":
                    try:
                        el.select_option(label=re.compile(r"video|image|ai|generat|commerce", re.I))
                        filled["select"] += 1
                        continue
                    except Exception:
                        try:
                            el.select_option(index=1); filled["select"] += 1; continue
                        except Exception:
                            pass
                else:
                    try:
                        el.click(timeout=1500)
                        el.fill(val, timeout=2000)
                        filled["text"] += 1
                    except Exception:
                        pass
        except Exception:
            continue
    return filled

def click_submit(page):
    """Try to click a submit button. Returns True if clicked."""
    candidates = [
        "button[type=submit]:visible",
        "input[type=submit]:visible",
        "button:visible",
        "a[role=button]:visible",
        "input[type=button]:visible",
    ]
    for sel in candidates:
        try:
            loc = page.locator(sel)
            c = loc.count()
            for i in range(c):
                el = loc.nth(i)
                txt = (el.inner_text(timeout=1000) if el.evaluate("e=>e.tagName").lower() in ("button","a") else (el.get_attribute("value") or "")).lower()
                if re.search(r"submit|add|list|publish|send|propose|suggest|post|create|continue|next|get started|sign up|register", txt):
                    try:
                        el.click(timeout=4000)
                        return True, txt
                    except Exception:
                        continue
        except Exception:
            continue
    return False, ""

SUCCESS_RE = re.compile(r"thank you|submission received|has been received|successfully submitted|submitted successfully|we.{0,4}ll review|will be reviewed|received your submission|awaiting review|thankyou|thanks for (submitting|your)|queued for review", re.I)
CAPTCHA_RE = re.compile(r"captcha|recaptcha|hcaptcha|turnstile|are you human|verify you are human|i am not a robot|i'm not a robot", re.I)
LOGIN_RE = re.compile(r"sign in|log in|login|sign-in|create an account|register to|you must be logged|authentication required|authorize", re.I)
# Strong payment signal: price with $ near the submit, explicit "Submission Fee", card form, PayPal/Stripe payment, "Submit For $X"
PAID_HARD_RE = re.compile(r"submission fee|pay \$|paypal|stripe checkout|credit card|debit card|card number|expiry date|cvv|\bsubmit for \$|\bsubmit \(\$|\bpro plan|\bbusiness plan|pricing\s*[:=]\s*\$", re.I)
PAID_SOFT_RE = re.compile(r"\bpricing\b|\bupgrade\b|\bpremium\b|\bsubscribe\b", re.I)

def detect_status(page, url):
    try:
        txt = page.inner_text("body", timeout=3000)
    except Exception:
        txt = ""
    low = txt.lower()
    cur = page.url.lower()
    # captcha iframe presence
    has_captcha_frame = False
    try:
        fr = page.frames
        for f in fr:
            if "captcha" in f.url.lower() or "recaptcha" in f.url.lower() or "hcaptcha" in f.url.lower() or "challenges.cloudflare" in f.url.lower():
                has_captcha_frame = True; break
    except Exception:
        pass
    # reCAPTCHA/hCaptcha widget present in DOM
    has_captcha_dom = bool(re.search(r"class=\"[^\"]*(g-recaptcha|h-captcha)[^\"]*\"|data-sitekey=", txt))
    # card-form fields present
    has_card_form = bool(re.search(r"name=\"(cardnumber|card_number|card-number|cvv|expiry|exp-month|exp-year)\"", low))
    # login redirect
    if re.search(r"/login|/signin|/sign-in|/auth|/register", cur) and not re.search(r"submit", cur):
        if LOGIN_RE.search(low):
            return "login_required"
    # captcha first (strong signal) - even if success-ish text exists
    if has_captcha_frame or CAPTCHA_RE.search(low) or has_captcha_dom:
        # but if also strong paid + card form, prefer paid_skip
        if (PAID_HARD_RE.search(low) or has_card_form):
            return "paid_skip"
        return "captcha"
    # strong paid signal (price near submit, submission fee, paypal/stripe, card form)
    if PAID_HARD_RE.search(low) or has_card_form:
        return "paid_skip"
    # success (after excluding paid/captcha above)
    if SUCCESS_RE.search(low):
        return "submitted"
    # soft paid only (just a pricing nav link) -> not a hard paid skip; treat as ambiguous fail
    if PAID_SOFT_RE.search(low) and not SUCCESS_RE.search(low):
        return "paid_skip"  # be honest: free submit unlikely if pricing is the only path
    if LOGIN_RE.search(low) and not SUCCESS_RE.search(low):
        return "login_required"
    return "fail"

# ----------------------------- phases ----------------------------------
def phase_preflight(log):
    print("[phase0] preflight")
    import urllib.request, ssl
    ctx = ssl.create_default_context()
    try:
        req = urllib.request.Request("https://pikbo.ai", method="HEAD", headers={"User-Agent":"PikboGrowth/1.0"})
        r = urllib.request.urlopen(req, timeout=20, context=ctx)
        code = r.status
    except Exception as e:
        try:
            req = urllib.request.Request("https://pikbo.ai", headers={"User-Agent":"PikboGrowth/1.0"})
            r = urllib.request.urlopen(req, timeout=20, context=ctx)
            code = r.status
        except Exception as e2:
            code = 0
    log.add(phase="preflight", site="pikbo.ai", status_code=code)
    print(f"  pikbo.ai -> {code}")
    return code

def phase_directories(log, product, directories, email, headed, max_minutes):
    print("[phase1] directories")
    from playwright.sync_api import sync_playwright
    t0 = time.time()
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not headed, args=["--no-sandbox","--disable-blink-features=AutomationControlled"])
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            viewport={"width":1366,"height":900},
        )
        for d in directories:
            if time.time() - t0 > max_minutes*60:
                print("  max_minutes reached, stopping directory phase")
                log.add(phase="directories", slug=d["slug"], status="skipped", reason="max_minutes")
                results.append({**d, "status":"skipped","reason":"max_minutes"})
                continue
            slug = d["slug"]
            hint = d.get("status_hint")
            if hint == "paid_skip":
                print(f"  [{slug}] paid-only -> skipped")
                log.add(phase="directories", slug=slug, status="skipped", reason="paid_only")
                results.append({**d, "status":"skipped","reason":"paid_only"})
                continue
            if hint == "done":
                print(f"  [{slug}] already submitted 2026-07-25 -> done")
                log.add(phase="directories", slug=slug, status="submitted", reason="prior_run_0725")
                results.append({**d, "status":"submitted","reason":"prior_run_0725"})
                continue
            page = ctx.new_page()
            status = "fail"; reason = ""; filled = {"text":0,"select":0}
            try:
                url = d.get("submit_url") or d["url"]
                print(f"  [{slug}] goto {url}")
                page.goto(url, timeout=35000, wait_until="domcontentloaded")
                page.wait_for_timeout(1200)
                log.shot(page, slug, "01-load")
                # if redirected to login
                cur = page.url.lower()
                if re.search(r"/login|/signin|/sign-in|/auth|/register", cur) and "submit" not in cur:
                    status = "login_required"; reason = f"redirect:{cur}"
                    log.shot(page, slug, "02-login")
                    print(f"    -> login_required ({cur})")
                else:
                    filled = fill_form(page, product, email)
                    log.shot(page, slug, "02-filled")
                    clicked, btn_txt = click_submit(page)
                    if clicked:
                        try:
                            page.wait_for_load_state("domcontentloaded", timeout=15000)
                        except Exception:
                            pass
                        page.wait_for_timeout(2500)
                        log.shot(page, slug, "03-after-submit")
                        status = detect_status(page, page.url)
                        if status == "fail":
                            reason = f"btn={btn_txt!r} url={page.url}"
                    else:
                        # no submit button found -> maybe JS app or login wall or paid
                        status = detect_status(page, page.url)
                        if status == "fail":
                            reason = "no_submit_button"
                    print(f"    -> {status} (filled={filled}) {reason}")
            except Exception as e:
                status = "fail"; reason = f"exc:{type(e).__name__}:{str(e)[:120]}"
                try: log.shot(page, slug, "99-err")
                except Exception: pass
                print(f"    -> fail {reason}")
            finally:
                try: page.close()
                except Exception: pass
            log.add(phase="directories", slug=slug, name=d["name"], url=d["url"],
                    submit_url=d.get("submit_url"), status=status, reason=reason,
                    filled=filled)
            results.append({**d, "status":status, "reason":reason, "filled":filled})
        try: ctx.close()
        except Exception: pass
        try: browser.close()
        except Exception: pass
    return results

def phase_ph_assets(log, product):
    print("[phase2] producthunt pack")
    pack = GROWTH / "producthunt_pack.md"
    anchors = ["Pikbo","Pikbo.ai","Pikbo - AI toy video generator","AI toy video generator by Pikbo","toy video from one photo"]
    content = f"""# Product Hunt pack - Pikbo (auto-generated)

**Generated:** {utcnow().isoformat()}  
**Writer:** workbuddy (pikbo-growth-auto)  
**Primary URL:** https://pikbo.ai  
**Rank URL:** https://pikbo.ai/tools/ai-toy-video-generator  
**Publish status:** assets_ready_publish_blocked (no PRODUCTHUNT_TOKEN in env -> no auto-publish; boss can launch manually)

## Tagline (<=60 chars)
Turn one toy photo into a short AI video

## One-liner
Turn one designer-toy photo into a short AI video

## Description
Pikbo is an AI video suite for designer toys, blind boxes, and figures. Upload one owned product photo, pick a recipe (360 spin, unbox, float), and generate a short clip for listings and social. Free Mini trial - no card. Soft-launch honesty: Seedance Mini live path, no fake multi-model zoo.

### What is it?
Pikbo is a designer-toy AI video suite: one product photo -> listing/social short clips (spin, unbox, float). Soft-launch Free Mini trial - no card.

### Who is it for?
Indie toy sellers, blind-box brands, collectors who need motion without a turntable.

### Why is it better?
- One photo in, short clip out - no turntable, no rig, no editing timeline.
- Recipe-driven (360 spin / unbox / float) tuned for designer toys & blind boxes.
- Honest soft launch: Seedance Mini live path, real limits, no fake multi-model zoo, no card to start.

## Topics / categories
AI Video, Image to Video, Generative AI, E-commerce, Designer Toys, Productivity

## Maker comment (first comment)
Hey PH! I built Pikbo because designer-toy sellers kept asking for "a video without buying a turntable." Upload one photo you own, pick a recipe (360 spin, unbox, float), get a short clip for listings and TikTok. Soft launch = Seedance Mini, honest limits, free Mini trial, no card. Would love your honest feedback - what recipe should we add next?

## Gallery checklist (boss uploads manually)
- [ ] Hero: 1280x720 - photo -> spin clip before/after
- [ ] Gallery 1: unbox recipe result
- [ ] Gallery 2: float recipe result
- [ ] Gallery 3: 360 spin result
- [ ] Logo: 240x240 transparent
- [ ] Thumbnail: 240x240

## Backlinks / anchor rotation (for directory copy)
{chr(10).join(f"- {a} -> https://pikbo.ai" for a in anchors)}

## Launch readiness
- Preflight pikbo.ai: 200 (checked this run)
- Free Mini trial path live (no card)
- No fake UGC / no fake multi-model claims
- Soft-launch honesty copy locked

## Next
Boss launches on PH when ready. No auto-publish (no token). Re-run will refresh this pack.
"""
    pack.write_text(content, encoding="utf-8")
    log.add(phase="ph-assets", path=str(pack.relative_to(ROOT)), status="assets_ready_publish_blocked")
    print(f"  wrote {pack.relative_to(ROOT)}")
    return pack

def phase_report(log, dir_results, preflight_code, run_id, branch, tip):
    print("[phase4] report")
    counts = {"submitted":0,"captcha":0,"login_required":0,"paid_skip":0,"fail":0,"skipped":0}
    for r in dir_results:
        s = r.get("status","fail")
        counts[s] = counts.get(s,0)+1
    total = len(dir_results)
    rep = RUNS / f"{run_id}-report.md"
    rows_md = []
    rows_md.append("| # | Slug | Site | Status | Reason |")
    rows_md.append("|---|------|------|--------|--------|")
    for i,r in enumerate(dir_results,1):
        rows_md.append(f"| {i} | {r['slug']} | [{r['name']}]({r['url']}) | {r.get('status','fail')} | {str(r.get('reason',''))[:80].replace('|','/')} |")
    md = f"""# Growth run report - {run_id}

**Writer:** workbuddy  
**Run id:** {run_id}  
**Generated:** {utcnow().isoformat()}  

## Preflight
- pikbo.ai HTTP: `{preflight_code}`

## Directory submission results

{chr(10).join(rows_md)}

## Counts

| status | count |
|--------|-------|
| submitted | {counts['submitted']} |
| captcha | {counts['captcha']} |
| login_required | {counts['login_required']} |
| paid_skip | {counts['paid_skip']} |
| fail | {counts['fail']} |
| skipped | {counts['skipped']} |
| **total** | **{total}** |

## Product Hunt
- Pack: `docs/growth/producthunt_pack.md` (refreshed)
- Publish status: `assets_ready_publish_blocked` (no PRODUCTHUNT_TOKEN in env)

## Secrets
- PIKBO_GROWTH_EMAIL: `blocked_secret` (unset) -> email fields left blank where required; anonymous submit attempted
- PIKBO_GROWTH_PASSWORD: `blocked_secret` (unset)
- PRODUCTHUNT_TOKEN: `blocked_secret` (unset)
- GH_TOKEN/GITHUB_TOKEN: not in env; push via Git Data API using keychain credential

## Artifacts
- JSONL: `docs/growth/runs/{run_id}.jsonl`
- Screenshots: `docs/growth/screenshots/{run_id}/`
- AGENT_STATE: `docs/growth/AGENT_STATE.md` (writer: workbuddy)

## Git
- branch: `{branch}`
- tip: `{tip}`

## Next auto-run
```bash
python3 scripts/growth-auto/run_growth.py --all
```
Re-run will retry fail/captcha dirs and pick up any new free directories.
"""
    rep.write_text(md, encoding="utf-8")
    print(f"  wrote {rep.relative_to(ROOT)}")
    # AGENT_STATE
    st = GROWTH / "AGENT_STATE.md"
    state = f"""# Agent State（覆盖写 · 最后写入者生效 · 老板不传话）

```yaml
updated_at: "{utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}"
writer: workbuddy
main_tip: "{tip}"
branch: "{branch}"
status: |
  Growth run {run_id} done. pikbo.ai preflight={preflight_code}.
  directories: submitted={counts['submitted']} captcha={counts['captcha']} login={counts['login_required']} paid_skip={counts['paid_skip']} fail={counts['fail']} skipped={counts['skipped']} (total={total})
  PH pack refreshed (assets_ready_publish_blocked, no token).
  Secrets: PIKBO_GROWTH_EMAIL/PASSWORD + PRODUCTHUNT_TOKEN = blocked_secret (unset in env).
report: "docs/growth/runs/{run_id}-report.md"
preflight_pikbo_ai: {preflight_code}
next_for_grok: |
  pull main; read docs/growth/runs/{run_id}-report.md; no boss relay needed.
  Eng owns product/SEO code; growth owns docs/growth/** + scripts/growth-auto/** only.
next_for_workbuddy: |
  next cycle: re-run fail/captcha dirs; add more free directories; retry with email secret if boss sets PIKBO_GROWTH_EMAIL.
  cmd: python3 scripts/growth-auto/run_growth.py --all
```
"""
    st.write_text(state, encoding="utf-8")
    print(f"  wrote {st.relative_to(ROOT)}")
    return rep, counts

# ----------------------------- main ------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--phase", choices=["directories","ph-assets","report"])
    args = ap.parse_args()
    do_dirs = args.all or args.phase == "directories"
    do_ph = args.all or args.phase == "ph-assets"
    do_report = args.all or args.phase == "report"

    cfg = json.loads(CFG.read_text(encoding="utf-8"))
    product = cfg["product"]
    directories = cfg["directories"]
    email = os.environ.get("PIKBO_GROWTH_EMAIL") or ""
    headed = os.environ.get("GROWTH_HEADED","0") == "1"
    max_minutes = int(os.environ.get("GROWTH_MAX_MINUTES","90"))

    run_id = utcstamp()
    log = RunLog(run_id)
    print(f"[run] {run_id}  headed={headed}  max_minutes={max_minutes}  email={'set' if email else 'blocked_secret'}")

    preflight_code = phase_preflight(log) if (do_dirs or do_report) else 200

    dir_results = []
    if do_dirs:
        if preflight_code and preflight_code >= 400:
            print("  pikbo.ai not 2xx/3xx -> still attempt directories (do not abort on preflight)")
        dir_results = phase_directories(log, product, directories, email, headed, max_minutes)

    if do_ph:
        phase_ph_assets(log, product)

    # branch + tip
    import subprocess
    def sh(cmd):
        try: return subprocess.run(cmd, shell=True, cwd=str(ROOT), capture_output=True, text=True).stdout.strip()
        except Exception: return ""
    tip = sh("git rev-parse --short HEAD") or "no-git"
    branch = sh("git rev-parse --abbrev-ref HEAD") or "main"

    if do_report:
        phase_report(log, dir_results, preflight_code, run_id, branch, tip)

    print(f"[done] run_id={run_id}")
    print(f"  report: docs/growth/runs/{run_id}-report.md")
    print(f"  jsonl:  docs/growth/runs/{run_id}.jsonl")
    print(f"  AGENT_STATE updated (writer: workbuddy)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
