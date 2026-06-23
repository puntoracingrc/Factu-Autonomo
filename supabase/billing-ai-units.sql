-- Saldo IA granular.
-- 1 escaneo = 10 unidades IA. Rellenar cliente desde texto = 1 unidad IA.
-- Ejecutar en Supabase SQL Editor si ya aplicaste billing.sql.

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
