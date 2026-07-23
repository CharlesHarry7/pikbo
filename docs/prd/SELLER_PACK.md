# PIKBO Seller Pack PRD

**Status:** Product contract v1 — ready for engineering review
**Owner:** GPT (product specification)
**Engineering owner:** Claude
**Growth input:** `docs/growth/SELLER_PACK.md`
**Last reviewed:** 2026-07-23
**Depends on:** `lib/pricing.ts`, `lib/contracts.ts`, `docs/api/GENERATE.md`
**Production billing dependency:** `docs/prd/AUTH_CREDITS.md`

## 1. Product decision

Seller Pack turns one owned toy product photo into three finite, purpose-built outputs:

1. A square listing spin.
2. A vertical blind-box reveal.
3. A vertical social hook.

It is a guided batch recipe for sellers, not a general-purpose batch agent and not an unlimited-generation feature.

The first implementation reuses the current synchronous `/api/generate` contract one child job at a time. Public paid use remains blocked until durable identity and atomic credit reservation exist.

## 2. User problem

Small toy sellers repeatedly need several formats for the same SKU. Today they must:

- Upload the same photo multiple times.
- Understand effect names.
- Re-enter format settings.
- Track individual failures.
- Work out the total credit cost.

Seller Pack replaces that repeated setup with one clear promise:

> Upload one toy photo once. Get a listing view, a reveal, and a social hook.

It does not promise three publish-ready clips from every input. Generated angles, packaging text, product details, and character consistency still require review.

## 3. Target user and jobs

### Primary users

- Independent designer-toy and collectible sellers.
- Blind-box shops and launch teams.
- Marketplace sellers creating their own listing media.
- Creators selling toys or characters they own or are licensed to use.

### Jobs to be done

- Add motion to a marketplace listing without filming a turntable.
- Create a reveal beat for a product launch or restock.
- Create a short vertical hook for TikTok, Reels, or Shorts.
- Retry only the failed format instead of repeating the whole batch.

### Rights requirement

The user must confirm that they own the submitted photo and have the rights required to animate and commercially use the toy, character, packaging, music, and resulting media. PIKBO does not grant third-party IP rights.

## 4. Pack definition

The default Seller Pack contains exactly three registered presets:

| Order | Output | Preset slug | Default duration | Default ratio | Primary use |
|---:|---|---|---:|---|---|
| 1 | Listing Spin | `360-spin-showcase` | 5s | `1:1` | Marketplace gallery and product page |
| 2 | Blind-box Reveal | `blind-box-unboxing` | 5s | `9:16` | Launch, restock, and unboxing hook |
| 3 | Social Flash | `paparazzi-flash` | 5s | `9:16` | TikTok, Reels, and Shorts opener |

These defaults are part of the v1 product contract. The user may remove an item before starting, but adding arbitrary effects changes the workflow into Custom Batch and must not retain the `Seller Pack` label.

### Input guidance

One image is required:

- JPEG/JPG, PNG, WebP, or GIF.
- Approximately 8 MB source maximum under the current Generate contract.
- A clean, well-lit, front-facing product photo is recommended.
- For Blind-box Reveal, a photo that visibly includes the actual packaging is recommended.

Missing visible packaging is a quality warning, not a validation error. The product must not claim that it knows unseen box art or reverse angles.

## 5. Entry points

### Canonical route

`/supercomputer?pack=seller`

The existing `/supercomputer?effects=...` custom-batch deep link remains supported. Seller Pack is a named configuration on the existing Batch surface, not a new top-level product.

### Product entry points

- Create: `Make a Seller Pack` after a toy photo is selected.
- Batch: `Seller Pack · 3 outputs`.
- Pricing/Shop: `See the 3-output seller workflow`.
- Seller-focused SEO pages: open the canonical route with `pack=seller`.

The direct link must load the exact three presets and their per-output ratios. It must not load the current four-item spin/float/unbox/glam selection.

## 6. Plan and mode access

| Runtime/plan state | Access | Required behavior |
|---|---|---|
| Cached demo (`FAL_KEY` absent) | All visitors | Preview three cached PIKBO Lab examples for 0 credits; clearly state that the uploaded photo was not rendered |
| Free live | Preview plus one live child only | A 10-credit account cannot start the 30-credit full pack; let the user choose one of the three as the Free Mini trial |
| Creator live | Full pack when balance is at least 30 | One 3-output pack costs 30 credits at the current flat rate |
| Shop live | Full pack when balance is at least 30 | Primary plan positioning; 150 credits supports up to five full packs at the current flat rate |

Creator and Shop access does not authorize live Stripe charging. During soft launch, paid states may only be exercised through approved internal/test entitlements.

### No pack discount in v1

The current contract is:

```text
3 live child jobs × 10 credits = 30 credits
```

There is no bundle discount, free fourth output, or hidden overage. A future discount requires an update to `lib/pricing.ts`, unit economics, server metering, this PRD, and public copy.

### Cached mode

In cached mode:

- Total cost is 0.
- Each result is labeled `Cached demo`.
- The uploaded photo is not described as the input to the returned clip.
- Cached results may be saved locally only with `demo: true`.
- Cached playback does not consume the Free live trial.

## 7. Main flow

### Step 1 — Open

The page shows:

- `Seller Pack · 3 outputs`.
- The three fixed outcomes and their channels.
- Current mode: cached preview or live.
- Current plan/balance.
- A concise rights requirement.

### Step 2 — Upload once

The user uploads one owned toy photo. The same source is used for all selected children.

The UI must support:

- Drag/drop and file picker.
- Preview.
- Replace.
- Remove.
- Unsupported-type and size validation.

### Step 3 — Review pack

Each output card shows:

- Outcome name.
- Effect name.
- Duration and ratio.
- Intended channel.
- Credit cost in live mode.
- Quality note where relevant.
- Remove/restore before the run.

Recommended per-output ratios are the default. A future advanced override may be added, but v1 must not apply one global ratio silently to all three Seller Pack outputs.

### Step 4 — Preflight

Before the final action, show:

- `Cached demo` or `Live generation`.
- Selected item count.
- Exact current quote: `selected items × 10 credits`.
- Current balance and expected balance after a live run.
- Model/resolution enforced by the current plan.
- A warning that outputs must be reviewed for product accuracy.
- A warning that Library is stored in this browser during soft launch.
- Ownership/rights confirmation.

For the default live pack:

```text
3 outputs · 30 credits total
```

If the current live balance is below the full quote, the pack cannot start. Free users receive `Use my 1 live trial` and choose one child; paid test users receive the honest balance/paywall state.

### Step 5 — Run

Children execute in fixed order:

1. Listing Spin.
2. Blind-box Reveal.
3. Social Flash.

Each child has an independent status:

- `queued`
- `running`
- `succeeded`
- `failed`
- `not_started`

Only one child runs at a time under the current synchronous Generate API.

### Step 6 — Review partial results

Completed outputs appear immediately. A failure does not erase successful siblings.

The summary is one of:

- `3 of 3 ready`
- `2 of 3 ready · 1 needs attention`
- `1 of 3 ready · 2 need attention`
- `No live outputs completed`
- `3 cached examples ready`

Avoid the single word `Complete` when any item failed or never started.

### Step 7 — Retry or deliver

The user may:

- Retry one failed child.
- Open a successful child in the same-browser Library.
- Download successful children individually.
- Start a new pack with another SKU.

V1 does not promise ZIP download, permanent cloud storage, cross-device history, or a shareable client folder.

## 8. Credit lifecycle

### Soft-launch implementation with current API

The existing route debits and refunds each child separately:

1. Client confirms that the displayed balance covers the entire quote.
2. Child 1 calls `/api/generate`.
3. A live success keeps 10 credits.
4. A post-debit failure restores 10 credits.
5. The next eligible child starts.

This client precheck is not atomic. Another tab or server instance can change the balance between children. Therefore:

- The live pack remains private/test-only before T5.
- The UI must preserve partial results if a later child returns `INSUFFICIENT_CREDITS`.
- Public copy must not claim that all 30 credits were atomically reserved.

### Production contract after T5

The durable implementation must atomically reserve the full live quote before starting:

```text
available -30 · reserved +30
```

For each successful child:

```text
reserved -10 · settled/used +10
```

For each failed or canceled-before-start child:

```text
reserved -10 · available +10
```

The final charge is therefore:

```text
10 credits × successful live children
```

All reserve, settle, and release operations require unique idempotency keys. See `docs/prd/AUTH_CREDITS.md`.

### Creative dissatisfaction

A provider success that returns a playable video consumes 10 credits even when the user dislikes the creative result. Quality credits or manual support adjustments are an operations policy, not an automatic API refund.

## 9. Pack and child state model

### Pack state

```ts
type SellerPackStatus =
  | "draft"
  | "blocked"
  | "ready"
  | "running"
  | "partially_complete"
  | "complete"
  | "failed";
```

| State | Meaning |
|---|---|
| `draft` | Image, rights confirmation, or item selection is incomplete |
| `blocked` | Live quote cannot be covered or configuration is invalid |
| `ready` | Validation and preflight pass |
| `running` | At least one child is active or queued |
| `partially_complete` | At least one child succeeded and at least one failed/not-started |
| `complete` | Every selected child succeeded, or every selected item returned an explicitly labeled cached demo |
| `failed` | No selected child succeeded |

### Child state

```ts
type SellerPackItemStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "not_started";
```

Each child stores the actual:

- Preset slug and label.
- Duration, ratio, resolution, and model.
- Quoted and settled credits.
- `demo` and watermark flags.
- Provider request ID when present.
- Video URL when present.
- Error code/message when failed.
- Retry count.

## 10. Error behavior

| Error/code | Item behavior | Pack behavior | Credits | User action |
|---|---|---|---|---|
| Missing/invalid image | No jobs start | Remain `draft` | 0 | Replace the image |
| `IMAGE_TOO_LARGE` | No jobs start | Remain `draft` | 0 | Compress below the current limit |
| `UNKNOWN_EFFECT` | Configuration failure | `blocked`; do not silently substitute | 0 | Operator fixes registered pack definition |
| `INSUFFICIENT_CREDITS` | Current/not-started child stops | Preserve successes; remaining items `not_started` | No debit for rejected child | Choose one Free trial output or obtain an approved paid/test entitlement |
| `RATE_LIMITED` | Retry once after server delay | Continue if retry succeeds | No debit before acceptance | Wait; manual retry after final failure |
| `JOB_IN_FLIGHT` | Retry once after a short wait | Continue if retry succeeds | No debit | Wait for the other job |
| `PROVIDER_RATE_LIMIT` | Retry once with backoff | Failed after retry; continue to next child | Failed attempt refunded | Retry failed child later |
| `MODEL_EMPTY` | Mark child failed | Continue to next child | 10 refunded | Retry only this child |
| `GENERATION_FAILED` | Mark child failed | Continue to next child | 10 refunded | Retry only this child |
| `PROVIDER_BALANCE` | Mark child failed | Stop remaining children as `not_started` | Failed attempt refunded | Operator restores provider or switches to cached mode |
| Network/ambiguous response | Mark `failed` with `Result unknown` wording | Pause before next child if charge state is unknown | Do not claim refund without a returned session | Check Library/balance; user initiates retry |

### Retry rules

- Never automatically rerun a successful child.
- Automatically retry only known transient rate/in-flight conditions, at most once.
- Manual retry targets one failed child and shows a new 10-credit quote.
- Provider balance and insufficient user credits are fatal for the remaining queue.
- A retry is a new live job and may produce a different creative result.
- Before durable idempotency exists, do not automatically retry an ambiguous network failure.

### Cancellation rules

- Before starting: cancel costs 0.
- Queued items may be removed before the first child starts.
- The current synchronous v1 cannot guarantee cancellation of an active provider job.
- Leaving the page must not be described as canceling or refunding an active job.
- True cancel-and-release is deferred to the async durable job system.

## 11. Output and Library rules

### Result cards

Each card shows:

- Input thumbnail.
- Output player or error state.
- Output purpose and preset.
- `Cached demo` or `Live generation`.
- Actual model, ratio, duration, and resolution.
- Watermark status.
- Credit result: `10 used`, `10 restored`, or `0 cached`.
- Retry, download, and Library actions when applicable.

### Library

During soft launch:

- Successful items are stored individually in the current browser Library.
- Cached items retain `demo: true`.
- The pack itself is not a durable cloud object.
- Provider URLs may expire; users should download results they need.

Suggested future filename:

```text
pikbo-{sku-or-toy}-{listing-spin|blind-box-reveal|social-flash}-{ratio}.mp4
```

Filename support does not imply that SKU metadata or ZIP export exists in v1.

## 12. Domain model

```ts
type SellerPackDefinition = {
  id: "seller-pack-v1";
  version: 1;
  items: Array<{
    key: "listing_spin" | "blind_box_reveal" | "social_flash";
    presetSlug:
      | "360-spin-showcase"
      | "blind-box-unboxing"
      | "paparazzi-flash";
    duration: 5;
    aspectRatio: "1:1" | "9:16";
    channel: string;
  }>;
};

type SellerPackRun = {
  id: string;
  accountId?: string;
  sourceAssetId?: string;
  mode: "demo-cached" | "live-generate";
  status: SellerPackStatus;
  quotedCredits: number;
  settledCredits: number;
  selectedItemKeys: string[];
  createdAt: string;
  completedAt?: string;
};

type SellerPackItem = {
  id: string;
  packRunId: string;
  key: string;
  presetSlug: string;
  status: SellerPackItemStatus;
  quotedCredits: number;
  settledCredits: number;
  demo?: boolean;
  videoUrl?: string;
  requestId?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
};
```

These types describe the product domain. The soft-launch UI may keep them in client state; production persistence belongs to T5/async job implementation.

## 13. Analytics

Record without exposing the uploaded image:

- `seller_pack_open`
- `seller_pack_upload_ready`
- `seller_pack_preflight_view`
- `seller_pack_blocked_credits`
- `seller_pack_start`
- `seller_pack_item_success`
- `seller_pack_item_failure`
- `seller_pack_item_retry`
- `seller_pack_partial_complete`
- `seller_pack_complete`
- `seller_pack_download`

Recommended properties:

- Mode: cached/live.
- Plan.
- Selected item count.
- Quoted and settled credits.
- Item key/preset.
- Error code.
- Duration/ratio/resolution/model class.

Do not send source images, raw prompts, emails, or provider URLs to analytics.

## 14. Non-goals

V1 excludes:

- More than the three named Seller Pack outputs.
- A pack discount or unlimited live batch.
- Automatic product titles, descriptions, prices, or marketplace posting.
- A durable cloud queue before T5.
- Parallel provider execution.
- ZIP delivery.
- Permanent cloud Library or client review links.
- Fake UGC, reviews, sales, or performance metrics.
- Background removal or packaging-text reconstruction.
- Guaranteed accurate unseen angles.
- Automatic refund for subjective creative quality.

## 15. Acceptance checklist

### Configuration

- [ ] `/supercomputer?pack=seller` loads exactly the three frozen presets.
- [ ] Listing Spin defaults to 1:1; Reveal and Social Flash default to 9:16.
- [ ] Arbitrary custom effects move the UI to Custom Batch rather than mislabeling it Seller Pack.
- [ ] Unknown or deleted preset slugs block the pack visibly.

### Preflight and access

- [ ] The same valid uploaded image is used for all selected children.
- [ ] The user sees cached vs live mode before starting.
- [ ] The default live quote is exactly 30 credits.
- [ ] Cached mode shows 0 credits and states that the upload is not rendered.
- [ ] Free live cannot start all three with a 10-credit balance and can select one trial output.
- [ ] Creator/Shop test entitlements can start only when the full displayed quote is available.
- [ ] Rights confirmation is required for live submission.

### Execution

- [ ] Children run in the frozen order and display independent statuses.
- [ ] One child failure does not delete or rerun successful siblings.
- [ ] Known transient errors retry at most once.
- [ ] Insufficient user credits and provider balance stop remaining queued children.
- [ ] Nonfatal refunded failures allow the next child to run.
- [ ] The summary distinguishes complete, partial, and failed packs.
- [ ] An ambiguous network result never claims that credits were refunded.

### Credits

- [ ] Cached children use 0 credits.
- [ ] Every successful live child uses 10 credits under the current flat contract.
- [ ] Every returned post-debit provider failure restores 10 credits.
- [ ] Manual retry shows a fresh 10-credit quote and affects only the failed child.
- [ ] No copy advertises a discount, free fourth clip, or unlimited generation.
- [ ] Before public paid launch, a durable transaction reserves 30 and settles/releases per child.

### Outputs and truth

- [ ] Every result card says `Cached demo` or `Live generation`.
- [ ] Actual model, duration, ratio, resolution, watermark, and credit result are visible.
- [ ] Successful outputs save individually to the same-browser Library.
- [ ] The UI does not claim ZIP, cloud sync, permanent storage, or exact product fidelity.
- [ ] Provider URL expiry is communicated before the user relies on Library as storage.

### Device and quality

- [ ] Upload, preflight, queue, retry, and download work at 390 px, 768 px, and 1440 px.
- [ ] Keyboard focus and status announcements are accessible.
- [ ] A long error message does not hide successful result actions.
- [ ] Refreshing/leaving during a synchronous run does not falsely show cancellation or refund.
- [ ] Lint, type check, production build, and critical-path tests pass after implementation.

## 16. Release gates

### May ship in invite-only validation

- Cached three-output preview.
- Free one-child Mini trial.
- Creator/Shop internal test entitlement with client-side preflight.
- Sequential child execution and same-browser Library.

### Must exist before public paid Seller Pack

- Authenticated durable account.
- Transactional 30-credit reservation.
- Idempotent per-child settle/release.
- Cross-instance concurrency protection.
- Durable pack/job state and recovery after refresh.
- Stripe live gates from `docs/business/CREDITS_AND_PLANS.md`.
- Server-burned Free watermark or disabled Free download.
- Controlled model-cost and partial-failure reconciliation tests.

The existence of the current Batch Studio is not proof that the paid Seller Pack gates are complete.
