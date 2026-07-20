begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  name text not null check (char_length(name) between 1 and 60),
  kind text not null default 'unknown'
    check (kind in ('computer', 'mobile', 'tablet', 'unknown')),
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_sync_at timestamptz,
  revoked_at timestamptz,
  unique (user_id, token_hash)
);

create index if not exists user_devices_user_status_idx
  on public.user_devices (user_id, status, last_seen_at desc);

alter table public.user_devices enable row level security;
revoke all on table public.user_devices from public, anon, authenticated;
grant all on table public.user_devices to service_role;

create or replace function public.cloud_device_limit_for_user(
  p_user_id uuid,
  p_now timestamptz default now()
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when subscription.plan in ('pro', 'pro_plus')
        and subscription.status in ('active', 'trialing')
        and (
          subscription.current_period_end is null
          or subscription.current_period_end >= p_now
        )
        then case when subscription.plan = 'pro_plus' then 5 else 2 end
      when subscription.promotional_plan in ('pro', 'pro_plus')
        and subscription.promotional_plan_ends_at >= p_now
        then case
          when subscription.promotional_plan = 'pro_plus' then 5
          else 2
        end
      when (subscription.plan = 'trial' or subscription.status = 'trialing')
        and subscription.trial_ends_at >= p_now
        then 2
      else 0
    end
    from public.user_subscriptions as subscription
    where subscription.user_id = p_user_id
  ), 0);
$$;

create or replace function public.cloud_device_token_hash(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest('factu-cloud-device-v1:' || p_token, 'sha256'),
    'hex'
  );
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

create or replace function public.enforce_cloud_device_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  device_limit integer;
  active_devices integer;
begin
  if new.status <> 'active' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'active' then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text, 0)
  );
  device_limit := public.cloud_device_limit_for_user(new.user_id);
  if device_limit <= 0 then
    raise exception 'cloud_not_in_plan' using errcode = 'P0001';
  end if;

  select count(*)::integer
  into active_devices
  from public.user_devices as device
  where device.user_id = new.user_id
    and device.status = 'active'
    and device.id <> new.id;

  if active_devices >= device_limit then
    raise exception 'cloud_device_limit_reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_cloud_device_limit_trigger
  on public.user_devices;
create trigger enforce_cloud_device_limit_trigger
  before insert or update of status on public.user_devices
  for each row execute function public.enforce_cloud_device_limit();

drop policy if exists "Leer copia propia" on public.user_backups;
create policy "Leer copia propia"
  on public.user_backups for select to authenticated
  using (
    (select auth.uid()) = user_id
    and (select public.cloud_device_access_allowed())
  );

drop policy if exists "Crear copia propia" on public.user_backups;
create policy "Crear copia propia"
  on public.user_backups for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select public.cloud_device_access_allowed())
  );

drop policy if exists "Actualizar copia propia" on public.user_backups;
create policy "Actualizar copia propia"
  on public.user_backups for update to authenticated
  using (
    (select auth.uid()) = user_id
    and (select public.cloud_device_access_allowed())
  )
  with check (
    (select auth.uid()) = user_id
    and (select public.cloud_device_access_allowed())
  );

drop policy if exists "Leer entidades propias" on public.sync_entities;
create policy "Leer entidades propias"
  on public.sync_entities for select to authenticated
  using (
    (select auth.uid()) = user_id
    and (select public.cloud_device_access_allowed())
  );

drop policy if exists "Crear entidades propias" on public.sync_entities;
create policy "Crear entidades propias"
  on public.sync_entities for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select public.cloud_device_access_allowed())
  );

drop policy if exists "Actualizar entidades propias" on public.sync_entities;
create policy "Actualizar entidades propias"
  on public.sync_entities for update to authenticated
  using (
    (select auth.uid()) = user_id
    and (select public.cloud_device_access_allowed())
  )
  with check (
    (select auth.uid()) = user_id
    and (select public.cloud_device_access_allowed())
  );

revoke all on function public.cloud_device_limit_for_user(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.cloud_device_limit_for_user(uuid, timestamptz)
  to service_role;
revoke all on function public.cloud_device_token_hash(text)
  from public, anon, authenticated;
grant execute on function public.cloud_device_token_hash(text)
  to service_role;
revoke all on function public.cloud_device_access_allowed()
  from public, anon;
grant execute on function public.cloud_device_access_allowed()
  to authenticated, service_role;
revoke all on function public.enforce_cloud_device_limit()
  from public, anon, authenticated;

comment on table public.user_devices is
  'Registro privado de dispositivos de nube. Solo conserva un hash del token local.';

commit;
