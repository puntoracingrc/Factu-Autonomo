# Probar facturación en local

## 1. Variables en `.env.local`

```env
NEXT_PUBLIC_BILLING_ENABLED=true
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # del paso 3
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
```

## 2. Supabase local

Ejecuta `supabase/schema.sql` y `supabase/billing.sql` en tu proyecto.

## 3. Webhook Stripe en desarrollo

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copia el `whsec_...` que imprime a `.env.local`.

## 4. Flujo de prueba

1. `npm run dev`
2. Configuración → crear cuenta
3. Comprueba trial 14 días (resumen trimestral visible)
4. `/precios` → Pro mensual → tarjeta `4242 4242 4242 4242`
5. Tras el pago, webhook activa `plan=pro` en `user_subscriptions`

## 5. Probar límites gratis

Crea una cuenta nueva sin pagar (o borra la fila en `user_subscriptions`) y crea más de 10 documentos en el mismo mes: debe aparecer el paywall.
