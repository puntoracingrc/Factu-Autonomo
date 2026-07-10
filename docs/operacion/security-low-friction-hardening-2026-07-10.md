# Informe de seguridad sin friccion

Ultima revision: 2026-07-10.

Proyecto: `facturacion-autonomos.app`.

## Objetivo

Reducir ataques, abuso de recursos y scraping sin anadir pasos al registro, la
demo ni la primera factura. Esta fase actua en servidor, GitHub, Vercel y el
panel admin. No obliga a resolver captchas nuevos ni cambia las sesiones de los
usuarios normales.

## Cambios de aplicacion

- Todos los cuerpos JSON y texto leidos directamente por rutas API tienen un
  limite explicito y devuelven `413` antes de procesar cargas excesivas.
- El inventario automatico de APIs enumera cada ruta y metodo, exige una unica
  categoria de acceso y comprueba auth, rate limit, firma de webhooks y limites
  de cuerpo. Una ruta nueva no clasificada rompe el test.
- Stripe mantiene validacion de firma sobre el cuerpo exacto y ahora rechaza
  eventos mayores de 1 MB.
- Resend/Svix mantiene validacion de firma; el fallback legacy usa comparacion
  constante y ambos caminos limitan el cuerpo a 4 MB.
- Los informes CSP quedan limitados a 32 KB.
- El escaneo de gastos limita PDF e imagen a 4 MB, coherente con el limite real
  de Vercel Functions. Tambien valida el flujo aunque falte `Content-Length`.
- Las consultas de cuota y perfil billing tienen rate limit distribuido.
- Los recordatorios de pago conservan el limite corto y anaden un maximo de 50
  envios validos por usuario y dia. Una peticion invalida no consume el cupo
  diario. El `Reply-To` usa el email verificado de la cuenta autenticada.
- El email de bienvenida ya no acepta un nombre HTML proporcionado por una
  llamada publica y escapa el nombre antes de renderizarlo.
- El resumen PDF/TXT/CSV de proveedor se procesa dentro del navegador. Se ha
  eliminado la antigua API publica y las dependencias `pdf-parse` asociadas.
- CSP anade `script-src-attr 'none'` para bloquear manejadores JavaScript inline
  en atributos HTML.

## Deteccion y avisos

- Vercel Cron consulta cada 15 minutos las senales distribuidas de abuso.
- `/api/security/health-alert` exige `CRON_SECRET`, no acepta llamadas publicas
  y solo envia correo si la senal es roja y reciente.
- El aviso se deduplica: como maximo uno cada seis horas mientras continue la
  misma situacion.
- Los correos se envian solo a `ADMIN_EMAILS` y no contienen IPs, hashes,
  tokens, emails de usuarios ni documentos.
- El panel admin agrega GitHub `main`, el ultimo CI, CodeQL, deployment de
  produccion, alias del dominio y Vercel Firewall.
- El dominio se marca rojo si no apunta al ultimo deployment listo o si el SHA
  desplegado no coincide con `main` despues de un CI correcto.
- Los eventos WAF se agregan por accion y host antes de llegar al navegador; la
  direccion IP de origen se descarta en servidor.
- Seguridad, Vercel, Supabase y Errores pueden mostrar aviso rojo o ambar hasta
  que el administrador abra la seccion correspondiente.
- Cada seccion ofrece un log copiable con `CODEX_HANDOFF_CONTEXT_V1`, reglas de
  operacion, repo, despliegue y datos saneados para analizar en otro chat.

## Vercel

Estado aplicado el 2026-07-10:

- Firewall habilitado.
- System Mitigations y DDoS automatico activos.
- Attack Mode apagado para no introducir friccion global.
- Bot Protection en `Log`.
- AI Bots en `Log`.
- Cero reglas de bloqueo, challenge o IP creadas en esta fase.
- `CRON_SECRET`, `SERVER_RATE_LIMIT_SALT` y `VERCEL_PROJECT_ID` guardados como
  variables sensibles de Production. Sus valores no estan en Git ni en docs.

`Log` permite medir falsos positivos y volumen antes de decidir si conviene
pasar Bot Protection a `Challenge` o AI Bots a `Deny`.

## GitHub

Estado aplicado el 2026-07-10:

- Dependabot alerts habilitado.
- Dependabot security updates habilitado.
- CodeQL default setup habilitado para Actions, JavaScript y TypeScript.
- CodeQL ejecuta suite `default`, modelo `remote` y programa semanal.
- Primer setup CodeQL completado correctamente en el run `29110670450`.
- Secret scanning y push protection continuan activos.
- No habia alertas Dependabot abiertas al activar la proteccion.
- Validity checks y non-provider patterns no se pudieron activar en este repo
  personal con la capacidad actual de GitHub; permanecen desactivados.

## Impacto para usuarios

- Registro y login: sin pasos nuevos.
- Demo y primera factura: sin pasos nuevos.
- Google, Drive, Stripe y Supabase Auth: sin cambio de UX.
- Usuarios normales: MFA sigue siendo opcional.
- Escaneo: los PDF mayores de 4 MB muestran un error claro; antes Vercel ya no
  podia aceptar de forma fiable ese tamano dentro del limite de 4,5 MB.
- Resumen de proveedor: deja de subir el archivo al servidor y funciona en el
  dispositivo del usuario.
- Solo un abuso real puede devolver `429`; los limites se aplican por usuario o
  por origen y las cuentas admin mantienen el umbral mas alto de escaneo masivo.

## Pendiente controlado

- Confirmar en Supabase Dashboard si `Leaked password protection` esta activo.
  Supabase Pro lo permite, pero requiere acceso de gestion al proyecto y no se
  cambia mediante service role.
- Mantener Bot Protection y AI Bots en `Log` hasta reunir trafico real. No pasar
  a challenge/deny por intuicion.
- Reducir `unsafe-inline` de `script-src` mediante una migracion de nonces
  separada y pruebas completas de Next.js, Turnstile, Google y mapas.
- PITR queda fuera por decision de coste. Los backups diarios Pro siguen activos.
- Una auditoria ofensiva externa sigue siendo recomendable: este hardening no
  sustituye pruebas de IDOR, RLS, XSS, OAuth, webhooks y logica de negocio.

## Flujo de despliegue

Todo cambio de codigo sigue:

`rama -> commit -> push -> PR -> checks -> merge -> main CI -> Production Domain -> verificacion de produccion`.

No se promueve un deployment manual mientras el flujo normal funcione. Tras el
merge se verifica expresamente que `facturacion-autonomos.app` apunta al SHA de
`main`, porque este proyecto ha sufrido aliases antiguos en Vercel.

## Verificacion de esta fase

Antes del PR:

- tests especificos de limites, API inventory, PDF local, alertas, operaciones,
  admin health y webhooks;
- `npm test` completo;
- `npm run lint`;
- `npx tsc --noEmit`;
- `npm run build`.

Tras el merge debe completarse aqui el PR, run de `main`, deployment y prueba de
produccion.
