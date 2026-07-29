# Non-production database rehearsal — 2026-07-29

## Scope

- Dedicated Supabase project: `pikbo-private-preview-56`
- Project reference: `lpfvfybkggiugosugfcw`
- Environment purpose: private validation only
- Production project touched: **no**
- Production generation or payments enabled: **no**

The SQL Editor was used because this preview project is isolated from production.
The files below were applied manually, so this is runtime-compilation evidence, not
a claim that Supabase migration history was updated:

1. `20260723121000_pgcrypto_extensions.sql`
2. `20260727233000_r1c_generation_reconciliation.sql`
3. `20260728233000_p0_private_generation_results.sql`
4. `20260729020000_atomic_seller_pack.sql`
5. `20260729020500_seller_pack_attempt_fencing.sql`
6. `20260729021000_private_settlement_guard.sql`
7. `20260729021500_pack_parallel_path_guard.sql`
8. `20260729022000_provider_validation_budget.sql`
9. `20260729023000_deprecate_seedance2_budget.sql`
10. `20260729024000_stripe_subscription_statuses.sql`
11. `20260729024500_seller_pack_reconciliation.sql`
12. `20260729025000_founding_studio_plan.sql`
13. `20260729030000_stripe_billing_idempotency.sql`

The historical model-specific Seedance ceiling remains present for audit
history, but its forward deprecation migration was applied: it has zero
headroom, its old RPC fails closed, and all runtime authorization uses the
project-wide validation budget from
`20260729022000_provider_validation_budget.sql`.

## Rehearsal result

The first rehearsal failed safely and exposed an actual runtime defect:
`pgcrypto.digest()` is installed in Supabase's `extensions` schema, while two
security-definer functions used an unqualified `digest()`. The open transaction
was rolled back, both reconciliation migrations were corrected and reapplied,
and the same rehearsal was run again.

After the digest fix, the Pack RPCs were upgraded again to bind every private
attachment, capture, release, expiry, and retry to the exact provider attempt.
The affected migrations were reapplied and the expanded final rehearsal
returned:

```text
PASS: pack attempt isolation + crash discovery + 20/10 accounting + global provider cap + Stripe once-only grant
```

The passing transaction exercised:

- a 30-credit Pack reservation and idempotent replay;
- private result attachment followed by crash-window discovery and settlement;
- failure release for attempt A, retry attempt B, and attempt-scoped capture;
- rejection of retrying a terminal child with the same attempt-A key;
- rejection of a late attempt-A private attachment after attempt B was current;
- denial of both whole-reservation release and generic R1c intake for Pack jobs;
- duplicate outcome-event idempotency;
- expiry of the unstarted third child;
- final Pack accounting of 20 credits settled and 10 released;
- one shared provider-budget reservation and idempotent commit;
- rejection of a reservation that would exceed the immutable US$20 cap;
- one 90-credit Founding Studio invoice grant and duplicate-invoice replay;
- denial of settlement RPC execution to `anon` and `authenticated`.

The SQL wrapped all fixture mutations in `BEGIN … ROLLBACK`; no rehearsal
accounts, jobs, ledger entries, provider reservations, or billing fixtures were
left behind.

## Evidence boundary

This proves that the migrations compile in the target Postgres runtime and that
the accounting/idempotency invariants hold in one rollback rehearsal. It does
**not** prove:

- real Storage bytes or a signed download URL;
- a real Seedance provider call;
- a Stripe network Checkout or webhook delivery;
- the 3-SKU / 10-call quality thresholds;
- the 10-seller beta thresholds;
- production readiness or a paid order.

Those gates therefore remain closed.
