# Private input + Launch Pack non-production E2E — 2026-08-01

## Scope and isolation

- Branch: `codex/private-input-pack-binding`
- Commit under test: `2bef756`
- Draft PR: [#91](https://github.com/CharlesHarry7/pikbo/pull/91)
- Dedicated Supabase project: `pikbo-private-preview-56` (`lpfvfybkggiugosugfcw`)
- Production database touched: **no**
- Provider generation called: **no**
- Stripe called or configured: **no**

This gate tested the existing private-input and fixed three-video Pack path only.
It did not add a page, feature, model, pricing path, or payment path.

## Migration rehearsal and persisted schema

1. Ran the full `20260731010000_private_toy_assets_pack_binding.sql`
   migration inside `BEGIN ... ROLLBACK`: success.
2. Ran the migration alone in a clean SQL editor tab: success.
3. Ran a post-apply verification query. Results:

| Probe | Result |
| --- | --- |
| `public.toy_assets` exists | true |
| `pikbo-private-inputs` exists, private, 8 MB cap | true |
| `seller_pack_runs.input_asset_id` exists | true |
| `generation_jobs.input_asset_id` exists | true |
| reserve/status v2 + active/resolve RPCs exist | true |
| `service_role` can execute reserve v2 | true |
| `service_role` can execute legacy reserve/status v1 | false |
| `anon` / `authenticated` can select `toy_assets` | false |

## Real private-input path

Two isolated, confirmed test identities were created: one owner and one
cross-account adversary. The repository-owned
`public/demos/scout-still.webp` was used as the input fixture.

| Check | Result |
| --- | --- |
| anonymous private upload preparation | `401 AUTH_REQUIRED` |
| invited owner upload preparation | `201`, pending private asset + signed upload |
| response leaks Storage object key | no |
| signed upload of the real WebP bytes | `200` |
| second account completes owner's asset | `404 INPUT_ASSET_NOT_FOUND` |
| owner server verification | `200`, `ready` |
| verified SHA-256 / byte length / MIME | exact match |
| repeat upload preparation | `200`, idempotent, no new signed URL |
| repeat complete | `200`, idempotent |
| direct owner-token read of `toy_assets` | `403` |
| direct owner-token read of private object | blocked |

## Zero-Provider Pack reserve and recovery

The test account received a 30-credit non-production fixture adjustment with
an append-only `credit_ledger` record. Live entitlement was enabled only for
that synthetic account. Local readiness used a deliberately invalid Provider
credential so no real Provider request could authenticate.

| Check | Result |
| --- | --- |
| initial wallet before Pack reserve | 40 available / 0 reserved |
| reserve v2 | `200`, server-owned atomic Pack |
| Pack quote and child count | 30 credits / exactly 3 children |
| all children bind the same `input_asset_id` | true |
| wallet after reserve | 10 available / 30 reserved |
| repeat reserve | `200`, `idempotent=true` |
| repeat reserve changes wallet | no |
| Provider budget reservation row count changes | no |
| owner active-Pack recovery | `200`, same Pack, 3 jobs |
| owner status recovery | `200`, 3 jobs |
| cross-account status recovery | `404 PACK_NOT_FOUND` |
| active/status DTO leaks object keys, Provider IDs, account/reservation IDs | no |
| database child state | 3 queued jobs, 0 Provider IDs, 0 output objects |

The fixed child identities recovered in order were:

1. `listing_spin`
2. `blind_box_reveal`
3. `social_flash`

No request was made to `/api/generate`.

## Vercel Preview

- Deployment: [pikbo-kqpwhlbt4-pi-kbo.vercel.app](https://pikbo-kqpwhlbt4-pi-kbo.vercel.app)
- Branch alias: [pikbo-git-codex-private-input-pack-binding-pi-kbo.vercel.app](https://pikbo-git-codex-private-input-pack-binding-pi-kbo.vercel.app)
- Deployment ID: `dpl_DSBYi8PMD8bLkiKJ6pcoZvZTksLN`
- State: Ready
- Protection: Vercel SSO

The branch-scoped Preview now uses the dedicated non-production Supabase URL,
anon key, service credential, session secret, durable Supabase backend, R1
reservation/reconciliation gates, and a synthetic allowlist. Payments are
explicitly disabled. Provider validation mode, validation budget, and Preview
override are explicitly `0`.

Protected remote health (via `vercel curl`) reports:

- `ok=true`, `degraded=false`
- private inputs: bucket/schema/RPC all ready
- auth: Supabase configured and reachable
- durable credits: writable Supabase backend
- payments: client off, server Checkout off, no Stripe secrets
- Provider validation: requested false, enabled false, ceiling USD 0
- private Preview generation readiness: false (fail-closed)
- anonymous private upload: `401 AUTH_REQUIRED`

## Independent review evidence

- GPT Pro conversation: `6a6b4960-4dcc-83e8-8404-b5cb6748abf6`
  - `APPROVE ENV-GATED NONPROD E2E`
- Grok terminal session: `019fbb99-e95b-7b80-973d-fa19bd291186`
  - `APPROVE`
- WorkBuddy source/path review: `pikbo-private-input-pack-binding-p0-20260731-wb1`
  - `APPROVE`, no P0 blocker

## Release decision

The private-input binding and zero-Provider Pack reserve/recovery slice is
ready for PR review. PR #91 remains Draft. It is **not** approved for production
or merge until an invited owner completes the protected Preview path and the
real Provider validation gate is deliberately enabled under the US$20 cap.
