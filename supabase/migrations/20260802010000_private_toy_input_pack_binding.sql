-- Private seller input + immutable Launch Pack binding.
-- Apply after 20260729020000_atomic_seller_pack.sql.
-- Service-role creates/verifies inputs; authenticated owners may only read
-- their own metadata. Storage objects remain private and are never returned
-- as permanent public URLs.

create table if not exists public.toy_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  object_key text not null unique,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 8388608),
  sku_label text check (sku_label is null or char_length(sku_label) <= 64),
  state text not null default 'pending'
    check (state in ('pending', 'ready', 'rejected', 'deleted')),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create index if not exists toy_assets_owner_created_idx
  on public.toy_assets (owner_user_id, created_at desc);

alter table public.toy_assets enable row level security;

drop policy if exists toy_assets_owner_select on public.toy_assets;
create policy toy_assets_owner_select on public.toy_assets
  for select to authenticated
  using (owner_user_id = auth.uid());

revoke all on table public.toy_assets from public, anon, authenticated;
-- Authenticated owners may read safe metadata through RLS, but never the
-- private Storage object key used by the service-role worker.
grant select (
  id,
  sha256,
  mime_type,
  size_bytes,
  sku_label,
  state,
  created_at,
  verified_at
) on public.toy_assets to authenticated;
grant all on table public.toy_assets to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pikbo-toy-inputs',
  'pikbo-toy-inputs',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.seller_pack_runs
  add column if not exists input_asset_id uuid references public.toy_assets (id),
  add column if not exists rights_confirmed_at timestamptz;

alter table public.generation_jobs
  add column if not exists input_asset_id uuid references public.toy_assets (id);

create index if not exists seller_pack_runs_owner_recent_idx
  on public.seller_pack_runs (created_by, created_at desc);
create index if not exists generation_jobs_input_asset_idx
  on public.generation_jobs (input_asset_id)
  where input_asset_id is not null;

comment on column public.seller_pack_runs.input_asset_id is
  'One owner-verified private toy input immutably shared by all three children.';
comment on column public.seller_pack_runs.rights_confirmed_at is
  'Server-recorded confirmation that the seller owns or may use the input.';
comment on column public.generation_jobs.input_asset_id is
  'Must equal the parent Launch Pack input_asset_id.';

create or replace function public.pikbo_reserve_seller_pack_with_asset_v1(
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
  v_bound_count integer;
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

  -- Unlocked preflight gives a friendly failure without changing credits.
  -- The row is locked and re-verified only after the legacy reserve has taken
  -- its canonical account → pack → wallet locks.
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

  v_result := public.pikbo_reserve_seller_pack_v1(
    p_user_id,
    p_client_pack_key
  );
  if coalesce((v_result->>'ok')::boolean, false) is not true then
    return v_result;
  end if;
  v_pack_id := (v_result->>'packRunId')::uuid;

  -- The legacy RPC above owns the global account → pack → wallet order. Its
  -- locks persist in this transaction. Never lock a Pack before calling it,
  -- otherwise concurrent child authorization can deadlock account ↔ Pack.
  select * into v_existing
    from public.seller_pack_runs
   where id = v_pack_id
     and created_by = p_user_id
   for update;
  if not found then
    raise exception 'seller pack disappeared after reserve';
  end if;
  if coalesce((v_result->>'idempotent')::boolean, false)
     and v_existing.input_asset_id is null then
    -- Never retrofit an input onto a Pack created before durable asset
    -- binding existed. It may already contain terminal children from another
    -- source image, so attaching today's upload would corrupt Library lineage
    -- and could make a retry mix two products inside one Pack.
    return jsonb_build_object('ok', false, 'code', 'LEGACY_PACK_INPUT_UNBOUND');
  end if;
  if v_existing.input_asset_id is not null
     and v_existing.input_asset_id is distinct from p_input_asset_id then
    return jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
  end if;

  select * into v_asset
    from public.toy_assets
   where id = p_input_asset_id
     and owner_user_id = p_user_id
   for update;
  if not found or v_asset.state <> 'ready' then
    -- Roll back a newly created 30-credit reservation if the asset changed
    -- after the unlocked preflight; a normal JSON return would commit it.
    raise exception 'INPUT_ASSET_NOT_READY';
  end if;

  update public.seller_pack_runs
     set input_asset_id = coalesce(input_asset_id, p_input_asset_id),
         rights_confirmed_at = coalesce(rights_confirmed_at, now())
   where id = v_pack_id
     and created_by = p_user_id
     and (input_asset_id is null or input_asset_id = p_input_asset_id);
  if not found then
    raise exception 'seller pack input binding conflict';
  end if;

  update public.generation_jobs
     set input_asset_id = p_input_asset_id
   where pack_run_id = v_pack_id
     and created_by = p_user_id
     and (input_asset_id is null or input_asset_id = p_input_asset_id);
  get diagnostics v_bound_count = row_count;
  if v_bound_count <> 3 then
    raise exception 'seller pack must bind exactly three jobs, got %', v_bound_count;
  end if;

  return v_result || jsonb_build_object(
    'inputAssetId', p_input_asset_id,
    'skuLabel', v_asset.sku_label,
    'rightsConfirmed', true
  );
end;
$$;

create or replace function public.pikbo_authorize_seller_pack_child_with_asset_v1(
  p_user_id uuid,
  p_pack_run_id uuid,
  p_job_id uuid,
  p_effect_slug text,
  p_duration_sec integer,
  p_aspect_ratio text,
  p_attempt_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_asset_id uuid;
  v_asset_state text;
  v_result jsonb;
begin
  select p.input_asset_id, a.state
    into v_asset_id, v_asset_state
    from public.seller_pack_runs p
    join public.generation_jobs j
      on j.pack_run_id = p.id
     and j.id = p_job_id
     and j.input_asset_id = p.input_asset_id
    join public.toy_assets a
      on a.id = p.input_asset_id
     and a.owner_user_id = p_user_id
   where p.id = p_pack_run_id
     and p.created_by = p_user_id
     and p.rights_confirmed_at is not null;
  if v_asset_id is null then
    return jsonb_build_object('ok', false, 'code', 'INPUT_ASSET_BINDING_MISMATCH');
  end if;
  if v_asset_state <> 'ready' then
    return jsonb_build_object('ok', false, 'code', 'INPUT_ASSET_NOT_READY');
  end if;

  v_result := public.pikbo_authorize_seller_pack_child_v1(
    p_user_id,
    p_pack_run_id,
    p_job_id,
    p_effect_slug,
    p_duration_sec,
    p_aspect_ratio,
    p_attempt_key
  );
  return v_result || jsonb_build_object('inputAssetId', v_asset_id);
end;
$$;

revoke all on function public.pikbo_reserve_seller_pack_with_asset_v1(
  uuid, text, uuid, boolean
) from public, anon, authenticated;
grant execute on function public.pikbo_reserve_seller_pack_with_asset_v1(
  uuid, text, uuid, boolean
) to service_role;

revoke all on function public.pikbo_authorize_seller_pack_child_with_asset_v1(
  uuid, uuid, uuid, text, integer, text, text
) from public, anon, authenticated;
grant execute on function public.pikbo_authorize_seller_pack_child_with_asset_v1(
  uuid, uuid, uuid, text, integer, text, text
) to service_role;
