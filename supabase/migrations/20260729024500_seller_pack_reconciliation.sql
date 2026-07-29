-- Attempt-scoped Seller Pack settlement reconciliation.
-- SOURCE ONLY. Rehearse in disposable/non-production Supabase after the
-- atomic Seller Pack and private-result migrations.
--
-- A Pack's three jobs share one 30-credit reservation. The same logical child
-- job is reused by Retry, so reconciliation identity is (job, attempt), never
-- job alone. Every finisher below calls only the exact 10-credit child RPC.

create table if not exists public.seller_pack_reconciliations (
  case_id uuid primary key default gen_random_uuid(),
  job_id uuid not null
    references public.generation_jobs (id) on delete cascade,
  attempt_key text not null
    check (length(attempt_key) between 8 and 128),
  pack_run_id uuid not null
    references public.seller_pack_runs (id) on delete cascade,
  reservation_id uuid not null
    references public.credit_reservations (id) on delete cascade,
  account_id uuid not null
    references public.accounts (id) on delete cascade,
  created_by uuid not null
    references auth.users (id) on delete cascade,
  state text not null check (
    state in (
      'review_required',
      'capture_pending',
      'release_pending',
      'captured',
      'released'
    )
  ),
  provider_outcome text not null check (
    provider_outcome in ('unknown', 'succeeded', 'failed')
  ),
  provider_request_id text,
  reason text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, attempt_key)
);

create index if not exists seller_pack_reconciliations_claim_idx
  on public.seller_pack_reconciliations (state, updated_at, case_id);

create table if not exists public.seller_pack_reconciliation_events (
  event_id text primary key,
  case_id uuid not null
    references public.seller_pack_reconciliations (case_id) on delete cascade,
  payload_sha256 text not null,
  state_after text not null,
  created_at timestamptz not null default now()
);

alter table public.seller_pack_reconciliations enable row level security;
alter table public.seller_pack_reconciliation_events enable row level security;
revoke all on table public.seller_pack_reconciliations
  from public, anon, authenticated;
revoke all on table public.seller_pack_reconciliation_events
  from public, anon, authenticated;

-- Persist one terminal observation for the exact provider attempt. Lock order
-- is always pack -> job -> reconciliation case -> event.
create or replace function public.pikbo_record_seller_pack_outcome_v1(
  p_user_id uuid,
  p_pack_run_id uuid,
  p_job_id uuid,
  p_attempt_key text,
  p_event_id text,
  p_event_type text,
  p_provider_request_id text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_pack public.seller_pack_runs%rowtype;
  v_case public.seller_pack_reconciliations%rowtype;
  v_event public.seller_pack_reconciliation_events%rowtype;
  v_fingerprint text;
  v_next_state text;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  end if;
  if p_attempt_key is null
     or length(btrim(p_attempt_key)) < 8
     or length(p_attempt_key) > 128 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_ATTEMPT_KEY');
  end if;
  if p_event_id is null
     or length(btrim(p_event_id)) < 8
     or length(p_event_id) > 160 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_EVENT_ID');
  end if;
  if p_event_type not in (
    'provider_succeeded',
    'confirmed_pre_output_failure',
    'settlement_unknown'
  ) then
    return jsonb_build_object('ok', false, 'code', 'INVALID_EVENT_TYPE');
  end if;

  select *
    into v_pack
    from public.seller_pack_runs
   where id = p_pack_run_id
     and created_by = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PACK_NOT_FOUND');
  end if;

  select *
    into v_job
    from public.generation_jobs
   where id = p_job_id
     and pack_run_id = p_pack_run_id
     and created_by = p_user_id
     and reservation_id = v_pack.reservation_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'JOB_BINDING_MISMATCH');
  end if;
  if v_job.pack_attempt_key is null
     or v_job.pack_attempt_key is distinct from btrim(p_attempt_key) then
    return jsonb_build_object('ok', false, 'code', 'ATTEMPT_BINDING_MISMATCH');
  end if;

  insert into public.seller_pack_reconciliations (
    job_id,
    attempt_key,
    pack_run_id,
    reservation_id,
    account_id,
    created_by,
    state,
    provider_outcome
  ) values (
    v_job.id,
    btrim(p_attempt_key),
    v_pack.id,
    v_job.reservation_id,
    v_job.account_id,
    p_user_id,
    'review_required',
    'unknown'
  )
  on conflict (job_id, attempt_key) do nothing;

  select *
    into v_case
    from public.seller_pack_reconciliations
   where job_id = v_job.id
     and attempt_key = btrim(p_attempt_key)
   for update;

  if v_case.pack_run_id <> v_pack.id
     or v_case.reservation_id <> v_job.reservation_id
     or v_case.created_by <> p_user_id then
    return jsonb_build_object('ok', false, 'code', 'CASE_BINDING_MISMATCH');
  end if;

  v_fingerprint := encode(
    extensions.digest(
      jsonb_build_object(
        'attemptKey', btrim(p_attempt_key),
        'eventId', btrim(p_event_id),
        'eventType', p_event_type,
        'providerRequestId', p_provider_request_id,
        'reason', p_reason
      )::text,
      'sha256'
    ),
    'hex'
  );

  select *
    into v_event
    from public.seller_pack_reconciliation_events
   where event_id = btrim(p_event_id);
  if found then
    if v_event.case_id <> v_case.case_id
       or v_event.payload_sha256 <> v_fingerprint then
      return jsonb_build_object('ok', false, 'code', 'EVENT_ID_CONFLICT');
    end if;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'caseId', v_case.case_id,
      'jobId', v_case.job_id,
      'attemptKey', v_case.attempt_key,
      'packRunId', v_case.pack_run_id,
      'reservationId', v_case.reservation_id,
      'state', v_case.state,
      'settlementCaptured', v_case.state = 'captured',
      'refundConfirmed', v_case.state = 'released'
    );
  end if;

  if p_event_type = 'provider_succeeded' then
    if p_provider_request_id is null
       or length(btrim(p_provider_request_id)) = 0
       or v_job.output_object_key is distinct from
         (
           'private-results/' || p_user_id::text || '/' ||
           v_job.id::text || '.mp4'
         )
       or v_job.output_content_type is distinct from 'video/mp4'
       or v_job.output_byte_length is null
       or v_job.output_byte_length not between 32 and 67108864
       or v_job.output_sha256 is null
       or v_job.output_sha256 !~ '^[a-f0-9]{64}$'
       or v_job.model_id is distinct from
         'bytedance/seedance-2.0/fast/image-to-video'
       or v_job.duration_seconds is distinct from 5
       or v_job.resolution is distinct from '720p'
       or v_job.pack_child_key not in (
         'listing_spin', 'blind_box_reveal', 'social_flash'
       )
       or v_job.aspect_ratio is distinct from (
         case v_job.pack_child_key
           when 'listing_spin' then '1:1'
           when 'blind_box_reveal' then '9:16'
           when 'social_flash' then '9:16'
           else null
         end
       )
       or v_job.effect_slug is distinct from (
         case v_job.pack_child_key
           when 'listing_spin' then '360-spin-showcase'
           when 'blind_box_reveal' then 'blind-box-unboxing'
           when 'social_flash' then 'paparazzi-flash'
           else null
         end
       )
       or v_job.provider_request_id is distinct from
         btrim(p_provider_request_id) then
      return jsonb_build_object(
        'ok', false,
        'code', 'PRIVATE_RESULT_REQUIRED'
      );
    end if;
    if v_case.state in ('released', 'release_pending')
       or v_case.provider_outcome = 'failed' then
      return jsonb_build_object('ok', false, 'code', 'SETTLEMENT_CONFLICT');
    end if;
    v_next_state := case
      when v_job.status = 'succeeded' then 'captured'
      when v_case.state = 'captured' then 'captured'
      else 'capture_pending'
    end;
    update public.seller_pack_reconciliations
       set state = v_next_state,
           provider_outcome = 'succeeded',
           provider_request_id = left(btrim(p_provider_request_id), 256),
           reason = left(coalesce(p_reason, reason), 160),
           last_error = null,
           updated_at = now()
     where case_id = v_case.case_id
     returning * into v_case;
  elsif p_event_type = 'confirmed_pre_output_failure' then
    if v_job.status = 'succeeded'
       or v_case.state in ('captured', 'capture_pending')
       or v_case.provider_outcome = 'succeeded' then
      return jsonb_build_object('ok', false, 'code', 'SETTLEMENT_CONFLICT');
    end if;
    v_next_state := case
      when v_job.status = 'failed' then 'released'
      when v_case.state = 'released' then 'released'
      else 'release_pending'
    end;
    update public.seller_pack_reconciliations
       set state = v_next_state,
           provider_outcome = 'failed',
           reason = left(
             coalesce(p_reason, 'confirmed_pre_output_failure'),
             160
           ),
           last_error = null,
           updated_at = now()
     where case_id = v_case.case_id
     returning * into v_case;
  else
    update public.seller_pack_reconciliations
       set state = case
             when state in ('captured', 'released') then state
             else 'review_required'
           end,
           reason = left(coalesce(p_reason, reason, 'unknown'), 160),
           updated_at = now()
     where case_id = v_case.case_id
     returning * into v_case;
  end if;

  insert into public.seller_pack_reconciliation_events (
    event_id,
    case_id,
    payload_sha256,
    state_after
  ) values (
    btrim(p_event_id),
    v_case.case_id,
    v_fingerprint,
    v_case.state
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'caseId', v_case.case_id,
    'jobId', v_case.job_id,
    'attemptKey', v_case.attempt_key,
    'packRunId', v_case.pack_run_id,
    'reservationId', v_case.reservation_id,
    'state', v_case.state,
    'settlementCaptured', v_case.state = 'captured',
    'refundConfirmed', v_case.state = 'released'
  );
end;
$$;

-- Recover the crash window after the private object is attached but before the
-- route records a case or captures credits. Discovery and finishing are
-- separate transactions at the Worker boundary.
create or replace function public.pikbo_discover_seller_pack_results_v1(
  p_limit integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_candidate record;
  v_pack public.seller_pack_runs%rowtype;
  v_job public.generation_jobs%rowtype;
  v_case public.seller_pack_reconciliations%rowtype;
  v_limit integer := least(100, greatest(1, coalesce(p_limit, 25)));
  v_discovered integer := 0;
  v_conflicted integer := 0;
begin
  for v_candidate in
    select j.pack_run_id, j.id as job_id
      from public.generation_jobs j
     where j.pack_run_id is not null
       and j.status = 'running'
       and j.pack_attempt_key is not null
       and j.output_object_key is not null
     order by j.started_at nulls last, j.id
     limit v_limit
  loop
    select *
      into v_pack
      from public.seller_pack_runs
     where id = v_candidate.pack_run_id
     for update;
    if not found then
      continue;
    end if;

    select *
      into v_job
      from public.generation_jobs
     where id = v_candidate.job_id
       and pack_run_id = v_pack.id
     for update;
    if not found
       or v_job.status <> 'running'
       or v_job.pack_attempt_key is null
       or v_job.output_object_key is distinct from
         (
           'private-results/' || v_job.created_by::text || '/' ||
           v_job.id::text || '.mp4'
         )
       or v_job.output_content_type is distinct from 'video/mp4'
       or v_job.output_byte_length is null
       or v_job.output_byte_length not between 32 and 67108864
       or v_job.output_sha256 is null
       or v_job.output_sha256 !~ '^[a-f0-9]{64}$'
       or v_job.model_id is distinct from
         'bytedance/seedance-2.0/fast/image-to-video'
       or v_job.duration_seconds is distinct from 5
       or v_job.resolution is distinct from '720p'
       or v_job.pack_child_key not in (
         'listing_spin', 'blind_box_reveal', 'social_flash'
       )
       or v_job.aspect_ratio is distinct from (
         case v_job.pack_child_key
           when 'listing_spin' then '1:1'
           when 'blind_box_reveal' then '9:16'
           when 'social_flash' then '9:16'
           else null
         end
       )
       or v_job.effect_slug is distinct from (
         case v_job.pack_child_key
           when 'listing_spin' then '360-spin-showcase'
           when 'blind_box_reveal' then 'blind-box-unboxing'
           when 'social_flash' then 'paparazzi-flash'
           else null
         end
       )
       or v_job.provider_request_id is null
       or length(btrim(v_job.provider_request_id)) = 0 then
      continue;
    end if;

    insert into public.seller_pack_reconciliations (
      job_id,
      attempt_key,
      pack_run_id,
      reservation_id,
      account_id,
      created_by,
      state,
      provider_outcome,
      provider_request_id,
      reason
    ) values (
      v_job.id,
      v_job.pack_attempt_key,
      v_pack.id,
      v_job.reservation_id,
      v_job.account_id,
      v_job.created_by,
      'capture_pending',
      'succeeded',
      v_job.provider_request_id,
      'worker_discovered_private_result'
    )
    on conflict (job_id, attempt_key) do nothing;

    select *
      into v_case
      from public.seller_pack_reconciliations
     where job_id = v_job.id
       and attempt_key = v_job.pack_attempt_key
     for update;

    if v_case.provider_outcome = 'failed'
       or v_case.state in ('release_pending', 'released') then
      update public.seller_pack_reconciliations
         set state = 'review_required',
             last_error = 'DISCOVERY_OUTCOME_CONFLICT',
             updated_at = now()
       where case_id = v_case.case_id;
      v_conflicted := v_conflicted + 1;
      continue;
    end if;

    update public.seller_pack_reconciliations
       set state = case
             when state = 'captured' then 'captured'
             else 'capture_pending'
           end,
           provider_outcome = 'succeeded',
           provider_request_id = v_job.provider_request_id,
           reason = coalesce(reason, 'worker_discovered_private_result'),
           last_error = null,
           updated_at = now()
     where case_id = v_case.case_id;
    v_discovered := v_discovered + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'discoveredCases', v_discovered,
    'conflictedCases', v_conflicted
  );
end;
$$;

-- Finish pending cases. Candidate selection is intentionally unlocked. Each
-- loop acquires pack -> job -> current-attempt case before calling the
-- idempotent 10-credit child finisher.
create or replace function public.pikbo_reconcile_seller_pack_cases_v1(
  p_limit integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_candidate record;
  v_pack public.seller_pack_runs%rowtype;
  v_job public.generation_jobs%rowtype;
  v_case public.seller_pack_reconciliations%rowtype;
  v_result jsonb;
  v_processed integer := 0;
  v_captured integer := 0;
  v_released integer := 0;
  v_failed integer := 0;
  v_limit integer := least(100, greatest(1, coalesce(p_limit, 25)));
begin
  for v_candidate in
    select case_id, pack_run_id, job_id, attempt_key
      from public.seller_pack_reconciliations
     where state in ('capture_pending', 'release_pending')
     order by updated_at, case_id
     limit v_limit
  loop
    select *
      into v_pack
      from public.seller_pack_runs
     where id = v_candidate.pack_run_id
     for update;
    if not found then
      continue;
    end if;

    select *
      into v_job
      from public.generation_jobs
     where id = v_candidate.job_id
       and pack_run_id = v_pack.id
     for update;
    if not found then
      continue;
    end if;

    select *
      into v_case
      from public.seller_pack_reconciliations
     where case_id = v_candidate.case_id
       and job_id = v_job.id
       and pack_run_id = v_pack.id
     for update;
    if not found
       or v_case.state not in ('capture_pending', 'release_pending') then
      continue;
    end if;
    if v_job.pack_attempt_key is null
       or v_job.pack_attempt_key is distinct from v_case.attempt_key then
      update public.seller_pack_reconciliations
         set state = 'review_required',
             last_error = 'ATTEMPT_SUPERSEDED',
             updated_at = now()
       where case_id = v_case.case_id;
      v_failed := v_failed + 1;
      continue;
    end if;

    update public.seller_pack_reconciliations
       set attempt_count = attempt_count + 1,
           last_error = null,
           updated_at = now()
     where case_id = v_case.case_id
     returning * into v_case;

    if v_case.state = 'capture_pending' then
      v_result := public.pikbo_settle_seller_pack_child_v2(
        v_case.created_by,
        v_case.pack_run_id,
        v_case.job_id,
        v_case.attempt_key,
        v_case.provider_request_id
      );
    else
      v_result := public.pikbo_release_seller_pack_child_v2(
        v_case.created_by,
        v_case.pack_run_id,
        v_case.job_id,
        v_case.attempt_key,
        coalesce(v_case.reason, 'confirmed_pre_output_failure')
      );
    end if;

    v_processed := v_processed + 1;
    if coalesce((v_result ->> 'ok')::boolean, false) then
      if v_case.state = 'capture_pending' then
        update public.seller_pack_reconciliations
           set state = 'captured',
               last_error = null,
               updated_at = now()
         where case_id = v_case.case_id;
        v_captured := v_captured + 1;
      else
        update public.seller_pack_reconciliations
           set state = 'released',
               last_error = null,
               updated_at = now()
         where case_id = v_case.case_id;
        v_released := v_released + 1;
      end if;
    else
      update public.seller_pack_reconciliations
         set last_error = left(
               coalesce(v_result ->> 'code', 'SETTLEMENT_RPC_FAILED'),
               160
             ),
             updated_at = now()
       where case_id = v_case.case_id;
      v_failed := v_failed + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'processedCases', v_processed,
    'capturedCases', v_captured,
    'releasedCases', v_released,
    'failedCases', v_failed
  );
end;
$$;

revoke all on function public.pikbo_record_seller_pack_outcome_v1(
  uuid, uuid, uuid, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.pikbo_discover_seller_pack_results_v1(integer)
  from public, anon, authenticated;
revoke all on function public.pikbo_reconcile_seller_pack_cases_v1(integer)
  from public, anon, authenticated;

grant execute on function public.pikbo_record_seller_pack_outcome_v1(
  uuid, uuid, uuid, text, text, text, text, text
) to service_role;
grant execute on function public.pikbo_discover_seller_pack_results_v1(integer)
  to service_role;
grant execute on function public.pikbo_reconcile_seller_pack_cases_v1(integer)
  to service_role;
