begin;

-- `company_id` is also an OUT parameter of this table-returning function.
-- Naming the primary-key constraint avoids PL/pgSQL resolving the conflict
-- target against that output variable instead of the table column.
create or replace function public.list_app_companies_v1(
  p_user_id uuid,
  p_verified_email text
)
returns table (
  company_id uuid,
  data_owner_id uuid,
  billing_owner_user_id uuid,
  company_name text,
  member_role text,
  company_created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (select auth.jwt() ->> 'role'),
    ''
  );
  v_email text := lower(btrim(coalesce(p_verified_email, '')));
  v_company_id uuid;
begin
  if v_role <> 'service_role' then
    raise exception 'list_app_companies_v1 requires service_role'
      using errcode = '42501';
  end if;
  if p_user_id is null or v_email = '' or position('@' in v_email) <= 1 then
    raise exception 'invalid company account identity'
      using errcode = '22023';
  end if;

  for v_company_id in
    select invitation.company_id
    from public.app_company_invitations as invitation
    where invitation.email = v_email
      and invitation.status = 'pending'
    order by invitation.invited_at, invitation.id
    for update
  loop
    insert into public.app_company_members (
      company_id,
      user_id,
      email,
      role,
      status,
      added_by
    )
    select
      invitation.company_id,
      p_user_id,
      v_email,
      invitation.role,
      'active',
      invitation.invited_by
    from public.app_company_invitations as invitation
    where invitation.company_id = v_company_id
      and invitation.email = v_email
      and invitation.status = 'pending'
    on conflict on constraint app_company_members_pkey do update
      set role = excluded.role,
          email = excluded.email,
          status = 'active',
          added_by = excluded.added_by,
          updated_at = statement_timestamp();

    update public.app_company_invitations as invitation
    set status = 'accepted',
        accepted_by = p_user_id,
        accepted_at = statement_timestamp(),
        revoked_at = null
    where invitation.company_id = v_company_id
      and invitation.email = v_email
      and invitation.status = 'pending';

    insert into public.app_company_access_audit (
      company_id,
      actor_user_id,
      event_type,
      target_email,
      target_user_id
    ) values (
      v_company_id,
      p_user_id,
      'invitation_accepted',
      v_email,
      p_user_id
    );
  end loop;

  if not exists (
    select 1
    from public.app_company_members as member
    where member.user_id = p_user_id
      and member.status = 'active'
  ) then
    insert into public.app_companies (
      id,
      data_owner_id,
      billing_owner_user_id,
      created_by,
      name
    ) values (
      p_user_id,
      p_user_id,
      p_user_id,
      p_user_id,
      'Mi empresa'
    )
    on conflict (id) do nothing;

    insert into public.app_company_members (
      company_id,
      user_id,
      email,
      role,
      status,
      added_by
    ) values (
      p_user_id,
      p_user_id,
      v_email,
      'owner',
      'active',
      p_user_id
    )
    on conflict on constraint app_company_members_pkey do update
      set role = 'owner',
          email = v_email,
          status = 'active',
          added_by = p_user_id,
          updated_at = statement_timestamp();

    insert into public.app_company_access_audit (
      company_id,
      actor_user_id,
      event_type,
      target_user_id
    ) values (
      p_user_id,
      p_user_id,
      'company_created',
      p_user_id
    );
  end if;

  return query
  select
    company.id,
    company.data_owner_id,
    company.billing_owner_user_id,
    company.name,
    member.role,
    company.created_at
  from public.app_company_members as member
  join public.app_companies as company on company.id = member.company_id
  where member.user_id = p_user_id
    and member.status = 'active'
    and company.status = 'active'
  order by company.created_at, company.id;
end;
$$;

revoke all on function public.list_app_companies_v1(uuid, text)
  from public, anon, authenticated;
grant execute on function public.list_app_companies_v1(uuid, text)
  to service_role;

commit;
