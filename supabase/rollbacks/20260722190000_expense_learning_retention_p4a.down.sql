begin;

do $$
declare
  v_runtime_table text;
  v_has_rows boolean;
begin
  foreach v_runtime_table in array array[
    'contributor_revocation_links',
    'contribution_claims',
    'contributor_week_limits',
    'accumulator_memberships',
    'protected_accumulators',
    'closed_week_supported_metrics'
  ] loop
    execute pg_catalog.format(
      'select exists (select 1 from expense_learning_private.%I)',
      v_runtime_table
    ) into v_has_rows;

    if v_has_rows then
      raise exception 'Expense learning P4A storage is not empty; rollback is unsafe'
        using errcode = '55000';
    end if;
  end loop;
end;
$$;

drop policy expense_learning_closed_metrics_owner_delete_v1
  on expense_learning_private.closed_week_supported_metrics;
drop policy expense_learning_closed_metrics_owner_select_v1
  on expense_learning_private.closed_week_supported_metrics;
drop policy expense_learning_revocation_links_owner_lock_v1
  on expense_learning_private.contributor_revocation_links;

create or replace function expense_learning_private.purge_expense_learning_link_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership record;
  v_support integer;
  v_membership_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'expense-learning-accumulator-mutation-v1',
      0
    )
  );

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
    perform pg_catalog.pg_advisory_xact_lock(
      expense_learning_private.expense_learning_cell_lock_key_v1(
        v_membership.contribution_schema_version,
        v_membership.observation_schema_version,
        v_membership.engine_version,
        v_membership.privacy_policy_version,
        v_membership.week_start,
        v_membership.structural_archetype_group,
        v_membership.metric_family,
        v_membership.comparison_scope,
        v_membership.metric_key,
        v_membership.bucket_kind,
        v_membership.bucket_value
      )
    );
  end loop;

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
    select accumulator.supporting_contributors
    into v_support
    from expense_learning_private.protected_accumulators as accumulator
    where accumulator.contribution_schema_version =
        v_membership.contribution_schema_version
      and accumulator.observation_schema_version =
        v_membership.observation_schema_version
      and accumulator.engine_version = v_membership.engine_version
      and accumulator.privacy_policy_version =
        v_membership.privacy_policy_version
      and accumulator.week_start = v_membership.week_start
      and accumulator.structural_archetype_group =
        v_membership.structural_archetype_group
      and accumulator.metric_family = v_membership.metric_family
      and accumulator.comparison_scope = v_membership.comparison_scope
      and accumulator.metric_key = v_membership.metric_key
      and accumulator.bucket_kind = v_membership.bucket_kind
      and accumulator.bucket_value = v_membership.bucket_value
    for update;

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

    if v_support is null
      or v_support <> v_membership_count
      or v_membership_count < 1 then
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

  if found and v_current_granted = v_granted then
    if v_granted is false then
      delete from expense_learning_private.contributor_revocation_links
      where user_id = p_user_id;
    end if;

    return pg_catalog.jsonb_build_object(
      'state', case when v_granted then 'GRANTED' else 'REVOKED' end,
      'schemaVersion', 'expense-engine-learning-consent.v1',
      'noticeVersion', 'expense-learning-notice.v1',
      'purpose', 'IMPROVE_LOCAL_EXPENSE_READER',
      'privacyPolicyVersion', '2026-07-21',
      'decidedAt', v_decided_at
    );
  end if;

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

  if v_granted is false then
    delete from expense_learning_private.contributor_revocation_links
    where user_id = p_user_id;
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

  return 'DISABLED';
end;
$$;

drop function expense_learning_private.run_expense_learning_retention_v1(
  timestamptz
);
drop function expense_learning_private.attempt_expense_learning_link_cleanup_v1(
  uuid,
  date,
  timestamptz
);
drop function expense_learning_private.is_expense_learning_link_cleanup_eligible_v1(
  uuid,
  date,
  timestamptz
);
drop function expense_learning_private.reconcile_expense_learning_week_v1(date);
drop function expense_learning_private.is_expense_learning_week_accumulator_consistent_v1(
  date
);
drop function expense_learning_private.is_expense_learning_link_source_canonical_v1(
  uuid,
  date
);
drop function expense_learning_private.lock_expense_learning_week_cells_v1(date);
drop function expense_learning_private.is_expense_learning_week_source_canonical_v1(
  date
);

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
