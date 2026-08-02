# Private input non-production DB/RLS gate — 2026-08-02

## Scope

- Source under review: `main@46594609e98efc556d77c00266b212537e5e975d`
- Merged implementation: PR [#97](https://github.com/CharlesHarry7/pikbo/pull/97)
- Protected Preview branch: `codex/private-input-pack-binding@f31c655a59137dba68dcbaca27bd4c6dff8029b9`
- Protected Preview: `https://pikbo-git-codex-private-input-pack-binding-pi-kbo.vercel.app`
- Dedicated Supabase project: `pikbo-private-preview-56` (`lpfvfybkggiugosugfcw`)
- Production database touched: **no**
- Provider endpoint called: **no**
- Stripe endpoint called: **no**
- Application/API/UI/readiness source changed by this gate: **no**
- Test/evidence source added by this gate: **yes**

This is deliberately a database, RLS, Storage-policy and deployed-readiness
gate. It is not described as a complete seller HTTP or UI E2E.

## Independent decision

- GPT Pro conversation:
  `https://chatgpt.com/c/6a6b4960-4dcc-83e8-8404-b5cb6748abf6`
  - First decision: run a zero-Provider rehearsal.
  - After being shown the exact shared `privatePreview.ready` gate in
    `upload-url` and `seller-pack/reserve`, Pro selected **B**: keep the real
    Provider contract closed and run only the non-production DB/RLS gate.
- Grok task `grok_code_audit` independently confirmed that authenticated
  `upload-url` and `reserve` remain blocked while `privatePreview=false`; it
  approved the DB/RLS slice but rejected any claim of a complete generation
  loop.
- WorkBuddy task `workbuddy_visual_redteam` inspected the protected Preview at
  desktop and 390 px. Public truth, anonymous rejection and responsive paths
  pass; authenticated upload, reserve, recovery and private download remain
  runtime-unverified without dedicated QA sessions and a zero-Provider fixture.

## Migration and bucket

The current `20260802010000_private_toy_input_pack_binding.sql` migration was
first rehearsed inside `BEGIN ... ROLLBACK`, then applied to the dedicated
non-production project. Post-apply probes returned:

| Probe | Result |
| --- | --- |
| `public.toy_assets` exists | true |
| `seller_pack_runs.input_asset_id` exists | true |
| `generation_jobs.input_asset_id` exists | true |
| authenticated can select safe asset `id` | true |
| authenticated can select `object_key` | false |
| service role can execute asset-bound reserve RPC | true |
| authenticated can execute asset-bound reserve RPC | false |
| authenticated can execute child-authorization RPC | false |
| `pikbo-toy-inputs` is private | true |
| bucket file limit is exactly 8 MiB | true |
| MIME allowlist is exactly JPEG / PNG / WebP | true |
| direct authenticated Storage policies for this bucket | 0 |

An owner-role query for `object_key` failed with Postgres `42501 permission
denied for table toy_assets`. The field is therefore not merely filtered by
the API DTO; it is unavailable to the authenticated database role.

## Two-account RLS proof

The isolated project already contained two synthetic member identities and one
prior private-input fixture. No email, JWT, object key or user UUID was copied
into this report.

The SQL editor changed `request.jwt.claim.sub` and `SET LOCAL ROLE
authenticated` inside read-only transactions to simulate the two real
authenticated identities:

| Authenticated view | visible assets | visible bound Packs | visible bound jobs |
| --- | ---: | ---: | ---: |
| owner A | 1 | 1 | 3 |
| separate account B | 0 | 0 | 0 |

This proves that account B cannot discover A's asset, Pack, or three child
jobs through the table policies.

## Storage isolation and rollback

A temporary `storage.objects` metadata row was inserted for A under
`pikbo-toy-inputs` inside one transaction. With B's authenticated JWT subject,
the bucket query returned `0` visible rows. The transaction was rolled back.
A follow-up probe returned `remaining_probe_objects=0`.

No binary object, permanent Storage row, Pack, job, wallet entry, subscription,
or Stripe event was created by this gate.

## Deployed readiness truth

Protected Preview `/api/health` was fetched through authenticated Vercel CLI
access after the migration:

- `ok=true`, `degraded=false`
- `mode=validation`
- `softLive=false`
- `paid=false`
- `privatePreview=false`
- Supabase auth, durable atomic reservation, durable reconciliation, private
  result schema/bucket/RPC, and private input schema/bucket/RPC/discovery are
  ready.
- The only private-Preview missing requirements are:
  - `providerOutputAllowlistConfigured`
  - `providerValidationEnvironmentAllowed`
  - `providerValidationBudgetConfigured`
- Provider validation remains requested `false`, enabled `false`, budget USD
  `0`.

This closed state is intentional. No fake Provider key, fake allowlist, fake
result, temporary bypass, production switch, or payment switch was used to
make health look green.

## Release decision

**GO** for the non-production schema, RLS, column-level privacy, service-only
RPC and Storage-policy boundary.

**NO-GO** for claiming the complete invited-seller loop, Provider generation,
production migration, public generation, or paid launch. A future complete
rehearsal needs an explicit zero-Provider test boundary or controlled
service-owned fixture harness; it must not reuse `privatePreview.ready` as a
fake test switch.

## Controlled zero-Provider harness

After the DB/RLS-only gate, GPT Pro selected one bounded follow-up:
`scripts/nonprod-seller-pack-harness.mjs`. The harness is locked to the exact
non-production origin and project ref, rejects production/Provider/Stripe
secrets, allowlists only the two required Pack RPCs and the private input
bucket, uses two real temporary Auth sessions, and performs exact-ID cleanup.

Before any destructive cleanup, it verifies synthetic Auth metadata and exact
account/asset/Pack/job ownership. It also refuses cleanup if it discovers any
fixture-scoped Provider spend, Stripe event, subscription, legacy cost audit,
private derivative, consumed guest session, or reconciliation row. The global
Provider budget row is compared byte-for-byte before and after. These guards
were added after Grok identified two destructive-cleanup P0s; the regression
now directly tests origin/port/path rejection, same-origin Provider/Stripe RPC
rejection, bucket rejection, unexpected evidence preservation, budget drift,
and account-owner mismatch.

The real run against `lpfvfybkggiugosugfcw` returned:

| Probe | Result |
| --- | --- |
| network requests | 103, all to the exact non-production Supabase origin |
| Provider / Stripe calls | 0 / 0 |
| AI-generated media | false |
| synthetic input | ready, checksum verified |
| Pack | one idempotent 30-credit reservation |
| children | exactly 3, fixed 1:1 / 9:16 / 9:16, all 5 seconds |
| input binding | the same private asset on all three jobs |
| wallet after reserve | 10 available / 30 reserved / 0 settled |
| owner A | asset, Pack and three jobs visible; Pack status recoverable |
| separate account B | 0 assets / 0 Packs / 0 jobs |
| direct authenticated Storage read | denied for A and B |
| service checksum read | exact match |
| final DB/Auth/Storage residue | 0 |

Truth boundary: this proves private input ownership, Pack reservation,
three-child binding, direct durable status recovery, table RLS and private
Storage isolation. It does **not** prove real HTTP upload/complete, Create or
Library UI, Provider generation, settlement/release/retry, private result
download, AI quality, Stripe, production, or a complete seller lifecycle.

## Runtime schema drift discovered

The controlled run fail-closed twice before passing and exposed a material
runtime incompatibility:

- The non-production database already contains the stronger v2 private-input
  contract from historical commit `30bec4a`: required `client_asset_key`,
  canonical `/{owner}/{asset}/source.{ext}` keys, stronger owner/Pack foreign
  keys, and `pikbo_get_seller_pack_status_v2`.
- That stronger migration intentionally revokes service-role execution of
  status v1.
- Canonical `main@4659460` still inserts the simplified asset shape without
  `client_asset_key`, writes `/input.{ext}`, and calls status v1.

The harness used the verified v2 status RPC and reports
`schemaCompatibility.driftDetected=true`; it did not re-grant v1 or weaken a
constraint. GPT Pro's next decision is a minimal selective v2 adapter alignment
in `lib/privateToyAssets.ts` and `lib/durableCredits/supabaseStore.ts`, never a
bulk merge of the historical 4,228-line branch.

The final redacted machine-readable result is preserved at
`docs/evidence/NONPROD_PRIVATE_INPUT_PACK_HARNESS_2026-08-02.json`. It contains
no email, user/account UUID, object key, JWT, API key, or Provider identifier.

Updated release decision: **GO** for the repeatable non-production private
input + Pack reservation harness. **NO-GO** for the current canonical HTTP
upload/recovery path until the v2 adapter drift is repaired and retested.

## Selective v2 adapter alignment rerun

The follow-up branch started from `main@fb1f9204a88609e519255462eb5783554564c7c5`
and selectively aligned the canonical application adapters to the verified
forward-applied v2 contract. It did not copy the historical migration, change
the active `pikbo-toy-inputs` bucket, weaken a database constraint, or alter
Provider, Stripe, credit settlement, readiness, UI, or SEO behavior.

The immutable implementation commit is
`0c3eb687758d445883f4493cc26b22569b74e542`; this evidence-only follow-up adds
that commit reference without changing the tested adapters or harness.

The bounded changes are:

- private asset metadata is created and completed through
  `pikbo_create_toy_asset_v1` and `pikbo_complete_toy_asset_v1`;
- the database remains the only authority that mints the private
  `/{owner}/{asset}/source.{ext}` key;
- the browser uses Supabase's signed multipart upload body and verifies the
  HTTP result before completion;
- Pack reserve and recovery use `pikbo_reserve_seller_pack_v2` and
  `pikbo_get_seller_pack_status_v2`;
- generation resolves the owner/Pack/job/input binding through
  `pikbo_resolve_seller_pack_input_v1` and rechecks bytes, SHA-256, MIME, and
  exact size before constructing the server-only data URL;
- object keys and Provider identifiers remain absent from every public asset
  response.

The controlled harness was upgraded to exercise the same create, complete,
reserve, and status RPCs. Its second real run returned:

| Probe | Result |
| --- | --- |
| exact-origin Supabase requests | 109 |
| Provider / Stripe / other third-party calls | 0 / 0 / 0 |
| create pending asset | passed |
| server-side checksum/MIME/size completion | passed |
| same-key/same-metadata asset replay | idempotent, same ready asset |
| same-key/different-metadata replay | rejected with `IDEMPOTENCY_CONFLICT` |
| Pack reserve/replay | v2, 30 credits, idempotent |
| children | exactly three, one shared asset, fixed formats |
| owner Pack-child input resolver | correct private object and checksum |
| outsider / wrong-child resolver | denied without object key |
| v2 owner recovery | passed |
| separate-account visibility | 0 assets / 0 Packs / 0 jobs |
| final DB/Auth/Storage residue | 0 |

Adapter decision: **GO** for the v2 application/remote contract and repeatable
zero-Provider non-production gate. Product decision remains **NO-GO** for
claiming real video delivery, HTTP Create/Library completion, settlement,
retry, private output download, production, or paid launch; none of those were
exercised by this slice.
