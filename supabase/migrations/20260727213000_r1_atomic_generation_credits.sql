-- PIKBO R1a — atomic live-generation reservation / capture / release.
-- Source-only migration. Apply only after review in a non-production project.
--
-- All provider-spend authority is created inside these SECURITY DEFINER
-- functions. Client roles cannot execute them; only the server service_role can.

alter table public.accounts
  add column if not exists live_generation_allowed boolean not null default false;

alter table public.generation_jobs
  add column if not exists idempotency_key text;

-- Deployment preflight. Do not guess which historical row is authoritative:
-- abort the migration before adding constraints when durable identity or
-- generation idempotency is already ambiguous. Operators must reconcile the
-- duplicate rows in a reviewed, non-production rehearsal first.
do $preflight$
begin
  if exists (
    select 1
      from public.accounts
     where kind = 'personal'
     group by owner_user_id
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23514',
      message = 'RECOVERY_LEDGER_DUPLICATE_PERSONAL_ACCOUNTS',
      detail =
        'Multiple personal accounts exist for one owner_user_id. Reconcile them before applying R1a; the migration intentionally fails closed.';
  end if;

  if exists (
    select 1
      from public.generation_jobs
     where idempotency_key is not null
     group by created_by, idempotency_key
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23514',
      message = 'RECOVERY_LEDGER_DUPLICATE_GENERATION_KEYS',
      detail =
        'Multiple jobs share one user/idempotency key. Reconcile them before applying R1a; the migration intentionally fails closed.';
  end if;
end
$preflight$;

create unique index accounts_one_personal_owner_uidx
  on public.accounts (owner_user_id)
  where kind = 'personal';

create unique index generation_jobs_user_idempotency_uidx
  on public.generation_jobs (created_by, idempotency_key)
  where idempotency_key is not null;

comment on column public.accounts.live_generation_allowed is
  'Server-controlled beta entitlement. A paid plan alone never authorizes provider spend.';

comment on column public.generation_jobs.idempotency_key is
  'One logical live-generation attempt per authenticated user.';

create or replace function public.pikbo_reserve_generation_v1(
  p_user_id uuid,
  p_idempotency_key text,
  p_effect_slug text,
  p_quoted_credits integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account public.accounts%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_existing_job public.generation_jobs%rowtype;
  v_existing_reservation public.credit_reservations%rowtype;
  v_reservation public.credit_reservations%rowtype;
  v_job public.generation_jobs%rowtype;
  v_reservation_key text;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  end if;
  if p_idempotency_key is null
     or length(btrim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 128 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_IDEMPOTENCY_KEY');
  end if;
  if p_effect_slug is null or length(btrim(p_effect_slug)) = 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_EFFECT');
  end if;
  if p_quoted_credits is null or p_quoted_credits <= 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_AMOUNT');
  end if;

  -- Serializes all wallet changes for this account. The account lock prevents
  -- entitlement/plan changes from racing this reservation.
  select a, w
    into v_account, v_wallet
    from public.accounts a
    join public.credit_wallets w on w.account_id = a.id
   where a.owner_user_id = p_user_id
     and a.kind = 'personal'
   for update of a, w;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'DURABLE_WALLET_NOT_FOUND');
  end if;
  if v_account.status <> 'active'
     or not v_account.live_generation_allowed then
    return jsonb_build_object('ok', false, 'code', 'LIVE_ACCESS_REQUIRED');
  end if;

  -- The wallet lock above makes this lookup + insert safe for concurrent calls.
  select *
    into v_existing_job
    from public.generation_jobs
   where created_by = p_user_id
     and idempotency_key = p_idempotency_key;

  if found then
    select *
      into v_existing_reservation
      from public.credit_reservations
     where id = v_existing_job.reservation_id;

    if not found then
      return jsonb_build_object('ok', false, 'code', 'JOB_BINDING_MISMATCH');
    end if;
    if v_existing_job.effect_slug <> p_effect_slug
       or v_existing_job.quoted_credits <> p_quoted_credits then
      return jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
    end if;
    if v_existing_reservation.status <> 'reserved' then
      return jsonb_build_object(
        'ok', false,
        'code', 'RESERVATION_NOT_ACTIVE',
        'reservationStatus', v_existing_reservation.status::text,
        'jobId', v_existing_job.id
      );
    end if;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'providerAuthorized', false,
      'reservationId', v_existing_reservation.id,
      'jobId', v_existing_job.id,
      'userId', p_user_id,
      'accountId', v_account.id,
      'amount', v_existing_reservation.quoted_credits,
      'status', 'reserved',
      'idempotencyKey', p_idempotency_key,
      'expiresAt', v_existing_reservation.expires_at,
      'planId', v_account.plan_id::text,
      'availableCredits', v_wallet.available_credits,
      'reservedCredits', v_wallet.reserved_credits
    );
  end if;

  if v_wallet.available_credits < p_quoted_credits then
    return jsonb_build_object(
      'ok', false,
      'code', 'INSUFFICIENT_CREDITS',
      'need', p_quoted_credits,
      'have', v_wallet.available_credits
    );
  end if;

  update public.credit_wallets
     set available_credits = available_credits - p_quoted_credits,
         reserved_credits = reserved_credits + p_quoted_credits,
         version = version + 1,
         updated_at = now()
   where account_id = v_account.id
   returning * into v_wallet;

  v_reservation_key :=
    'live:' || p_user_id::text || ':' || btrim(p_idempotency_key);

  insert into public.credit_reservations (
    account_id,
    purpose,
    quoted_credits,
    settled_credits,
    released_credits,
    status,
    idempotency_key,
    expires_at,
    created_by
  ) values (
    v_account.id,
    'generation',
    p_quoted_credits,
    0,
    0,
    'reserved',
    v_reservation_key,
    now() + interval '30 minutes',
    p_user_id
  )
  returning * into v_reservation;

  insert into public.generation_jobs (
    account_id,
    created_by,
    effect_slug,
    status,
    quoted_credits,
    settled_credits,
    reservation_id,
    demo,
    idempotency_key,
    started_at
  ) values (
    v_account.id,
    p_user_id,
    p_effect_slug,
    'running',
    p_quoted_credits,
    0,
    v_reservation.id,
    false,
    btrim(p_idempotency_key),
    now()
  )
  returning * into v_job;

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
  ) values (
    v_account.id,
    'reserve',
    -p_quoted_credits,
    p_quoted_credits,
    v_wallet.available_credits,
    v_wallet.reserved_credits,
    v_reservation.id,
    'generation_job',
    v_job.id::text,
    'ledger:reserve:' || v_reservation_key,
    jsonb_build_object('effectSlug', p_effect_slug, 'userId', p_user_id)
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'providerAuthorized', true,
    'reservationId', v_reservation.id,
    'jobId', v_job.id,
    'userId', p_user_id,
    'accountId', v_account.id,
    'amount', p_quoted_credits,
    'status', 'reserved',
    'idempotencyKey', p_idempotency_key,
    'expiresAt', v_reservation.expires_at,
    'planId', v_account.plan_id::text,
    'availableCredits', v_wallet.available_credits,
    'reservedCredits', v_wallet.reserved_credits
  );
end;
$$;

create or replace function public.pikbo_capture_generation_v1(
  p_user_id uuid,
  p_reservation_id uuid,
  p_job_id uuid,
  p_provider_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation public.credit_reservations%rowtype;
  v_job public.generation_jobs%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_amount integer;
begin
  select *
    into v_reservation
    from public.credit_reservations
   where id = p_reservation_id
   for update;
  if not found or v_reservation.created_by <> p_user_id then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_FOUND');
  end if;

  select *
    into v_job
    from public.generation_jobs
   where id = p_job_id
     and reservation_id = p_reservation_id
     and created_by = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'JOB_BINDING_MISMATCH');
  end if;

  select *
    into v_wallet
    from public.credit_wallets
   where account_id = v_reservation.account_id
   for update;

  if v_reservation.status = 'settled' then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'status', 'captured',
      'reservationId', v_reservation.id,
      'jobId', v_job.id,
      'availableCredits', v_wallet.available_credits,
      'reservedCredits', v_wallet.reserved_credits
    );
  end if;
  if v_reservation.status <> 'reserved' then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_ACTIVE');
  end if;

  v_amount :=
    v_reservation.quoted_credits
    - v_reservation.settled_credits
    - v_reservation.released_credits;
  if v_amount <= 0 or v_wallet.reserved_credits < v_amount then
    return jsonb_build_object('ok', false, 'code', 'RESERVED_BALANCE_INVALID');
  end if;

  update public.credit_wallets
     set reserved_credits = reserved_credits - v_amount,
         lifetime_used_credits = lifetime_used_credits + v_amount,
         version = version + 1,
         updated_at = now()
   where account_id = v_wallet.account_id
   returning * into v_wallet;

  update public.credit_reservations
     set settled_credits = settled_credits + v_amount,
         status = 'settled',
         updated_at = now()
   where id = v_reservation.id
   returning * into v_reservation;

  update public.generation_jobs
     set status = 'succeeded',
         settled_credits = settled_credits + v_amount,
         provider_request_id = coalesce(
           p_provider_request_id,
           provider_request_id
         ),
         completed_at = now()
   where id = v_job.id
   returning * into v_job;

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
  ) values (
    v_wallet.account_id,
    'settle',
    0,
    -v_amount,
    v_wallet.available_credits,
    v_wallet.reserved_credits,
    v_reservation.id,
    'generation_capture',
    v_job.id::text,
    'ledger:capture:' || v_reservation.id::text,
    jsonb_build_object('providerRequestId', p_provider_request_id)
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'status', 'captured',
    'reservationId', v_reservation.id,
    'jobId', v_job.id,
    'availableCredits', v_wallet.available_credits,
    'reservedCredits', v_wallet.reserved_credits
  );
end;
$$;

create or replace function public.pikbo_release_generation_v1(
  p_user_id uuid,
  p_reservation_id uuid,
  p_job_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation public.credit_reservations%rowtype;
  v_job public.generation_jobs%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_amount integer;
begin
  select *
    into v_reservation
    from public.credit_reservations
   where id = p_reservation_id
   for update;
  if not found or v_reservation.created_by <> p_user_id then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_FOUND');
  end if;

  select *
    into v_job
    from public.generation_jobs
   where id = p_job_id
     and reservation_id = p_reservation_id
     and created_by = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'JOB_BINDING_MISMATCH');
  end if;

  select *
    into v_wallet
    from public.credit_wallets
   where account_id = v_reservation.account_id
   for update;

  if v_reservation.status = 'released' then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'status', 'released',
      'reservationId', v_reservation.id,
      'jobId', v_job.id,
      'availableCredits', v_wallet.available_credits,
      'reservedCredits', v_wallet.reserved_credits
    );
  end if;
  if v_reservation.status <> 'reserved' then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_ACTIVE');
  end if;

  v_amount :=
    v_reservation.quoted_credits
    - v_reservation.settled_credits
    - v_reservation.released_credits;
  if v_amount <= 0 or v_wallet.reserved_credits < v_amount then
    return jsonb_build_object('ok', false, 'code', 'RESERVED_BALANCE_INVALID');
  end if;

  update public.credit_wallets
     set available_credits = available_credits + v_amount,
         reserved_credits = reserved_credits - v_amount,
         version = version + 1,
         updated_at = now()
   where account_id = v_wallet.account_id
   returning * into v_wallet;

  update public.credit_reservations
     set released_credits = released_credits + v_amount,
         status = 'released',
         updated_at = now()
   where id = v_reservation.id
   returning * into v_reservation;

  update public.generation_jobs
     set status = 'failed',
         error_code = left(coalesce(p_reason, 'released'), 120),
         completed_at = now()
   where id = v_job.id
   returning * into v_job;

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
  ) values (
    v_wallet.account_id,
    'release',
    v_amount,
    -v_amount,
    v_wallet.available_credits,
    v_wallet.reserved_credits,
    v_reservation.id,
    'generation_release',
    v_job.id::text,
    'ledger:release:' || v_reservation.id::text,
    jsonb_build_object('reason', left(coalesce(p_reason, 'released'), 120))
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'status', 'released',
    'reservationId', v_reservation.id,
    'jobId', v_job.id,
    'availableCredits', v_wallet.available_credits,
    'reservedCredits', v_wallet.reserved_credits
  );
end;
$$;

revoke all on function public.pikbo_reserve_generation_v1(
  uuid, text, text, integer
) from public, anon, authenticated;
revoke all on function public.pikbo_capture_generation_v1(
  uuid, uuid, uuid, text
) from public, anon, authenticated;
revoke all on function public.pikbo_release_generation_v1(
  uuid, uuid, uuid, text
) from public, anon, authenticated;

grant execute on function public.pikbo_reserve_generation_v1(
  uuid, text, text, integer
) to service_role;
grant execute on function public.pikbo_capture_generation_v1(
  uuid, uuid, uuid, text
) to service_role;
grant execute on function public.pikbo_release_generation_v1(
  uuid, uuid, uuid, text
) to service_role;
