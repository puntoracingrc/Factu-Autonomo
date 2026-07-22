begin;

do $$
declare
  v_owner_oid oid;
begin
  select role.oid
  into v_owner_oid
  from pg_catalog.pg_roles as role
  where role.rolname = 'expense_learning_storage_owner'
    and role.rolcanlogin = false
    and role.rolinherit = false
    and role.rolsuper = false
    and role.rolcreatedb = false
    and role.rolcreaterole = false
    and role.rolreplication = false
    and role.rolbypassrls = false;

  if v_owner_oid is null
    or not exists (
      select 1
      from pg_catalog.pg_namespace as namespace
      where namespace.nspname = 'expense_learning_private'
        and namespace.nspowner = v_owner_oid
    )
    or pg_catalog.to_regclass(
      'expense_learning_private.closed_week_supported_metrics'
    ) is null
    or pg_catalog.to_regclass(
      'expense_learning_private.closed_week_promotion_batches'
    ) is null
    or pg_catalog.to_regprocedure(
      'expense_learning_private.is_service_role_request_v1()'
    ) is null
    or pg_catalog.to_regprocedure(
      'expense_learning_private.expense_learning_retention_lookahead_v1()'
    ) is null
    or not exists (
      select 1
      from pg_catalog.pg_constraint as constraint_record
      join pg_catalog.pg_class as relation
        on relation.oid = constraint_record.conrelid
      join pg_catalog.pg_namespace as namespace
        on namespace.oid = relation.relnamespace
      where namespace.nspname = 'expense_learning_private'
        and relation.relname = 'closed_week_supported_metrics'
        and constraint_record.conname =
          'closed_week_supported_metrics_p4b_allowlist_v1'
    )
    or not exists (
      select 1
      from pg_catalog.pg_attribute as attribute
      join pg_catalog.pg_class as relation
        on relation.oid = attribute.attrelid
      join pg_catalog.pg_namespace as namespace
        on namespace.oid = relation.relnamespace
      where namespace.nspname = 'expense_learning_private'
        and relation.relname = 'closed_week_supported_metrics'
        and attribute.attname = 'support_band'
        and attribute.attnum > 0
        and not attribute.attisdropped
    ) then
    raise exception 'expense_learning_p5_prerequisite_invalid'
      using errcode = '55000';
  end if;

  if pg_catalog.to_regprocedure(
    'public.read_expense_learning_closed_week_metrics_v1()'
  ) is not null then
    raise exception 'expense_learning_p5_objects_already_exist'
      using errcode = '42710';
  end if;
end;
$$;

create function public.read_expense_learning_closed_week_metrics_v1()
returns table (
  contribution_schema_version text,
  observation_schema_version text,
  engine_version text,
  privacy_policy_version text,
  week_start date,
  structural_archetype_group text,
  metric_family text,
  comparison_scope text,
  metric_key text,
  bucket_kind text,
  bucket_value text,
  support_band text,
  promoted_at timestamptz,
  expires_at timestamptz
)
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

  return query
  select
    metric.contribution_schema_version,
    metric.observation_schema_version,
    metric.engine_version,
    metric.privacy_policy_version,
    metric.week_start,
    metric.structural_archetype_group,
    metric.metric_family,
    metric.comparison_scope,
    metric.metric_key,
    metric.bucket_kind,
    metric.bucket_value,
    metric.support_band,
    metric.promoted_at,
    metric.expires_at
  from expense_learning_private.closed_week_supported_metrics as metric
  join expense_learning_private.closed_week_promotion_batches as batch
    on batch.contribution_schema_version =
        metric.contribution_schema_version
      and batch.observation_schema_version =
        metric.observation_schema_version
      and batch.engine_version = metric.engine_version
      and batch.privacy_policy_version = metric.privacy_policy_version
      and batch.week_start = metric.week_start
      and batch.structural_archetype_group =
        metric.structural_archetype_group
  where batch.batch_state = 'PROMOTED'
    and batch.privacy_evaluation_version =
      'expense-learning-human-review-coarsening.v1'
    and metric.metric_family = 'HUMAN_REVIEW'
    and metric.comparison_scope = 'NONE'
    and metric.metric_key = 'VALUE'
    and metric.week_start < (
      pg_catalog.date_trunc(
        'week',
        pg_catalog.clock_timestamp() at time zone 'UTC'
      )::date
    )
    and metric.promoted_at <= pg_catalog.clock_timestamp()
    and metric.expires_at > pg_catalog.clock_timestamp()
  order by
    metric.week_start desc,
    metric.structural_archetype_group,
    metric.bucket_kind,
    metric.bucket_value
  limit 1024;
end;
$$;

grant create on schema public to expense_learning_storage_owner;

alter function public.read_expense_learning_closed_week_metrics_v1()
  owner to expense_learning_storage_owner;

revoke create on schema public from expense_learning_storage_owner;

revoke all on function public.read_expense_learning_closed_week_metrics_v1()
  from public, anon, authenticated, service_role;
grant execute on function public.read_expense_learning_closed_week_metrics_v1()
  to service_role;

notify pgrst, 'reload schema';

commit;
