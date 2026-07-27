# Pikbo cold-start index release: five pages, not fifty

Status: release recommendation — **do not submit yet**
Reviewed: 2026-07-28 (Asia/Shanghai)
Repository baseline: `main@251a208`
Scope: read-only source, rendered-output, sitemap, robots, canonical and evidence audit
Owner for this audit: WorkBuddy (no business-code or production changes)

## Decision

The current sitemap exposes 13 URLs. The first release should contain **five**
indexable URLs, not ten:

1. `/`
2. `/tools/ai-toy-video-generator`
3. `/tools/blind-box-reveal-video-maker`
4. `/guides/how-to-photograph-toys-for-ai-video`
5. `/pricing`

Pages 6–10 are intentionally unfilled. There is not enough query, product-proof
or intent-separation evidence to spend crawl budget on them.

This is a target allowlist, not permission to submit it now. On
`main@251a208`, only the photography guide is close to release-ready. Home, the
two commercial tools and Pricing still render unconditional Free/Live claims
for a deployment whose authoritative state is cached/validation. The public
launch and GSC submission therefore remain **NO-GO** until the blockers below
are closed.

The two selected tool pages each have a distinct matching cached prototype, but
neither has an `official` evidence record. They may keep their release slots
only after the copy is capability-gated and the complete evidence record is
promoted according to `SHOWCASE_EVIDENCE_LEDGER.md`.

## What was audited

### Build and rendered route inventory

`next build --webpack` completed on this source tree and generated 193 pages.
The rendered public UI inventory contained 167 reachable UI paths after
excluding Next's internal error pages and adding dynamic UI routes:

| Result | Count |
|---|---:|
| HTTP 200 UI pages | 135 |
| Legitimate redirects/aliases | 32 |
| `noindex` among HTTP 200 UI pages | 122 |
| Indexable among HTTP 200 UI pages | 13 |

The 13 indexable pages exactly matched the 13 sitemap entries. API routes are
excluded from this UI count and are disallowed by `robots.txt`.

Route-family results:

| Family | HTTP 200 | Redirects | Indexable | `noindex` |
|---|---:|---:|---:|---:|
| Home | 1 | 0 | 1 | 0 |
| Tools | 22 | 0 | 5 | 17 |
| `/for` | 17 | 31 | 3 | 14 |
| Guides | 11 | 0 | 1 | 10 |
| Effects | 28 | 0 | 0 | 28 |
| Toys | 15 | 0 | 0 | 15 |
| Projects | 12 | 0 | 0 | 12 |
| Apps | 10 | 0 | 0 | 10 |
| Pricing | 1 | 0 | 1 | 0 |
| Privacy + Terms | 2 | 0 | 2 | 0 |
| Other public/private UI | 15 | 1 | 0 | 15 |

This confirms that the allowlist mechanism works. The problem is the selection
and the factual readiness of the 13 allowed URLs, not an uncontrolled
indexation of all 193 generated pages.

### Evidence state

- GSC evidence is approximately 6 impressions and 0 clicks. It cannot establish
  demand, ranking success, CTR failure or keyword difficulty.
- The public evidence ledger contains **0 official, 12 prototype, 0 rejected**
  showcase projects.
- Exact-title observations are hypotheses, not search volume or “blue ocean”
  proof.
- Several current index pages reuse the same `scout-spin` cached prototype.
  A shared Recipe clip is not an independent page-level case.

Sources:

- `docs/growth/KEYWORD_RESEARCH_REPORT.md`
- `docs/growth/SHOWCASE_EVIDENCE_LEDGER.md`
- `docs/growth/WEBSITE_PERFORMANCE_SUMMARY.md`
- `docs/prd/LIVE_CAPABILITY_COPY_MATRIX.md`

## Five-page release table

Rendered checks below were made against the local production build. “Internal
links” includes links supplied by the global shell as well as the page body; it
is useful as a crawlability check, not a page-quality score.

| Order | Path and search job | Rendered on-page check | Proof / product path | Release decision |
|---:|---|---|---|---|
| 1 | `/` — Pikbo brand plus owned-toy photo-to-video discovery | Unique title, one H1 (`Your toy. In motion.`), self-canonical, FAQ JSON-LD, 31 internal routes, Create and Seller Starter Pack entry | Eight distinct, clearly labeled Pikbo Lab cached prototypes; not official cases | **Keep release slot; BLOCKED.** Replace unconditional Free Mini/Live language with cached/validation state. Do not imply the upload is processed. |
| 2 | `/tools/ai-toy-video-generator` — primary category/head-term tool | Unique title, one aligned H1, self-canonical, visible FAQ plus FAQ/SoftwareApplication/HowTo JSON-LD, 65 internal routes, working on-page upload panel and `360-spin-showcase` Create deep link | Matching `scout-spin` cached prototype; current ledger status is prototype | **Keep release slot; BLOCKED.** Capability-gate all Free/Live copy and complete an official input→provider task→output→review record. This owns the broad tool intent; overlapping generic pages remain noindex. |
| 3 | `/tools/blind-box-reveal-video-maker` — one-photo blind-box reveal | Unique title, one aligned H1, self-canonical, visible unique FAQ plus structured data, 64 internal routes, working upload panel and `blind-box-unboxing` deep link | Matching `moon-reveal` cached prototype; current ledger status is prototype | **Keep release slot; BLOCKED.** Capability-gate Free/Live copy and complete an official blind-box evidence record. Keep this single-clip intent separate from later brand-campaign content. |
| 4 | `/guides/how-to-photograph-toys-for-ai-video` — informational input-quality job | Unique title, one aligned H1, self-canonical, Article + visible FAQ/FAQPage, 66 internal routes, related Recipes and cached-safe CTA | Original instructional content; an output case is not required to answer the photography query | **Keep.** On-page structure and intent pass. Before submission, confirm the hydrated CTA says `Try Lab sample` in cached/validation mode and contains no unconditional Live promise. |
| 5 | `/pricing` — branded commercial investigation and plan comparison | Unique title, one H1, self-canonical, visible FAQ/FAQPage, 50 internal routes, Seller Starter Pack and Studio paths; paid checkout is disabled | Does not require a showcase case, but must describe availability and allowances accurately | **Keep release slot; BLOCKED.** Implement the exact conditional planning language from `LIVE_CAPABILITY_COPY_MATRIX.md`; remove “Free trial is live” and unconditional refund/commercial-use claims while protected delivery and billing are closed. |

### Why this set is deliberately smaller than ten

- Home is the brand discovery surface.
- The core tool owns the broad category query.
- The blind-box tool is the only currently indexed specialist tool with a
  different primary Recipe and a different cached prototype.
- The photography guide answers a distinct informational query and improves
  input quality for the product.
- Pricing answers branded purchase investigation without creating another
  generation keyword page.

Adding more URLs now would either reuse the same proof, overlap an existing
intent, index a legal/private surface, or promote a page before capability and
case evidence are truthful.

## Eight current sitemap URLs to remove from the release

These routes should remain reachable where useful, but should be
`noindex,follow` and absent from the sitemap until their stated promotion gate
is met.

| Current sitemap URL | Decision | Reason / promotion gate |
|---|---|---|
| `/tools/figure-360-product-video` | Hold | Same `360-spin-showcase` / `scout-spin` proof as the core tool. Promote only with a separate owned figure input/output case plus query evidence showing the 360 intent deserves its own URL. |
| `/tools/one-photo-product-video` | Hold | Has a floating-hero prototype but materially overlaps the broad “photo to toy video” job. Promote only after GSC/SERP evidence separates the single-photo constraint from the core tool and an official case exists. |
| `/tools/ai-product-video-generator-for-toys` | Hold | Reuses the core page's 360 proof and overlaps listing/marketplace intent. Promote only after a distinct product-listing case and query evidence; otherwise consolidate signals into the core or Etsy page. |
| `/for/photo-to-video-for-toys` | Hold | Direct overlap with `/tools/ai-toy-video-generator`; it also uses the same primary 360 prototype. Consolidate or prove a distinct seller job before promotion. |
| `/for/etsy-listing-videos` | Reserve candidate | Commercial intent is promising but unmeasured, and the page reuses `scout-spin`. Promote after an Etsy-specific owned-SKU case, current Etsy media-rule verification, and a full Starter Pack path. |
| `/for/action-figure-product-videos` | Reserve candidate | Strong vertical fit but no independent action-figure evidence; currently reuses the same 360 prototype. Promote after an owned articulated-figure case and query evidence. |
| `/privacy` | Remove from acquisition sitemap; `noindex,follow` | Legal access is required, Google acquisition is not. The text still describes Cookie credits, guest reset, Stripe subscription data and all uploads being sent to a provider; it must be updated before being treated as a trustworthy indexed policy. |
| `/terms` | Remove from acquisition sitemap; `noindex,follow` | Keep linked and accessible for users. It is not a high-intent acquisition page and should not consume the cold-start sitemap budget. Re-review after the service, account and delivery contract stabilizes. |

## Treatment of every other route

The existing default is mostly correct:

- `create`, `explore`, `community`, `effects`, `projects`, `tools` hub, `/for`
  hub, `toys`, `guides` hub, Apps/Modules/Flow/Cinema/Image/Models and other
  preview surfaces: `noindex,follow`, absent from sitemap.
- `library`, `profile`, `settings`, `login`, auth callback and status:
  `noindex,nofollow`; private/auth routes may also remain disallowed in
  `robots.txt`.
- `/for` aliases: keep as redirects to one canonical URL, never as additional
  sitemap entries.
- API routes: keep disallowed.
- Concept Recipes and projects without official evidence: reachable for product
  navigation, never submitted as search proof.

Do not add another pSEO URL merely because a title-operator query returned zero
results.

## Clear implementation defects (report only)

No code was changed in this audit. Engineering should address these in its own
branch:

1. **The cold-start allowlist is 13, not a focused release set.**
   `lib/seoIndex.ts:52–66` lists all 13; `app/sitemap.ts:12–27` publishes every
   entry. `app/robots.ts:9` still says “9-URL” and is stale.

2. **The source calls unmeasured terms “blue ocean”.**
   `lib/seoIndex.ts:47–50` and `lib/seoIndex.ts:68–70` conflict with the
   evidence rule that exact-title observations do not establish competition or
   volume.

3. **Home metadata and body promise a live Free Mini path while Live is
   closed.**
   `lib/site.ts:19–26`, `app/page.tsx:98–116`, and
   `components/HomeSeoBody.tsx:19–29, 65–80, 155–163, 222–237` conflict with
   `docs/prd/LIVE_CAPABILITY_COPY_MATRIX.md`.

4. **The core tool renders an unconditional Free claim.**
   `app/tools/[slug]/page.tsx:117–123` says “No sign-up. No card. One photo →
   one video. Free.” `lib/tools.ts:33–45, 65–74` also describes a live Free Mini
   loop without checking capability.

5. **The indexed tool/use-case pages repeat unconditional Free/Live copy.**
   Examples include `lib/tools.ts:122–151, 346–382, 582–618, 623–667` and
   `lib/usecases.ts:28–64, 277–315, 318–360`. The copy must be conditional or
   cached-only before any of these pages is submitted.

6. **Multiple index pages share one page-level “example”.**
   `components/LandingResults.tsx:14–17` selects examples by primary effect.
   The core tool (`lib/tools.ts:57`), AI product tool (`lib/tools.ts:138`),
   figure-360 tool (`lib/tools.ts:605`), Etsy page (`lib/usecases.ts:52`),
   photo-to-video page (`lib/usecases.ts:301`) and action-figure page
   (`lib/usecases.ts:348`) all resolve to `360-spin-showcase`, so they reuse
   `scout-spin`.

7. **Pricing is not yet aligned with the new capability matrix.**
   `components/PricingCheckoutButton.tsx:25–40` says “Free trial is live.”
   `components/PricingHeroCopy.tsx:31–48, 129–133` and
   `app/pricing/page.tsx:43–53, 103–107` contain unconditional live/refund or
   commercial-use language.

8. **The indexed Privacy policy no longer describes the fail-closed product.**
   `app/privacy/page.tsx:20–42` says uploads are sent to the provider, credits
   live in a Cookie, clearing it resets the free session, and Stripe billing
   data may be collected. This conflicts with cached/validation behavior and
   the durable-auth direction.

The missing H1 on `/create` is not an SEO release defect because `/create` is
intentionally `noindex`; it is a product/accessibility matter for the
engineering owner.

## Pre-launch acceptance

### Index and crawl contract

- [ ] `COLD_START_INDEX_PATHS` contains exactly the five paths in this report.
- [ ] The rendered sitemap contains exactly those five URLs, with stable review
      dates.
- [ ] Each sitemap URL returns HTTP 200, has one self-canonical, one H1, a
      unique title and description, and is not `noindex`.
- [ ] The eight removed URLs render `noindex,follow` and are absent from the
      sitemap.
- [ ] All aliases redirect to one canonical route; no alias is in the sitemap.
- [ ] Private pages remain `noindex,nofollow`; API/auth/private crawl rules stay
      fail-closed.

### Search intent and content

- [ ] Each selected page has one primary search job; title, H1, visible copy,
      FAQ and CTA describe the same job.
- [ ] Visible FAQ content exactly matches FAQPage JSON-LD.
- [ ] Each selected commercial page links to the correct Recipe/Create preset
      and the Seller Starter Pack where relevant.
- [ ] Each selected page links to at least three useful related pages, but does
      not present a noindex Concept page as verified proof.
- [ ] No selected page contains unconditional forbidden phrases from
      `LIVE_CAPABILITY_COPY_MATRIX.md`.

### Capability and evidence

- [ ] Cached/validation sessions say `Cached Pikbo Lab prototype · 0 credits ·
      your upload is not processed`.
- [ ] No cached click emits a Live-generation event or calls a provider.
- [ ] The core and blind-box tool examples have owned/licensed input, a distinct
      input and output poster, provider task ID, exact model/parameters, readable
      output, named reviewer/date and five scores of at least 4/5.
- [ ] Pricing describes 1/5/15 only as configured planning allowances and keeps
      checkout disabled until protected delivery and billing are actually ready.
- [ ] Production analytics can distinguish landing view → cached preview →
      owned-photo upload → Starter Pack quote/start/export; no conversion rate
      is reported before event receipt is verified.

### Release checks

- [ ] Lint, typecheck, production build, link check and critical path pass on
      the release commit.
- [ ] Public GO/DNS authorization is explicit; this report does not grant it.
- [ ] A production fetch confirms the same title/H1/canonical/robots results as
      the local build.
- [ ] Search Console URL Inspection is recorded for each submitted URL.

## GSC submission order

Do **not** submit or request recrawl while the release is NO-GO.

After the code, evidence, deployment and public-GO gates pass:

1. Submit the five-URL sitemap once.
2. Inspect `/` first to verify canonical, rendered cached/validation copy and
   crawlability.
3. Inspect the photography guide to verify Article/FAQ rendering.
4. Inspect `/tools/ai-toy-video-generator` only after its official evidence
   record and capability-gated CTA pass.
5. Inspect `/tools/blind-box-reveal-video-maker` only after its separate
   official evidence record passes.
6. Inspect `/pricing` last, after capability wording and checkout state match
   production health.
7. Record status as `discovered`, `crawled`, `indexed` or `not indexed`; do not
   call a submission “indexed”.
8. Wait for interpretable page/query data before promoting a reserve candidate.
   The next candidate must earn its slot with query evidence, a distinct working
   job, an independent official case and a Starter Pack path.

The first expansion decision should be consolidation versus one reserve
candidate—not another batch of pages.
