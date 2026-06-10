-- Datos fiscales del suscriptor (sincronizados desde Stripe). Ejecutar en Supabase SQL Editor.

alter table public.user_subscriptions
  add column if not exists billing_name text,
  add column if not exists billing_email text,
  add column if not exists billing_tax_id text,
  add column if not exists billing_address_line1 text,
  add column if not exists billing_address_line2 text,
  add column if not exists billing_city text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_country text,
  add column if not exists billing_synced_at timestamptz;

create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_event_id text not null unique,
  stripe_invoice_id text,
  stripe_checkout_session_id text,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'eur',
  description text not null,
  customer_email text,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payment_receipts enable row level security;

drop policy if exists "Leer recibos propios" on public.payment_receipts;
create policy "Leer recibos propios"
  on public.payment_receipts for select
  using (auth.uid() = user_id);
