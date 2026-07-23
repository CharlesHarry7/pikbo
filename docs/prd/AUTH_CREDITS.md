# PIKBO Auth and Durable Credits — T5 data model draft

**Status:** Architecture/product draft — requires Claude engineering review
**Owner:** GPT (data and business contract)
**Implementation owner:** Claude
**Last reviewed:** 2026-07-23
**Blocks:** Real Stripe, public paid Seller Pack, cross-device balance
**Suggested platform:** Supabase Auth + Postgres; Storage only when cloud assets enter scope

## 1. Decision

Replace Cookie-authoritative identity and JSON-file entitlements with:

- Supabase Auth for durable user identity.
- A durable billing account per user, expandable to Shop teams later.
- An append-only credit ledger.
- Transactional credit reservation, settlement, and release.
- Durable Stripe subscription/event records.
- Generation jobs linked to the account and credit reservation.

The signed `pikbo_s` Cookie may remain temporarily as an anonymous soft-launch session, but it stops being the source of truth immediately after login.

This document is a data and transaction contract, not an instruction to enable live Stripe.

## 2. Goals

- The same login shows the same plan and balance across devices.
- Concurrent jobs cannot overspend credits.
- Every credit change is auditable and idempotent.
- A failed provider job releases only its own reserved amount.
- Stripe retries cannot grant the same allowance twice.
- Free monthly credit cannot be reset by clearing a browser Cookie.
- Seller Pack can reserve 30 credits and settle/release 10 per child.
- Support can reconcile a customer, invoice, generation, and credit entry.

## 3. Non-goals

- Enterprise SSO or SCIM.
- Multiple billing currencies.
- Credit transfer between customers.
- Reselling credits.
- Top-up packs in the first paid release.
- Negative balances as normal behavior.
- A general accounting ledger for cash.
- Full organization roles beyond a small forward-compatible schema.
- Public API keys.
- Permanent media retention policy; that needs a separate asset/storage PRD.

## 4. Identity model

### Authentication methods

Initial supported methods:

- Email magic link or one-time code.
- Google OAuth.

Password login, phone login, and enterprise SSO are deferred.

### Identity rules

- `auth.users.id` is the durable person identity.
- Email is not used as a foreign key.
- One user receives one personal billing account by default.
- A Shop account may later contain multiple members without moving ledger history.
- Logged-in reads ignore Cookie plan/credits.
- Paid status is derived from the database and Stripe records, never from a client claim.

### Anonymous-to-auth transition

The existing signed Cookie may be used once to preserve an anonymous Free balance:

1. Verify the Cookie signature.
2. Create/login the durable user.
3. Create the personal account if absent.
4. If that account has never received the current period's Free grant, migrate at most the Cookie's remaining balance, capped at 10.
5. Record the migration as an idempotent ledger event tied to the guest session ID.
6. Mark the guest session ID consumed.
7. Never migrate a paid plan from the Cookie.
8. If the account already has a durable balance or period grant, discard Cookie credit state.

This preserves an honest remaining trial without allowing repeated Cookie merges.

## 5. Core tables

Names are proposed; Claude may adjust naming while preserving the constraints and relationships.

### `profiles`

| Column | Type | Rule |
|---|---|---|
| `id` | UUID PK | References `auth.users(id)` |
| `display_name` | Text nullable | User-facing only |
| `avatar_url` | Text nullable | Validated URL/path |
| `created_at` | Timestamptz | Server default |
| `updated_at` | Timestamptz | Server maintained |

Do not duplicate spendable credits or subscription status here.

### `accounts`

| Column | Type | Rule |
|---|---|---|
| `id` | UUID PK | Durable billing/workspace ID |
| `kind` | Enum | `personal` or `shop` |
| `owner_user_id` | UUID | References `auth.users` |
| `plan_id` | Enum | `free`, `creator`, `shop` |
| `status` | Enum | `active`, `restricted`, `closed` |
| `created_at` | Timestamptz | Server default |
| `updated_at` | Timestamptz | Server maintained |

`plan_id` is a cached entitlement projection. Stripe/subscription processing is responsible for changing it; clients cannot write it.

### `account_memberships`

| Column | Type | Rule |
|---|---|---|
| `account_id` | UUID | References `accounts` |
| `user_id` | UUID | References `auth.users` |
| `role` | Enum | `owner`, `editor`, `viewer` |
| `created_at` | Timestamptz | Server default |

Primary key: `(account_id, user_id)`.

Only `owner` may manage billing. Generation permission for `editor` is a future Shop-team switch; the table is included now to avoid binding jobs directly to one owner.

### `credit_wallets`

| Column | Type | Rule |
|---|---|---|
| `account_id` | UUID PK | References `accounts` |
| `available_credits` | Integer | `>= 0` |
| `reserved_credits` | Integer | `>= 0` |
| `lifetime_used_credits` | Bigint | `>= 0` |
| `version` | Bigint | Incremented on every transaction |
| `updated_at` | Timestamptz | Server maintained |

The wallet is a transactional projection for fast checks. The ledger is the audit record. A reconciliation job must be able to rebuild/verify wallet totals from ledger entries.

### `credit_ledger`

Append-only; no update/delete in application code.

| Column | Type | Rule |
|---|---|---|
| `id` | UUID PK | Server generated |
| `account_id` | UUID | References `accounts` |
| `kind` | Enum | See event list below |
| `delta_available` | Integer | Signed |
| `delta_reserved` | Integer | Signed |
| `available_after` | Integer | Snapshot after transaction |
| `reserved_after` | Integer | Snapshot after transaction |
| `reservation_id` | UUID nullable | References `credit_reservations` |
| `source_type` | Text | `free_period`, `stripe_invoice`, `generation`, `seller_pack`, `admin`, `migration` |
| `source_id` | Text | Durable external/domain identifier |
| `idempotency_key` | Text unique | Required for every mutation |
| `metadata` | JSONB | Non-secret diagnostic facts |
| `created_at` | Timestamptz | Server default |

Allowed `kind` values:

- `grant`
- `reserve`
- `settle`
- `release`
- `expire`
- `refund`
- `adjustment`
- `migration`

An entry must never contain raw uploaded media, prompts, card data, or Stripe webhook payloads.

### `credit_reservations`

| Column | Type | Rule |
|---|---|---|
| `id` | UUID PK | Server generated |
| `account_id` | UUID | References `accounts` |
| `purpose` | Enum | `generation` or `seller_pack` |
| `quoted_credits` | Integer | `> 0` |
| `settled_credits` | Integer | `>= 0` and `<= quoted` |
| `released_credits` | Integer | `>= 0` and `<= quoted` |
| `status` | Enum | `reserved`, `partially_settled`, `settled`, `released`, `expired` |
| `idempotency_key` | Text unique | Client/server operation key |
| `expires_at` | Timestamptz | Short recovery deadline |
| `created_by` | UUID | Authenticated user |
| `created_at` | Timestamptz | Server default |
| `updated_at` | Timestamptz | Server maintained |

Invariant:

```text
settled_credits + released_credits <= quoted_credits
```

When the reservation reaches a terminal state, the sum equals the original quote.

### `subscription_records`

| Column | Type | Rule |
|---|---|---|
| `id` | UUID PK | Internal record |
| `account_id` | UUID | References `accounts` |
| `provider` | Enum | Initially `stripe` |
| `stripe_customer_id` | Text unique | Nullable before checkout |
| `stripe_subscription_id` | Text unique | Nullable before subscription |
| `stripe_price_id` | Text nullable | Validated server-side |
| `plan_id` | Enum | `creator` or `shop` |
| `status` | Enum | `trialing`, `active`, `past_due`, `canceled`, `unpaid`, `incomplete` |
| `current_period_start` | Timestamptz nullable | From Stripe |
| `current_period_end` | Timestamptz nullable | From Stripe |
| `cancel_at_period_end` | Boolean | From Stripe |
| `created_at` | Timestamptz | Server default |
| `updated_at` | Timestamptz | Server maintained |

Free is not a Stripe subscription row.

### `stripe_events`

| Column | Type | Rule |
|---|---|---|
| `event_id` | Text PK | Stripe event ID |
| `event_type` | Text | Indexed |
| `payload_sha256` | Text | Diagnostic integrity check |
| `status` | Enum | `received`, `processing`, `processed`, `failed` |
| `attempt_count` | Integer | Server incremented |
| `last_error` | Text nullable | Sanitized |
| `received_at` | Timestamptz | Server default |
| `processed_at` | Timestamptz nullable | Set on success |

Webhook handling inserts the event ID before applying effects. A duplicate event returns success without repeating grants or plan changes.

### `generation_jobs`

T5 needs enough job data to bind credits to an auditable outcome.

| Column | Type | Rule |
|---|---|---|
| `id` | UUID PK | PIKBO job ID |
| `account_id` | UUID | References `accounts` |
| `created_by` | UUID | References `auth.users` |
| `pack_run_id` | UUID nullable | Seller Pack parent |
| `effect_slug` | Text | Registered preset snapshot |
| `status` | Enum | `queued`, `running`, `succeeded`, `failed`, `canceled`, `unknown` |
| `quoted_credits` | Integer | Server quote |
| `settled_credits` | Integer | 0 until success |
| `reservation_id` | UUID | References reservation |
| `provider` | Text nullable | e.g. `fal` |
| `provider_request_id` | Text nullable unique | When available |
| `demo` | Boolean | Cached demo never settles credits |
| `error_code` | Text nullable | Current normalized code |
| `created_at` | Timestamptz | Server default |
| `started_at` | Timestamptz nullable | |
| `completed_at` | Timestamptz nullable | |

Media paths and detailed generation parameters may be added in an asset/job PRD. Do not store source images in ledger metadata.

### `seller_pack_runs`

| Column | Type | Rule |
|---|---|---|
| `id` | UUID PK | Pack ID |
| `account_id` | UUID | References `accounts` |
| `created_by` | UUID | References `auth.users` |
| `status` | Enum | From `docs/prd/SELLER_PACK.md` |
| `quoted_credits` | Integer | 30 for default live pack |
| `settled_credits` | Integer | 0–30 in 10-credit steps |
| `reservation_id` | UUID nullable | One parent reservation |
| `mode` | Enum | `demo_cached` or `live_generate` |
| `created_at` | Timestamptz | |
| `completed_at` | Timestamptz nullable | |

The three child `generation_jobs` point back to this row.

### `consumed_guest_sessions`

| Column | Type | Rule |
|---|---|---|
| `guest_session_id_hash` | Text PK | Hash, not raw Cookie |
| `user_id` | UUID | User that consumed it |
| `account_id` | UUID | Receiving account |
| `migrated_credits` | Integer | 0–10 |
| `consumed_at` | Timestamptz | Server default |

This makes anonymous-credit migration one-time and auditable.

## 6. Credit transaction contract

All mutations run server-side in one Postgres transaction. Clients never update wallet or ledger tables directly.

### Quote

The server computes:

```ts
type CreditQuote = {
  quoteId: string;
  accountId: string;
  items: Array<{
    key: string;
    model: string;
    durationSec: number;
    resolution: string;
    credits: number;
  }>;
  totalCredits: number;
  expiresAt: string;
};
```

While the flat contract is active, one live job is 10 credits. The schema must still store the itemized quote so model-aware weights can replace the flat rate without changing audit semantics.

### Reserve

`reserve_credits(account_id, quote, idempotency_key)`:

1. Authenticates account membership and generation permission.
2. Locks the wallet row.
3. Rejects an expired or altered quote.
4. Rejects when `available_credits < total`.
5. Moves total from available to reserved.
6. Creates the reservation.
7. Appends one `reserve` ledger entry.
8. Returns the same reservation for a repeated idempotency key.

### Settle

`settle_reservation_item(reservation_id, job_id, credits, idempotency_key)`:

1. Locks reservation and wallet.
2. Confirms the job belongs to the account/reservation.
3. Rejects settlement above the remaining reservation.
4. Decreases reserved.
5. Increases lifetime used.
6. Appends `settle`.
7. Marks the job succeeded with `settled_credits`.
8. Returns the prior result on duplicate idempotency.

### Release

`release_reservation_item(reservation_id, job_id, credits, reason, idempotency_key)`:

1. Locks reservation and wallet.
2. Confirms the amount is still unsettled/unreleased.
3. Decreases reserved and restores available.
4. Appends `release` or `refund`.
5. Records the normalized failure/cancel reason.
6. Returns the prior result on duplicate idempotency.

### Expiry recovery

A scheduled worker releases reservations that:

- Remain `reserved` or `partially_settled`.
- Have passed `expires_at`.
- Have no provider job still confirmed active.

Ambiguous provider jobs move to manual/automated reconciliation rather than automatically issuing both a release and a later settlement.

## 7. Wallet invariants

These invariants must hold after every transaction:

```text
available_credits >= 0
reserved_credits >= 0
reservation.settled + reservation.released <= reservation.quoted
wallet.version increases exactly once per wallet mutation
every wallet delta has one ledger idempotency key
```

For a 30-credit Seller Pack:

- Three successes: available -30, reserved 0, used +30.
- Two successes and one refunded failure: available -20, reserved 0, used +20.
- No child accepted: available unchanged.

Six concurrent 10-credit jobs against a 50-credit wallet must accept exactly five reservations and reject one.

## 8. Period allowance rules

### Free

- One 10-credit grant per durable account per UTC calendar month.
- Unique source key: `free:{account_id}:{YYYY-MM}`.
- Clearing cookies does not create another grant for a logged-in account.
- Unused Free credits expire when the next Free period begins; no rollover in v1.

### Creator and Shop

- Grant only after a verified `invoice.paid`.
- Creator grants 50; Shop grants 150 while `lib/pricing.ts` remains unchanged.
- Unique source key is the Stripe invoice ID.
- Duplicate webhooks do not grant twice.
- Included credits do not roll into the next paid billing period in v1.
- Before applying a new period grant, expired reservations are released/reconciled and the unused prior-period balance is recorded as an `expire` ledger entry.

### Cancellation and payment state

- `cancel_at_period_end`: plan remains active through the paid period; no future grant after cancellation completes.
- `past_due`: no new allowance until a successful invoice; existing period credits remain usable during the configured Stripe grace period.
- `unpaid` or final cancellation: paid-only access is disabled after the paid period/grace rule, then the account returns to Free without a duplicate Free-period grant.
- Refund/chargeback: freeze automatic new spending and route to reconciliation until a written clawback rule is approved.

The last point is intentionally conservative; automatic negative balances are not part of v1.

## 9. Row-level security and service boundaries

### User-readable

A user may read:

- Their profile.
- Accounts where they have membership.
- Their account's plan projection, wallet, reservations, ledger, subscriptions, pack runs, and generation jobs.

Viewer access to sensitive billing/ledger data may later be reduced; owner-only is acceptable for v1.

### User-writable

Users may update only safe profile fields and explicitly allowed account metadata.

Users must not directly insert/update/delete:

- Wallets.
- Ledger entries.
- Reservations.
- Subscription records.
- Stripe events.
- Generation settlement state.
- Account plan fields.

Those writes use server routes/functions with service credentials and explicit authorization.

### Service-role rules

- Service keys never enter client bundles.
- Stripe webhook endpoints use service access only after signature verification.
- Generation workers use narrowly scoped server functions.
- Admin adjustments require operator identity, reason, and unique idempotency key.

## 10. Session and API projection

After T5, `/api/me` should project durable state:

```ts
type DurableMe = {
  user: {
    id: string;
    email?: string;
    displayName?: string;
  } | null;
  account: {
    id: string;
    kind: "personal" | "shop";
    role: "owner" | "editor" | "viewer";
  } | null;
  plan: "free" | "creator" | "shop";
  credits: number;
  reservedCredits: number;
  clipsLeft: number;
  creditsPerVideo: number;
  watermark: boolean;
  mode: "live-generate" | "demo-cached";
};
```

Compatibility rules:

- Existing UI fields may remain during migration.
- Logged-out users may still receive an anonymous soft-launch projection.
- Logged-in values come from Postgres, not the signed credit Cookie.
- `clipsLeft` remains an estimate while flat 10-credit metering is active.

## 11. Migration plan

### Phase 0 — Schema and tests

- Create migrations in a non-production Supabase project.
- Add constraints, indexes, RLS, and transaction functions.
- Seed no production credits.
- Keep Cookie/JSON behavior active.

### Phase 1 — Auth without billing migration

- Add Email/Google login.
- Create personal accounts and Free wallets.
- Implement one-time guest balance migration.
- Read durable account state after login.
- Keep Stripe live disabled.

### Phase 2 — Durable generation credits

- Quote and reserve in Postgres.
- Bind every live job to reservation/account.
- Settle/release idempotently.
- Add expired/ambiguous job reconciliation.
- Stop mutating logged-in Cookie credits.

### Phase 3 — Stripe test migration

- Replace JSON entitlement writes with subscription records and ledger grants.
- Persist every Stripe event ID.
- Test checkout, renewal, duplicate delivery, past due, cancel, plan change, refund, and webhook reordering.
- Do not infer paid status from Checkout redirect alone.

### Phase 4 — Private paid beta

- Reconcile every customer and job manually for 72 hours.
- Verify cross-device balances and Seller Pack partial refunds.
- Complete media watermark/access and operations gates.
- Obtain explicit owner approval before live keys/prices are exposed.

### Legacy cleanup

Remove JSON entitlement authority only after:

- All intended test entitlements are migrated or deliberately discarded.
- No production deployment reads `data/entitlements.json`.
- Rollback is documented.
- Cookie session remains only for anonymous experience/transition, not paid truth.

## 12. Failure and recovery rules

| Failure | Required behavior |
|---|---|
| Database unavailable before reserve | No provider call and no charge |
| Provider call fails after reserve | Release the job's reservation amount idempotently |
| Provider succeeds but settlement DB write fails | Keep job in reconciliation state; retry settlement by idempotency key |
| Webhook delivered twice | One event row; one grant/state transition |
| Webhook arrives out of order | Compare Stripe object/version timestamps and converge to provider state |
| User refreshes during generation | Job and reservation remain recoverable from durable IDs |
| Reservation expires while provider is confirmed active | Do not auto-release; reconcile provider first |
| Account is restricted | Reject new reserves; allow owner to view/download permitted existing outputs |
| RLS policy failure | Deny; never fall back to client-provided account ID |

## 13. Required indexes and uniqueness

At minimum:

- Unique membership `(account_id, user_id)`.
- Unique Stripe customer and subscription IDs.
- Primary/unique Stripe event ID.
- Unique ledger idempotency key.
- Unique reservation idempotency key.
- Unique provider request ID when non-null.
- Index ledger by `(account_id, created_at desc)`.
- Index jobs by `(account_id, created_at desc)` and `(status, created_at)`.
- Index reservations by `(status, expires_at)`.
- Index subscriptions by `(status, current_period_end)`.
- Unique consumed guest session hash.

Foreign-key delete behavior must preserve billing audit. Closing an account should soft-close data rather than cascade-delete ledger/subscription records.

## 14. Observability and reconciliation

Track:

- Reserve acceptance/rejection count.
- Ledger mutation latency/failure.
- Wallet-vs-ledger reconciliation mismatch.
- Expired/ambiguous reservations.
- Provider success without settlement.
- Settlement/release duplicate attempts.
- Stripe event processing lag and failure.
- Free grants per durable user/account/device/IP risk signal.
- Seller Pack quoted vs settled credits.

Provide an operator query or internal view that traces:

```text
account → subscription/invoice → credit grant → reservation → generation/pack → settle/release
```

## 15. Acceptance checklist

### Auth and identity

- [ ] Email and Google login resolve to durable `auth.users.id`.
- [ ] First login creates one personal account and owner membership.
- [ ] Cross-browser login shows the same plan and balance.
- [ ] Clearing cookies while logged in does not grant another Free allowance.
- [ ] Guest balance migration is capped at 10 and succeeds only once per guest session.
- [ ] A Cookie can never migrate a paid plan.

### Database and RLS

- [ ] All tables have required foreign keys, checks, uniqueness, and indexes.
- [ ] Users can read only accounts where they are members.
- [ ] Clients cannot mutate plan, wallet, ledger, reservation, subscription, or Stripe event rows.
- [ ] Service credentials are absent from the client bundle.
- [ ] Ledger rows are append-only.

### Credits and concurrency

- [ ] A valid 10-credit quote reserves atomically.
- [ ] A 30-credit Seller Pack reservation settles/releases in 10-credit child increments.
- [ ] Six concurrent 10-credit requests against 50 accept exactly five.
- [ ] Duplicate reserve/settle/release keys return the original result without another mutation.
- [ ] Failed jobs restore only their reserved amount.
- [ ] Wallet values never become negative.
- [ ] Wallet projection reconciles to ledger entries.
- [ ] Expired reservations are released or explicitly held for provider reconciliation.

### Periods and billing

- [ ] Free receives at most one 10-credit grant per UTC month.
- [ ] Creator/Shop grants derive from `lib/pricing.ts`.
- [ ] One Stripe invoice creates one grant even under duplicate/reordered webhooks.
- [ ] Prior-period unused credits expire with an audit entry under the v1 no-rollover rule.
- [ ] Cancellation, past due, unpaid, and final downgrade match section 8.
- [ ] Stripe redirect alone cannot grant paid credits.

### Generation recovery

- [ ] Every live provider call is linked to an account, job, reservation, and quote.
- [ ] Refresh/relogin can recover active and completed job status.
- [ ] Provider success plus transient settlement failure eventually settles once.
- [ ] Provider failure eventually releases once.
- [ ] Ambiguous network/provider states never both refund and settle.

### Launch gate

- [ ] All Stripe gates in `docs/business/CREDITS_AND_PLANS.md` pass.
- [ ] Seller Pack production gates in `docs/prd/SELLER_PACK.md` pass.
- [ ] Migration and rollback are rehearsed against a database backup.
- [ ] A 72-hour private beta has no unreconciled wallet/ledger mismatch.
- [ ] Owner explicitly approves live Stripe after reviewing reconciliation evidence.

## 16. Open engineering decisions

Claude should record answers in DISPATCH before implementation when they affect the contract:

1. Whether Supabase RPC functions or a server-side transaction layer owns reserve/settle/release.
2. Exact reservation TTL and ambiguous-provider reconciliation worker.
3. Whether `generation_jobs` and media metadata ship in the same migration or a follow-up.
4. How Stripe webhook ordering is compared safely.
5. Whether Shop memberships ship hidden/owner-only or are deferred while retaining the schema.
6. How prior-period expiry behaves if a job is legitimately active at renewal time.

None of these decisions may weaken idempotency, non-negative balances, auditability, or server-only mutation.
