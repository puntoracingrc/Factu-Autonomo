-- CENTRAL_AUTHORITY_LEGACY_SYNC_CUTOVER_V1
-- Makes an explicit central-authority cutover one-way for the legacy browser
-- synchronizer while retaining its rows as cold rollback and audit evidence.

begin;

create table if not exists public.central_authority_cutovers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  legacy_sync_state text not null default 'active',
  authority_contract_version integer not null,
  backup_sha256 text not null,
  backup_size_bytes bigint not null,
  verified_entity_count integer not null,
  retired_queue_entry_count integer not null,
  source_revision text not null,
  activated_at timestamptz not null default statement_timestamp(),
  rolled_back_at timestamptz,
  constraint central_authority_cutovers_state_v1 check (
    legacy_sync_state in ('active', 'rolled_back')
  ),
  constraint central_authority_cutovers_contract_version_v1 check (
    authority_contract_version > 0
  ),
  constraint central_authority_cutovers_backup_v1 check (
    backup_sha256 ~ '^[0-9a-f]{64}$'
    and backup_size_bytes > 0
  ),
  constraint central_authority_cutovers_counts_v1 check (
    verified_entity_count >= 0
    and retired_queue_entry_count >= 0
  ),
  constraint central_authority_cutovers_revision_v1 check (
    source_revision ~ '^[0-9a-f]{40}$'
  ),
  constraint central_authority_cutovers_rollback_v1 check (
    (
      legacy_sync_state = 'active'
      and rolled_back_at is null
    )
    or (
      legacy_sync_state = 'rolled_back'
      and rolled_back_at is not null
      and rolled_back_at >= activated_at
    )
  )
);

alter table public.central_authority_cutovers enable row level security;

revoke all on table public.central_authority_cutovers
  from public, anon, authenticated;
grant select on table public.central_authority_cutovers to authenticated;
grant all on table public.central_authority_cutovers to service_role;

drop policy if exists central_authority_cutovers_owner_select_v1
  on public.central_authority_cutovers;
create policy central_authority_cutovers_owner_select_v1
  on public.central_authority_cutovers
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.guard_central_cutover_legacy_sync_write_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_new_cutover_active boolean;
  v_old_cutover_active boolean := false;
begin
  select exists (
    select 1
    from public.central_authority_cutovers as cutover
    where cutover.user_id = new.user_id
      and cutover.legacy_sync_state = 'active'
  ) into v_new_cutover_active;

  if tg_op = 'UPDATE' then
    select exists (
      select 1
      from public.central_authority_cutovers as cutover
      where cutover.user_id = old.user_id
        and cutover.legacy_sync_state = 'active'
    ) into v_old_cutover_active;
  end if;

  if (
    v_new_cutover_active
    and new.entity_type not in (
      'document_retirement_batch',
      'expense_inbox_alias',
      'expense_inbox_alias_history',
      'expense_inbox_item',
      'fiscal_notifications_workspace'
    )
  ) or (
    v_old_cutover_active
    and old.entity_type not in (
      'document_retirement_batch',
      'expense_inbox_alias',
      'expense_inbox_alias_history',
      'expense_inbox_item',
      'fiscal_notifications_workspace'
    )
  ) then
    raise exception using
      errcode = 'P4201',
      message = 'legacy sync write retired after central authority cutover';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_central_cutover_legacy_sync_write_v1()
  from public, anon, authenticated;
grant execute on function public.guard_central_cutover_legacy_sync_write_v1()
  to service_role;

drop trigger if exists sync_entities_central_cutover_guard_biu_v1
  on public.sync_entities;
create trigger sync_entities_central_cutover_guard_biu_v1
  before insert or update on public.sync_entities
  for each row
  execute function public.guard_central_cutover_legacy_sync_write_v1();

drop policy if exists sync_entities_central_cutover_guard_v1
  on public.sync_entities;
create policy sync_entities_central_cutover_guard_v1
  on public.sync_entities
  as restrictive
  for all
  to authenticated
  using (
    entity_type in (
      'document_retirement_batch',
      'expense_inbox_alias',
      'expense_inbox_alias_history',
      'expense_inbox_item',
      'fiscal_notifications_workspace'
    )
    or not exists (
      select 1
      from public.central_authority_cutovers as cutover
      where cutover.user_id = sync_entities.user_id
        and cutover.legacy_sync_state = 'active'
    )
  )
  with check (
    entity_type in (
      'document_retirement_batch',
      'expense_inbox_alias',
      'expense_inbox_alias_history',
      'expense_inbox_item',
      'fiscal_notifications_workspace'
    )
    or not exists (
      select 1
      from public.central_authority_cutovers as cutover
      where cutover.user_id = sync_entities.user_id
        and cutover.legacy_sync_state = 'active'
    )
  );

comment on table public.central_authority_cutovers is
  'Operational evidence and rollback switch for accounts that retired generic sync_entities after adopting central authority.';
comment on function public.guard_central_cutover_legacy_sync_write_v1() is
  'CENTRAL_AUTHORITY_LEGACY_SYNC_CUTOVER_V1 rejects generic legacy writes after an explicit per-owner cutover while preserving auxiliary services.';

commit;
