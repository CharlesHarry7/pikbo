-- PIKBO T5 Wave C — transactional credit RPCs (FOR UPDATE + single-transaction)
-- Apply after 20260723120000_t5_auth_credits.sql
-- Service role only. Never expose secrets in error text.

-- Probe: tables + RPC surface ready
create or replace function public.pikbo_probe_ready()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from public.credit_wallets limit 1;
  return jsonb_build_object(
    'ok', true,
    'schemaReady', true,
    'transactionReady', true
  );
exception when undefined_table then
  return jsonb_build_object(
    'ok', false,
    'code', 'SCHEMA_MISSING',
    'schemaReady', false,
    'transactionReady', false
  );
when others then
  return jsonb_build_object(
    'ok', false,
    'code', 'PROBE_ERROR',
    'schemaReady', false,
    'transactionReady', false
  );
end;
$$;

revoke all on function public.pikbo_probe_ready() from public;
grant execute on function public.pikbo_probe_ready() to service_role;

-- Ensure profile + personal account + wallet; optional free bootstrap grant
create or replace function public.pikbo_ensure_personal_account(
  p_user_id uuid,
  p_initial_available integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_idem text;
  v_next int;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_USER');
  end if;

  insert into public.profiles (id, updated_at)
  values (p_user_id, now())
  on conflict (id) do update set updated_at = now();

  select * into v_account
  from public.accounts
  where owner_user_id = p_user_id and kind = 'personal'
  limit 1
  for update;

  if not found then
    insert into public.accounts (kind, owner_user_id, plan_id, status)
    values ('personal', p_user_id, 'free', 'active')
    returning * into v_account;

    insert into public.account_memberships (account_id, user_id, role)
    values (v_account.id, p_user_id, 'owner')
    on conflict do nothing;
  end if;

  select * into v_wallet
  from public.credit_wallets
  where account_id = v_account.id
  for update;

  if not found then
    insert into public.credit_wallets (
      account_id, available_credits, reserved_credits, lifetime_used_credits, version
    ) values (v_account.id, 0, 0, 0, 0)
    returning * into v_wallet;
  end if;

  if coalesce(p_initial_available, 0) > 0 and v_wallet.available_credits = 0 then
    v_idem := 'free:' || v_account.id::text || ':bootstrap';
    if not exists (
      select 1 from public.credit_ledger where idempotency_key = v_idem
    ) then
      v_next := v_wallet.available_credits + p_initial_available;
      update public.credit_wallets
      set available_credits = v_next,
          version = version + 1,
          updated_at = now()
      where account_id = v_account.id
      returning * into v_wallet;

      insert into public.credit_ledger (
        account_id, kind, delta_available, delta_reserved,
        available_after, reserved_after, source_type, source_id, idempotency_key, metadata
      ) values (
        v_account.id, 'grant', p_initial_available, 0,
        v_wallet.available_credits, v_wallet.reserved_credits,
        'free_period', v_idem, v_idem, '{}'::jsonb
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'account', jsonb_build_object(
        'id', v_account.id,
        'kind', v_account.kind,
        'ownerUserId', v_account.owner_user_id,
        'planId', v_account.plan_id,
        'status', v_account.status,
        'createdAt', v_account.created_at,
        'updatedAt', v_account.updated_at
      ),
      'wallet', jsonb_build_object(
        'accountId', v_wallet.account_id,
        'availableCredits', v_wallet.available_credits,
        'reservedCredits', v_wallet.reserved_credits,
        'lifetimeUsedCredits', v_wallet.lifetime_used_credits,
        'version', v_wallet.version,
        'updatedAt', v_wallet.updated_at
      )
    )
  );
end;
$$;

revoke all on function public.pikbo_ensure_personal_account(uuid, integer) from public;
grant execute on function public.pikbo_ensure_personal_account(uuid, integer) to service_role;

-- Free period grant (idempotent)
create or replace function public.pikbo_grant_free_allowance(
  p_account_id uuid,
  p_credits integer,
  p_idempotency_key text,
  p_source_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.credit_wallets%rowtype;
  v_led public.credit_ledger%rowtype;
  v_src text;
begin
  if p_credits is null or p_credits <= 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_AMOUNT');
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 4 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_IDEMPOTENCY');
  end if;

  select * into v_led from public.credit_ledger
  where idempotency_key = p_idempotency_key limit 1;
  if found then
    select * into v_wallet from public.credit_wallets
    where account_id = p_account_id for update;
    return jsonb_build_object(
      'ok', true,
      'data', jsonb_build_object(
        'replay', true,
        'wallet', jsonb_build_object(
          'accountId', v_wallet.account_id,
          'availableCredits', v_wallet.available_credits,
          'reservedCredits', v_wallet.reserved_credits,
          'lifetimeUsedCredits', v_wallet.lifetime_used_credits,
          'version', v_wallet.version,
          'updatedAt', v_wallet.updated_at
        )
      )
    );
  end if;

  select * into v_wallet from public.credit_wallets
  where account_id = p_account_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'WALLET_NOT_FOUND');
  end if;

  update public.credit_wallets
  set available_credits = available_credits + p_credits,
      version = version + 1,
      updated_at = now()
  where account_id = p_account_id
  returning * into v_wallet;

  v_src := coalesce(nullif(trim(p_source_id), ''), p_idempotency_key);
  insert into public.credit_ledger (
    account_id, kind, delta_available, delta_reserved,
    available_after, reserved_after, source_type, source_id, idempotency_key, metadata
  ) values (
    p_account_id, 'grant', p_credits, 0,
    v_wallet.available_credits, v_wallet.reserved_credits,
    'free_period', v_src, p_idempotency_key, '{}'::jsonb
  );

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'replay', false,
      'wallet', jsonb_build_object(
        'accountId', v_wallet.account_id,
        'availableCredits', v_wallet.available_credits,
        'reservedCredits', v_wallet.reserved_credits,
        'lifetimeUsedCredits', v_wallet.lifetime_used_credits,
        'version', v_wallet.version,
        'updatedAt', v_wallet.updated_at
      )
    )
  );
end;
$$;

revoke all on function public.pikbo_grant_free_allowance(uuid, integer, text, text) from public;
grant execute on function public.pikbo_grant_free_allowance(uuid, integer, text, text) to service_role;

-- Reserve credits (atomic)
create or replace function public.pikbo_reserve_credits(
  p_account_id uuid,
  p_created_by uuid,
  p_purpose public.reservation_purpose,
  p_quoted_credits integer,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.credit_wallets%rowtype;
  v_res public.credit_reservations%rowtype;
begin
  if p_quoted_credits is null or p_quoted_credits <= 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_AMOUNT');
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 4 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_IDEMPOTENCY');
  end if;

  select * into v_res from public.credit_reservations
  where idempotency_key = p_idempotency_key limit 1;
  if found then
    select * into v_wallet from public.credit_wallets
    where account_id = p_account_id for update;
    return jsonb_build_object(
      'ok', true,
      'data', jsonb_build_object(
        'replay', true,
        'reservation', row_to_json(v_res),
        'wallet', jsonb_build_object(
          'accountId', v_wallet.account_id,
          'availableCredits', v_wallet.available_credits,
          'reservedCredits', v_wallet.reserved_credits,
          'lifetimeUsedCredits', v_wallet.lifetime_used_credits,
          'version', v_wallet.version,
          'updatedAt', v_wallet.updated_at
        )
      )
    );
  end if;

  select * into v_wallet from public.credit_wallets
  where account_id = p_account_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'WALLET_NOT_FOUND');
  end if;
  if v_wallet.available_credits < p_quoted_credits then
    return jsonb_build_object(
      'ok', false,
      'code', 'INSUFFICIENT_CREDITS',
      'error', format('Need %s, have %s', p_quoted_credits, v_wallet.available_credits)
    );
  end if;

  update public.credit_wallets
  set available_credits = available_credits - p_quoted_credits,
      reserved_credits = reserved_credits + p_quoted_credits,
      version = version + 1,
      updated_at = now()
  where account_id = p_account_id
  returning * into v_wallet;

  insert into public.credit_reservations (
    account_id, purpose, quoted_credits, settled_credits, released_credits,
    status, idempotency_key, expires_at, created_by
  ) values (
    p_account_id, p_purpose, p_quoted_credits, 0, 0,
    'reserved', p_idempotency_key, now() + interval '30 minutes', p_created_by
  )
  returning * into v_res;

  insert into public.credit_ledger (
    account_id, kind, delta_available, delta_reserved,
    available_after, reserved_after, reservation_id,
    source_type, source_id, idempotency_key, metadata
  ) values (
    p_account_id, 'reserve', -p_quoted_credits, p_quoted_credits,
    v_wallet.available_credits, v_wallet.reserved_credits, v_res.id,
    'reservation', v_res.id::text, 'ledger:reserve:' || p_idempotency_key,
    jsonb_build_object('purpose', p_purpose::text)
  );

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'replay', false,
      'reservation', row_to_json(v_res),
      'wallet', jsonb_build_object(
        'accountId', v_wallet.account_id,
        'availableCredits', v_wallet.available_credits,
        'reservedCredits', v_wallet.reserved_credits,
        'lifetimeUsedCredits', v_wallet.lifetime_used_credits,
        'version', v_wallet.version,
        'updatedAt', v_wallet.updated_at
      )
    )
  );
end;
$$;

revoke all on function public.pikbo_reserve_credits(uuid, uuid, public.reservation_purpose, integer, text) from public;
grant execute on function public.pikbo_reserve_credits(uuid, uuid, public.reservation_purpose, integer, text) to service_role;

-- Settle or release helper pattern
create or replace function public.pikbo_settle_credits(
  p_reservation_id uuid,
  p_credits integer,
  p_idempotency_key text,
  p_job_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.credit_reservations%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_remaining int;
  v_settled int;
  v_released int;
  v_status public.reservation_status;
begin
  if p_credits is null or p_credits <= 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_AMOUNT');
  end if;

  if exists (select 1 from public.credit_ledger where idempotency_key = p_idempotency_key) then
    select * into v_res from public.credit_reservations where id = p_reservation_id;
    select * into v_wallet from public.credit_wallets where account_id = v_res.account_id;
    return jsonb_build_object(
      'ok', true,
      'data', jsonb_build_object(
        'replay', true,
        'reservation', row_to_json(v_res),
        'wallet', jsonb_build_object(
          'accountId', v_wallet.account_id,
          'availableCredits', v_wallet.available_credits,
          'reservedCredits', v_wallet.reserved_credits,
          'lifetimeUsedCredits', v_wallet.lifetime_used_credits,
          'version', v_wallet.version,
          'updatedAt', v_wallet.updated_at
        )
      )
    );
  end if;

  select * into v_res from public.credit_reservations
  where id = p_reservation_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_FOUND');
  end if;

  v_remaining := v_res.quoted_credits - v_res.settled_credits - v_res.released_credits;
  if p_credits > v_remaining then
    return jsonb_build_object('ok', false, 'code', 'OVER_BUDGET');
  end if;

  select * into v_wallet from public.credit_wallets
  where account_id = v_res.account_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'WALLET_NOT_FOUND');
  end if;
  if v_wallet.reserved_credits < p_credits then
    return jsonb_build_object('ok', false, 'code', 'RESERVED_UNDERFLOW');
  end if;

  update public.credit_wallets
  set reserved_credits = reserved_credits - p_credits,
      lifetime_used_credits = lifetime_used_credits + p_credits,
      version = version + 1,
      updated_at = now()
  where account_id = v_res.account_id
  returning * into v_wallet;

  v_settled := v_res.settled_credits + p_credits;
  v_released := v_res.released_credits;
  if v_settled + v_released >= v_res.quoted_credits then
    if v_released = 0 then v_status := 'settled';
    elsif v_settled = 0 then v_status := 'released';
    else v_status := 'partially_settled';
    end if;
  else
    v_status := 'partially_settled';
  end if;

  update public.credit_reservations
  set settled_credits = v_settled,
      status = v_status,
      updated_at = now()
  where id = p_reservation_id
  returning * into v_res;

  insert into public.credit_ledger (
    account_id, kind, delta_available, delta_reserved,
    available_after, reserved_after, reservation_id,
    source_type, source_id, idempotency_key, metadata
  ) values (
    v_res.account_id, 'settle', 0, -p_credits,
    v_wallet.available_credits, v_wallet.reserved_credits, v_res.id,
    'settle', coalesce(p_job_id, v_res.id::text), p_idempotency_key,
    jsonb_build_object('jobId', p_job_id)
  );

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'replay', false,
      'reservation', row_to_json(v_res),
      'wallet', jsonb_build_object(
        'accountId', v_wallet.account_id,
        'availableCredits', v_wallet.available_credits,
        'reservedCredits', v_wallet.reserved_credits,
        'lifetimeUsedCredits', v_wallet.lifetime_used_credits,
        'version', v_wallet.version,
        'updatedAt', v_wallet.updated_at
      )
    )
  );
end;
$$;

revoke all on function public.pikbo_settle_credits(uuid, integer, text, text) from public;
grant execute on function public.pikbo_settle_credits(uuid, integer, text, text) to service_role;

create or replace function public.pikbo_release_credits(
  p_reservation_id uuid,
  p_credits integer,
  p_idempotency_key text,
  p_reason text default null,
  p_job_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.credit_reservations%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_remaining int;
  v_settled int;
  v_released int;
  v_status public.reservation_status;
begin
  if p_credits is null or p_credits <= 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_AMOUNT');
  end if;

  if exists (select 1 from public.credit_ledger where idempotency_key = p_idempotency_key) then
    select * into v_res from public.credit_reservations where id = p_reservation_id;
    select * into v_wallet from public.credit_wallets where account_id = v_res.account_id;
    return jsonb_build_object(
      'ok', true,
      'data', jsonb_build_object(
        'replay', true,
        'reservation', row_to_json(v_res),
        'wallet', jsonb_build_object(
          'accountId', v_wallet.account_id,
          'availableCredits', v_wallet.available_credits,
          'reservedCredits', v_wallet.reserved_credits,
          'lifetimeUsedCredits', v_wallet.lifetime_used_credits,
          'version', v_wallet.version,
          'updatedAt', v_wallet.updated_at
        )
      )
    );
  end if;

  select * into v_res from public.credit_reservations
  where id = p_reservation_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_FOUND');
  end if;

  v_remaining := v_res.quoted_credits - v_res.settled_credits - v_res.released_credits;
  if p_credits > v_remaining then
    return jsonb_build_object('ok', false, 'code', 'OVER_BUDGET');
  end if;

  select * into v_wallet from public.credit_wallets
  where account_id = v_res.account_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'WALLET_NOT_FOUND');
  end if;
  if v_wallet.reserved_credits < p_credits then
    return jsonb_build_object('ok', false, 'code', 'RESERVED_UNDERFLOW');
  end if;

  update public.credit_wallets
  set available_credits = available_credits + p_credits,
      reserved_credits = reserved_credits - p_credits,
      version = version + 1,
      updated_at = now()
  where account_id = v_res.account_id
  returning * into v_wallet;

  v_settled := v_res.settled_credits;
  v_released := v_res.released_credits + p_credits;
  if v_settled + v_released >= v_res.quoted_credits then
    if v_settled = 0 then v_status := 'released';
    elsif v_released = 0 then v_status := 'settled';
    else v_status := 'partially_settled';
    end if;
  else
    v_status := 'partially_settled';
  end if;

  update public.credit_reservations
  set released_credits = v_released,
      status = v_status,
      updated_at = now()
  where id = p_reservation_id
  returning * into v_res;

  insert into public.credit_ledger (
    account_id, kind, delta_available, delta_reserved,
    available_after, reserved_after, reservation_id,
    source_type, source_id, idempotency_key, metadata
  ) values (
    v_res.account_id, 'release', p_credits, -p_credits,
    v_wallet.available_credits, v_wallet.reserved_credits, v_res.id,
    'release', coalesce(p_job_id, v_res.id::text), p_idempotency_key,
    jsonb_build_object('reason', p_reason, 'jobId', p_job_id)
  );

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'replay', false,
      'reservation', row_to_json(v_res),
      'wallet', jsonb_build_object(
        'accountId', v_wallet.account_id,
        'availableCredits', v_wallet.available_credits,
        'reservedCredits', v_wallet.reserved_credits,
        'lifetimeUsedCredits', v_wallet.lifetime_used_credits,
        'version', v_wallet.version,
        'updatedAt', v_wallet.updated_at
      )
    )
  );
end;
$$;

revoke all on function public.pikbo_release_credits(uuid, integer, text, text, text) from public;
grant execute on function public.pikbo_release_credits(uuid, integer, text, text, text) to service_role;

-- Guest cookie migration (max 10, once per guest hash)
create or replace function public.pikbo_migrate_guest_credits(
  p_guest_session_id_hash text,
  p_user_id uuid,
  p_account_id uuid,
  p_cookie_credits integer,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.credit_wallets%rowtype;
  v_migrated int;
begin
  if exists (
    select 1 from public.consumed_guest_sessions
    where guest_session_id_hash = p_guest_session_id_hash
  ) then
    select * into v_wallet from public.credit_wallets where account_id = p_account_id;
    return jsonb_build_object(
      'ok', true,
      'data', jsonb_build_object(
        'migrated', 0,
        'replay', true,
        'wallet', jsonb_build_object(
          'accountId', v_wallet.account_id,
          'availableCredits', v_wallet.available_credits,
          'reservedCredits', v_wallet.reserved_credits,
          'lifetimeUsedCredits', v_wallet.lifetime_used_credits,
          'version', v_wallet.version,
          'updatedAt', v_wallet.updated_at
        )
      )
    );
  end if;

  if exists (select 1 from public.credit_ledger where idempotency_key = p_idempotency_key) then
    select * into v_wallet from public.credit_wallets where account_id = p_account_id;
    insert into public.consumed_guest_sessions (
      guest_session_id_hash, user_id, account_id, migrated_credits
    ) values (p_guest_session_id_hash, p_user_id, p_account_id, 0)
    on conflict do nothing;
    return jsonb_build_object(
      'ok', true,
      'data', jsonb_build_object(
        'migrated', 0,
        'replay', true,
        'wallet', jsonb_build_object(
          'accountId', v_wallet.account_id,
          'availableCredits', v_wallet.available_credits,
          'reservedCredits', v_wallet.reserved_credits,
          'lifetimeUsedCredits', v_wallet.lifetime_used_credits,
          'version', v_wallet.version,
          'updatedAt', v_wallet.updated_at
        )
      )
    );
  end if;

  select * into v_wallet from public.credit_wallets
  where account_id = p_account_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'WALLET_NOT_FOUND');
  end if;

  -- Already has durable balance — consume guest with 0 migrate
  if v_wallet.available_credits > 0 or v_wallet.reserved_credits > 0 then
    insert into public.consumed_guest_sessions (
      guest_session_id_hash, user_id, account_id, migrated_credits
    ) values (p_guest_session_id_hash, p_user_id, p_account_id, 0)
    on conflict do nothing;
    return jsonb_build_object(
      'ok', true,
      'data', jsonb_build_object(
        'migrated', 0,
        'replay', false,
        'wallet', jsonb_build_object(
          'accountId', v_wallet.account_id,
          'availableCredits', v_wallet.available_credits,
          'reservedCredits', v_wallet.reserved_credits,
          'lifetimeUsedCredits', v_wallet.lifetime_used_credits,
          'version', v_wallet.version,
          'updatedAt', v_wallet.updated_at
        )
      )
    );
  end if;

  v_migrated := least(10, greatest(0, coalesce(p_cookie_credits, 0)));
  if v_migrated = 0 then
    insert into public.consumed_guest_sessions (
      guest_session_id_hash, user_id, account_id, migrated_credits
    ) values (p_guest_session_id_hash, p_user_id, p_account_id, 0)
    on conflict do nothing;
    return jsonb_build_object(
      'ok', true,
      'data', jsonb_build_object(
        'migrated', 0,
        'replay', false,
        'wallet', jsonb_build_object(
          'accountId', v_wallet.account_id,
          'availableCredits', v_wallet.available_credits,
          'reservedCredits', v_wallet.reserved_credits,
          'lifetimeUsedCredits', v_wallet.lifetime_used_credits,
          'version', v_wallet.version,
          'updatedAt', v_wallet.updated_at
        )
      )
    );
  end if;

  update public.credit_wallets
  set available_credits = available_credits + v_migrated,
      version = version + 1,
      updated_at = now()
  where account_id = p_account_id
  returning * into v_wallet;

  insert into public.credit_ledger (
    account_id, kind, delta_available, delta_reserved,
    available_after, reserved_after, source_type, source_id, idempotency_key, metadata
  ) values (
    p_account_id, 'migration', v_migrated, 0,
    v_wallet.available_credits, v_wallet.reserved_credits,
    'migration', p_guest_session_id_hash, p_idempotency_key, '{}'::jsonb
  );

  insert into public.consumed_guest_sessions (
    guest_session_id_hash, user_id, account_id, migrated_credits
  ) values (p_guest_session_id_hash, p_user_id, p_account_id, v_migrated)
  on conflict do nothing;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'migrated', v_migrated,
      'replay', false,
      'wallet', jsonb_build_object(
        'accountId', v_wallet.account_id,
        'availableCredits', v_wallet.available_credits,
        'reservedCredits', v_wallet.reserved_credits,
        'lifetimeUsedCredits', v_wallet.lifetime_used_credits,
        'version', v_wallet.version,
        'updatedAt', v_wallet.updated_at
      )
    )
  );
end;
$$;

revoke all on function public.pikbo_migrate_guest_credits(text, uuid, uuid, integer, text) from public;
grant execute on function public.pikbo_migrate_guest_credits(text, uuid, uuid, integer, text) to service_role;
