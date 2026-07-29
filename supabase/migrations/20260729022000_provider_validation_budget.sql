-- PIKBO non-production provider validation budget.
-- SOURCE ONLY. Apply after T5 in the non-production Supabase project.
--
-- The route may opt into validation with a server env flag, but cumulative
-- spend authority lives here. There is exactly one project-wide budget row:
-- accounts, processes, deploys, and concurrent requests all contend on it.
-- Its hard database ceiling is US$20 and it is never automatically recharged.

create table if not exists public.provider_validation_budgets (
  scope text primary key
    check (scope = 'project'),
  ceiling_microusd bigint not null
    check (ceiling_microusd between 0 and 20000000),
  reserved_microusd bigint not null default 0
    check (reserved_microusd >= 0),
  spent_microusd bigint not null default 0
    check (spent_microusd >= 0),
  version bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint provider_validation_budget_cap check (
    reserved_microusd + spent_microusd <= ceiling_microusd
  )
);

create table if not exists public.provider_spend_reservations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  idempotency_key text not null unique,
  model_id text not null,
  estimated_microusd bigint not null check (estimated_microusd > 0),
  status text not null check (status in ('reserved', 'committed', 'released')),
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Makes a re-apply safe if an early preview created reservations before leases
-- were introduced. No budget is credited by this DDL; the worker RPC below is
-- the only path that releases an expired reservation.
alter table public.provider_spend_reservations
  add column if not exists expires_at timestamptz
    not null default (now() + interval '20 minutes');

create index if not exists provider_spend_reservations_account_idx
  on public.provider_spend_reservations (account_id, created_at desc);
create index if not exists provider_spend_reservations_expiry_idx
  on public.provider_spend_reservations (expires_at, id)
  where status = 'reserved';

alter table public.provider_validation_budgets enable row level security;
alter table public.provider_spend_reservations enable row level security;
-- No browser policies: service_role is the only spend authority.

create or replace function public.pikbo_reserve_provider_spend_v1(
  p_user_id uuid,
  p_idempotency_key text,
  p_model_id text,
  p_estimated_microusd bigint,
  p_ceiling_microusd bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account public.accounts%rowtype;
  v_budget public.provider_validation_budgets%rowtype;
  v_existing public.provider_spend_reservations%rowtype;
  v_reservation public.provider_spend_reservations%rowtype;
  v_effective_ceiling bigint;
  v_scoped_idempotency_key text;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  end if;
  if p_idempotency_key is null
     or length(btrim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 128 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_IDEMPOTENCY_KEY');
  end if;
  if p_model_id not in (
    'bytedance/seedance-2.0/fast/image-to-video'
  ) then
    return jsonb_build_object('ok', false, 'code', 'MODEL_NOT_ADMITTED');
  end if;
  if p_estimated_microusd is null or p_estimated_microusd <= 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_ESTIMATE');
  end if;
  if p_ceiling_microusd is null
     or p_ceiling_microusd <= 0
     or p_ceiling_microusd > 20000000 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_CEILING');
  end if;

  select *
    into v_account
    from public.accounts
   where owner_user_id = p_user_id
     and kind = 'personal'
   for update;
  if not found
     or v_account.status <> 'active'
     or not v_account.live_generation_allowed then
    return jsonb_build_object('ok', false, 'code', 'LIVE_ACCESS_REQUIRED');
  end if;

  -- The first configured ceiling is immutable. A deploy or env edit must not
  -- silently recharge/increase the cumulative validation budget.
  insert into public.provider_validation_budgets (
    scope,
    ceiling_microusd
  ) values (
    'project',
    p_ceiling_microusd
  ) on conflict (scope) do nothing;

  -- This singleton row is the serialization point for every account. Lock it
  -- before reading idempotency state so same-key and cross-account races use a
  -- single lock order and cannot collectively pass US$20.
  select *
    into v_budget
    from public.provider_validation_budgets
   where scope = 'project'
   for update;

  v_scoped_idempotency_key :=
    'provider:' || p_user_id::text || ':' || btrim(p_idempotency_key);
  select *
    into v_existing
    from public.provider_spend_reservations
   where idempotency_key = v_scoped_idempotency_key
   for update;
  if found then
    if v_existing.created_by <> p_user_id
       or v_existing.account_id <> v_account.id
       or v_existing.model_id <> p_model_id
       or v_existing.estimated_microusd <> p_estimated_microusd then
      return jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
    end if;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'providerAuthorized', false,
      'reservationId', v_existing.id,
      'status', v_existing.status,
      'estimatedMicrousd', v_existing.estimated_microusd,
      'ceilingMicrousd', least(v_budget.ceiling_microusd, p_ceiling_microusd),
      'reservedMicrousd', v_budget.reserved_microusd,
      'spentMicrousd', v_budget.spent_microusd,
      'remainingMicrousd',
        greatest(
          0,
          least(v_budget.ceiling_microusd, p_ceiling_microusd)
          - v_budget.reserved_microusd
          - v_budget.spent_microusd
        )
    );
  end if;

  -- A lower later env cap fails closed. A higher later cap cannot enlarge the
  -- original project-wide allowance.
  v_effective_ceiling :=
    least(v_budget.ceiling_microusd, p_ceiling_microusd);

  if v_budget.reserved_microusd
       + v_budget.spent_microusd
       + p_estimated_microusd > v_effective_ceiling then
    return jsonb_build_object(
      'ok', false,
      'code', 'PAID_CEILING_EXHAUSTED',
      'ceilingMicrousd', v_effective_ceiling,
      'reservedMicrousd', v_budget.reserved_microusd,
      'spentMicrousd', v_budget.spent_microusd,
      'needMicrousd', p_estimated_microusd
    );
  end if;

  insert into public.provider_spend_reservations (
    account_id,
    created_by,
    idempotency_key,
    model_id,
    estimated_microusd,
    status,
    expires_at
  ) values (
    v_account.id,
    p_user_id,
    v_scoped_idempotency_key,
    p_model_id,
    p_estimated_microusd,
    'reserved',
    now() + interval '20 minutes'
  )
  returning * into v_reservation;

  update public.provider_validation_budgets
     set reserved_microusd = reserved_microusd + p_estimated_microusd,
         version = version + 1,
         updated_at = now()
   where scope = 'project'
   returning * into v_budget;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'providerAuthorized', true,
    'reservationId', v_reservation.id,
    'status', v_reservation.status,
    'estimatedMicrousd', v_reservation.estimated_microusd,
    'ceilingMicrousd', v_effective_ceiling,
    'reservedMicrousd', v_budget.reserved_microusd,
    'spentMicrousd', v_budget.spent_microusd,
    'remainingMicrousd',
      v_effective_ceiling
      - v_budget.reserved_microusd
      - v_budget.spent_microusd
  );
end;
$$;

create or replace function public.pikbo_commit_provider_spend_v1(
  p_user_id uuid,
  p_reservation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation public.provider_spend_reservations%rowtype;
  v_budget public.provider_validation_budgets%rowtype;
begin
  -- Use the same global-first lock order as reserve/release/expiry.
  select *
    into v_budget
    from public.provider_validation_budgets
   where scope = 'project'
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'BUDGET_NOT_FOUND');
  end if;
  select *
    into v_reservation
    from public.provider_spend_reservations
   where id = p_reservation_id
     and created_by = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_FOUND');
  end if;
  if v_reservation.status = 'committed' then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'status', 'committed',
      'spentMicrousd', v_budget.spent_microusd,
      'reservedMicrousd', v_budget.reserved_microusd
    );
  end if;
  if v_reservation.status <> 'reserved'
     or v_budget.reserved_microusd < v_reservation.estimated_microusd then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_ACTIVE');
  end if;
  update public.provider_validation_budgets
     set reserved_microusd =
           reserved_microusd - v_reservation.estimated_microusd,
         spent_microusd = spent_microusd + v_reservation.estimated_microusd,
         version = version + 1,
         updated_at = now()
   where scope = 'project'
   returning * into v_budget;
  update public.provider_spend_reservations
     set status = 'committed',
         updated_at = now()
   where id = v_reservation.id;
  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'status', 'committed',
    'spentMicrousd', v_budget.spent_microusd,
    'reservedMicrousd', v_budget.reserved_microusd
  );
end;
$$;

create or replace function public.pikbo_release_provider_spend_v1(
  p_user_id uuid,
  p_reservation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation public.provider_spend_reservations%rowtype;
  v_budget public.provider_validation_budgets%rowtype;
begin
  select *
    into v_budget
    from public.provider_validation_budgets
   where scope = 'project'
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'BUDGET_NOT_FOUND');
  end if;
  select *
    into v_reservation
    from public.provider_spend_reservations
   where id = p_reservation_id
     and created_by = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_FOUND');
  end if;
  if v_reservation.status = 'released' then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'status', 'released',
      'spentMicrousd', v_budget.spent_microusd,
      'reservedMicrousd', v_budget.reserved_microusd
    );
  end if;
  if v_reservation.status <> 'reserved'
     or v_budget.reserved_microusd < v_reservation.estimated_microusd then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_ACTIVE');
  end if;
  update public.provider_validation_budgets
     set reserved_microusd =
           reserved_microusd - v_reservation.estimated_microusd,
         version = version + 1,
         updated_at = now()
   where scope = 'project'
   returning * into v_budget;
  update public.provider_spend_reservations
     set status = 'released',
         updated_at = now()
   where id = v_reservation.id;
  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'status', 'released',
    'spentMicrousd', v_budget.spent_microusd,
    'reservedMicrousd', v_budget.reserved_microusd
  );
end;
$$;

-- Worker-only crash recovery. It accepts no account, user, reservation, amount,
-- or cutoff from the caller. Only already-expired reserved rows are released.
-- The singleton budget lock plus SKIP LOCKED makes overlapping workers safe and
-- preserves the same invariant as foreground reserve/commit/release calls.
create or replace function public.pikbo_expire_provider_spend_v1(
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_budget public.provider_validation_budgets%rowtype;
  v_released_count integer := 0;
  v_released_microusd bigint := 0;
begin
  select *
    into v_budget
    from public.provider_validation_budgets
   where scope = 'project'
   for update;
  if not found then
    return jsonb_build_object(
      'ok', true,
      'releasedReservations', 0,
      'releasedMicrousd', 0
    );
  end if;

  with candidates as (
    select id
      from public.provider_spend_reservations
     where status = 'reserved'
       and expires_at <= now()
     order by expires_at, id
     limit greatest(1, least(coalesce(p_limit, 100), 500))
     for update skip locked
  ),
  released as (
    update public.provider_spend_reservations as r
       set status = 'released',
           updated_at = now()
      from candidates
     where r.id = candidates.id
       and r.status = 'reserved'
    returning r.estimated_microusd
  )
  select count(*)::integer, coalesce(sum(estimated_microusd), 0)::bigint
    into v_released_count, v_released_microusd
    from released;

  if v_released_microusd > 0 then
    if v_budget.reserved_microusd < v_released_microusd then
      raise exception 'PROVIDER_BUDGET_INVARIANT_VIOLATION';
    end if;
    update public.provider_validation_budgets
       set reserved_microusd = reserved_microusd - v_released_microusd,
           version = version + 1,
           updated_at = now()
     where scope = 'project';
  end if;

  return jsonb_build_object(
    'ok', true,
    'releasedReservations', v_released_count,
    'releasedMicrousd', v_released_microusd
  );
end;
$$;

revoke all on function public.pikbo_reserve_provider_spend_v1(
  uuid, text, text, bigint, bigint
) from public, anon, authenticated;
revoke all on function public.pikbo_commit_provider_spend_v1(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.pikbo_release_provider_spend_v1(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.pikbo_expire_provider_spend_v1(integer)
  from public, anon, authenticated;

grant execute on function public.pikbo_reserve_provider_spend_v1(
  uuid, text, text, bigint, bigint
) to service_role;
grant execute on function public.pikbo_commit_provider_spend_v1(uuid, uuid)
  to service_role;
grant execute on function public.pikbo_release_provider_spend_v1(uuid, uuid)
  to service_role;
grant execute on function public.pikbo_expire_provider_spend_v1(integer)
  to service_role;
