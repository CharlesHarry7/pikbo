-- HISTORICAL PIKBO Seedance 2.0 private-live USD cost audit + paid ceiling.
-- Superseded by the project-wide US$20 provider validation budget in
-- 20260729022000_provider_validation_budget.sql. The follow-up
-- 20260729023000_deprecate_seedance2_budget.sql removes all remaining
-- headroom and disables this RPC without deleting historical audit rows.
--
-- Purpose:
--   Durable, atomic admission against a cumulative USD ceiling for the exact
--   model bytedance/seedance-2.0/image-to-video. Code-side default remains 0
--   until an operator configures a ceiling and applies this migration.
--
-- Guarantees (once applied + wired):
--   - One idempotency key reserves at most one estimated USD amount.
--   - Ceiling never auto-recharges from the browser or client body.
--   - Estimated / ceiling labels are stored; actual USD is null unless a
--     provider-reported figure is later attached (never invented).
--   - Default global ceiling is 0 (fail closed).

create table if not exists public.seedance2_paid_ceilings (
  scope_key text primary key,
  -- Cumulative USD the operator is willing to spend. Default 0 = blocked.
  ceiling_usd numeric(12, 4) not null default 0
    check (ceiling_usd >= 0 and ceiling_usd <= 10000),
  -- Sum of reserved/settled estimated job USD under this scope.
  spent_usd numeric(12, 4) not null default 0
    check (spent_usd >= 0),
  note text not null default 'operator-configured cumulative USD ceiling',
  updated_at timestamptz not null default now(),
  constraint seedance2_paid_ceilings_spent_le_ceiling
    check (spent_usd <= ceiling_usd + 0.0001)
);

comment on table public.seedance2_paid_ceilings is
  'Cumulative USD paid ceiling for Seedance 2.0 private live. Default 0. Never browser-authoritative.';

create table if not exists public.seedance2_cost_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid references public.generation_jobs (id) on delete set null,
  idempotency_key text not null,
  model_id text not null
    check (model_id = 'bytedance/seedance-2.0/image-to-video'),
  duration_seconds integer not null check (duration_seconds between 4 and 10),
  resolution text not null check (resolution in ('480p', '720p')),
  -- Always estimated planning rate × duration. Labeled estimated in API.
  estimated_usd numeric(12, 4) not null check (estimated_usd >= 0),
  estimated_kind text not null default 'estimated'
    check (estimated_kind = 'estimated'),
  -- Snapshot of remaining ceiling after this reservation. Labeled ceiling.
  ceiling_remaining_usd numeric(12, 4) not null check (ceiling_remaining_usd >= 0),
  ceiling_kind text not null default 'ceiling'
    check (ceiling_kind = 'ceiling'),
  -- Provider-reported actual only. Null until known. Never invent.
  actual_usd numeric(12, 4)
    check (actual_usd is null or actual_usd >= 0),
  actual_kind text
    check (actual_kind is null or actual_kind = 'actual'),
  status text not null default 'reserved'
    check (status in ('reserved', 'settled', 'released', 'withheld')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seedance2_cost_audit_user_idem unique (user_id, idempotency_key),
  constraint seedance2_cost_audit_actual_pair check (
    (actual_usd is null and actual_kind is null)
    or (actual_usd is not null and actual_kind = 'actual')
  )
);

comment on table public.seedance2_cost_audit is
  'Honest Seedance 2.0 USD cost audit. estimated/ceiling labeled; actual never invented.';

create index if not exists seedance2_cost_audit_user_created_idx
  on public.seedance2_cost_audit (user_id, created_at desc);

revoke all on table public.seedance2_paid_ceilings from anon, authenticated;
revoke all on table public.seedance2_cost_audit from anon, authenticated;

-- Seed the global fail-closed default (idempotent).
insert into public.seedance2_paid_ceilings (scope_key, ceiling_usd, spent_usd, note)
values (
  'global',
  0,
  0,
  'Default zero cumulative USD ceiling — provider spend blocked until owner raises ceiling'
)
on conflict (scope_key) do nothing;

/**
 * Atomically reserve estimated USD against the cumulative ceiling.
 * Same (user_id, idempotency_key) returns the prior row without double-spend.
 * Fails closed when ceiling is zero or exhausted.
 */
create or replace function public.pikbo_reserve_seedance2_cost_v1(
  p_user_id uuid,
  p_idempotency_key text,
  p_job_id uuid,
  p_duration_seconds integer,
  p_resolution text,
  p_estimated_usd numeric,
  p_scope_key text default 'global'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ceiling public.seedance2_paid_ceilings%rowtype;
  v_existing public.seedance2_cost_audit%rowtype;
  v_row public.seedance2_cost_audit%rowtype;
  v_remaining numeric(12, 4);
  v_scope text := coalesce(nullif(btrim(p_scope_key), ''), 'global');
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  end if;
  if p_idempotency_key is null
     or length(btrim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 128 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_IDEMPOTENCY_KEY');
  end if;
  if p_duration_seconds is null or p_duration_seconds < 4 or p_duration_seconds > 10 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_DURATION');
  end if;
  if p_resolution is null or p_resolution not in ('480p', '720p') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_RESOLUTION');
  end if;
  if p_estimated_usd is null or p_estimated_usd <= 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_ESTIMATE');
  end if;

  -- Idempotent replay of the same logical attempt.
  select * into v_existing
  from public.seedance2_cost_audit
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key
  for update;
  if found then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'status', v_existing.status,
      'auditId', v_existing.id,
      'estimatedUsd', v_existing.estimated_usd,
      'estimatedKind', 'estimated',
      'ceilingRemainingUsd', v_existing.ceiling_remaining_usd,
      'ceilingKind', 'ceiling',
      'actualUsd', v_existing.actual_usd,
      'actualKind', v_existing.actual_kind,
      'modelId', v_existing.model_id
    );
  end if;

  insert into public.seedance2_paid_ceilings (scope_key, ceiling_usd, spent_usd)
  values (v_scope, 0, 0)
  on conflict (scope_key) do nothing;

  select * into v_ceiling
  from public.seedance2_paid_ceilings
  where scope_key = v_scope
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'PAID_CEILING_UNAVAILABLE');
  end if;

  if v_ceiling.ceiling_usd <= 0 then
    return jsonb_build_object(
      'ok', false,
      'code', 'PAID_CEILING_ZERO',
      'ceilingUsd', v_ceiling.ceiling_usd,
      'spentUsd', v_ceiling.spent_usd,
      'estimatedUsd', p_estimated_usd,
      'estimatedKind', 'estimated'
    );
  end if;

  v_remaining := v_ceiling.ceiling_usd - v_ceiling.spent_usd;
  if v_remaining < p_estimated_usd then
    return jsonb_build_object(
      'ok', false,
      'code', 'PAID_CEILING_EXHAUSTED',
      'ceilingUsd', v_ceiling.ceiling_usd,
      'spentUsd', v_ceiling.spent_usd,
      'remainingUsd', greatest(v_remaining, 0),
      'estimatedUsd', p_estimated_usd,
      'estimatedKind', 'estimated'
    );
  end if;

  update public.seedance2_paid_ceilings
     set spent_usd = spent_usd + p_estimated_usd,
         updated_at = now()
   where scope_key = v_scope
   returning * into v_ceiling;

  insert into public.seedance2_cost_audit (
    user_id,
    job_id,
    idempotency_key,
    model_id,
    duration_seconds,
    resolution,
    estimated_usd,
    estimated_kind,
    ceiling_remaining_usd,
    ceiling_kind,
    actual_usd,
    actual_kind,
    status
  ) values (
    p_user_id,
    p_job_id,
    btrim(p_idempotency_key),
    'bytedance/seedance-2.0/image-to-video',
    p_duration_seconds,
    p_resolution,
    p_estimated_usd,
    'estimated',
    greatest(v_ceiling.ceiling_usd - v_ceiling.spent_usd, 0),
    'ceiling',
    null,
    null,
    'reserved'
  )
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'status', v_row.status,
    'auditId', v_row.id,
    'estimatedUsd', v_row.estimated_usd,
    'estimatedKind', 'estimated',
    'ceilingRemainingUsd', v_row.ceiling_remaining_usd,
    'ceilingKind', 'ceiling',
    'actualUsd', null,
    'actualKind', null,
    'modelId', v_row.model_id
  );
end;
$$;

revoke all on function public.pikbo_reserve_seedance2_cost_v1(
  uuid, text, uuid, integer, text, numeric, text
) from public, anon, authenticated;

comment on function public.pikbo_reserve_seedance2_cost_v1 is
  'Atomic Seedance 2.0 estimated-USD admission. Default ceiling 0. No browser authority.';
