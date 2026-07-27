# pikbo.ai · 30-day evidence plan (哥飞 cross-check)

**Revised:** 2026-07-27
**Product:** owned toy images → three-output Seller Starter Pack
**Rule:** raw evidence first; no “new-site preference window,” ranking, demand,
or backlink claim without a recorded source.

## Corrections to the historical plan

- Six GSC impressions and zero clicks are too little data to diagnose title
  quality or a ranking trend.
- A Google title-operator result is not keyword volume or difficulty.
- A submitted directory form is not a backlink.
- Search traffic is not a prerequisite for testing payment with a small group
  that can produce publishable outputs.
- The primary product outcome is a Seller Starter Pack, not one free clip and
  not a generic AI model catalog.

The current 13 indexed URLs remain stable. No new indexed page is approved by
this plan.

## Days 0–7: make evidence auditable

| Work | Owner | Completion evidence |
|---|---|---|
| Classify all public examples | Grok | `SHOWCASE_EVIDENCE_LEDGER.md`; unproven rows are prototype with no scores |
| Verify analytics configuration | Claude/Grok | production event receipt, not only source-code presence |
| Collect query evidence | WorkBuddy | timestamped GSC/AITDK/哥飞 export with date range, country and screenshot/export path |
| Verify historical listings | WorkBuddy | public listing URL + observed publication state + backlink check |
| Freeze speculative SEO edits | all | no new pages or title churn from tiny samples |

WorkBuddy does not touch production secrets, Supabase, Vercel, business code or
`main`.

## Days 8–14: validate the seller journey

Recruit a small number of independent designer-toy sellers and measure:

1. landing → owned toy upload;
2. upload → Starter Pack quote;
3. quote → Pack start;
4. Pack start → Pack export;
5. first Pack → second SKU within seven days.

Search pages should route into the same three-output seller outcome. “Try one
cached example” may remain secondary; it must not be presented as processing the
visitor upload.

No conversion percentage is reported until the event pipeline and denominator
are verified.

## Days 15–21: decide which existing page deserves work

For each indexed commercial page, assemble:

- query and page impressions/clicks from GSC;
- AITDK/哥飞 volume and difficulty when actually available;
- manual SERP intent notes;
- a distinct working Recipe or seller workflow;
- a distinct example that passes the public-evidence gate;
- Starter Pack entry and export path.

If two pages target the same intent, propose consolidation rather than creating
a third page. Particular overlap to review:

- `/tools/ai-toy-video-generator` vs
  `/for/photo-to-video-for-toys`;
- `/tools/one-photo-product-video` vs
  `/tools/ai-product-video-generator-for-toys`.

## Days 22–30: make one evidence-backed decision

Choose only one:

- improve an existing page with a distinct verified case and seller Pack path;
- consolidate overlapping pages;
- leave SEO unchanged and focus on product activation.

A new indexed page requires the gate in `KEYWORD_RESEARCH_REPORT.md`. Directory
work may resume only for relevant toy, collectible, ecommerce-seller, or creator
publications and only when a public listing can be verified.

## Reporting vocabulary

```text
submitted          form sent, acceptance unknown
pending            publisher explicitly says under review
published          public listing URL resolves
verified_backlink  public listing contains a crawlable link to pikbo.ai
```

Counts must be reported separately. Do not collapse them into “external links”
or “backlinks.”

## Explicit non-goals

- no generic AI-directory volume target;
- no target based on raw indexed-page count;
- no toddler toy-buying, franchise-IP, or broad ASMR content;
- no weekly page quota;
- no Product Hunt launch without credible examples and a working seller path;
- no waiting for arbitrary Google traffic before testing willingness to pay.
