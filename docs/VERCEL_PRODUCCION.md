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
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | tu `pk_test_...` |
| `STRIPE_SECRET_KEY` | tu `sk_test_...` |
| `STRIPE_PRICE_MONTHLY` | `price_1TgeydRr6FrMLNZFM5rSFVSY` |
| `STRIPE_PRICE_YEARLY` | `price_1TgeydRr6FrMLNZFtk6bvDjH` |
| `STRIPE_WEBHOOK_SECRET` | el `whsec_...` del webhook de **esta URL** (ver abajo) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` (sin `/rest/v1/`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` (o legacy `anon` JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` (o legacy `service_role` JWT) |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `true` solo cuando Google OAuth esté configurado en Supabase |
| `NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID` | client id público de Google OAuth para guardar copias extra en Drive |
| `GOOGLE_DRIVE_CLIENT_SECRET` | secreto del cliente OAuth de Google, solo servidor, para completar el retorno de Drive |
| `OPENAI_API_KEY` | clave de OpenAI (escaneo de gastos y autorrelleno IA de clientes, servidor) |
| `GOOGLE_MAPS_API_KEY` | opcional: Google Geocoding para completar códigos postales desde dirección + ciudad |
| `RESEND_API_KEY` | clave Resend (emails bienvenida) |
| `EMAIL_FROM` | `Factu - Facturación Autónomos <info@facturacion-autonomos.app>` |
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_EMAIL` | `info@facturacion-autonomos.app` |

Después: **Deployments → Redeploy** (sin caché si cambias muchas variables).

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

## Supabase (auth)

Ver `supabase/README.md`. Resumen:

- **Site URL:** `https://facturacion-autonomos.app`
- **Redirect URLs:** `https://facturacion-autonomos.app/auth/callback`, `http://localhost:3000/auth/callback`, `http://localhost:3001/auth/callback`
- **Google OAuth:** configurar proveedor Google en Supabase Auth antes de poner `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`. Este login no pide permiso de Drive.
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
