# PIKBO soft launch PRD

> **Superseded on 2026-07-29.** Public Free is cached-only; real Fast 720p/5s
> generation is an invited non-production validation path with private
> delivery, atomic accounting, and a durable US$20 cap. The current release
> contract and gates are in
> [`../CURRENT_LAUNCH_CONTRACT.md`](../CURRENT_LAUNCH_CONTRACT.md).

**Status:** Product contract v1 — ready for engineering review  
**Owner:** GPT (product specification)  
**Engineering owner:** Claude  
**Last reviewed:** 2026-07-23  
**Source of truth:** `lib/pricing.ts`, `lib/contracts.ts`, `app/api/generate/route.ts`

## 1. Decision

PIKBO may soft-launch as an **invite-only, free validation product** for the narrow job:

> Upload a photo of a toy you own, choose a toy-native effect, and receive either a clearly labeled cached example or one limited Seedance Mini trial.

This release is not a paid SaaS launch. Live Stripe checkout remains unavailable until every gate in `docs/business/CREDITS_AND_PLANS.md` is complete.

The soft launch has two valid runtime modes:

| Mode | Required environment | User result | Credits | Intended use |
|---|---|---|---:|---|
| Cached demo | No `FAL_KEY` | Existing PIKBO Lab clip labeled as a cached demo | 0 | UI, copy, navigation, and demand validation |
| Soft-live | `FAL_KEY` plus a strong `SESSION_SECRET` | Real Seedance result from the uploaded toy photo | 10 per submitted live job; failed provider jobs are refunded | Small, invited quality test |

The interface must never present a cached demo as a generation from the user's uploaded image.

## 2. Goal and success signal

### Goal

Validate that collectors and small toy sellers understand and complete the toy-photo-to-short-video workflow without staff assistance.

### Primary success signal

An invited user can complete this path on mobile or desktop:

`Home or effect page → Create → upload owned toy → choose effect → see mode and cost → submit → understand result → save locally or try another recipe`

### Secondary signals

- Users select toy-native recipes rather than asking for a general video editor.
- Users understand whether the next result is cached or live before submitting.
- Users reach a useful result or a specific, recoverable error.
- Qualitative feedback identifies the effects worth paying to generate.

This phase does not validate paid conversion, durable retention, or multi-device usage.

## 3. Audience

### In scope

- Collectors animating toys they own.
- Small toy shops testing product-listing and social clips.
- Designer-toy creators testing launch content for their own characters.
- Invited internal testers and partners.

### Rights requirement

Before submitting, the user must confirm that they own the photo and have the right to animate and publish the depicted toy or character. PIKBO does not grant rights to third-party characters, brands, packaging, music, or likenesses.

## 4. Scope

### Public product surfaces

- Home: toy-first proposition, honest Lab examples, one primary Create CTA.
- Effects: browse toy-native recipes and open a recipe in Create.
- Explore/PIKBO Lab: cached or official examples with explicit provenance labels.
- Create: upload, recipe selection, aspect ratio, permitted duration/resolution controls, preflight state, submit, result, and retry.
- Library: current same-browser history, explicitly described as local rather than cloud-synced.
- Pricing: accurate Free/Creator/Shop allowances as a product preview; no live paid checkout during soft launch.
- Legal/help surfaces required to explain ownership, third-party provider processing, and support contact.

### Generate behavior

- Accept one JPEG, PNG, WebP, or GIF toy image as a data URL.
- Require a registered effect slug.
- Show one of two preflight states before submission:
  - `Cached demo — does not use your upload and costs 0 credits`.
  - `Live Mini trial — uses your upload, 5 seconds, 480p, costs 10 credits`.
- Free live generation is server-enforced as Seedance Mini, 5 seconds, 480p.
- A failed live provider job restores the 10-credit debit.
- Only one generation may run per browser session at a time.

### Pricing shown during soft launch

- Free: 10 credits, approximately one live Mini trial per month.
- Creator: $19/month, 50 credits, approximately five clips.
- Shop: $49/month, 150 credits, approximately fifteen clips.

Creator and Shop are previews until Stripe launch gates pass. Their CTA must not imply that a production subscription is available.

## 5. Main path

### Step 1 — Discover

The user arrives on Home, an effect page, or a search landing page. The first screen communicates:

- PIKBO animates a photo of a physical toy.
- The user must own the submitted image and rights.
- Examples are labeled `Cached demo`, `Official example`, or `Live generation`.

### Step 2 — Start with a recipe

Selecting an effect opens `/create` with the effect preselected. Unknown effect slugs must not silently imply that the requested recipe is active.

### Step 3 — Upload

The user uploads one supported image. The UI explains the approximate 8 MB source-image limit before submission and provides a replace/remove action.

### Step 4 — Configure

The user chooses only controls that the current plan can actually honor:

- Effect.
- Aspect ratio: `9:16`, `16:9`, `1:1`, or `auto`.
- Paid-only preferences may appear as locked previews, not active Free controls.
- Free live output is fixed to Mini, 5 seconds, and 480p.

### Step 5 — Preflight

Before the final action, show:

- Cached demo or live mode.
- Whether the user's image will be sent to the provider.
- Enforced model class, duration, and resolution.
- Credit cost and remaining credits for live mode.
- Ownership confirmation.

### Step 6 — Generate or preview

- Cached mode returns a labeled PIKBO Lab clip and does not debit credits.
- Live mode debits 10 credits immediately before calling the provider.
- The submitting control is disabled while the session already has a job in flight.
- Recoverable failures explain whether the 10 credits were restored.

### Step 7 — Result

The result panel must include:

- `Cached demo` or `Live generation`.
- Model/resolution/duration returned by the server.
- Watermark status.
- Retry or choose-another-effect action.
- Local Library save state.

The result must not claim cloud backup, cross-device history, commercial rights, or a server-burned watermark when those capabilities do not exist.

## 6. Required UI state language

| State | Required meaning |
|---|---|
| Cached demo | Existing PIKBO Lab media; the user's uploaded photo was not generated into this clip |
| Official example | PIKBO-owned or licensed example media; not community UGC |
| Live generation | A provider call ran against the submitted image |
| Concept recipe | Recipe definition without a verified output example |
| Local Library | Saved in this browser; not cloud-synced |
| On-player mark | UI overlay only; not a promise that the downloaded file has a burned-in watermark |

Forbidden claims include `unlimited generations`, `free unlimited clips`, `4K`, `cloud library`, `team workspace`, `production API`, `guaranteed exact output`, and fabricated user or revenue metrics.

## 7. Non-goals

The soft launch does not include:

- Live Stripe charges, renewals, refunds, upgrades, downgrades, or Customer Portal.
- Durable user accounts, organization accounts, or cross-device balances.
- A transactional database credit ledger.
- A cloud media library, projects, teams, comments, or approvals.
- Server-burned watermarks or protected original-file delivery.
- A public UGC/community feed.
- Text-to-video, video editing, motion references, first/last frame control, or arbitrary model access.
- 1080p or 4K output.
- Guaranteed batch generation, API keys, or white-label access.
- A promise that every preset has a distinct verified live example.
- Broad consumer launch or paid acquisition.

These omissions must be visible where a user could otherwise infer the capability.

## 8. Release configuration

### Required for cached-demo launch

- Production build passes.
- Stripe live keys and live Price IDs are absent.
- `ALLOW_DEV_UPGRADE` is disabled in production.
- Cached examples carry provenance labels.
- The production URL, privacy notice, terms, support contact, and analytics consent behavior are configured.

### Additional requirements for soft-live launch

- `FAL_KEY` is configured with a deliberately capped provider budget.
- A unique, strong `SESSION_SECRET` is configured; the development fallback is not acceptable.
- Free live output is verified as Mini, 5 seconds, and 480p.
- The provider disclosure names fal.ai/Seedance processing.
- Abuse limits are tested with the expected invite volume.
- At least three representative owned-toy inputs pass a manual quality and failure/refund test.

### Rollback

If live cost, quality, or availability becomes unsafe, remove `FAL_KEY`. The product must fall back to cached demo mode without charging credits or implying that the uploaded image generated the returned clip.

## 9. Acceptance checklist

### Product truth

- [ ] Home, Effects, Explore, Create, Library, and Pricing use the state language in section 6.
- [ ] No cached clip is presented as output derived from the user's image.
- [ ] No surface promises unlimited live generations.
- [ ] Pricing shows exactly 10 / 50 / 150 credits and approximately 1 / 5 / 15 clips.
- [ ] Creator and Shop are clearly unavailable for real purchase during soft launch.
- [ ] Library says it is stored in this browser.

### Happy path

- [ ] An effect deep-link opens Create with the intended registered recipe.
- [ ] A supported owned-toy image can be added, previewed, replaced, and removed.
- [ ] Preflight declares cached vs live before submission.
- [ ] Cached mode returns a labeled example without changing credits.
- [ ] Soft-live mode returns a provider result and reduces the balance by 10.
- [ ] Result metadata matches the server response.
- [ ] A result can be saved to and reopened from the same-browser Library.

### Limits and failures

- [ ] Missing/invalid images produce an actionable validation message.
- [ ] An image above the current request-size limit is rejected before provider submission.
- [ ] Unknown effects produce an explicit error rather than a false selection.
- [ ] Insufficient credits route the user to the plan explanation, not a broken retry loop.
- [ ] Session and IP rate limits communicate when retry is allowed.
- [ ] A second simultaneous job is rejected clearly.
- [ ] Provider balance, provider rate limit, empty output, and generic failure are distinguishable.
- [ ] Every post-debit provider failure restores the 10 credits in the returned session.

### Device and accessibility

- [ ] The main path works at 390 px, 768 px, and 1440 px.
- [ ] Upload and Generate are keyboard accessible with visible focus.
- [ ] Progress, success, and failure are announced without relying only on color.
- [ ] Videos respect reduced-motion behavior and expose pause/mute controls where applicable.
- [ ] Mobile never requires horizontal scrolling to complete the path.

### Operations

- [ ] `npm run lint`, type checking, production build, and critical-path checks pass.
- [ ] Production has a strong `SESSION_SECRET`; no insecure fallback reaches real traffic.
- [ ] Production does not permit dev upgrades.
- [ ] Stripe remains in test/off mode and no live checkout can be created.
- [ ] Provider spending is capped and monitored during the invitation window.
- [ ] Support can identify whether a report involved cached demo or live generation.
- [ ] Rollback to cached mode has been rehearsed.

## 10. Exit criteria

The soft launch is complete when at least five invited users finish the main path, at least three use live generation with owned toy photos, failures and refunds reconcile manually, and the team has a ranked list of recipes users would pay to repeat.

Moving to paid beta is a separate decision. It requires every Stripe gate in `docs/business/CREDITS_AND_PLANS.md`; positive soft-launch feedback alone is not sufficient.
