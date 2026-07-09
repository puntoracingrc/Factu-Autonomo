# Informe de seguridad y preparacion de auditoria

Ultima revision: 2026-07-09.

Proyecto: `facturacion-autonomos.app`.

Este documento resume la postura actual de seguridad de la aplicacion, incluyendo
medidas que ya existian, medidas anadidas durante la fase de hardening y puntos
pendientes que conviene revisar antes de una auditoria externa.

## Resumen ejecutivo

- La aplicacion ya tiene una base razonable: HTTPS/HSTS, headers de seguridad,
  Supabase Auth, confirmacion de email, CAPTCHA en auth, RLS en tablas sensibles,
  APIs con bearer tokens, webhooks firmados, validacion de uploads y CI completo.
- Se ha reforzado Supabase RLS para que las tablas internas no sean accesibles
  desde el navegador y para que los datos de usuario sigan aislados por owner.
- El admin depende de `ADMIN_EMAILS` en produccion. El fallback local solo se
  aplica fuera de produccion.
- Los principales riesgos que siguen vivos son: XSS con impacto alto por uso de
  `localStorage`, ausencia de PITR, ausencia de WAF/bot protection avanzado y
  despliegue de migraciones Supabase todavia no totalmente automatizado.
- CSP queda en bloqueo por defecto en produccion tras revisar logs de Vercel el
  2026-07-09. Se puede volver temporalmente a informe con
  `SECURITY_CSP_MODE=report-only`.
- El rate limit distribuido queda aplicado en Supabase, con
  `SERVER_RATE_LIMIT_BACKEND=supabase` configurado en Vercel Production y
  fallback en memoria.
- El MFA admin queda preparado con TOTP y bloqueo por `ADMIN_MFA_REQUIRED=true`;
  no debe activarse hasta enrolar y probar las cuentas admin.
- Verificacion final de produccion tras PR #336: workflow `main` 29047106837 en
  verde, Production Domain correcto, CSP en bloqueo y rate limit distribuido
  confirmado con bucket `security_csp_report`.

## Infraestructura y cabeceras

Protecciones actuales:

- Hosting en Vercel.
- HTTPS obligatorio por el dominio de produccion.
- HSTS: `Strict-Transport-Security: max-age=63072000`.
- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY`.
- CSP con directivas restrictivas y `frame-ancestors 'none'`.
- CSP permite explicitamente servicios necesarios: Supabase, OpenAI, Google,
  Google Maps, Google Drive, Gmail y Cloudflare Turnstile.
- CSP incluye `report-uri /api/security/csp-report` para registrar violaciones
  reales y permitir diagnostico/rollback controlado.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy` limita sensores, camara, ubicacion, pago, USB, etc.
- `X-Permitted-Cross-Domain-Policies: none`.
- CORS global cerrado a `https://facturacion-autonomos.app`.
- Rutas privadas marcadas `noindex, nofollow, noarchive`.
- Rutas privadas con `Cache-Control: no-store, max-age=0`.
- `robots.txt` bloquea rastreo educado de app privada, admin, callbacks y APIs.

Estado CSP:

- En produccion se emite `Content-Security-Policy` por defecto.
- Existe interruptor `SECURITY_CSP_MODE=report-only` para volver temporalmente a
  informe sin tocar codigo si aparece una incompatibilidad.
- La ruta `/api/security/csp-report` acepta informes del navegador, los sanea y
  los registra sin aceptar campos arbitrarios largos.

## Autenticacion y cuentas

Protecciones actuales:

- Supabase Auth para usuarios.
- Confirmacion de email requerida en APIs sensibles.
- Turnstile CAPTCHA en registro/login.
- Google Auth controlado con redirect/origin validado.
- Sesiones endurecidas desde Supabase.
- APIs server usan bearer token y validan usuario con Supabase.
- Admin validado por token de usuario y email autorizado.
- `ADMIN_EMAILS` es obligatorio en produccion para admins.
- El email admin de desarrollo solo se incluye fuera de `NODE_ENV=production`.
- MFA admin con TOTP preparado en el panel `/admin`.
- Las APIs admin completas pueden exigir `aal2` con `ADMIN_MFA_REQUIRED=true`.

Riesgos pendientes:

- MFA admin no debe forzarse hasta que al menos una cuenta admin haya verificado
  TOTP y se haya probado acceso al panel.

## Base de datos y Supabase

Protecciones actuales:

- Supabase Pro activo.
- Micro Compute activo.
- Backups diarios con 7 dias de retencion.
- Logs con 7 dias de retencion.
- RLS aplicado y auditado en tablas de usuario y tablas internas.
- `sync_entities` y `user_backups` quedan acotadas al `user_id` autenticado.
- Tablas internas admin, billing, fiscal, inbox, Stripe y restore quedan cerradas
  a `public`, `anon` y `authenticated`, salvo lecturas explicitamente necesarias.
- Tablas de resumen billing son de solo lectura para usuario autenticado.
- Service role solo se usa desde servidor y no debe exponerse al cliente.
- Supabase Storage no tiene buckets publicos detectados en la revision.

Verificaciones realizadas:

- Consulta RLS de produccion: checks criticos devueltos en `true`.
- Auditoria de grants peligrosos a `public`/`anon`: 0 filas.
- Auditoria de Storage buckets: sin buckets publicos detectados.

Riesgos pendientes:

- PITR no sustituye restauracion por usuario; es recuperacion global de la base.
- Si no se puede perder hasta 24h de datos, valorar PITR.
- Las migraciones de Supabase pasan por Git y CI, pero la aplicacion a produccion
  de la base aun requiere un flujo controlado/manual.

## APIs y webhooks

Protecciones actuales:

- Muchas APIs sensibles exigen bearer token.
- Rate limits aplicados a admin, billing, email, Google token, Google Places,
  imports, expense scan, referrals, reminders, monitoring y VeriFactu.
- Rate limit distribuido opcional mediante Supabase:
  `server_rate_limit_buckets` + RPC `claim_rate_limit_bucket`.
- El limitador distribuido usa hashes de identificador, no IP/email en claro.
- Si Supabase no esta disponible o la migracion no existe, el sistema vuelve al
  limitador en memoria para no tumbar rutas sensibles.
- Migracion de rate limit distribuido aplicada y verificada en Supabase
  produccion el 2026-07-09.
- Vercel Production tiene `SERVER_RATE_LIMIT_BACKEND=supabase` configurado para
  nuevos despliegues.
- Tras el despliegue de `main`, Supabase registra bucket
  `security_csp_report`, lo que confirma uso real del backend distribuido.
- Webhook Stripe valida firma `stripe-signature`.
- Webhook Stripe usa idempotencia por evento.
- Inbound email valida Svix/Resend o secreto privado.
- Upload de escaneo IA valida fichero, tamano/tipo y cuota.
- APIs de Google token validan redirect/origin.
- Rutas experimentales `document-sync` y `server-documents/ingest` quedan bajo
  flags y hardening especifico.
- Respuestas API privadas llevan `no-store`.

Riesgos pendientes:

- Mantener vigilancia de logs por si apareciera `rate_limit_supabase_fallback`.
- Revisar periodicamente endpoints sin auth clasica: webhooks, monitoring,
  welcome email, status/declaration y provider-summary.

## Frontend, XSS y datos locales

Protecciones actuales:

- React escapa texto por defecto.
- No se detecta `dangerouslySetInnerHTML` en la app.
- Manual/rich text renderiza markdown simple sin HTML crudo.
- Ventana temporal de compartir usa texto plano, no HTML inyectado.
- Flujos de PDF escapan titulo y URLs antes de escribir visor temporal.
- Monitoring redacciona tokens, secretos y textos largos.
- Backups/importacion tienen validadores y modelos de revision no destructivos.

Riesgo principal:

- La app usa `localStorage` para datos completos de negocio. Si hay XSS, el
  impacto puede ser alto porque un script podria leer datos locales del usuario.

Mejoras pendientes:

- Vigilar informes CSP tras pasar a bloqueo.
- Reducir dependencias de `unsafe-inline` en CSP a medio plazo.
- Evaluar migracion progresiva de datos sensibles a IndexedDB cifrado o modelo
  cloud-first con recuperacion por usuario.
- Mantener pruebas automaticas que impidan introducir HTML crudo.

## Admin y operacion

Protecciones actuales:

- Panel admin solo carga capacidades si hay sesion.
- APIs admin vuelven a validar token y email admin en servidor.
- Panel admin incluye errores/salud y metricas de uso.
- Restauracion por usuario existe como herramienta admin con confirmacion.
- Acciones de restauracion crean punto de seguridad antes de aplicar cambios.
- Produccion se verifica tras deploy y alias Vercel.

Riesgos pendientes:

- Exigir MFA para admins.
- Alertas externas con Log Drains si la operacion crece.
- Runbook formal para incidentes: cuenta comprometida, fuga de clave, rollback,
  abuso de escaneo IA, error de migracion.

## CI, Git y despliegue

Protecciones actuales:

- Todo cambio pasa por Git.
- CI ejecuta migraciones check, tests, lint, typecheck y build.
- Supabase local acceptance corre en CI.
- Push a `main` espera Vercel y reasigna alias de produccion.
- Production Domain verifica que el dominio responde con la marca esperada.

Riesgos pendientes:

- Automatizar migraciones Supabase de produccion con aprobacion manual y dry-run.
- Anadir verificacion post-deploy de headers, CSP y endpoints criticos.
- Mantener PRs pequenos por fase para poder revertir facil.

## Pruebas que puede hacer un auditor

- OWASP Top 10: XSS, inyeccion, auth rota, control de acceso, CSRF, SSRF,
  configuracion insegura, componentes vulnerables y logging.
- IDOR/multiusuario: intentar leer o modificar datos de otro usuario.
- RLS: consultas directas con anon/authenticated contra tablas publicas.
- APIs admin: llamadas sin token, token de usuario normal, token expirado,
  token de admin y payloads maliciosos.
- Uploads: MIME falso, PDFs enormes, imagenes corruptas, nombres peligrosos.
- Rate limit: login, signup, escaneo IA, emails, Google token, admin.
- OAuth: redirect_uri manipulado, origen no permitido, token reuse.
- Webhooks: Stripe/Resend falsos, firma invalida, replay/idempotencia.
- CORS: origen externo intentando leer APIs.
- CSP: intento de script inline externo, iframe externo y exfiltracion.
- Scraping/bots: crawling de app privada, APIs, registro masivo y fuerza bruta.
- Backups/restauracion: restaurar usuario equivocado, rollback parcial, logs.
- Secrets: bundle cliente, repo, logs, errores y variables publicas.

## Priorizacion antes de auditoria

Alta prioridad:

- Vigilar informes CSP y usar `report-only` solo como rollback temporal si
  aparece una incompatibilidad legitima.
- Enrolar TOTP en cuentas admin y despues activar `ADMIN_MFA_REQUIRED=true`.
- Revisar logs de rate limit distribuido durante los primeros dias.
- Revisar Security Advisor y Performance Advisor tras cada migracion.

Media prioridad:

- Workflow manual para migraciones Supabase con dry-run y aprobacion.
- Runbook de incidentes y recuperacion.
- Alertas externas para errores criticos y abuso.

Baja prioridad o dependiente de coste:

- PITR si el negocio no puede tolerar perdida de hasta 24h.
- WAF/bot protection avanzada si aparecen ataques o scraping real.
- Log Drains si se necesita monitorizacion externa continua.
