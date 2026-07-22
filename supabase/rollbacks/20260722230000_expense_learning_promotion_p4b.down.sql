begin;

do $$
begin
  if exists (
    select 1
    from expense_learning_private.closed_week_promotion_batches
  ) or exists (
    select 1
    from expense_learning_private.closed_week_supported_metrics
  ) then
    raise exception 'Expense learning P4B storage is not empty; rollback is unsafe'
      using errcode = '55000';
  end if;
end;
$$;

create or replace function public.promote_expense_learning_closed_weeks_v1()
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if expense_learning_private.is_service_role_request_v1()
    is distinct from true then
    raise exception 'expense_learning_rpc_forbidden'
      using errcode = '42501';
  end if;

  return 'DISABLED';
end;
$$;

create or replace function expense_learning_private.lock_expense_learning_cells_v1(
  p_contribution jsonb,
  p_week_start date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_metric record;
begin
  for v_metric in
    select
      metric ->> 'family' as metric_family,
      metric ->> 'comparisonScope' as comparison_scope,
      metric ->> 'key' as metric_key,
      metric ->> 'value' as bucket_value
    from pg_catalog.jsonb_array_elements(
      p_contribution -> 'metrics'
    ) as metrics(metric)
    order by
      metric ->> 'family',
      metric ->> 'comparisonScope',
      metric ->> 'key',
      metric ->> 'value'
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      expense_learning_private.expense_learning_cell_lock_key_v1(
        p_contribution ->> 'schemaVersion',
        p_contribution ->> 'observationSchemaVersion',
        p_contribution ->> 'engineVersion',
        p_contribution ->> 'privacyPolicyVersion',
        p_week_start,
        p_contribution ->> 'structuralArchetypeGroup',
        v_metric.metric_family,
        v_metric.comparison_scope,
        v_metric.metric_key,
        'EXACT',
        v_metric.bucket_value
      )
    );
  end loop;
end;
$$;

drop function expense_learning_private.run_expense_learning_promotion_v1(
  timestamptz
);
drop function expense_learning_private.is_expense_learning_promotion_source_safe_v1(
  text,
  text,
  text,
  text,
  date,
  text
);
drop function expense_learning_private.expense_learning_support_band_v1(
  integer
);

drop policy expense_learning_closed_metrics_owner_insert_v1
  on expense_learning_private.closed_week_supported_metrics;

alter table expense_learning_private.closed_week_supported_metrics
  drop constraint closed_week_supported_metrics_fixed_expiry_v1,
  drop constraint closed_week_supported_metrics_fixed_promotion_v1,
  drop constraint closed_week_supported_metrics_p4b_allowlist_v1,
  drop constraint closed_week_supported_metrics_support_band_v1,
  drop column support_band,
  add column supporting_contributors smallint not null,
  add constraint closed_week_supported_metrics_support_v1
    check (supporting_contributors >= 10);

drop policy expense_learning_promotion_batches_owner_delete_v1
  on expense_learning_private.closed_week_promotion_batches;
drop policy expense_learning_promotion_batches_owner_insert_v1
  on expense_learning_private.closed_week_promotion_batches;
drop policy expense_learning_promotion_batches_owner_select_v1
  on expense_learning_private.closed_week_promotion_batches;
drop table expense_learning_private.closed_week_promotion_batches restrict;

alter function expense_learning_private.lock_expense_learning_cells_v1(
  jsonb,
  date
) owner to expense_learning_storage_owner;
alter function public.promote_expense_learning_closed_weeks_v1()
  owner to expense_learning_storage_owner;

revoke all on all functions in schema expense_learning_private
  from public, anon, authenticated, service_role;
revoke all on function public.promote_expense_learning_closed_weeks_v1()
  from public, anon, authenticated, service_role;
grant execute on function public.promote_expense_learning_closed_weeks_v1()
  to service_role;

notify pgrst, 'reload schema';

commit;
