-- PIKBO T6 — durable server-owned watermarked derivatives.
-- SOURCE ONLY. Apply only after T5, R1a and R1c in a disposable project.
--
-- Raw provider output_ref remains service-role-only. A customer-visible
-- deliverable exists only after a leased worker writes an owned object and
-- commits verified hash/ffprobe facts through the finish RPC.

create table if not exists public.generation_derivatives (
  job_id uuid primary key
    references public.generation_jobs (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  provider_request_id text not null,
  source_ref text,
  status text not null default 'queued' check (
    status in ('queued', 'running', 'succeeded', 'failed')
  ),
  idempotency_key text not null unique,
  object_key text not null unique check (
    object_key ~ '^t6-baked/[a-f0-9]{64}\.mp4$'
  ),
  delivery_path text unique check (
    delivery_path is null
    or delivery_path ~ '^/api/t6-derivatives/[a-f0-9]{64}\.mp4$'
  ),
  content_type text check (
    content_type is null or content_type = 'video/mp4'
  ),
  source_checksum text check (
    source_checksum is null or source_checksum ~ '^[a-f0-9]{64}$'
  ),
  output_checksum text check (
    output_checksum is null or output_checksum ~ '^[a-f0-9]{64}$'
  ),
  source_probe jsonb,
  output_probe jsonb,
  error_code text,
  lease_owner text,
  lease_token_hash text,
  lease_expires_at timestamptz,
  last_completion_token_hash text,
  last_completion_action text check (
    last_completion_action is null
    or last_completion_action in ('success', 'failure')
  ),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generation_derivatives_claim_idx
  on public.generation_derivatives (status, lease_expires_at, updated_at);

alter table public.generation_derivatives enable row level security;
revoke all on table public.generation_derivatives
  from public, anon, authenticated;

comment on table public.generation_derivatives is
  'Service-role-only T6 queue. source_ref is private and never a deliverable.';

create or replace function public.pikbo_enqueue_t6_derivative_v1(
  p_user_id uuid,
  p_job_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_account public.accounts%rowtype;
  v_case public.generation_reconciliations%rowtype;
  v_row public.generation_derivatives%rowtype;
  v_idempotency_key text;
  v_object_key text;
  v_insert_count integer;
begin
  select *
    into v_job
    from public.generation_jobs
   where id = p_job_id
     and created_by = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'JOB_NOT_FOUND');
  end if;

  select *
    into v_account
    from public.accounts
   where id = v_job.account_id
   for update;
  if not found or v_account.plan_id::text <> 'free' then
    return jsonb_build_object(
      'ok', false,
      'code', 'FREE_WATERMARK_JOB_REQUIRED'
    );
  end if;

  select *
    into v_case
    from public.generation_reconciliations
   where job_id = p_job_id
   for update;
  if not found
     or v_case.state <> 'captured'
     or v_case.provider_outcome <> 'succeeded'
     or v_case.provider_request_id is null
     or v_case.output_ref is null
     or v_job.status::text <> 'succeeded'
     or v_job.provider_request_id is distinct from
        v_case.provider_request_id then
    return jsonb_build_object(
      'ok', false,
      'code', 'CAPTURED_OUTPUT_NOT_AVAILABLE'
    );
  end if;

  v_idempotency_key :=
    't6-bake:' ||
    encode(
      extensions.digest(
        v_job.id::text || ':' || v_case.provider_request_id,
        'sha256'
      ),
      'hex'
    );
  v_object_key :=
    't6-baked/' ||
    encode(extensions.digest(v_idempotency_key, 'sha256'), 'hex') ||
    '.mp4';

  insert into public.generation_derivatives (
    job_id,
    account_id,
    created_by,
    provider_request_id,
    source_ref,
    status,
    idempotency_key,
    object_key
  ) values (
    v_job.id,
    v_job.account_id,
    v_job.created_by,
    v_case.provider_request_id,
    v_case.output_ref,
    'queued',
    v_idempotency_key,
    v_object_key
  )
  on conflict (job_id) do nothing;
  get diagnostics v_insert_count = row_count;

  select *
    into v_row
    from public.generation_derivatives
   where job_id = p_job_id
   for update;

  if v_row.created_by <> p_user_id
     or v_row.provider_request_id <> v_case.provider_request_id
     or v_row.idempotency_key <> v_idempotency_key
     or v_row.object_key <> v_object_key then
    return jsonb_build_object('ok', false, 'code', 'DERIVATIVE_IDENTITY_MISMATCH');
  end if;

  return jsonb_build_object(
    'ok', true,
    'idempotent', v_insert_count = 0,
    'jobId', v_row.job_id,
    'state', v_row.status,
    'deliverable', v_row.status = 'succeeded',
    'deliveryPath', case
      when v_row.status = 'succeeded' then v_row.delivery_path
      else null
    end,
    'refundConfirmed', false
  );
end;
$$;

create or replace function public.pikbo_claim_t6_derivative_v1(
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.generation_derivatives%rowtype;
  v_token text;
  v_lease_seconds integer;
begin
  if p_worker_id is null
     or length(btrim(p_worker_id)) < 3
     or length(p_worker_id) > 120 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_WORKER_ID');
  end if;
  v_lease_seconds :=
    greatest(30, least(coalesce(p_lease_seconds, 120), 600));

  select *
    into v_row
    from public.generation_derivatives
   where status in ('queued', 'running')
     and source_ref is not null
     and (lease_expires_at is null or lease_expires_at <= now())
   order by updated_at asc
   for update skip locked
   limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NO_CLAIMABLE_DERIVATIVE');
  end if;

  v_token := gen_random_uuid()::text || gen_random_uuid()::text;
  update public.generation_derivatives
     set status = 'running',
         lease_owner = btrim(p_worker_id),
         lease_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
         lease_expires_at = now() + make_interval(secs => v_lease_seconds),
         attempt_count = attempt_count + 1,
         updated_at = now()
   where job_id = v_row.job_id
   returning * into v_row;

  -- sourceRef is returned only by this service-role worker RPC.
  return jsonb_build_object(
    'ok', true,
    'jobId', v_row.job_id,
    'userId', v_row.created_by,
    'providerRequestId', v_row.provider_request_id,
    'sourceRef', v_row.source_ref,
    'idempotencyKey', v_row.idempotency_key,
    'objectKey', v_row.object_key,
    'leaseToken', v_token,
    'leaseExpiresAt', v_row.lease_expires_at,
    'attemptCount', v_row.attempt_count
  );
end;
$$;

create or replace function public.pikbo_finish_t6_derivative_v1(
  p_worker_id text,
  p_lease_token text,
  p_job_id uuid,
  p_action text,
  p_content_type text default null,
  p_source_checksum text default null,
  p_output_checksum text default null,
  p_source_probe jsonb default null,
  p_output_probe jsonb default null,
  p_delivery_path text default null,
  p_error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.generation_derivatives%rowtype;
  v_token_hash text;
  v_expected_path text;
  v_source_duration numeric;
  v_output_duration numeric;
begin
  if p_action not in ('success', 'failure') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_ACTION');
  end if;
  if p_lease_token is null or length(p_lease_token) < 32 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_LEASE');
  end if;
  v_token_hash := encode(extensions.digest(p_lease_token, 'sha256'), 'hex');

  select *
    into v_row
    from public.generation_derivatives
   where job_id = p_job_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'DERIVATIVE_NOT_FOUND');
  end if;

  if v_row.status in ('succeeded', 'failed')
     and v_row.last_completion_token_hash = v_token_hash
     and v_row.last_completion_action = p_action then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'jobId', v_row.job_id,
      'state', v_row.status,
      'deliverable', v_row.status = 'succeeded',
      'deliveryPath', case
        when v_row.status = 'succeeded' then v_row.delivery_path
        else null
      end,
      'refundConfirmed', false
    );
  end if;

  if v_row.status <> 'running'
     or v_row.lease_owner <> btrim(p_worker_id)
     or v_row.lease_token_hash <> v_token_hash
     or v_row.lease_expires_at is null
     or v_row.lease_expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'LEASE_INVALID');
  end if;

  if p_action = 'success' then
    v_expected_path :=
      '/api/t6-derivatives/' ||
      substring(v_row.object_key from
        '^t6-baked/([a-f0-9]{64})\.mp4$') ||
      '.mp4';
    if p_content_type is distinct from 'video/mp4'
       or p_source_checksum is null
       or p_source_checksum !~ '^[a-f0-9]{64}$'
       or p_output_checksum is null
       or p_output_checksum !~ '^[a-f0-9]{64}$'
       or p_source_checksum = p_output_checksum
       or p_delivery_path is distinct from v_expected_path
       or jsonb_typeof(p_source_probe) is distinct from 'object'
       or jsonb_typeof(p_output_probe) is distinct from 'object'
       or jsonb_typeof(p_source_probe -> 'durationSeconds')
          is distinct from 'number'
       or jsonb_typeof(p_output_probe -> 'durationSeconds')
          is distinct from 'number'
       or jsonb_typeof(p_source_probe -> 'width')
          is distinct from 'number'
       or jsonb_typeof(p_source_probe -> 'height')
          is distinct from 'number'
       or jsonb_typeof(p_output_probe -> 'width')
          is distinct from 'number'
       or jsonb_typeof(p_output_probe -> 'height')
          is distinct from 'number'
       or jsonb_typeof(p_output_probe -> 'bakedMarkSignal')
          is distinct from 'boolean'
       or coalesce((p_output_probe ->> 'bakedMarkSignal')::boolean, false)
          is not true
       or jsonb_typeof(p_output_probe -> 'pixelProof')
          is distinct from 'object'
       or coalesce(
            p_output_probe -> 'pixelProof' ->> 'algorithm',
            ''
          ) <> 'decoded-roi-diff-v1'
       or jsonb_typeof(
            p_output_probe -> 'pixelProof' -> 'watermarkDetected'
          ) is distinct from 'boolean'
       or coalesce(
            (
              p_output_probe -> 'pixelProof' ->> 'watermarkDetected'
            )::boolean,
            false
          ) is not true
       or jsonb_typeof(
            p_output_probe -> 'pixelProof' -> 'sampledFrames'
          ) is distinct from 'number'
       or jsonb_typeof(
            p_output_probe -> 'pixelProof' -> 'sampledPixels'
          ) is distinct from 'number'
       or jsonb_typeof(
            p_output_probe -> 'pixelProof' -> 'overlayMeanDelta'
          ) is distinct from 'number'
       or jsonb_typeof(
            p_output_probe -> 'pixelProof' -> 'controlMeanDelta'
          ) is distinct from 'number'
       or jsonb_typeof(
            p_output_probe -> 'pixelProof' -> 'overlayChangedRatio'
          ) is distinct from 'number'
       or jsonb_typeof(
            p_output_probe -> 'pixelProof' -> 'controlChangedRatio'
          ) is distinct from 'number'
       or jsonb_typeof(
            p_output_probe -> 'pixelProof' -> 'overlayPeakDelta'
          ) is distinct from 'number'
       or jsonb_typeof(
            p_output_probe -> 'pixelProof' -> 'region'
          ) is distinct from 'object'
       or jsonb_typeof(
            p_output_probe -> 'pixelProof' -> 'region' -> 'x'
          ) is distinct from 'number'
       or jsonb_typeof(
            p_output_probe -> 'pixelProof' -> 'region' -> 'y'
          ) is distinct from 'number'
       or jsonb_typeof(
            p_output_probe -> 'pixelProof' -> 'region' -> 'width'
          ) is distinct from 'number'
       or jsonb_typeof(
            p_output_probe -> 'pixelProof' -> 'region' -> 'height'
          ) is distinct from 'number'
       or coalesce(p_source_probe ->> 'formatName', '') !~* '(mp4|mov)'
       or coalesce(p_output_probe ->> 'formatName', '') !~* '(mp4|mov)'
       or coalesce(p_source_probe ->> 'videoCodec', '') = ''
       or coalesce(p_output_probe ->> 'videoCodec', '') = '' then
      return jsonb_build_object(
        'ok', false,
        'code', 'DERIVATIVE_PROOF_INVALID'
      );
    end if;
    v_source_duration := (p_source_probe ->> 'durationSeconds')::numeric;
    v_output_duration := (p_output_probe ->> 'durationSeconds')::numeric;
    if v_source_duration <= 0
       or v_output_duration <= 0
       or (p_source_probe ->> 'width')::integer not between 16 and 8192
       or (p_source_probe ->> 'height')::integer not between 16 and 8192
       or (p_output_probe ->> 'width')::integer not between 16 and 8192
       or (p_output_probe ->> 'height')::integer not between 16 and 8192
       or (p_source_probe ->> 'width')::integer
          <> (p_output_probe ->> 'width')::integer
       or (p_source_probe ->> 'height')::integer
          <> (p_output_probe ->> 'height')::integer
       or abs(v_source_duration - v_output_duration)
          > greatest(0.25, v_source_duration * 0.03)
       or (p_output_probe -> 'pixelProof' ->> 'sampledFrames')::integer
          not between 1 and 12
       or (p_output_probe -> 'pixelProof' ->> 'sampledPixels')::integer
          < 1024
       or (p_output_probe -> 'pixelProof' ->> 'overlayMeanDelta')::numeric
          < 3
       or (
            p_output_probe -> 'pixelProof' ->> 'overlayChangedRatio'
          )::numeric < 0.01
       or (p_output_probe -> 'pixelProof' ->> 'overlayPeakDelta')::numeric
          < 12
       or (p_output_probe -> 'pixelProof' ->> 'overlayMeanDelta')::numeric
          < (
              p_output_probe -> 'pixelProof' ->> 'controlMeanDelta'
            )::numeric + 1.5
       or (
            p_output_probe -> 'pixelProof' ->> 'overlayChangedRatio'
          )::numeric
          < (
              p_output_probe -> 'pixelProof' ->> 'controlChangedRatio'
            )::numeric + 0.005
       or (p_output_probe -> 'pixelProof' -> 'region' ->> 'x')::integer
          < 0
       or (p_output_probe -> 'pixelProof' -> 'region' ->> 'y')::integer
          < 0
       or (
            p_output_probe -> 'pixelProof' -> 'region' ->> 'width'
          )::integer < 1
       or (
            p_output_probe -> 'pixelProof' -> 'region' ->> 'height'
          )::integer < 1 then
      return jsonb_build_object(
        'ok', false,
        'code', 'DERIVATIVE_MEDIA_MISMATCH'
      );
    end if;

    update public.generation_derivatives
       set status = 'succeeded',
           source_ref = null,
           delivery_path = p_delivery_path,
           content_type = p_content_type,
           source_checksum = p_source_checksum,
           output_checksum = p_output_checksum,
           source_probe = p_source_probe,
           output_probe = p_output_probe,
           error_code = null,
           lease_owner = null,
           lease_token_hash = null,
           lease_expires_at = null,
           last_completion_token_hash = v_token_hash,
           last_completion_action = p_action,
           updated_at = now()
     where job_id = v_row.job_id
     returning * into v_row;
  else
    update public.generation_derivatives
       set status = 'failed',
           error_code = left(coalesce(p_error_code, 'BAKE_FAILED'), 120),
           lease_owner = null,
           lease_token_hash = null,
           lease_expires_at = null,
           last_completion_token_hash = v_token_hash,
           last_completion_action = p_action,
           updated_at = now()
     where job_id = v_row.job_id
     returning * into v_row;
  end if;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'jobId', v_row.job_id,
    'state', v_row.status,
    'deliverable', v_row.status = 'succeeded',
    'deliveryPath', case
      when v_row.status = 'succeeded' then v_row.delivery_path
      else null
    end,
    'refundConfirmed', false
  );
end;
$$;

revoke all on function public.pikbo_enqueue_t6_derivative_v1(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.pikbo_claim_t6_derivative_v1(text, integer)
  from public, anon, authenticated;
revoke all on function public.pikbo_finish_t6_derivative_v1(
  text, text, uuid, text, text, text, text, jsonb, jsonb, text, text
) from public, anon, authenticated;

grant execute on function public.pikbo_enqueue_t6_derivative_v1(uuid, uuid)
  to service_role;
grant execute on function public.pikbo_claim_t6_derivative_v1(text, integer)
  to service_role;
grant execute on function public.pikbo_finish_t6_derivative_v1(
  text, text, uuid, text, text, text, text, jsonb, jsonb, text, text
) to service_role;
