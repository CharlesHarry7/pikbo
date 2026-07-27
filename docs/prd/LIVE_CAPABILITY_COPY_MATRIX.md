# Live capability and copy matrix

Status: implementation contract  
Owner: GPT product contract → Claude engineering  
Scope: public UI, API responses, SEO copy, structured data, and operational health

## Why this exists

Pikbo currently has a safe provider gate, but several public surfaces still use
phrases such as “Seedance live”, “30 credits live”, or “Free Mini trial” without
checking whether the visitor and the deployment can actually run a paid model.
That creates a conversion and trust defect even when the API correctly refuses
the request.

Every surface must derive its promise from one capability state. A provider key
alone is never evidence that Live is available.

## Authoritative states

| State | Required facts | Public promise | Generate action |
|---|---|---|---|
| `cached_only` | Any visitor who is anonymous, Free, non-durable, or on a deployment without the full live gate | `Cached Pikbo Lab prototype · 0 credits · your upload is not processed` | Play/replay the cached prototype |
| `validation` | Provider may be configured, but auth, durable atomic reservation, or server-owned deliverable is incomplete | `Private validation · live generation is closed` | Request access or continue with cached prototypes |
| `live_eligible` | Signed in, `durableCreditsActive=true`, `mode=live-generate`, provider authorized, server-owned deliverable ready, and balance covers the quote | `Live generation · your owned photo · exact quote` | Submit after rights confirmation |
| `live_in_flight` | A live reservation and exact job exist | `Generating · credits reserved, not yet settled` | Poll or cancel; polling never extends the deadline |
| `settlement_pending` | Provider or database result is ambiguous | `Output withheld · settlement pending` | No download; do not claim charge or refund |
| `live_succeeded` | Capture is confirmed and the deliverable is server-owned and allowed for this plan | `10 credits used` or the server-returned exact amount | Preview/download according to plan |
| `release_confirmed` | Release/refund transaction is confirmed | `10 credits restored` or the server-returned exact amount | Retry creates a new job |
| `release_unconfirmed` | Cancel, timeout, provider failure, or worker crash without confirmed release | `Refund unconfirmed · check balance` | Retry only through the exact retry flow |

## Single source of truth

The client may show `live_eligible` only when all of these runtime facts are
present:

```ts
signedIn === true
durableCreditsActive === true
mode === "live-generate"
serverOwnedDeliverableReady === true
credits >= quote.costCredits
```

`/api/health` is the deployment-level truth. It may report Soft Live only when:

```ts
authConfigured
&& durableAtomicReservationConfigured
&& providerConfigured
&& serverOwnedDeliverableConfigured
```

The server response remains authoritative. Client state must fail closed if a
field is missing or stale.

## Surface rules

### Home, Explore, Effects, Community, and Project pages

- Existing media is `PIKBO Lab · cached prototype`.
- Do not say Official, customer case, verified input-to-output, Live, or give a
  numeric quality score until the evidence promotion gate passes.
- “Use this recipe” may open Create, but it must not imply a provider call will
  happen.
- A live price may appear only as conditional planning copy:
  `When Live is enabled for an eligible account, the current configured quote is 10 credits.`

### Create

- Anonymous, Free, unknown, non-durable, and insufficient-balance sessions show
  the cached path.
- The cached button must say `Preview cached prototype · 0 credits`.
- It must also say `Your uploaded photo is not sent to a model in this preview`.
- Only `live_eligible` shows `Generate live · 10 credits` and an exact
  resolution/duration quote.
- Retry tokens, job IDs, or provider request IDs must never appear in URLs,
  analytics payloads, SEO markup, or user-facing copy.

### Seller Starter Pack

- `cached_only` or `validation`:
  `3 cached prototype previews · 0 credits · your upload is not processed`.
- `live_eligible`:
  `3 live clips · 30 credits total`.
- Each child displays its own queued/running/succeeded/failed/refund state.
- A failed child never removes successful siblings.

### Pricing

- Plan allowances are planning estimates, not current live availability.
- Use:
  `Configured allowance: about 1 / 5 / 15 jobs at the current flat 10-credit model. Live purchase remains closed until protected delivery is ready.`
- Do not show an enabled checkout or “start generating live” action while the
  payment and delivery gates are closed.

### Apps, Modules, Flow, Cinema, Image, and Guides

- These pages describe recipes or previews, not deployment readiness.
- Replace unconditional `Seedance live`, `live Mini`, and `30 credits live`
  labels with one of:
  - `Cached prototype`
  - `Live-capable recipe · access gated`
  - `When Live is enabled: 10 credits`
- Guides may explain the future/current configured cost only with an explicit
  eligibility condition.

### API and operational surfaces

- `cached_only` returns `demo=true`, `costCredits=0`, and `creditsOutcome="0 cached"`.
- `validation` must not call the provider.
- A provider success with failed capture returns no deliverable.
- Health, status pages, and client UI must use the same state name and
  availability result.

## Forbidden phrases when public Live is closed

These patterns must not appear unconditionally in rendered public copy:

```text
Seedance live
Pipeline is live
Free live clip
live Mini uses 10
3 clips / 30 credits live
Generate live
Official example
Lab ≥4
```

Conditional phrases such as `When Live is enabled...` are allowed.

## Analytics contract

| Event | Allowed state | Required properties |
|---|---|---|
| `cached_preview_start` | `cached_only`, `validation` | `recipe`, `source`, `costCredits: 0` |
| `generation_quote_view` | `live_eligible` | `recipe`, `model`, `duration`, `resolution`, `costCredits` |
| `generate_start` | `live_eligible` | `recipe`, `costCredits`, opaque local attempt ID |
| `settlement_pending` | `settlement_pending` | opaque job ID, error class; no token or prompt |
| `credits_released` | `release_confirmed` | opaque job ID, exact amount |

Do not emit `generate_start` for a cached playback.

## Acceptance

1. With no auth/durable delivery, every public route renders cached or
   validation language; no Live CTA is enabled.
2. With a complete mocked eligible session, Create and Seller Pack show exact
   10/30-credit quotes.
3. Removing any one live prerequisite returns the UI to cached/validation.
4. `/api/health`, `/pricing`, `/create`, and `/api/me` agree on availability.
5. Source and rendered-output tests reject the forbidden unconditional phrases.
6. Cached playback performs zero provider calls and never claims the upload was
   processed.
7. Failed capture, cancel, timeout, and worker crash never invent a refund.

