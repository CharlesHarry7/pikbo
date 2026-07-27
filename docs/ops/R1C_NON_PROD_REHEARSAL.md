# R1c non-production reconciliation rehearsal

Status: source-only runbook  
Production apply: prohibited until owner approval  
Required predecessors:

1. `20260723120000_t5_auth_credits.sql`
2. `20260727213000_r1_atomic_generation_credits.sql`
3. `20260727233000_r1c_generation_reconciliation.sql`

This repository change does not apply any migration, invoke FAL, configure
Vercel or enable live generation.

## Disposable-project procedure

1. Create or select a disposable Supabase project that contains no production
   customer data.
2. Record the project ref in the private operator log. Do not paste service
   keys, passwords, user emails, provider URLs or source media into GitHub.
3. Apply the three migrations above in order.
4. Confirm that `anon` and `authenticated` cannot select either reconciliation
   table and cannot execute any `pikbo_*_generation_*_v1` mutation function.
5. Create one synthetic authenticated user, paid-plan account, opted-in
   `live_generation_allowed` entitlement and wallet. Use fake IDs/content only.
6. Call `pikbo_reserve_generation_v1` once. Do not call a real provider.
7. Record a synthetic `provider_succeeded` event with an inert private
   `output_ref`; confirm the owner cannot read it.
8. Run 20 concurrent
   `pikbo_claim_generation_reconciliation_v1` calls. Exactly one must return a
   lease and the row must become `capture_pending`.
9. Finish capture twice with the same lease token/action. Both calls must
   return `captured`; wallet/ledger must contain exactly one settle mutation.
10. Repeat with a new reservation and `confirmed_pre_output_failure`; finish
    release twice and confirm exactly one release ledger mutation.
11. Let a lease expire, reclaim it with a different worker and confirm the old
    token cannot finish.
12. Race capture and release finish calls against one case. Only the
    evidence-compatible terminal action may commit.

## Queries to verify

Use aggregate/count queries only in screenshots or shared logs:

```sql
select state, count(*)
from public.generation_reconciliations
group by state;

select kind, count(*)
from public.credit_ledger
where source_type in ('generation_capture', 'generation_release')
group by kind;

select
  count(*) filter (where state = 'captured') as captured,
  count(*) filter (where state = 'released') as released,
  count(*) filter (
    where state not in ('captured', 'released')
  ) as unresolved
from public.generation_reconciliations;
```

Never select or export `output_ref`, lease token hashes, raw ledger metadata,
service keys, user emails or uploaded assets.

## Pass gate

- One reservation and one immutable ledger mutation per terminal outcome.
- Duplicate event and duplicate finish calls are idempotent.
- Exactly one of 20 simultaneous workers receives an active lease.
- A worker crash is recoverable after lease expiry.
- `settlementCaptured=true` appears only after durable capture.
- `deliverable` remains false after capture until a separate T6 worker creates
  and verifies a server-owned, policy-compliant derivative.
- Raw provider `output_ref` is service-private and never appears in a public
  response, download URL or customer-visible settlement result.
- `refundConfirmed=true` appears only after durable release.
- Unknown/conflicting evidence remains withheld and unconfirmed.
- Wallet available/reserved/lifetime totals match the immutable ledger.

Even after this rehearsal passes, public live generation remains disabled until
the 72-hour private-beta and T6 delivery gates in `docs/prd/GO_NO_GO.md` pass.
