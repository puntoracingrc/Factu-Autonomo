# Estado actual de seguridad

Ultima comprobacion: 2026-07-15.

Proyecto: `facturacion-autonomos.app`.

Este es el documento principal de seguridad vigente. Describe las protecciones
que existen ahora, como se vigilan desde Admin y que limites siguen abiertos.
No contiene credenciales, tokens, IPs ni datos de usuarios.

## Resumen ejecutivo

La aplicacion combina controles en navegador, servidor, Supabase, Vercel y
GitHub. Las capas principales son autenticacion, aislamiento RLS por usuario,
allowlist de administradores en servidor, CSP en bloqueo, limites distribuidos,
webhooks firmados, WAF, deteccion de abuso y un despliegue que no llega al
dominio hasta superar las pruebas.

El registro, la demo y la primera factura no tienen pasos nuevos. El area
administrativa usa la sesion normal y una allowlist de emails configurada solo
en servidor. Las protecciones adicionales actuan en segundo plano y solo frenan
una peticion cuando supera limites de seguridad o consumo.

## Infraestructura y navegador

- Produccion se sirve exclusivamente por HTTPS desde Vercel.
- HSTS obliga al navegador a mantener HTTPS durante dos anos.
- CSP se aplica en modo bloqueo y limita scripts, conexiones, marcos, imagenes,
  formularios y servicios externos permitidos.
- `script-src-attr 'none'` bloquea JavaScript incrustado en atributos HTML.
- `frame-ancestors 'none'` y `X-Frame-Options: DENY` evitan que la app se
  incruste en otra web para ataques de clickjacking.
- `X-Content-Type-Options: nosniff`, Referrer Policy y Permissions Policy
  reducen exposicion de datos y capacidades innecesarias del navegador.
- Las paginas privadas usan `Cache-Control: no-store` y no se indexan.
- CORS global solo permite el dominio de produccion.
- `robots.txt` excluye admin, APIs, callbacks y zonas privadas para rastreadores
  que respetan el estandar.
- Los informes CSP se reciben en una ruta limitada, saneada y con rate limit.
- Existe un interruptor de emergencia para pasar CSP temporalmente a modo
  informe si una integracion legitima quedara bloqueada.

## Acceso y cuentas

- Supabase Auth gestiona usuarios, sesiones y confirmacion de email.
- Registro e inicio de sesion usan Cloudflare Turnstile contra automatizacion.
- Las cuentas email/contrasena pueden recuperar el acceso mediante enlace al
  email verificado y definir una nueva contrasena dentro de la app.
- Las nuevas contrasenas requieren al menos 12 caracteres. No se fuerzan reglas
  artificiales de simbolos o mayusculas que generan patrones previsibles.
- Google Auth valida origen y URL de retorno.
- Las APIs sensibles validan el bearer token directamente con Supabase.
- Las operaciones sensibles requieren email confirmado.
- Los administradores se definen mediante `ADMIN_EMAILS` de servidor; no hay un
  admin fijo de produccion dentro del codigo.
- Las APIs admin exigen una sesion autenticada cuyo email pertenezca a
  `ADMIN_EMAILS`; las dos cuentas declaradas reciben el mismo alcance.
- El producto no exige ni ofrece alta TOTP para entrar en Admin. Los factores
  antiguos no amplian ni reducen permisos.
- Las cuentas admin tienen IA y escaneos sin consumo de creditos. Los rate
  limits tecnicos permanecen para contener bucles o automatizaciones
  accidentales.

## Datos y Supabase

- RLS esta activo en las tablas con datos de usuario.
- `sync_entities` y `user_backups` quedan aisladas por el `user_id` autenticado.
- Las tablas internas de admin, billing, Stripe, fiscalidad, inbox, restauracion
  y rate limit no son accesibles desde `public`, `anon` ni `authenticated`.
- La service role solo se usa en codigo de servidor y no se envia al navegador.
- La revision de grants peligrosos a `public` y `anon` no encontro permisos
  abiertos criticos.
- La revision de Storage no encontro buckets publicos.
- Supabase Pro mantiene backups diarios con siete dias de retencion y siete
  dias de logs.
- El panel admin permite crear copias privadas y revisar una vista previa, pero
  la aplicacion de restauraciones esta bloqueada de forma fail-closed. Un
  intento de apply responde sin leer ni mutar los datos hasta existir una
  transaccion/RPC o saga reanudable con rollback y evidencia indivisible.

## APIs, archivos y servicios externos

- Cada ruta y metodo API esta clasificado como admin, bearer, publico limitado,
  webhook firmado, programado o controlado por flags.
- Un test de inventario impide incorporar una ruta sin declarar autenticacion,
  rate limit, firma y limite de cuerpo cuando corresponda.
- Las rutas JSON, texto y multipart limitan el tamano real del cuerpo aunque el
  cliente no envie `Content-Length`.
- El escaneo de gastos admite imagen o PDF hasta 4 MB, valida tipo y consume la
  cuota correspondiente.
- Las cuentas admin tienen un umbral especial para escaneos masivos, sin quedar
  bloqueadas por el limite normal de usuario.
- El resumen PDF/TXT/CSV de proveedor se procesa en el dispositivo y no sube el
  archivo a una API publica.
- Stripe valida la firma sobre el cuerpo exacto, limita el payload y aplica
  idempotencia por evento.
- Resend/Svix valida firma o secreto privado con comparacion constante y limita
  el payload.
- Los recordatorios de pago tienen limites cortos y diarios por usuario.
- Google token y Drive validan origen, callback y usuario confirmado.
- Las rutas experimentales de sincronizacion e ingesta permanecen bajo flags y
  no quedan abiertas por defecto.
- Las respuestas privadas evitan cache y los mensajes de error no exponen
  secretos internos.

## Abuso, scraping y consumo

- El rate limit principal es distribuido mediante Supabase y funciona entre
  distintas instancias de Vercel.
- Los identificadores se guardan como hashes con salt privado; no se almacenan
  IPs ni emails en claro en los contadores.
- Si Supabase no esta disponible, existe un fallback en memoria para no tumbar
  rutas sensibles.
- Vercel Firewall y System Mitigations/DDoS estan activos.
- Bot Protection y AI Bots registran actividad en modo `Log` sin desafiar a
  usuarios normales.
- Attack Mode permanece apagado para evitar friccion global injustificada.
- No hay reglas manuales de deny, challenge o bloqueo IP sin evidencia real.
- Un control programado revisa las senales cada 15 minutos y envia email a los
  administradores cuando existe una alerta roja reciente.
- Los avisos iguales se deduplican durante seis horas.
- Los emails y logs de seguridad no incluyen IPs, hashes, tokens, documentos ni
  emails de usuarios.

El scraping no se puede eliminar al 100 %. La defensa actual combina zonas
privadas, RLS, rate limits, cuotas, limites de cuerpo, WAF, deteccion y logs. Un
bloqueo mas agresivo solo debe activarse cuando los eventos reales permitan
distinguir bots de usuarios legitimos.

## Panel de administracion

Admin concentra la informacion operativa en secciones separadas:

- Seguridad: acceso allowlisted, abuso/scraping, alertas programadas y WAF.
- Supabase: usuarios activos, sincronizacion, crecimiento y salud de datos.
- Vercel: consumo Pro, despliegue, dominio y estado del firewall.
- Errores: eventos tecnicos recientes y rutas afectadas.
- Sistema/operaciones: GitHub `main`, CI, CodeQL, deployment y dominio real.

Una seccion aparece en ambar o rojo cuando necesita atencion y conserva el aviso
hasta que el administrador la abre. Los datos se presentan con etiquetas
sencillas, no como registros tecnicos sin contexto.

Cada seccion ofrece un log copiable que incluye:

- estado y senales saneadas;
- contexto del proyecto para Codex;
- ruta del repo y URL de produccion;
- reglas de trabajo seguro;
- flujo obligatorio de Git y verificacion de Production Domain.

Cuando aparezca un aviso rojo:

1. Abrir la seccion indicada y pulsar Actualizar.
2. Leer el resumen visual y copiar el log completo.
3. Pegar el log en Codex sin anadir contrasenas, tokens o documentos reales.
4. No activar bloqueos globales ni cambiar Supabase/Vercel a ciegas.
5. Aplicar cualquier correccion por rama, PR, checks, `main` y verificacion del
   dominio de produccion.

## Git, dependencias y despliegue

- Todo cambio de codigo o documentacion pasa por rama, commit, push y PR.
- `main` exige Quality y Supabase Acceptance.
- CI comprueba convenciones de migraciones, tests, lint, tipos y build.
- Supabase local se levanta en CI para pruebas de aceptacion.
- CodeQL analiza Actions, JavaScript y TypeScript.
- Dependabot alerts y security updates estan activos.
- Secret scanning y push protection estan activos.
- Un push a `main` espera el deployment de Vercel, asigna el dominio y ejecuta
  Production Domain.
- Admin compara el SHA de `main`, CI, deployment y alias. Si el dominio apunta
  a una produccion anterior, la seccion se marca como incidencia.

## Friccion para el usuario

- Registro y login: sin pasos adicionales fuera del CAPTCHA ya integrado.
- Demo y primera factura: sin pasos adicionales.
- Admin: usa la sesion normal y `ADMIN_EMAILS`; no ofrece alta TOTP.
- Google, Drive, Stripe y Supabase Auth: mismo flujo visible.
- Un archivo demasiado grande muestra un error antes de consumir recursos.
- Un `429` solo aparece cuando se supera un limite de seguridad o consumo.
- Las cuentas admin conservan IA y escaneos ilimitados, con rate limits de
  contencion para trabajos masivos autorizados.

## Limites y decisiones pendientes

- Confirmar en Supabase Dashboard si `Leaked password protection` esta activo.
- Mantener Bot Protection y AI Bots en `Log` hasta disponer de trafico real para
  medir falsos positivos.
- CSP todavia permite `unsafe-inline` en `script-src`; retirarlo requiere nonces
  y pruebas completas de Next.js, Turnstile, Google, Drive y Maps.
- La app conserva datos de negocio en `localStorage`; una vulnerabilidad XSS
  tendria impacto alto aunque las capas actuales reducen la probabilidad.
- PITR no esta contratado por decision de coste. Los backups diarios siguen
  activos, pero una restauracion global podria perder cambios posteriores al
  ultimo backup.
- Las migraciones de Supabase pasan por Git y validacion, pero su aplicacion a
  produccion aun requiere un procedimiento controlado.
- WAF no debe pasar a challenge/deny por intuicion.
- Una auditoria ofensiva externa sigue siendo recomendable para probar IDOR,
  RLS, XSS, OAuth, webhooks y logica de negocio con metodologia independiente.

## Verificacion vigente

- Produccion responde correctamente en `/`, `/cuenta` y `/admin`.
- Las APIs admin y el control programado responden `401` sin autorizacion.
- La antigua API publica de resumen de proveedor ya no existe y responde `404`.
- CSP, HSTS, `nosniff`, `DENY`, Referrer Policy y Permissions Policy se sirven
  en produccion.
- El dominio resuelve al deployment READY de la rama `main` vigente.
- Quality, Supabase Acceptance y Production Domain estan en verde.
- La compilacion, tipos, lint, migraciones y auditoria de dependencias pasan.
- La auditoria de dependencias no muestra vulnerabilidades conocidas altas.

## Documentos operativos relacionados

- `docs/operacion/supabase-security-checklist.md`: revision mensual de
  Supabase.
- `docs/VERCEL_PRODUCCION.md`: variables, despliegue y comprobacion de Vercel.
- `AUDITORIA_FACTURA_AUTONOMO.md`: auditoria tecnica historica del conjunto del
  producto, no usar como fotografia actual de seguridad.
