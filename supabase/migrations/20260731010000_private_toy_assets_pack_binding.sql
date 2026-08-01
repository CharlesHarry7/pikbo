-- P0 durable private input binding.
--
-- One authenticated owner uploads one private toy still, then the existing
-- atomic 30-credit Seller Pack binds that exact asset to its three fixed jobs.
-- This is a forward-only extension: the proven settle/release/retry accounting
-- functions remain unchanged.

create table if not exists public.toy_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  client_asset_key text not null,
  object_key text not null unique,
  sha256 text not null,
  mime_type text not null,
  size_bytes bigint not null,
  sku_label text,
  state text not null default 'pending',
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  constraint toy_assets_client_key_length
    check (
      client_asset_key = btrim(client_asset_key)
      and length(client_asset_key) between 8 and 128
    ),
  constraint toy_assets_object_key_shape
    check (
      object_key =
        owner_user_id::text || '/' || id::text || '/source.' ||
        case mime_type
          when 'image/jpeg' then 'jpg'
          when 'image/png' then 'png'
          when 'image/webp' then 'webp'
          else 'invalid'
        end
    ),
  constraint toy_assets_sha256
    check (sha256 ~ '^[0-9a-f]{64}$'),
  constraint toy_assets_mime
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint toy_assets_size
    check (size_bytes between 32 and 8388608),
  constraint toy_assets_sku_label
    check (sku_label is null or length(sku_label) <= 120),
  constraint toy_assets_state
    check (state in ('pending', 'ready', 'rejected', 'deleted')),
  constraint toy_assets_verified_state
    check (
      (state = 'ready' and verified_at is not null)
      or (state <> 'ready')
    )
);

create unique index if not exists toy_assets_owner_client_key_uidx
  on public.toy_assets (owner_user_id, client_asset_key);

create unique index if not exists toy_assets_id_owner_uidx
  on public.toy_assets (id, owner_user_id);

create index if not exists toy_assets_owner_created_idx
  on public.toy_assets (owner_user_id, created_at desc);

alter table public.toy_assets enable row level security;
revoke all on table public.toy_assets from public, anon, authenticated;

comment on table public.toy_assets is
  'Private, service-owned input metadata. Browser clients never receive object_key.';
comment on column public.toy_assets.sha256 is
  'Server-verified SHA-256 of the exact uploaded bytes; immutable after ready.';

-- Signed uploads target this non-public bucket. No browser storage policy is
-- installed: upload is possible only through a short-lived signed token and
-- every read/complete operation stays on the service-role server.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'pikbo-private-inputs',
  'pikbo-private-inputs',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

alter table public.seller_pack_runs
  add column if not exists input_asset_id uuid
    references public.toy_assets (id) on delete restrict,
  add column if not exists rights_confirmed_at timestamptz;

alter table public.generation_jobs
  add column if not exists input_asset_id uuid
    references public.toy_assets (id) on delete restrict;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'seller_pack_runs_input_owner_fkey'
       and conrelid = 'public.seller_pack_runs'::regclass
  ) then
    alter table public.seller_pack_runs
      add constraint seller_pack_runs_input_owner_fkey
      foreign key (input_asset_id, created_by)
      references public.toy_assets (id, owner_user_id)
      on delete restrict;
  end if;
  if not exists (
    select 1
      from pg_constraint
     where conname = 'generation_jobs_input_owner_fkey'
       and conrelid = 'public.generation_jobs'::regclass
  ) then
    alter table public.generation_jobs
      add constraint generation_jobs_input_owner_fkey
      foreign key (input_asset_id, created_by)
      references public.toy_assets (id, owner_user_id)
      on delete restrict;
  end if;
end;
$$;

create index if not exists seller_pack_runs_owner_input_idx
  on public.seller_pack_runs (created_by, input_asset_id, created_at desc);

create unique index if not exists seller_pack_runs_id_owner_input_uidx
  on public.seller_pack_runs (id, created_by, input_asset_id);

create index if not exists generation_jobs_pack_input_idx
  on public.generation_jobs (pack_run_id, input_asset_id);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'seller_pack_runs_input_rights_check'
       and conrelid = 'public.seller_pack_runs'::regclass
  ) then
    alter table public.seller_pack_runs
      add constraint seller_pack_runs_input_rights_check
      check (
        (input_asset_id is null and rights_confirmed_at is null)
        or
        (input_asset_id is not null and rights_confirmed_at is not null)
      );
  end if;
  if not exists (
    select 1
      from pg_constraint
     where conname = 'generation_jobs_pack_owner_input_fkey'
       and conrelid = 'public.generation_jobs'::regclass
  ) then
    alter table public.generation_jobs
      add constraint generation_jobs_pack_owner_input_fkey
      foreign key (pack_run_id, created_by, input_asset_id)
      references public.seller_pack_runs (id, created_by, input_asset_id)
      on delete restrict;
  end if;
end;
$$;

-- Input identity is immutable from creation. Ready/rejected/deleted are
-- terminal states; a future retention flow must prove no Pack dependency
-- before changing this contract.
create or replace function public.pikbo_guard_ready_toy_asset_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.owner_user_id is distinct from old.owner_user_id
     or new.object_key is distinct from old.object_key
     or new.sha256 is distinct from old.sha256
     or new.mime_type is distinct from old.mime_type
     or new.size_bytes is distinct from old.size_bytes
     or new.client_asset_key is distinct from old.client_asset_key then
    raise exception 'TOY_ASSET_IDENTITY_IMMUTABLE';
  end if;
  if old.state in ('ready', 'rejected', 'deleted')
     and new.state is distinct from old.state then
    raise exception 'TOY_ASSET_STATE_TERMINAL';
  end if;
  if old.verified_at is not null
     and new.verified_at is distinct from old.verified_at then
    raise exception 'TOY_ASSET_VERIFICATION_IMMUTABLE';
  end if;
  if new.state <> 'ready' and new.verified_at is not null then
    raise exception 'TOY_ASSET_INVALID_VERIFICATION_STATE';
  end if;
  return new;
end;
$$;

drop trigger if exists pikbo_guard_ready_toy_asset_v1
  on public.toy_assets;
create trigger pikbo_guard_ready_toy_asset_v1
before update on public.toy_assets
for each row execute function public.pikbo_guard_ready_toy_asset_v1();

-- Any Pack job state transition must retain the exact Pack input. This blocks
-- the legacy unbound reserve path from reaching provider authorization even if
-- a server caller accidentally invokes it after this migration.
create or replace function public.pikbo_enforce_pack_input_binding_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pack_input uuid;
  v_pack_owner uuid;
  v_pack_found boolean;
begin
  if old.pack_run_id is null and new.pack_run_id is null then
    return new;
  end if;
  if new.pack_run_id is null
     or new.pack_run_id is distinct from old.pack_run_id
     or new.created_by is distinct from old.created_by
     or (
       old.input_asset_id is not null
       and new.input_asset_id is distinct from old.input_asset_id
     ) then
    raise exception 'PACK_JOB_IDENTITY_IMMUTABLE';
  end if;

  select input_asset_id, created_by
    into v_pack_input, v_pack_owner
    from public.seller_pack_runs
   where id = new.pack_run_id;
  v_pack_found := found;

  if not v_pack_found
     or v_pack_input is null
     or new.input_asset_id is null
     or new.input_asset_id <> v_pack_input
     or new.created_by <> v_pack_owner then
    -- A pre-migration unbound child may only move to failed so its held
    -- credits can be released. It may not rewrite any binding/provider field.
    if not (
      v_pack_found
      and v_pack_input is null
      and old.input_asset_id is null
      and new.input_asset_id is null
      and old.pack_run_id is not distinct from new.pack_run_id
      and old.created_by is not distinct from new.created_by
      and old.status::text <> 'failed'
      and new.status::text = 'failed'
      and old.pack_attempt_key is not distinct from new.pack_attempt_key
      and old.provider_request_id is not distinct from new.provider_request_id
      and old.output_object_key is not distinct from new.output_object_key
    ) then
      raise exception 'PACK_INPUT_BINDING_MISMATCH';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists pikbo_enforce_pack_input_binding_v1
  on public.generation_jobs;
create trigger pikbo_enforce_pack_input_binding_v1
before update of
  status,
  pack_attempt_key,
  provider_request_id,
  output_object_key,
  input_asset_id,
  created_by,
  pack_run_id
on public.generation_jobs
for each row execute function public.pikbo_enforce_pack_input_binding_v1();

-- Idempotently create the pending metadata record. Only application
-- service-role code receives objectKey so it can mint the signed upload URL.
create or replace function public.pikbo_create_toy_asset_v1(
  p_user_id uuid,
  p_client_asset_key text,
  p_sha256 text,
  p_mime_type text,
  p_size_bytes bigint,
  p_sku_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_asset public.toy_assets%rowtype;
  v_asset_id uuid := gen_random_uuid();
  v_extension text;
  v_sku text := nullif(left(btrim(coalesce(p_sku_label, '')), 120), '');
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  end if;
  if p_client_asset_key is null
     or p_client_asset_key <> btrim(p_client_asset_key)
     or length(p_client_asset_key) not between 8 and 128 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_ASSET_KEY');
  end if;
  if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_IMAGE_HASH');
  end if;
  if p_mime_type not in ('image/jpeg', 'image/png', 'image/webp') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_IMAGE_TYPE');
  end if;
  if p_size_bytes is null or p_size_bytes not between 32 and 8388608 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_IMAGE_SIZE');
  end if;

  v_extension := case p_mime_type
    when 'image/jpeg' then 'jpg'
    when 'image/png' then 'png'
    else 'webp'
  end;

  insert into public.toy_assets (
    id,
    owner_user_id,
    client_asset_key,
    object_key,
    sha256,
    mime_type,
    size_bytes,
    sku_label,
    state
  ) values (
    v_asset_id,
    p_user_id,
    p_client_asset_key,
    p_user_id::text || '/' || v_asset_id::text || '/source.' || v_extension,
    p_sha256,
    p_mime_type,
    p_size_bytes,
    v_sku,
    'pending'
  )
  on conflict (owner_user_id, client_asset_key) do nothing
  returning * into v_asset;

  if not found then
    select *
      into v_asset
      from public.toy_assets
     where owner_user_id = p_user_id
       and client_asset_key = p_client_asset_key;
    if not found then
      raise exception 'TOY_ASSET_IDEMPOTENCY_READ_FAILED';
    end if;
    if v_asset.sha256 <> p_sha256
       or v_asset.mime_type <> p_mime_type
       or v_asset.size_bytes <> p_size_bytes
       or v_asset.sku_label is distinct from v_sku then
      return jsonb_build_object(
        'ok', false, 'code', 'IDEMPOTENCY_CONFLICT'
      );
    end if;
    if v_asset.state in ('rejected', 'deleted') then
      return jsonb_build_object(
        'ok', false, 'code', 'INPUT_ASSET_REJECTED'
      );
    end if;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'inputAssetId', v_asset.id,
      'objectKey', v_asset.object_key,
      'sha256', v_asset.sha256,
      'mimeType', v_asset.mime_type,
      'sizeBytes', v_asset.size_bytes,
      'skuLabel', v_asset.sku_label,
      'state', v_asset.state
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'inputAssetId', v_asset.id,
    'objectKey', v_asset.object_key,
    'sha256', v_asset.sha256,
    'mimeType', v_asset.mime_type,
    'sizeBytes', v_asset.size_bytes,
    'skuLabel', v_asset.sku_label,
    'state', v_asset.state
  );
end;
$$;

-- The server calls this only after downloading the private object and checking
-- magic bytes, actual MIME, exact byte count, and SHA-256.
create or replace function public.pikbo_complete_toy_asset_v1(
  p_user_id uuid,
  p_asset_id uuid,
  p_actual_sha256 text,
  p_actual_mime_type text,
  p_actual_size_bytes bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_asset public.toy_assets%rowtype;
begin
  if p_user_id is null or p_asset_id is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_IDENTITY');
  end if;

  select *
    into v_asset
    from public.toy_assets
   where id = p_asset_id
     and owner_user_id = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INPUT_ASSET_NOT_FOUND');
  end if;
  if v_asset.state = 'ready' then
    if v_asset.sha256 = p_actual_sha256
       and v_asset.mime_type = p_actual_mime_type
       and v_asset.size_bytes = p_actual_size_bytes then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'inputAssetId', v_asset.id,
        'sha256', v_asset.sha256,
        'mimeType', v_asset.mime_type,
        'sizeBytes', v_asset.size_bytes,
        'skuLabel', v_asset.sku_label,
        'state', v_asset.state
      );
    end if;
    return jsonb_build_object(
      'ok', false, 'code', 'INPUT_ASSET_IDENTITY_CONFLICT'
    );
  end if;
  if v_asset.state <> 'pending' then
    return jsonb_build_object(
      'ok', false, 'code', 'INPUT_ASSET_NOT_PENDING'
    );
  end if;
  if v_asset.sha256 <> p_actual_sha256
     or v_asset.mime_type <> p_actual_mime_type
     or v_asset.size_bytes <> p_actual_size_bytes then
    return jsonb_build_object(
      'ok', false, 'code', 'INPUT_ASSET_IDENTITY_CONFLICT'
    );
  end if;

  update public.toy_assets
     set state = 'ready',
         verified_at = now()
   where id = v_asset.id
   returning * into v_asset;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'inputAssetId', v_asset.id,
    'sha256', v_asset.sha256,
    'mimeType', v_asset.mime_type,
    'sizeBytes', v_asset.size_bytes,
    'skuLabel', v_asset.sku_label,
    'state', v_asset.state
  );
end;
$$;

-- Validate the private input first, then call the already-proven v1 accounting
-- function inside this same transaction. Any binding assertion raises and
-- rolls back the v1 reserve, so credits can never be held without the input.
create or replace function public.pikbo_reserve_seller_pack_v2(
  p_user_id uuid,
  p_client_pack_key text,
  p_input_asset_id uuid,
  p_rights_confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_asset public.toy_assets%rowtype;
  v_existing public.seller_pack_runs%rowtype;
  v_result jsonb;
  v_pack_id uuid;
  v_pack public.seller_pack_runs%rowtype;
  v_job_count integer;
  v_idempotent boolean;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  end if;
  if p_rights_confirmed is distinct from true then
    return jsonb_build_object('ok', false, 'code', 'RIGHTS_REQUIRED');
  end if;
  if p_input_asset_id is null then
    return jsonb_build_object('ok', false, 'code', 'INPUT_ASSET_REQUIRED');
  end if;

  select *
    into v_asset
    from public.toy_assets
   where id = p_input_asset_id
     and owner_user_id = p_user_id
     and state = 'ready';
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INPUT_ASSET_NOT_READY');
  end if;

  -- Read-only precheck. The canonical v1 function retains its account → pack
  -- → wallet lock order. A concurrent different-asset replay is rechecked
  -- after v1 returns and raises, rolling back this transaction.
  select *
    into v_existing
    from public.seller_pack_runs
   where created_by = p_user_id
     and client_pack_key = btrim(p_client_pack_key);
  if found then
    if v_existing.input_asset_id is null then
      return jsonb_build_object(
        'ok', false, 'code', 'PACK_INPUT_UNBOUND'
      );
    end if;
    if v_existing.input_asset_id <> p_input_asset_id then
      return jsonb_build_object(
        'ok', false, 'code', 'IDEMPOTENCY_CONFLICT'
      );
    end if;
  end if;

  v_result := public.pikbo_reserve_seller_pack_v1(
    p_user_id,
    p_client_pack_key
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is distinct from true then
    return v_result;
  end if;

  v_pack_id := (v_result ->> 'packRunId')::uuid;
  v_idempotent := coalesce((v_result ->> 'idempotent')::boolean, false);

  -- Recheck under a key-share lock after v1 returns. If state changed while
  -- v1 was reserving, raising here rolls back the entire nested reserve.
  select *
    into v_asset
    from public.toy_assets
   where id = p_input_asset_id
     and owner_user_id = p_user_id
     and state = 'ready'
   for update;
  if not found then
    raise exception 'INPUT_ASSET_CHANGED_DURING_PACK_RESERVE';
  end if;

  select *
    into v_pack
    from public.seller_pack_runs
   where id = v_pack_id
     and created_by = p_user_id;
  if not found then
    raise exception 'PACK_BINDING_MISSING_AFTER_RESERVE';
  end if;

  if v_idempotent then
    if v_pack.input_asset_id is null
       or v_pack.rights_confirmed_at is null then
      return jsonb_build_object(
        'ok', false, 'code', 'PACK_INPUT_UNBOUND'
      );
    end if;
    if v_pack.input_asset_id <> p_input_asset_id then
      return jsonb_build_object(
        'ok', false, 'code', 'IDEMPOTENCY_CONFLICT'
      );
    end if;
    select count(*)
      into v_job_count
      from public.generation_jobs
     where pack_run_id = v_pack_id
       and created_by = p_user_id
       and input_asset_id = p_input_asset_id;
    if v_job_count <> 3 then
      return jsonb_build_object(
        'ok', false, 'code', 'PACK_INPUT_BINDING_MISMATCH'
      );
    end if;
  else
    update public.seller_pack_runs
       set input_asset_id = p_input_asset_id,
           rights_confirmed_at = now()
     where id = v_pack_id
       and created_by = p_user_id
       and input_asset_id is null;
    if not found then
      raise exception 'PACK_INPUT_BINDING_WRITE_FAILED';
    end if;

    update public.generation_jobs
       set input_asset_id = p_input_asset_id
     where pack_run_id = v_pack_id
       and created_by = p_user_id
       and input_asset_id is null;
    get diagnostics v_job_count = row_count;
    if v_job_count <> 3 then
      raise exception 'PACK_INPUT_JOB_COUNT_INVALID';
    end if;
  end if;

  return v_result || jsonb_build_object(
    'inputAssetId', v_asset.id,
    'inputSha256', v_asset.sha256,
    'inputMimeType', v_asset.mime_type,
    'inputSizeBytes', v_asset.size_bytes,
    'inputSkuLabel', v_asset.sku_label
  );
end;
$$;

-- Owner status enriched with safe input metadata. Storage object keys never
-- cross this boundary.
create or replace function public.pikbo_get_seller_pack_status_v2(
  p_user_id uuid,
  p_pack_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
  v_pack public.seller_pack_runs%rowtype;
  v_asset public.toy_assets%rowtype;
begin
  v_result := public.pikbo_get_seller_pack_status_v1(
    p_user_id,
    p_pack_run_id
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is distinct from true then
    return v_result;
  end if;

  select *
    into v_pack
    from public.seller_pack_runs
   where id = p_pack_run_id
     and created_by = p_user_id;
  if not found or v_pack.input_asset_id is null then
    return jsonb_build_object('ok', false, 'code', 'PACK_INPUT_UNBOUND');
  end if;

  select *
    into v_asset
    from public.toy_assets
   where id = v_pack.input_asset_id
     and owner_user_id = p_user_id;
  if not found then
    return jsonb_build_object(
      'ok', false, 'code', 'PACK_INPUT_BINDING_MISMATCH'
    );
  end if;

  return v_result || jsonb_build_object(
    'inputAssetId', v_asset.id,
    'inputSha256', v_asset.sha256,
    'inputMimeType', v_asset.mime_type,
    'inputSizeBytes', v_asset.size_bytes,
    'inputSkuLabel', v_asset.sku_label,
    'inputCreatedAt', v_asset.created_at
  );
end;
$$;

-- Account-level discovery replaces the browser-only sessionStorage pointer.
-- "Active" includes partial/failed Packs because those may have a retryable
-- child. Fully succeeded results already belong in Library.
create or replace function public.pikbo_get_active_seller_pack_v1(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pack_id uuid;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  end if;

  select id
    into v_pack_id
    from public.seller_pack_runs
   where created_by = p_user_id
     and input_asset_id is not null
     and status in ('running', 'partial', 'failed')
   order by created_at desc, id desc
   limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'ACTIVE_PACK_NOT_FOUND');
  end if;

  return public.pikbo_get_seller_pack_status_v2(p_user_id, v_pack_id);
end;
$$;

-- Server-only resolver used immediately before a Pack child provider upload.
-- It proves owner → Pack → child → identical ready input and returns the
-- private object key only to service-role application code.
create or replace function public.pikbo_resolve_seller_pack_input_v1(
  p_user_id uuid,
  p_pack_run_id uuid,
  p_job_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pack public.seller_pack_runs%rowtype;
  v_job public.generation_jobs%rowtype;
  v_asset public.toy_assets%rowtype;
begin
  if p_user_id is null
     or p_pack_run_id is null
     or p_job_id is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_IDENTITY');
  end if;

  select *
    into v_pack
    from public.seller_pack_runs
   where id = p_pack_run_id
     and created_by = p_user_id
     and input_asset_id is not null
     and rights_confirmed_at is not null;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PACK_NOT_FOUND');
  end if;

  select *
    into v_job
    from public.generation_jobs
   where id = p_job_id
     and pack_run_id = v_pack.id
     and created_by = p_user_id;
  if not found then
    return jsonb_build_object(
      'ok', false, 'code', 'JOB_BINDING_MISMATCH'
    );
  end if;
  if v_job.input_asset_id is null
     or v_job.input_asset_id <> v_pack.input_asset_id then
    return jsonb_build_object(
      'ok', false, 'code', 'PACK_INPUT_BINDING_MISMATCH'
    );
  end if;

  select *
    into v_asset
    from public.toy_assets
   where id = v_pack.input_asset_id
     and owner_user_id = p_user_id
     and state = 'ready';
  if not found then
    return jsonb_build_object(
      'ok', false, 'code', 'INPUT_ASSET_NOT_READY'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'packRunId', v_pack.id,
    'jobId', v_job.id,
    'inputAssetId', v_asset.id,
    'objectKey', v_asset.object_key,
    'sha256', v_asset.sha256,
    'mimeType', v_asset.mime_type,
    'sizeBytes', v_asset.size_bytes,
    'skuLabel', v_asset.sku_label
  );
end;
$$;

-- The old unbound reserve/status entrypoints are no longer callable by the
-- application service role. v2 calls them transactionally as their owner.
revoke execute on function public.pikbo_reserve_seller_pack_v1(uuid, text)
  from service_role;
revoke execute on function public.pikbo_get_seller_pack_status_v1(uuid, uuid)
  from service_role;

revoke all on function public.pikbo_guard_ready_toy_asset_v1()
  from public, anon, authenticated;
revoke all on function public.pikbo_enforce_pack_input_binding_v1()
  from public, anon, authenticated;
revoke all on function public.pikbo_create_toy_asset_v1(
  uuid, text, text, text, bigint, text
) from public, anon, authenticated;
revoke all on function public.pikbo_complete_toy_asset_v1(
  uuid, uuid, text, text, bigint
) from public, anon, authenticated;
revoke all on function public.pikbo_reserve_seller_pack_v2(
  uuid, text, uuid, boolean
) from public, anon, authenticated;
revoke all on function public.pikbo_get_seller_pack_status_v2(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.pikbo_get_active_seller_pack_v1(uuid)
  from public, anon, authenticated;
revoke all on function public.pikbo_resolve_seller_pack_input_v1(
  uuid, uuid, uuid
) from public, anon, authenticated;

grant execute on function public.pikbo_reserve_seller_pack_v2(
  uuid, text, uuid, boolean
) to service_role;
grant execute on function public.pikbo_create_toy_asset_v1(
  uuid, text, text, text, bigint, text
) to service_role;
grant execute on function public.pikbo_complete_toy_asset_v1(
  uuid, uuid, text, text, bigint
) to service_role;
grant execute on function public.pikbo_get_seller_pack_status_v2(uuid, uuid)
  to service_role;
grant execute on function public.pikbo_get_active_seller_pack_v1(uuid)
  to service_role;
grant execute on function public.pikbo_resolve_seller_pack_input_v1(
  uuid, uuid, uuid
) to service_role;
