# Informe de fase: endurecimiento adicional de seguridad

Ultima revision: 2026-07-09.

Proyecto: `facturacion-autonomos.app`.

Este informe cubre solo la fase adicional pedida despues del informe general:
CSP en bloqueo controlado, MFA admin, rate limit distribuido, WAF/bot
protection y revision mensual de Supabase. PITR queda excluido de esta fase por
decision operativa y coste.

## Resumen

- CSP queda en bloqueo en builds de produccion por defecto, con ruta de informes
  `/api/security/csp-report` y con el interruptor
  `SECURITY_CSP_MODE=report-only` disponible para diagnostico temporal.
- MFA admin queda implementado con TOTP en el panel `/admin` y bloqueo por
  `ADMIN_MFA_REQUIRED=true`, ya configurado en Vercel Production tras verificar
  una sesion admin `aal2`.
- Rate limit distribuido queda aplicado en Supabase y preparado en Vercel
  mediante `SERVER_RATE_LIMIT_BACKEND=supabase`.
- El panel Admin > Errores y salud muestra senales de abuso/scraping basadas en
  `server_rate_limit_buckets` y ofrece un log copiable para diagnostico sin IPs,
  tokens ni emails.
- WAF/bot protection queda como control operativo externo: no se activa a ciegas
  porque depende de DNS/proveedor/coste y puede bloquear trafico legitimo.
- Revision mensual de Supabase queda documentada y con recordatorio activo en
  Codex: `revisi-n-mensual-supabase-seguridad`.

## Verificacion final de produccion

Fecha: 2026-07-09.

- PR #336 mergeado a `main`.
- Workflow `main` 29047106837 completado en verde: Quality, Supabase Acceptance
  y Production Domain.
- Produccion `https://facturacion-autonomos.app/` responde `200`.
- Produccion emite `Content-Security-Policy` en bloqueo, no
  `Content-Security-Policy-Report-Only`.
- `/admin` responde `200` con `Cache-Control: no-store` y
  `X-Robots-Tag: noindex, nofollow, noarchive`.
- `/api/admin/capabilities` sin token responde `401`.
- `/api/security/csp-report` acepta informe CSP de prueba con `{"ok":true}`.
- Vercel logs no muestran `rate_limit_supabase_fallback`.
- Supabase `server_rate_limit_buckets` registra bucket `security_csp_report`,
  confirmando que el backend distribuido esta activo.
- Cuenta admin `puntoracingrc@gmail.com` con TOTP verificado: estado
  `verificado · Nivel aal2 · preparado`.
- Cuenta admin `persianasalmar@gmail.com` con TOTP verificado manualmente.
- Vercel Production tiene `ADMIN_MFA_REQUIRED=true` configurado.

## CSP

Hecho:

- CSP pasa a bloqueo en produccion por defecto.
- Se anade `report-uri /api/security/csp-report`.
- La ruta de informes sanea campos permitidos, limita tamano de valores y tiene
  rate limit.
- Logs de Vercel revisados el 2026-07-09: no habia informes CSP legitimos; solo
  el informe artificial usado para probar el endpoint.
- `SECURITY_CSP_MODE=report-only` permite volver temporalmente a modo informe
  sin cambiar codigo si aparece una incompatibilidad.

Verificacion recomendada:

1. Revisar que no haya bloqueos legitimos de login, Google, Drive, Maps,
   Turnstile, PDF, IA o admin.
2. Verificar `/`, `/cuenta`, `/admin`, login, Google, Drive y facturas.
3. Si algo se rompe, poner `SECURITY_CSP_MODE=report-only` en Vercel y corregir
   la directiva concreta.

## MFA admin

Hecho:

- El panel `/admin` muestra estado MFA para cuentas admin.
- Permite enrolar TOTP con QR/secret y verificar codigo.
- Las APIs admin completas usan una comprobacion comun.
- Si `ADMIN_MFA_REQUIRED=true`, las APIs admin exigen `aal2`.
- Las cuentas de aprendizaje IA no quedan mezcladas con admin completo.
- Cuenta admin `puntoracingrc@gmail.com` verificada con TOTP real y sesion
  `aal2`.
- Variable Vercel Production `ADMIN_MFA_REQUIRED=true` anadida.

Verificacion realizada:

1. Entrar con una cuenta admin.
2. Preparar TOTP desde el panel admin.
3. Verificar el codigo y confirmar que la sesion queda `aal2`.
4. Activar `ADMIN_MFA_REQUIRED=true` en Vercel Production.
5. Desplegar por Git para que Vercel cargue la variable nueva.

## Rate limit distribuido

Hecho:

- Nueva tabla `server_rate_limit_buckets`.
- Nueva RPC `claim_rate_limit_bucket`.
- Permisos cerrados a `public`, `anon` y `authenticated`.
- Ejecucion permitida solo a `service_role`.
- La app usa hashes de identificador, no IP/email en claro.
- Si el backend Supabase no esta disponible, vuelve a memoria para no romper.
- Migracion `20260709123000_server_rate_limit_buckets.sql` aplicada en el
  proyecto Supabase de produccion el 2026-07-09.
- Consulta de verificacion devuelta en `true`: tabla existe, RPC existe, sin
  grants a usuarios normales y con execute para `service_role`.
- Variable Vercel Production `SERVER_RATE_LIMIT_BACKEND=supabase` anadida.
- Admin > Errores y salud lee los contadores recientes por namespace y alerta si
  hay volumen anomalo o muchos origenes distintos contra rutas protegidas.
- El log `FACTU_SECURITY_HEALTH_V1` se puede copiar desde admin y pegar en Codex
  para analizar picos sin exponer identificadores reales.

Verificacion realizada:

1. Produccion desplegada desde `main`.
2. Endpoint con rate limit probado mediante `/api/security/csp-report`.
3. Bucket `security_csp_report` observado en Supabase tras la llamada.
4. Panel admin preparado para resumir buckets recientes y generar log copiable.
5. Si Supabase no estuviera disponible, el codigo vuelve a memoria para no
   tumbar rutas sensibles.

## WAF y bot protection

No activado por codigo.

Motivo:

- Depende del proveedor DNS/CDN elegido.
- Puede generar falsos positivos en registro/login.
- Scraping no se elimina al 100%; se reduce con rate limits, robots, noindex,
  WAF, reglas por pais/ASN y bot protection.

Estado actual:

- `robots.txt` bloquea rutas privadas para crawlers educados.
- Rutas privadas llevan `X-Robots-Tag: noindex, nofollow, noarchive`.
- APIs sensibles tienen rate limit.
- Admin > Errores y salud muestra senales de abuso/scraping cuando los
  contadores distribuidos pasan umbrales de vigilancia o accion.
- Futuro recomendado: WAF/bot protection si aparecen picos, scraping real o
  abuso de registro/login.

## Revision mensual Supabase

Hecho:

- Checklist actualizado.
- Recordatorio mensual creado en Codex:
  `revisi-n-mensual-supabase-seguridad`.

Revisar cada mes:

- Security Advisor.
- Performance Advisor.
- Auth: limites, sesiones, callbacks y CAPTCHA.
- Logs de Auth/API/DB.
- Backups diarios.
- Buckets Storage publicos.
- CSP reports.
- Log copiable `FACTU_SECURITY_HEALTH_V1` de Admin > Errores y salud.
- Estado de Vercel Production Domain.
- Necesidad real de WAF/bot protection.

## Pendiente seguro

- WAF/bot protection solo si hay senales reales o decision comercial.
- El panel admin ayuda a detectar senales, pero no bloquea bots avanzados por si
  solo. Si se confirma abuso real, evaluar WAF/bot protection externo.
