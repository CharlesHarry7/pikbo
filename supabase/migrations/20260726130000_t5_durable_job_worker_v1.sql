-- PIKBO T5 worker v1 — durable generation job skeleton.
--
-- Source-only. This is intentionally not a launch switch: application code
-- keeps SERVER_OWNED_GENERATION_JOBS_IMPLEMENTED=false until a worker invokes
-- these RPCs around the real provider lifecycle.

begin;

alter table public.generation_jobs
  add column if not exists server_idempotency_key text;

create unique index if not exists generation_jobs_server_idempotency_key_idx
  on public.generation_jobs (server_idempotency_key)
  where server_idempotency_key is not null;

-- Atomically reserve the server-priced generation credit and create its
-- durable job. The caller supplies an effect slug, never a credit amount.
create or replace function public.pikbo_create_generation_job_reservation(
  p_account_id uuid,
  p_created_by uuid,
  p_effect_slug text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_reservation public.credit_reservations%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_reserved jsonb;
  v_reservation_id uuid;
begin
  if p_idempotency_key is null
     or char_length(btrim(p_idempotency_key)) < 8
     or char_length(p_idempotency_key) > 130 then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:INVALID_IDEMPOTENCY_KEY';
  end if;
  if p_effect_slug is null
     or p_effect_slug !~ '^[a-z0-9][a-z0-9-]{0,79}$' then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:INVALID_EFFECT_SLUG';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('pikbo_generation_job:' || p_idempotency_key, 0)
  );

  select * into v_job
    from public.generation_jobs
   where server_idempotency_key = p_idempotency_key
   for update;
  if found then
    if v_job.account_id <> p_account_id
       or v_job.created_by <> p_created_by
       or v_job.effect_slug <> p_effect_slug then
      raise exception using errcode = 'P0001',
        message = 'PIKBO_CREDITS:IDEMPOTENCY_CONFLICT';
    end if;
    select * into strict v_reservation
      from public.credit_reservations
     where id = v_job.reservation_id;
    select * into strict v_wallet
      from public.credit_wallets
     where account_id = p_account_id;
    return jsonb_build_object(
      'job', to_jsonb(v_job),
      'reservation', to_jsonb(v_reservation),
      'wallet', to_jsonb(v_wallet),
      'idempotent', true
    );
  end if;

  -- pikbo_reserve_credits owns account authorization, server pricing, wallet
  -- mutation and reservation-item creation in this same transaction.
  v_reserved := public.pikbo_reserve_credits(
    p_account_id,
    p_created_by,
    'generation'::public.reservation_purpose,
    'job-reserve:' || p_idempotency_key
  );
  v_reservation_id := (v_reserved -> 'reservation' ->> 'id')::uuid;

  insert into public.generation_jobs (
    account_id, created_by, effect_slug, status, quoted_credits,
    settled_credits, reservation_id, server_idempotency_key
  ) values (
    p_account_id, p_created_by, p_effect_slug, 'queued', 10,
    0, v_reservation_id, p_idempotency_key
  ) returning * into strict v_job;

  select * into strict v_reservation
    from public.credit_reservations
   where id = v_reservation_id;
  select * into strict v_wallet
    from public.credit_wallets
   where account_id = p_account_id;
  return jsonb_build_object(
    'job', to_jsonb(v_job),
    'reservation', to_jsonb(v_reservation),
    'wallet', to_jsonb(v_wallet),
    'idempotent', false
  );
end;
$$;

-- Service-role worker terminal transition. Job status and the corresponding
-- settle/release are one transaction: a caller cannot mark success without
-- consuming the reservation, nor mark failure/cancel without releasing it.
create or replace function public.pikbo_worker_finish_generation_job(
  p_job_id uuid,
  p_terminal_status public.generation_status,
  p_provider_request_id text default null,
  p_error_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_result jsonb;
  v_kind text;
begin
  if p_terminal_status not in ('succeeded', 'failed', 'canceled') then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:INVALID_JOB_TERMINAL_STATUS';
  end if;

  select * into strict v_job
    from public.generation_jobs
   where id = p_job_id
   for update;

  if v_job.status in ('succeeded', 'failed', 'canceled')
     and v_job.status <> p_terminal_status then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:JOB_TERMINAL_CONFLICT';
  end if;
  if v_job.status not in ('queued', 'running', 'succeeded', 'failed', 'canceled') then
    raise exception using errcode = 'P0001',
      message = 'PIKBO_CREDITS:JOB_STATUS_MISMATCH';
  end if;

  update public.generation_jobs
     set status = p_terminal_status,
         provider_request_id = coalesce(
           provider_request_id,
           nullif(left(coalesce(p_provider_request_id, ''), 200), '')
         ),
         error_code = case
           when p_terminal_status = 'succeeded' then null
           else nullif(left(coalesce(p_error_code, 'worker_terminal'), 120), '')
         end,
         completed_at = coalesce(completed_at, now())
   where id = v_job.id
   returning * into strict v_job;

  v_kind := case when p_terminal_status = 'succeeded' then 'settle' else 'release' end;
  v_result := public.pikbo_finish_reservation_item(
    v_kind,
    v_job.reservation_id,
    v_job.created_by,
    'generation',
    v_job.id::text,
    case when v_kind = 'release' then coalesce(p_error_code, p_terminal_status::text) else null end,
    'worker:' || v_kind || ':' || v_job.id::text
  );

  if p_terminal_status = 'succeeded' and v_job.settled_credits = 0 then
    update public.generation_jobs
       set settled_credits = 10
     where id = v_job.id
     returning * into strict v_job;
  end if;

  return jsonb_build_object(
    'job', to_jsonb(v_job),
    'terminal', v_result
  );
end;
$$;

revoke all on function public.pikbo_create_generation_job_reservation(
  uuid, uuid, text, text
) from public, anon, authenticated;
revoke all on function public.pikbo_worker_finish_generation_job(
  uuid, public.generation_status, text, text
) from public, anon, authenticated;

grant execute on function public.pikbo_create_generation_job_reservation(
  uuid, uuid, text, text
) to service_role;
grant execute on function public.pikbo_worker_finish_generation_job(
  uuid, public.generation_status, text, text
) to service_role;

comment on function public.pikbo_create_generation_job_reservation(
  uuid, uuid, text, text
) is 'T5 worker v1: atomically create a durable generation job and reserve its server-priced credit.';
comment on function public.pikbo_worker_finish_generation_job(
  uuid, public.generation_status, text, text
) is 'T5 worker v1: service-role-only terminal job transition plus atomic settlement/release.';

insert into public.pikbo_schema_versions (component, version, applied_at)
values ('durable_credits', 3, now())
on conflict (component) do update
set version = greatest(public.pikbo_schema_versions.version, excluded.version),
    applied_at = case
      when public.pikbo_schema_versions.version < excluded.version then excluded.applied_at
      else public.pikbo_schema_versions.applied_at
    end;

commit;
