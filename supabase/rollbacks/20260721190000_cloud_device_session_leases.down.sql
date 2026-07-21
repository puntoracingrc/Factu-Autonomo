begin;

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
  device_token text;
  device_limit integer;
begin
  if current_user_id is null then
    return false;
  end if;

  device_token := btrim(coalesce(request_headers ->> 'x-factu-device-token', ''));
  if char_length(device_token) < 32 or char_length(device_token) > 256 then
    return false;
  end if;

  device_limit := public.cloud_device_limit_for_user(current_user_id);
  if device_limit <= 0 then
    return false;
  end if;

  return exists (
    select 1
    from (
      select device.token_hash
      from public.user_devices as device
      where device.user_id = current_user_id
        and device.status = 'active'
      order by device.last_seen_at desc, device.created_at desc, device.id desc
      limit device_limit
    ) as allowed_device
    where allowed_device.token_hash = public.cloud_device_token_hash(device_token)
  );
end;
$$;

revoke all on function public.cloud_device_access_allowed()
  from public, anon;
grant execute on function public.cloud_device_access_allowed()
  to authenticated, service_role;

drop function if exists public.release_cloud_device_session(uuid, text, text);
drop function if exists public.claim_cloud_device_session(uuid, text, text);
drop function if exists public.cloud_device_session_hash(text);

alter table public.user_devices
  drop constraint if exists user_devices_session_lease_pair_check,
  drop constraint if exists user_devices_active_session_hash_check,
  drop column if exists session_binding_required_at,
  drop column if exists session_lease_expires_at,
  drop column if exists active_session_hash;

commit;
