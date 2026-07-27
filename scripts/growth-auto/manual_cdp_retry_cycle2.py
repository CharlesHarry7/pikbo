#!/usr/bin/env python3
"""Manual CDP submission retry for promising directories from cycle 2 run."""
import os, time, json
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

SHOT_DIR = "/Users/x/WorkBuddy/2026-07-27-02-00-48/pikbo/docs/growth/screenshots/manual-cdp-cycle2"
os.makedirs(SHOT_DIR, exist_ok=True)
LOG = []

PRODUCT = {
    "name": "Pikbo",
    "url": "https://pikbo.ai",
    "tagline": "Turn one designer-toy photo into a short AI video",
    "description": "Pikbo is an AI video suite for designer toys, blind boxes, and figures. Upload one owned product photo, pick a recipe (360 spin, unbox, float), generate a short clip for listings and social. Free Mini trial - no card.",
    "categories": "AI Video, Image to Video",
    "email": os.environ.get("PIKBO_GROWTH_EMAIL", ""),
    # Keep blank until an official profile resolves publicly.
    "twitter": "",
}


def shot(page, slug, name):
    try:
        page.screenshot(path=f"{SHOT_DIR}/{slug}-{name}.png", full_page=True)
    except Exception as e:
        print(f"  screenshot error: {e}")


def log(slug, status, note):
    LOG.append({"slug": slug, "status": status, "note": note, "ts": datetime.now(timezone.utc).isoformat()})
    print(f"  -> {slug}: {status} | {note}")


def connect_cdp(p):
    browser = p.chromium.connect_over_cdp("http://localhost:9222")
    contexts = browser.contexts
    if contexts:
        return browser, contexts[0]
    return browser, browser.new_context()


def accept_cookies(page):
    try:
        for txt in ["Accept All Cookies", "Accept all", "Accept", "Agree", "I agree"]:
            btn = page.locator(f"button:has-text('{txt}')").first
            if btn.count() and btn.is_visible():
                btn.click()
                page.wait_for_timeout(500)
                return True
    except Exception:
        pass
    return False


def fill_by_label(page, label, value):
    """Find input near a label containing text."""
    try:
        # Try finding label text and then sibling input
        loc = page.locator(f"label:has-text('{label}')")
        if loc.count():
            inp = loc.locator("xpath=./following::input[1] | ./following::textarea[1] | ./following::select[1]")
            if inp.count():
                inp.fill(value)
                return True
        # Try placeholder
        loc = page.locator(f"input[placeholder*='{label}' i], textarea[placeholder*='{label}' i]")
        if loc.count():
            loc.first.fill(value)
            return True
    except Exception:
        pass
    return False


def submit_devpages(ctx):
    slug = "devpages"
    page = ctx.new_page()
    try:
        url = "https://www.devpages.io/submit-a-tool"
        page.goto(url, wait_until="domcontentloaded", timeout=35000)
        page.wait_for_timeout(2500)
        accept_cookies(page)
        shot(page, slug, "01-load")
        # Dismiss cookie banner if still visible
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        # Fill by label text (case-insensitive)
        fill_by_label(page, "Tool Name", PRODUCT["name"])
        fill_by_label(page, "Description", PRODUCT["description"])
        fill_by_label(page, "Website URL", PRODUCT["url"])
        # Category and Pricing selects
        for label, val in [("Category", "AI"), ("Pricing", "Free")]:
            try:
                sel = page.locator(f"label:has-text('{label}')").locator("xpath=./following::select[1]")
                if sel.count():
                    sel.select_option(val)
            except Exception:
                pass
        fill_by_label(page, "GitHub URL", PRODUCT["url"])
        fill_by_label(page, "Tags", PRODUCT["categories"])
        if PRODUCT["email"]:
            fill_by_label(page, "Your Email", PRODUCT["email"])
        shot(page, slug, "02-filled")
        # Submit
        btn = page.locator("button:has-text('Submit Tool for Review')")
        if btn.count():
            btn.click()
            page.wait_for_timeout(3000)
            shot(page, slug, "03-after-submit")
            content = page.content().lower()
            if any(w in content for w in ["thank", "success", "submitted", "received", "review"]):
                log(slug, "submitted", "Form filled and submit clicked, success indicator found")
            else:
                log(slug, "fail", "Submit clicked but no clear success indicator")
        else:
            log(slug, "fail", "Submit button not found")
    except Exception as e:
        log(slug, "fail", f"{type(e).__name__}: {str(e)[:120]}")
        shot(page, slug, "99-err")
    finally:
        page.close()


def submit_dokeyai(ctx):
    slug = "dokeyai"
    page = ctx.new_page()
    try:
        url = "https://dokeyai.com/submit"
        page.goto(url, wait_until="domcontentloaded", timeout=35000)
        page.wait_for_timeout(2000)
        shot(page, slug, "01-load")
        # Single website input - use placeholder
        fill_by_label(page, "Website", PRODUCT["url"])
        # fallback: first visible text input
        try:
            page.locator("input[type='text']").first.fill(PRODUCT["url"])
        except Exception:
            pass
        shot(page, slug, "02-filled")
        btn = page.locator("button:has-text('Submit')").first
        if btn.count():
            btn.click()
            page.wait_for_timeout(3000)
            shot(page, slug, "03-after-submit")
            content = page.content().lower()
            if any(w in content for w in ["thank", "success", "submitted", "received"]):
                log(slug, "submitted", "Website submitted on DokeyAI")
            else:
                log(slug, "fail", "No clear success after submit")
        else:
            log(slug, "fail", "Submit button not found")
    except Exception as e:
        log(slug, "fail", f"{type(e).__name__}: {str(e)[:120]}")
        shot(page, slug, "99-err")
    finally:
        page.close()


def submit_fazier(ctx):
    slug = "fazier"
    page = ctx.new_page()
    try:
        url = "https://fazier.com/submit"
        page.goto(url, wait_until="domcontentloaded", timeout=35000)
        page.wait_for_timeout(3000)
        shot(page, slug, "01-load")
        # Click the Free tier Submit button (first Submit button in page)
        btn = page.locator("button:has-text('Submit')").first
        if btn.count():
            btn.click()
            page.wait_for_timeout(4000)
            shot(page, slug, "02-after-free-submit")
            # Try to fill submission form if present
            try:
                fill_by_label(page, "name", PRODUCT["name"])
                fill_by_label(page, "url", PRODUCT["url"])
                fill_by_label(page, "description", PRODUCT["description"])
                fill_by_label(page, "tagline", PRODUCT["tagline"])
                if PRODUCT["email"]:
                    fill_by_label(page, "email", PRODUCT["email"])
                shot(page, slug, "03-filled")
                submit = page.locator("button[type='submit']").first
                if submit.count():
                    submit.click()
                    page.wait_for_timeout(3000)
                    shot(page, slug, "04-after-submit")
                content = page.content().lower()
                if any(w in content for w in ["thank", "success", "submitted", "received"]):
                    log(slug, "submitted", "Free tier submission completed")
                else:
                    log(slug, "fail", "No success indicator after final submit")
            except Exception as e2:
                log(slug, "fail", f"Could not fill fazier submission form: {e2}")
        else:
            log(slug, "fail", "Free Submit button not found")
    except Exception as e:
        log(slug, "fail", f"{type(e).__name__}: {str(e)[:120]}")
        shot(page, slug, "99-err")
    finally:
        page.close()


def main():
    with sync_playwright() as p:
        browser, ctx = connect_cdp(p)
        print("[manual-cdp-cycle2] connected to Chrome debug")
        submit_devpages(ctx)
        submit_dokeyai(ctx)
        submit_fazier(ctx)
        browser.close()
    # write log
    with open(f"{SHOT_DIR}/results.json", "w") as f:
        json.dump(LOG, f, indent=2)
    print("\nResults:")
    for r in LOG:
        print(f"  {r['slug']}: {r['status']} - {r['note']}")


if __name__ == "__main__":
    main()
