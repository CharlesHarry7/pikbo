# Guest Create proof — 2026-08-04

This slice fixes one conversion failure without enabling public upload,
Provider spend, or Checkout: a visitor opening the single Street Power-Up
Create route now sees the existing Pikbo-owned archive study immediately and
has an explicit sign-in/private-beta path.

## Baseline

Production desktop QA at 1440×1000 found:

- zero visible video/image media in the Create hero;
- the largest panel said `Your result appears here`;
- `Choose a Pikbo Lab sample below` appeared without a sample control;
- a lone step `3` appeared without steps 1 or 2;
- sign-in was visible but private-beta application was not.

The review environment did not expose an external WorkBuddy session endpoint,
so no WorkBuddy session ID is claimed. The evidence came from a production
Chrome inspection.

Grok's independent baseline audit session was
`e69f2aa2-60cb-43f4-b653-d1e5ecfa752f`. It additionally required that the
guest surface never mount upload, credits, Generate, model/prompt controls, or
the cached generation API.

## Implementation contract

- `GuestMomentCreateGate` fetches only `/api/me`.
- An invited account that satisfies the existing `canUsePrivateLaunch`
  display boundary receives the unchanged private `CreateStudio`.
- Every other state fails closed to an independent guest preview.
- The guest preview plays the existing Beatbot archive media directly; it
  never calls `/api/generate`.
- The archive is labeled honestly as a 6-second cached study. The private
  target is separately labeled `9:16 · 5s · 720p`.
- Signed-out visitors see `Sign in to animate your toy` and
  `Request private beta`. Signed-in accounts without access see only the
  private-beta request as the primary action.

## Desktop browser verification

Verified locally with Next.js webpack at 1280×720 and 1440×900:

- one visible video, ready state 4 and playing;
- sample poster `/demos/beatbot-still.webp` and cached WebM source loaded;
- headline, video, sign-in, beta request, archive truth, and private target all
  visible in the desktop first viewport;
- both CTAs ended above y=637 in the 1440×900 viewport;
- zero file inputs and zero forms;
- no private CreateStudio markers mounted;
- browser console error count: zero;
- server requests observed during the test: `/create` and `/api/me` only; no
  `/api/generate`, asset upload, Provider, or Checkout request.

## Automated verification

```text
npm run guest-create-preview-regression
npm run moment-contract-regression
npm run product-proof-smoke
npm run live-copy-smoke
npm run launch-pack-main-path-smoke
npm run typecheck
npm run lint
git diff --check
```

Production remains unchanged until GitHub CI passes and Vercel's daily
deployment limit resets. No alias workaround is permitted.
