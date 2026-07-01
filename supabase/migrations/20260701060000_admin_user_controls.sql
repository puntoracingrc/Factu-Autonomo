create table if not exists public.admin_user_controls (
  user_id uuid primary key references auth.users (id) on delete cascade,
  banned_at timestamptz,
  ban_reason text,
  admin_notes text,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.admin_user_controls enable row level security;

