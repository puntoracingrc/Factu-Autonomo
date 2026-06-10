# Producción — factu-autonomo.vercel.app

**URL:** https://factu-autonomo.vercel.app  
**Repo:** https://github.com/puntoracingrc/Factu-Autonomo

## Variables en Vercel → Settings → Environment Variables

Copia desde tu `.env.local` (Production + Preview):

| Variable | Valor |
|----------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://factu-autonomo.vercel.app` |
| `NEXT_PUBLIC_BILLING_ENABLED` | `true` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | tu `pk_test_...` |
| `STRIPE_SECRET_KEY` | tu `sk_test_...` |
| `STRIPE_PRICE_MONTHLY` | `price_1TgeydRr6FrMLNZFM5rSFVSY` |
| `STRIPE_PRICE_YEARLY` | `price_1TgeydRr6FrMLNZFtk6bvDjH` |
| `STRIPE_WEBHOOK_SECRET` | el `whsec_...` del webhook de **esta URL** (ver abajo) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` (sin `/rest/v1/`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` (o legacy `anon` JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` (o legacy `service_role` JWT) |
| `OPENAI_API_KEY` | clave de OpenAI (escaneo de gastos, servidor) |

Después: **Deployments → Redeploy** (sin caché si cambias muchas variables).

## Webhook Stripe (producción)

Endpoint:

```
https://factu-autonomo.vercel.app/api/webhooks/stripe
```

Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

El `whsec_` del webhook local **no sirve** para Vercel: usa el secret del endpoint creado para esta URL.

## Estado actual

- App desplegada y usable (facturas, gastos, resumen).
- Sin variables de entorno, billing aparece en “modo desarrollo” (todo desbloqueado).
- Sin Supabase en Vercel (o sin redeploy tras añadirlas): no hay cuenta ni sync en nube.

## Comprobar

1. https://factu-autonomo.vercel.app/precios — no debe decir “modo desarrollo”.
2. Configuración → crear cuenta (requiere Supabase).
3. Pago test con tarjeta `4242 4242 4242 4242`.
