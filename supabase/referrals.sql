-- Programa de referidos: escaneos extra para quien invita y quien se registra.
-- Ejecutar en Supabase SQL Editor después de billing.sql.

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
