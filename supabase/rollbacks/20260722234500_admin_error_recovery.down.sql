begin;

do $rollback$
begin
  if exists (
    select 1
    from public.app_error_events
    where resolution_source is not null
      and resolution_source <> 'admin_manual_legacy'
  ) or exists (
    select 1
    from public.app_error_events
    where archived_at is distinct from resolved_at
  ) or exists (
    select 1
    from public.app_error_events
    where device_scope_hash is not null
  ) then
    raise exception 'admin_error_recovery_has_runtime_data';
  end if;
end;
$rollback$;

drop index if exists public.app_error_events_open_sync_idx;
drop function if exists public.archive_resolved_app_error_events_v1(uuid[]);

alter table public.app_error_events
  drop constraint if exists app_error_events_device_scope_hash_v1,
  drop constraint if exists app_error_events_archive_requires_resolution_v1,
  drop constraint if exists app_error_events_resolution_requires_time_v1,
  drop constraint if exists app_error_events_resolution_source_v1,
  drop column if exists archived_at,
  drop column if exists resolution_source,
  drop column if exists device_scope_hash;

commit;
