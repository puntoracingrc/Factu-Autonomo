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
    or pg_catalog.to_regprocedure(
      'expense_learning_private.is_expense_learning_week_source_canonical_v1(date)'
    ) is null
    or pg_catalog.to_regprocedure(
      'expense_learning_private.is_expense_learning_week_accumulator_consistent_v1(date)'
    ) is null
    or pg_catalog.to_regprocedure(
      'expense_learning_private.is_expense_learning_link_cleanup_eligible_v1(uuid,date,timestamp with time zone)'
    ) is null
    or pg_catalog.to_regprocedure(
      'expense_learning_private.lock_expense_learning_cells_v1(jsonb,date)'
    ) is null
    or pg_catalog.to_regprocedure(
      'public.promote_expense_learning_closed_weeks_v1()'
    ) is null then
    raise exception 'expense_learning_p4b_prerequisite_invalid'
      using errcode = '55000';
  end if;

  if pg_catalog.to_regclass(
    'expense_learning_private.closed_week_promotion_batches'
  ) is not null
    or pg_catalog.to_regprocedure(
      'expense_learning_private.run_expense_learning_promotion_v1(timestamp with time zone)'
    ) is not null then
    raise exception 'expense_learning_p4b_objects_already_exist'
      using errcode = '42710';
  end if;

  if exists (
    select 1
    from expense_learning_private.closed_week_supported_metrics
  ) then
    raise exception 'expense_learning_p4b_promoted_storage_not_empty'
      using errcode = '55000';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_attribute as attribute
    join pg_catalog.pg_class as relation
      on relation.oid = attribute.attrelid
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'expense_learning_private'
      and relation.relname = 'closed_week_supported_metrics'
      and attribute.attname = 'supporting_contributors'
      and attribute.attnum > 0
      and not attribute.attisdropped
  ) then
    raise exception 'expense_learning_p4b_support_column_invalid'
      using errcode = '55000';
  end if;
end;
$$;

create table expense_learning_private.closed_week_promotion_batches (
  contribution_schema_version text not null,
  observation_schema_version text not null,
  engine_version text not null,
  privacy_policy_version text not null,
  week_start date not null,
  structural_archetype_group text not null,
  privacy_evaluation_version text not null,
  batch_state text not null,
  primary key (
    contribution_schema_version,
    observation_schema_version,
    engine_version,
    privacy_policy_version,
    week_start,
    structural_archetype_group
  ),
  constraint closed_week_promotion_batches_versions_v1
    check (expense_learning_private.has_canonical_versions_v1(
      contribution_schema_version,
      observation_schema_version,
      engine_version,
      privacy_policy_version
    )),
  constraint closed_week_promotion_batches_monday_v1
    check (pg_catalog.date_part('isodow', week_start) = 1),
  constraint closed_week_promotion_batches_group_v1
    check (structural_archetype_group in (
      'TABLE',
      'SUMMARY',
      'OTHER',
      'UNKNOWN'
    )),
  constraint closed_week_promotion_batches_evaluation_v1
    check (
      privacy_evaluation_version =
        'expense-learning-human-review-coarsening.v1'
    ),
  constraint closed_week_promotion_batches_state_v1
    check (batch_state in ('PROMOTED', 'DISCARDED'))
);

alter table expense_learning_private.closed_week_promotion_batches
  owner to expense_learning_storage_owner;
alter table expense_learning_private.closed_week_promotion_batches
  enable row level security;
alter table expense_learning_private.closed_week_promotion_batches
  force row level security;

create policy expense_learning_promotion_batches_owner_select_v1
  on expense_learning_private.closed_week_promotion_batches
  for select to expense_learning_storage_owner using (true);
create policy expense_learning_promotion_batches_owner_insert_v1
  on expense_learning_private.closed_week_promotion_batches
  for insert to expense_learning_storage_owner with check (true);
create policy expense_learning_promotion_batches_owner_delete_v1
  on expense_learning_private.closed_week_promotion_batches
  for delete to expense_learning_storage_owner using (true);

create policy expense_learning_closed_metrics_owner_insert_v1
  on expense_learning_private.closed_week_supported_metrics
  for insert to expense_learning_storage_owner with check (true);

alter table expense_learning_private.closed_week_supported_metrics
  drop constraint closed_week_supported_metrics_support_v1,
  drop column supporting_contributors,
  add column support_band text not null,
  add constraint closed_week_supported_metrics_support_band_v1
    check (support_band in (
      'K10_19',
      'K20_49',
      'K50_99',
      'K100_PLUS'
    )),
  add constraint closed_week_supported_metrics_p4b_allowlist_v1
    check (
      metric_family = 'HUMAN_REVIEW'
      and comparison_scope = 'NONE'
      and metric_key = 'VALUE'
    ),
  add constraint closed_week_supported_metrics_fixed_promotion_v1
    check (
      promoted_at =
        (week_start::timestamp at time zone 'UTC') + interval '7 days'
    ),
  add constraint closed_week_supported_metrics_fixed_expiry_v1
    check (expires_at = promoted_at + interval '13 months');

create function expense_learning_private.expense_learning_support_band_v1(
  p_contributors integer
)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select case
    when p_contributors between 10 and 19 then 'K10_19'
    when p_contributors between 20 and 49 then 'K20_49'
    when p_contributors between 50 and 99 then 'K50_99'
    when p_contributors >= 100 then 'K100_PLUS'
    else null
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
  v_current_week_start date;
  v_metric record;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'expense-learning-accumulator-mutation-v1',
      0
    )
  );

  v_current_week_start := pg_catalog.date_trunc(
    'week',
    pg_catalog.clock_timestamp() at time zone 'UTC'
  )::date;

  if v_current_week_start is distinct from p_week_start then
    raise exception 'expense_learning_ingestion_week_changed'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from expense_learning_private.closed_week_promotion_batches as batch
    where batch.contribution_schema_version =
        p_contribution ->> 'schemaVersion'
      and batch.observation_schema_version =
        p_contribution ->> 'observationSchemaVersion'
      and batch.engine_version = p_contribution ->> 'engineVersion'
      and batch.privacy_policy_version =
        p_contribution ->> 'privacyPolicyVersion'
      and batch.week_start = p_week_start
      and batch.structural_archetype_group =
        p_contribution ->> 'structuralArchetypeGroup'
  ) then
    raise exception 'expense_learning_ingestion_batch_closed'
      using errcode = '22023';
  end if;

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

create function expense_learning_private.is_expense_learning_promotion_source_safe_v1(
  p_contribution_schema_version text,
  p_observation_schema_version text,
  p_engine_version text,
  p_privacy_policy_version text,
  p_week_start date,
  p_structural_archetype_group text
)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_membership_count integer;
  v_distinct_contributors integer;
  v_linked_contributors integer;
begin
  if expense_learning_private.has_canonical_versions_v1(
      p_contribution_schema_version,
      p_observation_schema_version,
      p_engine_version,
      p_privacy_policy_version
    ) is distinct from true
    or p_structural_archetype_group not in (
      'TABLE',
      'SUMMARY',
      'OTHER',
      'UNKNOWN'
    )
    or expense_learning_private.is_expense_learning_week_source_canonical_v1(
      p_week_start
    ) is distinct from true
    or expense_learning_private.is_expense_learning_week_accumulator_consistent_v1(
      p_week_start
    ) is distinct from true then
    return false;
  end if;

  select
    pg_catalog.count(*)::integer,
    pg_catalog.count(
      distinct membership.contributor_coordinate_hmac
    )::integer
  into v_membership_count, v_distinct_contributors
  from expense_learning_private.accumulator_memberships as membership
  where membership.contribution_schema_version =
      p_contribution_schema_version
    and membership.observation_schema_version =
      p_observation_schema_version
    and membership.engine_version = p_engine_version
    and membership.privacy_policy_version = p_privacy_policy_version
    and membership.week_start = p_week_start
    and membership.structural_archetype_group =
      p_structural_archetype_group
    and membership.metric_family = 'HUMAN_REVIEW'
    and membership.comparison_scope = 'NONE'
    and membership.metric_key = 'VALUE'
    and membership.bucket_kind = 'EXACT'
    and membership.bucket_value in (
      'CONFIRMED',
      'CORRECTED',
      'REJECTED',
      'NOT_REVIEWED'
    );

  select pg_catalog.count(*)::integer
  into v_linked_contributors
  from expense_learning_private.contributor_revocation_links as link
  where link.week_start = p_week_start
    and exists (
      select 1
      from expense_learning_private.accumulator_memberships as membership
      where membership.contribution_schema_version =
          p_contribution_schema_version
        and membership.observation_schema_version =
          p_observation_schema_version
        and membership.engine_version = p_engine_version
        and membership.privacy_policy_version = p_privacy_policy_version
        and membership.week_start = p_week_start
        and membership.structural_archetype_group =
          p_structural_archetype_group
        and membership.metric_family = 'HUMAN_REVIEW'
        and membership.comparison_scope = 'NONE'
        and membership.metric_key = 'VALUE'
        and membership.contributor_coordinate_hmac =
          expense_learning_private.expense_learning_coordinate_hmac_v1(
            link.contributor_week_hmac,
            p_contribution_schema_version,
            p_observation_schema_version,
            p_engine_version,
            p_privacy_policy_version,
            p_week_start,
            p_structural_archetype_group,
            'HUMAN_REVIEW',
            'NONE',
            'VALUE'
          )
    );

  return v_membership_count > 0
    and v_membership_count = v_distinct_contributors
    and v_membership_count = v_linked_contributors;
exception when others then
  return false;
end;
$$;

create function expense_learning_private.run_expense_learning_promotion_v1(
  p_now timestamptz
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current_week_start date;
  v_candidate_user_ids uuid[];
  v_user_id uuid;
  v_batch record;
  v_link record;
  v_expected_links integer;
  v_locked_links integer;
  v_contributors integer;
  v_rare_buckets integer;
  v_support_band text;
  v_had_candidate boolean := false;
  v_promoted boolean := false;
  v_retry_required boolean := false;
  v_batch_retry_required boolean;
begin
  if p_now is null then
    return 'RETRY_REQUIRED';
  end if;

  v_current_week_start := pg_catalog.date_trunc(
    'week',
    p_now at time zone 'UTC'
  )::date;

  select pg_catalog.array_agg(
    distinct link.user_id order by link.user_id
  )
  into v_candidate_user_ids
  from expense_learning_private.contributor_revocation_links as link
  where link.week_start < v_current_week_start
    and exists (
      select 1
      from expense_learning_private.accumulator_memberships as membership
      where membership.week_start = link.week_start
        and membership.metric_family = 'HUMAN_REVIEW'
        and membership.comparison_scope = 'NONE'
        and membership.metric_key = 'VALUE'
        and membership.contributor_coordinate_hmac =
          expense_learning_private.expense_learning_coordinate_hmac_v1(
            link.contributor_week_hmac,
            membership.contribution_schema_version,
            membership.observation_schema_version,
            membership.engine_version,
            membership.privacy_policy_version,
            membership.week_start,
            membership.structural_archetype_group,
            membership.metric_family,
            membership.comparison_scope,
            membership.metric_key
          )
        and not exists (
          select 1
          from expense_learning_private.closed_week_promotion_batches as batch
          where batch.contribution_schema_version =
              membership.contribution_schema_version
            and batch.observation_schema_version =
              membership.observation_schema_version
            and batch.engine_version = membership.engine_version
            and batch.privacy_policy_version =
              membership.privacy_policy_version
            and batch.week_start = membership.week_start
            and batch.structural_archetype_group =
              membership.structural_archetype_group
        )
    );

  if v_candidate_user_ids is null then
    if exists (
      select 1
      from expense_learning_private.accumulator_memberships as membership
      where membership.week_start < v_current_week_start
        and not exists (
          select 1
          from expense_learning_private.closed_week_promotion_batches as batch
          where batch.contribution_schema_version =
              membership.contribution_schema_version
            and batch.observation_schema_version =
              membership.observation_schema_version
            and batch.engine_version = membership.engine_version
            and batch.privacy_policy_version =
              membership.privacy_policy_version
            and batch.week_start = membership.week_start
            and batch.structural_archetype_group =
              membership.structural_archetype_group
        )
    ) or exists (
      select 1
      from expense_learning_private.protected_accumulators as accumulator
      where accumulator.week_start < v_current_week_start
        and not exists (
          select 1
          from expense_learning_private.closed_week_promotion_batches as batch
          where batch.contribution_schema_version =
              accumulator.contribution_schema_version
            and batch.observation_schema_version =
              accumulator.observation_schema_version
            and batch.engine_version = accumulator.engine_version
            and batch.privacy_policy_version =
              accumulator.privacy_policy_version
            and batch.week_start = accumulator.week_start
            and batch.structural_archetype_group =
              accumulator.structural_archetype_group
        )
    ) then
      return 'RETRY_REQUIRED';
    end if;

    return 'NOTHING';
  end if;

  foreach v_user_id in array v_candidate_user_ids
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'expense-learning-consent-v1:' || v_user_id::text,
        0
      )
    );
  end loop;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'expense-learning-accumulator-mutation-v1',
      0
    )
  );

  for v_batch in
    select distinct
      membership.contribution_schema_version,
      membership.observation_schema_version,
      membership.engine_version,
      membership.privacy_policy_version,
      membership.week_start,
      membership.structural_archetype_group
    from expense_learning_private.accumulator_memberships as membership
    where membership.week_start < v_current_week_start
      and membership.metric_family = 'HUMAN_REVIEW'
      and membership.comparison_scope = 'NONE'
      and membership.metric_key = 'VALUE'
      and not exists (
        select 1
        from expense_learning_private.closed_week_promotion_batches as batch
        where batch.contribution_schema_version =
            membership.contribution_schema_version
          and batch.observation_schema_version =
            membership.observation_schema_version
          and batch.engine_version = membership.engine_version
          and batch.privacy_policy_version =
            membership.privacy_policy_version
          and batch.week_start = membership.week_start
          and batch.structural_archetype_group =
            membership.structural_archetype_group
      )
    order by
      membership.week_start,
      membership.contribution_schema_version,
      membership.observation_schema_version,
      membership.engine_version,
      membership.privacy_policy_version,
      membership.structural_archetype_group
  loop
    v_had_candidate := true;
    v_expected_links := 0;
    v_locked_links := 0;
    v_batch_retry_required := false;

    select pg_catalog.count(*)::integer
    into v_expected_links
    from expense_learning_private.contributor_revocation_links as link
    where link.week_start = v_batch.week_start
      and exists (
        select 1
        from expense_learning_private.accumulator_memberships as membership
        where membership.contribution_schema_version =
            v_batch.contribution_schema_version
          and membership.observation_schema_version =
            v_batch.observation_schema_version
          and membership.engine_version = v_batch.engine_version
          and membership.privacy_policy_version =
            v_batch.privacy_policy_version
          and membership.week_start = v_batch.week_start
          and membership.structural_archetype_group =
            v_batch.structural_archetype_group
          and membership.metric_family = 'HUMAN_REVIEW'
          and membership.comparison_scope = 'NONE'
          and membership.metric_key = 'VALUE'
          and membership.contributor_coordinate_hmac =
            expense_learning_private.expense_learning_coordinate_hmac_v1(
              link.contributor_week_hmac,
              v_batch.contribution_schema_version,
              v_batch.observation_schema_version,
              v_batch.engine_version,
              v_batch.privacy_policy_version,
              v_batch.week_start,
              v_batch.structural_archetype_group,
              'HUMAN_REVIEW',
              'NONE',
              'VALUE'
            )
      );

    for v_link in
      select link.user_id, link.week_start
      from expense_learning_private.contributor_revocation_links as link
      where link.week_start = v_batch.week_start
        and exists (
          select 1
          from expense_learning_private.accumulator_memberships as membership
          where membership.contribution_schema_version =
              v_batch.contribution_schema_version
            and membership.observation_schema_version =
              v_batch.observation_schema_version
            and membership.engine_version = v_batch.engine_version
            and membership.privacy_policy_version =
              v_batch.privacy_policy_version
            and membership.week_start = v_batch.week_start
            and membership.structural_archetype_group =
              v_batch.structural_archetype_group
            and membership.metric_family = 'HUMAN_REVIEW'
            and membership.comparison_scope = 'NONE'
            and membership.metric_key = 'VALUE'
            and membership.contributor_coordinate_hmac =
              expense_learning_private.expense_learning_coordinate_hmac_v1(
                link.contributor_week_hmac,
                v_batch.contribution_schema_version,
                v_batch.observation_schema_version,
                v_batch.engine_version,
                v_batch.privacy_policy_version,
                v_batch.week_start,
                v_batch.structural_archetype_group,
                'HUMAN_REVIEW',
                'NONE',
                'VALUE'
              )
        )
      order by link.user_id
      for update of link skip locked
    loop
      v_locked_links := v_locked_links + 1;

      if not (v_link.user_id = any(v_candidate_user_ids))
        or expense_learning_private.is_expense_learning_link_cleanup_eligible_v1(
          v_link.user_id,
          v_link.week_start,
          p_now
        ) is distinct from false then
        v_batch_retry_required := true;
      end if;
    end loop;

    if v_expected_links = 0
      or v_expected_links <> v_locked_links
      or v_batch_retry_required then
      v_retry_required := true;
      continue;
    end if;

    perform expense_learning_private.lock_expense_learning_week_cells_v1(
      v_batch.week_start
    );

    if expense_learning_private.is_expense_learning_promotion_source_safe_v1(
        v_batch.contribution_schema_version,
        v_batch.observation_schema_version,
        v_batch.engine_version,
        v_batch.privacy_policy_version,
        v_batch.week_start,
        v_batch.structural_archetype_group
      ) is distinct from true
      or exists (
        select 1
        from expense_learning_private.closed_week_promotion_batches as batch
        where batch.contribution_schema_version =
            v_batch.contribution_schema_version
          and batch.observation_schema_version =
            v_batch.observation_schema_version
          and batch.engine_version = v_batch.engine_version
          and batch.privacy_policy_version =
            v_batch.privacy_policy_version
          and batch.week_start = v_batch.week_start
          and batch.structural_archetype_group =
            v_batch.structural_archetype_group
      ) then
      v_retry_required := true;
      continue;
    end if;

    select
      coalesce(
        pg_catalog.sum(bucket.supporting_contributors),
        0
      )::integer,
      pg_catalog.count(*) filter (
        where bucket.supporting_contributors between 1 and 9
      )::integer
    into v_contributors, v_rare_buckets
    from (
      select
        membership.bucket_value,
        pg_catalog.count(*)::integer as supporting_contributors
      from expense_learning_private.accumulator_memberships as membership
      where membership.contribution_schema_version =
          v_batch.contribution_schema_version
        and membership.observation_schema_version =
          v_batch.observation_schema_version
        and membership.engine_version = v_batch.engine_version
        and membership.privacy_policy_version =
          v_batch.privacy_policy_version
        and membership.week_start = v_batch.week_start
        and membership.structural_archetype_group =
          v_batch.structural_archetype_group
        and membership.metric_family = 'HUMAN_REVIEW'
        and membership.comparison_scope = 'NONE'
        and membership.metric_key = 'VALUE'
      group by membership.bucket_value
    ) as bucket;

    v_support_band :=
      expense_learning_private.expense_learning_support_band_v1(
        v_contributors
      );

    if v_contributors < 10 then
      insert into expense_learning_private.closed_week_promotion_batches (
        contribution_schema_version,
        observation_schema_version,
        engine_version,
        privacy_policy_version,
        week_start,
        structural_archetype_group,
        privacy_evaluation_version,
        batch_state
      ) values (
        v_batch.contribution_schema_version,
        v_batch.observation_schema_version,
        v_batch.engine_version,
        v_batch.privacy_policy_version,
        v_batch.week_start,
        v_batch.structural_archetype_group,
        'expense-learning-human-review-coarsening.v1',
        'DISCARDED'
      );
      continue;
    end if;

    if v_support_band is null then
      v_retry_required := true;
      continue;
    end if;

    if v_rare_buckets > 0 then
      insert into expense_learning_private.closed_week_supported_metrics (
        contribution_schema_version,
        observation_schema_version,
        engine_version,
        privacy_policy_version,
        week_start,
        structural_archetype_group,
        metric_family,
        comparison_scope,
        metric_key,
        bucket_kind,
        bucket_value,
        promoted_at,
        expires_at,
        support_band
      ) values (
        v_batch.contribution_schema_version,
        v_batch.observation_schema_version,
        v_batch.engine_version,
        v_batch.privacy_policy_version,
        v_batch.week_start,
        v_batch.structural_archetype_group,
        'HUMAN_REVIEW',
        'NONE',
        'VALUE',
        'COARSENED_OTHER',
        'OTHER',
        (v_batch.week_start::timestamp at time zone 'UTC') + interval '7 days',
        (v_batch.week_start::timestamp at time zone 'UTC')
          + interval '7 days' + interval '13 months',
        v_support_band
      );
    else
      insert into expense_learning_private.closed_week_supported_metrics (
        contribution_schema_version,
        observation_schema_version,
        engine_version,
        privacy_policy_version,
        week_start,
        structural_archetype_group,
        metric_family,
        comparison_scope,
        metric_key,
        bucket_kind,
        bucket_value,
        promoted_at,
        expires_at,
        support_band
      )
      select
        v_batch.contribution_schema_version,
        v_batch.observation_schema_version,
        v_batch.engine_version,
        v_batch.privacy_policy_version,
        v_batch.week_start,
        v_batch.structural_archetype_group,
        'HUMAN_REVIEW',
        'NONE',
        'VALUE',
        'EXACT',
        membership.bucket_value,
        (v_batch.week_start::timestamp at time zone 'UTC') + interval '7 days',
        (v_batch.week_start::timestamp at time zone 'UTC')
          + interval '7 days' + interval '13 months',
        v_support_band
      from expense_learning_private.accumulator_memberships as membership
      where membership.contribution_schema_version =
          v_batch.contribution_schema_version
        and membership.observation_schema_version =
          v_batch.observation_schema_version
        and membership.engine_version = v_batch.engine_version
        and membership.privacy_policy_version =
          v_batch.privacy_policy_version
        and membership.week_start = v_batch.week_start
        and membership.structural_archetype_group =
          v_batch.structural_archetype_group
        and membership.metric_family = 'HUMAN_REVIEW'
        and membership.comparison_scope = 'NONE'
        and membership.metric_key = 'VALUE'
      group by membership.bucket_value
      having pg_catalog.count(*) >= 10
      order by membership.bucket_value;
    end if;

    insert into expense_learning_private.closed_week_promotion_batches (
      contribution_schema_version,
      observation_schema_version,
      engine_version,
      privacy_policy_version,
      week_start,
      structural_archetype_group,
      privacy_evaluation_version,
      batch_state
    ) values (
      v_batch.contribution_schema_version,
      v_batch.observation_schema_version,
      v_batch.engine_version,
      v_batch.privacy_policy_version,
      v_batch.week_start,
      v_batch.structural_archetype_group,
      'expense-learning-human-review-coarsening.v1',
      'PROMOTED'
    );
    v_promoted := true;
  end loop;

  if exists (
    select 1
    from expense_learning_private.accumulator_memberships as membership
    where membership.week_start < v_current_week_start
      and not exists (
        select 1
        from expense_learning_private.closed_week_promotion_batches as batch
        where batch.contribution_schema_version =
            membership.contribution_schema_version
          and batch.observation_schema_version =
            membership.observation_schema_version
          and batch.engine_version = membership.engine_version
          and batch.privacy_policy_version =
            membership.privacy_policy_version
          and batch.week_start = membership.week_start
          and batch.structural_archetype_group =
            membership.structural_archetype_group
      )
  ) or exists (
    select 1
    from expense_learning_private.protected_accumulators as accumulator
    where accumulator.week_start < v_current_week_start
      and not exists (
        select 1
        from expense_learning_private.closed_week_promotion_batches as batch
        where batch.contribution_schema_version =
            accumulator.contribution_schema_version
          and batch.observation_schema_version =
            accumulator.observation_schema_version
          and batch.engine_version = accumulator.engine_version
          and batch.privacy_policy_version =
            accumulator.privacy_policy_version
          and batch.week_start = accumulator.week_start
          and batch.structural_archetype_group =
            accumulator.structural_archetype_group
      )
  ) then
    v_retry_required := true;
  end if;

  if v_retry_required then
    return 'RETRY_REQUIRED';
  end if;

  if v_promoted then
    return 'PROMOTED';
  end if;

  if v_had_candidate then
    return 'NOTHING';
  end if;

  return 'NOTHING';
exception when others then
  return 'RETRY_REQUIRED';
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

  return expense_learning_private.run_expense_learning_promotion_v1(
    pg_catalog.clock_timestamp()
  );
end;
$$;

alter function expense_learning_private.expense_learning_support_band_v1(
  integer
) owner to expense_learning_storage_owner;
alter function expense_learning_private.lock_expense_learning_cells_v1(
  jsonb,
  date
) owner to expense_learning_storage_owner;
alter function expense_learning_private.is_expense_learning_promotion_source_safe_v1(
  text,
  text,
  text,
  text,
  date,
  text
) owner to expense_learning_storage_owner;
alter function expense_learning_private.run_expense_learning_promotion_v1(
  timestamptz
) owner to expense_learning_storage_owner;
alter function public.promote_expense_learning_closed_weeks_v1()
  owner to expense_learning_storage_owner;

revoke all on table expense_learning_private.closed_week_promotion_batches
  from public, anon, authenticated, service_role;
revoke all on all functions in schema expense_learning_private
  from public, anon, authenticated, service_role;
revoke all on function public.promote_expense_learning_closed_weeks_v1()
  from public, anon, authenticated, service_role;
grant execute on function public.promote_expense_learning_closed_weeks_v1()
  to service_role;

notify pgrst, 'reload schema';

commit;
