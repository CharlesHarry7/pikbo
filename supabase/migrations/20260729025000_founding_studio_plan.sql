-- PIKBO single paid-plan boundary.
-- Apply in non-production before the Stripe billing migration.
--
-- Legacy creator/shop enum labels remain readable for historical rows, but
-- application code and the billing RPC reject them. No legacy account is
-- automatically upgraded to a paid Founding Studio entitlement.

alter type public.plan_id add value if not exists 'founding_studio';

-- One account may not collect multiple concurrent subscription invoices.
-- A canceled subscription remains as history and does not block a later one.
create unique index if not exists
  subscription_records_one_open_stripe_subscription_idx
  on public.subscription_records (account_id)
  where provider = 'stripe'
    and status in (
      'trialing',
      'active',
      'past_due',
      'unpaid',
      'incomplete',
      'paused'
    );

comment on index
  public.subscription_records_one_open_stripe_subscription_idx is
  'Prevents duplicate concurrent Stripe subscriptions and duplicate monthly credit grants for one account.';
