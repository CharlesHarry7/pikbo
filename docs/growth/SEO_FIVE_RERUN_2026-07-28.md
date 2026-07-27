# Pikbo five-page SEO release rerun

Status: read-only release audit — **all five URLs remain NO-GO today**
Reviewed: 2026-07-28 (Asia/Shanghai)
Repository baseline: `origin/main@fc3385e`
Previous decision: `docs/growth/SEO_INDEXABLE_10_RELEASE.md`
Owner: WorkBuddy

## Scope and method

This rerun checks only the proposed five-page cold-start release:

1. `/`
2. `/tools/ai-toy-video-generator`
3. `/tools/blind-box-reveal-video-maker`
4. `/guides/how-to-photograph-toys-for-ai-video`
5. `/pricing`

The audit used:

- the current source and evidence ledger on `origin/main@fc3385e`;
- a clean `next build --webpack`;
- the resulting local production server;
- server-rendered HTML checks; and
- a hydrated Chrome check of metadata, H1, FAQ parity, visible capability copy,
  CTA labels, CTA targets and disabled state.

No business code, production configuration, Supabase, Vercel, DNS, GSC or
public deployment was changed.

## Executive decision

The recent capability-copy and showcase-evidence changes materially improved
truthfulness:

- the homepage cards are now labeled cached prototypes;
- unsupported numeric showcase scores are gone;
- the selected pages explain that cached playback does not process an upload;
- paid checkout is disabled; and
- the five pages have valid titles, H1s, self-canonicals and matching FAQ
  markup.

However, the five-URL release is still **NO-GO**:

- the live sitemap still publishes 13 URLs, not the approved five;
- shared tool components still render unconditional Free/Live language;
- Pricing still claims a live free trial, confirmed credit returns and active
  paid commercial use;
- the blind-box Lab CTA opens the wrong cached Recipe; and
- the photography guide promises five habits but contains four.

Current result: **0 GO / 5 NO-GO**. The guide is one content correction away
from GO. Home and Pricing require copy-only changes. The two tool pages require
copy corrections; each also needs its own official evidence record before GSC
submission.

## Rendered contract summary

| URL | HTTP | Title | H1 | Canonical | Index state | FAQ |
|---|---:|---|---:|---|---|---|
| `/` | 200 | `Pikbo — Turn Toy Photos into Videos` | 1 | `https://pikbo.ai/` | `index, follow` | 5/5 questions and answers match the DOM |
| `/tools/ai-toy-video-generator` | 200 | `AI Toy Video Generator: One Photo to Toy Video \| Pikbo` | 1 | self-canonical | index by default | 10/10 match |
| `/tools/blind-box-reveal-video-maker` | 200 | `Blind Box Reveal Video From One Photo (No Filming) \| Pikbo` | 1 | self-canonical | index by default | 8/8 match |
| `/guides/how-to-photograph-toys-for-ai-video` | 200 | `How to Photograph Toys for AI Video \| Pikbo` | 1 | self-canonical | index by default | 2/2 match |
| `/pricing` | 200 | `Pricing for Toy Sellers and Collectors \| Pikbo` | 1 | self-canonical | `index, follow` | 5/5 match in expandable DOM content |

Notes:

- A missing robots meta on the three static pages means index/follow by
  default; it is not an error.
- The homepage canonical appears without a trailing slash in raw HTML and with
  a normalized trailing slash in the browser; both resolve to the same root.
- The browser retained the user's Chinese UI preference, so the hydrated home
  H1 was `你的潮玩。动起来。` while the server-rendered English H1 was
  `Your toy. In motion.` This is not the release blocker. The stale Chinese
  Free Mini chip is.
- Pricing FAQ answers are inside closed `<details>` elements. They are present
  in the DOM and exactly match FAQPage JSON-LD, so the accordion itself passes.

## Per-page decision

### 1. `/` — NO-GO

Passes:

- unique title and single server-rendered H1;
- self-canonical and index/follow;
- visible FAQ and FAQPage parity;
- eight distinct homepage media files;
- cards say `PIKBO Lab · cached prototype`; and
- the cached panel says `0 credits` and `your upload is not processed`.

Blocking rendered copy:

- Chinese hydrated UI: `Free Mini · 静音墙 · no card`;
- shared panel: `Try free Mini`, `Demo · Free`, `10 credits`;
- shared panel: `Upload one photo → clip on this page`; and
- shared empty state: `Live Mini often 1–3 min`.

The page also contains `Generate live` only inside an explicit
`When Live is enabled...` explanation. That conditional occurrence is
acceptable and is not a blocker.

Evidence:

- eight distinct cached prototype cards are a truthful brand-home preview;
- registry remains 0 official / 12 prototype;
- the home page does not need to call these official cases to earn its brand
  slot, but must keep the cached label.

CTA:

- `Preview cached Lab video` goes to the cached Scout spin;
- the panel preview button is disabled until required local inputs/rights are
  present; and
- CTA state is broadly correct, but adjacent Free/Live copy contradicts it.

Minimum change:

1. make the Chinese `home.browseCta.chip` use the same cached wording as
   English;
2. make `LandingToolPanel` derive the header, quote and empty-state copy from
   capability state; and
3. render only cached wording for anonymous/Free/unknown sessions.

### 2. `/tools/ai-toy-video-generator` — NO-GO

Passes:

- aligned unique title and H1;
- self-canonical, indexable and HTTP 200;
- FAQPage, SoftwareApplication and HowTo markup;
- all ten FAQ questions and answers are present in the DOM;
- cached Scout prototype is clearly labeled; and
- `Try Lab sample` and the main Recipe both resolve to
  `360-spin-showcase`.

Blocking rendered copy:

- `No sign-up. No card. One photo → one video. Free.`;
- shared panel `Try free Mini`, `Demo · Free` and bare `10 credits`;
- `Soft launch uses Seedance Mini with honest Free Mini caps`;
- `Free Mini: ~5s · 480p`; and
- `Live Mini often 1–3 min`.

Evidence:

- the page uses `scout-spin`, a cached prototype;
- there is no rights record, distinct input, provider task ID or named review;
- evidence status is therefore prototype, not official.

Minimum change:

1. replace the rank-page friction line with cached truth, for example:
   `No card for the cached Lab preview · 0 credits · your upload is not
   processed`;
2. capability-gate the shared panel and three-step copy; and
3. do not submit this URL until a complete official Scout/360 record passes
   `assertShowcasePromotionGate`.

### 3. `/tools/blind-box-reveal-video-maker` — NO-GO

Passes:

- aligned unique title and H1;
- self-canonical, indexable and HTTP 200;
- FAQPage, SoftwareApplication and HowTo markup;
- all eight FAQ questions and answers match;
- the page-level output example is the correctly labeled `moon-reveal`
  cached prototype; and
- the primary `Open Generate` path uses `blind-box-unboxing`.

Blocking rendered copy:

- shared panel `Try free Mini`, `Demo · Free` and bare `10 credits`;
- `Soft launch uses Seedance Mini with honest Free Mini caps`;
- `Free Mini: ~5s · 480p`; and
- `Live Mini often 1–3 min`.

CTA defect:

- `Try Lab sample` opens
  `/create?effect=360-spin-showcase&source=scout-spin...`;
- on a blind-box intent page it must open the matching
  `blind-box-unboxing` / `moon-reveal` cached sample.

Evidence:

- `moon-reveal` is still a prototype with no complete official proof chain.

Minimum change:

1. capability-gate the shared panel and three-step copy;
2. let the Lab CTA accept the current page's Recipe and showcase source instead
   of hard-coding Scout spin; and
3. require a complete official Moon/blind-box evidence record before
   submission.

### 4. `/guides/how-to-photograph-toys-for-ai-video` — NO-GO

Passes:

- unique title, one H1, self-canonical and indexable;
- Article plus FAQPage structured data;
- both FAQ questions and answers match the expandable DOM;
- `Try Lab sample` is the correct cached-safe CTA;
- no forbidden unconditional Live phrase was found; and
- an official model-output case is not required to answer this informational
  query.

Blocking content defect:

- the dek says `Five quick photo habits`;
- the intro says `These five habits`;
- the article contains only sections 1–4.

Minimum change:

- either add a genuinely useful fifth section, or change both claims from five
  to four. Adding a fifth section about locking exposure/white balance is the
  stronger content option.

After that one correction and a final rendered check, this page is GO.

### 5. `/pricing` — NO-GO

Passes:

- unique title, one H1, self-canonical and index/follow;
- all five visible FAQ questions and DOM answers match FAQPage JSON-LD;
- plan allowances are mostly framed as configured estimates;
- paid buttons are disabled and say `Coming soon`; and
- the primary anonymous CTA says `Try Lab sample`.

Blocking rendered copy:

- `Free trial is live`;
- `Failed live jobs return their credit charge`;
- `Commercial use starts on paid plans`; and
- estimator says `Current allowance` even though purchase is closed.

The last three claims describe intended behavior, not verified current
availability. `release_unconfirmed` must never be presented as a confirmed
credit return.

Minimum change:

1. replace the checkout helper with:
   `Cached Lab previews are available. Live purchase remains closed until
   protected delivery is ready.`;
2. replace the refund bullet with:
   `A refund is shown only after the server confirms release`;
3. replace the commercial bullet with:
   `Planned paid terms include commercial use for reviewed clips made from
   assets you own`; and
4. change `Current allowance` to `Configured planning allowance`.

## Global release blockers

### 1. The sitemap contract is still 13 URLs

The rendered sitemap still contains 13 URLs, including eight URLs explicitly
held by the previous release decision. `COLD_START_INDEX_PATHS` is still the
13-path array in `lib/seoIndex.ts`, and `app/sitemap.ts` publishes it.

Minimum change:

- reduce `COLD_START_INDEX_PATHS` to the five paths audited here;
- remove the other eight from the sitemap;
- make those public pages `noindex,follow`; and
- update the stale “9-URL” comment in `app/robots.ts`.

This is a release-contract correction, not permission to submit GSC.

### 2. Shared copy is not actually capability-derived

`LandingToolPanel` and `LandingHowItWorks` are reused on the home and both tool
pages. Static Free/Live sentences in those components override the newer
truthful body copy.

Minimum source locations:

- `app/tools/[slug]/page.tsx:117–123`
- `components/LandingHowItWorks.tsx:13–28`
- `components/LandingToolPanel.tsx:456–505`
- `components/LandingToolPanel.tsx:590–617`
- `components/LandingToolPanel.tsx:944–954`
- `lib/i18n.ts` key `home.browseCta.chip` for every locale

One shared fix is preferable to editing page definitions individually.

### 3. Current green copy smoke does not exercise rendered pages

`npm run live-copy-smoke` reports:

```text
live-capability copy smoke: PASS (18 source files, 0 rendered routes)
```

That explains why the source scan is green while the production render still
contains blocked phrases.

Minimum change:

- make the check start or consume a production build and inspect these five
  rendered routes;
- test the default cached/validation state;
- fail on the exact unconditional phrases recorded above; and
- allow `Generate live` only when it occurs inside the approved conditional
  sentence.

### 4. Official evidence remains absent

`SHOWCASE_EVIDENCE_LEDGER.md` remains:

```text
0 official / 12 prototype / 0 rejected
```

This is honest and the promotion gate works, but the two commercial tool pages
must not be submitted as proof-backed tools until their distinct evidence
records are complete.

## Required minimum patch order

1. Fix shared capability copy in `LandingToolPanel`,
   `LandingHowItWorks` and the primary tool friction line.
2. Fix Pricing's four availability statements.
3. Fix the blind-box Lab CTA Recipe/source mismatch.
4. Fix the photography guide's five-versus-four mismatch.
5. Reduce sitemap/index allowlist from 13 to five.
6. Extend the rendered copy smoke so these regressions cannot return.
7. Add separate official evidence records for Scout spin and Moon reveal.
8. Rebuild and rerun this exact five-page audit.

Only after all eight steps pass should an owner decide whether to deploy and
submit the five URLs. This document does not authorize production or GSC.

## Validation record

Passed on `origin/main@fc3385e`:

- `next build --webpack` — 193 pages generated;
- TypeScript during the production build;
- `npm run live-copy-smoke` — source-only pass, **0 rendered routes**;
- `npm run showcase-evidence-smoke`;
- `npm run showcase-promotion-gate`;
- all five URLs returned HTTP 200;
- all five had one H1 and a self-canonical;
- all five were indexable;
- all five FAQPage blocks matched content present in the DOM; and
- no browser or production state was retained or changed.

Not run and not authorized:

- GSC submission;
- IndexNow submission;
- Supabase/Vercel/DNS changes;
- production deployment;
- Stripe; or
- paid provider generation.
