begin;

drop policy if exists "Leer copia propia" on public.user_backups;
create policy "Leer copia propia"
  on public.user_backups for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Crear copia propia" on public.user_backups;
create policy "Crear copia propia"
  on public.user_backups for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Actualizar copia propia" on public.user_backups;
create policy "Actualizar copia propia"
  on public.user_backups for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Leer entidades propias" on public.sync_entities;
create policy "Leer entidades propias"
  on public.sync_entities for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Crear entidades propias" on public.sync_entities;
create policy "Crear entidades propias"
  on public.sync_entities for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Actualizar entidades propias" on public.sync_entities;
create policy "Actualizar entidades propias"
  on public.sync_entities for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists enforce_cloud_device_limit_trigger
  on public.user_devices;
drop function if exists public.enforce_cloud_device_limit();
drop function if exists public.cloud_device_access_allowed();
drop function if exists public.cloud_device_token_hash(text);
drop function if exists public.cloud_device_limit_for_user(uuid, timestamptz);
drop table if exists public.user_devices;

commit;
