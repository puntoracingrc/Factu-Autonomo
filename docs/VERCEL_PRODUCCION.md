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
| `EMAIL_FROM` | `Factu - Facturación Autónomos <info@facturacion-autonomos.app>` |
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_EMAIL` | `info@facturacion-autonomos.app` |

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
| `VERCEL_BILLING_CYCLE_START_DAY` | `15`, según el ciclo visto en Vercel |
| `VERCEL_BILLING_CYCLE_START_HOUR` | `9`, según el ciclo visto en Vercel |

No usar variables `NEXT_PUBLIC_` para este token. Si faltan estas variables, el
admin sigue funcionando y muestra el panel como pendiente de conectar.

Lectura actual observada el 2026-07-10 en el dashboard Vercel del equipo:

- Ciclo: 2026-06-15 09:00 → 2026-07-15 09:00.
- Crédito incluido Pro: `20 USD / 20 USD` consumido.
- Bajo demanda del equipo: `7,40 USD`.
- `factu-autonomo` tiene margen amplio en el ciclo:
  - `86.520` Edge Requests, aprox. `0,9%` de los `10.000.000` incluidos.
  - `654,47 MB` Fast Data Transfer, aprox. `0,06%` de `1 TB` incluido.
  - `10.095` invocaciones de funciones.
  - `14m 10s` de Fluid Active CPU.
  - `3,5 GB-Hrs` de Fluid Provisioned Memory.
- El consumo principal del equipo venia de otros proyectos, sobre todo
  `regionatlas`, y de Blob Stores.

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

Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

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
2. https://facturacion-autonomos.app/api/verifactu/status — `developerUrl` debe ser el dominio nuevo.
3. Configuración → crear cuenta (requiere Supabase + redirect URLs).
4. Pago test con tarjeta `4242 4242 4242 4242`.
