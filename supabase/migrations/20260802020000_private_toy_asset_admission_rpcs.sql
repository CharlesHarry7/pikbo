-- Forward-only admission RPCs for private toy inputs.
--
-- 20260802010000 created the private bucket/table and immutable Pack binding,
-- but fresh projects also need the two server-only RPCs used before Pack
-- reservation. This migration is idempotent against the rehearsed non-prod
-- schema and never grants browser roles write access.

begin;

alter table public.toy_assets
  add column if not exists client_asset_key text;

-- Preserve any rows created before stable client keys existed. These legacy
-- keys can never collide with browser keys (`input:<sha256>`).
update public.toy_assets
   set client_asset_key = 'legacy:' || id::text
 where client_asset_key is null;

alter table public.toy_assets
  alter column client_asset_key set not null;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'toy_assets_client_key_length'
       and conrelid = 'public.toy_assets'::regclass
  ) then
    alter table public.toy_assets
      add constraint toy_assets_client_key_length
      check (
        client_asset_key = btrim(client_asset_key)
        and length(client_asset_key) between 8 and 128
      );
  end if;
end;
$$;

-- The original table allowed 64 characters while the reviewed API contract
-- allows 120. Keep one named, forward-stable constraint.
alter table public.toy_assets
  drop constraint if exists toy_assets_sku_label_check;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'toy_assets_sku_label'
       and conrelid = 'public.toy_assets'::regclass
  ) then
    alter table public.toy_assets
      add constraint toy_assets_sku_label
      check (sku_label is null or length(sku_label) <= 120);
  end if;
end;
$$;

create unique index if not exists toy_assets_owner_client_key_uidx
  on public.toy_assets (owner_user_id, client_asset_key);

-- Idempotently create pending metadata. Only the application service role may
-- call this function or receive objectKey for a signed private upload.
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
  v_sku text := nullif(btrim(coalesce(p_sku_label, '')), '');
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
  if v_sku is not null and length(v_sku) > 120 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_SKU_LABEL');
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
      return jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
    end if;
    if v_asset.state in ('rejected', 'deleted') then
      return jsonb_build_object('ok', false, 'code', 'INPUT_ASSET_REJECTED');
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

-- Application code calls this only after downloading the private object and
-- checking magic MIME, exact bytes, the 8 MiB ceiling and SHA-256.
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
  if p_actual_sha256 is null
     or p_actual_mime_type is null
     or p_actual_size_bytes is null then
    return jsonb_build_object(
      'ok', false, 'code', 'INPUT_ASSET_IDENTITY_CONFLICT'
    );
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
    if v_asset.sha256 is not distinct from p_actual_sha256
       and v_asset.mime_type is not distinct from p_actual_mime_type
       and v_asset.size_bytes is not distinct from p_actual_size_bytes then
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
    return jsonb_build_object('ok', false, 'code', 'INPUT_ASSET_NOT_PENDING');
  end if;
  if v_asset.sha256 is distinct from p_actual_sha256
     or v_asset.mime_type is distinct from p_actual_mime_type
     or v_asset.size_bytes is distinct from p_actual_size_bytes then
    return jsonb_build_object(
      'ok', false, 'code', 'INPUT_ASSET_IDENTITY_CONFLICT'
    );
  end if;

  update public.toy_assets
     set state = 'ready',
         verified_at = now()
   where id = v_asset.id
     and owner_user_id = p_user_id
     and state = 'pending'
  returning * into v_asset;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INPUT_ASSET_NOT_PENDING');
  end if;

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

revoke all on function public.pikbo_create_toy_asset_v1(
  uuid, text, text, text, bigint, text
) from public, anon, authenticated;
revoke all on function public.pikbo_complete_toy_asset_v1(
  uuid, uuid, text, text, bigint
) from public, anon, authenticated;

grant execute on function public.pikbo_create_toy_asset_v1(
  uuid, text, text, text, bigint, text
) to service_role;
grant execute on function public.pikbo_complete_toy_asset_v1(
  uuid, uuid, text, text, bigint
) to service_role;

commit;
