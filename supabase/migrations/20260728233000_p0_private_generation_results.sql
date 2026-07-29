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
      output_object_key is not null
      and output_object_key ~
        ('^private-results/' || created_by::text ||
         '/[0-9a-f-]{36}\.mp4$')
      and output_content_type is not null
      and output_content_type = 'video/mp4'
      and output_byte_length is not null
      and output_byte_length between 32 and 67108864
      and output_sha256 is not null
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

-- Forward migration: an already-rehearsed Preview may have applied R1a while
-- that function rejected every Free account. Replacing the old migration file
-- is insufficient because applied migrations are not replayed.
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

  select *
    into v_account
    from public.accounts
   where owner_user_id = p_user_id
     and kind = 'personal'
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'DURABLE_WALLET_NOT_FOUND');
  end if;

  select *
    into v_wallet
    from public.credit_wallets
   where account_id = v_account.id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'DURABLE_WALLET_NOT_FOUND');
  end if;
  -- Public routing still blocks Free. This atomic layer authorizes only an
  -- account explicitly flipped by the owner in the non-production project.
  if v_account.status <> 'active'
     or not v_account.live_generation_allowed then
    return jsonb_build_object('ok', false, 'code', 'LIVE_ACCESS_REQUIRED');
  end if;

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

revoke all on function public.pikbo_reserve_generation_v1(
  uuid, text, text, integer
) from public, anon, authenticated;

grant execute on function public.pikbo_reserve_generation_v1(
  uuid, text, text, integer
) to service_role;
