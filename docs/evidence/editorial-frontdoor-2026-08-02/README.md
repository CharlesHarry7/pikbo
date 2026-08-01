# Pikbo editorial front door — 2026-08-02

## Scope

This slice replaces the generic black/neon homepage and the three-unrelated-
robot pseudo-Pack with one designer-toy editorial system. It changes the Home
and Seller Pack Create shell only. Auth, private upload, Pack reservation,
Provider, recovery, Storage, Stripe, production flags and public payment remain
unchanged and fail closed.

## Design and truth contract

- Direction: Tokyo designer-toy editorial studio.
- Palette: paper ivory `#F7F3EA`, carbon `#111111`, toy red `#E94B35`.
- Hero value remains concrete: one photo, three fixed video formats.
- One original Mothcat concept is used for all three format crops.
- The board is explicitly labeled `Pikbo Lab art-direction storyboard` and
  `not a customer Pack or a generated result`.
- Public Create still exposes the Lab-only path and no visible file input.
- The existing private, signed-in upload path remains inside Create.

The original artwork was generated for Pikbo with the built-in image generator.
The prompt required one original, non-IP, non-robot, non-astronaut soft-vinyl
cat-moth collectible in an ivory/red/cobalt Tokyo product-editorial scene, with
no text, logo, packaging or watermark.

## Independent input

- ChatGPT Pro persistent design discussion:
  `https://chatgpt.com/c/6a6b4960-4dcc-83e8-8404-b5cb6748abf6`.
- Grok red-team session `019fbe43-f9e0-7e73-87c5-9464978747df` returned
  `MODIFY`: remove Home upload, retire the three unrelated previews, keep one
  honest same-SKU board, retain the fixed trio and public/private truth.
- WorkBuddy live desktop + 390px audit `审计 pikbo.ai 网站视觉与文案方案`
  completed in 5m22s and returned `MODIFY`. Its responsive findings were used:
  shorten the mobile H1, surface the CTA, remove the awkward three-thumbnail
  story, and preserve visible proof rather than deleting imagery entirely.

## Chrome proof

- Home at 1440x900: body width `1440`, viewport `1440`.
- Home at 390x844: body width `390`, viewport `390`; hero CTA is `358x56` at
  `x=16`, `y=472.8`.
- The hero CTA navigates to `/create?mode=seller-pack`.
- Public Create at 390x844: body width `390`,
  `data-public-pack-preview="lab-only"` is present and visible file inputs = `0`.

Screenshots:

- [Home · 1440](./home-1440.png)
- [Home · 390](./home-390.png)
- [Create · 390](./create-390.png)

## Verification

Passed:

- `npm run live-copy-smoke`
- `npm run seo-cold-start-smoke`
- `npm run engine-smoke`
- `npm run seller-pack-atomic-regression`
- `npm run recovery-ledger`
- `npm run recovery-reconciliation`
- `npm run stripe-billing-regression`
- `npm run launch-pack-main-path-smoke`
- `npm run product-proof-smoke`
- `npm run mobile-proof-regression`
- `npm run typecheck`
- `npm run lint`
- `npm run build` (198 routes; one pre-existing NFT trace warning)

No real Provider request, Stripe charge, database mutation, public deploy or
production-gate change was made for this slice.
