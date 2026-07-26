# Manual Directory Submission Report — 2026-07-27

**Run ID:** manual-20260727T020000Z  
**Agent:** WorkBuddy  
**Method:** Playwright via Chrome debug CDP (port 9222, profile: guochao950518@gmail.com)  
**Product:** Pikbo (https://pikbo.ai)

## Summary

| Metric | Count |
|--------|-------|
| Total directories attempted | 15 |
| **Successfully submitted** | **2** |
| Failed (technical) | 6 |
| Broken (404/SSL) | 7 |
| **Cumulative backlinks** | **3** (incl. aitoolsdirectory.com from 07-25) |

## Successfully Submitted ✅

### 1. Insidr AI (insidr.ai)
- **URL:** https://www.insidr.ai/submit
- **Method:** Playwright CDP → fill form → scrollIntoView → mouse.click
- **Fields filled:** Message (description), Link (pikbo.ai), Tag, Email
- **Result:** "Your submission was successful."
- **Screenshot:** `docs/growth/screenshots/manual-20260727/insidr-03-after-submit.png`
- **Note:** Send button was off-screen (y=-1149), required scrollIntoView before click

### 2. FreeAIO (freeaio.com)
- **URL:** https://freeaio.com/submit-ai-tool/
- **Method:** Playwright CDP → fill WPForms → check terms → click submit
- **Fields filled:** Name (Pikbo), Email, Website URL, Description (400+ words), Pricing Options, Category, Affiliate details
- **Result:** AJAX response `{"success":true}` — "Thanks for contacting us! We will be in touch with you shortly."
- **Screenshot:** `docs/growth/screenshots/manual-20260727/freeaio-3rd-03-after-submit.png`
- **Key learning:** WPForms honeypot fields (field_9, field_10 with `aria-hidden=true tabindex=-1`) must NOT be filled. Setting values on them causes silent rejection.

## Failed Submissions ❌

### aivalley.ai
- **Issue:** WordPress Contact Form 7 AJAX not triggered
- **Attempt 1:** `form.submit()` → redirected to search page (`?s=`)
- **Attempt 2:** Button click via `mouse.click()` → redirected to `/submit-prompts/` without success message
- **Root cause:** CF7 uses jQuery AJAX; native JS events don't trigger the jQuery handler

### bestaibrands.com
- **Issue:** React-based form with no IDs/names on inputs
- **Attempt 1:** JS `el.value =` + dispatchEvent → fields filled but React state not updated
- **Attempt 2:** Playwright native `page.fill()` → couldn't locate elements (no form tag match)
- **Root cause:** React tracks internal state; direct DOM manipulation doesn't update it

### productcool.com
- **Issue:** Google OAuth blocked by RAPT (Risk-Adjusted Product Token)
- **Attempt:** Clicked "Sign in with Google" → account chooser appeared → clicked guochao950518@gmail.com → stuck at `accounts.google.com/signin/oauth/id`
- **Root cause:** Google detects automation via CDP and blocks OAuth redirect
- **Alternative:** Email-based "Send Sign In Link" login available but not attempted

### tap4.ai
- **Issue:** Paid submission ($10/4000 credits) + Google reCAPTCHA
- **Form:** Has fields (website, url, title, description) but defaults to paid radio option
- **Root cause:** Not free despite claiming free submission

### saaspo.com
- **Issue:** Not an AI tools directory — design showcase site
- **Form:** Has Name, Email, Twitter, Website-URL fields but for design submissions

### yaatd.com
- **Issue:** Submit page shows email subscribe form, not tool submission form
- **May need:** Account creation or different URL

## Broken Directories 🔧

| Directory | Issue |
|-----------|-------|
| awesomeaitools.com | 404 |
| aiwizard.io | 404 |
| aitoolhunt.com | 404 |
| saasaitools.com | SSL error |
| ai-tools.io | ERR_CONNECTION_CLOSED |
| startupfa.me | 404 |
| launched.io | SSL error |

## Directories Requiring Login (Google OAuth)

| Directory | Status |
|-----------|--------|
| productcool.com | Google OAuth blocked by RAPT |
| indietools.app | "Continue with Google" — not attempted |
| builtbyme.io | "Continue with Google" — not attempted |
| dang.ai | Login/pricing redirect |

## Screenshots

All screenshots saved to `docs/growth/screenshots/manual-20260727/`:
- insidr-01-load.png, insidr-02-filled.png, insidr-02b-button-visible.png, insidr-03-after-submit.png
- freeaio-01-load.png, freeaio-3rd-02-filled.png, freeaio-3rd-03-after-submit.png
- aivalley-retry-02-filled.png, aivalley-retry-03-after-submit.png, aivalley-retry2-03-after-submit.png
- bestaibrands-01-load.png, bestaibrands-retry-02-filled.png, bestaibrands-retry-03-after-submit.png
- saaspo-01-load.png, saaspo-02-filled.png, saaspo-03-after-submit.png
- productcool-01-after-google-login.png, productcool-02-after-login.png
- tap4ai-01-load.png, tap4ai-02-filled.png, tap4ai-03-after-submit.png
- yaatd-01-load.png, startupfa-me-01-load.png, youtools-01-load.png
- aitoolsync-01-load.png, aitoolszone-01-load.png

## Recommendations for Next Cycle

1. **Email-based login:** Try ProductCool/IndieTools/BuiltByMe via "Send Sign In Link" (check email via agent-mail connector)
2. **aivalley retry:** Use jQuery trigger approach: `jQuery('#form').trigger('submit')` or click button with jQuery event
3. **Best AI Brands retry:** Use Playwright `page.locator('text=Product Name').locator('..').locator('input').fill()` approach
4. **Search for more directories:** Focus on WordPress-based directories (WPForms is automatable) and simple HTML form directories
5. **Monitor GSC:** Check indexing status of 7 requested URLs in 1-2 weeks

## Files Modified

- `scripts/growth-auto/directories.json` — Updated with 7 new directories, 7 marked broken, 2 marked done
- `docs/growth/AGENT_STATE.md` — Updated with manual submission results
- `docs/growth/runs/manual-20260727-report.md` — This report (new)
- `docs/growth/screenshots/manual-20260727/` — 25+ screenshots
