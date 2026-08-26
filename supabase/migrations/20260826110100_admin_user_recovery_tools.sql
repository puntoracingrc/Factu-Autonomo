create table if not exists public.admin_user_recovery_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_id text not null check (
    tool_id in (
      'local_backup_restore',
      'expense_allocation_repair',
      'legacy_import_repair',
      'issued_document_recovery'
    )
  ),
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  reason text not null check (
    char_length(btrim(reason)) between 3 and 500
  ),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  revocation_reason text check (
    revocation_reason is null
    or char_length(btrim(revocation_reason)) between 3 and 500
  ),
  constraint admin_user_recovery_grants_expiry_check
    check (expires_at > granted_at),
  constraint admin_user_recovery_grants_revocation_check
    check (
      (revoked_at is null and revoked_by is null)
      or revoked_at is not null
    )
);

create index if not exists admin_user_recovery_grants_user_expiry_idx
  on public.admin_user_recovery_grants (user_id, expires_at desc);

create index if not exists admin_user_recovery_grants_user_tool_granted_idx
  on public.admin_user_recovery_grants (user_id, tool_id, granted_at desc);

create index if not exists admin_user_recovery_grants_granted_by_idx
  on public.admin_user_recovery_grants (granted_by);

create index if not exists admin_user_recovery_grants_revoked_by_idx
  on public.admin_user_recovery_grants (revoked_by);

alter table public.admin_user_recovery_grants enable row level security;

revoke all on table public.admin_user_recovery_grants
  from public, anon, authenticated;

grant select, insert, update
  on table public.admin_user_recovery_grants
  to service_role;
