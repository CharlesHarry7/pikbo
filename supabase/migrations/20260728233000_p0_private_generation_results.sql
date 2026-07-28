-- PIKBO P0 private Preview delivery.
-- SOURCE ONLY. Apply after T5 + R1a in a non-production Supabase project.
--
-- This keeps the public Free/T6 path closed. An explicitly allowed signed-in
-- Preview tester may spend the one durable Free allowance, while the provider
-- output is copied into a private Pikbo-owned bucket before credits settle.

alter table public.generation_jobs
  add column if not exists output_object_key text,
  add column if not exists output_content_type text,
  add column if not exists output_byte_length bigint,
  add column if not exists output_sha256 text,
  add column if not exists model_id text,
  add column if not exists duration_seconds integer,
  add column if not exists aspect_ratio text,
  add column if not exists resolution text;

alter table public.generation_jobs
  drop constraint if exists generation_jobs_private_output_shape;

alter table public.generation_jobs
  add constraint generation_jobs_private_output_shape check (
    (
      output_object_key is null
      and output_content_type is null
      and output_byte_length is null
      and output_sha256 is null
    )
    or (
      output_object_key ~
        ('^private-results/' || created_by::text ||
         '/[0-9a-f-]{36}\.mp4$')
      and output_content_type = 'video/mp4'
      and output_byte_length between 32 and 67108864
      and output_sha256 ~ '^[a-f0-9]{64}$'
    )
  );

create unique index if not exists generation_jobs_output_object_uidx
  on public.generation_jobs (output_object_key)
  where output_object_key is not null;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'pikbo-private-results',
  'pikbo-private-results',
  false,
  67108864,
  array['video/mp4']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- No browser-role storage policy is created for this bucket. The service role
-- creates short-lived signed URLs only after Bearer owner verification.

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
  if v_job.output_object_key is not null then
    if v_job.output_object_key = p_object_key
       and v_job.output_sha256 = p_sha256
       and v_job.provider_request_id = p_provider_request_id then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'jobId', v_job.id,
        'objectKey', v_job.output_object_key
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
    'objectKey', v_job.output_object_key
  );
end;
$$;

revoke all on function public.pikbo_attach_private_generation_output_v1(
  uuid, uuid, text, text, text, bigint, text, text, integer, text, text
) from public, anon, authenticated;

grant execute on function public.pikbo_attach_private_generation_output_v1(
  uuid, uuid, text, text, text, bigint, text, text, integer, text, text
) to service_role;
