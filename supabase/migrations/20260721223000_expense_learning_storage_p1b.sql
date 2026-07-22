begin;

do $$
begin
  if exists (
    select 1
    from pg_catalog.pg_roles
    where rolname = 'expense_learning_storage_owner'
  ) then
    raise exception 'expense_learning_storage_owner already exists'
      using errcode = '42710';
  end if;

  create role expense_learning_storage_owner
    nologin
    noinherit
    nosuperuser
    nocreatedb
    nocreaterole
    noreplication
    nobypassrls;
end;
$$;

grant expense_learning_storage_owner to postgres;

create schema expense_learning_private
  authorization expense_learning_storage_owner;

revoke all on schema expense_learning_private
  from public, anon, authenticated, service_role;

create function expense_learning_private.is_canonical_metric_coordinate_v1(
  p_family text,
  p_comparison_scope text,
  p_metric_key text
)
returns boolean
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select exists (
    select 1
    from (values
      ('SOURCE_QUALITY', 'NONE', 'VALUE'),
      ('ROUTE_MODE', 'NONE', 'VALUE'),
      ('LOCAL_OUTCOME', 'NONE', 'VALUE'),
      ('LOCAL_CONFIDENCE', 'NONE', 'VALUE'),
      ('ABSTENTION_REASON', 'NONE', 'VALUE'),
      ('AI_FALLBACK_REASON', 'NONE', 'VALUE'),
      ('AI_USAGE', 'NONE', 'VALUE'),
      ('LOCAL_DURATION', 'NONE', 'VALUE'),
      ('HUMAN_REVIEW', 'NONE', 'VALUE'),
      ('FIELD_VERDICT', 'LOCAL_VS_HUMAN', 'DOCUMENT_KIND'),
      ('FIELD_VERDICT', 'LOCAL_VS_HUMAN', 'EXPENSE_DATE'),
      ('FIELD_VERDICT', 'LOCAL_VS_HUMAN', 'SUPPLIER_IDENTITY_PRESENT'),
      ('FIELD_VERDICT', 'LOCAL_VS_HUMAN', 'CATEGORY'),
      ('FIELD_VERDICT', 'LOCAL_VS_HUMAN', 'TAX_RATE'),
      ('FIELD_VERDICT', 'LOCAL_VS_HUMAN', 'TAX_BASE'),
      ('FIELD_VERDICT', 'LOCAL_VS_HUMAN', 'TAX_AMOUNT'),
      ('FIELD_VERDICT', 'LOCAL_VS_HUMAN', 'SURCHARGE_AMOUNT'),
      ('FIELD_VERDICT', 'LOCAL_VS_HUMAN', 'WITHHOLDING_AMOUNT'),
      ('FIELD_VERDICT', 'LOCAL_VS_HUMAN', 'TOTAL_AMOUNT'),
      ('FIELD_VERDICT', 'LOCAL_VS_HUMAN', 'PAYMENT_METHOD'),
      ('FIELD_VERDICT', 'LOCAL_VS_HUMAN', 'LINE_COUNT'),
      ('FIELD_VERDICT', 'LOCAL_VS_HUMAN', 'LINE_UNITS'),
      ('FIELD_VERDICT', 'LOCAL_VS_HUMAN', 'LINE_TOTALS'),
      ('FIELD_VERDICT', 'AI_VS_HUMAN', 'DOCUMENT_KIND'),
      ('FIELD_VERDICT', 'AI_VS_HUMAN', 'EXPENSE_DATE'),
      ('FIELD_VERDICT', 'AI_VS_HUMAN', 'SUPPLIER_IDENTITY_PRESENT'),
      ('FIELD_VERDICT', 'AI_VS_HUMAN', 'CATEGORY'),
      ('FIELD_VERDICT', 'AI_VS_HUMAN', 'TAX_RATE'),
      ('FIELD_VERDICT', 'AI_VS_HUMAN', 'TAX_BASE'),
      ('FIELD_VERDICT', 'AI_VS_HUMAN', 'TAX_AMOUNT'),
      ('FIELD_VERDICT', 'AI_VS_HUMAN', 'SURCHARGE_AMOUNT'),
      ('FIELD_VERDICT', 'AI_VS_HUMAN', 'WITHHOLDING_AMOUNT'),
      ('FIELD_VERDICT', 'AI_VS_HUMAN', 'TOTAL_AMOUNT'),
      ('FIELD_VERDICT', 'AI_VS_HUMAN', 'PAYMENT_METHOD'),
      ('FIELD_VERDICT', 'AI_VS_HUMAN', 'LINE_COUNT'),
      ('FIELD_VERDICT', 'AI_VS_HUMAN', 'LINE_UNITS'),
      ('FIELD_VERDICT', 'AI_VS_HUMAN', 'LINE_TOTALS'),
      ('FIELD_VERDICT', 'LOCAL_VS_AI', 'DOCUMENT_KIND'),
      ('FIELD_VERDICT', 'LOCAL_VS_AI', 'EXPENSE_DATE'),
      ('FIELD_VERDICT', 'LOCAL_VS_AI', 'SUPPLIER_IDENTITY_PRESENT'),
      ('FIELD_VERDICT', 'LOCAL_VS_AI', 'CATEGORY'),
      ('FIELD_VERDICT', 'LOCAL_VS_AI', 'TAX_RATE'),
      ('FIELD_VERDICT', 'LOCAL_VS_AI', 'TAX_BASE'),
      ('FIELD_VERDICT', 'LOCAL_VS_AI', 'TAX_AMOUNT'),
      ('FIELD_VERDICT', 'LOCAL_VS_AI', 'SURCHARGE_AMOUNT'),
      ('FIELD_VERDICT', 'LOCAL_VS_AI', 'WITHHOLDING_AMOUNT'),
      ('FIELD_VERDICT', 'LOCAL_VS_AI', 'TOTAL_AMOUNT'),
      ('FIELD_VERDICT', 'LOCAL_VS_AI', 'PAYMENT_METHOD'),
      ('FIELD_VERDICT', 'LOCAL_VS_AI', 'LINE_COUNT'),
      ('FIELD_VERDICT', 'LOCAL_VS_AI', 'LINE_UNITS'),
      ('FIELD_VERDICT', 'LOCAL_VS_AI', 'LINE_TOTALS'),
      ('MATH_VERDICT', 'NONE', 'LINE_EXTENSIONS'),
      ('MATH_RESIDUAL', 'NONE', 'LINE_EXTENSIONS'),
      ('MATH_VERDICT', 'NONE', 'LINES_TO_BASE'),
      ('MATH_RESIDUAL', 'NONE', 'LINES_TO_BASE'),
      ('MATH_VERDICT', 'NONE', 'TAX_FROM_BASE'),
      ('MATH_RESIDUAL', 'NONE', 'TAX_FROM_BASE'),
      ('MATH_VERDICT', 'NONE', 'SURCHARGE_FROM_BASE'),
      ('MATH_RESIDUAL', 'NONE', 'SURCHARGE_FROM_BASE'),
      ('MATH_VERDICT', 'NONE', 'DOCUMENT_TOTAL'),
      ('MATH_RESIDUAL', 'NONE', 'DOCUMENT_TOTAL'),
      ('MATH_VERDICT', 'NONE', 'SIGN_CONSISTENCY'),
      ('MATH_RESIDUAL', 'NONE', 'SIGN_CONSISTENCY'),
      ('CRITICAL_FLAG', 'NONE', 'EXPENSE_ACCEPTED_THEN_REJECTED'),
      ('CRITICAL_FLAG', 'NONE', 'TAX_TREATMENT_CORRECTED'),
      ('CRITICAL_FLAG', 'NONE', 'CREDIT_SIGN_CORRECTED'),
      ('CRITICAL_FLAG', 'NONE', 'DUPLICATE_ACCEPTED')
    ) as registry(family, comparison_scope, metric_key)
    where registry.family = p_family
      and registry.comparison_scope = p_comparison_scope
      and registry.metric_key = p_metric_key
  );
$$;

create function expense_learning_private.is_canonical_metric_bucket_v1(
  p_family text,
  p_comparison_scope text,
  p_metric_key text,
  p_bucket_kind text,
  p_bucket_value text
)
returns boolean
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select
    expense_learning_private.is_canonical_metric_coordinate_v1(
      p_family,
      p_comparison_scope,
      p_metric_key
    )
    and case
      when p_family = 'CRITICAL_FLAG'
        and p_metric_key = 'CREDIT_SIGN_CORRECTED' then
        p_bucket_kind = 'EXACT'
        and p_bucket_value = 'NOT_OBSERVED'
      when p_bucket_kind = 'COARSENED_OTHER' then
        p_bucket_value = 'OTHER'
      when p_bucket_kind <> 'EXACT' then false
      when p_family = 'SOURCE_QUALITY' then
        p_bucket_value in ('HIGH', 'MEDIUM', 'LOW', 'UNREADABLE')
      when p_family = 'ROUTE_MODE' then
        p_bucket_value in (
          'SHADOW_AI',
          'LOCAL_ONLY',
          'AI_FALLBACK',
          'HUMAN_REVIEW'
        )
      when p_family = 'LOCAL_OUTCOME' then
        p_bucket_value in ('CANDIDATE', 'ABSTAINED', 'FAILED')
      when p_family = 'LOCAL_CONFIDENCE' then
        p_bucket_value in ('LOW', 'MEDIUM', 'HIGH')
      when p_family in ('ABSTENTION_REASON', 'AI_FALLBACK_REASON') then
        p_bucket_value in (
          'NONE',
          'UNSUPPORTED_ARCHETYPE',
          'LOW_CONFIDENCE',
          'OCR_REQUIRED',
          'OCR_UNAVAILABLE',
          'MISSING_FIELDS',
          'MATH_UNRECONCILED',
          'POLICY_ABSTENTION',
          'LIMIT_EXCEEDED',
          'INVALID_INPUT',
          'UNKNOWN'
        )
      when p_family = 'AI_USAGE' then
        p_bucket_value in ('NONE', 'ONE', 'MULTIPLE', 'UNKNOWN')
      when p_family = 'LOCAL_DURATION' then
        p_bucket_value in (
          'LT_250_MS',
          'LT_1_S',
          'LT_5_S',
          'GTE_5_S',
          'UNKNOWN'
        )
      when p_family = 'HUMAN_REVIEW' then
        p_bucket_value in (
          'CONFIRMED',
          'CORRECTED',
          'REJECTED',
          'NOT_REVIEWED'
        )
      when p_family = 'FIELD_VERDICT' then
        p_bucket_value in (
          'MATCH',
          'CORRECTED',
          'MISSING',
          'EXTRA',
          'ABSTAINED'
        )
      when p_family = 'MATH_VERDICT' then
        p_bucket_value in ('MATCH', 'MISMATCH', 'INSUFFICIENT')
      when p_family = 'MATH_RESIDUAL' then
        p_bucket_value in (
          'EXACT',
          'CENT_TOLERANCE',
          'ROUNDING_TOLERANCE',
          'MATERIAL',
          'UNKNOWN'
        )
      when p_family = 'CRITICAL_FLAG' then
        p_bucket_value in ('PRESENT', 'NOT_OBSERVED')
      else false
    end;
$$;

create function expense_learning_private.has_canonical_versions_v1(
  p_contribution_schema_version text,
  p_observation_schema_version text,
  p_engine_version text,
  p_privacy_policy_version text
)
returns boolean
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select
    p_contribution_schema_version = 'expense-engine-aggregate-contribution.v1'
    and p_observation_schema_version = 'expense-engine-observation.v1'
    and p_engine_version = 'expense-local-engine.v1'
    and p_privacy_policy_version = '2026-07-21';
$$;

create function expense_learning_private.is_service_role_request_v1()
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_request_role text;
  v_request_claims text;
begin
  v_request_role := pg_catalog.current_setting(
    'request.jwt.claim.role',
    true
  );

  if v_request_role is null or v_request_role = '' then
    v_request_claims := pg_catalog.current_setting(
      'request.jwt.claims',
      true
    );

    if v_request_claims is not null and v_request_claims <> '' then
      begin
        v_request_role := pg_catalog.jsonb_extract_path_text(
          v_request_claims::jsonb,
          'role'
        );
      exception when others then
        return false;
      end;
    end if;
  end if;

  return v_request_role is not distinct from 'service_role';
exception when others then
  return false;
end;
$$;

alter function expense_learning_private.is_canonical_metric_coordinate_v1(
  text,
  text,
  text
) owner to expense_learning_storage_owner;
alter function expense_learning_private.is_canonical_metric_bucket_v1(
  text,
  text,
  text,
  text,
  text
) owner to expense_learning_storage_owner;
alter function expense_learning_private.has_canonical_versions_v1(
  text,
  text,
  text,
  text
) owner to expense_learning_storage_owner;
alter function expense_learning_private.is_service_role_request_v1()
  owner to expense_learning_storage_owner;

create table expense_learning_private.contribution_claims (
  claim_token_digest bytea primary key,
  claimed_at timestamptz not null default pg_catalog.statement_timestamp(),
  expires_at timestamptz not null,
  constraint contribution_claims_digest_length_v1
    check (pg_catalog.octet_length(claim_token_digest) = 32),
  constraint contribution_claims_ttl_v1
    check (
      expires_at > claimed_at
      and expires_at <= claimed_at + interval '24 hours'
    )
);

create table expense_learning_private.contributor_week_limits (
  week_start date not null,
  contributor_week_hmac bytea not null,
  accepted_learning_contributions smallint not null default 0,
  first_accepted_at timestamptz not null default pg_catalog.statement_timestamp(),
  expires_at timestamptz not null,
  primary key (week_start, contributor_week_hmac),
  constraint contributor_week_limits_monday_v1
    check (pg_catalog.date_part('isodow', week_start) = 1),
  constraint contributor_week_limits_hmac_length_v1
    check (pg_catalog.octet_length(contributor_week_hmac) = 32),
  constraint contributor_week_limits_learning_only_cap_v1
    check (
      accepted_learning_contributions >= 0
      and accepted_learning_contributions <= 20
    ),
  constraint contributor_week_limits_ttl_v1
    check (
      expires_at > first_accepted_at
      and expires_at <= first_accepted_at + interval '35 days'
    )
);

create table expense_learning_private.accumulator_memberships (
  contribution_schema_version text not null,
  observation_schema_version text not null,
  engine_version text not null,
  privacy_policy_version text not null,
  week_start date not null,
  structural_archetype_group text not null,
  metric_family text not null,
  comparison_scope text not null,
  metric_key text not null,
  bucket_kind text not null default 'EXACT',
  bucket_value text not null,
  contributor_coordinate_hmac bytea not null,
  accepted_at timestamptz not null default pg_catalog.statement_timestamp(),
  expires_at timestamptz not null,
  primary key (
    contribution_schema_version,
    observation_schema_version,
    engine_version,
    privacy_policy_version,
    week_start,
    structural_archetype_group,
    metric_family,
    comparison_scope,
    metric_key,
    contributor_coordinate_hmac
  ),
  constraint accumulator_memberships_versions_v1
    check (expense_learning_private.has_canonical_versions_v1(
      contribution_schema_version,
      observation_schema_version,
      engine_version,
      privacy_policy_version
    )),
  constraint accumulator_memberships_monday_v1
    check (pg_catalog.date_part('isodow', week_start) = 1),
  constraint accumulator_memberships_group_v1
    check (structural_archetype_group in (
      'TABLE',
      'SUMMARY',
      'OTHER',
      'UNKNOWN'
    )),
  constraint accumulator_memberships_exact_bucket_v1
    check (bucket_kind = 'EXACT'),
  constraint accumulator_memberships_bucket_v1
    check (expense_learning_private.is_canonical_metric_bucket_v1(
      metric_family,
      comparison_scope,
      metric_key,
      bucket_kind,
      bucket_value
    )),
  constraint accumulator_memberships_hmac_length_v1
    check (pg_catalog.octet_length(contributor_coordinate_hmac) = 32),
  constraint accumulator_memberships_ttl_v1
    check (
      expires_at > accepted_at
      and expires_at <= accepted_at + interval '35 days'
    )
);

create table expense_learning_private.protected_accumulators (
  contribution_schema_version text not null,
  observation_schema_version text not null,
  engine_version text not null,
  privacy_policy_version text not null,
  week_start date not null,
  structural_archetype_group text not null,
  metric_family text not null,
  comparison_scope text not null,
  metric_key text not null,
  bucket_kind text not null default 'EXACT',
  bucket_value text not null,
  supporting_contributors smallint not null,
  opened_at timestamptz not null default pg_catalog.statement_timestamp(),
  expires_at timestamptz not null,
  primary key (
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
  ),
  constraint protected_accumulators_versions_v1
    check (expense_learning_private.has_canonical_versions_v1(
      contribution_schema_version,
      observation_schema_version,
      engine_version,
      privacy_policy_version
    )),
  constraint protected_accumulators_monday_v1
    check (pg_catalog.date_part('isodow', week_start) = 1),
  constraint protected_accumulators_group_v1
    check (structural_archetype_group in (
      'TABLE',
      'SUMMARY',
      'OTHER',
      'UNKNOWN'
    )),
  constraint protected_accumulators_exact_bucket_v1
    check (bucket_kind = 'EXACT'),
  constraint protected_accumulators_bucket_v1
    check (expense_learning_private.is_canonical_metric_bucket_v1(
      metric_family,
      comparison_scope,
      metric_key,
      bucket_kind,
      bucket_value
    )),
  constraint protected_accumulators_support_v1
    check (supporting_contributors >= 1),
  constraint protected_accumulators_ttl_v1
    check (
      expires_at > opened_at
      and expires_at <= opened_at + interval '35 days'
    )
);

create table expense_learning_private.closed_week_supported_metrics (
  contribution_schema_version text not null,
  observation_schema_version text not null,
  engine_version text not null,
  privacy_policy_version text not null,
  week_start date not null,
  structural_archetype_group text not null,
  metric_family text not null,
  comparison_scope text not null,
  metric_key text not null,
  bucket_kind text not null,
  bucket_value text not null,
  supporting_contributors smallint not null,
  promoted_at timestamptz not null default pg_catalog.statement_timestamp(),
  expires_at timestamptz not null,
  primary key (
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
  ),
  constraint closed_week_supported_metrics_versions_v1
    check (expense_learning_private.has_canonical_versions_v1(
      contribution_schema_version,
      observation_schema_version,
      engine_version,
      privacy_policy_version
    )),
  constraint closed_week_supported_metrics_monday_v1
    check (pg_catalog.date_part('isodow', week_start) = 1),
  constraint closed_week_supported_metrics_group_v1
    check (structural_archetype_group in (
      'TABLE',
      'SUMMARY',
      'OTHER',
      'UNKNOWN'
    )),
  constraint closed_week_supported_metrics_bucket_v1
    check (expense_learning_private.is_canonical_metric_bucket_v1(
      metric_family,
      comparison_scope,
      metric_key,
      bucket_kind,
      bucket_value
    )),
  constraint closed_week_supported_metrics_support_v1
    check (supporting_contributors >= 10),
  constraint closed_week_supported_metrics_ttl_v1
    check (
      expires_at > promoted_at
      and expires_at <= promoted_at + interval '13 months'
    )
);

alter table expense_learning_private.contribution_claims
  owner to expense_learning_storage_owner;
alter table expense_learning_private.contributor_week_limits
  owner to expense_learning_storage_owner;
alter table expense_learning_private.accumulator_memberships
  owner to expense_learning_storage_owner;
alter table expense_learning_private.protected_accumulators
  owner to expense_learning_storage_owner;
alter table expense_learning_private.closed_week_supported_metrics
  owner to expense_learning_storage_owner;

alter table expense_learning_private.contribution_claims
  enable row level security;
alter table expense_learning_private.contribution_claims
  force row level security;
alter table expense_learning_private.contributor_week_limits
  enable row level security;
alter table expense_learning_private.contributor_week_limits
  force row level security;
alter table expense_learning_private.accumulator_memberships
  enable row level security;
alter table expense_learning_private.accumulator_memberships
  force row level security;
alter table expense_learning_private.protected_accumulators
  enable row level security;
alter table expense_learning_private.protected_accumulators
  force row level security;
alter table expense_learning_private.closed_week_supported_metrics
  enable row level security;
alter table expense_learning_private.closed_week_supported_metrics
  force row level security;

revoke all on all tables in schema expense_learning_private
  from public, anon, authenticated, service_role;
revoke all on all functions in schema expense_learning_private
  from public, anon, authenticated, service_role;

create function public.submit_expense_learning_contribution_v1(
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

  if p_contribution is null
    or pg_catalog.jsonb_typeof(p_contribution) <> 'object'
    or pg_catalog.octet_length(p_contribution::text) > 16384 then
    raise exception 'expense_learning_rpc_invalid_argument'
      using errcode = '22023';
  end if;

  if p_claim_token_digest is null
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

create function public.promote_expense_learning_closed_weeks_v1()
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

create function public.purge_expense_learning_retention_v1()
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

grant create on schema public to expense_learning_storage_owner;

alter function public.submit_expense_learning_contribution_v1(
  jsonb,
  text,
  text
) owner to expense_learning_storage_owner;
alter function public.promote_expense_learning_closed_weeks_v1()
  owner to expense_learning_storage_owner;
alter function public.purge_expense_learning_retention_v1()
  owner to expense_learning_storage_owner;

revoke create on schema public from expense_learning_storage_owner;

revoke all on function public.submit_expense_learning_contribution_v1(
  jsonb,
  text,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.promote_expense_learning_closed_weeks_v1()
  from public, anon, authenticated, service_role;
revoke all on function public.purge_expense_learning_retention_v1()
  from public, anon, authenticated, service_role;

grant execute on function public.submit_expense_learning_contribution_v1(
  jsonb,
  text,
  text
) to service_role;
grant execute on function public.promote_expense_learning_closed_weeks_v1()
  to service_role;
grant execute on function public.purge_expense_learning_retention_v1()
  to service_role;

notify pgrst, 'reload schema';

commit;
