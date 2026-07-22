begin;

alter table public.app_error_events
  add column if not exists resolution_source text,
  add column if not exists archived_at timestamptz,
  add column if not exists device_scope_hash text;

update public.app_error_events
set
  resolution_source = coalesce(resolution_source, 'admin_manual_legacy'),
  archived_at = coalesce(archived_at, resolved_at)
where resolved_at is not null;

alter table public.app_error_events
  drop constraint if exists app_error_events_resolution_source_v1,
  add constraint app_error_events_resolution_source_v1 check (
    resolution_source is null
    or resolution_source in (
      'admin_manual_legacy',
      'sync_push_verified',
      'sync_cycle_verified',
      'cloud_repair_verified'
    )
  ),
  drop constraint if exists app_error_events_resolution_requires_time_v1,
  add constraint app_error_events_resolution_requires_time_v1 check (
    (resolution_source is null and resolved_at is null)
    or (resolution_source is not null and resolved_at is not null)
  ),
  drop constraint if exists app_error_events_archive_requires_resolution_v1,
  add constraint app_error_events_archive_requires_resolution_v1 check (
    archived_at is null or resolved_at is not null
  ),
  drop constraint if exists app_error_events_device_scope_hash_v1,
  add constraint app_error_events_device_scope_hash_v1 check (
    device_scope_hash is null or device_scope_hash ~ '^[0-9a-f]{64}$'
  );

create index if not exists app_error_events_open_sync_idx
  on public.app_error_events (
    user_id,
    device_scope_hash,
    area,
    code,
    created_at desc
  )
  where resolved_at is null;

alter table public.app_error_events enable row level security;
revoke all on table public.app_error_events from public, anon, authenticated;
grant all on table public.app_error_events to service_role;

create or replace function public.archive_resolved_app_error_events_v1(
  p_event_ids uuid[]
)
returns table (
  id uuid,
  resolved_at timestamptz,
  archived_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_archived_at timestamptz := statement_timestamp();
  v_eligible_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  if p_event_ids is null
    or cardinality(p_event_ids) < 1
    or cardinality(p_event_ids) > 100
  then
    return;
  end if;

  perform 1
  from public.app_error_events as event
  where event.id = any (p_event_ids)
  order by event.id
  for update;

  select count(*)
  into v_eligible_count
  from public.app_error_events as event
  where event.id = any (p_event_ids)
    and event.area <> 'fiscal_watch_review'
    and event.resolved_at is not null
    and event.archived_at is null;

  if v_eligible_count <> cardinality(p_event_ids) then
    return;
  end if;

  return query
  update public.app_error_events as event
  set archived_at = v_archived_at
  where event.id = any (p_event_ids)
  returning event.id, event.resolved_at, event.archived_at;
end;
$function$;

revoke all on function public.archive_resolved_app_error_events_v1(uuid[])
  from public, anon, authenticated;
grant execute on function public.archive_resolved_app_error_events_v1(uuid[])
  to service_role;

commit;
