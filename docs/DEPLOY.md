# Despliegue y activación de pagos

## 1. Supabase

1. Crea proyecto en [supabase.com](https://supabase.com).
2. SQL Editor → ejecuta en orden:
   - `supabase/schema.sql`
   - `supabase/billing.sql`
3. Copia URL, anon key y **service role key** (solo servidor).

## 2. Stripe

1. Crea cuenta en [stripe.com](https://stripe.com).
2. Producto **Factura Autónomo Pro** con dos precios recurrentes:
   - Mensual: **5,99 EUR** (sin IVA; activa impuestos en Stripe para España).
   - Anual: **49 EUR**.
3. Copia los `price_...` IDs.
4. Developers → Webhooks → endpoint:
   - URL: `https://TU-DOMINIO/api/webhooks/stripe`
   - Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Copia el **webhook signing secret**.

## 3. Vercel

Variables de entorno (Production):

```env
NEXT_PUBLIC_BILLING_ENABLED=true
NEXT_PUBLIC_APP_URL=https://tu-dominio.com

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
```

Despliega:

```bash
npm run build
# o conecta el repo a Vercel
```

## 4. Probar en test

Usa claves `pk_test_` / `sk_test_` y tarjeta `4242 4242 4242 4242`.

Con `NEXT_PUBLIC_BILLING_ENABLED=false` (por defecto en local) todo sigue desbloqueado para desarrollo.

## 5. Portal de cliente Stripe

En Stripe Dashboard → Settings → Billing → Customer portal: activar cancelación y cambio de plan.
