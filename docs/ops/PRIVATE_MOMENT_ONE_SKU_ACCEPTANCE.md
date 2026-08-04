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
| `PIKBO_ACCEPTANCE_SESSION_COOKIE` | Operator browser session cookie for the invited owner |
| `PIKBO_ACCEPTANCE_IMAGE_PATH` | Local path to an **owned** toy photo (jpg/png/webp) |
| `PIKBO_ACCEPTANCE_SKU_LABEL` | Optional SKU label (default `operator-one-sku`) |

```bash
PIKBO_ACCEPTANCE_MODE=real \
PIKBO_CONFIRM_PROVIDER_SPEND=I_UNDERSTAND_ONE_TOY_MOMENT_V1_SPEND \
PIKBO_ACCEPTANCE_BASE_URL='https://pikbo-git-codex-private-validation-pi-kbo.vercel.app' \
PIKBO_ACCEPTANCE_SESSION_COOKIE='…' \
PIKBO_ACCEPTANCE_IMAGE_PATH='/path/to/owned-toy.jpg' \
npm run private-moment-acceptance
```

`PASS_ONE_SKU_REAL` requires the generate response to be non-demo
(`demo !== true`), `processedUpload === true`, `privateResult === true`, with a
controlled `/api/downloads/…` URL, plus a Library row that is `status=succeeded`,
`owned=true`, `downloadAllowed=true`, and a durable private listing mode.
Cached/demo responses never count as PASS.

Flow (bounded):

1. `POST /api/assets/upload-url` — at most once  
2. Storage PUT of the owned image — at most once when pending  
3. `POST /api/assets/complete` — at most once  
4. `POST /api/generate` with `productContract=toy-moment-v1`, effect
   `street-power-up`, `9:16` / 5s / 720p / Seedance Fast, `ownsRights` +
   `allowProviderSpend` — **exactly one** attempt  
5. `GET /api/generations` Library refresh  
6. Owner-only `HEAD|GET /api/downloads/{jobId}`

## Evidence rules

Printed evidence is sanitized. It must **never** include:

- cookies / authorization headers  
- emails  
- signed URLs  
- storage object keys  
- raw provider URLs or provider model identifiers  

Safe fields include counts, HTTP statuses, contract name, sha256 **prefix**,
controlled `/api/downloads/…` shape, and pass/fail verdict.

## Fail-closed checks (CI-safe)

```bash
npm run private-moment-acceptance-regression
```

Proves dry-run no-spend, real-mode gate refusal without confirmation/session/image,
one-call generate bound with mocks, and sanitizer redaction. Does not contact
Provider, Stripe, or production.

## External blocker

Real PASS still requires a funded dedicated FAL account and an invited owner
session on the private Preview. Until that balance is non-zero, keep using
dry-run only; do not invent a successful Moment result.
