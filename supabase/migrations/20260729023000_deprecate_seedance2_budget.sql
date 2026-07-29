-- Retire the older model-specific ceiling after the project-wide US$20
-- validation budget is installed. Preserve historical audit rows, but make
-- the old admission path fail closed in every environment.

do $$
begin
  if to_regclass('public.seedance2_paid_ceilings') is not null then
    update public.seedance2_paid_ceilings
       set ceiling_usd = spent_usd,
           note = 'Deprecated: no remaining headroom; use provider_validation_budgets',
           updated_at = now()
     where ceiling_usd is distinct from spent_usd
        or note is distinct from
           'Deprecated: no remaining headroom; use provider_validation_budgets';

    comment on table public.seedance2_paid_ceilings is
      'Deprecated model-specific ceiling. Headroom is permanently zero; retained for historical audit only.';
  end if;

  if to_regclass('public.seedance2_cost_audit') is not null then
    comment on table public.seedance2_cost_audit is
      'Historical Seedance 2.0 cost audit. New validation spend uses provider_spend_reservations.';
  end if;
end
$$;

create or replace function public.pikbo_reserve_seedance2_cost_v1(
  p_user_id uuid,
  p_idempotency_key text,
  p_job_id uuid,
  p_duration_seconds integer,
  p_resolution text,
  p_estimated_usd numeric,
  p_scope_key text default 'global'
)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'ok', false,
    'code', 'PROVIDER_BUDGET_V1_DEPRECATED',
    'message', 'Use the project-wide provider validation budget'
  );
$$;

revoke all on function public.pikbo_reserve_seedance2_cost_v1(
  uuid, text, uuid, integer, text, numeric, text
) from public, anon, authenticated, service_role;

comment on function public.pikbo_reserve_seedance2_cost_v1 is
  'Deprecated and fail-closed. Provider admission is exclusively project-wide through pikbo_reserve_provider_spend_v1.';
