-- PIKBO Stripe billing authority.
-- SOURCE ONLY. Rehearse after T5 in a disposable/non-production Supabase
-- project before setting STRIPE_BILLING_RPC_READY=1.
--
-- One service-role RPC transaction performs:
--   event claim -> subscription ordering -> invoice credit grant -> processed.
-- Browser roles cannot claim events, mutate subscriptions, or grant credits.

alter table public.subscription_records
  add column if not exists stripe_checkout_session_id text,
  add column if not exists last_paid_invoice_id text,
  add column if not exists last_paid_invoice_created bigint not null default 0,
  add column if not exists last_stripe_event_created bigint not null default 0,
  add column if not exists last_stripe_event_rank integer not null default 0,
  add column if not exists last_stripe_event_id text;

create unique index if not exists subscription_records_checkout_session_uidx
  on public.subscription_records (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

alter table public.stripe_events
  add column if not exists event_created bigint,
  add column if not exists livemode boolean,
  add column if not exists processing_started_at timestamptz,
  add column if not exists account_id uuid references public.accounts (id),
  add column if not exists subscription_id text,
  add column if not exists result jsonb;

comment on column public.subscription_records.last_stripe_event_created is
  'Stripe event.created used with rank + event id for deterministic ordering.';
comment on column public.subscription_records.last_stripe_event_rank is
  'Tie rank: checkout 10, invoice 20, subscription.updated 30, deleted 40.';
comment on column public.stripe_events.result is
  'Idempotent result returned when Stripe redelivers the exact same event.';

create or replace function public.pikbo_apply_stripe_billing_event_v1(
  p_event_id text,
  p_event_type text,
  p_payload_sha256 text,
  p_event_created bigint,
  p_livemode boolean,
  p_user_id uuid default null,
  p_account_id uuid default null,
  p_checkout_session_id text default null,
  p_customer_id text default null,
  p_subscription_id text default null,
  p_invoice_id text default null,
  p_price_id text default null,
  p_plan_id text default null,
  p_subscription_status text default null,
  p_amount_paid integer default null,
  p_currency text default null,
  p_period_start bigint default null,
  p_period_end bigint default null,
  p_cancel_at_period_end boolean default null,
  p_grant_credits integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.stripe_events%rowtype;
  v_subscription public.subscription_records%rowtype;
  v_account public.accounts%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_plan public.plan_id;
  v_effective_plan public.plan_id;
  v_status public.subscription_status;
  v_event_rank integer;
  v_is_newer boolean := false;
  v_granted integer := 0;
  v_ledger_key text;
  v_existing_grant uuid;
  v_result jsonb;
begin
  if p_event_id is null
     or length(btrim(p_event_id)) < 4
     or length(p_event_id) > 255 then
    raise exception 'STRIPE_EVENT_ID_INVALID';
  end if;
  if p_event_type not in (
    'checkout.session.completed',
    'invoice.paid',
    'customer.subscription.updated',
    'customer.subscription.deleted'
  ) then
    raise exception 'STRIPE_EVENT_TYPE_UNSUPPORTED';
  end if;
  if p_payload_sha256 is null
     or p_payload_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'STRIPE_EVENT_HASH_INVALID';
  end if;
  if p_event_created is null or p_event_created <= 0 then
    raise exception 'STRIPE_EVENT_CREATED_INVALID';
  end if;

  v_event_rank := case p_event_type
    when 'checkout.session.completed' then 10
    when 'invoice.paid' then 20
    when 'customer.subscription.updated' then 30
    when 'customer.subscription.deleted' then 40
    else 0
  end;

  if p_plan_id is not null then
    if p_plan_id <> 'founding_studio' then
      raise exception 'STRIPE_PLAN_INVALID';
    end if;
    v_plan := p_plan_id::public.plan_id;
  end if;

  if p_subscription_status is not null then
    if p_subscription_status not in (
      'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete',
      'paused'
    ) then
      raise exception 'STRIPE_SUBSCRIPTION_STATUS_INVALID';
    end if;
    v_status := p_subscription_status::public.subscription_status;
  end if;

  -- The insert and all downstream mutations commit as one transaction. A
  -- concurrent redelivery blocks on this PK, then observes status=processed.
  insert into public.stripe_events (
    event_id,
    event_type,
    payload_sha256,
    status,
    attempt_count,
    event_created,
    livemode,
    processing_started_at,
    account_id,
    subscription_id
  )
  values (
    btrim(p_event_id),
    p_event_type,
    p_payload_sha256,
    'processing',
    1,
    p_event_created,
    coalesce(p_livemode, false),
    now(),
    p_account_id,
    p_subscription_id
  )
  on conflict (event_id) do nothing;

  select *
    into v_event
    from public.stripe_events
   where event_id = btrim(p_event_id)
   for update;

  if v_event.payload_sha256 <> p_payload_sha256
     or v_event.event_type <> p_event_type then
    raise exception 'STRIPE_EVENT_PAYLOAD_CONFLICT';
  end if;

  if v_event.status = 'processed' then
    return coalesce(v_event.result, '{}'::jsonb)
      || jsonb_build_object('ok', true, 'idempotent', true);
  end if;

  update public.stripe_events
     set status = 'processing',
         attempt_count = case
           when v_event.processing_started_at is null then attempt_count + 1
           else attempt_count
         end,
         processing_started_at = now(),
         last_error = null,
         event_created = p_event_created,
         livemode = coalesce(p_livemode, false),
         account_id = coalesce(p_account_id, account_id),
         subscription_id = coalesce(p_subscription_id, subscription_id)
   where event_id = p_event_id;

  if p_subscription_id is not null then
    select *
      into v_subscription
      from public.subscription_records
     where stripe_subscription_id = p_subscription_id
     for update;
  end if;

  if v_subscription.id is null and p_customer_id is not null then
    select *
      into v_subscription
      from public.subscription_records
     where stripe_customer_id = p_customer_id
     for update;
  end if;

  if v_subscription.id is null and p_checkout_session_id is not null then
    select *
      into v_subscription
      from public.subscription_records
     where stripe_checkout_session_id = p_checkout_session_id
     for update;
  end if;

  -- Strict event-shape gates. A Checkout complete status without a paid,
  -- non-zero subscription never creates an entitlement.
  if p_event_type = 'checkout.session.completed' then
    if p_user_id is null
       or p_account_id is null
       or p_checkout_session_id is null
       or p_customer_id is null
       or p_subscription_id is null
       or p_price_id is null
       or v_plan is null
       or p_amount_paid is null
       or p_amount_paid <= 0 then
      raise exception 'PAID_CHECKOUT_BINDING_REQUIRED';
    end if;
    v_status := 'active';
  elsif p_event_type = 'invoice.paid' then
    if p_invoice_id is null
       or p_customer_id is null
       or p_subscription_id is null
       or p_price_id is null
       or v_plan is null
       or p_amount_paid is null
       or p_amount_paid <= 0
       or p_grant_credits is null
       or p_grant_credits < 0 then
      raise exception 'PAID_INVOICE_BINDING_REQUIRED';
    end if;
    -- invoice.paid proves funding, not current subscription lifecycle. It may
    -- seed a missing row, but an existing row preserves status/order below so
    -- an old or final invoice cannot resurrect a cancellation.
    v_status := 'active';
  elsif p_event_type = 'customer.subscription.updated' then
    if p_subscription_id is null or v_status is null then
      raise exception 'SUBSCRIPTION_UPDATE_BINDING_REQUIRED';
    end if;
    if v_status in ('active', 'trialing')
       and (p_price_id is null or v_plan is null) then
      raise exception 'ACTIVE_SUBSCRIPTION_PRICE_REQUIRED';
    end if;
  else
    if p_subscription_id is null then
      raise exception 'SUBSCRIPTION_DELETE_BINDING_REQUIRED';
    end if;
    v_status := 'canceled';
  end if;

  if v_subscription.id is not null then
    if p_account_id is not null
       and v_subscription.account_id <> p_account_id then
      raise exception 'STRIPE_ACCOUNT_BINDING_MISMATCH';
    end if;
    if p_customer_id is not null
       and v_subscription.stripe_customer_id is not null
       and v_subscription.stripe_customer_id <> p_customer_id then
      raise exception 'STRIPE_CUSTOMER_BINDING_MISMATCH';
    end if;
    if p_subscription_id is not null
       and v_subscription.stripe_subscription_id is not null
       and v_subscription.stripe_subscription_id <> p_subscription_id then
      raise exception 'STRIPE_SUBSCRIPTION_BINDING_MISMATCH';
    end if;
    if p_checkout_session_id is not null
       and v_subscription.stripe_checkout_session_id is not null
       and v_subscription.stripe_checkout_session_id <> p_checkout_session_id then
      raise exception 'STRIPE_CHECKOUT_BINDING_MISMATCH';
    end if;
    if p_price_id is not null
       and v_subscription.stripe_price_id is not null
       and v_subscription.stripe_price_id <> p_price_id then
      raise exception 'STRIPE_PRICE_BINDING_MISMATCH';
    end if;
    p_account_id := v_subscription.account_id;
  end if;

  if p_account_id is null then
    raise exception 'STRIPE_ACCOUNT_BINDING_REQUIRED';
  end if;

  select *
    into v_account
    from public.accounts
   where id = p_account_id
   for update;
  if not found then
    raise exception 'STRIPE_ACCOUNT_NOT_FOUND';
  end if;
  if v_account.status <> 'active' then
    raise exception 'STRIPE_ACCOUNT_NOT_ACTIVE';
  end if;

  if p_user_id is not null and not exists (
    select 1
      from public.account_memberships membership
     where membership.account_id = p_account_id
       and membership.user_id = p_user_id
       and membership.role = 'owner'
  ) then
    raise exception 'STRIPE_USER_ACCOUNT_BINDING_MISMATCH';
  end if;

  if v_subscription.id is null then
    if p_user_id is null
       or p_customer_id is null
       or p_subscription_id is null
       or p_price_id is null
       or v_plan is null then
      raise exception 'STRIPE_NEW_SUBSCRIPTION_BINDING_REQUIRED';
    end if;
    insert into public.subscription_records (
      account_id,
      provider,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_checkout_session_id,
      stripe_price_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      last_stripe_event_created,
      last_stripe_event_rank,
      last_stripe_event_id,
      created_at,
      updated_at
    )
    values (
      p_account_id,
      'stripe',
      p_customer_id,
      p_subscription_id,
      p_checkout_session_id,
      p_price_id,
      v_plan,
      v_status,
      case when p_period_start is null then null
        else to_timestamp(p_period_start) end,
      case when p_period_end is null then null
        else to_timestamp(p_period_end) end,
      coalesce(p_cancel_at_period_end, false),
      p_event_created,
      v_event_rank,
      p_event_id,
      now(),
      now()
    )
    returning * into v_subscription;
    v_is_newer := true;
  else
    if p_event_type = 'invoice.paid' then
      -- Existing invoice events update only immutable funding facts below.
      -- They never advance lifecycle order, period, status, or cancellation.
      v_is_newer := false;
    else
      v_is_newer :=
        p_event_created > v_subscription.last_stripe_event_created
        or (
          p_event_created = v_subscription.last_stripe_event_created
          and v_event_rank > v_subscription.last_stripe_event_rank
        )
        or (
          p_event_created = v_subscription.last_stripe_event_created
          and v_event_rank = v_subscription.last_stripe_event_rank
          and p_event_id > coalesce(v_subscription.last_stripe_event_id, '')
        );
    end if;

    if v_is_newer then
      update public.subscription_records
         set stripe_customer_id =
               coalesce(p_customer_id, stripe_customer_id),
             stripe_subscription_id =
               coalesce(p_subscription_id, stripe_subscription_id),
             stripe_checkout_session_id =
               coalesce(p_checkout_session_id, stripe_checkout_session_id),
             stripe_price_id =
               case when p_price_id is null then stripe_price_id
                    else p_price_id end,
             plan_id =
               case when v_plan is null then plan_id
                    else v_plan end,
             status = v_status,
             current_period_start =
               case when p_period_start is null then current_period_start
                    else to_timestamp(p_period_start) end,
             current_period_end =
               case when p_period_end is null then current_period_end
                    else to_timestamp(p_period_end) end,
             cancel_at_period_end =
               coalesce(p_cancel_at_period_end, cancel_at_period_end),
             last_stripe_event_created = p_event_created,
             last_stripe_event_rank = v_event_rank,
             last_stripe_event_id = p_event_id,
             updated_at = now()
       where id = v_subscription.id
       returning * into v_subscription;
    end if;
  end if;

  -- Checkout identity is orthogonal to lifecycle ordering. Stripe may deliver
  -- invoice.paid before checkout.session.completed; a later-arriving older
  -- checkout event must still fill the immutable session binding used by the
  -- browser confirm route.
  if p_checkout_session_id is not null
     and v_subscription.stripe_checkout_session_id is null then
    update public.subscription_records
       set stripe_checkout_session_id = p_checkout_session_id,
           updated_at = now()
     where id = v_subscription.id
     returning * into v_subscription;
  end if;

  -- One paid invoice -> one immutable grant, even if Stripe emits a second
  -- event id for that invoice. The unique ledger key is the second barrier.
  if p_event_type = 'invoice.paid' and p_grant_credits > 0 then
    v_ledger_key := 'stripe:invoice:' || p_invoice_id || ':grant';

    select id
      into v_existing_grant
      from public.credit_ledger
     where idempotency_key = v_ledger_key;

    if not found then
      select *
        into v_wallet
        from public.credit_wallets
       where account_id = p_account_id
       for update;
      if not found then
        raise exception 'STRIPE_WALLET_NOT_FOUND';
      end if;

      update public.credit_wallets
         set available_credits = available_credits + p_grant_credits,
             version = version + 1,
             updated_at = now()
       where account_id = p_account_id
       returning * into v_wallet;

      insert into public.credit_ledger (
        account_id,
        kind,
        delta_available,
        delta_reserved,
        available_after,
        reserved_after,
        reservation_id,
        source_type,
        source_id,
        idempotency_key,
        metadata
      )
      values (
        p_account_id,
        'grant',
        p_grant_credits,
        0,
        v_wallet.available_credits,
        v_wallet.reserved_credits,
        null,
        'stripe_invoice',
        p_invoice_id,
        v_ledger_key,
        jsonb_build_object(
          'eventId', p_event_id,
          'subscriptionId', p_subscription_id,
          'priceId', p_price_id,
          'plan', p_plan_id,
          'amountPaid', p_amount_paid,
          'currency', lower(coalesce(p_currency, ''))
        )
      );
      v_granted := p_grant_credits;
    end if;

  end if;

  -- Only a monthly-allotment invoice is proof that the paid entitlement was
  -- funded. A zero-grant proration invoice must not look fully provisioned.
  if p_event_type = 'invoice.paid' and p_grant_credits > 0 then
    update public.subscription_records
       set last_paid_invoice_id = p_invoice_id,
           last_paid_invoice_created = p_event_created,
           updated_at = now()
     where id = v_subscription.id
       and (
         p_event_created > last_paid_invoice_created
         or (
           p_event_created = last_paid_invoice_created
           and p_invoice_id > coalesce(last_paid_invoice_id, '')
         )
       );
  end if;

  -- Re-read orthogonal invoice/checkout facts, then reconcile entitlement from
  -- the current subscription state. This intentionally runs even when the
  -- incoming event is lifecycle-stale: an older paid invoice can fund a newer
  -- active checkout, while a newer cancellation still keeps the account Free.
  select *
    into v_subscription
    from public.subscription_records
   where id = v_subscription.id
   for update;

  select active_subscription.plan_id
    into v_effective_plan
    from public.subscription_records active_subscription
   where active_subscription.account_id = p_account_id
     and active_subscription.provider = 'stripe'
     and active_subscription.status = 'active'
     and active_subscription.last_paid_invoice_id is not null
   order by active_subscription.last_stripe_event_created desc,
            active_subscription.updated_at desc,
            active_subscription.id desc
   limit 1;

  update public.accounts
     set plan_id = coalesce(
           v_effective_plan,
           'free'::public.plan_id
         ),
         updated_at = now()
   where id = p_account_id;

  v_result := jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'stale', not v_is_newer,
    'grantedCredits', v_granted,
    'accountId', p_account_id,
    'subscriptionId', v_subscription.stripe_subscription_id,
    'status', v_subscription.status::text
  );

  update public.stripe_events
     set status = 'processed',
         processed_at = now(),
         account_id = p_account_id,
         subscription_id = v_subscription.stripe_subscription_id,
         result = v_result
   where event_id = p_event_id;

  return v_result;
end;
$$;

create or replace function public.pikbo_get_stripe_billing_snapshot_v1(
  p_account_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account public.accounts%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_subscription public.subscription_records%rowtype;
begin
  if p_account_id is null or p_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  end if;
  if not exists (
    select 1
      from public.account_memberships membership
     where membership.account_id = p_account_id
       and membership.user_id = p_user_id
       and membership.role = 'owner'
  ) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  select * into v_account
    from public.accounts
   where id = p_account_id;
  select * into v_wallet
    from public.credit_wallets
   where account_id = p_account_id;
  if v_account.id is null or v_wallet.account_id is null then
    return jsonb_build_object('ok', false, 'code', 'ACCOUNT_NOT_FOUND');
  end if;

  select *
    into v_subscription
    from public.subscription_records
   where account_id = p_account_id
   order by (
              provider = 'stripe'
              and status in (
                'trialing',
                'active',
                'past_due',
                'unpaid',
                'incomplete',
                'paused'
              )
            ) desc,
            last_stripe_event_created desc,
            updated_at desc
   limit 1;

  return jsonb_build_object(
    'ok', true,
    'accountId', p_account_id,
    'userId', p_user_id,
    'availableCredits', v_wallet.available_credits,
    'reservedCredits', v_wallet.reserved_credits,
    'plan', v_account.plan_id::text,
    'subscription', case
      when v_subscription.id is null then null
      else jsonb_build_object(
        'customerId', v_subscription.stripe_customer_id,
        'subscriptionId', v_subscription.stripe_subscription_id,
        'checkoutSessionId', v_subscription.stripe_checkout_session_id,
        'priceId', v_subscription.stripe_price_id,
        'plan', v_subscription.plan_id::text,
        'status', v_subscription.status::text,
        'currentPeriodStart', v_subscription.current_period_start,
        'currentPeriodEnd', v_subscription.current_period_end,
        'cancelAtPeriodEnd', v_subscription.cancel_at_period_end,
        'lastPaidInvoiceId', v_subscription.last_paid_invoice_id
      )
    end
  );
end;
$$;

revoke all on function public.pikbo_apply_stripe_billing_event_v1(
  text, text, text, bigint, boolean, uuid, uuid, text, text, text, text,
  text, text, text, integer, text, bigint, bigint, boolean, integer
) from public, anon, authenticated;
revoke all on function public.pikbo_get_stripe_billing_snapshot_v1(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.pikbo_apply_stripe_billing_event_v1(
  text, text, text, bigint, boolean, uuid, uuid, text, text, text, text,
  text, text, text, integer, text, bigint, bigint, boolean, integer
) to service_role;
grant execute on function public.pikbo_get_stripe_billing_snapshot_v1(uuid, uuid)
  to service_role;
