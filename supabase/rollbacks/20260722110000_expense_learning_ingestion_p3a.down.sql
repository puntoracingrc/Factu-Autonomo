begin;

do $$
declare
  v_table text;
  v_has_rows boolean;
begin
  if pg_catalog.to_regclass(
    'expense_learning_private.contributor_revocation_links'
  ) is null then
    raise exception 'Expense learning ingestion P3A is not installed'
      using errcode = '55000';
  end if;

  foreach v_table in array array[
    'contribution_claims',
    'contributor_week_limits',
    'accumulator_memberships',
    'protected_accumulators',
    'closed_week_supported_metrics',
    'contributor_revocation_links'
  ] loop
    execute pg_catalog.format(
      'select exists (select 1 from expense_learning_private.%I)',
      v_table
    ) into v_has_rows;

    if v_has_rows then
      raise exception
        'Expense learning P3A storage is not empty; rollback is unsafe'
        using errcode = '55000';
    end if;
  end loop;
end;
$$;

drop function public.submit_expense_learning_contribution_v1(
  uuid,
  jsonb,
  text,
  text
);

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

drop trigger expense_learning_revocation_link_purge_v1
  on expense_learning_private.contributor_revocation_links;

drop function expense_learning_private.stage_expense_learning_contribution_v1(
  uuid,
  jsonb,
  bytea,
  bytea
);
drop function expense_learning_private.purge_expense_learning_link_v1();
drop function expense_learning_private.lock_expense_learning_cells_v1(
  jsonb,
  date
);
drop function expense_learning_private.is_canonical_contribution_v1(jsonb);
drop function expense_learning_private.expense_learning_cell_lock_key_v1(
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
);
drop function expense_learning_private.expense_learning_coordinate_hmac_v1(
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
);
drop function expense_learning_private.expense_learning_week_expiry_v1(date);

revoke usage on schema extensions from expense_learning_storage_owner;

drop policy expense_learning_claims_owner_select_v1
  on expense_learning_private.contribution_claims;
drop policy expense_learning_claims_owner_insert_v1
  on expense_learning_private.contribution_claims;
drop policy expense_learning_claims_owner_delete_v1
  on expense_learning_private.contribution_claims;
drop policy expense_learning_week_limits_owner_select_v1
  on expense_learning_private.contributor_week_limits;
drop policy expense_learning_week_limits_owner_insert_v1
  on expense_learning_private.contributor_week_limits;
drop policy expense_learning_week_limits_owner_update_v1
  on expense_learning_private.contributor_week_limits;
drop policy expense_learning_week_limits_owner_delete_v1
  on expense_learning_private.contributor_week_limits;
drop policy expense_learning_memberships_owner_select_v1
  on expense_learning_private.accumulator_memberships;
drop policy expense_learning_memberships_owner_insert_v1
  on expense_learning_private.accumulator_memberships;
drop policy expense_learning_memberships_owner_delete_v1
  on expense_learning_private.accumulator_memberships;
drop policy expense_learning_accumulators_owner_select_v1
  on expense_learning_private.protected_accumulators;
drop policy expense_learning_accumulators_owner_insert_v1
  on expense_learning_private.protected_accumulators;
drop policy expense_learning_accumulators_owner_update_v1
  on expense_learning_private.protected_accumulators;
drop policy expense_learning_accumulators_owner_delete_v1
  on expense_learning_private.protected_accumulators;

alter table expense_learning_private.contribution_claims
  drop constraint contribution_claims_revocation_link_v1,
  drop constraint contribution_claims_week_hmac_length_v1,
  drop constraint contribution_claims_monday_v1,
  drop column contributor_week_hmac,
  drop column week_start;

alter table expense_learning_private.contributor_week_limits
  drop constraint contributor_week_limits_revocation_link_v1,
  drop constraint contributor_week_limits_fixed_expiry_v1,
  add column first_accepted_at timestamptz not null
    default pg_catalog.statement_timestamp(),
  add constraint contributor_week_limits_ttl_v1
    check (
      expires_at > first_accepted_at
      and expires_at <= first_accepted_at + interval '35 days'
    );

alter table expense_learning_private.accumulator_memberships
  drop constraint accumulator_memberships_fixed_expiry_v1,
  add column accepted_at timestamptz not null
    default pg_catalog.statement_timestamp(),
  add constraint accumulator_memberships_ttl_v1
    check (
      expires_at > accepted_at
      and expires_at <= accepted_at + interval '35 days'
    );

alter table expense_learning_private.protected_accumulators
  drop constraint protected_accumulators_fixed_expiry_v1,
  add column opened_at timestamptz not null
    default pg_catalog.statement_timestamp(),
  add constraint protected_accumulators_ttl_v1
    check (
      expires_at > opened_at
      and expires_at <= opened_at + interval '35 days'
    );

drop table expense_learning_private.contributor_revocation_links;

grant create on schema public to expense_learning_storage_owner;

alter function public.submit_expense_learning_contribution_v1(
  jsonb,
  text,
  text
) owner to expense_learning_storage_owner;

revoke create on schema public from expense_learning_storage_owner;

revoke all on function public.submit_expense_learning_contribution_v1(
  jsonb,
  text,
  text
) from public, anon, authenticated, service_role;
grant execute on function public.submit_expense_learning_contribution_v1(
  jsonb,
  text,
  text
) to service_role;

notify pgrst, 'reload schema';

commit;
