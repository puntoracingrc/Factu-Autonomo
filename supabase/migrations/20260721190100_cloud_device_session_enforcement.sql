begin;

alter table public.user_devices
  alter column session_binding_required_at
  set default now();

update public.user_devices
set session_binding_required_at = statement_timestamp()
where active_session_hash is null;

comment on column public.user_devices.session_binding_required_at is
  'La sincronizacion exige concesion de sesion; la ventana de compatibilidad del despliegue ya esta cerrada.';

commit;
