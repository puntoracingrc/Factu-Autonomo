-- Rollback for Phase 1 hardening.
-- Use only if you need to restore the previous client-writable billing model.

begin;

drop function if exists public.consume_ai_units(
  uuid, text, integer, integer, integer, integer, integer
);
drop function if exists public.grant_ai_credit_units(
  uuid, integer, integer
);

drop table if exists public.stripe_events;

drop policy if exists "Leer suscripcion propia" on public.user_subscriptions;
drop policy if exists "Leer uso propio" on public.user_usage;

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

grant select, insert, update on table public.user_subscriptions to authenticated;
grant select, insert, update on table public.user_usage to authenticated;
grant select on table public.payment_receipts to authenticated;

commit;
