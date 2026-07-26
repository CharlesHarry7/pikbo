#!/usr/bin/env python3
"""Manual Playwright CDP submissions for stubborn directories."""
from playwright.sync_api import sync_playwright, TimeoutError as TE
import json, os, pathlib, time, re

ROOT = pathlib.Path("/Users/x/WorkBuddy/2026-07-27-02-00-48/pikbo")
SHOTS = ROOT / "docs" / "growth" / "screenshots" / "manual-20260727-cdp"
SHOTS.mkdir(parents=True, exist_ok=True)

def save(page, name):
    try:
        p = SHOTS / f"{name}.png"
        page.screenshot(path=str(p), full_page=True)
        print(f"  screenshot: {p}")
    except Exception as e:
        print(f"  screenshot failed: {e}")

# Load product info
CFG = json.loads((ROOT / "scripts" / "growth-auto" / "directories.json").read_text())
product = CFG["product"]
EMAIL = os.environ.get("PIKBO_GROWTH_EMAIL", "")

def connect_cdp(p):
    browser = p.chromium.connect_over_cdp("http://localhost:9222")
    # Use the default context which has Google login cookies
    contexts = browser.contexts
    if not contexts:
        print("No existing contexts, creating new")
        return browser, browser.new_context()
    print(f"Using existing context {len(contexts)}")
    return browser, contexts[0]

def submit_aivalley(context):
    """AI Valley - submit tool page, Contact Form 7."""
    page = context.new_page()
    try:
        page.goto("https://aivalley.ai/submit-tool/", timeout=35000, wait_until="domcontentloaded")
        page.wait_for_timeout(1500)
        save(page, "aivalley-correct-01-load")
        # Fill all visible fields based on label/placeholder
        fields = [
            ("name", "Pikbo Team"),
            ("email", EMAIL or "hello@pikbo.ai"),
            ("tool name", product["name"]),
            ("tool url", product["url"]),
            ("tool description", product["description"]),
            ("tool short description", product["tagline"]),
        ]
        for label_text, val in fields:
            try:
                # Try to find input/textarea associated with label containing the text
                loc = page.locator(f"label:has-text('{label_text.title()}')").locator("xpath=following-sibling::input | following-sibling::textarea | following-sibling::*//input | following-sibling::*//textarea").first
                if loc.count() == 0:
                    raise Exception("no sibling input")
                loc.fill(val, timeout=3000)
                print(f"  filled {label_text} via label sibling")
            except Exception as e1:
                try:
                    # Try placeholder text
                    loc = page.locator(f"input[placeholder*='{label_text.title()}'], textarea[placeholder*='{label_text.title()}'], input[placeholder*='{label_text}'], textarea[placeholder*='{label_text}']").first
                    loc.fill(val, timeout=3000)
                    print(f"  filled {label_text} via placeholder")
                except Exception as e2:
                    try:
                        # Fallback: get all visible inputs and try by index/order
                        inputs = page.locator("input:visible, textarea:visible")
                        n = inputs.count()
                        print(f"  fallback: {n} inputs visible")
                        # By order: name, email, tool name, tool url, description, short desc
                        idx_map = {"name": 0, "email": 1, "tool name": 2, "tool url": 3, "tool description": 4, "tool short description": 5}
                        idx = idx_map.get(label_text, -1)
                        if 0 <= idx < n:
                            inputs.nth(idx).fill(val, timeout=3000)
                            print(f"  filled {label_text} via index {idx}")
                        else:
                            print(f"  could not fill {label_text}: {e1} / {e2}")
                    except Exception as e3:
                        print(f"  could not fill {label_text}: {e1} / {e2} / {e3}")
        save(page, "aivalley-correct-02-filled")
        # Click the Submit button (CF7 needs actual click)
        try:
            btn = page.locator("button:has-text('Submit'), input[type=submit]").first
            btn.click(timeout=5000)
            print("  clicked Submit button")
        except Exception as e:
            return "fail", f"click_failed:{e}"
        page.wait_for_timeout(3000)
        save(page, "aivalley-correct-03-after-click")
        # Check for CF7 success output
        output = ""
        try:
            output = page.locator(".wpcf7-response-output").first.inner_text(timeout=3000)
            print(f"  CF7 response: {output}")
            if re.search(r"sent|thank|success|received|ok", output, re.I):
                return "submitted", f"cf7_click:{output[:80]}"
        except Exception:
            pass
        txt = page.inner_text("body", timeout=3000).lower()
        if re.search(r"thank you for your submission|it has been sent|successfully submitted|submission received", txt):
            return "submitted", "cf7_click_success_text"
        return "fail", f"cf7_click_no_success: output={output[:80]}"
    except Exception as e:
        return "fail", f"page_exc:{e}"
    finally:
        try: page.close()
        except: pass

def submit_bestaibrands(context):
    """Best AI Brands - React form, use label-based locators."""
    page = context.new_page()
    try:
        page.goto("https://bestaibrands.com/submit", timeout=35000, wait_until="domcontentloaded")
        page.wait_for_timeout(2000)
        save(page, "bestaibrands-01-load")
        # Fill based on label text
        def fill_by_label(label, val):
            try:
                loc = page.locator(f"text={label}").locator("xpath=../..//input").first
                loc.fill(val, timeout=3000)
                return True
            except Exception:
                try:
                    loc = page.locator(f"label:has-text('{label}') + input").first
                    loc.fill(val, timeout=3000)
                    return True
                except Exception:
                    return False
        fill_by_label("Product Name", product["name"])
        fill_by_label("Website URL", product["url"])
        fill_by_label("Tagline", product["tagline"])
        fill_by_label("Email", EMAIL or "hello@pikbo.ai")
        fill_by_label("Description", product["description"])
        try:
            page.locator("textarea").first.fill(product["description"])
        except: pass
        save(page, "bestaibrands-02-filled")
        # Detect paid before clicking
        txt_before = page.inner_text("body", timeout=3000).lower()
        if re.search(r"buy me a coffee|buy.*coffee|not free|submission fee|pay \$|pricing|payment|manually reviewed", txt_before):
            return "paid_skip", "page_shows_paid_before_submit"
        # Try to submit
        try:
            btn = page.locator("button:has-text('Submit'), button[type=submit]").first
            btn.click(timeout=5000)
        except Exception as e:
            return "fail", f"click_failed:{e}"
        page.wait_for_timeout(2500)
        save(page, "bestaibrands-03-after-submit")
        txt = page.inner_text("body", timeout=3000).lower()
        if re.search(r"buy me a coffee|buy.*coffee|not free|submission fee|pay \$|pricing|payment|manually reviewed", txt):
            return "paid_skip", "page_shows_paid_after_submit"
        if re.search(r"thank|success|received|review", txt):
            return "submitted", "label_fill_submit"
        return "fail", "label_fill_no_success"
    except Exception as e:
        return "fail", f"exc:{e}"
    finally:
        try: page.close()
        except: pass

def submit_openlaunch_google(context):
    """Open-Launch - try Google login with existing CDP cookies."""
    page = context.new_page()
    try:
        page.goto("https://open-launch.com/projects/submit", timeout=35000, wait_until="domcontentloaded")
        page.wait_for_timeout(2000)
        save(page, "openlaunch-01-submit-page")
        # Look for Login with Google button
        try:
            btn = page.locator("button:has-text('Login with Google')").first
            btn.click(timeout=5000)
        except Exception as e:
            return "login_required", f"no_google_button:{e}"
        page.wait_for_timeout(4000)
        save(page, "openlaunch-02-google-oauth")
        cur = page.url.lower()
        if "accounts.google.com" in cur:
            if "rapt" in cur or "challenge" in cur or "signin/oauth/id" in cur:
                return "login_required", "google_rapt_blocked"
            # Try to click the known account if account chooser
            try:
                acc = page.locator("text=guochao950518@gmail.com").first
                acc.click(timeout=5000)
                page.wait_for_timeout(5000)
                save(page, "openlaunch-03-after-account")
                cur = page.url.lower()
                if "rapt" in cur or "challenge" in cur:
                    return "login_required", "google_rapt_after_account"
            except Exception as e:
                return "login_required", f"account_click_failed:{e}"
        return "login_required", f"unexpected_url:{cur}"
    except Exception as e:
        return "fail", f"exc:{e}"
    finally:
        try: page.close()
        except: pass

def main():
    with sync_playwright() as p:
        browser, context = connect_cdp(p)
        print(f"CDP contexts: {len(browser.contexts)}")
        
        print("\n--- AI Valley ---")
        s, r = submit_aivalley(context)
        print(f"  -> {s}: {r}")
        
        print("\n--- Best AI Brands ---")
        s, r = submit_bestaibrands(context)
        print(f"  -> {s}: {r}")
        
        print("\n--- Open-Launch Google ---")
        s, r = submit_openlaunch_google(context)
        print(f"  -> {s}: {r}")
        
        try: context.close()
        except: pass
        try: browser.close()
        except: pass

if __name__ == "__main__":
    main()
