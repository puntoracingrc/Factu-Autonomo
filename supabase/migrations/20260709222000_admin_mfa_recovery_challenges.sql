create table if not exists public.admin_mfa_recovery_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  code_hash text not null,
  attempts integer not null default 0,
  email text not null
);

create index if not exists admin_mfa_recovery_challenges_user_created_idx
  on public.admin_mfa_recovery_challenges (user_id, created_at desc);

create index if not exists admin_mfa_recovery_challenges_active_idx
  on public.admin_mfa_recovery_challenges (user_id, expires_at desc)
  where used_at is null;

alter table public.admin_mfa_recovery_challenges enable row level security;

revoke all on table public.admin_mfa_recovery_challenges from public, anon, authenticated;
grant all on table public.admin_mfa_recovery_challenges to service_role;
