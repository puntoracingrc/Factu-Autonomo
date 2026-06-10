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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  month_key text not null,
  documents_created integer not null default 0 check (documents_created >= 0),
  primary key (user_id, month_key)
);

alter table public.user_subscriptions enable row level security;
alter table public.user_usage enable row level security;

create policy "Leer suscripción propia"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

create policy "Crear suscripción propia"
  on public.user_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Actualizar suscripción propia"
  on public.user_subscriptions for update
  using (auth.uid() = user_id);

create policy "Leer uso propio"
  on public.user_usage for select
  using (auth.uid() = user_id);

create policy "Crear uso propio"
  on public.user_usage for insert
  with check (auth.uid() = user_id);

create policy "Actualizar uso propio"
  on public.user_usage for update
  using (auth.uid() = user_id);
