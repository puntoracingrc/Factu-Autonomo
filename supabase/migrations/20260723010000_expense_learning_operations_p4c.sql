begin;

do $$
declare
  v_owner_oid oid;
  v_submit_definition text;
  v_purge_definition text;
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
      'expense_learning_private.closed_week_promotion_batches'
    ) is null
    or pg_catalog.to_regprocedure(
      'expense_learning_private.stage_expense_learning_contribution_v1(uuid,jsonb,bytea,bytea)'
    ) is null
    or pg_catalog.to_regprocedure(
      'expense_learning_private.run_expense_learning_retention_v1(timestamp with time zone)'
    ) is null
    or pg_catalog.to_regprocedure(
      'public.submit_expense_learning_contribution_v1(uuid,jsonb,text,text)'
    ) is null
    or pg_catalog.to_regprocedure(
      'public.purge_expense_learning_retention_v1()'
    ) is null
    or (
      select pg_catalog.count(*) = 4
        and pg_catalog.bool_and(function.proowner = v_owner_oid)
      from pg_catalog.pg_proc as function
      where function.oid = any (array[
        pg_catalog.to_regprocedure(
          'expense_learning_private.stage_expense_learning_contribution_v1(uuid,jsonb,bytea,bytea)'
        )::oid,
        pg_catalog.to_regprocedure(
          'expense_learning_private.run_expense_learning_retention_v1(timestamp with time zone)'
        )::oid,
        pg_catalog.to_regprocedure(
          'public.submit_expense_learning_contribution_v1(uuid,jsonb,text,text)'
        )::oid,
        pg_catalog.to_regprocedure(
          'public.purge_expense_learning_retention_v1()'
        )::oid
      ])
    ) is distinct from true
    or (
      select pg_catalog.count(*) = 2
        and pg_catalog.bool_and(function.prosecdef)
      from pg_catalog.pg_proc as function
      where function.oid = any (array[
        pg_catalog.to_regprocedure(
          'public.submit_expense_learning_contribution_v1(uuid,jsonb,text,text)'
        )::oid,
        pg_catalog.to_regprocedure(
          'public.purge_expense_learning_retention_v1()'
        )::oid
      ])
    ) is distinct from true then
    raise exception 'expense_learning_p4c_prerequisite_invalid'
      using errcode = '55000';
  end if;

  if pg_catalog.to_regprocedure(
    'expense_learning_private.expense_learning_retention_lookahead_v1()'
  ) is not null then
    raise exception 'expense_learning_p4c_objects_already_exist'
      using errcode = '42710';
  end if;

  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure(
      'public.submit_expense_learning_contribution_v1(uuid,jsonb,text,text)'
    )
  ) into v_submit_definition;

  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure(
      'public.purge_expense_learning_retention_v1()'
    )
  ) into v_purge_definition;

  if pg_catalog.strpos(
    v_submit_definition,
    'return ''DISABLED'''
  ) = 0
    or pg_catalog.strpos(
      v_purge_definition,
      'run_expense_learning_retention_v1'
    ) = 0
    or pg_catalog.strpos(
      v_purge_definition,
      'clock_timestamp()'
    ) = 0 then
    raise exception 'expense_learning_p4c_function_state_invalid'
      using errcode = '55000';
  end if;
end;
$$;

create function expense_learning_private.expense_learning_retention_lookahead_v1()
returns interval
language sql
immutable
security invoker
set search_path = ''
as $$
  select interval '4 hours'
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
declare
  v_result text;
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

  v_result := expense_learning_private.stage_expense_learning_contribution_v1(
    p_user_id,
    p_contribution,
    pg_catalog.decode(p_claim_token_digest, 'hex'),
    pg_catalog.decode(p_contributor_week_hmac, 'hex')
  );

  if v_result is null or v_result not in (
    'ACCEPTED',
    'REPLAYED',
    'NOT_CONSENTED',
    'WITHDRAWAL_COOLDOWN',
    'CAP_REACHED'
  ) then
    raise exception 'expense_learning_rpc_invalid_result'
      using errcode = '55000';
  end if;

  return v_result;
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
      + expense_learning_private.expense_learning_retention_lookahead_v1()
  );
end;
$$;

alter function expense_learning_private.expense_learning_retention_lookahead_v1()
  owner to expense_learning_storage_owner;
alter function public.submit_expense_learning_contribution_v1(
  uuid,
  jsonb,
  text,
  text
) owner to expense_learning_storage_owner;
alter function public.purge_expense_learning_retention_v1()
  owner to expense_learning_storage_owner;

revoke all on function
  expense_learning_private.expense_learning_retention_lookahead_v1()
  from public, anon, authenticated, service_role;
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
