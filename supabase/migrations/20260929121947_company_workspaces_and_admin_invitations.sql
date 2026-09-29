begin;

create table if not exists public.app_companies (
  id uuid primary key default gen_random_uuid(),
  data_owner_id uuid not null unique,
  billing_owner_user_id uuid not null references auth.users(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint app_companies_name_v1 check (
    char_length(btrim(name)) between 1 and 120
    and name = btrim(name)
  ),
  constraint app_companies_status_v1 check (status in ('active', 'archived'))
);

create table if not exists public.app_company_members (
  company_id uuid not null references public.app_companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null,
  status text not null default 'active',
  added_by uuid not null references auth.users(id) on delete restrict,
  joined_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (company_id, user_id),
  constraint app_company_members_email_v1 check (
    email = lower(btrim(email))
    and char_length(email) between 3 and 254
    and position('@' in email) > 1
  ),
  constraint app_company_members_role_v1 check (role in ('owner', 'admin')),
  constraint app_company_members_status_v1 check (status in ('active', 'revoked'))
);

create index if not exists app_company_members_user_idx
  on public.app_company_members (user_id, status, company_id);

create table if not exists public.app_company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  email text not null,
  role text not null default 'admin',
  status text not null default 'pending',
  invited_by uuid not null references auth.users(id) on delete restrict,
  invited_at timestamptz not null default statement_timestamp(),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  constraint app_company_invitations_email_v1 check (
    email = lower(btrim(email))
    and char_length(email) between 3 and 254
    and position('@' in email) > 1
  ),
  constraint app_company_invitations_role_v1 check (role = 'admin'),
  constraint app_company_invitations_status_v1 check (
    status in ('pending', 'accepted', 'revoked')
  ),
  constraint app_company_invitations_acceptance_v1 check (
    (status = 'accepted' and accepted_by is not null and accepted_at is not null)
    or status <> 'accepted'
  ),
  unique (company_id, email)
);

create index if not exists app_company_invitations_email_idx
  on public.app_company_invitations (email, status, company_id);

create table if not exists public.app_company_access_audit (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.app_companies(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null,
  target_email text,
  target_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  constraint app_company_access_audit_event_v1 check (
    event_type in (
      'company_created',
      'company_renamed',
      'invitation_created',
      'invitation_accepted',
      'invitation_revoked',
      'member_revoked'
    )
  )
);

create index if not exists app_company_access_audit_company_idx
  on public.app_company_access_audit (company_id, created_at desc, id desc);

alter table public.app_companies enable row level security;
alter table public.app_company_members enable row level security;
alter table public.app_company_invitations enable row level security;
alter table public.app_company_access_audit enable row level security;

revoke all on table public.app_companies
  from public, anon, authenticated, service_role;
revoke all on table public.app_company_members
  from public, anon, authenticated, service_role;
revoke all on table public.app_company_invitations
  from public, anon, authenticated, service_role;
revoke all on table public.app_company_access_audit
  from public, anon, authenticated, service_role;

grant select, insert, update on table public.app_companies to service_role;
grant select, insert, update, delete on table public.app_company_members to service_role;
grant select, insert, update, delete on table public.app_company_invitations to service_role;
grant select, insert on table public.app_company_access_audit to service_role;

-- Existing central tables historically used auth.users.id as the tenant key.
-- A company workspace keeps the same UUID-shaped key without pretending that
-- every company is an authentication identity.
alter table if exists public.central_business_entities
  drop constraint if exists central_business_entities_user_id_fkey;
alter table if exists public.central_business_commands
  drop constraint if exists central_business_commands_user_id_fkey;
alter table if exists public.central_business_outbox
  drop constraint if exists central_business_outbox_user_id_fkey;
alter table if exists public.central_business_bootstraps
  drop constraint if exists central_business_bootstraps_user_id_fkey;
alter table if exists public.central_business_document_series
  drop constraint if exists central_business_document_series_user_id_fkey;
alter table if exists public.central_business_document_series_reconciliations
  drop constraint if exists central_business_document_series_reconciliations_user_id_fkey;
alter table if exists public.central_authority_cutovers
  drop constraint if exists central_authority_cutovers_user_id_fkey;
alter table if exists public.workspace_auxiliary_entities
  drop constraint if exists workspace_auxiliary_entities_user_id_fkey;
alter table if exists public.expense_inbox_aliases
  drop constraint if exists expense_inbox_aliases_user_id_fkey;
alter table if exists public.expense_inbox_items
  drop constraint if exists expense_inbox_items_user_id_fkey;
alter table if exists public.expense_inbox_alias_history
  drop constraint if exists expense_inbox_alias_history_user_id_fkey;
alter table if exists public.central_workspace_historical_archives
  drop constraint if exists central_workspace_historical_archives_user_id_fkey;
alter table if exists public.verifactu_certificate_bindings
  drop constraint if exists verifactu_certificate_bindings_user_id_fkey;
alter table if exists public.verifactu_certificate_binding_audit
  drop constraint if exists verifactu_certificate_binding_audit_user_id_fkey;
alter table if exists public.central_verifactu_chain_state
  drop constraint if exists central_verifactu_chain_state_user_id_fkey;
alter table if exists public.central_verifactu_records
  drop constraint if exists central_verifactu_records_user_id_fkey;
alter table if exists public.central_verifactu_transport_attempts
  drop constraint if exists central_verifactu_transport_attempts_user_id_fkey;

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
    on conflict (company_id, user_id) do update
      set role = excluded.role,
          email = excluded.email,
          status = 'active',
          added_by = excluded.added_by,
          updated_at = statement_timestamp();

    update public.app_company_invitations
    set status = 'accepted',
        accepted_by = p_user_id,
        accepted_at = statement_timestamp(),
        revoked_at = null
    where company_id = v_company_id
      and email = v_email
      and status = 'pending';

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
    on conflict (company_id, user_id) do update
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

create or replace function public.create_app_company_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_name text
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
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_actor_email, '')));
  v_company_id uuid := gen_random_uuid();
  v_company public.app_companies%rowtype;
begin
  if v_role <> 'service_role' then
    raise exception 'create_app_company_v1 requires service_role'
      using errcode = '42501';
  end if;
  if p_actor_user_id is null
    or char_length(v_name) not between 1 and 120
    or char_length(v_email) not between 3 and 254
    or position('@' in v_email) <= 1
  then
    raise exception 'invalid company name' using errcode = '22023';
  end if;

  insert into public.app_companies (
    id,
    data_owner_id,
    billing_owner_user_id,
    created_by,
    name
  ) values (
    v_company_id,
    v_company_id,
    p_actor_user_id,
    p_actor_user_id,
    v_name
  )
  returning * into v_company;

  insert into public.app_company_members (
    company_id,
    user_id,
    email,
    role,
    status,
    added_by
  ) values (
    v_company.id,
    p_actor_user_id,
    v_email,
    'owner',
    'active',
    p_actor_user_id
  );

  insert into public.app_company_access_audit (
    company_id,
    actor_user_id,
    event_type,
    target_user_id
  ) values (
    v_company.id,
    p_actor_user_id,
    'company_created',
    p_actor_user_id
  );

  return query select
    v_company.id,
    v_company.data_owner_id,
    v_company.billing_owner_user_id,
    v_company.name,
    'owner'::text,
    v_company.created_at;
end;
$$;

create or replace function public.rename_app_company_v1(
  p_actor_user_id uuid,
  p_company_id uuid,
  p_name text
)
returns boolean
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
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_role <> 'service_role' then
    raise exception 'rename_app_company_v1 requires service_role'
      using errcode = '42501';
  end if;
  if char_length(v_name) not between 1 and 120 then
    raise exception 'invalid company name' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.app_company_members as member
    where member.company_id = p_company_id
      and member.user_id = p_actor_user_id
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  ) then
    raise exception 'company access denied' using errcode = '42501';
  end if;

  update public.app_companies
  set name = v_name,
      updated_at = statement_timestamp()
  where id = p_company_id
    and status = 'active';
  if not found then
    raise exception 'company not found' using errcode = 'P0002';
  end if;

  insert into public.app_company_access_audit (
    company_id,
    actor_user_id,
    event_type
  ) values (p_company_id, p_actor_user_id, 'company_renamed');
  return true;
end;
$$;

create or replace function public.invite_app_company_admin_v1(
  p_actor_user_id uuid,
  p_company_id uuid,
  p_email text
)
returns table (
  invitation_id uuid,
  invitation_email text,
  invitation_status text
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
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_invitation public.app_company_invitations%rowtype;
begin
  if v_role <> 'service_role' then
    raise exception 'invite_app_company_admin_v1 requires service_role'
      using errcode = '42501';
  end if;
  if char_length(v_email) not between 3 and 254 or position('@' in v_email) <= 1 then
    raise exception 'invalid invitation email' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.app_company_members as member
    where member.company_id = p_company_id
      and member.user_id = p_actor_user_id
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  ) then
    raise exception 'company access denied' using errcode = '42501';
  end if;
  if exists (
    select 1
    from public.app_company_members as member
    where member.company_id = p_company_id
      and member.email = v_email
      and member.status = 'active'
  ) then
    raise exception 'company member already active' using errcode = '23505';
  end if;

  insert into public.app_company_invitations (
    company_id,
    email,
    role,
    status,
    invited_by,
    invited_at,
    accepted_by,
    accepted_at,
    revoked_at
  ) values (
    p_company_id,
    v_email,
    'admin',
    'pending',
    p_actor_user_id,
    statement_timestamp(),
    null,
    null,
    null
  )
  on conflict (company_id, email) do update
    set role = 'admin',
        status = case
          when public.app_company_invitations.status = 'accepted'
            then 'accepted'
          else 'pending'
        end,
        invited_by = excluded.invited_by,
        invited_at = case
          when public.app_company_invitations.status = 'accepted'
            then public.app_company_invitations.invited_at
          else statement_timestamp()
        end,
        accepted_by = case
          when public.app_company_invitations.status = 'accepted'
            then public.app_company_invitations.accepted_by
          else null
        end,
        accepted_at = case
          when public.app_company_invitations.status = 'accepted'
            then public.app_company_invitations.accepted_at
          else null
        end,
        revoked_at = null
  returning * into v_invitation;

  insert into public.app_company_access_audit (
    company_id,
    actor_user_id,
    event_type,
    target_email
  ) values (
    p_company_id,
    p_actor_user_id,
    'invitation_created',
    v_email
  );

  return query select v_invitation.id, v_invitation.email, v_invitation.status;
end;
$$;

create or replace function public.revoke_app_company_invitation_v1(
  p_actor_user_id uuid,
  p_company_id uuid,
  p_invitation_id uuid
)
returns boolean
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
  v_email text;
begin
  if v_role <> 'service_role' then
    raise exception 'revoke_app_company_invitation_v1 requires service_role'
      using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.app_company_members as member
    where member.company_id = p_company_id
      and member.user_id = p_actor_user_id
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  ) then
    raise exception 'company access denied' using errcode = '42501';
  end if;

  update public.app_company_invitations
  set status = 'revoked',
      revoked_at = statement_timestamp()
  where id = p_invitation_id
    and company_id = p_company_id
    and status = 'pending'
  returning email into v_email;
  if v_email is null then
    raise exception 'pending invitation not found' using errcode = 'P0002';
  end if;

  insert into public.app_company_access_audit (
    company_id,
    actor_user_id,
    event_type,
    target_email
  ) values (
    p_company_id,
    p_actor_user_id,
    'invitation_revoked',
    v_email
  );
  return true;
end;
$$;

create or replace function public.revoke_app_company_admin_v1(
  p_actor_user_id uuid,
  p_company_id uuid,
  p_target_user_id uuid
)
returns boolean
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
begin
  if v_role <> 'service_role' then
    raise exception 'revoke_app_company_admin_v1 requires service_role'
      using errcode = '42501';
  end if;
  if p_actor_user_id = p_target_user_id then
    raise exception 'cannot revoke current member' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.app_company_members as member
    where member.company_id = p_company_id
      and member.user_id = p_actor_user_id
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  ) then
    raise exception 'company access denied' using errcode = '42501';
  end if;

  update public.app_company_members
  set status = 'revoked',
      updated_at = statement_timestamp()
  where company_id = p_company_id
    and user_id = p_target_user_id
    and role = 'admin'
    and status = 'active';
  if not found then
    raise exception 'active administrator not found' using errcode = 'P0002';
  end if;

  insert into public.app_company_access_audit (
    company_id,
    actor_user_id,
    event_type,
    target_user_id
  ) values (
    p_company_id,
    p_actor_user_id,
    'member_revoked',
    p_target_user_id
  );
  return true;
end;
$$;

create or replace function public.app_company_cloud_access_allowed_v1(
  p_data_owner_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := (select auth.uid());
  v_headers jsonb := coalesce(
    nullif(current_setting('request.headers', true), ''),
    '{}'
  )::jsonb;
  v_company_id_text text := btrim(coalesce(v_headers ->> 'x-factu-company-id', ''));
  v_company_id uuid;
  v_device_owner_user_id uuid;
  v_session_id text := btrim(coalesce((select auth.jwt() ->> 'session_id'), ''));
  v_session_hash text;
  v_device_token text;
  v_device_limit integer;
  v_now timestamptz := statement_timestamp();
begin
  if v_actor_user_id is null or p_data_owner_id is null then
    return false;
  end if;

  if v_company_id_text = '' then
    if p_data_owner_id <> v_actor_user_id then return false; end if;
    v_device_owner_user_id := v_actor_user_id;
  elsif v_company_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_company_id := v_company_id_text::uuid;
    select company.billing_owner_user_id
    into v_device_owner_user_id
    from public.app_companies as company
    join public.app_company_members as member
      on member.company_id = company.id
    where company.id = v_company_id
      and company.data_owner_id = p_data_owner_id
      and company.status = 'active'
      and member.user_id = v_actor_user_id
      and member.status = 'active';
    if v_device_owner_user_id is null then return false; end if;
  else
    return false;
  end if;

  v_device_token := btrim(coalesce(v_headers ->> 'x-factu-device-token', ''));
  if char_length(v_device_token) < 32 or char_length(v_device_token) > 256 then
    return false;
  end if;
  if v_session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_session_hash := public.cloud_device_session_hash(v_session_id);
  end if;

  v_device_limit := public.cloud_device_limit_for_user(
    v_device_owner_user_id,
    v_now
  );
  if v_device_limit <= 0 then return false; end if;

  return exists (
    select 1
    from (
      select
        device.token_hash,
        device.active_session_hash,
        device.session_lease_expires_at,
        device.session_binding_required_at
      from public.user_devices as device
      where device.user_id = v_device_owner_user_id
        and device.status = 'active'
      order by device.last_seen_at desc, device.created_at desc, device.id desc
      limit v_device_limit
    ) as allowed_device
    where allowed_device.token_hash = public.cloud_device_token_hash(v_device_token)
      and (
        (
          v_session_hash is not null
          and allowed_device.active_session_hash = v_session_hash
          and allowed_device.session_lease_expires_at > v_now
        )
        or (
          allowed_device.active_session_hash is null
          and allowed_device.session_binding_required_at > v_now
        )
      )
  );
end;
$$;

drop policy if exists workspace_auxiliary_entities_owner_select_v1
  on public.workspace_auxiliary_entities;
drop policy if exists workspace_auxiliary_entities_company_select_v1
  on public.workspace_auxiliary_entities;
create policy workspace_auxiliary_entities_company_select_v1
  on public.workspace_auxiliary_entities for select to authenticated
  using (public.app_company_cloud_access_allowed_v1(user_id));
drop policy if exists workspace_auxiliary_entities_owner_insert_v1
  on public.workspace_auxiliary_entities;
drop policy if exists workspace_auxiliary_entities_company_insert_v1
  on public.workspace_auxiliary_entities;
create policy workspace_auxiliary_entities_company_insert_v1
  on public.workspace_auxiliary_entities for insert to authenticated
  with check (public.app_company_cloud_access_allowed_v1(user_id));
drop policy if exists workspace_auxiliary_entities_owner_update_v1
  on public.workspace_auxiliary_entities;
drop policy if exists workspace_auxiliary_entities_company_update_v1
  on public.workspace_auxiliary_entities;
create policy workspace_auxiliary_entities_company_update_v1
  on public.workspace_auxiliary_entities for update to authenticated
  using (public.app_company_cloud_access_allowed_v1(user_id))
  with check (public.app_company_cloud_access_allowed_v1(user_id));

revoke all on function public.list_app_companies_v1(uuid, text)
  from public, anon, authenticated;
revoke all on function public.create_app_company_v1(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.rename_app_company_v1(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.invite_app_company_admin_v1(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.revoke_app_company_invitation_v1(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.revoke_app_company_admin_v1(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.app_company_cloud_access_allowed_v1(uuid)
  from public, anon;

grant execute on function public.list_app_companies_v1(uuid, text) to service_role;
grant execute on function public.create_app_company_v1(uuid, text, text) to service_role;
grant execute on function public.rename_app_company_v1(uuid, uuid, text) to service_role;
grant execute on function public.invite_app_company_admin_v1(uuid, uuid, text) to service_role;
grant execute on function public.revoke_app_company_invitation_v1(uuid, uuid, uuid) to service_role;
grant execute on function public.revoke_app_company_admin_v1(uuid, uuid, uuid) to service_role;
grant execute on function public.app_company_cloud_access_allowed_v1(uuid)
  to authenticated, service_role;

comment on table public.app_companies is
  'Espacios de empresa privados. data_owner_id conserva el aislamiento existente de los datos centrales.';
comment on table public.app_company_members is
  'Membresias privadas de propietarios y administradores con acceso operativo total.';
comment on table public.app_company_invitations is
  'Invitaciones por correo verificado. Se aceptan al iniciar sesion con la misma direccion.';

commit;
