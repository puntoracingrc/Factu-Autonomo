create table if not exists public.admin_user_restore_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  label text not null,
  reason text,
  source text not null default 'admin_manual' check (
    source in ('admin_manual', 'pre_restore_safety')
  ),
  data jsonb not null,
  summary jsonb not null default '{}'::jsonb
);

create index if not exists admin_user_restore_points_user_created_idx
  on public.admin_user_restore_points (user_id, created_at desc);

create table if not exists public.admin_user_restore_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  restore_point_id uuid references public.admin_user_restore_points (id)
    on delete set null,
  safety_restore_point_id uuid references public.admin_user_restore_points (id)
    on delete set null,
  restored_by uuid references auth.users (id) on delete set null,
  restored_at timestamptz not null default now(),
  diff_summary jsonb not null default '{}'::jsonb,
  note text
);

create index if not exists admin_user_restore_events_user_restored_idx
  on public.admin_user_restore_events (user_id, restored_at desc);

alter table public.admin_user_restore_points enable row level security;
alter table public.admin_user_restore_events enable row level security;

revoke all on table public.admin_user_restore_points from anon, authenticated;
revoke all on table public.admin_user_restore_events from anon, authenticated;

grant all on table public.admin_user_restore_points to service_role;
grant all on table public.admin_user_restore_events to service_role;
