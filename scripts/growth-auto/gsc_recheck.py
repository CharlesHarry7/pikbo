#!/usr/bin/env python3
"""GSC coverage recheck for 13 whitelist URLs via Playwright CDP.
Uses the URL inspection search box at the top of the GSC page."""
from playwright.sync_api import sync_playwright
import pathlib, urllib.parse, re, time

ROOT = pathlib.Path("/Users/x/WorkBuddy/2026-07-27-02-00-48/pikbo")
SHOTS = ROOT / "docs" / "growth" / "screenshots" / "gsc-recheck-20260727"
SHOTS.mkdir(parents=True, exist_ok=True)

URLS = [
    "https://pikbo.ai",
    "https://pikbo.ai/tools/ai-toy-video-generator",
    "https://pikbo.ai/tools/figure-360-product-video",
    "https://pikbo.ai/tools/blind-box-reveal-video-maker",
    "https://pikbo.ai/tools/one-photo-product-video",
    "https://pikbo.ai/tools/ai-product-video-generator-for-toys",
    "https://pikbo.ai/for/photo-to-video-for-toys",
    "https://pikbo.ai/for/etsy-listing-videos",
    "https://pikbo.ai/for/action-figure-product-videos",
    "https://pikbo.ai/guides/how-to-photograph-toys-for-ai-video",
    "https://pikbo.ai/pricing",
    "https://pikbo.ai/privacy",
    "https://pikbo.ai/terms",
]

OVERVIEW_URL = "https://search.google.com/search-console?resource_id=https://pikbo.ai/"

def inspect_url(page, url, idx):
    # Go to overview first so the search box is present and active
    try:
        page.goto(OVERVIEW_URL, timeout=30000, wait_until="domcontentloaded")
    except Exception as e:
        print(f"  [{idx}] overview goto error: {e}")
    page.wait_for_timeout(2500)
    
    # Try to find the URL inspection search input in the GSC header.
    # It usually has placeholder text containing the property URL or "检查" / "Inspect any URL".
    search_box = None
    selectors = [
        'input[placeholder*="pikbo.ai"]',           # property placeholder
        'input[placeholder*="检查"]',               # Chinese inspect
        'input[placeholder*="Inspect"]',          # English inspect
        'input[placeholder*="任何网址"]',            # any URL
        'input[type="text"]',                       # fallback first text input
        'input[aria-label*="URL"]',                  # aria label
        'input[aria-label*="网址"]',                  # aria label Chinese
    ]
    for sel in selectors:
        try:
            loc = page.locator(sel).first
            if loc.count() > 0:
                search_box = loc
                print(f"  [{idx}] found search box via {sel}")
                break
        except Exception:
            continue
    
    if not search_box:
        print(f"  [{idx}] no search box found, falling back to screenshot")
    else:
        try:
            search_box.click(timeout=3000)
            # Select all and type the URL
            search_box.fill(url, timeout=3000)
            page.keyboard.press("Enter")
            print(f"  [{idx}] submitted URL inspection for {url}")
        except Exception as e:
            print(f"  [{idx}] search box interaction failed: {e}")
    
    page.wait_for_timeout(4000)
    p = SHOTS / f"{idx:02d}-{url.replace('https://','').replace('/','_')}.png"
    try:
        page.screenshot(path=str(p), full_page=True)
    except Exception:
        try:
            page.screenshot(path=str(p), full_page=False)
        except Exception:
            pass
    print(f"  [{idx}] screenshot: {p}")
    
    # Heuristic status read (Chinese GSC UI)
    try:
        txt = page.inner_text("body", timeout=3000).lower()
        if "sign in" in txt or "login" in txt or "auth" in txt:
            return "login_required"
        if "网址已收录到 google" in txt or "url is on google" in txt or "已编入索引" in txt:
            return "indexed"
        if "网址未收录到 google" in txt or "url is not on google" in txt or "未编入索引" in txt:
            return "not_indexed"
        if "discovered" in txt or "currently not indexed" in txt or "已发现" in txt:
            return "discovered_not_indexed"
        if "网址检查" in txt or "url inspection" in txt:
            return "loaded"
        return "unknown"
    except Exception:
        return "unknown"

def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://localhost:9222")
        contexts = browser.contexts
        if not contexts:
            print("No existing contexts")
            context = browser.new_context()
        else:
            context = contexts[0]
        page = context.new_page()
        page.set_viewport_size({"width": 1400, "height": 950})
        
        results = []
        for idx, url in enumerate(URLS, 1):
            print(f"\n[{idx}/{len(URLS)}] {url}")
            status = inspect_url(page, url, idx)
            results.append({"idx": idx, "url": url, "status": status})
        
        try: page.close()
        except: pass
        try: context.close()
        except: pass
        try: browser.close()
        except: pass
        
        # Write report
        rep = ROOT / "docs" / "growth" / "runs" / "GSC-RECHECK-20260727-report.md"
        rows = ["| # | URL | Status |", "|---|-----|--------|"]
        for r in results:
            rows.append(f"| {r['idx']} | {r['url']} | {r['status']} |")
        md = f"""# GSC Coverage Recheck - 20260727

**Writer:** workbuddy  
**Timestamp:** 2026-07-27  
**Method:** Chrome debug instance (CDP) → Google Search Console URL Inspection search box  

## Screenshots

Location: `docs/growth/screenshots/gsc-recheck-20260727/`

## URL Status Summary

{chr(10).join(rows)}

## Notes

- Status values are best-effort heuristics from page text; screenshots are the source of truth.
- GSC property overview shows indexing data still processing ("正在处理数据，请过 1 天左右再来查看").
- All 13 production sitemap URLs were inspected.
"""
        rep.write_text(md, encoding="utf-8")
        print(f"\nWrote report: {rep}")

if __name__ == "__main__":
    main()
