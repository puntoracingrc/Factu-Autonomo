# Informe de fase: endurecimiento adicional de seguridad

Ultima revision: 2026-07-10.

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
- MFA opcional para usuarios queda preparado en Cuenta > Seguridad, sin afectar
  al registro ni a la demo. El rescate de usuario se hace desde admin con codigo
  al email verificado y sesion admin `aal2`.
- Recuperacion de contraseña por email queda incorporada al acceso normal:
  enlace de recuperacion, callback seguro y formulario de nueva contraseña.
- Politica de nuevas contraseñas alineada con un enfoque moderno: minimo 12
  caracteres y sin reglas artificiales de simbolo/mayuscula/numero.
- Rate limit distribuido queda aplicado en Supabase y preparado en Vercel
  mediante `SERVER_RATE_LIMIT_BACKEND=supabase`.
- El panel Admin > Errores y salud muestra senales de abuso/scraping basadas en
  `server_rate_limit_buckets` y ofrece un log copiable para diagnostico sin IPs,
  tokens ni emails.
- El mismo panel muestra consumo/coste real de Vercel Pro con un token privado
  de servidor. El token duplicado creado durante la configuracion fue revocado y
  se mantiene activo solo `Factu Admin Vercel Usage 2026-07`.
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
- PR #341 `Add admin Vercel usage dashboard` mergeado a `main`.
- Workflow `main` 29056651431 completado en verde: Quality, Supabase Acceptance
  y Production Domain.
- Vercel Production tiene configuradas las variables de lectura de uso:
  `VERCEL_BILLING_API_TOKEN`, `VERCEL_TEAM_ID`,
  `VERCEL_BILLING_TEAM_SLUG`, `VERCEL_USAGE_PROJECT_SLUG`,
  `VERCEL_BILLING_CYCLE_START_DAY` y `VERCEL_BILLING_CYCLE_START_HOUR`.
- Tras actualizar el secreto se redeplego produccion, se reasigno
  `facturacion-autonomos.app` al deployment
  `dpl_DhQ6o93ZgzevghZ2ZJsmqxHhkmuq` y se verifico que `/admin` responde `200`.
- `/api/admin/vercel-usage` sin sesion responde `401`, confirmando que el uso de
  Vercel no queda expuesto publicamente.
- Admin > Errores y salud carga `VERCEL PRO` con datos reales; no aparece
  `No se pudo cargar Vercel`.
- El token duplicado `Factu Admin Vercel Usage` fue eliminado/revocado en
  Vercel. El token operativo queda como `Factu Admin Vercel Usage 2026-07`.

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
- Cuenta admin `persianasalmar@gmail.com` verificada manualmente con TOTP real.

Verificacion realizada:

1. Entrar con una cuenta admin.
2. Preparar TOTP desde el panel admin.
3. Verificar el codigo y confirmar que la sesion queda `aal2`.
4. Activar `ADMIN_MFA_REQUIRED=true` en Vercel Production.
5. Desplegar por Git para que Vercel cargue la variable nueva.

## MFA opcional de usuarios

Hecho:

- Cuenta > Seguridad incluye una tarjeta de doble factor TOTP para usuarios
  normales.
- El registro, la demo y la primera creacion de factura no quedan bloqueados por
  MFA; es una proteccion voluntaria para quien quiera maxima seguridad.
- La tarjeta permite activar TOTP, verificar la sesion actual, cancelar una
  configuracion pendiente y anadir un dispositivo de respaldo.
- La tarjeta avisa de que si se pierden todos los factores, soporte debe ayudar
  tras comprobar que la cuenta es del usuario.
- Supabase Auth no ofrece codigos de recuperacion TOTP nativos; por eso se
  recomienda registrar un segundo dispositivo o usar una app autenticadora con
  copia segura.

Recuperacion por admin:

- Nueva tabla interna `admin_mfa_recovery_challenges`, cerrada a `public`,
  `anon` y `authenticated`; solo la usa `service_role`.
- Nueva ruta `/api/admin/users/[userId]/mfa` para listar factores seguros,
  enviar codigo de recuperacion y eliminar un factor perdido.
- La eliminacion de factor exige:
  - admin autenticado y en sesion `aal2`;
  - codigo de 6 digitos enviado al email verificado del usuario;
  - confirmacion manual del email del usuario;
  - maximo 5 intentos por codigo y caducidad de 15 minutos;
  - registro operativo en `app_error_events`.

Riesgo controlado:

- Este rescate sirve para usuarios cuando un admin puede entrar. Si todos los
  admins pierden sus factores a la vez y no hay sesion admin abierta, la
  recuperacion ya no se puede hacer desde el panel y pasa a ser tecnica desde
  Supabase/Vercel.
- No se fuerza MFA a todos los usuarios hasta validar soporte, recuperacion y UX
  con cuentas reales.

## Recuperacion de contraseña

Hecho:

- En Cuenta > Acceso, el modo de inicio de sesion incluye
  "He olvidado mi contraseña".
- La app solicita a Supabase un enlace de recuperacion con redirect de vuelta a
  `/auth/callback?type=recovery`.
- El callback distingue recuperacion de confirmacion de cuenta y redirige a
  `/cuenta?auth=recovery#inicio-sesion`.
- Cuando el enlace abre una sesion valida, Cuenta muestra un formulario para
  guardar una contraseña nueva.

Alcance:

- Aplica a cuentas creadas con email y contraseña.
- No cambia el flujo de Google.
- No obliga a recuperar ni cambiar contraseña durante registro, demo o primer
  uso normal.

Politica aplicada:

- Registro y cambio de contraseña exigen minimo 12 caracteres.
- No se exige simbolo, numero ni mayuscula concreta para evitar patrones
  previsibles como `Factura2026!`.
- Se permite usar frases largas y gestores de contraseña.
- El inicio de sesion no bloquea por longitud para no dejar fuera a cuentas
  antiguas si existieran con una contraseña mas corta.

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

## Observabilidad Vercel Pro

Hecho:

- Admin > Errores y salud consulta la API de billing/usage de Vercel desde una
  ruta admin protegida.
- La ruta `/api/admin/vercel-usage` exige usuario admin y respeta rate limit.
- El token de Vercel vive solo en Vercel Production como secreto sensible
  `VERCEL_BILLING_API_TOKEN`; no se expone al navegador y no tiene prefijo
  `NEXT_PUBLIC_`.
- El panel muestra ciclo de facturacion, credito incluido, coste bajo demanda,
  recursos con mas consumo y proyectos con mayor impacto.
- Verificacion de produccion del 2026-07-10: el coste bajo demanda observado
  venia principalmente de otro proyecto del equipo (`regionatlas`), mientras
  `factu-autonomo` aparecia con consumo bajo en el ciclo.
- El token temporal/duplicado creado durante la configuracion fue revocado tras
  confirmar que el nuevo token seguia alimentando el panel.

Operacion segura:

- Si se rota `VERCEL_BILLING_API_TOKEN`, hay que redeplegar produccion para que
  las funciones server lean el secreto nuevo.
- Tras el redeploy, comprobar `/admin`, `/api/admin/vercel-usage` sin sesion
  (`401`) y el alias de `facturacion-autonomos.app`.
- No pegar tokens en tickets, documentos, chats ni logs.

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
