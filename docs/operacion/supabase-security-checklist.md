# Checklist Supabase

Ultima revision: 2026-07-09.

## Revision rapida mensual

- Security Advisor: revisar errores, warnings e info.
- Performance Advisor: revisar errores, warnings e indices recomendados.
- Auth: comprobar limites de login, signup, recuperacion y OTP.
- Auth CAPTCHA: confirmar que Cloudflare Turnstile sigue activo en registro y
  login.
- Sesiones: comprobar caducidad maxima y caducidad por inactividad.
- Redirect URLs: mantener solo dominios reales y callbacks necesarios.
- Storage: confirmar que no hay buckets publicos salvo decision explicita.
- Logs: revisar Auth, API y DB de los ultimos 7 dias.
- Backups: confirmar backups diarios activos y ultima restauracion disponible.
- RLS/grants: ejecutar consulta de auditoria y confirmar que no hay permisos
  peligrosos a `public`/`anon`.
- Rate limit distribuido: si esta activo, revisar que
  `server_rate_limit_buckets` no crece de forma anomala y que la RPC
  `claim_rate_limit_bucket` existe solo para `service_role`.
- Migraciones: confirmar que toda migracion de produccion viene de PR, CI verde
  y ejecucion controlada.
- Produccion: confirmar que Vercel apunta a la ultima build de `main`.
- CSP: revisar informes de `/api/security/csp-report`; produccion bloquea CSP
  por defecto y `SECURITY_CSP_MODE=report-only` queda como rollback temporal.
- Admin MFA: confirmar que las cuentas admin tienen TOTP verificado y que
  `ADMIN_MFA_REQUIRED=true` sigue activo en Vercel Production.
- WAF/bots: revisar si hay scraping, registros masivos o picos raros antes de
  contratar/activar proteccion avanzada.

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
- Auth CAPTCHA: Cloudflare Turnstile creado para `facturacion-autonomos.app` y
  `localhost`; Vercel Production tiene `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- RLS/grants produccion: checks criticos de tablas internas, `sync_entities`,
  `user_backups` y billing devueltos en `true`.
- Storage buckets: sin buckets publicos detectados en la revision.
- CSP: produccion bloquea por defecto; rollback temporal disponible con
  `SECURITY_CSP_MODE=report-only`.
- CSP reports: ruta `/api/security/csp-report` preparada y con rate limit.
- Rate limit distribuido: migracion aplicada y verificada en produccion;
  `SERVER_RATE_LIMIT_BACKEND=supabase` configurado en Vercel Production para
  nuevos despliegues; bucket `security_csp_report` observado tras prueba real de
  produccion.
- Admin MFA: cuenta `puntoracingrc@gmail.com` verificada con TOTP real en sesion
  `aal2`; Vercel Production tiene `ADMIN_MFA_REQUIRED=true`.
- Revisión mensual: recordatorio activo en Codex
  `revisi-n-mensual-supabase-seguridad`.

## Cambios que no se hacen a ciegas

- Auth rate limits: pueden bloquear usuarios legitimos si se bajan demasiado.
  Cambiarlos solo mirando metricas reales de login.
- Duracion de sesiones: endurecer demasiado puede expulsar usuarios mientras
  trabajan. Ajustarlo en una ventana controlada.
- Redirect URLs de Auth: quitar una URL equivocada puede romper login o previews.
  Revisar con la lista exacta antes de borrar.
- CAPTCHA Turnstile: no activar en Supabase si la build de produccion no tiene
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; bloquearia registro/login por email.
- Log Drains/PITR/Storage backups externos: revisar coste y necesidad antes de
  activar.
- CSP rollback: usar `SECURITY_CSP_MODE=report-only` solo si login, Turnstile,
  Google, Drive, Maps, escaneo IA, PDF o admin muestran una incompatibilidad
  legitima.
- Admin MFA required: no desactivar salvo rollback controlado; si se anade otra
  cuenta admin, verificar TOTP real antes de depender de ella.
- Rate limit distribuido: si se cambia o se revierte, confirmar que la migracion
  `20260709123000_server_rate_limit_buckets.sql` existe en el proyecto correcto
  antes de mantener `SERVER_RATE_LIMIT_BACKEND=supabase`.
- Migraciones Supabase automaticas: no activar sin entorno GitHub protegido,
  secretos revisados y dry-run previo.

## Valores orientativos

- Mantener `https://facturacion-autonomos.app/auth/callback` como callback de
  produccion.
- Mantener localhost solo para desarrollo local.
- Evitar dominios legacy o previews en callbacks de produccion salvo que haya un
  flujo activo que lo necesite.
- Mantener buckets privados por defecto.
- Mantener tablas admin sin politicas para `anon` o `authenticated` salvo que el
  caso de uso lo exija y tenga test.
- Mantener `ADMIN_EMAILS` explicito en produccion. El fallback local no debe ser
  la fuente de verdad de administradores.
- Mantener `SERVER_RATE_LIMIT_BACKEND=supabase` para rutas criticas mientras la
  migracion exista y este verificada; usar `memory` solo como rollback temporal.
