-- Programa Partners: acceso cerrado, atribucion y libro de comisiones.
-- Los pagos permanecen manuales. Ninguna funcion de esta migracion mueve dinero.

create table if not exists public.partner_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  status text not null default 'active'
    check (status in ('active', 'paused')),
  commission_bps integer not null default 1000
    check (commission_bps between 0 and 10000),
  payout_threshold_cents integer not null default 6000
    check (payout_threshold_cents >= 0),
  payout_holder_name text,
  payout_iban text,
  payout_details_updated_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_accounts_email_length
    check (char_length(email) between 3 and 254),
  constraint partner_accounts_holder_length
    check (payout_holder_name is null or char_length(payout_holder_name) <= 160),
  constraint partner_accounts_iban_length
    check (payout_iban is null or char_length(payout_iban) between 15 and 34)
);

create unique index if not exists partner_accounts_email_lower_idx
  on public.partner_accounts (lower(email));

create index if not exists partner_accounts_status_idx
  on public.partner_accounts (status);

create table if not exists public.partner_commission_entries (
  id uuid primary key default gen_random_uuid(),
  partner_user_id uuid not null
    references public.partner_accounts (user_id) on delete cascade,
  referred_user_id uuid not null references auth.users (id) on delete cascade,
  source_payment_receipt_id uuid
    references public.payment_receipts (id) on delete restrict,
  source_stripe_invoice_id text,
  source_plan text not null check (source_plan in ('pro', 'pro_plus')),
  source_amount_cents integer not null check (source_amount_cents >= 0),
  commission_bps integer not null check (commission_bps between 0 and 10000),
  commission_cents integer not null check (commission_cents >= 0),
  currency text not null default 'eur'
    check (currency ~ '^[a-z]{3}$'),
  status text not null default 'pending'
    check (status in ('pending', 'available', 'paid', 'reversed')),
  earned_at timestamptz not null,
  available_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_commission_source_present check (
    source_payment_receipt_id is not null or source_stripe_invoice_id is not null
  )
);

create unique index if not exists partner_commission_receipt_unique_idx
  on public.partner_commission_entries (source_payment_receipt_id)
  where source_payment_receipt_id is not null;

create unique index if not exists partner_commission_invoice_unique_idx
  on public.partner_commission_entries (source_stripe_invoice_id)
  where source_stripe_invoice_id is not null;

create index if not exists partner_commission_partner_status_idx
  on public.partner_commission_entries (partner_user_id, status, earned_at desc);

create table if not exists public.partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_user_id uuid not null
    references public.partner_accounts (user_id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'eur'
    check (currency ~ '^[a-z]{3}$'),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'paid', 'canceled')),
  period_start timestamptz,
  period_end timestamptz,
  external_reference text,
  created_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_payout_period_order check (
    period_start is null or period_end is null or period_end >= period_start
  ),
  constraint partner_payout_reference_length check (
    external_reference is null or char_length(external_reference) <= 160
  )
);

create index if not exists partner_payouts_partner_created_idx
  on public.partner_payouts (partner_user_id, created_at desc);

alter table public.partner_accounts enable row level security;
alter table public.partner_commission_entries enable row level security;
alter table public.partner_payouts enable row level security;

revoke all on table public.partner_accounts from public, anon, authenticated;
revoke all on table public.partner_commission_entries from public, anon, authenticated;
revoke all on table public.partner_payouts from public, anon, authenticated;

grant all on table public.partner_accounts to service_role;
grant all on table public.partner_commission_entries to service_role;
grant all on table public.partner_payouts to service_role;

comment on table public.partner_accounts is
  'Cuentas autorizadas manualmente para el programa Partners. Acceso solo via API servidor.';
comment on table public.partner_commission_entries is
  'Libro inmutable de devengos de comision; la integracion automatica con cobros se activa en un bloque posterior.';
comment on table public.partner_payouts is
  'Ordenes de pago manuales. Esta tabla no ejecuta transferencias.';
