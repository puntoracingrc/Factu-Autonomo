begin;

alter table public.user_devices
  alter column session_binding_required_at
  set default (now() + interval '15 minutes');

update public.user_devices
set session_binding_required_at = statement_timestamp() + interval '15 minutes'
where active_session_hash is null;

comment on column public.user_devices.session_binding_required_at is
  'Fin de la compatibilidad de despliegue; despues exige una concesion de sesion vigente.';

commit;
