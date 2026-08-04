-- Bind every direct live Moment generation_jobs row to the owner-verified
-- private toy photo before Provider authorization can be granted.
--
-- Seller Pack already binds input_asset_id via
-- pikbo_reserve_seller_pack_with_asset_v1. The single-clip path historically
-- called pikbo_reserve_generation_v1 alone, which left generation_jobs.input_asset_id
-- NULL. This service-role adapter reuses the canonical single-generation
-- reserve transaction, then binds the exact ready asset in the same transaction.
-- It never silently rewrites already-applied migrations.

begin;

create or replace function public.pikbo_reserve_generation_with_asset_v1(
  p_user_id uuid,
  p_idempotency_key text,
  p_effect_slug text,
  p_quoted_credits integer,
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
  v_existing public.generation_jobs%rowtype;
  v_job public.generation_jobs%rowtype;
  v_result jsonb;
  v_job_id uuid;
  v_idempotent boolean;
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

  -- Unlocked preflight: friendly failure codes without touching the ledger.
  select * into v_asset
    from public.toy_assets
   where id = p_input_asset_id
     and owner_user_id = p_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INPUT_ASSET_NOT_FOUND');
  end if;
  if v_asset.state <> 'ready' then
    return jsonb_build_object('ok', false, 'code', 'INPUT_ASSET_NOT_READY');
  end if;

  -- Reject a replay against a different or legacy-unbound job before reserve
  -- so Provider authorization cannot open for a conflicting photo lineage.
  select * into v_existing
    from public.generation_jobs
   where created_by = p_user_id
     and idempotency_key = p_idempotency_key;
  if found and v_existing.input_asset_id is null then
    return jsonb_build_object('ok', false, 'code', 'LEGACY_JOB_INPUT_UNBOUND');
  end if;
  if found and v_existing.input_asset_id is not null
     and v_existing.input_asset_id is distinct from p_input_asset_id then
    return jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
  end if;

  -- Canonical atomic single-generation path owns account → wallet lock order
  -- and credit reservation. Its locks persist for the rest of this transaction.
  v_result := public.pikbo_reserve_generation_v1(
    p_user_id,
    p_idempotency_key,
    p_effect_slug,
    p_quoted_credits
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    return v_result;
  end if;

  v_job_id := (v_result ->> 'jobId')::uuid;
  v_idempotent := coalesce((v_result ->> 'idempotent')::boolean, false);

  select * into v_job
    from public.generation_jobs
   where id = v_job_id
     and created_by = p_user_id
   for update;
  if not found then
    raise exception 'generation job disappeared after reserve';
  end if;

  -- Idempotent reuse of a pre-binding job must never open Provider work or
  -- retroactively attach today's photo to historical credit spend.
  if v_idempotent and v_job.input_asset_id is null then
    return jsonb_build_object('ok', false, 'code', 'LEGACY_JOB_INPUT_UNBOUND');
  end if;
  if v_job.input_asset_id is not null
     and v_job.input_asset_id is distinct from p_input_asset_id then
    return jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
  end if;

  -- Re-verify ownership + readiness under row lock after ledger work. Any
  -- failure here must roll back a newly created reservation.
  select * into v_asset
    from public.toy_assets
   where id = p_input_asset_id
     and owner_user_id = p_user_id
   for update;
  if not found or v_asset.state <> 'ready' then
    raise exception 'INPUT_ASSET_NOT_READY';
  end if;

  update public.generation_jobs
     set input_asset_id = p_input_asset_id
   where id = v_job_id
     and created_by = p_user_id
     and (input_asset_id is null or input_asset_id = p_input_asset_id);
  if not found then
    raise exception 'generation job input binding conflict';
  end if;

  -- Safe IDs / booleans only: never object keys, signed URLs, or content hashes.
  return v_result || jsonb_build_object(
    'inputAssetId', p_input_asset_id,
    'rightsConfirmed', true
  );
end;
$$;

revoke all on function public.pikbo_reserve_generation_with_asset_v1(
  uuid, text, text, integer, uuid, boolean
) from public, anon, authenticated;

grant execute on function public.pikbo_reserve_generation_with_asset_v1(
  uuid, text, text, integer, uuid, boolean
) to service_role;

comment on function public.pikbo_reserve_generation_with_asset_v1(
  uuid, text, text, integer, uuid, boolean
) is
  'Service-role direct Moment reserve: reuses pikbo_reserve_generation_v1 then binds generation_jobs.input_asset_id to an owner-ready toy asset before Provider authorization.';

commit;
