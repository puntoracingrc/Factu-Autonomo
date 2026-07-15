# Producción — facturacion-autonomos.app

**URL principal:** https://facturacion-autonomos.app  
**URL Vercel (legacy):** https://factu-autonomo.vercel.app  
**Email contacto:** info@facturacion-autonomos.app  
**Repo:** https://github.com/puntoracingrc/Factu-Autonomo

## Dominio

| Host | Comportamiento |
|------|----------------|
| `facturacion-autonomos.app` | Producción (apex) |
| `www.facturacion-autonomos.app` | Redirige al apex |
| `factu-autonomo.vercel.app` | Sigue activo (enlaces antiguos) |

DNS en Vercel → Settings → Domains. Tras cambiar dominio, **Redeploy** obligatorio si actualizas variables.

## Alias automático tras merge

El workflow de GitHub Actions mueve `facturacion-autonomos.app` al deployment de
Vercel asociado al commit de `main` cuando han terminado correctamente:

- `Quality`;
- `Supabase Acceptance`;
- deployment de Vercel en `Production`.

El job se llama `Production Domain` y requiere el secret de GitHub Actions
`VERCEL_TOKEN`. No ejecutes `alias set` manual salvo rollback o incidencia.

## Variables en Vercel → Settings → Environment Variables

Copia desde tu `.env.local` (Production + Preview):

| Variable | Valor |
|----------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://facturacion-autonomos.app` |
| `NEXT_PUBLIC_BILLING_ENABLED` | `true` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | tu `pk_live_...` |
| `STRIPE_SECRET_KEY` | tu `sk_live_...` |
| `STRIPE_PRICE_MONTHLY` | `price_1TpVbwRr6FrMLNZFc8Rn2d7T` |
| `STRIPE_PRICE_YEARLY` | `price_1TpVc8Rr6FrMLNZFtblG0vCk` |
| `STRIPE_PRICE_PRO_PLUS_MONTHLY` | `price_1TpVSNRr6FrMLNZFqOQJZ3wH` |
| `STRIPE_PRICE_PRO_PLUS_YEARLY` | `price_1TpVUKRr6FrMLNZFu5igCCKH` |
| `STRIPE_WEBHOOK_SECRET` | el `whsec_...` del webhook de **esta URL** (ver abajo) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` (sin `/rest/v1/`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` (o legacy `anon` JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` (o legacy `service_role` JWT) |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `true` solo cuando Google OAuth esté configurado en Supabase |
| `NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID` | client id público de Google para iniciar sesión sin mostrar el dominio técnico de Supabase |
| `GOOGLE_AUTH_CLIENT_SECRET` | secreto del cliente OAuth de Google para completar el login con Google en servidor |
| `NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID` | client id público de Google OAuth para guardar copias extra en Drive |
| `GOOGLE_DRIVE_CLIENT_SECRET` | secreto del cliente OAuth de Google, solo servidor, para completar el retorno de Drive |
| `OPENAI_API_KEY` | clave de OpenAI (escaneo de gastos, autorrelleno IA, revisión IA y Voz IA en recordatorios, servidor) |
| `OPENAI_REALTIME_TRANSCRIPTION_MODEL` | opcional, por defecto `gpt-realtime-whisper` para Voz IA en recordatorios |
| `GOOGLE_MAPS_API_KEY` | opcional: Google Geocoding para completar códigos postales desde dirección + ciudad |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | opcional: Google Places en navegador para sugerir direcciones. Debe estar restringida por dominio y APIs de Google Maps/Places |
| `RESEND_API_KEY` | clave Resend (emails bienvenida) |
| `EMAIL_FROM` | `Factu - Facturación Autónomos <hola@mail.facturacion-autonomos.app>` (subdominio verificado en Resend) |
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_EMAIL` | `info@facturacion-autonomos.app` |
| `SERVER_RATE_LIMIT_BACKEND` | `supabase` tras aplicar/verificar la migracion distribuida |
| `SERVER_RATE_LIMIT_SALT` | secreto aleatorio exclusivo; no usar URL, email ni otra clave |
| `CRON_SECRET` | secreto aleatorio compartido con el workflow protegido de alertas |
| `VERCEL_PROJECT_ID` | ID del proyecto `factu-autonomo`, solo servidor |

Después: **Deployments → Redeploy** (sin caché si cambias muchas variables).

## Panel admin de uso Vercel

La pestaña Admin → Errores y salud puede mostrar consumo real de Vercel si se
conecta con un token privado de solo servidor.

Variables:

| Variable | Valor |
|----------|-------|
| `VERCEL_BILLING_API_TOKEN` | token privado de Vercel con permiso de lectura de billing/usage |
| `VERCEL_TEAM_ID` | ID del equipo, por ejemplo `team_...` |
| `VERCEL_BILLING_TEAM_SLUG` | alternativa a `VERCEL_TEAM_ID` si se usa slug |
| `VERCEL_USAGE_PROJECT_SLUG` | `factu-autonomo` |
| `VERCEL_PROJECT_ID` | ID `prj_...` del proyecto para dominio, deployments y Firewall |
| `VERCEL_BILLING_CYCLE_START_DAY` | `15`, según el ciclo visto en Vercel |
| `VERCEL_BILLING_CYCLE_START_HOUR` | `9`, según el ciclo visto en Vercel |

No usar variables `NEXT_PUBLIC_` para este token. Si faltan estas variables, el
admin sigue funcionando y muestra el panel como pendiente de conectar.

## Produccion, CI y dominio en admin

La ruta protegida `/api/admin/operations-status` compara:

- SHA de `main` en GitHub;
- ultimo workflow CI de `main` y ultimo CodeQL visible;
- ultimo deployment Production listo de Vercel;
- deployment al que apunta `facturacion-autonomos.app`;
- configuracion y eventos de Vercel Firewall.

El panel marca rojo si el CI ya termino correctamente pero el dominio sigue en
otro SHA/deployment. Los logs copiables omiten tokens e IPs. La ruta exige admin
con MFA igual que el resto de APIs internas.

## Firewall y bots

Estado aplicado el 2026-07-10:

- Firewall habilitado.
- System Mitigations activo.
- Attack Mode apagado.
- Bot Protection: `Log`.
- AI Bots: `Log`.
- Sin reglas custom, IP blocks, deny o challenge en esta fase.

El modo `Log` no muestra retos ni bloquea usuarios. Admin agrega los eventos de
24 horas por accion/host y elimina la IP antes de devolverlos al navegador.

## Alertas programadas de seguridad

GitHub Actions ejecuta `.github/workflows/security-health-alert.yml` cada 15
minutos y llama a `/api/security/health-alert` con un secreto compartido. El
repositorio usa un runner estandar y es publico. La ruta:

- devuelve `401` si el secreto no coincide;
- solo envia correo si la senal de abuso es roja y reciente;
- deduplica durante seis horas;
- usa `ADMIN_EMAILS` y no incluye IPs, usuarios, tokens ni documentos.

Configuracion necesaria:

- Vercel Production: `CRON_SECRET`.
- GitHub Actions secret: `SECURITY_HEALTH_CRON_SECRET` con el mismo valor.
- El workflow tambien admite ejecucion manual para probar el circuito completo.

Estado operativo verificado el 2026-07-10:

- Token privado activo en Vercel: `Factu Admin Vercel Usage 2026-07`.
- Token duplicado de configuracion `Factu Admin Vercel Usage`: revocado.
- Tras actualizar el secreto se hizo redeploy de produccion y alias explicito de
  `facturacion-autonomos.app` al deployment nuevo.
- `/admin` responde `200`.
- `/api/admin/vercel-usage` sin sesion responde `401`.
- Admin > Errores y salud carga el bloque `VERCEL PRO` con datos reales.

Lectura observada desde Admin > Errores y salud el 2026-07-10:

- Ciclo mostrado por la app: 2026-06-15 11:00 → 2026-07-15 11:00.
- Credito incluido Pro: `20 USD / 20 USD` consumido.
- Coste de ciclo mostrado: `26,65 USD`.
- Bajo demanda mostrado: `6,65 USD`.
- `factu-autonomo` aparecia con consumo bajo en el ciclo: aprox. `0,33 USD`.
- El consumo principal bajo demanda venia de otro proyecto del equipo,
  `regionatlas`, no de `factu-autonomo`.

Rotacion del token:

1. Crear un token nuevo en Vercel con scope del equipo.
2. Guardarlo en Vercel Production como `VERCEL_BILLING_API_TOKEN`.
3. Redeplegar produccion para que las funciones server lean el secreto nuevo.
4. Verificar `/admin`, `/api/admin/vercel-usage` sin sesion (`401`) y el alias
   de `facturacion-autonomos.app`.
5. Revocar el token anterior solo cuando el panel ya cargue con el token nuevo.
6. No documentar nunca el valor del token.

## Google Drive opcional

La copia extra en Drive usa el mismo cliente OAuth de Google, pero con retorno
propio a la app. En Google Cloud, añade como redirect URIs autorizadas:

```
https://facturacion-autonomos.app/drive/callback
http://localhost:3000/drive/callback
http://localhost:3001/drive/callback
```

Si la app OAuth está en modo pruebas, añade el email que vaya a probarlo como
usuario de prueba. Para abrirlo a cualquier usuario habrá que publicar/verificar
la app OAuth de Google.

## Webhook Stripe (producción)

Endpoint:

```
https://facturacion-autonomos.app/api/webhooks/stripe
```

Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`invoice.paid`, `customer.subscription.updated`,
`customer.subscription.deleted` y `customer.updated`.

Antes de publicar el código del webhook debe estar aplicada la migración
`20260713001000_stripe_webhook_idempotency.sql`. Un evento ya procesado devuelve
200; un lease todavía activo devuelve 503 para que Stripe reintente. Los packs
solo se conceden con `payment_status=paid` y una única vez por Checkout Session.
Cada Checkout nuevo de pack declara `scan_pack_atomic_v1`; los eventos
anteriores o ambiguos quedan aparcados con `legacy_review_required`. El contrato
nuevo no modifica el saldo, pero el posible efecto anterior es desconocido y se
reconcilia antes de cualquier concesión manual. La migración se aplica antes que
el despliegue web y, una vez exista tráfico nuevo, solo admite correcciones
hacia delante para no perder el ledger de idempotencia.

El recibo del pack se espera antes de responder 200. Ante un fallo reintentable,
el webhook devuelve 503 y el siguiente intento reconcilia solo el email, sin
volver a conceder créditos. Un rechazo permanente queda durablemente pendiente
y se devuelve como `receiptManualReview`, sin bucle. Resend recibe una clave
idempotente estable por Checkout Session y `payment_receipts` conserva el estado
pendiente/enviado. La misma regla cubre los recibos de renovación `invoice.paid`.

El `whsec_` del webhook local **no sirve** para Vercel: usa el secret del endpoint creado para esta URL.

## Supabase y Google Login

Ver `supabase/README.md`. Resumen:

- **Site URL:** `https://facturacion-autonomos.app`
- **Redirect URLs:** `https://facturacion-autonomos.app/auth/callback`, `http://localhost:3000/auth/callback`, `http://localhost:3001/auth/callback`
- **Google OAuth:** configurar proveedor Google en Supabase Auth antes de poner `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`. El botón usa Google Identity Services y luego crea la sesión en Supabase, para que Google muestre la app pública en vez del dominio técnico del proyecto. Usa variables propias (`NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID` y `GOOGLE_AUTH_CLIENT_SECRET`); Drive queda separado para copias de seguridad.
- **Google Cloud:** añade `https://facturacion-autonomos.app`, `http://localhost:3000` y `http://localhost:3001` como orígenes JavaScript autorizados. Si la app OAuth está en pruebas, añade los emails de prueba o publícala/verifícala antes de abrirla a usuarios reales.
- **Google Drive:** configurar el OAuth client con origen autorizado `https://facturacion-autonomos.app` y, para probar en local, `http://localhost:3000` y `http://localhost:3001`. La copia extra en Drive usa `drive.file` y se activa aparte desde Cuenta.

## Estado actual

- App desplegada en dominio propio.
- Sin variables de entorno, billing aparece en “modo desarrollo” (todo desbloqueado).
- Sin Supabase en Vercel (o sin redeploy tras añadirlas): no hay cuenta ni sync en nube.

## Comprobar

1. https://facturacion-autonomos.app/precios — no debe decir “modo desarrollo”.
2. https://facturacion-autonomos.app/api/verifactu/status — sin bearer verificado debe responder `401`; con sesión responde solo `submissionMode: "unknown"` y Configuración → Veri\*Factu muestra “Estado no verificado”.
3. Configuración → crear cuenta (requiere Supabase + redirect URLs).
4. Pago test con tarjeta `4242 4242 4242 4242`.
