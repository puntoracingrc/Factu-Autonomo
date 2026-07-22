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

  if v_owner_oid is null then
    raise exception 'expense_learning_p1b_prerequisite_invalid'
      using errcode = '55000';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_namespace as namespace
    where namespace.nspname = 'expense_learning_private'
      and namespace.nspowner = v_owner_oid
  ) then
    raise exception 'expense_learning_p1b_prerequisite_invalid'
      using errcode = '55000';
  end if;

  if (
    select pg_catalog.count(*)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'expense_learning_private'
      and relation.relname in (
        'contribution_claims',
        'contributor_week_limits',
        'accumulator_memberships',
        'protected_accumulators',
        'closed_week_supported_metrics'
      )
      and relation.relkind = 'r'
      and relation.relowner = v_owner_oid
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ) <> 5 then
    raise exception 'expense_learning_p1b_prerequisite_invalid'
      using errcode = '55000';
  end if;

  if pg_catalog.to_regprocedure(
    'expense_learning_private.is_service_role_request_v1()'
  ) is null then
    raise exception 'expense_learning_p1b_prerequisite_invalid'
      using errcode = '55000';
  end if;

  if pg_catalog.has_schema_privilege(
    'service_role',
    'expense_learning_private',
    'USAGE'
  ) then
    raise exception 'expense_learning_p1b_prerequisite_invalid'
      using errcode = '55000';
  end if;

  if pg_catalog.to_regclass(
    'expense_learning_private.learning_consent_decisions'
  ) is not null
    or pg_catalog.to_regprocedure(
      'public.get_expense_learning_consent_v1(uuid)'
    ) is not null
    or pg_catalog.to_regprocedure(
      'public.set_expense_learning_consent_v1(uuid,jsonb)'
    ) is not null then
    raise exception 'expense_learning_p2a_objects_already_exist'
      using errcode = '42710';
  end if;
end;
$$;

create table expense_learning_private.learning_consent_decisions (
  decision_id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  schema_version text not null,
  notice_version text not null,
  purpose text not null,
  privacy_policy_version text not null,
  granted boolean not null,
  decided_at timestamptz not null,
  constraint learning_consent_decisions_versions_v1
    check (
      schema_version = 'expense-engine-learning-consent.v1'
      and notice_version = 'expense-learning-notice.v1'
      and purpose = 'IMPROVE_LOCAL_EXPENSE_READER'
      and privacy_policy_version = '2026-07-21'
    )
);

create index learning_consent_decisions_current_v1_idx
  on expense_learning_private.learning_consent_decisions (
    user_id,
    schema_version,
    notice_version,
    purpose,
    privacy_policy_version,
    decision_id desc
  );

alter table expense_learning_private.learning_consent_decisions
  owner to expense_learning_storage_owner;
alter table expense_learning_private.learning_consent_decisions
  enable row level security;
alter table expense_learning_private.learning_consent_decisions
  force row level security;

create policy expense_learning_consent_owner_select_v1
  on expense_learning_private.learning_consent_decisions
  for select
  to expense_learning_storage_owner
  using (true);

create policy expense_learning_consent_owner_insert_v1
  on expense_learning_private.learning_consent_decisions
  for insert
  to expense_learning_storage_owner
  with check (true);

revoke all on table expense_learning_private.learning_consent_decisions
  from public, anon, authenticated, service_role;
revoke all on sequence
  expense_learning_private.learning_consent_decisions_decision_id_seq
  from public, anon, authenticated, service_role;

create function public.get_expense_learning_consent_v1(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_granted boolean;
  v_decided_at timestamptz;
begin
  if expense_learning_private.is_service_role_request_v1()
    is distinct from true then
    raise exception 'expense_learning_consent_rpc_forbidden'
      using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'expense_learning_consent_invalid_argument'
      using errcode = '22023';
  end if;

  select decision.granted, decision.decided_at
  into v_granted, v_decided_at
  from expense_learning_private.learning_consent_decisions as decision
  where decision.user_id = p_user_id
    and decision.schema_version = 'expense-engine-learning-consent.v1'
    and decision.notice_version = 'expense-learning-notice.v1'
    and decision.purpose = 'IMPROVE_LOCAL_EXPENSE_READER'
    and decision.privacy_policy_version = '2026-07-21'
  order by decision.decision_id desc
  limit 1;

  if not found then
    return pg_catalog.jsonb_build_object(
      'state', 'UNDECIDED',
      'schemaVersion', 'expense-engine-learning-consent.v1',
      'noticeVersion', 'expense-learning-notice.v1',
      'purpose', 'IMPROVE_LOCAL_EXPENSE_READER',
      'privacyPolicyVersion', '2026-07-21',
      'decidedAt', null
    );
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

create function public.set_expense_learning_consent_v1(
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

grant create on schema public to expense_learning_storage_owner;

alter function public.get_expense_learning_consent_v1(uuid)
  owner to expense_learning_storage_owner;
alter function public.set_expense_learning_consent_v1(uuid, jsonb)
  owner to expense_learning_storage_owner;

revoke create on schema public from expense_learning_storage_owner;

revoke all on function public.get_expense_learning_consent_v1(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.set_expense_learning_consent_v1(uuid, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function public.get_expense_learning_consent_v1(uuid)
  to service_role;
grant execute on function public.set_expense_learning_consent_v1(uuid, jsonb)
  to service_role;

notify pgrst, 'reload schema';

commit;
