# HOME-RESULT-BROWSER-V2 evidence — 2026-08-02

## Outcome

The public front door is now a media-first designer-toy Launch Result Browser.
Home and the explicit public Sample Create state show cached video immediately;
the normal invited/private Seller Pack workbench is unchanged.

## Truth boundary

- Scout Listing Spin: archived `16:9 · 6 sec`; target `1:1 · 5 sec`.
- Moon Blind-box Reveal: archived `16:9 · 6 sec`; target `9:16 · 5 sec`.
- Beatbot Social Flash: archived `9:16 · 6 sec`; target `9:16 · 5 sec`.
- These are three separate Pikbo Lab prototypes, not one same-SKU Pack, customer
  result or verified target export.
- Public Sample Create accepts no product photo and makes no generation, asset,
  Provider, credit or payment request.

## Independent reviews

- GPT Pro product direction: persistent chat
  `6a6b4960-4dcc-83e8-8404-b5cb6748abf6`.
- Grok frozen-diff review: **APPROVE**, P0=0/P1=0,
  `grok-home-result-browser-v2-frozen-20260802-v2`.
- WorkBuddy browser review: **APPROVE**, session
  `019fbe82-8c49-7620-bd3f-ddb4cda78057`.

WorkBuddy final measurements:

- Home 1440×900: main CTA `y=831–887`, fully visible; no horizontal overflow.
- Home 390×844: main CTA `y=746–802`, fully visible; no horizontal overflow.
- Home and Sample Create are media-first at both sizes.
- Reveal loads `moon-box-reveal.webm`; Flash loads
  `beatbot-viral-hook.webm`; both reached `readyState=4`.
- No public `Creating`, `Preparing`, `0 of 3` or simulated eight-second
  generation state is shown.

Reviewer screenshots:

- `/var/folders/xv/md721h6n5cnf7n3gj6h42mz40000gn/T/pikbo-frozen-visual-review-2026-08-02/home-1440-fixed.png`
- `/var/folders/xv/md721h6n5cnf7n3gj6h42mz40000gn/T/pikbo-frozen-visual-review-2026-08-02/home-390-fixed.png`
- `/var/folders/xv/md721h6n5cnf7n3gj6h42mz40000gn/T/pikbo-frozen-visual-review-2026-08-02/create-preview-1440.png`
- `/var/folders/xv/md721h6n5cnf7n3gj6h42mz40000gn/T/pikbo-frozen-visual-review-2026-08-02/create-preview-390.png`

## Local gates

Passed:

- `npm run launch-pack-main-path-smoke`
- `npm run live-copy-smoke`
- `npm run seo-cold-start-smoke`
- `npm run engine-smoke`
- `npm run seller-pack-atomic-regression`
- `npm run recovery-ledger`
- `npm run recovery-reconciliation`
- `npm run stripe-billing-regression`
- `npm run typecheck`
- `npm run lint`
- `npm run build` — 199 routes; one pre-existing T6 dynamic NFT trace warning.

`git diff --check` passed. No production, database, Provider, Stripe, DNS or
environment mutation was performed.
