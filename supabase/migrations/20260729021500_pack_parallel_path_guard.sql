-- Prevent Seller Pack jobs from ever entering the legacy whole-reservation
-- single-generation release/reconciliation path. Pack accounting is child
-- scoped (10 credits each) and attempt fenced; releasing the shared 30-credit
-- reservation through R1a would corrupt both lock ordering and the Pack ledger.

do $guard$
begin
  if to_regprocedure(
       'public.pikbo_release_generation_unchecked_v1(uuid,uuid,uuid,text)'
     ) is null then
    alter function public.pikbo_release_generation_v1(
      uuid, uuid, uuid, text
    ) rename to pikbo_release_generation_unchecked_v1;
  end if;
  if to_regprocedure(
       'public.pikbo_record_generation_outcome_unchecked_v1(uuid,uuid,uuid,text,text,text,text,text)'
     ) is null then
    alter function public.pikbo_record_generation_outcome_v1(
      uuid, uuid, uuid, text, text, text, text, text
    ) rename to pikbo_record_generation_outcome_unchecked_v1;
  end if;
end
$guard$;

create or replace function public.pikbo_release_generation_v1(
  p_user_id uuid,
  p_reservation_id uuid,
  p_job_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation public.credit_reservations%rowtype;
  v_job public.generation_jobs%rowtype;
begin
  -- Preserve the canonical reservation -> job lock order before delegating to
  -- the historical single-generation implementation.
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
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'JOB_BINDING_MISMATCH');
  end if;

  if v_reservation.purpose::text <> 'generation'
     or v_job.pack_run_id is not null then
    return jsonb_build_object(
      'ok', false, 'code', 'PACK_PARALLEL_PATH_FORBIDDEN'
    );
  end if;

  -- Any provider/private-output evidence makes a failure refund ambiguous.
  -- The R1c Worker must reconcile it; never delete or refund it here.
  if v_job.output_object_key is not null
     or v_job.output_content_type is not null
     or v_job.output_byte_length is not null
     or v_job.output_sha256 is not null
     or v_job.provider_request_id is not null then
    return jsonb_build_object(
      'ok', false, 'code', 'PRIVATE_RESULT_RECONCILIATION_REQUIRED'
    );
  end if;

  return public.pikbo_release_generation_unchecked_v1(
    p_user_id,
    p_reservation_id,
    p_job_id,
    p_reason
  );
end;
$$;

create or replace function public.pikbo_record_generation_outcome_v1(
  p_user_id uuid,
  p_reservation_id uuid,
  p_job_id uuid,
  p_event_id text,
  p_event_type text,
  p_provider_request_id text default null,
  p_output_ref text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation public.credit_reservations%rowtype;
  v_job public.generation_jobs%rowtype;
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
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'JOB_BINDING_MISMATCH');
  end if;

  if v_reservation.purpose::text <> 'generation'
     or v_job.pack_run_id is not null then
    return jsonb_build_object(
      'ok', false, 'code', 'PACK_PARALLEL_PATH_FORBIDDEN'
    );
  end if;

  return public.pikbo_record_generation_outcome_unchecked_v1(
    p_user_id,
    p_reservation_id,
    p_job_id,
    p_event_id,
    p_event_type,
    p_provider_request_id,
    p_output_ref,
    p_reason
  );
end;
$$;

revoke all on function public.pikbo_release_generation_unchecked_v1(
  uuid, uuid, uuid, text
) from public, anon, authenticated, service_role;
revoke all on function public.pikbo_record_generation_outcome_unchecked_v1(
  uuid, uuid, uuid, text, text, text, text, text
) from public, anon, authenticated, service_role;

revoke all on function public.pikbo_release_generation_v1(
  uuid, uuid, uuid, text
) from public, anon, authenticated;
revoke all on function public.pikbo_record_generation_outcome_v1(
  uuid, uuid, uuid, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.pikbo_release_generation_v1(
  uuid, uuid, uuid, text
) to service_role;
grant execute on function public.pikbo_record_generation_outcome_v1(
  uuid, uuid, uuid, text, text, text, text, text
) to service_role;

comment on function public.pikbo_release_generation_v1 is
  'Single-generation release only. Seller Pack/shared reservations and any private-output evidence fail closed.';
comment on function public.pikbo_record_generation_outcome_v1 is
  'Single-generation reconciliation intake only. Seller Pack outcomes use the attempt-fenced Pack worker path.';
