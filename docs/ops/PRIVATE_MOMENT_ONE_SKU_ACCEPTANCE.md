# Private Moment one-SKU acceptance harness

Status: operator runbook

Spend: **off by default**

Production host: **forbidden**

This harness is the code-side operator path for a single fixed Street Power-Up
Moment (`toy-moment-v1`) once external Provider balance and an invited owner
session exist. It does **not** fund accounts, change env/Provider/Stripe config,
or enable production generation.

## Modes

### Default — dry-run (no spend)

```bash
npm run private-moment-acceptance
# or: node scripts/private-moment-acceptance-harness.mjs
```

- Validates the fixed contract shape and operator gates.
- Makes **zero** upload, generate, Library, download, Provider, or Stripe calls.
- Prints sanitized JSON evidence with `verdict: PASS_DRY_RUN_NO_SPEND`.

### Real — operator only (at most one paid generate)

Requires **all** of:

| Variable | Meaning |
|---|---|
| `PIKBO_ACCEPTANCE_MODE=real` | Enable real path |
| `PIKBO_CONFIRM_PROVIDER_SPEND=I_UNDERSTAND_ONE_TOY_MOMENT_V1_SPEND` | Explicit spend confirmation |
| `PIKBO_ACCEPTANCE_BASE_URL` | **Exact** protected Preview origin only: `https://pikbo-git-codex-private-validation-pi-kbo.vercel.app` (hostile hosts and `pikbo.ai` are rejected) |
| `PIKBO_ACCEPTANCE_ACCESS_TOKEN` | **Required.** Supabase owner **access token** for `Authorization: Bearer …` on Pikbo APIs (`/api/assets/*`, `/api/me`, `/api/generate`, `/api/generations`, owner download HEAD). Matches `getAuthUserFromRequest` — cookie alone is not enough. |
| `PIKBO_ACCEPTANCE_PREVIEW_COOKIE` | Protected Preview **gateway** cookie (preferred). Legacy alias: `PIKBO_ACCEPTANCE_SESSION_COOKIE`. Sent with owner API calls for edge/auth-origin protection; **not** a substitute for Bearer. |
| `PIKBO_ACCEPTANCE_SESSION_COOKIE` | Legacy alias for the Preview gateway cookie (still accepted if `PREVIEW_COOKIE` is unset). |
| `PIKBO_ACCEPTANCE_IMAGE_PATH` | Local path to an **owned** toy photo (jpg/png/webp) |
| `PIKBO_ACCEPTANCE_ATTEMPT_ID` | **Required.** Stable operator attempt identifier (8–80 chars, `A-Za-z0-9._:-`). Reusing the same id with the same photo/SKU reuses the generate idempotency key (server replay-safe). **Changing it authorizes a new possible Provider spend.** |
| `PIKBO_ACCEPTANCE_SKU_LABEL` | Optional SKU label (default `operator-one-sku`) |

```bash
PIKBO_ACCEPTANCE_MODE=real \
PIKBO_CONFIRM_PROVIDER_SPEND=I_UNDERSTAND_ONE_TOY_MOMENT_V1_SPEND \
PIKBO_ACCEPTANCE_BASE_URL='https://pikbo-git-codex-private-validation-pi-kbo.vercel.app' \
PIKBO_ACCEPTANCE_ACCESS_TOKEN='…' \
PIKBO_ACCEPTANCE_PREVIEW_COOKIE='…' \
PIKBO_ACCEPTANCE_IMAGE_PATH='/path/to/owned-toy.jpg' \
PIKBO_ACCEPTANCE_ATTEMPT_ID='sku01-run-2026-08-05-a' \
npm run private-moment-acceptance
```

### Dual credentials (Preview cookie ≠ Pikbo auth)

| Request | Preview gateway cookie | `Authorization: Bearer` |
|---|---|---|
| Owner Pikbo API (`upload-url`, `complete`, `/api/me`, `generate`, `generations`, owner download HEAD) | **Sent** (admits protected Preview) | **Required** Supabase access token |
| **Pikbo-anonymous** download HEAD | **Sent** (so Vercel Deployment Protection admits the request) | **Stripped** (proves app-level `401` + `X-Pikbo-Download-Code: AUTH_REQUIRED`) |
| Private Storage signed PUT | **Stripped** | **Stripped** (signed upload URL is auth) |

“Anonymous” in this harness means **anonymous to Pikbo** (no Bearer / no Supabase
user), **not** a fully unauthenticated request to Vercel. The Preview gateway
cookie is still required on same-origin download probes so the request reaches
the app. Without that cookie, Deployment Protection may return a non-app 401
that lacks `X-Pikbo-Download-Code` — the harness treats that as fail-closed, not
as owner-only proof.

Missing or obviously invalid access tokens fail closed **before any network call**.
Token, cookie, attempt id, and idempotency keys never appear in evidence, errors, or logs.

### Generate idempotency (operator spend safety)

Real mode does **not** mint a random idempotency key. It derives a versioned
key (`accept-v1-<sha256>…`, ≤128 chars) from:

- `PIKBO_ACCEPTANCE_ATTEMPT_ID`
- fixed `toy-moment-v1` contract fields
- owned-image SHA-256
- SKU label

Rerunning the harness with the **same** attempt id + same photo + same SKU
sends the **same** `idempotencyKey` so the server can replay-protect after a
post-provider/Library failure. Minting a **new** attempt id is an explicit
operator action that can open a **new** paid generate. Evidence only records
booleans/version/length — never the attempt id or full key.

### Delivery contract (generate → Library → dual download probe)

`PASS_ONE_SKU_REAL` requires all of the following, aligned with
`app/api/generate/route.ts`, `app/api/me/route.ts`, and
`app/api/downloads/[id]/route.ts`:

1. **Immediate generate success** (`POST /api/generate`) must be non-demo
   (`demo !== true`), `processedUpload === true`, `privateResult === true`,
   `uploadIgnored !== true`, with a durable job id, and
   `videoUrl` must be a **short-lived absolute HTTPS signed URL** for Pikbo
   private Storage (`*.supabase.co/storage/v1/object/sign/…/pikbo-private-results/…`).
   It is **not** `/api/downloads/{jobId}`. Raw provider hosts and demo catalog
   paths fail closed. The harness never writes the signed URL into evidence.
2. **Fixed 10-credit settlement fields** on that success body:
   `costCredits === 10` and `creditsOutcome === "10 used"`. Any other value
   (including missing fields or `"0 cached"`) blocks PASS.
3. **Server `idempotentReplay` marker** on that body is the only source of truth
   for fresh vs replay. Evidence `accounting.idempotentReplay` is copied from
   the **verified** server marker (`generated.idempotentReplay === true`), never
   reverse-inferred from wallet balances alone.
4. **Durable wallet accounting** via at most two owner `GET /api/me` snapshots
   (before + after generate, Bearer + Preview cookie, same origin only):
   - Pre: signed-in durable wallet. Credit fields must be real JSON **numbers**
     (finite, non-negative, safe integers). `null`, `""`, or numeric strings
     fail closed (they must not coerce to 0).
   - A **fresh** charge path needs `availableCredits >= 10` before generate.
   - Post: reserved credits return to the pre-generate baseline (no drift).
   - **Marker ↔ delta binding (fail-closed):**
     - Server marker **true** → only `availableDelta === 0` is legal (no second debit).
     - Server marker **false/missing** → only `availableDelta === -10` is legal.
     - Fresh marker + delta 0, or replay marker + delta −10 → **FAIL**.
   - **Two legal PASS conclusions:**
     - **Fresh:** server marker false/missing, `availableDelta === -10`,
       evidence `idempotentReplay: false`.
     - **Replay:** server marker true, `availableDelta === 0`,
       evidence `idempotentReplay: true`.
   - Any other delta, reserved drift, missing/malformed wallet, or missing
     settlement fields blocks `PASS_ONE_SKU_REAL`.
5. **Library refresh** (`GET /api/generations`) must list a durable owner row:
   `status=succeeded`, `owned=true`, `downloadAllowed=true`, non-demo, matching
   job id, and a controlled `videoUrl` of the form `/api/downloads/{jobId}`.
6. **Owner download HEAD** (Preview cookie + Bearer, `redirect: manual`):
   HTTP **200**, `X-Pikbo-Download: allowed`, `X-Pikbo-Private-Result: 1`.
   Any 3xx is not PASS (do not follow or record signed Location).
7. **Pikbo-anonymous download HEAD** (Preview cookie kept, **no** Authorization,
   `redirect: manual`): HTTP **401** and `X-Pikbo-Download-Code: AUTH_REQUIRED`
   (application contract). Any 2xx/3xx fails the run. A 401 without the
   `X-Pikbo-Download-Code` header is treated as gateway/non-app failure, not PASS.

Cached/demo responses never count as PASS. Both download probes and wallet
settlement are required.

### Cost audit honesty (`costAudit`)

| Path | Requirement |
|---|---|
| **Fresh** (server marker false/missing) | Response **must** include labeled `estimatedUsd` and `ceilingRemainingUsd` (non-negative finite amounts). Missing `costAudit` → FAIL (`fresh_cost_audit_missing`). |
| **Replay** (server marker true) | Route may omit `costAudit`; evidence records estimated/ceiling as `null` and `actualLabel: "unknown"`. |

Evidence keeps only **safe** fragments:

| Field | Meaning in evidence |
|---|---|
| `estimatedUsd` | Planning estimate (`kind`/`label` = `estimated`) — not billed proof |
| `ceilingRemainingUsd` | Remaining ceiling (`kind`/`label` = `ceiling`) |
| `actualUsd` / `actualKnown` / `actualLabel` | **Actual provider cost** only when the server reports `kind`/`label` = `actual`. If the provider did not report a number, `actualUsd` is `null`, `actualKnown` is `false`, and `actualLabel` is **`unknown`**. |

Never treat estimated or ceiling as actual cost. Model IDs, provider URLs, and
notes that could leak vendor identifiers are stripped from evidence.

### Time-to-downloadable (`elapsedMs`)

On a complete PASS evidence object, `accounting.elapsedMs` is **time-to-downloadable**:
milliseconds from the pre-generate wallet snapshot through Library refresh and
**both** download HEAD probes. It is **not** “time until generate HTTP returns.”
`accounting.elapsedMeaning` is the string `time-to-downloadable`. Operators should
save this sanitized value with the rest of the PASS evidence.

## Flow (bounded)

1. `POST /api/assets/upload-url` — at most once (Bearer + Preview cookie)
2. If `state=pending`, validate `uploadUrl` **before any image bytes leave the
   process**, then PUT at most once:
   - origin must be exactly `https://lpfvfybkggiugosugfcw.supabase.co`
     (HTTPS, no credentials, default port only)
   - pathname must be the signed-upload contract
     `/storage/v1/object/upload/sign/pikbo-toy-inputs/<objectKey…>`
   - any other Supabase project, fal, Google Storage, HTTP, credential URL,
     wrong bucket, or lookalike path fails closed with `UNTRUSTED_UPLOAD_URL`
     and **zero** uploadPut/generate calls
   - storage PUT never attaches cookie/authorization (signed URL is auth)
3. `POST /api/assets/complete` — at most once (Bearer + Preview cookie)
4. `GET /api/me` — durable wallet **before** generate (Bearer + Preview cookie;
   at most two `/api/me` calls total for the run)
5. `POST /api/generate` with `productContract=toy-moment-v1`, effect
   `street-power-up`, `9:16` / 5s / 720p / Seedance Fast, `ownsRights` +
   `allowProviderSpend` — **exactly one** attempt (Bearer + Preview cookie)
6. Assert settlement fields (`costCredits` / `creditsOutcome` / safe cost audit)
7. `GET /api/me` — durable wallet **after** generate; assert fresh −10 or
   replay 0 with reserved back to baseline
8. `GET /api/generations` Library refresh (Bearer + Preview cookie)
9. Owner `HEAD /api/downloads/{jobId}` (Bearer + Preview cookie)
10. Pikbo-anonymous `HEAD /api/downloads/{jobId}` (Preview cookie, no Bearer)
    — must be app-level 401 + `AUTH_REQUIRED`

The harness never records signed upload URLs, tokens, cookies, attempt ids,
account IDs, emails, or object keys in evidence. No Stripe or third-party
billing endpoints are called.

## Evidence rules

Printed evidence is sanitized. It must **never** include:

- cookies / authorization headers / access tokens
- emails / account IDs / user IDs
- signed URLs (including generate `videoUrl` or download Location)
- storage object keys
- raw provider URLs or provider model identifiers
- attempt ids or full idempotency keys

Safe fields include counts, HTTP statuses, contract name, sha256 **prefix**,
boolean shape markers (`hasPrivateSignedDeliveryUrl`, `ownerOnlyProven`,
`privateResultMarker`, `idempotencyKeyDerived`, `idempotentReplay` from the
**server marker**, `fixedTenCreditSettlement`), controlled download header enums
(`allowed` / `AUTH_REQUIRED`), wallet **balances and deltas only**
(`availableBefore` / `availableAfter` / `availableDelta` / reserved
baseline and after), fixed `costCredits` / `creditsOutcome`, labeled cost-audit
amounts (or `actualLabel: "unknown"`), time-to-downloadable `elapsedMs` +
`elapsedMeaning`, and pass/fail verdict.

**Operators must save the sanitized JSON evidence** from a real PASS run
(stdout). That record is the durable proof of either a fresh −10 settlement or
an idempotent replay — not a screenshot of the UI alone.

Network audit distinguishes `downloadOwner`, `downloadAnonymous`, and `me`
without recording credentials or URLs.

## Fail-closed checks (CI-safe)

```bash
npm run private-moment-acceptance-regression
```

Proves dry-run no-spend, dual credential attach/strip, missing access-token
fail-closed, real-mode gate refusal, signed generate URL vs Library path, dual
download probe (owner private marker + anonymous denial), trusted upload URL,
stable attempt idempotency, one generate call bound, durable-wallet fresh −10
and replay 0 PASS paths, bad/missing settlement fields, wrong available delta,
reserved drift, unsigned-in / missing durable wallet, `/api/me` call bounds,
and sanitizer redaction (no email/accountId/token/attempt id in evidence).
Does not contact Provider, Stripe, or production.

## External blocker

Real PASS still requires a funded dedicated FAL account and an invited owner
session on the private Preview. Until that balance is non-zero, keep using
dry-run only; do not invent a successful Moment result.
