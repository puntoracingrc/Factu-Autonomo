-- Créditos de escaneo comprados (packs extra). Ejecutar en Supabase SQL Editor.

alter table public.user_subscriptions
  add column if not exists scan_credits integer not null default 0;

do $$
begin
  alter table public.user_subscriptions
    add constraint user_subscriptions_scan_credits_check
    check (scan_credits >= 0);
exception
  when duplicate_object then null;
end $$;
