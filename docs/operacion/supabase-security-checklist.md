# Checklist Supabase

Ultima revision: 2026-07-09.

## Revision rapida mensual

- Security Advisor: revisar errores, warnings e info.
- Performance Advisor: revisar errores, warnings e indices recomendados.
- Auth: comprobar limites de login, signup, recuperacion y OTP.
- Sesiones: comprobar caducidad maxima y caducidad por inactividad.
- Redirect URLs: mantener solo dominios reales y callbacks necesarios.
- Storage: confirmar que no hay buckets publicos salvo decision explicita.
- Logs: revisar Auth, API y DB de los ultimos 7 dias.
- Backups: confirmar backups diarios activos y ultima restauracion disponible.
- Produccion: confirmar que Vercel apunta a la ultima build de `main`.

## Estado revisado

- Security Advisor: 0 errores.
- Security Advisor warnings: `admin_health_snapshot()` quedo restringida a
  `service_role` mediante migracion.
- Security Advisor info: `admin_user_restore_points` y
  `admin_user_restore_events` tienen RLS sin politicas de usuario. Es
  intencionado: son tablas admin internas y el navegador no debe leerlas.
- Performance Advisor: 0 errores y 0 warnings.
- Performance Advisor info: indices de claves foraneas admin cubiertos por
  migracion.
- Storage: el codigo no usa Supabase Storage actualmente. Si hay buckets creados
  manualmente, deben revisarse desde Dashboard.

## Cambios que no se hacen a ciegas

- Auth rate limits: pueden bloquear usuarios legitimos si se bajan demasiado.
  Cambiarlos solo mirando metricas reales de login.
- Duracion de sesiones: endurecer demasiado puede expulsar usuarios mientras
  trabajan. Ajustarlo en una ventana controlada.
- Redirect URLs de Auth: quitar una URL equivocada puede romper login o previews.
  Revisar con la lista exacta antes de borrar.
- CAPTCHA Turnstile: requiere claves de Cloudflare, cambios de app y prueba UX.
- Log Drains/PITR/Storage backups externos: revisar coste y necesidad antes de
  activar.

## Valores orientativos

- Mantener `https://facturacion-autonomos.app/auth/callback` como callback de
  produccion.
- Mantener localhost solo para desarrollo local.
- Evitar dominios legacy o previews en callbacks de produccion salvo que haya un
  flujo activo que lo necesite.
- Mantener buckets privados por defecto.
- Mantener tablas admin sin politicas para `anon` o `authenticated` salvo que el
  caso de uso lo exija y tenga test.
