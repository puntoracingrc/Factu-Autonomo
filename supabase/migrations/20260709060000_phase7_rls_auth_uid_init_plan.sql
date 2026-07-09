-- Optimize user-scoped RLS policies reported by Supabase Advisor.
-- This preserves the same user isolation semantics while evaluating auth.uid()
-- once per statement instead of once per row.

alter table public.user_backups enable row level security;
alter table public.sync_entities enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.user_usage enable row level security;

drop policy if exists "Leer copia propia" on public.user_backups;
create policy "Leer copia propia"
  on public.user_backups
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Crear copia propia" on public.user_backups;
create policy "Crear copia propia"
  on public.user_backups
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Actualizar copia propia" on public.user_backups;
create policy "Actualizar copia propia"
  on public.user_backups
  for update
  using ((select auth.uid()) = user_id);

drop policy if exists "Leer entidades propias" on public.sync_entities;
create policy "Leer entidades propias"
  on public.sync_entities
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Crear entidades propias" on public.sync_entities;
create policy "Crear entidades propias"
  on public.sync_entities
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Actualizar entidades propias" on public.sync_entities;
create policy "Actualizar entidades propias"
  on public.sync_entities
  for update
  using ((select auth.uid()) = user_id);

drop policy if exists "Leer suscripcion propia" on public.user_subscriptions;
drop policy if exists "Leer suscripción propia" on public.user_subscriptions;
drop policy if exists "Crear suscripcion propia" on public.user_subscriptions;
drop policy if exists "Crear suscripción propia" on public.user_subscriptions;
drop policy if exists "Actualizar suscripcion propia" on public.user_subscriptions;
drop policy if exists "Actualizar suscripción propia" on public.user_subscriptions;

create policy "Leer suscripcion propia"
  on public.user_subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Leer uso propio" on public.user_usage;
drop policy if exists "Crear uso propio" on public.user_usage;
drop policy if exists "Actualizar uso propio" on public.user_usage;

create policy "Leer uso propio"
  on public.user_usage
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.user_subscriptions from anon, authenticated;
revoke all on table public.user_usage from anon, authenticated;

grant select on table public.user_subscriptions to authenticated;
grant select on table public.user_usage to authenticated;

grant all on table public.user_subscriptions to service_role;
grant all on table public.user_usage to service_role;
