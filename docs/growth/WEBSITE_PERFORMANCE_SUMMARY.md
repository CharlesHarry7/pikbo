# Pikbo.ai evidence-based performance snapshot

> Captured: 2026-07-27 (GMT+8)
> Sources: production HTTP checks, GSC URL Inspection screenshots, an early GSC
> performance snapshot, and directory run logs
> Rule: observations are not extrapolated into traffic, ranking, or backlink claims

## Verified production facts

| Item | Verified observation |
|---|---|
| Domain | `https://pikbo.ai` |
| Product | owned toy photo → short AI video |
| Homepage / core route checks | returned HTTP 200 during the recorded check |
| Sitemap | 13 URLs |
| Robots | public routes allowed; private/API routes disallowed as recorded |
| Stripe | disabled |
| Production health | FAL configured; auth and durable credits disabled in the 2026-07-27 audit |
| Public examples | 12 registered assets; official-proof status is audited separately |

“Asset exists” is not equivalent to “verified provider generation.” See
`docs/growth/SHOWCASE_EVIDENCE_LEDGER.md`.

## Google evidence

### URL Inspection

The stored GSC URL Inspection screenshots report “indexed” for the 13 sitemap
URLs at the time of inspection. This is a point-in-time result for those exact
URLs, not a promise of permanent indexing.

### `site:` observation

A manual `site:pikbo.ai` search displayed an approximate result count near 48.
Google documents these counts as approximate and the operator is not a complete
index report. Therefore:

- do not call 48 the exact indexed-page count;
- do not subtract 13 and claim exactly 35 extra indexed pages;
- use GSC Page Indexing and URL Inspection as the primary evidence.

### Search performance

The recorded GSC snapshot covered approximately 2026-07-23 through 2026-07-24:

| Metric | Recorded value | Safe interpretation |
|---|---:|---|
| Clicks | 0 | no click observed in the tiny sample |
| Impressions | 6 | too little data for a trend |
| CTR | 0% | descriptive only; not a diagnosis |
| Average position | 4 | mixed-query average from six impressions; not ranking capability |

This sample does not prove a successful ranking, a title failure, a new-site
preference window, or keyword demand. Freeze speculative conclusions until the
sample becomes interpretable.

## Directory and backlink evidence

Use these statuses everywhere:

| Status | Meaning |
|---|---|
| `submitted` | a form was sent; no editorial acceptance is known |
| `pending` | the directory explicitly reports review pending |
| `published` | a public listing URL is accessible |
| `verified_backlink` | the public listing contains a crawlable link to Pikbo and was rechecked |

Historical automation logs contain several `submitted` results. No public
listing URL and crawlable Pikbo link were recorded for those rows in the
canonical log. Therefore, at this snapshot:

```text
submitted forms: several historical entries (see run logs)
published listings with recorded public URL: 0 verified
verified backlinks: 0
```

This does not say a directory will never publish Pikbo; it says publication has
not yet been evidenced. Submissions must not be reported as backlinks.

## What is not measured yet

- visitor → upload;
- upload → Starter Pack quote;
- quote → generation;
- generation → Pack export;
- first Pack → second SKU;
- reliable referral sessions from a published listing.

No production GA/gtag was detected in the 2026-07-27 audit. Analytics
configuration must be verified before reporting conversion rates.

## Decision

The technical SEO baseline is coherent enough to observe, but there is not
enough search or backlink evidence to expand the index, declare ranking success,
or optimize for raw directory count. The next growth milestone is an auditable
seller path:

`landing page → owned toy upload → 3-output Starter Pack → export → second SKU`

WorkBuddy should gather raw GSC/AITDK/哥飞 observations and verify public listing
URLs. Product and production changes stay with the assigned engineering agents.
