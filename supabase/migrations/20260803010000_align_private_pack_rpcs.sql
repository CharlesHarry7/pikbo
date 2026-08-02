-- Align the application RPC contract with the canonical private-input schema.
--
-- The application deliberately calls the v2 reserve/status names so a Pack
-- cannot be created without an owner-verified input. The 2026080201 migration
-- owns the actual accounting and input binding under *_with_asset_v1; these
-- small service-only adapters keep one transaction and expose only safe
-- metadata. No second ledger or generation path is introduced.

begin;

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
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  end if;
  if p_input_asset_id is null then
    return jsonb_build_object('ok', false, 'code', 'INPUT_ASSET_REQUIRED');
  end if;
  if p_rights_confirmed is distinct from true then
    return jsonb_build_object('ok', false, 'code', 'RIGHTS_CONFIRMATION_REQUIRED');
  end if;

  select * into v_asset
    from public.toy_assets
   where id = p_input_asset_id
     and owner_user_id = p_user_id
     and state = 'ready';
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INPUT_ASSET_NOT_READY');
  end if;

  -- Reject a replay against a different input before touching the ledger.
  select * into v_existing
    from public.seller_pack_runs
   where created_by = p_user_id
     and client_pack_key = btrim(p_client_pack_key);
  if found and v_existing.input_asset_id is not null
     and v_existing.input_asset_id <> p_input_asset_id then
    return jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
  end if;
  if found and v_existing.input_asset_id is null then
    return jsonb_build_object('ok', false, 'code', 'PACK_INPUT_UNBOUND');
  end if;

  -- The canonical adapter owns the account → pack → wallet lock order and
  -- binds all three children to this exact ready asset in this transaction.
  v_result := public.pikbo_reserve_seller_pack_with_asset_v1(
    p_user_id,
    p_client_pack_key,
    p_input_asset_id,
    p_rights_confirmed
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    return v_result;
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
  v_result := public.pikbo_get_seller_pack_status_v1(p_user_id, p_pack_run_id);
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    return v_result;
  end if;

  select * into v_pack
    from public.seller_pack_runs
   where id = p_pack_run_id
     and created_by = p_user_id;
  if not found or v_pack.input_asset_id is null then
    return jsonb_build_object('ok', false, 'code', 'PACK_INPUT_UNBOUND');
  end if;

  select * into v_asset
    from public.toy_assets
   where id = v_pack.input_asset_id
     and owner_user_id = p_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PACK_INPUT_BINDING_MISMATCH');
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
  if p_user_id is null or p_pack_run_id is null or p_job_id is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_IDENTITY');
  end if;

  select * into v_pack
    from public.seller_pack_runs
   where id = p_pack_run_id
     and created_by = p_user_id
     and input_asset_id is not null
     and rights_confirmed_at is not null;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PACK_NOT_FOUND');
  end if;

  select * into v_job
    from public.generation_jobs
   where id = p_job_id
     and pack_run_id = v_pack.id
     and created_by = p_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'JOB_BINDING_MISMATCH');
  end if;
  if v_job.input_asset_id is null or v_job.input_asset_id <> v_pack.input_asset_id then
    return jsonb_build_object('ok', false, 'code', 'PACK_INPUT_BINDING_MISMATCH');
  end if;

  select * into v_asset
    from public.toy_assets
   where id = v_pack.input_asset_id
     and owner_user_id = p_user_id
     and state = 'ready';
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INPUT_ASSET_NOT_READY');
  end if;

  -- objectKey is returned only to service_role callers; the application never
  -- forwards it to browser clients or analytics.
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

revoke all on function public.pikbo_reserve_seller_pack_v2(uuid, text, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.pikbo_reserve_seller_pack_v2(uuid, text, uuid, boolean)
  to service_role;

revoke all on function public.pikbo_get_seller_pack_status_v2(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.pikbo_get_seller_pack_status_v2(uuid, uuid)
  to service_role;

revoke all on function public.pikbo_resolve_seller_pack_input_v1(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.pikbo_resolve_seller_pack_input_v1(uuid, uuid, uuid)
  to service_role;

commit;
