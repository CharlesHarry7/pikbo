# Higgsfield-inspired Pikbo Wave A — implementation and validation

**Date:** 2026-07-29 (Asia/Shanghai)

**Baseline:** `origin/main@50db8e31f9b86b1d59f52a85a090e75a982a2c51`

**Worktree:** `agent/gpt/higgsfield-wave-a`

**State:** local, uncommitted, not pushed or deployed

## Scope delivered

- One shared `live | validation | preview | coming_soon` capability registry
  drives the Wave A shell and Home entry rail.
- Desktop shell stays sticky; mobile retains five destinations and promotes a
  central `/create` action without changing the frozen global navigation
  contract.
- Home adds an original Pikbo product rail and seller-result value banner,
  while keeping Recipe reuse and Project inspection as separate surfaces.
- Explore retains all six URL-addressable filters and separates Project open
  from Recipe reuse; provider/model evidence remains fail-closed.
- Recipes add search, category filtering and explicit
  `official_cached | live_generated | concept` provenance. Concept cards do not
  borrow another Recipe's video.
- Project pages show paired input/output, Recipe, output settings, source and
  evidence state, and preserve the full validated RemixIntent into Create.
- Unknown Project and Recipe slugs fail with 404.
- Create keeps the existing generation, quote, reservation, retry, refund and
  unknown-settlement contracts. Cached mode remains 0 credits, calls no
  provider and does not process the visitor's current upload.
- Library remains local to the device and can group clips by Project, Recipe or
  Toy Identity SKU, with explicit export wording and no cloud-sync claim.
- Media loading remains poster-first: Home has one eager hero candidate,
  below-fold Project media use lazy sources, mobile autoplay is capped at one,
  desktop at two, and reduced motion disables autoplay with manual controls.

## External engineering review

Conversation:
`https://chatgpt.com/c/6a68f130-88a8-83e8-9ff3-1fadae7a3025`

The source package contained 409 tracked files and 519 ZIP entries. A scan of
395 text files found no credential pattern. Exact package identity:

- 4,519,436 bytes
- SHA-256:
  `3e8e60fb9c55f844fb434cf5cc674c4324cb11d95315388ee0a939258c5bdd8d`

ChatGPT Pro's first patch was rejected because it tried to add an existing
tracked growth document that the security-scoped ZIP had intentionally
excluded. The complete replacement patch then applied cleanly to the real
baseline:

- 122,922 bytes
- SHA-256:
  `b3586b483a99bea66f1b612c4ec96504fbfcad446a18f9e6519f06c5c7b0d879`

The final three-file addendum also applied cleanly after the replacement:

- 5,508 bytes
- SHA-256:
  `c05c82f7c8740e4ecdbbc4fe7e8031b2e3f358457b991e759297f37b0058c740`

## Corrections required from ChatGPT Pro

1. Remove the false addition of an existing `docs/growth` file so the patch
   applies to the actual commit.
2. Restore the global shell Create destination to `/create`; RemixIntent
   belongs on contextual Project/Recipe cards.
3. Remove eager loading from below-fold Home Project media and use lazy
   sources.
4. Remove an unconditional Free/Live trial claim from the Recipe page.
5. Remove unrelated T6 CI drift from the Wave A patch.
6. Rename a smoke-script `module` variable that failed the repository's real
   Next ESLint rule.
7. Add the missing Library Recipe grouping mode keyed by the Recipe effect.
8. Remove user-visible competitor-branded Library wording.

Codex retained two stricter local refinements over the addendum: explicit
source-contract assertions for Recipe grouping/brand removal and a
`Recipe · …` group heading that keeps the grouping semantics obvious to screen
reader and visual users.

## Independent verification

| Check | Result |
|---|---|
| `npm ci` | passed; 379 packages installed |
| conflict markers, `git diff --check` | passed |
| ESLint | passed |
| full `tsc --noEmit` | passed |
| production build | passed; Next.js 16.2.11, 193 pages |
| `engine-smoke` | passed; 32/32 health combinations |
| recovery cost/QA/ledger/retry/reconciliation | passed |
| T5 auth/credits, T5/R0 critical path, R0 safety net | passed |
| showcase evidence/promotion, product proof, mobile proof | passed |
| SEO, cached Seller Pack, launch pack, live-copy, Wave A contracts | passed |
| running `link-check`, `critical-path` | passed |
| running cached-only Seller Pack API golden | passed; three children, 0 credits, provider unavailable |
| rendered live-copy scan | passed; 18 source files, 165 rendered routes |
| Playwright browser matrix | passed; Chromium, Firefox, WebKit × 390×844, 768×1024, 1440×900 |
| stateful Library Recipe grouping | passed in Chromium 390×844 |
| final E2E result | 10 passed, 8 intentional skips; no failures |
| visual/resource evidence | 9 screenshots + 9 resource JSON files; exactly one initial `.mp4`/`.webm` resource per Home load |

The browser loop verifies Home → Project → Create, Explore filtering, Recipe →
Create, Library return, unknown slugs, exact query preselection, document
overflow, media budget, reduced motion, explicit video controls, keyboard
focus and accessible names.

Initial E2E runs exposed assertions that counted poster-image URLs as video
resources and selected non-unique links. Those were test-harness defects, not
product passes; failure screenshots, traces and videos were retained before
the assertions were corrected and the full matrix rerun.

## Dependency and security review

- Added only `@playwright/test@1.62.0` as an exact devDependency, plus its lock
  update. No browser installation command is a production dependency.
- No HTTP API, database schema, provider, Stripe, production config or runtime
  dependency changed.
- Final external addendum credential scan found no private-key, cloud, GitHub,
  OpenAI/fal, Stripe or session-secret pattern.
- `npm audit --omit=dev` reports three high-severity advisories in PostCSS and
  sharp inherited through the existing Next.js dependency graph. The proposed
  `npm audit fix --force` would install a breaking Next.js 9.3.3 downgrade, so
  it was not applied. This needs an upstream-compatible dependency update in a
  separately scoped change.
- The production build repeats a baseline Turbopack NFT warning caused by
  dynamic filesystem access traced from `lib/entitlements.ts`. The build
  succeeds; serverless trace breadth should be reviewed separately.

## Truth boundary and unverified risks

- All browser/API tests used local cached mode. They are not production, paid,
  provider-generation, database, webhook, watermark-worker or cross-device
  persistence proof.
- No real user data, customer metrics, conversion uplift or performance uplift
  was used or claimed.
- No production secrets were loaded. The local server correctly reported
  cached-only/degraded health and all Live requirements false.
- No commit, push, pull request, deployment, migration, DNS change, public
  indexing action or production feature enablement occurred.
