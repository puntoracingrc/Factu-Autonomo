begin;

-- Applied after the company-aware server is live. This closes the temporary
-- compatibility window and makes direct RLS checks use the same company scope
-- as every server route.
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
  v_device_scope_id uuid;
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
    v_device_scope_id := p_data_owner_id;
  elsif v_company_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_company_id := v_company_id_text::uuid;
    select company.data_owner_id
    into v_device_scope_id
    from public.app_companies as company
    join public.app_company_members as member
      on member.company_id = company.id
    where company.id = v_company_id
      and company.data_owner_id = p_data_owner_id
      and company.status = 'active'
      and member.user_id = v_actor_user_id
      and member.status = 'active';
    if v_device_scope_id is null then return false; end if;
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
    v_device_scope_id,
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
      where device.user_id = v_device_scope_id
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

revoke all on function public.app_company_cloud_access_allowed_v1(uuid)
  from public, anon;
grant execute on function public.app_company_cloud_access_allowed_v1(uuid)
  to authenticated, service_role;

commit;
