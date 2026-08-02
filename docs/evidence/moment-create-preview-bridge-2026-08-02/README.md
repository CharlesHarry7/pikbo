# Moment → Create preview bridge evidence

Date: 2026-08-02  
Baseline: `origin/main@876d672dfe3a379d51df0f101bb16ea44d1a1337`  
Branch: `agent/gpt/moment-create-preview-bridge-v1`

## Product decision

GPT Pro rejected both the public fixed-three-video framing and the Motion Archive redesign. The accepted vertical slice is:

`choose one toy Moment → add one owned toy photo locally → preview composition → authenticate → hand off to the existing gated private workflow`

Persistent Pro conversation: `https://chatgpt.com/c/6a6b4960-4dcc-83e8-8404-b5cb6748abf6`.

Independent review evidence:

- Grok final safety review: `RO-SAFETY-20260802T105147Z-876d672` — PASS, no code or security blocker.
- WorkBuddy art-direction red team: `WB-1440-MOMENT-V1-20260802`, browser session `019fbe82-8c49-7620-bd3f-ddb4cda78057`; its concrete naming and six-asset differentiation corrections were adopted before implementation.
- WorkBuddy implementation screenshot review: `WB-1440-MOMENT-IMPL-FINAL-20260802` — PASS, P0=0, ChinaJoy three-second estimate 10.5/12. Its only immediate composition correction, a smaller default local-photo scale, was applied.

The six public directions are all labeled `Official Concept`. None is described as a generated result, customer result, or supported generation recipe. The existing Provider, private Storage, credit ledger, Stripe, generation APIs, database, readiness gates and production payment state were not changed.

## Visual assets

Six differentiated original assets were generated with the built-in image-generation tool and compressed for the web:

- `public/moments/capsule-reveal.jpg`
- `public/moments/hangar-ignition.jpg`
- `public/moments/colorblock-pedestal.jpg`
- `public/moments/softroom-morning.jpg`
- `public/moments/gallery-spotlight.jpg`
- `public/moments/alley-drop-flash.jpg`

One separate 1200×630 editorial social card was generated and wired as `public/og.jpg`.

No third-party IP, brand logo, or real customer asset is presented in these files.

## Browser evidence

- `home-1440.png`: six-Moment stage and continuous film rail.
- `create-empty-1440.png`: selected Moment, local-only file entry and truth boundary.
- `create-local-photo-1440.png`: real Chrome file input, visible photo boundary, local-draft truth and signed-out CTA.

Headless Chrome interaction checks:

- six rail tabs render;
- selecting `Alley Drop Flash` updates the stage and exact `/create?moment=alley-drop-flash` CTA;
- a real JPG file creates the local Toy Stage layer;
- Clear is available;
- IndexedDB reports `Saved in this browser for 24 hours · no upload · no generation · 0 credits`;
- signed-out continuation is `Sign in to continue`;
- invalid and array Moment values fail closed instead of falling into another creation route.

## Automated gates

Passed locally:

- `npm run moment-create-preview-regression`
- `npm run launch-pack-main-path-smoke`
- `npm run product-proof-smoke`
- `npm run mobile-proof-regression`
- `npm run live-copy-smoke`
- `npm run seo-cold-start-smoke`
- `npm run engine-smoke`
- `npm run seller-pack-atomic-regression`
- `npm run recovery-ledger`
- `npm run recovery-reconciliation`
- `npm run stripe-billing-regression`
- `npm run auth-magic-link-regression`
- `npm run privacy-analytics-regression`
- `npm run typecheck`
- `npm run lint`
- `npm run build` (199 routes)

The build retains the pre-existing NFT trace warning in `next.config.ts`; this slice did not create it.

## Release boundary

This is a truthful public product bridge, not proof that the six Moments are production generation recipes. A fully entitled private-beta account is handed to the currently supported private Launch Workspace, with explicit copy that the selected Moment remains a concept. Public Provider spend and public Checkout remain closed.
