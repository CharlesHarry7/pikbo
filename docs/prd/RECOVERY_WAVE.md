# Recovery Wave product contract

Status: frozen for implementation  
Owner: GPT/Codex  
Target customer: independent designer-toy seller  
Primary job: turn one owned toy SKU into a publishable three-output starter pack

## 1. Why this wave exists

Production currently has a real provider key but no configured login or durable
wallet. A renewable guest Cookie cannot authorize a paid provider call. Product
work also drifted from a seller outcome toward a broad model/effect suite.

This wave protects cost first, then restores one measurable seller journey.

## 2. Entitlement state machine

| User state | Cached official demo | Upload/configure | Live provider | Download |
|---|---:|---:|---:|---:|
| Anonymous | yes, 0 credits | yes, local preview | no | official cached media only |
| Signed in, no durable wallet | yes | yes | no | official cached media only |
| Signed in, durable wallet, no deliverable pipeline | yes | yes | no | official cached media only |
| Invited beta, durable wallet, server-owned deliverable ready | yes | yes | yes after atomic reserve | derivative allowed by plan |
| Paid | not enabled in this wave | — | — | — |

Rules:

1. A Cookie is a browser session, never the source of truth for credits.
2. Live provider invocation requires:
   - authenticated Supabase user;
   - server-side `live_generation_allowed` entitlement;
   - committed durable reservation for the exact job;
   - a delivery path appropriate to the plan.
3. Any missing precondition fails before calling the provider.
4. No automatic fallback from durable reserve to Cookie credits.
5. Cached demos never inspect or transform the visitor's upload and must say so.

Required error codes:

- `AUTH_REQUIRED`
- `LIVE_ACCESS_REQUIRED`
- `DURABLE_CREDITS_UNAVAILABLE`
- `RESERVATION_FAILED`
- `DELIVERY_PIPELINE_UNAVAILABLE`
- `PROVIDER_UNAVAILABLE`

The UI must map each error to a direct next step and must not claim a refund
unless the server confirms one.

## 3. Durable reservation contract

One database transaction must:

1. lock the user's wallet row;
2. verify available balance and live entitlement;
3. deduplicate by `(user_id, idempotency_key)`;
4. decrement available credits;
5. create one reservation;
6. append one immutable ledger entry;
7. create or bind the generation job.

The transaction returns:

```ts
type GenerationReservation = {
  reservationId: string;
  jobId: string;
  userId: string;
  amount: number;
  status: "reserved";
  idempotencyKey: string;
  expiresAt: string;
};
```

Provider code must not accept a caller-supplied credit balance. It receives a
server-created `reservationId` and validates that it is still `reserved`.

Terminal settlement:

- success → reservation `captured`, append capture ledger entry;
- confirmed pre-output failure → reservation `released`, append release entry;
- ambiguous timeout/cancel → `review_required`; never invent restored credits;
- duplicate webhook → return prior settlement without a second ledger entry.

## 4. Job and retry contract

Each attempt has an immutable `jobId`, `generationSpec` and optional
`parentJobId`.

- Retry creates a child job using the selected attempt's immutable spec.
- Make variant creates a child job using current Composer settings.
- Re-submission must name the exact child `jobId` or one-time `retryToken`.
- Never promote a queued job by guessing from effect, prompt or list order.
- `deadlineAt` is fixed when the attempt starts.
- Browser reads never extend `deadlineAt` or worker lease.
- Only a trusted worker/provider heartbeat updates worker liveness.

## 5. Seller Starter Pack

Canonical name in this wave:

> Seller Starter Pack — 3 clips / 30 credits

Outputs:

1. `360-spin-showcase`, 1:1;
2. `blind-box-unboxing`, 9:16;
3. `paparazzi-flash`, 9:16.

Do not call this the 12-output Launch Pack. The future Launch Pack remains
`coming later`.

First-run journey:

1. upload one owned front photo;
2. choose Listing, Unboxing or Social Hook, or select Starter Pack;
3. see outputs and exact cost, confirm rights, then generate.

Model shelves, prompt editing, channel variants, Director Plan and other expert
controls live under collapsed Advanced settings and do not block the first run.

Partial failure:

- every child settles independently;
- successful children remain playable and exportable;
- Retry affects only the selected failed child;
- Pack status is `completed`, `partial` or `failed`;
- ambiguous refund state is visible per child.

## 6. Public proof contract

An Official example requires:

- owned/licensed input image distinct from output poster;
- provider task ID;
- model and material parameters;
- output asset;
- `reviewedAt` and named internal reviewer;
- five scores: identity, motion, artifacts, composition, commercial usefulness;
- every score at least 4/5; any score below 3 rejects the example.

Prototype or Concept:

- no numeric quality score;
- static Recipe art only;
- no auto-play;
- no “Remix this result” implication;
- may link to a configuration preview clearly labeled as unverified.

The homepage uses at most eight Official examples from the same registry used by
Explore and Project detail.

## 7. Analytics event contract

Events are descriptive facts, not marketing claims:

```text
home_example_start
home_example_25
home_example_complete
home_example_change
starter_pack_view
asset_upload_complete
recipe_selected
pack_quote_view
pack_start
pack_child_queued
pack_child_succeeded
pack_child_failed
pack_child_refund_confirmed
pack_complete
pack_partial
pack_export
project_reopened
second_sku_started
```

Required properties:

- anonymous stable event ID, never raw email;
- authenticated organization/user ID when available;
- `source_page`, `recipe`, `pack_id`, `job_id`, `mode`;
- `mode` is one of `cached_official`, `live_beta`, `prototype`;
- credits and model cost only from server settlement.

North-star measurement for this wave:

- upload → Pack start;
- Pack start → Pack export;
- first Pack → second SKU within seven days.

## 8. Release acceptance

Engineering:

- clearing cookies never grants a paid-model call;
- unauthenticated and durable-store-failure tests assert provider call count zero;
- 20 concurrent identical requests create one reservation and one provider job;
- CI fails when critical-path, route integration or ledger tests fail;
- fixed deadline expires even while browser polling continues.

Product:

- 390 px flow completes upload, selection and quote without horizontal overflow;
- only one primary CTA per homepage section;
- mobile plays at most one video; desktop at most two;
- Concept content never borrows another Recipe's video;
- the three-output product is named Seller Starter Pack everywhere;
- no Toy Identity Score appears until a real review/evaluation pipeline exists.
