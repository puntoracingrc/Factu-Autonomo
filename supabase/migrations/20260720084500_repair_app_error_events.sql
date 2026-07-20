-- Production repair for the sanitized support/error sink. This migration is
-- intentionally idempotent because older projects may already have the table.
create table if not exists public.app_error_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  severity text not null default 'error' check (severity in ('info', 'warning', 'error')),
  area text not null,
  code text,
  message text not null,
  route text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists app_error_events_user_created_idx
  on public.app_error_events (user_id, created_at desc);

create index if not exists app_error_events_created_idx
  on public.app_error_events (created_at desc);

alter table public.app_error_events enable row level security;
revoke all on table public.app_error_events from public, anon, authenticated;
grant all on table public.app_error_events to service_role;
