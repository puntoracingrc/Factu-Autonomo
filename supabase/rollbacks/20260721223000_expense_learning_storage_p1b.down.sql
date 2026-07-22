begin;

do $$
declare
  v_table text;
  v_has_rows boolean;
begin
  foreach v_table in array array[
    'contribution_claims',
    'contributor_week_limits',
    'accumulator_memberships',
    'protected_accumulators',
    'closed_week_supported_metrics'
  ] loop
    if pg_catalog.to_regclass(
      pg_catalog.format('expense_learning_private.%I', v_table)
    ) is not null then
      execute pg_catalog.format(
        'select exists (select 1 from expense_learning_private.%I)',
        v_table
      ) into v_has_rows;

      if v_has_rows then
        raise exception
          'Expense learning runtime storage is not empty; rollback is unsafe'
          using errcode = '55000';
      end if;
    end if;
  end loop;
end;
$$;

drop function if exists public.submit_expense_learning_contribution_v1(
  jsonb,
  text,
  text
);
drop function if exists public.promote_expense_learning_closed_weeks_v1();
drop function if exists public.purge_expense_learning_retention_v1();

drop table if exists expense_learning_private.closed_week_supported_metrics;
drop table if exists expense_learning_private.protected_accumulators;
drop table if exists expense_learning_private.accumulator_memberships;
drop table if exists expense_learning_private.contributor_week_limits;
drop table if exists expense_learning_private.contribution_claims;

drop function if exists expense_learning_private.has_canonical_versions_v1(
  text,
  text,
  text,
  text
);
drop function if exists expense_learning_private.is_service_role_request_v1();
drop function if exists expense_learning_private.is_canonical_metric_bucket_v1(
  text,
  text,
  text,
  text,
  text
);
drop function if exists expense_learning_private.is_canonical_metric_coordinate_v1(
  text,
  text,
  text
);

drop schema if exists expense_learning_private restrict;
revoke expense_learning_storage_owner from postgres;
drop role if exists expense_learning_storage_owner;

notify pgrst, 'reload schema';

commit;
