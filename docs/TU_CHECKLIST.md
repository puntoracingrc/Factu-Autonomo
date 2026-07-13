# ✅ Lo que solo tú puedes hacer

**Hoja de ruta por fases:** [`docs/FASES.md`](FASES.md) ← empieza aquí.

El código de monetización, sincronización fiscal con Stripe y recibos por email está implementado. Para **cobrar dinero real**, completa esta lista en orden.

## Obligatorio (sin esto no hay ingresos)

- [ ] **Cuenta Stripe** — verificar negocio, activar pagos en EUR.
- [ ] **Productos Stripe:**
  - Pro mensual **5,99 €** y anual **49 €** (recurrentes).
  - Pack escaneos **1,99 €** (pago único, 10 escaneos).
- [ ] **Proyecto Supabase en producción** — ejecutar en el SQL Editor, en orden:
  - `supabase/schema.sql`
  - `supabase/billing.sql`
  - `supabase/billing-scans.sql`
  - `supabase/billing-scan-credits.sql`
  - `supabase/billing-ai-units.sql`
  - `supabase/billing-profile.sql`
  - `supabase db push` con todas las migraciones, incluida
    `20260713001000_stripe_webhook_idempotency.sql`
  - revisar que `legacy_review_required` no contenga eventos ambiguos antes de
    dar por cerrado el corte; contrastar primero Stripe y el saldo, porque el
    efecto anterior puede haberse aplicado aunque no conste el cierre
  - reconciliar también cualquier pack v1 creado antes de
    `2026-07-13T01:35:00Z`; el worker antiguo pudo acreditarlo antes de que el
    ledger atómico quedara activo y el webhook lo aparca sin sumar de nuevo
- [ ] **Desplegar en Vercel** con dominio propio.
- [ ] **Variables de entorno** — ver `docs/DEPLOY.md`.
- [ ] **Webhook Stripe** → `/api/webhooks/stripe` con eventos:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `invoice.paid`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.updated`
- [ ] **Activar facturación:** `NEXT_PUBLIC_BILLING_ENABLED=true` en producción.
- [ ] **Probar un pago** de punta a punta: registro → checkout Pro → plan activo → recibo en email (si Resend configurado).

## Recibos y datos de facturación (recomendado)

- [ ] **Resend** — cuenta + dominio verificado + `RESEND_API_KEY` en Vercel.
- [ ] **EMAIL_FROM** con tu dominio (ej. `Factura Autónomo <hola@tu-dominio.com>`).
- [ ] **Tus datos de emisor** en Vercel (`NEXT_PUBLIC_VERIFACTU_DEVELOPER_*`) — salen en los recibos automáticos.
- [ ] En Stripe Dashboard → activar **facturas automáticas** en la suscripción (para renovaciones con PDF en `invoice.paid`).
- [ ] Tras un pago de prueba, revisar en **Configuración → Facturación de tu suscripción** que aparecen NIF y dirección.

## Legal y negocio (antes de publicitar)

- [ ] Alta de autónomo / SL y capacidad de emitir facturas a tus clientes.
- [ ] Revisar `/legal/privacidad` y `/legal/terminos` con asesoría.
- [ ] Política de reembolsos (14 días) en términos.
- [ ] Email de soporte en pie de página.

## Marketing (cuando lo anterior esté listo)

- [ ] Publicar precios en redes o foros de autónomos.
- [ ] Analytics (Vercel Analytics, Plausible, etc.).

## No necesitas hacer (ya está en el código)

- Planes, límites, checkout Stripe, portal de suscripción.
- Sincronizar NIF/dirección del cliente desde Stripe a Supabase.
- Email de bienvenida y **recibo de pago** tras checkout o renovación.
- Packs de escaneos extra comprables.
- Comparativa de precios en `/precios`.
- Tests: `npm test`.

## Comandos útiles

```bash
cd ~/Projects/factura-autonomo
npm test
npm run lint
npm run build
```

## Veri*Factu (antes de julio 2027)

- [ ] `supabase/verifactu.sql`
- [ ] NIF real en Configuración (emisor de tus facturas a clientes).
- [ ] `docs/PRODUCTOR_SIF.md` y `docs/VERIFACTU.md`.

## Soporte

Si algo falla tras el deploy, revisa en orden:

1. Variables Vercel
2. Logs webhook Stripe
3. Tabla `user_subscriptions` (columnas `billing_*`)
4. Tabla `payment_receipts` (si no llegan emails)
5. `RESEND_API_KEY` y dominio verificado en Resend
