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
      'expense_learning_private.contributor_revocation_links'
    ) is null
    or pg_catalog.to_regprocedure(
      'expense_learning_private.stage_expense_learning_contribution_v1(uuid,jsonb,bytea,bytea)'
    ) is null
    or pg_catalog.to_regprocedure(
      'public.set_expense_learning_consent_v1(uuid,jsonb)'
    ) is null
    or pg_catalog.to_regprocedure(
      'public.purge_expense_learning_retention_v1()'
    ) is null then
    raise exception 'expense_learning_p4a_prerequisite_invalid'
      using errcode = '55000';
  end if;

  if pg_catalog.to_regprocedure(
    'expense_learning_private.run_expense_learning_retention_v1(timestamp with time zone)'
  ) is not null then
    raise exception 'expense_learning_p4a_objects_already_exist'
      using errcode = '42710';
  end if;
end;
$$;

create policy expense_learning_closed_metrics_owner_select_v1
  on expense_learning_private.closed_week_supported_metrics
  for select to expense_learning_storage_owner using (true);
create policy expense_learning_closed_metrics_owner_delete_v1
  on expense_learning_private.closed_week_supported_metrics
  for delete to expense_learning_storage_owner using (true);
create policy expense_learning_revocation_links_owner_lock_v1
  on expense_learning_private.contributor_revocation_links
  for update to expense_learning_storage_owner
  using (true)
  with check (false);

create function expense_learning_private.is_expense_learning_week_source_canonical_v1(
  p_week_start date
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_link_count integer;
  v_membership_count integer;
begin
  if p_week_start is null
    or pg_catalog.date_part('isodow', p_week_start) <> 1 then
    return false;
  end if;

  select pg_catalog.count(*)
  into v_link_count
  from expense_learning_private.contributor_revocation_links as link
  where link.week_start = p_week_start;

  select pg_catalog.count(*)
  into v_membership_count
  from expense_learning_private.accumulator_memberships as membership
  where membership.week_start = p_week_start;

  if v_link_count < 1
    or v_membership_count < v_link_count * 67
    or v_membership_count > v_link_count * 268 then
    return false;
  end if;

  if exists (
    select 1
    from expense_learning_private.accumulator_memberships as membership
    where membership.week_start = p_week_start
      and (
        expense_learning_private.has_canonical_versions_v1(
          membership.contribution_schema_version,
          membership.observation_schema_version,
          membership.engine_version,
          membership.privacy_policy_version
        ) is distinct from true
        or expense_learning_private.is_canonical_metric_bucket_v1(
          membership.metric_family,
          membership.comparison_scope,
          membership.metric_key,
          membership.bucket_kind,
          membership.bucket_value
        ) is distinct from true
        or membership.bucket_kind <> 'EXACT'
        or membership.expires_at <>
          expense_learning_private.expense_learning_week_expiry_v1(
            p_week_start
          )
      )
  ) then
    return false;
  end if;

  if exists (
    select 1
    from expense_learning_private.contributor_revocation_links as link
    where link.week_start = p_week_start
      and (
        select pg_catalog.count(*)
        from expense_learning_private.accumulator_memberships as membership
        where membership.week_start = link.week_start
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
      ) not between 67 and 268
  ) then
    return false;
  end if;

  if exists (
    select 1
    from expense_learning_private.contributor_revocation_links as link
    where link.week_start = p_week_start
      and pg_catalog.mod((
        select pg_catalog.count(*)
        from expense_learning_private.accumulator_memberships as membership
        where membership.week_start = link.week_start
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
      ), 67) <> 0
  ) then
    return false;
  end if;

  if exists (
    select 1
    from expense_learning_private.accumulator_memberships as membership
    where membership.week_start = p_week_start
      and (
        select pg_catalog.count(*)
        from expense_learning_private.contributor_revocation_links as link
        where link.week_start = membership.week_start
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
      ) <> 1
  ) then
    return false;
  end if;

  if exists (
    select 1
    from expense_learning_private.contributor_revocation_links as link
    join lateral (
      select
        membership.structural_archetype_group,
        pg_catalog.count(*) as coordinate_count,
        pg_catalog.count(distinct (
          membership.contribution_schema_version,
          membership.observation_schema_version,
          membership.engine_version,
          membership.privacy_policy_version,
          membership.metric_family,
          membership.comparison_scope,
          membership.metric_key
        )) as distinct_coordinate_count,
        pg_catalog.jsonb_build_object(
          'schemaVersion',
          pg_catalog.max(membership.contribution_schema_version),
          'observationSchemaVersion',
          pg_catalog.max(membership.observation_schema_version),
          'engineVersion',
          pg_catalog.max(membership.engine_version),
          'privacyPolicyVersion',
          pg_catalog.max(membership.privacy_policy_version),
          'structuralArchetypeGroup',
          membership.structural_archetype_group,
          'metrics',
          pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
              'family', membership.metric_family,
              'comparisonScope', membership.comparison_scope,
              'key', membership.metric_key,
              'value', membership.bucket_value
            ) order by
              membership.metric_family,
              membership.comparison_scope,
              membership.metric_key
          ),
          'learningHints',
          'null'::jsonb
        ) as contribution
      from expense_learning_private.accumulator_memberships as membership
      where membership.week_start = link.week_start
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
      group by membership.structural_archetype_group
    ) as group_source on true
    where link.week_start = p_week_start
      and (
        group_source.coordinate_count <> 67
        or group_source.distinct_coordinate_count <> 67
        or expense_learning_private.is_canonical_contribution_v1(
          group_source.contribution
        ) is distinct from true
      )
  ) then
    return false;
  end if;

  return true;
exception
  when others then
    return false;
end;
$$;

create function expense_learning_private.lock_expense_learning_week_cells_v1(
  p_week_start date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_cell record;
begin
  for v_cell in
    select distinct
      source.contribution_schema_version,
      source.observation_schema_version,
      source.engine_version,
      source.privacy_policy_version,
      source.week_start,
      source.structural_archetype_group,
      source.metric_family,
      source.comparison_scope,
      source.metric_key,
      source.bucket_kind,
      source.bucket_value
    from (
      select
        membership.contribution_schema_version,
        membership.observation_schema_version,
        membership.engine_version,
        membership.privacy_policy_version,
        membership.week_start,
        membership.structural_archetype_group,
        membership.metric_family,
        membership.comparison_scope,
        membership.metric_key,
        membership.bucket_kind,
        membership.bucket_value
      from expense_learning_private.accumulator_memberships as membership
      where membership.week_start = p_week_start
      union all
      select
        accumulator.contribution_schema_version,
        accumulator.observation_schema_version,
        accumulator.engine_version,
        accumulator.privacy_policy_version,
        accumulator.week_start,
        accumulator.structural_archetype_group,
        accumulator.metric_family,
        accumulator.comparison_scope,
        accumulator.metric_key,
        accumulator.bucket_kind,
        accumulator.bucket_value
      from expense_learning_private.protected_accumulators as accumulator
      where accumulator.week_start = p_week_start
    ) as source
    order by
      source.contribution_schema_version,
      source.observation_schema_version,
      source.engine_version,
      source.privacy_policy_version,
      source.week_start,
      source.structural_archetype_group,
      source.metric_family,
      source.comparison_scope,
      source.metric_key,
      source.bucket_kind,
      source.bucket_value
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      expense_learning_private.expense_learning_cell_lock_key_v1(
        v_cell.contribution_schema_version,
        v_cell.observation_schema_version,
        v_cell.engine_version,
        v_cell.privacy_policy_version,
        v_cell.week_start,
        v_cell.structural_archetype_group,
        v_cell.metric_family,
        v_cell.comparison_scope,
        v_cell.metric_key,
        v_cell.bucket_kind,
        v_cell.bucket_value
      )
    );
  end loop;
end;
$$;

create function expense_learning_private.is_expense_learning_link_source_canonical_v1(
  p_user_id uuid,
  p_week_start date
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_contributor_week_hmac bytea;
  v_membership_count integer;
begin
  if p_user_id is null
    or p_week_start is null
    or pg_catalog.date_part('isodow', p_week_start) <> 1 then
    return false;
  end if;

  select link.contributor_week_hmac
  into v_contributor_week_hmac
  from expense_learning_private.contributor_revocation_links as link
  where link.user_id = p_user_id
    and link.week_start = p_week_start;

  if not found then
    return false;
  end if;

  select pg_catalog.count(*)
  into v_membership_count
  from expense_learning_private.accumulator_memberships as membership
  where membership.week_start = p_week_start
    and membership.contributor_coordinate_hmac =
      expense_learning_private.expense_learning_coordinate_hmac_v1(
        v_contributor_week_hmac,
        membership.contribution_schema_version,
        membership.observation_schema_version,
        membership.engine_version,
        membership.privacy_policy_version,
        membership.week_start,
        membership.structural_archetype_group,
        membership.metric_family,
        membership.comparison_scope,
        membership.metric_key
      );

  if v_membership_count not between 67 and 268
    or pg_catalog.mod(v_membership_count, 67) <> 0 then
    return false;
  end if;

  if exists (
    select 1
    from expense_learning_private.accumulator_memberships as membership
    where membership.week_start = p_week_start
      and membership.contributor_coordinate_hmac =
        expense_learning_private.expense_learning_coordinate_hmac_v1(
          v_contributor_week_hmac,
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
      and (
        expense_learning_private.has_canonical_versions_v1(
          membership.contribution_schema_version,
          membership.observation_schema_version,
          membership.engine_version,
          membership.privacy_policy_version
        ) is distinct from true
        or expense_learning_private.is_canonical_metric_bucket_v1(
          membership.metric_family,
          membership.comparison_scope,
          membership.metric_key,
          membership.bucket_kind,
          membership.bucket_value
        ) is distinct from true
        or membership.bucket_kind <> 'EXACT'
        or membership.expires_at <>
          expense_learning_private.expense_learning_week_expiry_v1(
            p_week_start
          )
        or (
          select pg_catalog.count(*)
          from expense_learning_private.contributor_revocation_links as link
          where link.week_start = membership.week_start
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
        ) <> 1
      )
  ) then
    return false;
  end if;

  return not exists (
    select 1
    from (
      select
        membership.structural_archetype_group,
        pg_catalog.count(*) as coordinate_count,
        pg_catalog.count(distinct (
          membership.contribution_schema_version,
          membership.observation_schema_version,
          membership.engine_version,
          membership.privacy_policy_version,
          membership.metric_family,
          membership.comparison_scope,
          membership.metric_key
        )) as distinct_coordinate_count,
        pg_catalog.jsonb_build_object(
          'schemaVersion',
          pg_catalog.max(membership.contribution_schema_version),
          'observationSchemaVersion',
          pg_catalog.max(membership.observation_schema_version),
          'engineVersion',
          pg_catalog.max(membership.engine_version),
          'privacyPolicyVersion',
          pg_catalog.max(membership.privacy_policy_version),
          'structuralArchetypeGroup',
          membership.structural_archetype_group,
          'metrics',
          pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
              'family', membership.metric_family,
              'comparisonScope', membership.comparison_scope,
              'key', membership.metric_key,
              'value', membership.bucket_value
            ) order by
              membership.metric_family,
              membership.comparison_scope,
              membership.metric_key
          ),
          'learningHints',
          'null'::jsonb
        ) as contribution
      from expense_learning_private.accumulator_memberships as membership
      where membership.week_start = p_week_start
        and membership.contributor_coordinate_hmac =
          expense_learning_private.expense_learning_coordinate_hmac_v1(
            v_contributor_week_hmac,
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
      group by membership.structural_archetype_group
    ) as group_source
    where group_source.coordinate_count <> 67
      or group_source.distinct_coordinate_count <> 67
      or expense_learning_private.is_canonical_contribution_v1(
        group_source.contribution
      ) is distinct from true
  );
exception
  when others then
    return false;
end;
$$;

create function expense_learning_private.is_expense_learning_week_accumulator_consistent_v1(
  p_week_start date
)
returns boolean
language sql
stable
strict
parallel restricted
set search_path = ''
as $$
  select
    not exists (
      select 1
      from expense_learning_private.protected_accumulators as accumulator
      where accumulator.week_start = p_week_start
        and accumulator.supporting_contributors <> (
          select pg_catalog.count(*)
          from expense_learning_private.accumulator_memberships as membership
          where membership.contribution_schema_version =
              accumulator.contribution_schema_version
            and membership.observation_schema_version =
              accumulator.observation_schema_version
            and membership.engine_version = accumulator.engine_version
            and membership.privacy_policy_version =
              accumulator.privacy_policy_version
            and membership.week_start = accumulator.week_start
            and membership.structural_archetype_group =
              accumulator.structural_archetype_group
            and membership.metric_family = accumulator.metric_family
            and membership.comparison_scope = accumulator.comparison_scope
            and membership.metric_key = accumulator.metric_key
            and membership.bucket_kind = accumulator.bucket_kind
            and membership.bucket_value = accumulator.bucket_value
        )
    )
    and not exists (
      select 1
      from expense_learning_private.accumulator_memberships as membership
      where membership.week_start = p_week_start
        and not exists (
          select 1
          from expense_learning_private.protected_accumulators as accumulator
          where accumulator.contribution_schema_version =
              membership.contribution_schema_version
            and accumulator.observation_schema_version =
              membership.observation_schema_version
            and accumulator.engine_version = membership.engine_version
            and accumulator.privacy_policy_version =
              membership.privacy_policy_version
            and accumulator.week_start = membership.week_start
            and accumulator.structural_archetype_group =
              membership.structural_archetype_group
            and accumulator.metric_family = membership.metric_family
            and accumulator.comparison_scope = membership.comparison_scope
            and accumulator.metric_key = membership.metric_key
            and accumulator.bucket_kind = membership.bucket_kind
            and accumulator.bucket_value = membership.bucket_value
        )
    );
$$;

create function expense_learning_private.reconcile_expense_learning_week_v1(
  p_week_start date
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'expense-learning-accumulator-mutation-v1',
      0
    )
  );
  perform expense_learning_private.lock_expense_learning_week_cells_v1(
    p_week_start
  );

  if expense_learning_private.is_expense_learning_week_source_canonical_v1(
    p_week_start
  ) is distinct from true then
    return false;
  end if;

  delete from expense_learning_private.protected_accumulators as accumulator
  where accumulator.week_start = p_week_start
    and not exists (
      select 1
      from expense_learning_private.accumulator_memberships as membership
      where membership.contribution_schema_version =
          accumulator.contribution_schema_version
        and membership.observation_schema_version =
          accumulator.observation_schema_version
        and membership.engine_version = accumulator.engine_version
        and membership.privacy_policy_version =
          accumulator.privacy_policy_version
        and membership.week_start = accumulator.week_start
        and membership.structural_archetype_group =
          accumulator.structural_archetype_group
        and membership.metric_family = accumulator.metric_family
        and membership.comparison_scope = accumulator.comparison_scope
        and membership.metric_key = accumulator.metric_key
        and membership.bucket_kind = accumulator.bucket_kind
        and membership.bucket_value = accumulator.bucket_value
    );

  insert into expense_learning_private.protected_accumulators (
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
    supporting_contributors,
    expires_at
  )
  select
    membership.contribution_schema_version,
    membership.observation_schema_version,
    membership.engine_version,
    membership.privacy_policy_version,
    membership.week_start,
    membership.structural_archetype_group,
    membership.metric_family,
    membership.comparison_scope,
    membership.metric_key,
    membership.bucket_kind,
    membership.bucket_value,
    pg_catalog.count(*)::smallint,
    expense_learning_private.expense_learning_week_expiry_v1(
      membership.week_start
    )
  from expense_learning_private.accumulator_memberships as membership
  where membership.week_start = p_week_start
  group by
    membership.contribution_schema_version,
    membership.observation_schema_version,
    membership.engine_version,
    membership.privacy_policy_version,
    membership.week_start,
    membership.structural_archetype_group,
    membership.metric_family,
    membership.comparison_scope,
    membership.metric_key,
    membership.bucket_kind,
    membership.bucket_value
  on conflict (
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
    bucket_value
  ) do update
  set
    supporting_contributors = excluded.supporting_contributors,
    expires_at = excluded.expires_at;

  if exists (
    select 1
    from expense_learning_private.protected_accumulators as accumulator
    where accumulator.week_start = p_week_start
      and accumulator.supporting_contributors <> (
        select pg_catalog.count(*)
        from expense_learning_private.accumulator_memberships as membership
        where membership.contribution_schema_version =
            accumulator.contribution_schema_version
          and membership.observation_schema_version =
            accumulator.observation_schema_version
          and membership.engine_version = accumulator.engine_version
          and membership.privacy_policy_version =
            accumulator.privacy_policy_version
          and membership.week_start = accumulator.week_start
          and membership.structural_archetype_group =
            accumulator.structural_archetype_group
          and membership.metric_family = accumulator.metric_family
          and membership.comparison_scope = accumulator.comparison_scope
          and membership.metric_key = accumulator.metric_key
          and membership.bucket_kind = accumulator.bucket_kind
          and membership.bucket_value = accumulator.bucket_value
      )
  ) then
    raise exception 'expense_learning_accumulator_repair_incomplete'
      using errcode = '55000';
  end if;

  return true;
exception
  when others then
    return false;
end;
$$;

create or replace function expense_learning_private.purge_expense_learning_link_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership record;
  v_membership_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'expense-learning-accumulator-mutation-v1',
      0
    )
  );
  perform expense_learning_private.lock_expense_learning_week_cells_v1(
    old.week_start
  );

  if expense_learning_private.is_expense_learning_link_source_canonical_v1(
    old.user_id,
    old.week_start
  ) is distinct from true then
    raise exception 'expense_learning_link_source_corrupt'
      using errcode = '55000';
  end if;

  if expense_learning_private.is_expense_learning_week_accumulator_consistent_v1(
    old.week_start
  ) is distinct from true
    and expense_learning_private.reconcile_expense_learning_week_v1(
      old.week_start
    ) is distinct from true then
    raise exception 'expense_learning_accumulator_repair_incomplete'
      using errcode = '55000';
  end if;

  delete from expense_learning_private.contribution_claims as claim
  where claim.week_start = old.week_start
    and claim.contributor_week_hmac = old.contributor_week_hmac;

  for v_membership in
    select membership.*
    from expense_learning_private.accumulator_memberships as membership
    where membership.week_start = old.week_start
      and membership.contributor_coordinate_hmac =
        expense_learning_private.expense_learning_coordinate_hmac_v1(
          old.contributor_week_hmac,
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
    order by
      membership.contribution_schema_version,
      membership.observation_schema_version,
      membership.engine_version,
      membership.privacy_policy_version,
      membership.week_start,
      membership.structural_archetype_group,
      membership.metric_family,
      membership.comparison_scope,
      membership.metric_key,
      membership.bucket_kind,
      membership.bucket_value
  loop
    select pg_catalog.count(*)
    into v_membership_count
    from expense_learning_private.accumulator_memberships as membership
    where membership.contribution_schema_version =
        v_membership.contribution_schema_version
      and membership.observation_schema_version =
        v_membership.observation_schema_version
      and membership.engine_version = v_membership.engine_version
      and membership.privacy_policy_version =
        v_membership.privacy_policy_version
      and membership.week_start = v_membership.week_start
      and membership.structural_archetype_group =
        v_membership.structural_archetype_group
      and membership.metric_family = v_membership.metric_family
      and membership.comparison_scope = v_membership.comparison_scope
      and membership.metric_key = v_membership.metric_key
      and membership.bucket_kind = v_membership.bucket_kind
      and membership.bucket_value = v_membership.bucket_value;

    if v_membership_count < 1 then
      raise exception 'expense_learning_accumulator_corrupt'
        using errcode = '55000';
    end if;

    delete from expense_learning_private.accumulator_memberships
    where contribution_schema_version =
        v_membership.contribution_schema_version
      and observation_schema_version =
        v_membership.observation_schema_version
      and engine_version = v_membership.engine_version
      and privacy_policy_version = v_membership.privacy_policy_version
      and week_start = v_membership.week_start
      and structural_archetype_group =
        v_membership.structural_archetype_group
      and metric_family = v_membership.metric_family
      and comparison_scope = v_membership.comparison_scope
      and metric_key = v_membership.metric_key
      and contributor_coordinate_hmac =
        v_membership.contributor_coordinate_hmac;

    if v_membership_count = 1 then
      delete from expense_learning_private.protected_accumulators
      where contribution_schema_version =
          v_membership.contribution_schema_version
        and observation_schema_version =
          v_membership.observation_schema_version
        and engine_version = v_membership.engine_version
        and privacy_policy_version = v_membership.privacy_policy_version
        and week_start = v_membership.week_start
        and structural_archetype_group =
          v_membership.structural_archetype_group
        and metric_family = v_membership.metric_family
        and comparison_scope = v_membership.comparison_scope
        and metric_key = v_membership.metric_key
        and bucket_kind = v_membership.bucket_kind
        and bucket_value = v_membership.bucket_value;
    else
      update expense_learning_private.protected_accumulators
      set supporting_contributors = v_membership_count - 1
      where contribution_schema_version =
          v_membership.contribution_schema_version
        and observation_schema_version =
          v_membership.observation_schema_version
        and engine_version = v_membership.engine_version
        and privacy_policy_version = v_membership.privacy_policy_version
        and week_start = v_membership.week_start
        and structural_archetype_group =
          v_membership.structural_archetype_group
        and metric_family = v_membership.metric_family
        and comparison_scope = v_membership.comparison_scope
        and metric_key = v_membership.metric_key
        and bucket_kind = v_membership.bucket_kind
        and bucket_value = v_membership.bucket_value;
    end if;
  end loop;

  delete from expense_learning_private.contributor_week_limits as week_limit
  where week_limit.week_start = old.week_start
    and week_limit.contributor_week_hmac = old.contributor_week_hmac;

  if exists (
    select 1
    from expense_learning_private.accumulator_memberships as membership
    where membership.week_start = old.week_start
      and membership.contributor_coordinate_hmac =
        expense_learning_private.expense_learning_coordinate_hmac_v1(
          old.contributor_week_hmac,
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
  ) then
    raise exception 'expense_learning_link_purge_incomplete'
      using errcode = '55000';
  end if;

  return old;
end;
$$;

create function expense_learning_private.is_expense_learning_link_cleanup_eligible_v1(
  p_user_id uuid,
  p_week_start date,
  p_now timestamptz
)
returns boolean
language sql
stable
strict
parallel restricted
set search_path = ''
as $$
  select exists (
    select 1
    from expense_learning_private.contributor_revocation_links as link
    where link.user_id = p_user_id
      and link.week_start = p_week_start
      and (
        link.expires_at <= p_now
        or exists (
          select 1
          from expense_learning_private.learning_consent_decisions as decision
          where decision.user_id = link.user_id
            and decision.schema_version =
              'expense-engine-learning-consent.v1'
            and decision.notice_version = 'expense-learning-notice.v1'
            and decision.purpose = 'IMPROVE_LOCAL_EXPENSE_READER'
            and decision.privacy_policy_version = '2026-07-21'
            and decision.granted = false
            and decision.decided_at >=
              (link.week_start::timestamp at time zone 'UTC')
        )
      )
  );
$$;

create function expense_learning_private.attempt_expense_learning_link_cleanup_v1(
  p_user_id uuid,
  p_week_start date,
  p_now timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if expense_learning_private.is_expense_learning_link_cleanup_eligible_v1(
    p_user_id,
    p_week_start,
    p_now
  ) is distinct from true then
    return true;
  end if;

  delete from expense_learning_private.contributor_revocation_links as link
  where link.user_id = p_user_id
    and link.week_start = p_week_start;

  return not exists (
    select 1
    from expense_learning_private.contributor_revocation_links as link
    where link.user_id = p_user_id
      and link.week_start = p_week_start
  );
exception
  when others then
    return false;
end;
$$;

create function expense_learning_private.run_expense_learning_retention_v1(
  p_now timestamptz
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_candidate_user_ids uuid[] := array[]::uuid[];
  v_link record;
  v_locked_link_user_ids uuid[] := array[]::uuid[];
  v_locked_link_week_starts date[] := array[]::date[];
  v_locked_link_index integer;
  v_week_start date;
  v_retry_required boolean := false;
begin
  if p_now is null then
    raise exception 'expense_learning_retention_invalid_argument'
      using errcode = '22023';
  end if;

  for v_user_id in
    select candidate.user_id
    from (
      select distinct link.user_id
      from expense_learning_private.contributor_revocation_links as link
      where link.expires_at <= p_now
        or exists (
          select 1
          from expense_learning_private.learning_consent_decisions as decision
          where decision.user_id = link.user_id
            and decision.schema_version =
              'expense-engine-learning-consent.v1'
            and decision.notice_version = 'expense-learning-notice.v1'
            and decision.purpose = 'IMPROVE_LOCAL_EXPENSE_READER'
            and decision.privacy_policy_version = '2026-07-21'
            and decision.granted = false
            and decision.decided_at >=
              (link.week_start::timestamp at time zone 'UTC')
        )
      union
      select distinct link.user_id
      from expense_learning_private.contribution_claims as claim
      join expense_learning_private.contributor_revocation_links as link
        on link.week_start = claim.week_start
       and link.contributor_week_hmac = claim.contributor_week_hmac
      where claim.expires_at <= p_now
    ) as candidate
    order by candidate.user_id::text
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'expense-learning-consent-v1:' || v_user_id::text,
        0
      )
    );
    v_candidate_user_ids := pg_catalog.array_append(
      v_candidate_user_ids,
      v_user_id
    );
  end loop;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'expense-learning-accumulator-mutation-v1',
      0
    )
  );

  for v_link in
    select link.user_id, link.week_start
    from expense_learning_private.contributor_revocation_links as link
    where link.user_id = any (v_candidate_user_ids)
      and (
        expense_learning_private.is_expense_learning_link_cleanup_eligible_v1(
          link.user_id,
          link.week_start,
          p_now
        )
        or exists (
          select 1
          from expense_learning_private.contribution_claims as claim
          where claim.week_start = link.week_start
            and claim.contributor_week_hmac = link.contributor_week_hmac
            and claim.expires_at <= p_now
        )
      )
    order by link.user_id::text, link.week_start
    for update of link skip locked
  loop
    v_locked_link_user_ids := pg_catalog.array_append(
      v_locked_link_user_ids,
      v_link.user_id
    );
    v_locked_link_week_starts := pg_catalog.array_append(
      v_locked_link_week_starts,
      v_link.week_start
    );
  end loop;

  if pg_catalog.cardinality(v_locked_link_user_ids) > 0 then
    for v_locked_link_index in
      1..pg_catalog.cardinality(v_locked_link_user_ids)
    loop
      select link.contributor_week_hmac
      into v_link
      from expense_learning_private.contributor_revocation_links as link
      where link.user_id = v_locked_link_user_ids[v_locked_link_index]
        and link.week_start = v_locked_link_week_starts[v_locked_link_index];

      if found then
        delete from expense_learning_private.contribution_claims as claim
        where claim.week_start =
            v_locked_link_week_starts[v_locked_link_index]
          and claim.contributor_week_hmac = v_link.contributor_week_hmac
          and claim.expires_at <= p_now;

        if expense_learning_private.is_expense_learning_link_cleanup_eligible_v1(
          v_locked_link_user_ids[v_locked_link_index],
          v_locked_link_week_starts[v_locked_link_index],
          p_now
        ) is true
          and expense_learning_private.attempt_expense_learning_link_cleanup_v1(
            v_locked_link_user_ids[v_locked_link_index],
            v_locked_link_week_starts[v_locked_link_index],
            p_now
          ) is distinct from true then
          v_retry_required := true;
        end if;
      end if;
    end loop;
  end if;

  for v_week_start in
    select distinct source.week_start
    from (
      select membership.week_start
      from expense_learning_private.accumulator_memberships as membership
      where membership.expires_at <= p_now
      union
      select accumulator.week_start
      from expense_learning_private.protected_accumulators as accumulator
      where accumulator.expires_at <= p_now
    ) as source
    order by source.week_start
  loop
    perform expense_learning_private.lock_expense_learning_week_cells_v1(
      v_week_start
    );

    if exists (
      select 1
      from expense_learning_private.contributor_revocation_links as link
      where link.week_start = v_week_start
    ) then
      if expense_learning_private.reconcile_expense_learning_week_v1(
        v_week_start
      ) is distinct from true then
        v_retry_required := true;
      end if;
    else
      delete from expense_learning_private.accumulator_memberships as membership
      where membership.week_start = v_week_start
        and membership.expires_at <= p_now;

      delete from expense_learning_private.protected_accumulators as accumulator
      where accumulator.week_start = v_week_start
        and accumulator.expires_at <= p_now
        and not exists (
          select 1
          from expense_learning_private.accumulator_memberships as membership
          where membership.contribution_schema_version =
              accumulator.contribution_schema_version
            and membership.observation_schema_version =
              accumulator.observation_schema_version
            and membership.engine_version = accumulator.engine_version
            and membership.privacy_policy_version =
              accumulator.privacy_policy_version
            and membership.week_start = accumulator.week_start
            and membership.structural_archetype_group =
              accumulator.structural_archetype_group
            and membership.metric_family = accumulator.metric_family
            and membership.comparison_scope = accumulator.comparison_scope
            and membership.metric_key = accumulator.metric_key
            and membership.bucket_kind = accumulator.bucket_kind
            and membership.bucket_value = accumulator.bucket_value
        );
    end if;
  end loop;

  delete from expense_learning_private.closed_week_supported_metrics as metric
  where metric.expires_at <= p_now;

  if exists (
    select 1
    from expense_learning_private.contribution_claims as claim
    where claim.expires_at <= p_now
  )
    or exists (
      select 1
      from expense_learning_private.contributor_revocation_links as link
      where expense_learning_private.is_expense_learning_link_cleanup_eligible_v1(
        link.user_id,
        link.week_start,
        p_now
      )
    )
    or exists (
      select 1
      from expense_learning_private.accumulator_memberships as membership
      where membership.expires_at <= p_now
    )
    or exists (
      select 1
      from expense_learning_private.protected_accumulators as accumulator
      where accumulator.expires_at <= p_now
    )
    or exists (
      select 1
      from expense_learning_private.closed_week_supported_metrics as metric
      where metric.expires_at <= p_now
    ) then
    v_retry_required := true;
  end if;

  if v_retry_required then
    return 'RETRY_REQUIRED';
  end if;

  return 'PURGED';
end;
$$;

create or replace function public.set_expense_learning_consent_v1(
  p_user_id uuid,
  p_decision jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_keys_valid boolean;
  v_granted boolean;
  v_current_granted boolean;
  v_decided_at timestamptz;
  v_link record;
begin
  if expense_learning_private.is_service_role_request_v1()
    is distinct from true then
    raise exception 'expense_learning_consent_rpc_forbidden'
      using errcode = '42501';
  end if;

  if p_user_id is null
    or p_decision is null
    or pg_catalog.jsonb_typeof(p_decision) <> 'object'
    or pg_catalog.octet_length(p_decision::text) > 512 then
    raise exception 'expense_learning_consent_invalid_argument'
      using errcode = '22023';
  end if;

  select
    pg_catalog.count(*) = 5
    and pg_catalog.bool_and(
      decision_key = any (array[
        'schemaVersion',
        'noticeVersion',
        'purpose',
        'privacyPolicyVersion',
        'granted'
      ]::text[])
    )
  into v_keys_valid
  from pg_catalog.jsonb_object_keys(p_decision) as keys(decision_key);

  if v_keys_valid is distinct from true
    or pg_catalog.jsonb_typeof(p_decision -> 'schemaVersion') <> 'string'
    or pg_catalog.jsonb_typeof(p_decision -> 'noticeVersion') <> 'string'
    or pg_catalog.jsonb_typeof(p_decision -> 'purpose') <> 'string'
    or pg_catalog.jsonb_typeof(p_decision -> 'privacyPolicyVersion') <> 'string'
    or pg_catalog.jsonb_typeof(p_decision -> 'granted') <> 'boolean'
    or p_decision ->> 'schemaVersion'
      <> 'expense-engine-learning-consent.v1'
    or p_decision ->> 'noticeVersion' <> 'expense-learning-notice.v1'
    or p_decision ->> 'purpose' <> 'IMPROVE_LOCAL_EXPENSE_READER'
    or p_decision ->> 'privacyPolicyVersion' <> '2026-07-21' then
    raise exception 'expense_learning_consent_invalid_argument'
      using errcode = '22023';
  end if;

  v_granted := (p_decision ->> 'granted')::boolean;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'expense-learning-consent-v1:' || p_user_id::text,
      0
    )
  );

  select decision.granted, decision.decided_at
  into v_current_granted, v_decided_at
  from expense_learning_private.learning_consent_decisions as decision
  where decision.user_id = p_user_id
    and decision.schema_version = 'expense-engine-learning-consent.v1'
    and decision.notice_version = 'expense-learning-notice.v1'
    and decision.purpose = 'IMPROVE_LOCAL_EXPENSE_READER'
    and decision.privacy_policy_version = '2026-07-21'
  order by decision.decision_id desc
  limit 1;

  if not found or v_current_granted <> v_granted then
    insert into expense_learning_private.learning_consent_decisions (
      user_id,
      schema_version,
      notice_version,
      purpose,
      privacy_policy_version,
      granted,
      decided_at
    ) values (
      p_user_id,
      'expense-engine-learning-consent.v1',
      'expense-learning-notice.v1',
      'IMPROVE_LOCAL_EXPENSE_READER',
      '2026-07-21',
      v_granted,
      pg_catalog.clock_timestamp()
    )
    returning decided_at into v_decided_at;
  end if;

  if v_granted is false then
    begin
      for v_link in
        select link.week_start
        from expense_learning_private.contributor_revocation_links as link
        where link.user_id = p_user_id
        order by link.week_start
      loop
        if expense_learning_private.is_expense_learning_week_accumulator_consistent_v1(
          v_link.week_start
        ) is true then
          perform expense_learning_private.attempt_expense_learning_link_cleanup_v1(
            p_user_id,
            v_link.week_start,
            pg_catalog.clock_timestamp()
          );
        end if;
      end loop;
    exception
      when others then
        null;
    end;
  end if;

  return pg_catalog.jsonb_build_object(
    'state', case when v_granted then 'GRANTED' else 'REVOKED' end,
    'schemaVersion', 'expense-engine-learning-consent.v1',
    'noticeVersion', 'expense-learning-notice.v1',
    'purpose', 'IMPROVE_LOCAL_EXPENSE_READER',
    'privacyPolicyVersion', '2026-07-21',
    'decidedAt', v_decided_at
  );
end;
$$;

create or replace function public.purge_expense_learning_retention_v1()
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

  return expense_learning_private.run_expense_learning_retention_v1(
    pg_catalog.clock_timestamp()
  );
end;
$$;

alter function expense_learning_private.is_expense_learning_week_source_canonical_v1(
  date
) owner to expense_learning_storage_owner;
alter function expense_learning_private.lock_expense_learning_week_cells_v1(
  date
) owner to expense_learning_storage_owner;
alter function expense_learning_private.is_expense_learning_link_source_canonical_v1(
  uuid,
  date
) owner to expense_learning_storage_owner;
alter function expense_learning_private.is_expense_learning_week_accumulator_consistent_v1(
  date
) owner to expense_learning_storage_owner;
alter function expense_learning_private.reconcile_expense_learning_week_v1(
  date
) owner to expense_learning_storage_owner;
alter function expense_learning_private.is_expense_learning_link_cleanup_eligible_v1(
  uuid,
  date,
  timestamptz
) owner to expense_learning_storage_owner;
alter function expense_learning_private.attempt_expense_learning_link_cleanup_v1(
  uuid,
  date,
  timestamptz
) owner to expense_learning_storage_owner;
alter function expense_learning_private.run_expense_learning_retention_v1(
  timestamptz
) owner to expense_learning_storage_owner;
alter function expense_learning_private.purge_expense_learning_link_v1()
  owner to expense_learning_storage_owner;
alter function public.set_expense_learning_consent_v1(uuid, jsonb)
  owner to expense_learning_storage_owner;
alter function public.purge_expense_learning_retention_v1()
  owner to expense_learning_storage_owner;

revoke all on all functions in schema expense_learning_private
  from public, anon, authenticated, service_role;
revoke all on function public.set_expense_learning_consent_v1(uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.purge_expense_learning_retention_v1()
  from public, anon, authenticated, service_role;
grant execute on function public.set_expense_learning_consent_v1(uuid, jsonb)
  to service_role;
grant execute on function public.purge_expense_learning_retention_v1()
  to service_role;

notify pgrst, 'reload schema';

commit;
