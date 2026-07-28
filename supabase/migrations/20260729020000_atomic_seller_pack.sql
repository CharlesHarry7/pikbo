-- PIKBO atomic Seller Pack (Launch Pack) authority.
-- SOURCE ONLY. Apply after T5 + R1a + P0 private-result in a non-production project.
--
-- One authenticated owner + client pack key → one 30-credit reservation,
-- one seller_pack_runs row, and exactly three fixed child generation_jobs.
-- Child settle/release moves 10 credits at a time on the parent reservation.
-- Service role only; browser roles cannot execute these RPCs.

-- ── Schema extensions ──────────────────────────────────────────────────────

alter table public.seller_pack_runs
  add column if not exists client_pack_key text,
  add column if not exists contract_fingerprint text,
  add column if not exists released_credits integer not null default 0
    check (released_credits >= 0);

alter table public.generation_jobs
  add column if not exists pack_child_key text,
  add column if not exists pack_attempt_key text;

do $chk$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'seller_pack_runs_budget'
       and conrelid = 'public.seller_pack_runs'::regclass
  ) then
    alter table public.seller_pack_runs
      add constraint seller_pack_runs_budget check (
        settled_credits + released_credits <= quoted_credits
      );
  end if;
end
$chk$;

create unique index if not exists seller_pack_runs_owner_client_key_uidx
  on public.seller_pack_runs (created_by, client_pack_key)
  where client_pack_key is not null;

create unique index if not exists generation_jobs_pack_child_uidx
  on public.generation_jobs (pack_run_id, pack_child_key)
  where pack_run_id is not null and pack_child_key is not null;

comment on column public.seller_pack_runs.client_pack_key is
  'Owner-scoped client idempotency key for one Launch Pack start.';
comment on column public.seller_pack_runs.contract_fingerprint is
  'Server fingerprint of the frozen three-child contract bound at reserve.';
comment on column public.generation_jobs.pack_child_key is
  'Fixed logical child key: listing_spin | blind_box_reveal | social_flash.';
comment on column public.generation_jobs.pack_attempt_key is
  'Latest attempt idempotency key for this pack child (retry mints a new key).';

-- Frozen v1 fingerprint — must match lib/sellerPackContract.ts SELLER_PACK_ITEMS.
-- listing_spin:360-spin-showcase:1:1:5|blind_box_reveal:blind-box-unboxing:9:16:5|social_flash:paparazzi-flash:9:16:5

create or replace function public.pikbo_seller_pack_contract_fingerprint_v1()
returns text
language sql
immutable
as $$
  select 'listing_spin:360-spin-showcase:1:1:5|blind_box_reveal:blind-box-unboxing:9:16:5|social_flash:paparazzi-flash:9:16:5';
$$;

revoke all on function public.pikbo_seller_pack_contract_fingerprint_v1()
  from public, anon, authenticated;
grant execute on function public.pikbo_seller_pack_contract_fingerprint_v1()
  to service_role;

-- ── Reserve: 30 once + three fixed jobs ────────────────────────────────────

create or replace function public.pikbo_reserve_seller_pack_v1(
  p_user_id uuid,
  p_client_pack_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account public.accounts%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_existing public.seller_pack_runs%rowtype;
  v_reservation public.credit_reservations%rowtype;
  v_pack public.seller_pack_runs%rowtype;
  v_reservation_key text;
  v_fingerprint text := public.pikbo_seller_pack_contract_fingerprint_v1();
  v_jobs jsonb := '[]'::jsonb;
  v_job public.generation_jobs%rowtype;
  v_child record;
  v_quoted integer := 30;
  v_child_credits integer := 10;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  end if;
  if p_client_pack_key is null
     or length(btrim(p_client_pack_key)) < 8
     or length(p_client_pack_key) > 128 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_PACK_KEY');
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
  if v_account.status <> 'active'
     or not v_account.live_generation_allowed then
    return jsonb_build_object('ok', false, 'code', 'LIVE_ACCESS_REQUIRED');
  end if;

  select *
    into v_wallet
    from public.credit_wallets
   where account_id = v_account.id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'DURABLE_WALLET_NOT_FOUND');
  end if;

  select *
    into v_existing
    from public.seller_pack_runs
   where created_by = p_user_id
     and client_pack_key = btrim(p_client_pack_key)
   for update;

  if found then
    if v_existing.contract_fingerprint is distinct from v_fingerprint
       or v_existing.quoted_credits <> v_quoted then
      return jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
    end if;
    select *
      into v_reservation
      from public.credit_reservations
     where id = v_existing.reservation_id;
    if not found then
      return jsonb_build_object('ok', false, 'code', 'JOB_BINDING_MISMATCH');
    end if;
    select coalesce(
             jsonb_agg(
               jsonb_build_object(
                 'jobId', j.id,
                 'childKey', j.pack_child_key,
                 'effectSlug', j.effect_slug,
                 'aspectRatio', j.aspect_ratio,
                 'durationSec', j.duration_seconds,
                 'status', j.status::text,
                 'quotedCredits', j.quoted_credits,
                 'settledCredits', j.settled_credits,
                 'attemptKey', j.pack_attempt_key
               )
               order by
                 case j.pack_child_key
                   when 'listing_spin' then 1
                   when 'blind_box_reveal' then 2
                   when 'social_flash' then 3
                   else 9
                 end
             ),
             '[]'::jsonb
           )
      into v_jobs
      from public.generation_jobs j
     where j.pack_run_id = v_existing.id;
    if jsonb_array_length(v_jobs) <> 3 then
      return jsonb_build_object('ok', false, 'code', 'PACK_JOB_COUNT_INVALID');
    end if;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'packRunId', v_existing.id,
      'reservationId', v_reservation.id,
      'userId', p_user_id,
      'accountId', v_account.id,
      'quotedCredits', v_existing.quoted_credits,
      'settledCredits', v_existing.settled_credits,
      'releasedCredits', v_existing.released_credits,
      'status', v_existing.status::text,
      'contractFingerprint', v_existing.contract_fingerprint,
      'clientPackKey', v_existing.client_pack_key,
      'planId', v_account.plan_id::text,
      'availableCredits', v_wallet.available_credits,
      'reservedCredits', v_wallet.reserved_credits,
      'jobs', v_jobs
    );
  end if;

  if v_wallet.available_credits < v_quoted then
    return jsonb_build_object(
      'ok', false,
      'code', 'INSUFFICIENT_CREDITS',
      'need', v_quoted,
      'have', v_wallet.available_credits
    );
  end if;

  update public.credit_wallets
     set available_credits = available_credits - v_quoted,
         reserved_credits = reserved_credits + v_quoted,
         version = version + 1,
         updated_at = now()
   where account_id = v_account.id
   returning * into v_wallet;

  v_reservation_key :=
    'seller-pack:' || p_user_id::text || ':' || btrim(p_client_pack_key);

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
    'seller_pack',
    v_quoted,
    0,
    0,
    'reserved',
    v_reservation_key,
    now() + interval '2 hours',
    p_user_id
  )
  returning * into v_reservation;

  insert into public.seller_pack_runs (
    account_id,
    created_by,
    status,
    quoted_credits,
    settled_credits,
    released_credits,
    reservation_id,
    mode,
    client_pack_key,
    contract_fingerprint
  ) values (
    v_account.id,
    p_user_id,
    'running',
    v_quoted,
    0,
    0,
    v_reservation.id,
    'live_generate',
    btrim(p_client_pack_key),
    v_fingerprint
  )
  returning * into v_pack;

  for v_child in
    select *
      from (
        values
          (1, 'listing_spin', '360-spin-showcase', '1:1', 5),
          (2, 'blind_box_reveal', 'blind-box-unboxing', '9:16', 5),
          (3, 'social_flash', 'paparazzi-flash', '9:16', 5)
      ) as t(ord, child_key, effect_slug, aspect_ratio, duration_sec)
    order by ord
  loop
    insert into public.generation_jobs (
      account_id,
      created_by,
      pack_run_id,
      effect_slug,
      status,
      quoted_credits,
      settled_credits,
      reservation_id,
      demo,
      pack_child_key,
      duration_seconds,
      aspect_ratio,
      model_id,
      resolution,
      idempotency_key
    ) values (
      v_account.id,
      p_user_id,
      v_pack.id,
      v_child.effect_slug,
      'queued',
      v_child_credits,
      0,
      v_reservation.id,
      false,
      v_child.child_key,
      v_child.duration_sec,
      v_child.aspect_ratio,
      'seedance-fast',
      '720p',
      'pack:' || v_pack.id::text || ':' || v_child.child_key
    )
    returning * into v_job;

    v_jobs := v_jobs || jsonb_build_array(
      jsonb_build_object(
        'jobId', v_job.id,
        'childKey', v_job.pack_child_key,
        'effectSlug', v_job.effect_slug,
        'aspectRatio', v_job.aspect_ratio,
        'durationSec', v_job.duration_seconds,
        'status', v_job.status::text,
        'quotedCredits', v_job.quoted_credits,
        'settledCredits', v_job.settled_credits,
        'attemptKey', v_job.pack_attempt_key
      )
    );
  end loop;

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
    -v_quoted,
    v_quoted,
    v_wallet.available_credits,
    v_wallet.reserved_credits,
    v_reservation.id,
    'seller_pack',
    v_pack.id::text,
    'ledger:reserve:' || v_reservation_key,
    jsonb_build_object(
      'packRunId', v_pack.id,
      'clientPackKey', btrim(p_client_pack_key),
      'contractFingerprint', v_fingerprint
    )
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'packRunId', v_pack.id,
    'reservationId', v_reservation.id,
    'userId', p_user_id,
    'accountId', v_account.id,
    'quotedCredits', v_quoted,
    'settledCredits', 0,
    'releasedCredits', 0,
    'status', v_pack.status::text,
    'contractFingerprint', v_fingerprint,
    'clientPackKey', btrim(p_client_pack_key),
    'planId', v_account.plan_id::text,
    'availableCredits', v_wallet.available_credits,
    'reservedCredits', v_wallet.reserved_credits,
    'jobs', v_jobs
  );
end;
$$;

-- ── Authorize one child for provider spend (no second wallet reserve) ──────

create or replace function public.pikbo_authorize_seller_pack_child_v1(
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
  v_pack public.seller_pack_runs%rowtype;
  v_job public.generation_jobs%rowtype;
  v_reservation public.credit_reservations%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_account public.accounts%rowtype;
  v_remaining integer;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  end if;
  if p_attempt_key is null
     or length(btrim(p_attempt_key)) < 8
     or length(p_attempt_key) > 128 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_IDEMPOTENCY_KEY');
  end if;

  select *
    into v_pack
    from public.seller_pack_runs
   where id = p_pack_run_id
     and created_by = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PACK_NOT_FOUND');
  end if;

  select *
    into v_job
    from public.generation_jobs
   where id = p_job_id
     and pack_run_id = p_pack_run_id
     and created_by = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'JOB_BINDING_MISMATCH');
  end if;

  if v_job.effect_slug is distinct from p_effect_slug
     or v_job.duration_seconds is distinct from p_duration_sec
     or v_job.aspect_ratio is distinct from p_aspect_ratio
     or v_job.quoted_credits <> 10 then
    return jsonb_build_object('ok', false, 'code', 'PACK_CHILD_CONTRACT_MISMATCH');
  end if;

  if v_job.status = 'succeeded' then
    return jsonb_build_object('ok', false, 'code', 'CHILD_ALREADY_SUCCEEDED');
  end if;
  if v_job.status = 'running'
     and v_job.pack_attempt_key is not null
     and v_job.pack_attempt_key = btrim(p_attempt_key) then
    select *
      into v_reservation
      from public.credit_reservations
     where id = v_job.reservation_id;
    select *
      into v_wallet
      from public.credit_wallets
     where account_id = v_pack.account_id;
    select *
      into v_account
      from public.accounts
     where id = v_pack.account_id;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'providerAuthorized', false,
      'packRunId', v_pack.id,
      'jobId', v_job.id,
      'reservationId', v_job.reservation_id,
      'childKey', v_job.pack_child_key,
      'effectSlug', v_job.effect_slug,
      'aspectRatio', v_job.aspect_ratio,
      'durationSec', v_job.duration_seconds,
      'credits', 10,
      'status', 'running',
      'attemptKey', v_job.pack_attempt_key,
      'userId', p_user_id,
      'accountId', v_pack.account_id,
      'planId', v_account.plan_id::text,
      'availableCredits', v_wallet.available_credits,
      'reservedCredits', v_wallet.reserved_credits,
      'expiresAt', v_reservation.expires_at
    );
  end if;
  if v_job.status not in ('queued', 'failed') then
    return jsonb_build_object('ok', false, 'code', 'CHILD_NOT_AUTHORIZABLE');
  end if;
  -- failed children must be re-queued via retry before authorize
  if v_job.status = 'failed' then
    return jsonb_build_object('ok', false, 'code', 'CHILD_REQUIRES_RETRY');
  end if;

  select *
    into v_reservation
    from public.credit_reservations
   where id = v_job.reservation_id
   for update;
  if not found or v_reservation.created_by <> p_user_id then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_FOUND');
  end if;
  if v_reservation.purpose <> 'seller_pack' then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_PURPOSE_MISMATCH');
  end if;
  if v_reservation.status not in ('reserved', 'partially_settled') then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_ACTIVE');
  end if;

  v_remaining :=
    v_reservation.quoted_credits
    - v_reservation.settled_credits
    - v_reservation.released_credits;
  if v_remaining < 10 then
    return jsonb_build_object('ok', false, 'code', 'PACK_CREDITS_EXHAUSTED');
  end if;

  select *
    into v_wallet
    from public.credit_wallets
   where account_id = v_pack.account_id
   for update;
  select *
    into v_account
    from public.accounts
   where id = v_pack.account_id
   for update;
  if v_account.status <> 'active'
     or not v_account.live_generation_allowed then
    return jsonb_build_object('ok', false, 'code', 'LIVE_ACCESS_REQUIRED');
  end if;

  update public.generation_jobs
     set status = 'running',
         pack_attempt_key = btrim(p_attempt_key),
         started_at = coalesce(started_at, now()),
         completed_at = null,
         error_code = null,
         model_id = 'seedance-fast',
         resolution = '720p'
   where id = v_job.id
   returning * into v_job;

  update public.seller_pack_runs
     set status = 'running',
         completed_at = null
   where id = v_pack.id;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'providerAuthorized', true,
    'packRunId', v_pack.id,
    'jobId', v_job.id,
    'reservationId', v_job.reservation_id,
    'childKey', v_job.pack_child_key,
    'effectSlug', v_job.effect_slug,
    'aspectRatio', v_job.aspect_ratio,
    'durationSec', v_job.duration_seconds,
    'credits', 10,
    'status', 'running',
    'attemptKey', v_job.pack_attempt_key,
    'userId', p_user_id,
    'accountId', v_pack.account_id,
    'planId', v_account.plan_id::text,
    'availableCredits', v_wallet.available_credits,
    'reservedCredits', v_wallet.reserved_credits,
    'expiresAt', v_reservation.expires_at
  );
end;
$$;

-- ── Settle exactly 10 on one bound child ───────────────────────────────────

create or replace function public.pikbo_settle_seller_pack_child_v1(
  p_user_id uuid,
  p_pack_run_id uuid,
  p_job_id uuid,
  p_provider_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pack public.seller_pack_runs%rowtype;
  v_job public.generation_jobs%rowtype;
  v_reservation public.credit_reservations%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_amount integer := 10;
  v_remaining integer;
  v_res_status public.reservation_status;
  v_pack_status public.seller_pack_status;
  v_succeeded integer;
  v_failed integer;
begin
  select *
    into v_pack
    from public.seller_pack_runs
   where id = p_pack_run_id
     and created_by = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PACK_NOT_FOUND');
  end if;

  select *
    into v_job
    from public.generation_jobs
   where id = p_job_id
     and pack_run_id = p_pack_run_id
     and created_by = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'JOB_BINDING_MISMATCH');
  end if;

  select *
    into v_reservation
    from public.credit_reservations
   where id = v_job.reservation_id
   for update;
  if not found or v_reservation.created_by <> p_user_id then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_FOUND');
  end if;

  select *
    into v_wallet
    from public.credit_wallets
   where account_id = v_pack.account_id
   for update;

  if v_job.status = 'succeeded' and v_job.settled_credits >= v_amount then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'status', 'captured',
      'packRunId', v_pack.id,
      'jobId', v_job.id,
      'reservationId', v_reservation.id,
      'settledCredits', v_amount,
      'availableCredits', v_wallet.available_credits,
      'reservedCredits', v_wallet.reserved_credits,
      'packSettledCredits', v_pack.settled_credits,
      'packReleasedCredits', v_pack.released_credits
    );
  end if;

  if v_job.status <> 'running' then
    return jsonb_build_object('ok', false, 'code', 'CHILD_NOT_RUNNING');
  end if;

  v_remaining :=
    v_reservation.quoted_credits
    - v_reservation.settled_credits
    - v_reservation.released_credits;
  if v_remaining < v_amount or v_wallet.reserved_credits < v_amount then
    return jsonb_build_object('ok', false, 'code', 'RESERVED_BALANCE_INVALID');
  end if;

  update public.credit_wallets
     set reserved_credits = reserved_credits - v_amount,
         lifetime_used_credits = lifetime_used_credits + v_amount,
         version = version + 1,
         updated_at = now()
   where account_id = v_wallet.account_id
   returning * into v_wallet;

  update public.credit_reservations
     set settled_credits = settled_credits + v_amount,
         status = case
           when settled_credits + v_amount + released_credits >= quoted_credits
             and released_credits = 0 then 'settled'::public.reservation_status
           when settled_credits + v_amount + released_credits >= quoted_credits
             then 'partially_settled'::public.reservation_status
           else 'partially_settled'::public.reservation_status
         end,
         updated_at = now()
   where id = v_reservation.id
   returning * into v_reservation;

  update public.generation_jobs
     set status = 'succeeded',
         settled_credits = v_amount,
         provider_request_id = coalesce(p_provider_request_id, provider_request_id),
         completed_at = now()
   where id = v_job.id
   returning * into v_job;

  update public.seller_pack_runs
     set settled_credits = settled_credits + v_amount
   where id = v_pack.id
   returning * into v_pack;

  select count(*) filter (where status = 'succeeded'),
         count(*) filter (where status = 'failed')
    into v_succeeded, v_failed
    from public.generation_jobs
   where pack_run_id = v_pack.id;

  if v_succeeded = 3 then
    v_pack_status := 'succeeded';
  elsif v_succeeded + v_failed = 3 then
    v_pack_status := 'partial';
  else
    v_pack_status := 'running';
  end if;

  update public.seller_pack_runs
     set status = v_pack_status,
         completed_at = case
           when v_pack_status in ('succeeded', 'partial', 'failed') then now()
           else null
         end
   where id = v_pack.id
   returning * into v_pack;

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
    v_wallet.account_id,
    'settle',
    0,
    -v_amount,
    v_wallet.available_credits,
    v_wallet.reserved_credits,
    v_reservation.id,
    'seller_pack_settle',
    v_job.id::text,
    'ledger:seller-pack-settle:' || v_job.id::text,
    jsonb_build_object(
      'packRunId', v_pack.id,
      'childKey', v_job.pack_child_key,
      'providerRequestId', p_provider_request_id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'status', 'captured',
    'packRunId', v_pack.id,
    'jobId', v_job.id,
    'reservationId', v_reservation.id,
    'settledCredits', v_amount,
    'availableCredits', v_wallet.available_credits,
    'reservedCredits', v_wallet.reserved_credits,
    'packSettledCredits', v_pack.settled_credits,
    'packReleasedCredits', v_pack.released_credits,
    'packStatus', v_pack.status::text
  );
end;
$$;

-- ── Release exactly 10 on confirmed child failure ──────────────────────────

create or replace function public.pikbo_release_seller_pack_child_v1(
  p_user_id uuid,
  p_pack_run_id uuid,
  p_job_id uuid,
  p_reason text default 'child_failed'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pack public.seller_pack_runs%rowtype;
  v_job public.generation_jobs%rowtype;
  v_reservation public.credit_reservations%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_amount integer := 10;
  v_remaining integer;
  v_succeeded integer;
  v_failed integer;
  v_pack_status public.seller_pack_status;
begin
  select *
    into v_pack
    from public.seller_pack_runs
   where id = p_pack_run_id
     and created_by = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PACK_NOT_FOUND');
  end if;

  select *
    into v_job
    from public.generation_jobs
   where id = p_job_id
     and pack_run_id = p_pack_run_id
     and created_by = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'JOB_BINDING_MISMATCH');
  end if;

  select *
    into v_reservation
    from public.credit_reservations
   where id = v_job.reservation_id
   for update;
  if not found or v_reservation.created_by <> p_user_id then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_FOUND');
  end if;

  select *
    into v_wallet
    from public.credit_wallets
   where account_id = v_pack.account_id
   for update;

  if v_job.status = 'failed' and v_job.settled_credits = 0 then
    -- Idempotent release replay (already terminal failed).
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'status', 'released',
      'packRunId', v_pack.id,
      'jobId', v_job.id,
      'reservationId', v_reservation.id,
      'releasedCredits', v_amount,
      'availableCredits', v_wallet.available_credits,
      'reservedCredits', v_wallet.reserved_credits,
      'packSettledCredits', v_pack.settled_credits,
      'packReleasedCredits', v_pack.released_credits,
      'creditsRefunded', true
    );
  end if;

  if v_job.status = 'succeeded' then
    return jsonb_build_object('ok', false, 'code', 'CHILD_ALREADY_SUCCEEDED');
  end if;
  if v_job.status not in ('running', 'queued') then
    return jsonb_build_object('ok', false, 'code', 'CHILD_NOT_RELEASABLE');
  end if;

  v_remaining :=
    v_reservation.quoted_credits
    - v_reservation.settled_credits
    - v_reservation.released_credits;
  if v_remaining < v_amount or v_wallet.reserved_credits < v_amount then
    return jsonb_build_object('ok', false, 'code', 'RESERVED_BALANCE_INVALID');
  end if;

  update public.credit_wallets
     set available_credits = available_credits + v_amount,
         reserved_credits = reserved_credits - v_amount,
         version = version + 1,
         updated_at = now()
   where account_id = v_wallet.account_id
   returning * into v_wallet;

  update public.credit_reservations
     set released_credits = released_credits + v_amount,
         status = case
           when settled_credits + released_credits + v_amount >= quoted_credits
             and settled_credits = 0 then 'released'::public.reservation_status
           when settled_credits + released_credits + v_amount >= quoted_credits
             then 'partially_settled'::public.reservation_status
           else 'partially_settled'::public.reservation_status
         end,
         updated_at = now()
   where id = v_reservation.id
   returning * into v_reservation;

  update public.generation_jobs
     set status = 'failed',
         error_code = left(coalesce(p_reason, 'child_failed'), 120),
         completed_at = now()
   where id = v_job.id
   returning * into v_job;

  update public.seller_pack_runs
     set released_credits = released_credits + v_amount
   where id = v_pack.id
   returning * into v_pack;

  select count(*) filter (where status = 'succeeded'),
         count(*) filter (where status = 'failed')
    into v_succeeded, v_failed
    from public.generation_jobs
   where pack_run_id = v_pack.id;

  if v_failed = 3 then
    v_pack_status := 'failed';
  elsif v_succeeded + v_failed = 3 then
    v_pack_status := 'partial';
  else
    v_pack_status := 'running';
  end if;

  update public.seller_pack_runs
     set status = v_pack_status,
         completed_at = case
           when v_pack_status in ('succeeded', 'partial', 'failed') then now()
           else null
         end
   where id = v_pack.id
   returning * into v_pack;

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
    v_wallet.account_id,
    'release',
    v_amount,
    -v_amount,
    v_wallet.available_credits,
    v_wallet.reserved_credits,
    v_reservation.id,
    'seller_pack_release',
    v_job.id::text,
    'ledger:seller-pack-release:' || v_job.id::text || ':' ||
      left(coalesce(p_reason, 'child_failed'), 40),
    jsonb_build_object(
      'packRunId', v_pack.id,
      'childKey', v_job.pack_child_key,
      'reason', left(coalesce(p_reason, 'child_failed'), 120)
    )
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'status', 'released',
    'packRunId', v_pack.id,
    'jobId', v_job.id,
    'reservationId', v_reservation.id,
    'releasedCredits', v_amount,
    'availableCredits', v_wallet.available_credits,
    'reservedCredits', v_wallet.reserved_credits,
    'packSettledCredits', v_pack.settled_credits,
    'packReleasedCredits', v_pack.released_credits,
    'packStatus', v_pack.status::text,
    'creditsRefunded', true
  );
end;
$$;

-- ── Retry: reopen same failed child, re-reserve only its 10 ────────────────

create or replace function public.pikbo_retry_seller_pack_child_v1(
  p_user_id uuid,
  p_pack_run_id uuid,
  p_job_id uuid,
  p_attempt_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pack public.seller_pack_runs%rowtype;
  v_job public.generation_jobs%rowtype;
  v_reservation public.credit_reservations%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_amount integer := 10;
  v_job_count integer;
begin
  if p_attempt_key is null
     or length(btrim(p_attempt_key)) < 8
     or length(p_attempt_key) > 128 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_IDEMPOTENCY_KEY');
  end if;

  select *
    into v_pack
    from public.seller_pack_runs
   where id = p_pack_run_id
     and created_by = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PACK_NOT_FOUND');
  end if;

  select count(*) into v_job_count
    from public.generation_jobs
   where pack_run_id = v_pack.id;
  if v_job_count <> 3 then
    return jsonb_build_object('ok', false, 'code', 'PACK_JOB_COUNT_INVALID');
  end if;

  select *
    into v_job
    from public.generation_jobs
   where id = p_job_id
     and pack_run_id = p_pack_run_id
     and created_by = p_user_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'JOB_BINDING_MISMATCH');
  end if;

  if v_job.status = 'succeeded' then
    return jsonb_build_object('ok', false, 'code', 'CHILD_ALREADY_SUCCEEDED');
  end if;
  if v_job.status = 'queued'
     and v_job.pack_attempt_key is not null
     and v_job.pack_attempt_key = btrim(p_attempt_key) then
    select * into v_wallet from public.credit_wallets where account_id = v_pack.account_id;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'packRunId', v_pack.id,
      'jobId', v_job.id,
      'reservationId', v_job.reservation_id,
      'childKey', v_job.pack_child_key,
      'status', 'queued',
      'attemptKey', v_job.pack_attempt_key,
      'availableCredits', v_wallet.available_credits,
      'reservedCredits', v_wallet.reserved_credits
    );
  end if;
  if v_job.status <> 'failed' then
    return jsonb_build_object('ok', false, 'code', 'CHILD_NOT_RETRYABLE');
  end if;

  select *
    into v_reservation
    from public.credit_reservations
   where id = v_job.reservation_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_FOUND');
  end if;
  if v_reservation.released_credits < v_amount then
    return jsonb_build_object('ok', false, 'code', 'NO_RELEASED_CREDITS_TO_RERESERVE');
  end if;

  select *
    into v_wallet
    from public.credit_wallets
   where account_id = v_pack.account_id
   for update;
  if v_wallet.available_credits < v_amount then
    return jsonb_build_object(
      'ok', false,
      'code', 'INSUFFICIENT_CREDITS',
      'need', v_amount,
      'have', v_wallet.available_credits
    );
  end if;

  -- Reverse prior child release: re-hold 10 on the same pack reservation.
  update public.credit_wallets
     set available_credits = available_credits - v_amount,
         reserved_credits = reserved_credits + v_amount,
         version = version + 1,
         updated_at = now()
   where account_id = v_wallet.account_id
   returning * into v_wallet;

  update public.credit_reservations
     set released_credits = released_credits - v_amount,
         status = 'partially_settled',
         updated_at = now()
   where id = v_reservation.id
   returning * into v_reservation;

  update public.seller_pack_runs
     set released_credits = greatest(0, released_credits - v_amount),
         status = 'running',
         completed_at = null
   where id = v_pack.id
   returning * into v_pack;

  update public.generation_jobs
     set status = 'queued',
         pack_attempt_key = btrim(p_attempt_key),
         error_code = null,
         completed_at = null,
         started_at = null,
         settled_credits = 0
   where id = v_job.id
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
    v_wallet.account_id,
    'reserve',
    -v_amount,
    v_amount,
    v_wallet.available_credits,
    v_wallet.reserved_credits,
    v_reservation.id,
    'seller_pack_retry',
    v_job.id::text,
    'ledger:seller-pack-retry:' || v_job.id::text || ':' || btrim(p_attempt_key),
    jsonb_build_object(
      'packRunId', v_pack.id,
      'childKey', v_job.pack_child_key,
      'attemptKey', btrim(p_attempt_key)
    )
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'packRunId', v_pack.id,
    'jobId', v_job.id,
    'reservationId', v_job.reservation_id,
    'childKey', v_job.pack_child_key,
    'effectSlug', v_job.effect_slug,
    'aspectRatio', v_job.aspect_ratio,
    'durationSec', v_job.duration_seconds,
    'status', 'queued',
    'attemptKey', v_job.pack_attempt_key,
    'availableCredits', v_wallet.available_credits,
    'reservedCredits', v_wallet.reserved_credits,
    'packSettledCredits', v_pack.settled_credits,
    'packReleasedCredits', v_pack.released_credits
  );
end;
$$;

-- ── Owner-scoped pack status (refresh recovery) ────────────────────────────

create or replace function public.pikbo_get_seller_pack_status_v1(
  p_user_id uuid,
  p_pack_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pack public.seller_pack_runs%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_jobs jsonb;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  end if;

  select *
    into v_pack
    from public.seller_pack_runs
   where id = p_pack_run_id
     and created_by = p_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PACK_NOT_FOUND');
  end if;

  select *
    into v_wallet
    from public.credit_wallets
   where account_id = v_pack.account_id;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'jobId', j.id,
               'childKey', j.pack_child_key,
               'effectSlug', j.effect_slug,
               'aspectRatio', j.aspect_ratio,
               'durationSec', j.duration_seconds,
               'status', j.status::text,
               'quotedCredits', j.quoted_credits,
               'settledCredits', j.settled_credits,
               'errorCode', j.error_code,
               'hasPrivateResult', (j.output_object_key is not null),
               'attemptKey', j.pack_attempt_key,
               'modelId', j.model_id,
               'resolution', j.resolution
             )
             order by
               case j.pack_child_key
                 when 'listing_spin' then 1
                 when 'blind_box_reveal' then 2
                 when 'social_flash' then 3
                 else 9
               end
           ),
           '[]'::jsonb
         )
    into v_jobs
    from public.generation_jobs j
   where j.pack_run_id = v_pack.id;

  return jsonb_build_object(
    'ok', true,
    'packRunId', v_pack.id,
    'status', v_pack.status::text,
    'quotedCredits', v_pack.quoted_credits,
    'settledCredits', v_pack.settled_credits,
    'releasedCredits', v_pack.released_credits,
    'reservationId', v_pack.reservation_id,
    'contractFingerprint', v_pack.contract_fingerprint,
    'clientPackKey', v_pack.client_pack_key,
    'mode', v_pack.mode::text,
    'createdAt', v_pack.created_at,
    'completedAt', v_pack.completed_at,
    'availableCredits', coalesce(v_wallet.available_credits, 0),
    'reservedCredits', coalesce(v_wallet.reserved_credits, 0),
    'jobs', v_jobs
  );
end;
$$;

-- ── Privileges: service_role only ──────────────────────────────────────────

revoke all on function public.pikbo_reserve_seller_pack_v1(uuid, text)
  from public, anon, authenticated;
revoke all on function public.pikbo_authorize_seller_pack_child_v1(
  uuid, uuid, uuid, text, integer, text, text
) from public, anon, authenticated;
revoke all on function public.pikbo_settle_seller_pack_child_v1(
  uuid, uuid, uuid, text
) from public, anon, authenticated;
revoke all on function public.pikbo_release_seller_pack_child_v1(
  uuid, uuid, uuid, text
) from public, anon, authenticated;
revoke all on function public.pikbo_retry_seller_pack_child_v1(
  uuid, uuid, uuid, text
) from public, anon, authenticated;
revoke all on function public.pikbo_get_seller_pack_status_v1(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.pikbo_reserve_seller_pack_v1(uuid, text)
  to service_role;
grant execute on function public.pikbo_authorize_seller_pack_child_v1(
  uuid, uuid, uuid, text, integer, text, text
) to service_role;
grant execute on function public.pikbo_settle_seller_pack_child_v1(
  uuid, uuid, uuid, text
) to service_role;
grant execute on function public.pikbo_release_seller_pack_child_v1(
  uuid, uuid, uuid, text
) to service_role;
grant execute on function public.pikbo_retry_seller_pack_child_v1(
  uuid, uuid, uuid, text
) to service_role;
grant execute on function public.pikbo_get_seller_pack_status_v1(uuid, uuid)
  to service_role;
