-- PIKBO private-result settlement guard.
-- SOURCE ONLY. Apply after:
--   20260723120000_t5_auth_credits.sql
--   20260727213000_r1_atomic_generation_credits.sql
--   20260728233000_p0_private_generation_results.sql
--
-- Replaces the original single-generation capture RPC so a wallet can only be
-- charged after the service-role attach RPC stored a complete Pikbo-owned
-- private object record. This is a forward migration for rehearsals that may
-- already have applied the earlier R1a function.

create or replace function public.pikbo_capture_generation_v1(
  p_user_id uuid,
  p_reservation_id uuid,
  p_job_id uuid,
  p_provider_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation public.credit_reservations%rowtype;
  v_job public.generation_jobs%rowtype;
  v_wallet public.credit_wallets%rowtype;
  v_amount integer;
  v_expected_key text;
begin
  select *
    into v_reservation
    from public.credit_reservations
   where id = p_reservation_id
   for update;
  if not found or v_reservation.created_by <> p_user_id then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_FOUND');
  end if;

  select *
    into v_job
    from public.generation_jobs
   where id = p_job_id
     and reservation_id = p_reservation_id
     and created_by = p_user_id
     and pack_run_id is null
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'JOB_BINDING_MISMATCH');
  end if;

  v_expected_key :=
    'private-results/' || p_user_id::text || '/' || p_job_id::text || '.mp4';
  if v_job.output_object_key is distinct from v_expected_key
     or v_job.output_content_type is distinct from 'video/mp4'
     or v_job.output_byte_length is null
     or v_job.output_byte_length not between 32 and 67108864
     or v_job.output_sha256 is null
     or v_job.output_sha256 !~ '^[a-f0-9]{64}$'
     or v_job.provider_request_id is null
     or length(btrim(v_job.provider_request_id)) = 0 then
    return jsonb_build_object('ok', false, 'code', 'PRIVATE_RESULT_REQUIRED');
  end if;
  if p_provider_request_id is not null
     and btrim(p_provider_request_id) is distinct from
       btrim(v_job.provider_request_id) then
    return jsonb_build_object('ok', false, 'code', 'PROVIDER_REQUEST_MISMATCH');
  end if;

  select *
    into v_wallet
    from public.credit_wallets
   where account_id = v_reservation.account_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'DURABLE_WALLET_NOT_FOUND');
  end if;

  if v_reservation.status = 'settled' then
    if v_job.status <> 'succeeded' or v_job.settled_credits <= 0 then
      return jsonb_build_object('ok', false, 'code', 'SETTLEMENT_STATE_INVALID');
    end if;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'status', 'captured',
      'reservationId', v_reservation.id,
      'jobId', v_job.id,
      'availableCredits', v_wallet.available_credits,
      'reservedCredits', v_wallet.reserved_credits
    );
  end if;
  if v_reservation.status <> 'reserved' or v_job.status <> 'running' then
    return jsonb_build_object('ok', false, 'code', 'RESERVATION_NOT_ACTIVE');
  end if;

  v_amount :=
    v_reservation.quoted_credits
    - v_reservation.settled_credits
    - v_reservation.released_credits;
  if v_amount <= 0 or v_wallet.reserved_credits < v_amount then
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
         status = 'settled',
         updated_at = now()
   where id = v_reservation.id
   returning * into v_reservation;

  update public.generation_jobs
     set status = 'succeeded',
         settled_credits = settled_credits + v_amount,
         completed_at = now()
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
    'settle',
    0,
    -v_amount,
    v_wallet.available_credits,
    v_wallet.reserved_credits,
    v_reservation.id,
    'generation_capture',
    v_job.id::text,
    'ledger:capture:' || v_reservation.id::text,
    jsonb_build_object(
      'providerRequestId', v_job.provider_request_id,
      'outputObjectKey', v_job.output_object_key
    )
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'status', 'captured',
    'reservationId', v_reservation.id,
    'jobId', v_job.id,
    'availableCredits', v_wallet.available_credits,
    'reservedCredits', v_wallet.reserved_credits
  );
end;
$$;

revoke all on function public.pikbo_capture_generation_v1(
  uuid, uuid, uuid, text
) from public, anon, authenticated;

grant execute on function public.pikbo_capture_generation_v1(
  uuid, uuid, uuid, text
) to service_role;
