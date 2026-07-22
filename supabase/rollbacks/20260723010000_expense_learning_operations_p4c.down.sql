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
    or pg_catalog.to_regprocedure(
      'expense_learning_private.expense_learning_retention_lookahead_v1()'
    ) is null
    or pg_catalog.to_regprocedure(
      'expense_learning_private.stage_expense_learning_contribution_v1(uuid,jsonb,bytea,bytea)'
    ) is null
    or pg_catalog.to_regprocedure(
      'expense_learning_private.run_expense_learning_retention_v1(timestamp with time zone)'
    ) is null
    or (
      select function.proowner = v_owner_oid
      from pg_catalog.pg_proc as function
      where function.oid = pg_catalog.to_regprocedure(
        'expense_learning_private.expense_learning_retention_lookahead_v1()'
      )
    ) is distinct from true then
    raise exception 'expense_learning_p4c_rollback_prerequisite_invalid'
      using errcode = '55000';
  end if;
end;
$$;

create or replace function public.submit_expense_learning_contribution_v1(
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

drop function
  expense_learning_private.expense_learning_retention_lookahead_v1()
  restrict;

alter function public.submit_expense_learning_contribution_v1(
  uuid,
  jsonb,
  text,
  text
) owner to expense_learning_storage_owner;
alter function public.purge_expense_learning_retention_v1()
  owner to expense_learning_storage_owner;

revoke all on function public.submit_expense_learning_contribution_v1(
  uuid,
  jsonb,
  text,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.purge_expense_learning_retention_v1()
  from public, anon, authenticated, service_role;
grant execute on function public.submit_expense_learning_contribution_v1(
  uuid,
  jsonb,
  text,
  text
) to service_role;
grant execute on function public.purge_expense_learning_retention_v1()
  to service_role;

notify pgrst, 'reload schema';

commit;
