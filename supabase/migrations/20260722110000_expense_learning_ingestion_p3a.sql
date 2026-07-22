begin;

do $$
declare
  v_owner_oid oid;
  v_runtime_table text;
  v_has_rows boolean;
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
      'expense_learning_private.learning_consent_decisions'
    ) is null
    or pg_catalog.to_regprocedure(
      'public.set_expense_learning_consent_v1(uuid,jsonb)'
    ) is null
    or pg_catalog.to_regprocedure(
      'extensions.hmac(bytea,bytea,text)'
    ) is null then
    raise exception 'expense_learning_p3a_prerequisite_invalid'
      using errcode = '55000';
  end if;

  foreach v_runtime_table in array array[
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
      raise exception 'expense_learning_p3a_runtime_not_empty'
        using errcode = '55000';
    end if;
  end loop;

  if pg_catalog.to_regclass(
    'expense_learning_private.contributor_revocation_links'
  ) is not null
    or pg_catalog.to_regprocedure(
      'expense_learning_private.stage_expense_learning_contribution_v1(uuid,jsonb,bytea,bytea)'
    ) is not null then
    raise exception 'expense_learning_p3a_objects_already_exist'
      using errcode = '42710';
  end if;
end;
$$;

grant usage on schema extensions to expense_learning_storage_owner;

create table expense_learning_private.contributor_revocation_links (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  contributor_week_hmac bytea not null,
  expires_at timestamptz not null,
  primary key (user_id, week_start),
  constraint contributor_revocation_links_week_hmac_v1
    unique (week_start, contributor_week_hmac),
  constraint contributor_revocation_links_monday_v1
    check (pg_catalog.date_part('isodow', week_start) = 1),
  constraint contributor_revocation_links_hmac_length_v1
    check (pg_catalog.octet_length(contributor_week_hmac) = 32),
  constraint contributor_revocation_links_fixed_expiry_v1
    check (
      expires_at =
        (week_start::timestamp at time zone 'UTC') + interval '35 days'
    )
);

alter table expense_learning_private.contribution_claims
  add column week_start date not null,
  add column contributor_week_hmac bytea not null,
  add constraint contribution_claims_monday_v1
    check (pg_catalog.date_part('isodow', week_start) = 1),
  add constraint contribution_claims_week_hmac_length_v1
    check (pg_catalog.octet_length(contributor_week_hmac) = 32),
  add constraint contribution_claims_revocation_link_v1
    foreign key (week_start, contributor_week_hmac)
    references expense_learning_private.contributor_revocation_links (
      week_start,
      contributor_week_hmac
    )
    on delete cascade;

alter table expense_learning_private.contributor_week_limits
  drop constraint contributor_week_limits_ttl_v1,
  drop column first_accepted_at,
  add constraint contributor_week_limits_revocation_link_v1
    foreign key (week_start, contributor_week_hmac)
    references expense_learning_private.contributor_revocation_links (
      week_start,
      contributor_week_hmac
    )
    on delete cascade,
  add constraint contributor_week_limits_fixed_expiry_v1
    check (
      expires_at =
        (week_start::timestamp at time zone 'UTC') + interval '35 days'
    );

alter table expense_learning_private.accumulator_memberships
  drop constraint accumulator_memberships_ttl_v1,
  drop column accepted_at,
  add constraint accumulator_memberships_fixed_expiry_v1
    check (
      expires_at =
        (week_start::timestamp at time zone 'UTC') + interval '35 days'
    );

alter table expense_learning_private.protected_accumulators
  drop constraint protected_accumulators_ttl_v1,
  drop column opened_at,
  add constraint protected_accumulators_fixed_expiry_v1
    check (
      expires_at =
        (week_start::timestamp at time zone 'UTC') + interval '35 days'
    );

alter table expense_learning_private.contributor_revocation_links
  owner to expense_learning_storage_owner;
alter table expense_learning_private.contributor_revocation_links
  enable row level security;
alter table expense_learning_private.contributor_revocation_links
  force row level security;

create policy expense_learning_revocation_links_owner_select_v1
  on expense_learning_private.contributor_revocation_links
  for select to expense_learning_storage_owner using (true);
create policy expense_learning_revocation_links_owner_insert_v1
  on expense_learning_private.contributor_revocation_links
  for insert to expense_learning_storage_owner with check (true);
create policy expense_learning_revocation_links_owner_delete_v1
  on expense_learning_private.contributor_revocation_links
  for delete to expense_learning_storage_owner using (true);

create policy expense_learning_claims_owner_select_v1
  on expense_learning_private.contribution_claims
  for select to expense_learning_storage_owner using (true);
create policy expense_learning_claims_owner_insert_v1
  on expense_learning_private.contribution_claims
  for insert to expense_learning_storage_owner with check (true);
create policy expense_learning_claims_owner_delete_v1
  on expense_learning_private.contribution_claims
  for delete to expense_learning_storage_owner using (true);

create policy expense_learning_week_limits_owner_select_v1
  on expense_learning_private.contributor_week_limits
  for select to expense_learning_storage_owner using (true);
create policy expense_learning_week_limits_owner_insert_v1
  on expense_learning_private.contributor_week_limits
  for insert to expense_learning_storage_owner with check (true);
create policy expense_learning_week_limits_owner_update_v1
  on expense_learning_private.contributor_week_limits
  for update to expense_learning_storage_owner
  using (true) with check (true);
create policy expense_learning_week_limits_owner_delete_v1
  on expense_learning_private.contributor_week_limits
  for delete to expense_learning_storage_owner using (true);

create policy expense_learning_memberships_owner_select_v1
  on expense_learning_private.accumulator_memberships
  for select to expense_learning_storage_owner using (true);
create policy expense_learning_memberships_owner_insert_v1
  on expense_learning_private.accumulator_memberships
  for insert to expense_learning_storage_owner with check (true);
create policy expense_learning_memberships_owner_delete_v1
  on expense_learning_private.accumulator_memberships
  for delete to expense_learning_storage_owner using (true);

create policy expense_learning_accumulators_owner_select_v1
  on expense_learning_private.protected_accumulators
  for select to expense_learning_storage_owner using (true);
create policy expense_learning_accumulators_owner_insert_v1
  on expense_learning_private.protected_accumulators
  for insert to expense_learning_storage_owner with check (true);
create policy expense_learning_accumulators_owner_update_v1
  on expense_learning_private.protected_accumulators
  for update to expense_learning_storage_owner
  using (true) with check (true);
create policy expense_learning_accumulators_owner_delete_v1
  on expense_learning_private.protected_accumulators
  for delete to expense_learning_storage_owner using (true);

revoke all on table
  expense_learning_private.contributor_revocation_links
  from public, anon, authenticated, service_role;

create function expense_learning_private.expense_learning_week_expiry_v1(
  p_week_start date
)
returns timestamptz
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select
    (p_week_start::timestamp at time zone 'UTC') + interval '35 days';
$$;

create function expense_learning_private.expense_learning_coordinate_hmac_v1(
  p_contributor_week_hmac bytea,
  p_contribution_schema_version text,
  p_observation_schema_version text,
  p_engine_version text,
  p_privacy_policy_version text,
  p_week_start date,
  p_structural_archetype_group text,
  p_metric_family text,
  p_comparison_scope text,
  p_metric_key text
)
returns bytea
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select extensions.hmac(
    pg_catalog.convert_to(
      pg_catalog.concat_ws(
        pg_catalog.chr(31),
        'expense-learning-coordinate-v1',
        p_contribution_schema_version,
        p_observation_schema_version,
        p_engine_version,
        p_privacy_policy_version,
        p_week_start::text,
        p_structural_archetype_group,
        p_metric_family,
        p_comparison_scope,
        p_metric_key
      ),
      'UTF8'
    ),
    p_contributor_week_hmac,
    'sha256'
  );
$$;

create function expense_learning_private.expense_learning_cell_lock_key_v1(
  p_contribution_schema_version text,
  p_observation_schema_version text,
  p_engine_version text,
  p_privacy_policy_version text,
  p_week_start date,
  p_structural_archetype_group text,
  p_metric_family text,
  p_comparison_scope text,
  p_metric_key text,
  p_bucket_kind text,
  p_bucket_value text
)
returns bigint
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select pg_catalog.hashtextextended(
    pg_catalog.concat_ws(
      pg_catalog.chr(31),
      'expense-learning-accumulator-cell-v1',
      p_contribution_schema_version,
      p_observation_schema_version,
      p_engine_version,
      p_privacy_policy_version,
      p_week_start::text,
      p_structural_archetype_group,
      p_metric_family,
      p_comparison_scope,
      p_metric_key,
      p_bucket_kind,
      p_bucket_value
    ),
    0
  );
$$;

create function expense_learning_private.is_canonical_contribution_v1(
  p_contribution jsonb
)
returns boolean
language plpgsql
immutable
strict
parallel safe
set search_path = ''
as $$
declare
  v_valid boolean;
  v_local_outcome text;
  v_abstention_reason text;
  v_route_mode text;
  v_ai_fallback_reason text;
  v_ai_usage text;
  v_source_quality text;
  v_local_confidence text;
  v_human_review text;
  v_field record;
  v_field_triple text;
  v_ai_was_corrected boolean := false;
  v_has_ai_evidence boolean := false;
  v_math record;
  v_rejected_flag text;
  v_tax_flag text;
  v_credit_sign_flag text;
  v_tax_was_corrected boolean;
begin
  if pg_catalog.jsonb_typeof(p_contribution) <> 'object'
    or pg_catalog.octet_length(p_contribution::text) > 16384
    or (
      select pg_catalog.count(*)
      from pg_catalog.jsonb_object_keys(p_contribution)
    ) <> 7
    or not p_contribution ?& array[
      'schemaVersion',
      'observationSchemaVersion',
      'engineVersion',
      'privacyPolicyVersion',
      'structuralArchetypeGroup',
      'metrics',
      'learningHints'
    ]
    or expense_learning_private.has_canonical_versions_v1(
      p_contribution ->> 'schemaVersion',
      p_contribution ->> 'observationSchemaVersion',
      p_contribution ->> 'engineVersion',
      p_contribution ->> 'privacyPolicyVersion'
    ) is distinct from true
    or (
      p_contribution ->> 'structuralArchetypeGroup' in (
        'TABLE',
        'SUMMARY',
        'OTHER',
        'UNKNOWN'
      )
    ) is distinct from true
    or p_contribution -> 'learningHints' <> 'null'::jsonb
    or pg_catalog.jsonb_typeof(p_contribution -> 'metrics') <> 'array'
    or pg_catalog.jsonb_array_length(p_contribution -> 'metrics') <> 67 then
    return false;
  end if;

  select
    pg_catalog.count(*) = 67
    and pg_catalog.count(distinct (
      metric ->> 'family',
      metric ->> 'comparisonScope',
      metric ->> 'key'
    )) = 67
    and pg_catalog.bool_and(
      pg_catalog.jsonb_typeof(metric) = 'object'
      and (
        select pg_catalog.count(*)
        from pg_catalog.jsonb_object_keys(metric)
      ) = 4
      and metric ?& array['family', 'comparisonScope', 'key', 'value']
      and expense_learning_private.is_canonical_metric_bucket_v1(
        metric ->> 'family',
        metric ->> 'comparisonScope',
        metric ->> 'key',
        'EXACT',
        metric ->> 'value'
      ) is true
    )
  into v_valid
  from pg_catalog.jsonb_array_elements(
    p_contribution -> 'metrics'
  ) as metrics(metric);

  if v_valid is distinct from true then
    return false;
  end if;

  select
    pg_catalog.max(metric ->> 'value') filter (
      where metric ->> 'family' = 'LOCAL_OUTCOME'
    ),
    pg_catalog.max(metric ->> 'value') filter (
      where metric ->> 'family' = 'ABSTENTION_REASON'
    ),
    pg_catalog.max(metric ->> 'value') filter (
      where metric ->> 'family' = 'ROUTE_MODE'
    ),
    pg_catalog.max(metric ->> 'value') filter (
      where metric ->> 'family' = 'AI_FALLBACK_REASON'
    ),
    pg_catalog.max(metric ->> 'value') filter (
      where metric ->> 'family' = 'AI_USAGE'
    ),
    pg_catalog.max(metric ->> 'value') filter (
      where metric ->> 'family' = 'SOURCE_QUALITY'
    ),
    pg_catalog.max(metric ->> 'value') filter (
      where metric ->> 'family' = 'LOCAL_CONFIDENCE'
    ),
    pg_catalog.max(metric ->> 'value') filter (
      where metric ->> 'family' = 'HUMAN_REVIEW'
    )
  into
    v_local_outcome,
    v_abstention_reason,
    v_route_mode,
    v_ai_fallback_reason,
    v_ai_usage,
    v_source_quality,
    v_local_confidence,
    v_human_review
  from pg_catalog.jsonb_array_elements(
    p_contribution -> 'metrics'
  ) as metrics(metric);

  if (v_local_outcome = 'CANDIDATE' and v_abstention_reason <> 'NONE')
    or (v_local_outcome <> 'CANDIDATE' and v_abstention_reason = 'NONE') then
    return false;
  end if;

  if v_route_mode = 'SHADOW_AI' then
    if v_ai_usage <> 'ONE'
      or (
        v_local_outcome = 'CANDIDATE'
        and v_ai_fallback_reason <> 'NONE'
      )
      or (
        v_local_outcome <> 'CANDIDATE'
        and v_ai_fallback_reason <> v_abstention_reason
      ) then
      return false;
    end if;
  elsif v_route_mode = 'AI_FALLBACK' then
    if v_ai_usage <> 'ONE'
      or v_local_outcome = 'CANDIDATE'
      or v_ai_fallback_reason = 'NONE'
      or v_ai_fallback_reason <> v_abstention_reason then
      return false;
    end if;
  elsif v_route_mode in ('LOCAL_ONLY', 'HUMAN_REVIEW') then
    if v_ai_usage <> 'NONE' or v_ai_fallback_reason <> 'NONE' then
      return false;
    end if;
  else
    return false;
  end if;

  if (
      v_local_outcome = 'FAILED'
      and (
        v_source_quality <> 'UNREADABLE'
        or v_local_confidence <> 'LOW'
      )
    )
    or (
      v_source_quality = 'UNREADABLE'
      and (
        v_local_outcome = 'CANDIDATE'
        or v_local_confidence <> 'LOW'
      )
    )
    or (
      v_local_outcome = 'CANDIDATE'
      and (
        v_source_quality = 'UNREADABLE'
        or v_local_confidence = 'LOW'
      )
    )
    or (
      v_abstention_reason = 'LOW_CONFIDENCE'
      and v_local_confidence <> 'LOW'
    ) then
    return false;
  end if;

  if v_human_review = 'NOT_REVIEWED' then
    return false;
  end if;

  for v_field in
    select
      metric ->> 'key' as metric_key,
      pg_catalog.max(metric ->> 'value') filter (
        where metric ->> 'comparisonScope' = 'LOCAL_VS_HUMAN'
      ) as local_vs_human,
      pg_catalog.max(metric ->> 'value') filter (
        where metric ->> 'comparisonScope' = 'AI_VS_HUMAN'
      ) as ai_vs_human,
      pg_catalog.max(metric ->> 'value') filter (
        where metric ->> 'comparisonScope' = 'LOCAL_VS_AI'
      ) as local_vs_ai
    from pg_catalog.jsonb_array_elements(
      p_contribution -> 'metrics'
    ) as metrics(metric)
    where metric ->> 'family' = 'FIELD_VERDICT'
    group by metric ->> 'key'
    order by metric ->> 'key'
  loop
    v_field_triple := pg_catalog.concat_ws(
      ':',
      v_field.local_vs_human,
      v_field.ai_vs_human,
      v_field.local_vs_ai
    );

    if not (v_field_triple = any (array[
      'ABSTAINED:ABSTAINED:ABSTAINED',
      'ABSTAINED:ABSTAINED:MISSING',
      'ABSTAINED:ABSTAINED:MATCH',
      'ABSTAINED:ABSTAINED:CORRECTED',
      'ABSTAINED:EXTRA:MISSING',
      'EXTRA:ABSTAINED:EXTRA',
      'EXTRA:EXTRA:MATCH',
      'EXTRA:EXTRA:CORRECTED',
      'MISSING:MISSING:ABSTAINED',
      'MISSING:MATCH:MISSING',
      'MISSING:CORRECTED:MISSING',
      'MATCH:MISSING:ABSTAINED',
      'CORRECTED:MISSING:ABSTAINED',
      'MATCH:MISSING:EXTRA',
      'CORRECTED:MISSING:EXTRA',
      'MATCH:MATCH:MATCH',
      'MATCH:CORRECTED:CORRECTED',
      'CORRECTED:MATCH:CORRECTED',
      'CORRECTED:CORRECTED:MATCH',
      'CORRECTED:CORRECTED:CORRECTED'
    ]::text[])) then
      return false;
    end if;

    if v_local_outcome <> 'CANDIDATE'
      and (
        v_field.local_vs_human in ('MATCH', 'CORRECTED', 'EXTRA')
        or v_field.local_vs_ai in ('MATCH', 'CORRECTED', 'EXTRA')
      ) then
      return false;
    end if;

    if v_ai_usage = 'NONE'
      and (
        v_field.ai_vs_human in ('MATCH', 'CORRECTED', 'EXTRA')
        or v_field.local_vs_ai not in ('ABSTAINED', 'EXTRA')
      ) then
      return false;
    end if;

    if v_field.ai_vs_human in ('CORRECTED', 'MISSING', 'EXTRA') then
      v_ai_was_corrected := true;
    end if;
    if v_field.ai_vs_human <> 'ABSTAINED' then
      v_has_ai_evidence := true;
    end if;
  end loop;

  if (v_human_review = 'CONFIRMED' and v_ai_was_corrected)
    or (v_human_review = 'CORRECTED' and not v_ai_was_corrected)
    or not v_has_ai_evidence then
    return false;
  end if;

  for v_math in
    select
      metric ->> 'key' as metric_key,
      pg_catalog.max(metric ->> 'value') filter (
        where metric ->> 'family' = 'MATH_VERDICT'
      ) as verdict,
      pg_catalog.max(metric ->> 'value') filter (
        where metric ->> 'family' = 'MATH_RESIDUAL'
      ) as residual
    from pg_catalog.jsonb_array_elements(
      p_contribution -> 'metrics'
    ) as metrics(metric)
    where metric ->> 'family' in ('MATH_VERDICT', 'MATH_RESIDUAL')
    group by metric ->> 'key'
    order by metric ->> 'key'
  loop
    if (v_math.verdict = 'INSUFFICIENT' and v_math.residual <> 'UNKNOWN')
      or (v_math.verdict <> 'INSUFFICIENT' and v_math.residual = 'UNKNOWN')
      or (v_math.verdict = 'MATCH' and v_math.residual = 'MATERIAL')
      or (
        v_math.verdict = 'MISMATCH'
        and v_math.residual not in ('ROUNDING_TOLERANCE', 'MATERIAL')
      )
      or (
        v_local_outcome = 'CANDIDATE'
        and v_math.verdict = 'MISMATCH'
      )
      or (
        v_local_outcome = 'FAILED'
        and (
          v_math.verdict <> 'INSUFFICIENT'
          or v_math.residual <> 'UNKNOWN'
        )
      ) then
      return false;
    end if;
  end loop;

  select
    pg_catalog.max(metric ->> 'value') filter (
      where metric ->> 'key' = 'EXPENSE_ACCEPTED_THEN_REJECTED'
    ),
    pg_catalog.max(metric ->> 'value') filter (
      where metric ->> 'key' = 'TAX_TREATMENT_CORRECTED'
    ),
    pg_catalog.max(metric ->> 'value') filter (
      where metric ->> 'key' = 'CREDIT_SIGN_CORRECTED'
    )
  into v_rejected_flag, v_tax_flag, v_credit_sign_flag
  from pg_catalog.jsonb_array_elements(
    p_contribution -> 'metrics'
  ) as metrics(metric)
  where metric ->> 'family' = 'CRITICAL_FLAG';

  select coalesce(
    pg_catalog.bool_or(
      metric ->> 'value' in ('CORRECTED', 'MISSING', 'EXTRA')
    ),
    false
  )
  into v_tax_was_corrected
  from pg_catalog.jsonb_array_elements(
    p_contribution -> 'metrics'
  ) as metrics(metric)
  where metric ->> 'family' = 'FIELD_VERDICT'
    and metric ->> 'comparisonScope' = 'AI_VS_HUMAN'
    and metric ->> 'key' in (
      'TAX_RATE',
      'TAX_BASE',
      'TAX_AMOUNT',
      'SURCHARGE_AMOUNT',
      'WITHHOLDING_AMOUNT'
    );

  if ((v_rejected_flag = 'PRESENT') is distinct from
      (v_human_review = 'REJECTED'))
    or ((v_tax_flag = 'PRESENT') is distinct from v_tax_was_corrected)
    or v_credit_sign_flag = 'PRESENT' then
    return false;
  end if;

  return true;
exception when others then
  return false;
end;
$$;

create function expense_learning_private.lock_expense_learning_cells_v1(
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

create function expense_learning_private.purge_expense_learning_link_v1()
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

create trigger expense_learning_revocation_link_purge_v1
before delete on expense_learning_private.contributor_revocation_links
for each row
execute function expense_learning_private.purge_expense_learning_link_v1();

create function expense_learning_private.stage_expense_learning_contribution_v1(
  p_user_id uuid,
  p_contribution jsonb,
  p_claim_token_digest bytea,
  p_contributor_week_hmac bytea
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_week_start date;
  v_expires_at timestamptz;
  v_current_granted boolean;
  v_existing_week_hmac bytea;
  v_existing_claim record;
  v_accepted smallint;
  v_claimed_at timestamptz;
  v_claim_inserted integer;
  v_metric record;
  v_coordinate_hmac bytea;
  v_membership_inserted integer;
  v_support integer;
  v_membership_count integer;
begin
  if p_user_id is null
    or p_contribution is null
    or p_claim_token_digest is null
    or pg_catalog.octet_length(p_claim_token_digest) <> 32
    or p_contributor_week_hmac is null
    or pg_catalog.octet_length(p_contributor_week_hmac) <> 32
    or expense_learning_private.is_canonical_contribution_v1(p_contribution)
      is distinct from true then
    raise exception 'expense_learning_ingestion_invalid_argument'
      using errcode = '22023';
  end if;

  v_week_start := pg_catalog.date_trunc(
    'week',
    pg_catalog.clock_timestamp() at time zone 'UTC'
  )::date;
  v_expires_at :=
    expense_learning_private.expense_learning_week_expiry_v1(v_week_start);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'expense-learning-consent-v1:' || p_user_id::text,
      0
    )
  );

  select decision.granted
  into v_current_granted
  from expense_learning_private.learning_consent_decisions as decision
  where decision.user_id = p_user_id
    and decision.schema_version = 'expense-engine-learning-consent.v1'
    and decision.notice_version = 'expense-learning-notice.v1'
    and decision.purpose = 'IMPROVE_LOCAL_EXPENSE_READER'
    and decision.privacy_policy_version = '2026-07-21'
  order by decision.decision_id desc
  limit 1;

  if not found or v_current_granted is distinct from true then
    return 'NOT_CONSENTED';
  end if;

  if exists (
    select 1
    from expense_learning_private.learning_consent_decisions as decision
    where decision.user_id = p_user_id
      and decision.schema_version = 'expense-engine-learning-consent.v1'
      and decision.notice_version = 'expense-learning-notice.v1'
      and decision.purpose = 'IMPROVE_LOCAL_EXPENSE_READER'
      and decision.privacy_policy_version = '2026-07-21'
      and decision.granted = false
      and decision.decided_at >=
        (v_week_start::timestamp at time zone 'UTC')
      and decision.decided_at <
        (v_week_start::timestamp at time zone 'UTC') + interval '7 days'
  ) then
    return 'WITHDRAWAL_COOLDOWN';
  end if;

  insert into expense_learning_private.contributor_revocation_links (
    user_id,
    week_start,
    contributor_week_hmac,
    expires_at
  ) values (
    p_user_id,
    v_week_start,
    p_contributor_week_hmac,
    v_expires_at
  )
  on conflict (user_id, week_start) do nothing;

  select link.contributor_week_hmac
  into v_existing_week_hmac
  from expense_learning_private.contributor_revocation_links as link
  where link.user_id = p_user_id
    and link.week_start = v_week_start;

  if not found
    or v_existing_week_hmac <> p_contributor_week_hmac then
    raise exception 'expense_learning_ingestion_hmac_conflict'
      using errcode = '22023';
  end if;

  select claim.week_start, claim.contributor_week_hmac
  into v_existing_claim
  from expense_learning_private.contribution_claims as claim
  where claim.claim_token_digest = p_claim_token_digest;

  if found then
    if v_existing_claim.week_start = v_week_start
      and v_existing_claim.contributor_week_hmac =
        p_contributor_week_hmac then
      return 'REPLAYED';
    end if;

    raise exception 'expense_learning_ingestion_claim_conflict'
      using errcode = '22023';
  end if;

  select week_limit.accepted_learning_contributions
  into v_accepted
  from expense_learning_private.contributor_week_limits as week_limit
  where week_limit.week_start = v_week_start
    and week_limit.contributor_week_hmac = p_contributor_week_hmac
  for update;

  if found and v_accepted >= 20 then
    return 'CAP_REACHED';
  end if;

  v_claimed_at := pg_catalog.clock_timestamp();

  insert into expense_learning_private.contribution_claims (
    claim_token_digest,
    claimed_at,
    expires_at,
    week_start,
    contributor_week_hmac
  ) values (
    p_claim_token_digest,
    v_claimed_at,
    v_claimed_at + interval '24 hours',
    v_week_start,
    p_contributor_week_hmac
  )
  on conflict (claim_token_digest) do nothing;
  get diagnostics v_claim_inserted = row_count;

  if v_claim_inserted = 0 then
    select claim.week_start, claim.contributor_week_hmac
    into v_existing_claim
    from expense_learning_private.contribution_claims as claim
    where claim.claim_token_digest = p_claim_token_digest;

    if found
      and v_existing_claim.week_start = v_week_start
      and v_existing_claim.contributor_week_hmac =
        p_contributor_week_hmac then
      return 'REPLAYED';
    end if;

    raise exception 'expense_learning_ingestion_claim_conflict'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'expense-learning-accumulator-mutation-v1',
      0
    )
  );

  perform expense_learning_private.lock_expense_learning_cells_v1(
    p_contribution,
    v_week_start
  );

  insert into expense_learning_private.contributor_week_limits (
    week_start,
    contributor_week_hmac,
    accepted_learning_contributions,
    expires_at
  ) values (
    v_week_start,
    p_contributor_week_hmac,
    1,
    v_expires_at
  )
  on conflict (week_start, contributor_week_hmac) do update
  set accepted_learning_contributions =
    expense_learning_private.contributor_week_limits
      .accepted_learning_contributions + 1;

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
    v_coordinate_hmac :=
      expense_learning_private.expense_learning_coordinate_hmac_v1(
        p_contributor_week_hmac,
        p_contribution ->> 'schemaVersion',
        p_contribution ->> 'observationSchemaVersion',
        p_contribution ->> 'engineVersion',
        p_contribution ->> 'privacyPolicyVersion',
        v_week_start,
        p_contribution ->> 'structuralArchetypeGroup',
        v_metric.metric_family,
        v_metric.comparison_scope,
        v_metric.metric_key
      );

    insert into expense_learning_private.accumulator_memberships (
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
      contributor_coordinate_hmac,
      expires_at
    ) values (
      p_contribution ->> 'schemaVersion',
      p_contribution ->> 'observationSchemaVersion',
      p_contribution ->> 'engineVersion',
      p_contribution ->> 'privacyPolicyVersion',
      v_week_start,
      p_contribution ->> 'structuralArchetypeGroup',
      v_metric.metric_family,
      v_metric.comparison_scope,
      v_metric.metric_key,
      'EXACT',
      v_metric.bucket_value,
      v_coordinate_hmac,
      v_expires_at
    )
    on conflict do nothing;
    get diagnostics v_membership_inserted = row_count;

    if v_membership_inserted = 1 then
      select accumulator.supporting_contributors
      into v_support
      from expense_learning_private.protected_accumulators as accumulator
      where accumulator.contribution_schema_version =
          p_contribution ->> 'schemaVersion'
        and accumulator.observation_schema_version =
          p_contribution ->> 'observationSchemaVersion'
        and accumulator.engine_version = p_contribution ->> 'engineVersion'
        and accumulator.privacy_policy_version =
          p_contribution ->> 'privacyPolicyVersion'
        and accumulator.week_start = v_week_start
        and accumulator.structural_archetype_group =
          p_contribution ->> 'structuralArchetypeGroup'
        and accumulator.metric_family = v_metric.metric_family
        and accumulator.comparison_scope = v_metric.comparison_scope
        and accumulator.metric_key = v_metric.metric_key
        and accumulator.bucket_kind = 'EXACT'
        and accumulator.bucket_value = v_metric.bucket_value
      for update;

      select pg_catalog.count(*)
      into v_membership_count
      from expense_learning_private.accumulator_memberships as membership
      where membership.contribution_schema_version =
          p_contribution ->> 'schemaVersion'
        and membership.observation_schema_version =
          p_contribution ->> 'observationSchemaVersion'
        and membership.engine_version = p_contribution ->> 'engineVersion'
        and membership.privacy_policy_version =
          p_contribution ->> 'privacyPolicyVersion'
        and membership.week_start = v_week_start
        and membership.structural_archetype_group =
          p_contribution ->> 'structuralArchetypeGroup'
        and membership.metric_family = v_metric.metric_family
        and membership.comparison_scope = v_metric.comparison_scope
        and membership.metric_key = v_metric.metric_key
        and membership.bucket_kind = 'EXACT'
        and membership.bucket_value = v_metric.bucket_value;

      if (v_support is null and v_membership_count <> 1)
        or (v_support is not null and v_support <> v_membership_count - 1) then
        raise exception 'expense_learning_accumulator_corrupt'
          using errcode = '55000';
      end if;

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
      ) values (
        p_contribution ->> 'schemaVersion',
        p_contribution ->> 'observationSchemaVersion',
        p_contribution ->> 'engineVersion',
        p_contribution ->> 'privacyPolicyVersion',
        v_week_start,
        p_contribution ->> 'structuralArchetypeGroup',
        v_metric.metric_family,
        v_metric.comparison_scope,
        v_metric.metric_key,
        'EXACT',
        v_metric.bucket_value,
        v_membership_count,
        v_expires_at
      )
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
      set supporting_contributors = excluded.supporting_contributors;
    end if;
  end loop;

  return 'ACCEPTED';
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

drop function public.submit_expense_learning_contribution_v1(
  jsonb,
  text,
  text
);

create function public.submit_expense_learning_contribution_v1(
  p_user_id uuid,
  p_contribution jsonb,
  p_claim_token_digest text,
  p_contributor_week_hmac text
)
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

  if p_user_id is null
    or p_contribution is null
    or pg_catalog.jsonb_typeof(p_contribution) <> 'object'
    or pg_catalog.octet_length(p_contribution::text) > 16384
    or p_claim_token_digest is null
    or pg_catalog.length(p_claim_token_digest) <> 64
    or p_claim_token_digest !~ '^[0-9a-f]{64}$'
    or p_contributor_week_hmac is null
    or pg_catalog.length(p_contributor_week_hmac) <> 64
    or p_contributor_week_hmac !~ '^[0-9a-f]{64}$' then
    raise exception 'expense_learning_rpc_invalid_argument'
      using errcode = '22023';
  end if;

  return 'DISABLED';
end;
$$;

alter function expense_learning_private.expense_learning_week_expiry_v1(date)
  owner to expense_learning_storage_owner;
alter function expense_learning_private.expense_learning_coordinate_hmac_v1(
  bytea,
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  text
) owner to expense_learning_storage_owner;
alter function expense_learning_private.expense_learning_cell_lock_key_v1(
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text
) owner to expense_learning_storage_owner;
alter function expense_learning_private.is_canonical_contribution_v1(jsonb)
  owner to expense_learning_storage_owner;
alter function expense_learning_private.lock_expense_learning_cells_v1(
  jsonb,
  date
) owner to expense_learning_storage_owner;
alter function expense_learning_private.purge_expense_learning_link_v1()
  owner to expense_learning_storage_owner;
alter function expense_learning_private.stage_expense_learning_contribution_v1(
  uuid,
  jsonb,
  bytea,
  bytea
) owner to expense_learning_storage_owner;

grant create on schema public to expense_learning_storage_owner;

alter function public.submit_expense_learning_contribution_v1(
  uuid,
  jsonb,
  text,
  text
) owner to expense_learning_storage_owner;

revoke create on schema public from expense_learning_storage_owner;

revoke all on all functions in schema expense_learning_private
  from public, anon, authenticated, service_role;
revoke all on function public.submit_expense_learning_contribution_v1(
  uuid,
  jsonb,
  text,
  text
) from public, anon, authenticated, service_role;
grant execute on function public.submit_expense_learning_contribution_v1(
  uuid,
  jsonb,
  text,
  text
) to service_role;

notify pgrst, 'reload schema';

commit;
