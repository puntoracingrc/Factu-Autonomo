-- Baseline schema for local Supabase resets and ordered migrations.
-- Mirrors the existing SQL files in /supabase so a clean `supabase start`
-- creates the base tables before Phase 1 hardening migrations run.

-- schema.sql
create table if not exists public.user_backups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_entities (
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  payload jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id)
);

create index if not exists sync_entities_user_updated_idx
  on public.sync_entities (user_id, updated_at);

alter table public.user_backups enable row level security;
alter table public.sync_entities enable row level security;

drop policy if exists "Leer copia propia" on public.user_backups;
create policy "Leer copia propia"
  on public.user_backups for select
  using (auth.uid() = user_id);

drop policy if exists "Crear copia propia" on public.user_backups;
create policy "Crear copia propia"
  on public.user_backups for insert
  with check (auth.uid() = user_id);

drop policy if exists "Actualizar copia propia" on public.user_backups;
create policy "Actualizar copia propia"
  on public.user_backups for update
  using (auth.uid() = user_id);

drop policy if exists "Leer entidades propias" on public.sync_entities;
create policy "Leer entidades propias"
  on public.sync_entities for select
  using (auth.uid() = user_id);

drop policy if exists "Crear entidades propias" on public.sync_entities;
create policy "Crear entidades propias"
  on public.sync_entities for insert
  with check (auth.uid() = user_id);

drop policy if exists "Actualizar entidades propias" on public.sync_entities;
create policy "Actualizar entidades propias"
  on public.sync_entities for update
  using (auth.uid() = user_id);

-- billing.sql
create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'pro_plus', 'trial')),
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

-- billing-profile.sql
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

-- billing-scans.sql
alter table public.user_subscriptions
  add column if not exists scan_trial_remaining integer not null default 2;

alter table public.user_usage
  add column if not exists expense_scans_created integer not null default 0
    check (expense_scans_created >= 0);

alter table public.user_usage
  add column if not exists customer_ai_autofills_created integer not null default 0
    check (customer_ai_autofills_created >= 0);

do $$
begin
  alter table public.user_subscriptions
    add constraint user_subscriptions_scan_trial_remaining_check
    check (scan_trial_remaining >= 0);
exception
  when duplicate_object then null;
end $$;

-- billing-scan-credits.sql
alter table public.user_subscriptions
  add column if not exists scan_credits integer not null default 0;

alter table public.user_subscriptions
  add column if not exists ai_credit_units integer not null default 0;

update public.user_subscriptions
set ai_credit_units = scan_credits * 10
where ai_credit_units = 0
  and scan_credits > 0;

do $$
begin
  alter table public.user_subscriptions
    add constraint user_subscriptions_scan_credits_check
    check (scan_credits >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.user_subscriptions
    add constraint user_subscriptions_ai_credit_units_check
    check (ai_credit_units >= 0);
exception
  when duplicate_object then null;
end $$;

-- billing-ai-units.sql
alter table public.user_subscriptions
  add column if not exists ai_credit_units integer not null default 0;

update public.user_subscriptions
set ai_credit_units = scan_credits * 10
where ai_credit_units = 0
  and scan_credits > 0;

alter table public.user_usage
  add column if not exists customer_ai_autofills_created integer not null default 0
    check (customer_ai_autofills_created >= 0);

do $$
begin
  alter table public.user_subscriptions
    add constraint user_subscriptions_ai_credit_units_check
    check (ai_credit_units >= 0);
exception
  when duplicate_object then null;
end $$;

-- referrals.sql
create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  constraint referral_codes_code_format check (code ~ '^[A-Z0-9]{6,12}$')
);

create unique index if not exists referral_codes_code_lower_idx
  on public.referral_codes (lower(code));

create table if not exists public.referral_redemptions (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users (id) on delete cascade,
  referee_user_id uuid not null references auth.users (id) on delete cascade,
  referral_code text not null,
  referrer_bonus_granted boolean not null default false,
  referee_bonus_granted boolean not null default false,
  created_at timestamptz not null default now(),
  constraint referral_redemptions_referee_unique unique (referee_user_id),
  constraint referral_redemptions_no_self check (referrer_user_id <> referee_user_id)
);

create index if not exists referral_redemptions_referrer_idx
  on public.referral_redemptions (referrer_user_id);

alter table public.referral_codes enable row level security;
alter table public.referral_redemptions enable row level security;

drop policy if exists "Leer código de referido propio" on public.referral_codes;
create policy "Leer código de referido propio"
  on public.referral_codes for select
  using (auth.uid() = user_id);

drop policy if exists "Leer redención como invitado" on public.referral_redemptions;
create policy "Leer redención como invitado"
  on public.referral_redemptions for select
  using (auth.uid() = referee_user_id or auth.uid() = referrer_user_id);

-- verifactu.sql
create table if not exists public.verifactu_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id text not null,
  issuer_nif text not null,
  numserie text not null,
  record_type text not null check (record_type in ('alta', 'anulacion')),
  record_hash text not null,
  previous_hash text not null,
  qr_url text not null,
  csv text,
  status text not null,
  xml_payload text not null,
  aeat_response text,
  created_at timestamptz not null default now()
);

create index if not exists verifactu_records_user_created_idx
  on public.verifactu_records (user_id, created_at desc);

create table if not exists public.verifactu_chain_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  issuer_nif text not null,
  last_hash text not null,
  record_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, issuer_nif)
);

alter table public.verifactu_records enable row level security;
alter table public.verifactu_chain_state enable row level security;

drop policy if exists "Leer registros Verifactu propios" on public.verifactu_records;
create policy "Leer registros Verifactu propios"
  on public.verifactu_records for select
  using (auth.uid() = user_id);

drop policy if exists "Leer cadena Verifactu propia" on public.verifactu_chain_state;
create policy "Leer cadena Verifactu propia"
  on public.verifactu_chain_state for select
  using (auth.uid() = user_id);
