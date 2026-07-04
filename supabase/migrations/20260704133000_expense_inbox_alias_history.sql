begin;

create table if not exists public.expense_inbox_alias_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  alias_token text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint expense_inbox_alias_history_token_check
    check (alias_token ~ '^[a-z0-9_-]{8,64}$'),
  constraint expense_inbox_alias_history_status_check
    check (status in ('active', 'retired'))
);

create unique index if not exists expense_inbox_alias_history_active_user_idx
  on public.expense_inbox_alias_history (user_id)
  where status = 'active';

create index if not exists expense_inbox_alias_history_user_status_idx
  on public.expense_inbox_alias_history (user_id, status, updated_at desc);

insert into public.expense_inbox_alias_history (
  user_id,
  alias_token,
  status,
  created_at,
  updated_at
)
select
  user_id,
  alias_token,
  case when active then 'active' else 'retired' end,
  created_at,
  updated_at
from public.expense_inbox_aliases
on conflict (alias_token) do nothing;

alter table public.expense_inbox_alias_history enable row level security;

drop policy if exists "Leer histórico de buzón propio"
  on public.expense_inbox_alias_history;
create policy "Leer histórico de buzón propio"
  on public.expense_inbox_alias_history
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.expense_inbox_alias_history from anon, authenticated;
grant select on table public.expense_inbox_alias_history to authenticated;
grant all on table public.expense_inbox_alias_history to service_role;

comment on table public.expense_inbox_alias_history is
  'Alias de buzón de gastos usados alguna vez. Evita reutilizar direcciones retiradas.';

commit;
