# Pikbo.ai keyword evidence report

> Observed: 2026-07-27 (GMT+8)
> Status: hypothesis set, not a ranking or demand claim
> Sources used: Google title-operator observations and an early GSC snapshot

## What the current evidence can and cannot prove

Twenty toy-video phrases were checked with a Google title operator. The observed
result count was zero for each phrase at that moment.

This observation means only that Google did not show a result with that exact
phrase in the title during the check. It does **not** prove:

- zero SEO competition;
- low keyword difficulty;
- any monthly search volume;
- that Pikbo ranks for the phrase;
- that creating a new page will produce traffic or customers.

Google result counts and search operators are unstable. A valid KGR calculation
also requires independently measured monthly search volume; that input was not
available. The previous `50–500 searches/month`, “blue ocean,” “zero
competition,” and “already ranking” statements are therefore withdrawn.

## Candidate queries to validate

| Candidate query | Current product surface | Exact-title observation | Demand evidence | Ranking evidence | Decision |
|---|---|---:|---|---|---|
| ai toy video generator | `/tools/ai-toy-video-generator` | 0 observed | not measured | not established | retain core page; measure |
| toy photo to video | `/for/photo-to-video-for-toys` | 0 observed | not measured | not established | possible overlap; measure |
| blind box video maker | `/tools/blind-box-reveal-video-maker` | 0 observed | not measured | not established | retain Recipe page |
| designer toy video | no dedicated indexed page | 0 observed | not measured | not established | do not publish a new page |
| ai figure 360 video | `/tools/figure-360-product-video` | 0 observed | not measured | not established | retain Recipe page |
| etsy toy listing video | `/for/etsy-listing-videos` | 0 observed | not measured | not established | retain seller-intent page |
| toy unboxing video generator | blind-box page | 0 observed | not measured | not established | test as a query, not a new page |
| action figure video ai | `/for/action-figure-product-videos` | 0 observed | not measured | not established | retain use-case page |
| collectible video maker | no dedicated indexed page | 0 observed | not measured | not established | do not publish a new page |
| toy product video ai | `/tools/ai-product-video-generator-for-toys` | 0 observed | not measured | not established | possible overlap; measure |
| toy launch teaser video | no dedicated indexed page | 0 observed | not measured | not established | map to Starter Pack research |
| toy animation from photo | core tool | 0 observed | not measured | not established | test as query variant |
| photo to video for toys | `/for/photo-to-video-for-toys` | 0 observed | not measured | not established | test as query variant |
| toy cgi video generator | no dedicated indexed page | 0 observed | not measured | not established | no page until evidence |
| toy ad generator ai | no dedicated indexed page | 0 observed | not measured | not established | no page until evidence |
| turn toy photo into video | homepage/core tool | 0 observed | not measured | not established | test as value proposition |
| make toy video from photo | `/tools/one-photo-product-video` | 0 observed | not measured | not established | possible overlap; measure |
| toy reveal video maker | blind-box page | 0 observed | not measured | not established | test as query variant |
| designer toy ai video | core tool | 0 observed | not measured | not established | test as query variant |
| blind box reveal video | blind-box page | 0 observed | not measured | not established | test as query variant |

The early GSC snapshot contains approximately six impressions and zero clicks.
That sample is too small to label any query as “ranked,” to infer CTR quality, or
to estimate demand. Average position from such a small mixed-query sample is not
a site-wide ranking capability metric.

## Evidence required before SEO expansion

A candidate may justify a new indexed page only when all of the following are
available:

1. query-level evidence from GSC and/or an AITDK/哥飞 export with timestamp,
   location and source;
2. an inspected SERP whose intent matches a seller job Pikbo can complete;
3. a distinct working tool or Toy Recipe;
4. a distinct, auditable example meeting
   `docs/growth/SHOWCASE_EVIDENCE_LEDGER.md`;
5. a primary path into the three-output Seller Starter Pack;
6. no material intent overlap with an existing indexed page.

Until then, keep the current 13-URL allowlist stable and collect evidence. Do not
create pages from title-operator counts alone.

## WorkBuddy collection format

Every keyword observation must record:

```yaml
query: ""
captured_at: ""
source: "GSC | AITDK | gefeiai | manual SERP"
country: ""
device: ""
date_range: ""
impressions: null
clicks: null
average_position: null
reported_volume: null
reported_difficulty: null
serp_intent_notes: ""
evidence_path_or_url: ""
```

Unknown values remain `null`; they must not be estimated.
