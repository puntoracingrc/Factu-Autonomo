-- Ejecuta después de schema.sql en el SQL Editor de Supabase

create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'trial')),
  status text not null default 'inactive' check (
    status in ('active', 'trialing', 'canceled', 'past_due', 'inactive')
  ),
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  ai_credit_units integer not null default 0 check (ai_credit_units >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  month_key text not null,
  documents_created integer not null default 0 check (documents_created >= 0),
  expense_scans_created integer not null default 0 check (expense_scans_created >= 0),
  customer_ai_autofills_created integer not null default 0 check (customer_ai_autofills_created >= 0),
  primary key (user_id, month_key)
);

alter table public.user_subscriptions
  add column if not exists scan_trial_remaining integer not null default 2;

alter table public.user_subscriptions enable row level security;
alter table public.user_usage enable row level security;

drop policy if exists "Leer suscripción propia" on public.user_subscriptions;
create policy "Leer suscripción propia"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Crear suscripción propia" on public.user_subscriptions;
create policy "Crear suscripción propia"
  on public.user_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Actualizar suscripción propia" on public.user_subscriptions;
create policy "Actualizar suscripción propia"
  on public.user_subscriptions for update
  using (auth.uid() = user_id);

drop policy if exists "Leer uso propio" on public.user_usage;
create policy "Leer uso propio"
  on public.user_usage for select
  using (auth.uid() = user_id);

drop policy if exists "Crear uso propio" on public.user_usage;
create policy "Crear uso propio"
  on public.user_usage for insert
  with check (auth.uid() = user_id);

drop policy if exists "Actualizar uso propio" on public.user_usage;
create policy "Actualizar uso propio"
  on public.user_usage for update
  using (auth.uid() = user_id);
