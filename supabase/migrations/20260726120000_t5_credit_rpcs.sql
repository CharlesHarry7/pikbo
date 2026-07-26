-- PIKBO T5 P0 — transactional durable-credit RPCs.
-- Idempotent: safe to re-run after 20260723120000_t5_auth_credits.sql.
-- This migration is source-only until an operator applies it to Supabase.

begin;

create table if not exists public.pikbo_schema_versions (
  component text primary key,
  version integer not null check (version > 0),
  applied_at timestamptz not null default now()
);

alter table public.pikbo_schema_versions enable row level security;
revoke all on table public.pikbo_schema_versions from anon, authenticated;

-- Do not silently merge pre-existing personal accounts: that would obscure an
-- accounting/audit incident. Operators must reconcile duplicates explicitly.
do $$
begin
  if exists (
    select 1
      from public.accounts
     where kind = 'personal'
     group by owner_user_id
    having count(*) > 1
  ) then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:DUPLICATE_PERSONAL_ACCOUNT';
  end if;
end;
$$;

-- A personal account is unique per durable user. This also makes concurrent
-- account bootstraps idempotent after the audited preflight above.
create unique index if not exists accounts_one_personal_per_owner_idx
  on public.accounts (owner_user_id)
  where kind = 'personal';

-- One server-priced item may reach exactly one terminal outcome.
create table if not exists public.credit_reservation_items (
  reservation_id uuid not null
    references public.credit_reservations (id) on delete cascade,
  item_key text not null check (char_length(item_key) between 1 and 80),
  credits integer not null check (credits = 10),
  status text not null default 'pending'
    check (status in ('pending', 'settled', 'released')),
  job_id text,
  terminal_idempotency_key text unique,
  updated_at timestamptz not null default now(),
  primary key (reservation_id, item_key)
);

-- Expiry worker/health sweep only considers these still-open reservations.
create index if not exists credit_reservations_expiry_pending_idx
  on public.credit_reservations (expires_at)
  where status in ('reserved', 'partially_settled');

alter table public.credit_reservation_items enable row level security;

drop policy if exists reservation_items_member
  on public.credit_reservation_items;
create policy reservation_items_member
  on public.credit_reservation_items
  for select using (
    exists (
      select 1
      from public.credit_reservations r
      join public.account_memberships m on m.account_id = r.account_id
      where r.id = credit_reservation_items.reservation_id
        and m.user_id = auth.uid()
    )
  );

create or replace function public.pikbo_ensure_personal_account(
  p_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_account public.accounts%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_idem text;
begin
  if p_user_id is null then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:UNAUTHORIZED';
  end if;

  insert into public.profiles (id, updated_at)
  values (p_user_id, now())
  on conflict (id) do update set updated_at = excluded.updated_at;

  insert into public.accounts (
    kind, owner_user_id, plan_id, status
  ) values (
    'personal', p_user_id, 'free', 'active'
  )
  on conflict (owner_user_id) where kind = 'personal' do nothing;

  select *
    into strict v_account
    from public.accounts
   where owner_user_id = p_user_id
     and kind = 'personal'
   for update;

  insert into public.account_memberships (account_id, user_id, role)
  values (v_account.id, p_user_id, 'owner')
  on conflict (account_id, user_id) do nothing;

  insert into public.credit_wallets (account_id)
  values (v_account.id)
  on conflict (account_id) do nothing;

  select *
    into strict v_wallet
    from public.credit_wallets
   where account_id = v_account.id
   for update;

  v_idem := 'free:' || v_account.id::text || ':bootstrap';
  if not exists (
    select 1 from public.credit_ledger where idempotency_key = v_idem
  ) then
    update public.credit_wallets
       set available_credits = available_credits + 10,
           version = version + 1,
           updated_at = now()
     where account_id = v_account.id
     returning * into strict v_wallet;

    insert into public.credit_ledger (
      account_id, kind, delta_available, delta_reserved,
      available_after, reserved_after, source_type, source_id,
      idempotency_key, metadata
    ) values (
      v_account.id, 'grant', 10, 0,
      v_wallet.available_credits, v_wallet.reserved_credits,
      'free_period', v_idem, v_idem, '{}'::jsonb
    );
  end if;

  return jsonb_build_object(
    'account', to_jsonb(v_account),
    'wallet', to_jsonb(v_wallet)
  );
end;
$$;

create or replace function public.pikbo_reserve_credits(
  p_account_id uuid,
  p_created_by uuid,
  p_purpose public.reservation_purpose,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_wallet public.credit_wallets%rowtype;
  v_reservation public.credit_reservations%rowtype;
  v_quote integer;
begin
  if p_idempotency_key is null
     or char_length(btrim(p_idempotency_key)) < 8
     or char_length(p_idempotency_key) > 160 then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:INVALID_IDEMPOTENCY_KEY';
  end if;

  -- The unique index is the final guard, but serializing the read/create path
  -- makes concurrent retries return the original reservation rather than one
  -- caller surfacing a unique-violation race.
  perform pg_advisory_xact_lock(
    hashtextextended('pikbo_reserve:' || p_idempotency_key, 0)
  );

  if not exists (
    select 1
      from public.account_memberships m
      join public.accounts a on a.id = m.account_id
     where m.account_id = p_account_id
       and m.user_id = p_created_by
       and m.role in ('owner', 'editor')
       and a.status = 'active'
  ) then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:UNAUTHORIZED';
  end if;

  -- Prices are server-owned. Callers never provide an amount.
  v_quote := case
    when p_purpose = 'generation' then 10
    when p_purpose = 'seller_pack' then 30
    else null
  end;
  if v_quote is null then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:INVALID_PURPOSE';
  end if;

  select *
    into v_reservation
    from public.credit_reservations
   where idempotency_key = p_idempotency_key
   for update;
  if found then
    if v_reservation.account_id <> p_account_id
       or v_reservation.created_by <> p_created_by
       or v_reservation.purpose <> p_purpose
       or v_reservation.quoted_credits <> v_quote then
      raise exception using errcode = 'P0001',
        message = 'PIKBO_CREDITS:IDEMPOTENCY_CONFLICT';
    end if;
    select * into strict v_wallet
      from public.credit_wallets
     where account_id = p_account_id;
    return jsonb_build_object(
      'reservation', to_jsonb(v_reservation),
      'wallet', to_jsonb(v_wallet),
      'idempotent', true
    );
  end if;

  select *
    into strict v_wallet
    from public.credit_wallets
   where account_id = p_account_id
   for update;

  if v_wallet.available_credits < v_quote then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:INSUFFICIENT_CREDITS';
  end if;

  update public.credit_wallets
     set available_credits = available_credits - v_quote,
         reserved_credits = reserved_credits + v_quote,
         version = version + 1,
         updated_at = now()
   where account_id = p_account_id
   returning * into strict v_wallet;

  insert into public.credit_reservations (
    account_id, purpose, quoted_credits, idempotency_key,
    expires_at, created_by
  ) values (
    p_account_id, p_purpose, v_quote, p_idempotency_key,
    now() + interval '30 minutes', p_created_by
  )
  returning * into strict v_reservation;

  if p_purpose = 'seller_pack' then
    insert into public.credit_reservation_items
      (reservation_id, item_key, credits)
    values
      (v_reservation.id, '360-spin-showcase', 10),
      (v_reservation.id, 'blind-box-unboxing', 10),
      (v_reservation.id, 'paparazzi-flash', 10);
  else
    insert into public.credit_reservation_items
      (reservation_id, item_key, credits)
    values (v_reservation.id, 'generation', 10);
  end if;

  insert into public.credit_ledger (
    account_id, kind, delta_available, delta_reserved,
    available_after, reserved_after, reservation_id,
    source_type, source_id, idempotency_key, metadata
  ) values (
    p_account_id, 'reserve', -v_quote, v_quote,
    v_wallet.available_credits, v_wallet.reserved_credits,
    v_reservation.id, p_purpose::text, v_reservation.id::text,
    'ledger:reserve:' || p_idempotency_key,
    jsonb_build_object('quoted', v_quote, 'serverPriced', true)
  );

  return jsonb_build_object(
    'reservation', to_jsonb(v_reservation),
    'wallet', to_jsonb(v_wallet),
    'idempotent', false
  );
end;
$$;

create or replace function public.pikbo_finish_reservation_item(
  p_kind text,
  p_reservation_id uuid,
  p_actor_user_id uuid,
  p_item_key text,
  p_job_id text,
  p_reason text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reservation public.credit_reservations%rowtype;
  v_item public.credit_reservation_items%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_settled integer;
  v_released integer;
  v_status public.reservation_status;
  v_existing public.credit_ledger%rowtype;
  v_job public.generation_jobs%rowtype;
begin
  if p_kind not in ('settle', 'release') then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:INVALID_FINISH_KIND';
  end if;
  if p_idempotency_key is null
     or char_length(btrim(p_idempotency_key)) < 8
     or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:INVALID_IDEMPOTENCY_KEY';
  end if;

  select *
    into strict v_reservation
    from public.credit_reservations
   where id = p_reservation_id
   for update;

  if not exists (
    select 1
      from public.account_memberships m
      join public.accounts a on a.id = m.account_id
     where m.account_id = v_reservation.account_id
       and m.user_id = p_actor_user_id
       and m.role in ('owner', 'editor')
       and a.status = 'active'
  ) then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:UNAUTHORIZED';
  end if;

  -- Terminal money movement is server-job owned. Validate this even on an
  -- idempotent replay, so a missing/arbitrary job id is never accepted.
  if p_job_id is null
     or p_job_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:JOB_REQUIRED';
  end if;

  select *
    into v_job
    from public.generation_jobs
   where id = p_job_id::uuid
   for update;
  if not found then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:JOB_NOT_FOUND';
  end if;
  if v_job.account_id <> v_reservation.account_id
     or v_job.reservation_id <> p_reservation_id
     or v_job.created_by <> p_actor_user_id then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:JOB_OWNERSHIP_MISMATCH';
  end if;
  -- A single generation reservation uses the generic item key. Seller Pack
  -- items are recipe-specific and must match the durable job effect exactly.
  if p_item_key <> 'generation'
     and v_job.effect_slug <> p_item_key then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:JOB_ITEM_MISMATCH';
  end if;
  if (p_kind = 'settle' and v_job.status <> 'succeeded')
     or (p_kind = 'release' and v_job.status not in ('failed', 'canceled')) then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:JOB_STATUS_MISMATCH';
  end if;

  select * into v_existing
    from public.credit_ledger
   where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.reservation_id <> p_reservation_id
       or v_existing.kind::text <> p_kind then
      raise exception using errcode = 'P0001',
        message = 'PIKBO_CREDITS:IDEMPOTENCY_CONFLICT';
    end if;
    select * into strict v_wallet
      from public.credit_wallets where account_id = v_reservation.account_id;
    return jsonb_build_object(
      'reservation', to_jsonb(v_reservation),
      'wallet', to_jsonb(v_wallet),
      'idempotent', true
    );
  end if;

  select *
    into strict v_item
    from public.credit_reservation_items
   where reservation_id = p_reservation_id
     and item_key = p_item_key
   for update;

  if v_item.status <> 'pending' then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:ITEM_ALREADY_FINAL';
  end if;

  select *
    into strict v_wallet
    from public.credit_wallets
   where account_id = v_reservation.account_id
   for update;

  if v_wallet.reserved_credits < v_item.credits then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:RESERVED_UNDERFLOW';
  end if;

  update public.credit_wallets
     set available_credits = available_credits
           + case when p_kind = 'release' then v_item.credits else 0 end,
         reserved_credits = reserved_credits - v_item.credits,
         lifetime_used_credits = lifetime_used_credits
           + case when p_kind = 'settle' then v_item.credits else 0 end,
         version = version + 1,
         updated_at = now()
   where account_id = v_reservation.account_id
   returning * into strict v_wallet;

  update public.credit_reservation_items
     set status = case when p_kind = 'settle' then 'settled' else 'released' end,
         job_id = nullif(left(coalesce(p_job_id, ''), 200), ''),
         terminal_idempotency_key = p_idempotency_key,
         updated_at = now()
   where reservation_id = p_reservation_id
     and item_key = p_item_key;

  v_settled := v_reservation.settled_credits
    + case when p_kind = 'settle' then v_item.credits else 0 end;
  v_released := v_reservation.released_credits
    + case when p_kind = 'release' then v_item.credits else 0 end;
  v_status := case
    when v_settled = v_reservation.quoted_credits then 'settled'
    when v_released = v_reservation.quoted_credits then 'released'
    when v_settled + v_released > 0 then 'partially_settled'
    else 'reserved'
  end;

  update public.credit_reservations
     set settled_credits = v_settled,
         released_credits = v_released,
         status = v_status,
         updated_at = now()
   where id = p_reservation_id
   returning * into strict v_reservation;

  insert into public.credit_ledger (
    account_id, kind, delta_available, delta_reserved,
    available_after, reserved_after, reservation_id,
    source_type, source_id, idempotency_key, metadata
  ) values (
    v_reservation.account_id, p_kind::public.ledger_kind,
    case when p_kind = 'release' then v_item.credits else 0 end,
    -v_item.credits,
    v_wallet.available_credits, v_wallet.reserved_credits,
    p_reservation_id, p_kind, coalesce(p_job_id, p_item_key),
    p_idempotency_key,
    jsonb_build_object(
      'itemKey', p_item_key,
      'jobId', p_job_id,
      'reason', left(coalesce(p_reason, ''), 120),
      'serverPricedCredits', v_item.credits
    )
  );

  return jsonb_build_object(
    'reservation', to_jsonb(v_reservation),
    'wallet', to_jsonb(v_wallet),
    'idempotent', false
  );
end;
$$;

-- Service-owned health/job sweep. It atomically returns every still-pending
-- item on an expired reservation; terminal browser routes never call this.
create or replace function public.pikbo_expire_reservations()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reservation public.credit_reservations%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_released integer;
  v_expired integer := 0;
  v_released_credits integer := 0;
begin
  for v_reservation in
    select *
      from public.credit_reservations
     where expires_at <= now()
       and status in ('reserved', 'partially_settled')
     for update skip locked
  loop
    -- Reservation is locked above; lock its items before aggregating them.
    perform 1
      from public.credit_reservation_items i
     where i.reservation_id = v_reservation.id
       and i.status = 'pending'
       and not exists (
         select 1
           from public.generation_jobs j
          where j.reservation_id = v_reservation.id
            and (i.item_key = 'generation' or j.effect_slug = i.item_key)
            and j.status in ('queued', 'running', 'succeeded')
       )
     for update;
    select coalesce(sum(credits), 0)
      into v_released
      from public.credit_reservation_items i
     where i.reservation_id = v_reservation.id
       and i.status = 'pending'
       and not exists (
         select 1
           from public.generation_jobs j
          where j.reservation_id = v_reservation.id
            and (i.item_key = 'generation' or j.effect_slug = i.item_key)
            and j.status in ('queued', 'running', 'succeeded')
       );
    if v_released = 0 then
      continue;
    end if;

    select * into strict v_wallet
      from public.credit_wallets
     where account_id = v_reservation.account_id
     for update;
    if v_wallet.reserved_credits < v_released then
      raise exception using errcode = 'P0001',
        message = 'PIKBO_CREDITS:RESERVED_UNDERFLOW';
    end if;

    update public.credit_wallets
       set available_credits = available_credits + v_released,
           reserved_credits = reserved_credits - v_released,
           version = version + 1,
           updated_at = now()
     where account_id = v_reservation.account_id
     returning * into strict v_wallet;

    update public.credit_reservation_items i
       set status = 'released',
           terminal_idempotency_key =
             'expire:' || v_reservation.id::text || ':' || i.item_key,
           updated_at = now()
     where i.reservation_id = v_reservation.id
       and i.status = 'pending'
       and not exists (
         select 1
           from public.generation_jobs j
          where j.reservation_id = v_reservation.id
            and (i.item_key = 'generation' or j.effect_slug = i.item_key)
            and j.status in ('queued', 'running', 'succeeded')
       );

    update public.credit_reservations
       set released_credits = released_credits + v_released,
           status = 'expired',
           updated_at = now()
     where id = v_reservation.id;

    insert into public.credit_ledger (
      account_id, kind, delta_available, delta_reserved,
      available_after, reserved_after, reservation_id,
      source_type, source_id, idempotency_key, metadata
    ) values (
      v_reservation.account_id, 'expire', v_released, -v_released,
      v_wallet.available_credits, v_wallet.reserved_credits,
      v_reservation.id, 'reservation_expiry', v_reservation.id::text,
      'expire:' || v_reservation.id::text,
      jsonb_build_object('releasedCredits', v_released, 'serverOwned', true)
    );
    v_expired := v_expired + 1;
    v_released_credits := v_released_credits + v_released;
  end loop;

  return jsonb_build_object(
    'expired', v_expired,
    'releasedCredits', v_released_credits
  );
end;
$$;

create or replace function public.pikbo_settle_reservation_item(
  p_reservation_id uuid,
  p_actor_user_id uuid,
  p_item_key text,
  p_job_id text,
  p_idempotency_key text
) returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$
  select public.pikbo_finish_reservation_item(
    'settle', p_reservation_id, p_actor_user_id, p_item_key,
    p_job_id, null, p_idempotency_key
  );
$$;

create or replace function public.pikbo_release_reservation_item(
  p_reservation_id uuid,
  p_actor_user_id uuid,
  p_item_key text,
  p_job_id text,
  p_reason text,
  p_idempotency_key text
) returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$
  select public.pikbo_finish_reservation_item(
    'release', p_reservation_id, p_actor_user_id, p_item_key,
    p_job_id, p_reason, p_idempotency_key
  );
$$;

create or replace function public.pikbo_migrate_guest_credits(
  p_guest_session_id_hash text,
  p_user_id uuid,
  p_account_id uuid,
  p_cookie_credits integer,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_wallet public.credit_wallets%rowtype;
  v_migrated integer := 0;
  v_existing public.consumed_guest_sessions%rowtype;
begin
  if p_guest_session_id_hash is null
     or char_length(p_guest_session_id_hash) <> 64
     or p_guest_session_id_hash !~ '^[0-9a-f]+$' then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:INVALID_GUEST_HASH';
  end if;
  if p_idempotency_key is null
     or char_length(btrim(p_idempotency_key)) < 8
     or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:INVALID_IDEMPOTENCY_KEY';
  end if;
  if not exists (
    select 1
      from public.account_memberships
     where account_id = p_account_id
       and user_id = p_user_id
       and role = 'owner'
  ) then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:UNAUTHORIZED';
  end if;

  select *
    into v_existing
    from public.consumed_guest_sessions
   where guest_session_id_hash = p_guest_session_id_hash
   for update;
  if found then
    if v_existing.user_id <> p_user_id
       or v_existing.account_id <> p_account_id then
      raise exception using errcode = 'P0001',
        message = 'PIKBO_CREDITS:GUEST_ALREADY_CONSUMED';
    end if;
    select * into strict v_wallet
      from public.credit_wallets where account_id = p_account_id;
    return jsonb_build_object(
      'migrated', 0,
      'wallet', to_jsonb(v_wallet),
      'idempotent', true
    );
  end if;

  select *
    into strict v_wallet
    from public.credit_wallets
   where account_id = p_account_id
   for update;

  -- Never stack a guest balance on top of a durable grant/reservation.
  if v_wallet.available_credits = 0 and v_wallet.reserved_credits = 0 then
    v_migrated := least(10, greatest(0, coalesce(p_cookie_credits, 0)));
  end if;

  if v_migrated > 0 then
    update public.credit_wallets
       set available_credits = available_credits + v_migrated,
           version = version + 1,
           updated_at = now()
     where account_id = p_account_id
     returning * into strict v_wallet;

    insert into public.credit_ledger (
      account_id, kind, delta_available, delta_reserved,
      available_after, reserved_after, source_type, source_id,
      idempotency_key, metadata
    ) values (
      p_account_id, 'migration', v_migrated, 0,
      v_wallet.available_credits, v_wallet.reserved_credits,
      'migration', p_guest_session_id_hash, p_idempotency_key,
      jsonb_build_object('cappedAt', 10)
    );
  end if;

  insert into public.consumed_guest_sessions (
    guest_session_id_hash, user_id, account_id, migrated_credits
  ) values (
    p_guest_session_id_hash, p_user_id, p_account_id, v_migrated
  );

  return jsonb_build_object(
    'migrated', v_migrated,
    'wallet', to_jsonb(v_wallet),
    'idempotent', false
  );
end;
$$;

create or replace function public.pikbo_credits_schema_probe()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_version integer := 0;
  v_missing text[] := array[]::text[];
begin
  select coalesce(max(version), 0) into v_version
    from public.pikbo_schema_versions
   where component = 'durable_credits';

  if to_regclass('public.accounts') is null then
    v_missing := array_append(v_missing, 'table:accounts');
  end if;
  if to_regclass('public.pikbo_schema_versions') is null then
    v_missing := array_append(v_missing, 'table:pikbo_schema_versions');
  end if;
  if to_regclass('public.account_memberships') is null then
    v_missing := array_append(v_missing, 'table:account_memberships');
  end if;
  if to_regclass('public.credit_wallets') is null then
    v_missing := array_append(v_missing, 'table:credit_wallets');
  end if;
  if to_regclass('public.credit_ledger') is null then
    v_missing := array_append(v_missing, 'table:credit_ledger');
  end if;
  if to_regclass('public.credit_reservations') is null then
    v_missing := array_append(v_missing, 'table:credit_reservations');
  end if;
  if to_regclass('public.credit_reservation_items') is null then
    v_missing := array_append(v_missing, 'table:credit_reservation_items');
  end if;
  if to_regclass('public.consumed_guest_sessions') is null then
    v_missing := array_append(v_missing, 'table:consumed_guest_sessions');
  end if;
  if to_regclass('public.generation_jobs') is null then
    v_missing := array_append(v_missing, 'table:generation_jobs');
  end if;
  if to_regclass('public.seller_pack_runs') is null then
    v_missing := array_append(v_missing, 'table:seller_pack_runs');
  end if;
  if to_regprocedure(
    'public.pikbo_ensure_personal_account(uuid)'
  ) is null then
    v_missing := array_append(v_missing, 'rpc:pikbo_ensure_personal_account');
  end if;
  if to_regprocedure('public.pikbo_expire_reservations()') is null then
    v_missing := array_append(v_missing, 'rpc:pikbo_expire_reservations');
  end if;
  if to_regprocedure(
    'public.pikbo_reserve_credits(uuid,uuid,public.reservation_purpose,text)'
  ) is null then
    v_missing := array_append(v_missing, 'rpc:pikbo_reserve_credits');
  end if;
  if to_regprocedure(
    'public.pikbo_settle_reservation_item(uuid,uuid,text,text,text)'
  ) is null then
    v_missing := array_append(v_missing, 'rpc:pikbo_settle_reservation_item');
  end if;
  if to_regprocedure(
    'public.pikbo_release_reservation_item(uuid,uuid,text,text,text,text)'
  ) is null then
    v_missing := array_append(v_missing, 'rpc:pikbo_release_reservation_item');
  end if;
  if to_regprocedure(
    'public.pikbo_migrate_guest_credits(text,uuid,uuid,integer,text)'
  ) is null then
    v_missing := array_append(v_missing, 'rpc:pikbo_migrate_guest_credits');
  end if;

  return jsonb_build_object(
    'schemaVersion', v_version,
    'requiredVersion', 2,
    'ready', v_version >= 2 and cardinality(v_missing) = 0,
    'missing', to_jsonb(v_missing)
  );
end;
$$;

revoke all on function public.pikbo_ensure_personal_account(uuid)
  from public, anon, authenticated;
revoke all on function public.pikbo_reserve_credits(
  uuid, uuid, public.reservation_purpose, text
) from public, anon, authenticated;
revoke all on function public.pikbo_finish_reservation_item(
  text, uuid, uuid, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.pikbo_settle_reservation_item(
  uuid, uuid, text, text, text
) from public, anon, authenticated;
revoke all on function public.pikbo_release_reservation_item(
  uuid, uuid, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.pikbo_migrate_guest_credits(
  text, uuid, uuid, integer, text
) from public, anon, authenticated;
revoke all on function public.pikbo_expire_reservations()
  from public, anon, authenticated;
revoke all on function public.pikbo_credits_schema_probe()
  from public, anon, authenticated;

grant execute on function public.pikbo_ensure_personal_account(uuid)
  to service_role;
grant execute on function public.pikbo_reserve_credits(
  uuid, uuid, public.reservation_purpose, text
) to service_role;
grant execute on function public.pikbo_settle_reservation_item(
  uuid, uuid, text, text, text
) to service_role;
grant execute on function public.pikbo_release_reservation_item(
  uuid, uuid, text, text, text, text
) to service_role;
grant execute on function public.pikbo_migrate_guest_credits(
  text, uuid, uuid, integer, text
) to service_role;
grant execute on function public.pikbo_expire_reservations()
  to service_role;
grant execute on function public.pikbo_credits_schema_probe()
  to service_role;

comment on table public.credit_reservation_items is
  'Server-priced 10-credit reservation items; exactly one terminal outcome per item.';
comment on function public.pikbo_credits_schema_probe() is
  'T5 readiness probe: required schema version, tables and transactional RPCs.';

-- Mark v2 only after every table, policy, function and privilege above parsed
-- successfully. The explicit transaction prevents a partially applied v2.
insert into public.pikbo_schema_versions (component, version, applied_at)
values ('durable_credits', 2, now())
on conflict (component) do update
set version = greatest(public.pikbo_schema_versions.version, excluded.version),
    applied_at = case
      when public.pikbo_schema_versions.version < excluded.version then excluded.applied_at
      else public.pikbo_schema_versions.applied_at
    end;

commit;
