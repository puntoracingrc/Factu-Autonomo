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
| `OPENAI_API_KEY` | clave de OpenAI (escaneo de gastos y autorrelleno IA de clientes, servidor) |
| `GOOGLE_MAPS_API_KEY` | opcional: Google Geocoding para completar códigos postales desde dirección + ciudad |
| `RESEND_API_KEY` | clave Resend (emails bienvenida) |
| `EMAIL_FROM` | `Factu - Facturación Autónomos <info@facturacion-autonomos.app>` |
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_EMAIL` | `info@facturacion-autonomos.app` |

Después: **Deployments → Redeploy** (sin caché si cambias muchas variables).

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
- **Redirect URLs:** `https://facturacion-autonomos.app/auth/callback`, `http://localhost:3000/auth/callback`

## Estado actual

- App desplegada en dominio propio.
- Sin variables de entorno, billing aparece en “modo desarrollo” (todo desbloqueado).
- Sin Supabase en Vercel (o sin redeploy tras añadirlas): no hay cuenta ni sync en nube.

## Comprobar

1. https://facturacion-autonomos.app/precios — no debe decir “modo desarrollo”.
2. https://facturacion-autonomos.app/api/verifactu/status — `developerUrl` debe ser el dominio nuevo.
3. Configuración → crear cuenta (requiere Supabase + redirect URLs).
4. Pago test con tarjeta `4242 4242 4242 4242`.
