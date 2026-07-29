-- Fence every Pack output and accounting transition to the exact provider
-- attempt. Logical Pack jobs survive retries, so job_id alone is not authority.

create or replace function public.pikbo_attach_private_generation_output_v2(
  p_user_id uuid,
  p_job_id uuid,
  p_provider_request_id text,
  p_object_key text,
  p_content_type text,
  p_byte_length bigint,
  p_sha256 text,
  p_model_id text,
  p_duration_seconds integer,
  p_aspect_ratio text,
  p_resolution text,
  p_attempt_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_expected_key text;
begin
  if p_user_id is null or p_job_id is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_IDENTITY');
  end if;
  v_expected_key :=
    'private-results/' || p_user_id::text || '/' || p_job_id::text || '.mp4';
  if p_object_key is distinct from v_expected_key
     or p_content_type is distinct from 'video/mp4'
     or p_byte_length is null
     or p_byte_length not between 32 and 67108864
     or p_sha256 is null
     or p_sha256 !~ '^[a-f0-9]{64}$'
     or p_provider_request_id is null
     or length(btrim(p_provider_request_id)) = 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_OUTPUT');
  end if;

  select *
    into v_job
    from public.generation_jobs
   where id = p_job_id
     and created_by = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'JOB_NOT_FOUND');
  end if;
  if v_job.status::text <> 'running' then
    return jsonb_build_object('ok', false, 'code', 'JOB_NOT_RUNNING');
  end if;

  if v_job.pack_run_id is not null then
    if p_attempt_key is null
       or length(btrim(p_attempt_key)) < 8
       or v_job.pack_attempt_key is distinct from btrim(p_attempt_key) then
      return jsonb_build_object('ok', false, 'code', 'ATTEMPT_MISMATCH');
    end if;
    if p_model_id is distinct from
         'bytedance/seedance-2.0/fast/image-to-video'
       or p_duration_seconds is distinct from 5
       or p_resolution is distinct from '720p'
       or p_aspect_ratio is distinct from v_job.aspect_ratio then
      return jsonb_build_object(
        'ok', false, 'code', 'PACK_CHILD_OUTPUT_CONTRACT_MISMATCH'
      );
    end if;
  elsif p_attempt_key is not null then
    return jsonb_build_object('ok', false, 'code', 'UNEXPECTED_ATTEMPT_KEY');
  end if;

  if v_job.output_object_key is not null then
    if v_job.output_object_key = p_object_key
       and v_job.output_content_type = p_content_type
       and v_job.output_byte_length = p_byte_length
       and v_job.output_sha256 = p_sha256
       and v_job.provider_request_id = p_provider_request_id then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'jobId', v_job.id,
        'objectKey', v_job.output_object_key,
        'attemptKey', v_job.pack_attempt_key
      );
    end if;
    return jsonb_build_object('ok', false, 'code', 'OUTPUT_CONFLICT');
  end if;

  update public.generation_jobs
     set provider = 'bytedance-seedance',
         provider_request_id = btrim(p_provider_request_id),
         output_object_key = p_object_key,
         output_content_type = p_content_type,
         output_byte_length = p_byte_length,
         output_sha256 = p_sha256,
         model_id = left(coalesce(p_model_id, 'unknown'), 160),
         duration_seconds = p_duration_seconds,
         aspect_ratio = left(coalesce(p_aspect_ratio, '1:1'), 16),
         resolution = left(coalesce(p_resolution, '480p'), 32)
   where id = v_job.id
   returning * into v_job;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'jobId', v_job.id,
    'objectKey', v_job.output_object_key,
    'attemptKey', v_job.pack_attempt_key
  );
end;
$$;

-- Historical no-attempt entry points remain only as fail-closed tombstones.
create or replace function public.pikbo_attach_private_generation_output_v1(
  p_user_id uuid,
  p_job_id uuid,
  p_provider_request_id text,
  p_object_key text,
  p_content_type text,
  p_byte_length bigint,
  p_sha256 text,
  p_model_id text,
  p_duration_seconds integer,
  p_aspect_ratio text,
  p_resolution text
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'ok', false, 'code', 'ATTEMPT_FENCE_V2_REQUIRED'
  );
$$;

create or replace function public.pikbo_settle_seller_pack_child_v1(
  p_user_id uuid,
  p_pack_run_id uuid,
  p_job_id uuid,
  p_provider_request_id text default null
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'ok', false, 'code', 'ATTEMPT_FENCE_V2_REQUIRED'
  );
$$;

create or replace function public.pikbo_release_seller_pack_child_v1(
  p_user_id uuid,
  p_pack_run_id uuid,
  p_job_id uuid,
  p_reason text default 'child_failed'
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'ok', false, 'code', 'ATTEMPT_FENCE_V2_REQUIRED'
  );
$$;

revoke all on function public.pikbo_attach_private_generation_output_v1(
  uuid, uuid, text, text, text, bigint, text, text, integer, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.pikbo_settle_seller_pack_child_v1(
  uuid, uuid, uuid, text
) from public, anon, authenticated, service_role;
revoke all on function public.pikbo_release_seller_pack_child_v1(
  uuid, uuid, uuid, text
) from public, anon, authenticated, service_role;

revoke all on function public.pikbo_attach_private_generation_output_v2(
  uuid, uuid, text, text, text, bigint, text, text, integer, text, text, text
) from public, anon, authenticated;
grant execute on function public.pikbo_attach_private_generation_output_v2(
  uuid, uuid, text, text, text, bigint, text, text, integer, text, text, text
) to service_role;

comment on function public.pikbo_attach_private_generation_output_v2 is
  'Owner/job/attempt-fenced private output attachment. Pack outputs must match the fixed Fast 720p 5s contract.';
