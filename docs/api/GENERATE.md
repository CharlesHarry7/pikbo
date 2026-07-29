# Generate API

> **Historical v1; superseded on 2026-07-29.** The current endpoint requires
> authenticated durable authority for any real provider call, pins validation
> to Fast 720p / 5 seconds, saves a private owned result before settlement, and
> restricts Founding Studio to fixed Pack children. See
> [`../CURRENT_LAUNCH_CONTRACT.md`](../CURRENT_LAUNCH_CONTRACT.md). The
> cookie-authoritative synchronous contract below must not be used to build a
> current client.

**Endpoint:** `POST /api/generate`  
**Status:** Current synchronous v1 contract  
**Last reviewed:** 2026-07-23  
**Type source:** `lib/contracts.ts`  
**Runtime source:** `app/api/generate/route.ts`

This document describes behavior that exists now. Future async jobs, database credits, idempotency keys, and cloud assets are explicitly not part of this contract.

## 1. Authentication and session

The endpoint does not require a logged-in account. It creates or reads the signed HTTP-only `pikbo_s` Cookie and returns a public session snapshot.

Current implications:

- Identity is browser-session based, not a durable user account.
- Credits and plan state do not automatically sync across browsers or devices.
- The Cookie is written with `SameSite=Lax`, production `Secure`, `/` path, and a 180-day maximum age.
- Production must configure a unique `SESSION_SECRET`; the code's development fallback is not safe for real traffic.

## 2. Request

### Headers

```http
Content-Type: application/json
```

### Body

```ts
type GenerateRequestBody = {
  effect?: string;
  image?: string;
  extra?: string;
  duration?: number;
  aspectRatio?: string;
  model?: "seedance-2" | "seedance-fast" | "seedance-mini" | string;
  resolution?: "480p" | "720p" | string;
  seed?: number;
};
```

| Field | Required | Current behavior |
|---|---:|---|
| `effect` | Yes | Must be a registered preset slug returned by `getPreset()` |
| `image` | Yes | A `data:image/...;base64,...` URL for JPEG/JPG, PNG, WebP, or GIF |
| `extra` | No | Extra prompt direction appended to the registered preset template |
| `duration` | No | Paid: rounded and clamped to 4–10 seconds; Free: forced to 5 seconds |
| `aspectRatio` | No | Accepts `9:16`, `16:9`, `1:1`, or `auto`; invalid values fall back to the preset |
| `model` | No | Free ignores it and uses Mini; paid recognizes `seedance-mini` and `seedance-fast`, otherwise uses full/default Seedance |
| `resolution` | No | Free is forced to `480p`; paid accepts `480p` or `720p`, defaulting to `720p` |
| `seed` | No | A finite value `>= 0` is floored and forwarded; other values are omitted |

### Image limits

- The request must contain a supported image data URL.
- The encoded string must be at most 12,000,000 characters.
- The route describes that as an approximate 8 MB source-image maximum.
- After decoding, image content below 32 bytes is rejected.

### Duration normalization detail

The response echoes the normalized integer duration. The provider receives a supported Seedance duration bucket:

- 4 → `4`
- 5 → `5`
- 6 → `6`
- 7 or 8 → `8`
- 9 or 10 → `10`

Clients should show the server response rather than assuming the raw request value is the exact provider bucket.

### Example

```json
{
  "effect": "shelf-to-life",
  "image": "data:image/jpeg;base64,<base64 omitted>",
  "extra": "Keep the painted face and package colors unchanged.",
  "duration": 5,
  "aspectRatio": "9:16",
  "model": "seedance-mini",
  "resolution": "480p",
  "seed": 42
}
```

## 3. Server-enforced plan behavior

| Plan state | Model | Duration | Resolution | Audio | Credit cost |
|---|---|---:|---|---|---:|
| Free live | Mini | 5s | 480p | Off | 10 |
| Paid live default | Full/default Seedance | Requested 4–10s | 720p default | On | 10 |
| Paid live preference | Mini or Fast when explicitly recognized | Requested 4–10s | 480p or 720p | On | 10 |
| No `FAL_KEY` | Cached demo media | Normalized display value | Tier-normalized display value | Existing asset | 0 |

The flat 10-credit cost is current implementation, not a promise that future model/duration/resolution combinations will remain equal.

## 4. Success responses

### Type

```ts
type GenerateSuccess = {
  videoUrl: string;
  demo: boolean;
  watermark: boolean;
  model: string;
  duration: number;
  aspectRatio: string;
  resolution: string;
  session: PublicSession;
  requestId?: string;
  provider?: string;
  demoReason?: "no_provider_key";
};
```

### Live generation — `200`

```json
{
  "videoUrl": "https://provider.example/output.mp4",
  "demo": false,
  "watermark": true,
  "model": "bytedance/seedance-2.0/mini/image-to-video",
  "duration": 5,
  "aspectRatio": "9:16",
  "resolution": "480p",
  "session": {
    "id": "session-uuid",
    "plan": "free",
    "credits": 0,
    "periodKey": "2026-07",
    "watermark": true,
    "planName": "Free",
    "clipsLeft": 0,
    "creditsPerVideo": 10
  },
  "requestId": "provider-request-id",
  "provider": "bytedance-seedance"
}
```

`requestId` and `provider` are present on the current live success path. They are not client-supplied idempotency keys.

### Cached demo — `200`

```json
{
  "videoUrl": "/demo/cached-effect.mp4",
  "demo": true,
  "demoReason": "no_provider_key",
  "watermark": true,
  "model": "demo-cached",
  "duration": 5,
  "aspectRatio": "9:16",
  "resolution": "480p",
  "session": {
    "id": "session-uuid",
    "plan": "free",
    "credits": 10,
    "periodKey": "2026-07",
    "watermark": true,
    "planName": "Free",
    "clipsLeft": 1,
    "creditsPerVideo": 10
  }
}
```

When `demo: true`:

- No fal provider call occurred.
- The uploaded image was not used to create the returned clip.
- No credit check or debit occurs on the current cached path.
- The UI must label the result as a cached demo, not as generated output.

## 5. Public session

```ts
type PublicSession = {
  id: string;
  plan: "free" | "creator" | "shop";
  credits: number;
  periodKey: string;
  watermark: boolean;
  planName: string;
  clipsLeft: number;
  creditsPerVideo: number;
};
```

`clipsLeft` is computed as `floor(credits / 10)`. It is an estimate under the present flat meter.

## 6. Error responses

### Type

```ts
type GenerateErrorBody = {
  error: string;
  code?:
    | "INSUFFICIENT_CREDITS"
    | "INVALID_REQUEST"
    | "IMAGE_TOO_LARGE"
    | "UNKNOWN_EFFECT"
    | "MODEL_EMPTY"
    | "GENERATION_FAILED"
    | "PROVIDER_BALANCE"
    | "PROVIDER_RATE_LIMIT"
    | "RATE_LIMITED"
    | "JOB_IN_FLIGHT";
  need?: number;
  have?: number;
  model?: string;
  session?: PublicSession;
  retryAfterSec?: number;
};
```

| HTTP | Code | When | Credit result | Client action |
|---:|---|---|---|---|
| 400 | `INVALID_REQUEST` | Invalid JSON, missing/invalid image, unreadable or empty decoded image | No debit, or refund if debit already occurred | Fix the payload/image |
| 400 | `UNKNOWN_EFFECT` | Missing or unregistered effect slug | No debit | Choose a registered effect |
| 413 | `IMAGE_TOO_LARGE` | Encoded image string exceeds 12,000,000 characters | No debit | Resize/compress and retry |
| 402 | `INSUFFICIENT_CREDITS` | Live mode balance is below 10 | No debit; includes `need`, `have`, and `session` | Explain plan/refresh; do not loop |
| 429 | `RATE_LIMITED` | Session/IP generate budget is exhausted | No debit; includes `retryAfterSec` and `Retry-After` | Wait, then retry |
| 409 | `JOB_IN_FLIGHT` | The same session already has a generation running | No debit | Wait for the current job |
| 502 | `MODEL_EMPTY` | Provider completes without a video URL | 10 refunded; includes `model` and `session` | Retry or choose another recipe |
| 402 | `PROVIDER_BALANCE` | fal/provider account balance is insufficient | 10 refunded | Stop batch; operator funds/disables live mode |
| 429 | `PROVIDER_RATE_LIMIT` | Provider rate-limits the job | 10 refunded | Back off; batch client may retry once |
| 500 | `GENERATION_FAILED` | Other provider or generation failure | 10 refunded | Show recoverable failure; avoid blind repeat |

The client wrapper may represent a network failure locally as status `0`; that is not an HTTP response or an API error code.

### Example error

```json
{
  "error": "Free trial used up — upgrade on Pricing, or wait for monthly refresh",
  "code": "INSUFFICIENT_CREDITS",
  "need": 10,
  "have": 0,
  "session": {
    "id": "session-uuid",
    "plan": "free",
    "credits": 0,
    "periodKey": "2026-07",
    "watermark": true,
    "planName": "Free",
    "clipsLeft": 0,
    "creditsPerVideo": 10
  }
}
```

## 7. Credit lifecycle

Live processing follows this sequence:

1. Parse and validate JSON, effect, image type, and encoded size.
2. Create/read the signed session.
3. Apply session/IP rate limiting.
4. Acquire the one-job-per-session in-flight guard.
5. If `FAL_KEY` is absent, return cached demo media with no debit.
6. Check for at least 10 credits.
7. Deduct 10 and save the session.
8. Decode/upload the image and call fal.
9. On live success, keep the debit and return the provider result.
10. On post-debit failure, restore 10, save the session, and return the error.
11. Release the in-flight guard in `finally`.

## 8. Retry and concurrency behavior

- Only one job may be in flight per session in the current process.
- The batch client retries `RATE_LIMITED`, `PROVIDER_RATE_LIMIT`, and `JOB_IN_FLIGHT` once.
- `INSUFFICIENT_CREDITS` and `PROVIDER_BALANCE` are fatal for the current batch.
- There is no request idempotency key.
- The endpoint is synchronous and may run up to the route's 180-second maximum.
- A client that loses the network after provider submission cannot query the job by this API. Blindly repeating the POST may create and charge another job.
- The current in-memory lock and Cookie credit mutation do not guarantee cross-instance concurrency safety.

These limitations are acceptable only for the low-volume soft launch defined in `docs/prd/SOFT_LAUNCH.md`.

## 9. Provider and privacy behavior

In live mode:

- The data URL is decoded server-side.
- The file is uploaded through fal storage.
- The registered recipe plus optional `extra` prompt is sent to Seedance.
- The endpoint returns the provider-hosted video URL; it does not create a durable PIKBO asset record.

In cached mode, the image is validated but is not uploaded to fal or used to produce the cached result.

Clients must obtain confirmation that the user owns the submitted photo and has the rights required for the toy/character and intended use.

## 10. Compatibility rules

Clients must:

- Branch on `demo`, not infer mode from `videoUrl`.
- Treat `demoReason` as optional and currently limited to `no_provider_key`.
- Render plan/model/resolution/duration from the response.
- Use the returned `session` after success or credit-related/provider errors.
- Tolerate optional `requestId`, `provider`, `model`, and error detail fields.
- Avoid inventing unregistered effect names.
- Avoid promising that a local player mark is burned into the video file.

## 11. Not implemented

The following are future interfaces, not current behavior:

- Authenticated user or organization tokens.
- Async `GenerationJob` creation and polling.
- Client idempotency keys.
- Durable credit reservations and ledger entries.
- Provider webhooks.
- Cancel/retry endpoints.
- Signed PIKBO media URLs.
- Cloud Library persistence.
- Multi-input toy references.
- Model/duration/resolution-weighted credit quotes.

Engineering may add those only through a versioned contract update. Existing clients should not treat the synchronous v1 endpoint as a durable production queue.
