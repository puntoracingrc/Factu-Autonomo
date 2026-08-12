-- FINALIZE_LEGACY_SYNC_RETIREMENT_V1
-- Apply only after the application version that no longer reads or writes the
-- generic synchronizer is serving the production domain.

begin;

do $$
begin
  if to_regclass('public.workspace_auxiliary_entities') is null
    or to_regclass('public.expense_inbox_aliases') is null
    or to_regclass('public.expense_inbox_items') is null
    or to_regclass('public.expense_inbox_alias_history') is null
  then
    raise exception 'LEGACY_SYNC_RETIREMENT_PREPARATION_REQUIRED';
  end if;
end;
$$;

drop function if exists public.admin_health_snapshot();
drop trigger if exists sync_entities_central_cutover_guard_biu_v1
  on public.sync_entities;
drop function if exists public.guard_central_cutover_legacy_sync_write_v1();

alter table public.sync_entities rename to legacy_sync_entities_archive;
alter table public.user_backups rename to legacy_user_backups_archive;

drop policy if exists "Leer entidades propias" on public.legacy_sync_entities_archive;
drop policy if exists "Crear entidades propias" on public.legacy_sync_entities_archive;
drop policy if exists "Actualizar entidades propias" on public.legacy_sync_entities_archive;
drop policy if exists sync_entities_central_cutover_guard_v1
  on public.legacy_sync_entities_archive;
revoke all on table public.legacy_sync_entities_archive
  from public, anon, authenticated, service_role;
grant select on table public.legacy_sync_entities_archive to service_role;

drop policy if exists "Leer copia propia" on public.legacy_user_backups_archive;
drop policy if exists "Crear copia propia" on public.legacy_user_backups_archive;
drop policy if exists "Actualizar copia propia" on public.legacy_user_backups_archive;
revoke all on table public.legacy_user_backups_archive
  from public, anon, authenticated, service_role;
grant select on table public.legacy_user_backups_archive to service_role;

comment on table public.legacy_sync_entities_archive is
  'FINALIZE_LEGACY_SYNC_RETIREMENT_V1 cold read-only archive. Never used by application runtime.';
comment on table public.legacy_user_backups_archive is
  'FINALIZE_LEGACY_SYNC_RETIREMENT_V1 cold read-only archive of the superseded full-browser backups.';

commit;
