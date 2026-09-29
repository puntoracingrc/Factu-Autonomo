begin;

alter table public.app_company_access_audit
  add column if not exists source_company_id uuid
    references public.app_companies(id) on delete restrict;

alter table public.app_company_access_audit
  drop constraint if exists app_company_access_audit_event_v1,
  add constraint app_company_access_audit_event_v1 check (
    event_type in (
      'company_created',
      'company_cloned',
      'company_renamed',
      'invitation_created',
      'invitation_accepted',
      'invitation_revoked',
      'member_revoked'
    )
  ),
  drop constraint if exists app_company_access_audit_clone_source_v1,
  add constraint app_company_access_audit_clone_source_v1 check (
    (event_type = 'company_cloned' and source_company_id is not null)
    or (event_type <> 'company_cloned' and source_company_id is null)
  );

create or replace function public.create_app_company_from_source_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_actor_session_hash text,
  p_name text,
  p_source_company_id uuid,
  p_profile_payload jsonb,
  p_profile_content_hash text,
  p_profile_idempotency_key_hash text,
  p_profile_request_hash text
)
returns table (
  company_id uuid,
  data_owner_id uuid,
  billing_owner_user_id uuid,
  company_name text,
  member_role text,
  company_created_at timestamptz,
  copied_customers integer,
  copied_suppliers integer,
  copied_products integer,
  copied_profile boolean
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
  v_source_owner_id uuid;
  v_company public.app_companies%rowtype;
  v_source_entity public.central_business_entities%rowtype;
  v_copied_customers integer := 0;
  v_copied_suppliers integer := 0;
  v_copied_products integer := 0;
  v_command_seed text;
begin
  if v_role <> 'service_role' then
    raise exception 'create_app_company_from_source_v1 requires service_role'
      using errcode = '42501';
  end if;
  if p_actor_user_id is null
    or p_source_company_id is null
    or char_length(v_name) not between 1 and 120
    or char_length(v_email) not between 3 and 254
    or position('@' in v_email) <= 1
    or coalesce(p_actor_session_hash, '') !~ '^[0-9a-f]{64}$'
    or pg_catalog.jsonb_typeof(p_profile_payload) <> 'object'
    or coalesce(p_profile_content_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_profile_idempotency_key_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_profile_request_hash, '') !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid company copy command' using errcode = '22023';
  end if;

  select company.data_owner_id
    into v_source_owner_id
    from public.app_companies as company
    join public.app_company_members as member
      on member.company_id = company.id
    where company.id = p_source_company_id
      and company.status = 'active'
      and member.user_id = p_actor_user_id
      and member.status = 'active'
      and member.role in ('owner', 'admin');
  if v_source_owner_id is null then
    raise exception 'source company access denied' using errcode = '42501';
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

  for v_source_entity in
    select entity.*
      from public.central_business_entities as entity
      where entity.user_id = v_source_owner_id
        and entity.entity_type in ('customer', 'supplier', 'product')
        and not entity.deleted
      order by entity.entity_type, entity.entity_id
  loop
    v_command_seed := concat_ws(
      ':',
      'company-copy-v1',
      p_source_company_id::text,
      v_company.id::text,
      v_source_entity.entity_type,
      v_source_entity.entity_id,
      v_source_entity.content_hash
    );

    perform * from public.mutate_central_business_entity_v1(
      v_company.data_owner_id,
      'company-copy',
      p_actor_session_hash,
      encode(extensions.digest(v_command_seed, 'sha256'), 'hex'),
      encode(
        extensions.digest('request:' || v_command_seed, 'sha256'),
        'hex'
      ),
      'upsert',
      v_source_entity.entity_type,
      v_source_entity.entity_id,
      0,
      v_source_entity.current_payload,
      v_source_entity.content_hash
    );

    if v_source_entity.entity_type = 'customer' then
      v_copied_customers := v_copied_customers + 1;
    elsif v_source_entity.entity_type = 'supplier' then
      v_copied_suppliers := v_copied_suppliers + 1;
    elsif v_source_entity.entity_type = 'product' then
      v_copied_products := v_copied_products + 1;
    end if;
  end loop;

  perform * from public.mutate_central_business_entity_v1(
    v_company.data_owner_id,
    'company-copy',
    p_actor_session_hash,
    p_profile_idempotency_key_hash,
    p_profile_request_hash,
    'upsert',
    'profile',
    'profile',
    0,
    p_profile_payload,
    p_profile_content_hash
  );

  insert into public.app_company_access_audit (
    company_id,
    actor_user_id,
    event_type,
    target_user_id,
    source_company_id
  ) values (
    v_company.id,
    p_actor_user_id,
    'company_cloned',
    p_actor_user_id,
    p_source_company_id
  );

  return query select
    v_company.id,
    v_company.data_owner_id,
    v_company.billing_owner_user_id,
    v_company.name,
    'owner'::text,
    v_company.created_at,
    v_copied_customers,
    v_copied_suppliers,
    v_copied_products,
    true;
end;
$$;

revoke all on function public.create_app_company_from_source_v1(
  uuid,
  text,
  text,
  text,
  uuid,
  jsonb,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.create_app_company_from_source_v1(
  uuid,
  text,
  text,
  text,
  uuid,
  jsonb,
  text,
  text,
  text
) to service_role;

comment on function public.create_app_company_from_source_v1(
  uuid,
  text,
  text,
  text,
  uuid,
  jsonb,
  text,
  text,
  text
) is
  'Creates an isolated company and atomically copies only active customers, suppliers, products and a server-sanitized reusable profile; accounting and fiscal history stay excluded.';

commit;
