#!/usr/bin/env python3
"""Last manual retry for DevPages with robust selectors."""
import os, json
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

SHOT_DIR = "/Users/x/WorkBuddy/2026-07-27-02-00-48/pikbo/docs/growth/screenshots/manual-cdp-cycle2"
os.makedirs(SHOT_DIR, exist_ok=True)

PRODUCT = {
    "name": "Pikbo",
    "url": "https://pikbo.ai",
    "tagline": "Turn one designer-toy photo into a short AI video",
    "description": "Pikbo is an AI video suite for designer toys, blind boxes, and figures. Upload one owned product photo, pick a recipe (360 spin, unbox, float), generate a short clip for listings and social. Free Mini trial - no card.",
    "categories": "AI Video, Image to Video",
    "email": os.environ.get("PIKBO_GROWTH_EMAIL", ""),
}


def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0] if browser.contexts else browser.new_context()
        page = ctx.new_page()
        try:
            page.goto("https://www.devpages.io/submit-a-tool", wait_until="domcontentloaded", timeout=35000)
            page.wait_for_timeout(3000)
            # Close any modals/popups by pressing Escape
            for _ in range(3):
                page.keyboard.press("Escape")
                page.wait_for_timeout(300)
            page.screenshot(path=f"{SHOT_DIR}/devpages-10-load.png", full_page=True)
            # Get all visible text inputs and textareas in order
            inputs = page.locator("input:not([type='hidden']):not([type='submit']):not([type='button'])").all()
            textareas = page.locator("textarea").all()
            selects = page.locator("select").all()
            print(f"Found {len(inputs)} inputs, {len(textareas)} textareas, {len(selects)} selects")
            # Fill by index based on form order seen in screenshot:
            # 0: Tool Name, 1: Description (textarea), 2: Website URL, 3: GitHub URL, 4: Tags, 5: Your Email
            if len(inputs) >= 1:
                inputs[0].fill(PRODUCT["name"])
            if len(textareas) >= 1:
                textareas[0].fill(PRODUCT["description"])
            if len(inputs) >= 3:
                inputs[2].fill(PRODUCT["url"])
            if len(selects) >= 2:
                try:
                    selects[0].select_option("AI")
                except Exception:
                    pass
                try:
                    selects[1].select_option("Free")
                except Exception:
                    pass
            if len(inputs) >= 4:
                inputs[3].fill(PRODUCT["url"])
            if len(inputs) >= 5:
                inputs[4].fill(PRODUCT["categories"])
            if PRODUCT["email"] and len(inputs) >= 6:
                inputs[5].fill(PRODUCT["email"])
            page.wait_for_timeout(500)
            page.screenshot(path=f"{SHOT_DIR}/devpages-11-filled.png", full_page=True)
            # Try to click submit by visible enabled button with review/submit text
            for txt in ["Submit Tool for Review", "Submit", "Submit Tool"]:
                btn = page.locator(f"button:has-text('{txt}')").filter(has_not=page.locator("text=Sign")).first
                if btn.count() and btn.is_enabled():
                    btn.scroll_into_view_if_needed()
                    btn.click()
                    page.wait_for_timeout(3500)
                    page.screenshot(path=f"{SHOT_DIR}/devpages-12-after-submit.png", full_page=True)
                    content = page.content().lower()
                    if any(w in content for w in ["thank", "success", "submitted", "received", "review"]):
                        print("devpages: submitted")
                    else:
                        print("devpages: fail - no clear success")
                    break
            else:
                print("devpages: fail - no clickable submit button")
        except Exception as e:
            print(f"devpages: fail - {type(e).__name__}: {str(e)[:120]}")
            page.screenshot(path=f"{SHOT_DIR}/devpages-19-err.png", full_page=True)
        finally:
            page.close()
            browser.close()


if __name__ == "__main__":
    main()
