-- PIKBO R1c — durable generation settlement reconciliation.
-- SOURCE ONLY. Never apply directly to production.
--
-- Rehearse after the T5 and R1a migrations in a disposable/non-production
-- Supabase project. Provider output references live in a service-role-only
-- table so a withheld output cannot be fetched through generation_jobs RLS.

create table if not exists public.generation_reconciliations (
  job_id uuid primary key references public.generation_jobs (id) on delete cascade,
  reservation_id uuid not null unique
    references public.credit_reservations (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  state text not null default 'review_required' check (
    state in (
      'review_required',
      'provider_succeeded_output_withheld',
      'capture_pending',
      'release_pending',
      'captured',
      'released'
    )
  ),
  provider_outcome text not null default 'unknown' check (
    provider_outcome in ('unknown', 'succeeded', 'failed')
  ),
  provider_request_id text,
  output_ref text,
  reason text,
  lease_owner text,
  lease_token_hash text,
  lease_expires_at timestamptz,
  last_completion_token_hash text,
  last_completion_action text check (
    last_completion_action is null
    or last_completion_action in ('capture', 'release')
  ),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generation_reconciliations_claim_idx
  on public.generation_reconciliations (state, lease_expires_at, updated_at);

create table if not exists public.generation_reconciliation_events (
  event_id text primary key,
  job_id uuid not null
    references public.generation_reconciliations (job_id) on delete cascade,
  event_type text not null check (
    event_type in (
      'provider_succeeded',
      'confirmed_pre_output_failure',
      'settlement_unknown'
    )
  ),
  payload_sha256 text not null,
  state_after text not null,
  created_at timestamptz not null default now()
);

create index if not exists generation_reconciliation_events_job_idx
  on public.generation_reconciliation_events (job_id, created_at);

-- No authenticated policies are created. Even the owner must never read the
-- raw provider output_ref. Capture proves financial settlement only; a
-- separate T6 pipeline must create and verify a server-owned derivative.
alter table public.generation_reconciliations enable row level security;
alter table public.generation_reconciliation_events enable row level security;

revoke all on table public.generation_reconciliations
  from public, anon, authenticated;
revoke all on table public.generation_reconciliation_events
  from public, anon, authenticated;

comment on table public.generation_reconciliations is
  'Service-role-only settlement queue. Raw output_ref is never a public deliverable.';
comment on table public.generation_reconciliation_events is
  'Immutable idempotency facts for generation settlement reconciliation.';

create or replace function public.pikbo_record_generation_outcome_v1(
  p_user_id uuid,
  p_reservation_id uuid,
  p_job_id uuid,
  p_event_id text,
  p_event_type text,
  p_provider_request_id text default null,
  p_output_ref text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_reservation public.credit_reservations%rowtype;
  v_case public.generation_reconciliations%rowtype;
  v_event public.generation_reconciliation_events%rowtype;
  v_fingerprint text;
  v_next_state text;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
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
    into v_reservation
    from public.credit_reservations
   where id = p_reservation_id
     and created_by = p_user_id
   for update;
  if not found then
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

  insert into public.generation_reconciliations (
    job_id,
    reservation_id,
    account_id,
    created_by
  ) values (
    v_job.id,
    v_reservation.id,
    v_job.account_id,
    p_user_id
  )
  on conflict (job_id) do nothing;

  select *
    into v_case
    from public.generation_reconciliations
   where job_id = v_job.id
   for update;

  if v_case.reservation_id <> p_reservation_id
     or v_case.created_by <> p_user_id then
    return jsonb_build_object('ok', false, 'code', 'CASE_BINDING_MISMATCH');
  end if;

  v_fingerprint := encode(
    digest(
      jsonb_build_object(
        'eventId', btrim(p_event_id),
        'eventType', p_event_type,
        'providerRequestId', p_provider_request_id,
        'outputRef', p_output_ref,
        'reason', p_reason
      )::text,
      'sha256'
    ),
    'hex'
  );

  select *
    into v_event
    from public.generation_reconciliation_events
   where event_id = btrim(p_event_id);
  if found then
    if v_event.job_id <> p_job_id
       or v_event.payload_sha256 <> v_fingerprint then
      return jsonb_build_object('ok', false, 'code', 'EVENT_ID_CONFLICT');
    end if;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'jobId', v_case.job_id,
      'reservationId', v_case.reservation_id,
      'state', v_case.state,
      'providerOutcome', v_case.provider_outcome,
      'settlementCaptured', v_case.state = 'captured',
      -- R1c proves finance only. Raw provider output_ref is never deliverable;
      -- a later T6 verified server-owned derivative must gate delivery.
      'deliverable', false,
      'refundConfirmed', v_case.state = 'released'
    );
  end if;

  if p_event_type = 'provider_succeeded' then
    if v_reservation.status = 'released'
       or v_case.state = 'released'
       or v_case.provider_outcome = 'failed' then
      return jsonb_build_object('ok', false, 'code', 'SETTLEMENT_CONFLICT');
    end if;
    v_next_state := case
      when v_reservation.status = 'settled' then 'captured'
      when v_case.state = 'captured' then 'captured'
      when v_case.state = 'capture_pending' then 'capture_pending'
      else 'provider_succeeded_output_withheld'
    end;
    update public.generation_reconciliations
       set state = v_next_state,
           provider_outcome = 'succeeded',
           provider_request_id = coalesce(
             p_provider_request_id,
             provider_request_id
           ),
           output_ref = coalesce(p_output_ref, output_ref),
           updated_at = now()
     where job_id = v_case.job_id
     returning * into v_case;
  elsif p_event_type = 'confirmed_pre_output_failure' then
    if v_reservation.status = 'settled'
       or v_case.state = 'captured'
       or v_case.provider_outcome = 'succeeded' then
      return jsonb_build_object('ok', false, 'code', 'SETTLEMENT_CONFLICT');
    end if;
    v_next_state := case
      when v_reservation.status = 'released' then 'released'
      when v_case.state = 'released' then 'released'
      else 'release_pending'
    end;
    update public.generation_reconciliations
       set state = v_next_state,
           provider_outcome = 'failed',
           reason = left(
             coalesce(p_reason, 'confirmed_pre_output_failure'),
             160
           ),
           updated_at = now()
     where job_id = v_case.job_id
     returning * into v_case;
  else
    update public.generation_reconciliations
       set state = case
             when state in ('captured', 'released') then state
             else 'review_required'
           end,
           reason = left(coalesce(p_reason, reason, 'unknown'), 160),
           updated_at = now()
     where job_id = v_case.job_id
     returning * into v_case;
  end if;

  insert into public.generation_reconciliation_events (
    event_id,
    job_id,
    event_type,
    payload_sha256,
    state_after
  ) values (
    btrim(p_event_id),
    v_case.job_id,
    p_event_type,
    v_fingerprint,
    v_case.state
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'jobId', v_case.job_id,
    'reservationId', v_case.reservation_id,
    'state', v_case.state,
    'providerOutcome', v_case.provider_outcome,
    'settlementCaptured', v_case.state = 'captured',
    'deliverable', false,
    'refundConfirmed', v_case.state = 'released'
  );
end;
$$;

create or replace function public.pikbo_claim_generation_reconciliation_v1(
  p_worker_id text,
  p_lease_seconds integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_case public.generation_reconciliations%rowtype;
  v_token text;
  v_lease_seconds integer;
begin
  if p_worker_id is null
     or length(btrim(p_worker_id)) < 3
     or length(p_worker_id) > 120 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_WORKER_ID');
  end if;
  v_lease_seconds := greatest(15, least(coalesce(p_lease_seconds, 60), 300));

  select *
    into v_case
    from public.generation_reconciliations
   where state in (
       'provider_succeeded_output_withheld',
       'capture_pending',
       'release_pending'
     )
     and (lease_expires_at is null or lease_expires_at <= now())
   order by updated_at asc
   for update skip locked
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NO_CLAIMABLE_CASE');
  end if;

  v_token := gen_random_uuid()::text || gen_random_uuid()::text;
  update public.generation_reconciliations
     set state = case
           when state = 'provider_succeeded_output_withheld'
             then 'capture_pending'
           else state
         end,
         lease_owner = btrim(p_worker_id),
         lease_token_hash = encode(digest(v_token, 'sha256'), 'hex'),
         lease_expires_at = now() + make_interval(secs => v_lease_seconds),
         attempt_count = attempt_count + 1,
         updated_at = now()
   where job_id = v_case.job_id
   returning * into v_case;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'jobId', v_case.job_id,
    'reservationId', v_case.reservation_id,
    'userId', v_case.created_by,
    'state', v_case.state,
    'providerOutcome', v_case.provider_outcome,
    'providerRequestId', v_case.provider_request_id,
    'outputRef', v_case.output_ref,
    'reason', v_case.reason,
    'workerId', v_case.lease_owner,
    'leaseToken', v_token,
    'leaseExpiresAt', v_case.lease_expires_at,
    'attemptCount', v_case.attempt_count
  );
end;
$$;

create or replace function public.pikbo_finish_generation_reconciliation_v1(
  p_worker_id text,
  p_lease_token text,
  p_job_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_case public.generation_reconciliations%rowtype;
  v_token_hash text;
  v_result jsonb;
  v_terminal_state text;
begin
  if p_action not in ('capture', 'release') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_ACTION');
  end if;
  if p_lease_token is null or length(p_lease_token) < 32 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_LEASE');
  end if;
  v_token_hash := encode(digest(p_lease_token, 'sha256'), 'hex');

  select *
    into v_case
    from public.generation_reconciliations
   where job_id = p_job_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'CASE_NOT_FOUND');
  end if;

  -- Lost-response replay after a committed finish returns the terminal truth.
  if v_case.state in ('captured', 'released')
     and v_case.last_completion_token_hash = v_token_hash
     and v_case.last_completion_action = p_action then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'jobId', v_case.job_id,
      'reservationId', v_case.reservation_id,
      'state', v_case.state,
      'settlementCaptured', v_case.state = 'captured',
      'deliverable', false,
      'refundConfirmed', v_case.state = 'released'
    );
  end if;

  if v_case.lease_owner <> btrim(p_worker_id)
     or v_case.lease_token_hash <> v_token_hash
     or v_case.lease_expires_at is null
     or v_case.lease_expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'LEASE_INVALID');
  end if;

  if p_action = 'capture' then
    if v_case.state <> 'capture_pending'
       or v_case.provider_outcome <> 'succeeded'
       or v_case.output_ref is null then
      return jsonb_build_object('ok', false, 'code', 'CAPTURE_NOT_ALLOWED');
    end if;
    v_result := public.pikbo_capture_generation_v1(
      v_case.created_by,
      v_case.reservation_id,
      v_case.job_id,
      v_case.provider_request_id
    );
    v_terminal_state := 'captured';
  else
    if v_case.state <> 'release_pending'
       or v_case.provider_outcome <> 'failed' then
      return jsonb_build_object('ok', false, 'code', 'RELEASE_NOT_ALLOWED');
    end if;
    v_result := public.pikbo_release_generation_v1(
      v_case.created_by,
      v_case.reservation_id,
      v_case.job_id,
      coalesce(v_case.reason, 'confirmed_pre_output_failure')
    );
    v_terminal_state := 'released';
  end if;

  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    return jsonb_build_object(
      'ok', false,
      'code', coalesce(v_result ->> 'code', 'SETTLEMENT_RPC_FAILED'),
      'settlement', v_result
    );
  end if;

  update public.generation_reconciliations
     set state = v_terminal_state,
         lease_owner = null,
         lease_token_hash = null,
         lease_expires_at = null,
         last_completion_token_hash = v_token_hash,
         last_completion_action = p_action,
         updated_at = now()
   where job_id = v_case.job_id
   returning * into v_case;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'jobId', v_case.job_id,
    'reservationId', v_case.reservation_id,
    'state', v_case.state,
    'settlementCaptured', v_case.state = 'captured',
    'deliverable', false,
    'refundConfirmed', v_case.state = 'released',
    'availableCredits', v_result -> 'availableCredits',
    'reservedCredits', v_result -> 'reservedCredits'
  );
end;
$$;

revoke all on function public.pikbo_record_generation_outcome_v1(
  uuid, uuid, uuid, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.pikbo_claim_generation_reconciliation_v1(
  text, integer
) from public, anon, authenticated;
revoke all on function public.pikbo_finish_generation_reconciliation_v1(
  text, text, uuid, text
) from public, anon, authenticated;

grant execute on function public.pikbo_record_generation_outcome_v1(
  uuid, uuid, uuid, text, text, text, text, text
) to service_role;
grant execute on function public.pikbo_claim_generation_reconciliation_v1(
  text, integer
) to service_role;
grant execute on function public.pikbo_finish_generation_reconciliation_v1(
  text, text, uuid, text
) to service_role;
