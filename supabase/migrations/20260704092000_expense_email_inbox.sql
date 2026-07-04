begin;

create table if not exists public.expense_inbox_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  alias_token text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_inbox_aliases_token_check
    check (alias_token ~ '^[a-z0-9_-]{8,64}$')
);

create table if not exists public.expense_inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  alias_token text not null,
  from_email text,
  from_name text,
  subject text,
  received_at timestamptz not null default now(),
  attachment_filename text not null,
  attachment_content_type text not null,
  attachment_size integer not null check (attachment_size > 0),
  attachment_hash text not null,
  status text not null default 'pending',
  source text not null default 'email_forward',
  scan_payload jsonb,
  scan_error text,
  processed_at timestamptz,
  ignored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_inbox_items_status_check
    check (status in ('pending', 'processing', 'processed', 'ignored', 'duplicate', 'error')),
  constraint expense_inbox_items_hash_check
    check (attachment_hash ~ '^sha256:[a-f0-9]{64}$')
);

create unique index if not exists expense_inbox_items_user_hash_idx
  on public.expense_inbox_items (user_id, attachment_hash);

create index if not exists expense_inbox_items_user_status_received_idx
  on public.expense_inbox_items (user_id, status, received_at desc);

create index if not exists expense_inbox_items_alias_received_idx
  on public.expense_inbox_items (alias_token, received_at desc);

alter table public.expense_inbox_aliases enable row level security;
alter table public.expense_inbox_items enable row level security;

drop policy if exists "Leer buzón propio" on public.expense_inbox_aliases;
create policy "Leer buzón propio"
  on public.expense_inbox_aliases
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Leer entradas de buzón propias" on public.expense_inbox_items;
create policy "Leer entradas de buzón propias"
  on public.expense_inbox_items
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Actualizar entradas de buzón propias" on public.expense_inbox_items;
create policy "Actualizar entradas de buzón propias"
  on public.expense_inbox_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.expense_inbox_aliases from anon, authenticated;
revoke all on table public.expense_inbox_items from anon, authenticated;

grant select on table public.expense_inbox_aliases to authenticated;
grant select, update on table public.expense_inbox_items to authenticated;

grant all on table public.expense_inbox_aliases to service_role;
grant all on table public.expense_inbox_items to service_role;

comment on table public.expense_inbox_aliases is
  'Direcciones únicas del buzón inteligente de gastos por usuario.';
comment on table public.expense_inbox_items is
  'Adjuntos recibidos por email y convertidos en gastos pendientes de revisar.';

commit;
