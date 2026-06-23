-- Migración: escaneo de gastos con IA
-- Ejecuta SOLO este archivo si ya aplicaste billing.sql antes.
-- No vuelvas a ejecutar billing.sql entero (las políticas ya existen).

alter table public.user_subscriptions
  add column if not exists scan_trial_remaining integer not null default 2;

alter table public.user_usage
  add column if not exists expense_scans_created integer not null default 0
    check (expense_scans_created >= 0);

alter table public.user_usage
  add column if not exists customer_ai_autofills_created integer not null default 0
    check (customer_ai_autofills_created >= 0);

-- Restricción en scan_trial_remaining (si la columna es nueva)
do $$
begin
  alter table public.user_subscriptions
    add constraint user_subscriptions_scan_trial_remaining_check
    check (scan_trial_remaining >= 0);
exception
  when duplicate_object then null;
end $$;
