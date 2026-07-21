begin;

alter table public.user_devices
  add column if not exists active_session_hash text,
  add column if not exists session_lease_expires_at timestamptz,
  add column if not exists session_binding_required_at timestamptz
    not null default (now() + interval '15 minutes');

alter table public.user_devices
  drop constraint if exists user_devices_active_session_hash_check,
  add constraint user_devices_active_session_hash_check
    check (
      active_session_hash is null
      or active_session_hash ~ '^[a-f0-9]{64}$'
    ),
  drop constraint if exists user_devices_session_lease_pair_check,
  add constraint user_devices_session_lease_pair_check
    check (
      (active_session_hash is null and session_lease_expires_at is null)
      or
      (active_session_hash is not null and session_lease_expires_at is not null)
    );

create or replace function public.cloud_device_session_hash(p_session_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest('factu-cloud-session-v1:' || p_session_id, 'sha256'),
    'hex'
  );
$$;

create or replace function public.claim_cloud_device_session(
  p_user_id uuid,
  p_token_hash text,
  p_session_hash text
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_device public.user_devices%rowtype;
  device_limit integer;
  lease_now timestamptz := statement_timestamp();
begin
  if p_user_id is null
    or p_token_hash is null
    or p_session_hash is null
    or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_session_hash !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_cloud_device_session_claim'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  device_limit := public.cloud_device_limit_for_user(p_user_id, lease_now);
  if device_limit <= 0 then
    return 'cloud_not_in_plan';
  end if;

  select device.*
  into current_device
  from public.user_devices as device
  where device.user_id = p_user_id
    and device.token_hash = p_token_hash
  for update;

  if not found then
    return 'device_missing';
  end if;
  if current_device.status <> 'active' then
    return 'device_revoked';
  end if;

  if not exists (
    select 1
    from (
      select device.id
      from public.user_devices as device
      where device.user_id = p_user_id
        and device.status = 'active'
      order by device.last_seen_at desc, device.created_at desc, device.id desc
      limit device_limit
    ) as allowed_device
    where allowed_device.id = current_device.id
  ) then
    return 'device_limit_reached';
  end if;

  if current_device.active_session_hash is not null
    and current_device.active_session_hash <> p_session_hash
    and current_device.session_lease_expires_at > lease_now
  then
    return 'session_conflict';
  end if;

  update public.user_devices
  set active_session_hash = p_session_hash,
      session_lease_expires_at = lease_now + interval '2 minutes',
      session_binding_required_at = lease_now
  where id = current_device.id;

  return 'claimed';
end;
$$;

create or replace function public.release_cloud_device_session(
  p_user_id uuid,
  p_token_hash text,
  p_session_hash text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_user_id is null
    or p_token_hash is null
    or p_session_hash is null
    or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_session_hash !~ '^[a-f0-9]{64}$'
  then
    return true;
  end if;

  update public.user_devices
  set active_session_hash = null,
      session_lease_expires_at = null,
      session_binding_required_at = statement_timestamp()
  where user_id = p_user_id
    and token_hash = p_token_hash
    and active_session_hash = p_session_hash;

  return true;
end;
$$;

create or replace function public.cloud_device_access_allowed()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  request_headers jsonb := coalesce(
    nullif(current_setting('request.headers', true), ''),
    '{}'
  )::jsonb;
  current_session_id text := btrim(
    coalesce((select auth.jwt() ->> 'session_id'), '')
  );
  current_session_hash text;
  device_token text;
  device_limit integer;
  access_now timestamptz := statement_timestamp();
begin
  if current_user_id is null then
    return false;
  end if;

  device_token := btrim(coalesce(request_headers ->> 'x-factu-device-token', ''));
  if char_length(device_token) < 32 or char_length(device_token) > 256 then
    return false;
  end if;

  if current_session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    current_session_hash := public.cloud_device_session_hash(current_session_id);
  end if;

  device_limit := public.cloud_device_limit_for_user(current_user_id, access_now);
  if device_limit <= 0 then
    return false;
  end if;

  return exists (
    select 1
    from (
      select
        device.token_hash,
        device.active_session_hash,
        device.session_lease_expires_at,
        device.session_binding_required_at
      from public.user_devices as device
      where device.user_id = current_user_id
        and device.status = 'active'
      order by device.last_seen_at desc, device.created_at desc, device.id desc
      limit device_limit
    ) as allowed_device
    where allowed_device.token_hash = public.cloud_device_token_hash(device_token)
      and (
        (
          current_session_hash is not null
          and allowed_device.active_session_hash = current_session_hash
          and allowed_device.session_lease_expires_at > access_now
        )
        or (
          allowed_device.active_session_hash is null
          and allowed_device.session_binding_required_at > access_now
        )
      )
  );
end;
$$;

revoke all on function public.cloud_device_session_hash(text)
  from public, anon, authenticated;
grant execute on function public.cloud_device_session_hash(text)
  to service_role;
revoke all on function public.claim_cloud_device_session(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_cloud_device_session(uuid, text, text)
  to service_role;
revoke all on function public.release_cloud_device_session(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.release_cloud_device_session(uuid, text, text)
  to service_role;
revoke all on function public.cloud_device_access_allowed()
  from public, anon;
grant execute on function public.cloud_device_access_allowed()
  to authenticated, service_role;

comment on column public.user_devices.active_session_hash is
  'SHA-256 de la sesion Supabase que posee temporalmente esta plaza; nunca session_id en claro.';
comment on column public.user_devices.session_binding_required_at is
  'Fin de la compatibilidad de despliegue; despues exige una concesion de sesion vigente.';

commit;
