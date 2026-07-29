# Wave A Home visual v2 — independent QA

Date: 2026-07-29

Locked implementation parent: Draft PR #78 head
`7bdc280f6dceda7a62ec90978e51a0c1aa154c55`

Reviewed implementation head:
`41157c39b4437d74ec451cdf2a73ad7be54124db`

Branch: `agent/k3/wave-a-frontend-polish`

Scope: Home Hero, Home Recipe covers, directly related Project/Create truth,
mobile media loading, stacked-PR CI trigger.

## Outcome

PASS locally. The selected rainy-workbench visual replaces the rejected
four-character studio lineup with one original protagonist and a separate
input → set → cached editorial output rail. The eight Home Recipe covers share
that character, material and palette. Registered cached Project evidence keeps
its original poster/video and has a separate `Proof` door.

No API, credit, pricing, provider, database, persistence, lockfile, production
configuration, or dependency contract changed.

## Visual evidence

First viewport:

- [Chromium · 390×844](e2e/chromium-390x844-home-first.webp)
- [Chromium · 768×1024](e2e/chromium-768x1024-home-first.webp)
- [Chromium · 1440×900](e2e/chromium-1440x900-home-first.webp)

The same first/full pair is stored for all nine Chromium/Firefox/WebKit ×
390/768/1440 combinations under `e2e/`. Full pages were scrolled first so lazy
Recipe assets were painted, then paused before capture. PNG originals were
converted lossily to WebP quality 76 to keep committed evidence near 4 MB.

Key screenshot SHA-256:

- Chromium 390 first:
  `e37e23509dc2ca54bcc6d2ac63a0b550589ac514e5cb2b250e2ba7b5be6030f0`
- Chromium 1440 first:
  `bf2f064c4219a6f609e2c61cbc94383c73899ad3469edaa198d7d5fa0504b6ca`

## Media budgets and request behavior

| Asset/behavior | Limit | Actual | Result |
|---|---:|---:|---|
| Mobile Hero poster | ≤150 KB | 34,326 B | PASS |
| Desktop Hero poster | ≤300 KB | 65,608 B | PASS |
| Hero 5 s loop | ≤1.5 MB | 183,575 B | PASS |
| Home Recipe covers | ≤250 KB each | 12,336–33,550 B | PASS |
| Mobile initial Hero video request | 0 | 0 in all six mobile/tablet runs | PASS |
| Desktop initial main video | ≤1 | 1 logical Hero URL | PASS |

WebKit records an initial two-byte range probe plus the full Hero response on
desktop; both entries are the same one URL, not two media items. Per-browser
resource JSON is stored beside the screenshots.

## Browser acceptance

Playwright 1.62.0 ran the full Wave A path on all nine projects:

| Browser | 390×844 | 768×1024 | 1440×900 |
|---|---|---|---|
| Chromium | PASS | PASS | PASS |
| Firefox | PASS | PASS | PASS |
| WebKit | PASS | PASS | PASS |

Result: 10 passed, 8 intentional skips. The extra stateful device-local Library
grouping case runs once on Chromium 390; the full closed-loop case runs on all
nine projects.

Every matrix run checks Home → Project → Create, Explore filter state, Recipe →
Create, device-local Library return, unknown Project/Recipe 404, complete
`effect/source/ratio/duration/channel`, no document overflow, keyboard focus,
reduced-motion pause plus accessible play control, mobile CTA in the initial
viewport, and autoplay budget.

One initial WebKit 768 run timed out only while taking an animated full-page
screenshot. It was not reported as passing. The evidence helper was corrected
to pause media, save a first viewport, scroll to paint lazy media, then capture
the full page. The entire nine-project matrix was rerun: 10 passed / 8 skipped.
Final machine-readable results: `results.json`.

## Repository gates

PASS:

- `npm ci`
- conflict-marker scan and `git diff --check`
- `npm run lint`
- `npm run typecheck`
- `npm run build` — 193 routes
- `engine-smoke`
- `wave-a-contract-smoke`
- `wave-a-visual-v2-smoke`
- `recovery-cost-gate`, `recovery-qa`, `recovery-ledger`,
  `recovery-retry-deadline`, `recovery-reconciliation`
- `t5-auth-credits-smoke`, `t5-r0-critical-path`, `r0-safety-net`
- `showcase-evidence-smoke`, `showcase-promotion-gate`
- `product-proof-smoke`, `mobile-proof-regression`
- `seo-cold-start-smoke`, `seller-pack-cached-smoke`,
  `launch-pack-main-path-smoke`
- `live-copy-smoke` source and 166 rendered routes
- running-production `link-check`, `critical-path`,
  `seller-pack-api-golden`

Raw command output:

- `logs/source-gates.log`
- `logs/runtime-gates.log`

The installed local Node 24.14.0 emitted an npm 12 compatibility warning because
npm prefers Node 24.15.0 or newer; the actual install, lint, typecheck, build and
tests passed. CI uses the repository's Node 22 workflow.

## Remote and second-review status

- GitHub Actions CI run #506 for `41157c3`: PASS, including conflict markers,
  engine/Wave A/recovery/credits/showcase/product/mobile/SEO/Seller Pack/copy
  gates, strict lint, typecheck, build and running-server checks.
- Automatic Vercel preview commit status for `41157c3`: success / Ready. No
  manual production deployment was requested or performed.
- K3 independently fetched exact remote head `41157c3` into a fresh review
  copy. It reported 10/10 checklist items and 24/24 independent runtime checks
  passed, with repository E2E matching 10 passed / 8 intentional skips. It
  found no defect and made no corrective commit. See `K3_FINAL_REVIEW.md`.

## Truth and safety audit

- Hero CTA emits generic `landing_view`; it has no Recipe slug and never emits
  `recipe_use`.
- Home Recipe covers are labelled `Editorial recipe art`.
- Project evidence is a separate, named link to the registered cached record.
- Project/Create sample posters were restored to their registered legacy
  Orbit/Moon/Scout/Beatbot stills.
- Cache mode states upload not processed, provider not called, zero credits.
- Mobile attaches no Hero source until explicit Play.
- `prefers-reduced-motion` prevents automatic playback; default video behavior
  remains unchanged outside components opting into `poster-only`.
- New media contains no external URL, brand mark, real person, or known IP.
- `CapabilityState`, `RemixIntent`, Showcase registry and HTTP APIs are intact.

## Not production-verified

This is cached/local product validation. No paid generation, provider call,
credit spend, production credential, real user data, database migration,
deployment, production configuration, or real live-domain validation occurred.
The automatic PR preview status is a CI signal, not production verification.
