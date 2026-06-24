-- Phase 1 hardening: billing RLS, AI unit atomic consumption, Stripe idempotency.
-- Apply with Supabase SQL editor or CLI after the existing billing SQL files.

begin;

alter table public.user_subscriptions
  add column if not exists scan_trial_remaining integer not null default 2,
  add column if not exists scan_credits integer not null default 0,
  add column if not exists ai_credit_units integer not null default 0;

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

create table if not exists public.stripe_events (
  stripe_event_id text primary key,
  event_type text not null,
  status text not null check (status in ('processing', 'processed', 'failed')),
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.user_subscriptions enable row level security;
alter table public.user_usage enable row level security;
alter table public.payment_receipts enable row level security;
alter table public.stripe_events enable row level security;

drop policy if exists "Leer suscripción propia" on public.user_subscriptions;
drop policy if exists "Crear suscripción propia" on public.user_subscriptions;
drop policy if exists "Actualizar suscripción propia" on public.user_subscriptions;
drop policy if exists "Leer suscripcion propia" on public.user_subscriptions;
drop policy if exists "Crear suscripcion propia" on public.user_subscriptions;
drop policy if exists "Actualizar suscripcion propia" on public.user_subscriptions;

create policy "Leer suscripcion propia"
  on public.user_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Leer uso propio" on public.user_usage;
drop policy if exists "Crear uso propio" on public.user_usage;
drop policy if exists "Actualizar uso propio" on public.user_usage;

create policy "Leer uso propio"
  on public.user_usage
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Leer recibos propios" on public.payment_receipts;
create policy "Leer recibos propios"
  on public.payment_receipts
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.user_subscriptions from anon, authenticated;
revoke all on table public.user_usage from anon, authenticated;
revoke all on table public.payment_receipts from anon, authenticated;
revoke all on table public.stripe_events from anon, authenticated;

grant select on table public.user_subscriptions to authenticated;
grant select on table public.user_usage to authenticated;
grant select on table public.payment_receipts to authenticated;

grant all on table public.user_subscriptions to service_role;
grant all on table public.user_usage to service_role;
grant all on table public.payment_receipts to service_role;
grant all on table public.stripe_events to service_role;

create or replace function public.consume_ai_units(
  p_user_id uuid,
  p_month_key text,
  p_cost_units integer,
  p_expense_scans_increment integer default 0,
  p_customer_ai_autofills_increment integer default 0,
  p_pro_monthly_units integer default 300,
  p_free_trial_decrement integer default 1
)
returns table(allowed boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.user_subscriptions%rowtype;
  v_usage public.user_usage%rowtype;
  v_used_units integer;
  v_included_remaining_units integer;
  v_credit_units integer;
  v_units_from_credit integer;
  v_is_pro_or_trial boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception 'consume_ai_units can only be executed by service_role'
      using errcode = '42501';
  end if;

  if p_cost_units <= 0
    or p_expense_scans_increment < 0
    or p_customer_ai_autofills_increment < 0
    or p_pro_monthly_units < 0
    or p_free_trial_decrement < 0 then
    raise exception 'invalid AI unit consumption arguments'
      using errcode = '22023';
  end if;

  select *
    into v_sub
    from public.user_subscriptions
   where user_id = p_user_id
   for update;

  if not found then
    return query select false, 'missing_subscription';
    return;
  end if;

  insert into public.user_usage (
    user_id,
    month_key,
    documents_created,
    expense_scans_created,
    customer_ai_autofills_created
  )
  values (p_user_id, p_month_key, 0, 0, 0)
  on conflict (user_id, month_key) do nothing;

  select *
    into v_usage
    from public.user_usage
   where user_id = p_user_id
     and month_key = p_month_key
   for update;

  v_is_pro_or_trial :=
    (
      v_sub.plan = 'pro'
      and v_sub.status in ('active', 'trialing')
      and (v_sub.current_period_end is null or v_sub.current_period_end >= now())
    )
    or
    (
      (v_sub.plan = 'trial' or v_sub.status = 'trialing')
      and v_sub.trial_ends_at is not null
      and v_sub.trial_ends_at >= now()
    );

  if v_is_pro_or_trial then
    v_used_units :=
      coalesce(v_usage.expense_scans_created, 0) * 10
      + coalesce(v_usage.customer_ai_autofills_created, 0);
    v_included_remaining_units :=
      greatest(0, p_pro_monthly_units - v_used_units);
    v_credit_units :=
      coalesce(v_sub.ai_credit_units, coalesce(v_sub.scan_credits, 0) * 10);

    if v_included_remaining_units + v_credit_units < p_cost_units then
      return query select false, 'insufficient_units';
      return;
    end if;

    update public.user_usage
       set expense_scans_created =
             expense_scans_created + p_expense_scans_increment,
           customer_ai_autofills_created =
             customer_ai_autofills_created + p_customer_ai_autofills_increment
     where user_id = p_user_id
       and month_key = p_month_key;

    v_units_from_credit :=
      greatest(0, p_cost_units - v_included_remaining_units);

    if v_units_from_credit > 0 then
      update public.user_subscriptions
         set ai_credit_units = ai_credit_units - v_units_from_credit,
             scan_credits = floor((ai_credit_units - v_units_from_credit)::numeric / 10)::integer,
             updated_at = now()
       where user_id = p_user_id
         and ai_credit_units >= v_units_from_credit;

      if not found then
        return query select false, 'insufficient_units';
        return;
      end if;
    end if;
  else
    if coalesce(v_sub.scan_trial_remaining, 0) < p_free_trial_decrement then
      return query select false, 'trial_exhausted';
      return;
    end if;

    update public.user_subscriptions
       set scan_trial_remaining = scan_trial_remaining - p_free_trial_decrement,
           updated_at = now()
     where user_id = p_user_id
       and scan_trial_remaining >= p_free_trial_decrement;

    if not found then
      return query select false, 'trial_exhausted';
      return;
    end if;
  end if;

  return query select true, null::text;
end;
$$;

create or replace function public.grant_ai_credit_units(
  p_user_id uuid,
  p_scan_credits integer,
  p_units_per_scan integer default 10
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'grant_ai_credit_units can only be executed by service_role'
      using errcode = '42501';
  end if;

  if p_scan_credits <= 0 or p_units_per_scan <= 0 then
    raise exception 'invalid credit grant arguments'
      using errcode = '22023';
  end if;

  update public.user_subscriptions
     set scan_credits = scan_credits + p_scan_credits,
         ai_credit_units = ai_credit_units + (p_scan_credits * p_units_per_scan),
         updated_at = now()
   where user_id = p_user_id;

  return found;
end;
$$;

revoke all on function public.consume_ai_units(
  uuid, text, integer, integer, integer, integer, integer
) from public, anon, authenticated;
revoke all on function public.grant_ai_credit_units(
  uuid, integer, integer
) from public, anon, authenticated;

grant execute on function public.consume_ai_units(
  uuid, text, integer, integer, integer, integer, integer
) to service_role;
grant execute on function public.grant_ai_credit_units(
  uuid, integer, integer
) to service_role;

commit;
