# Cobro propio de facturas en Fast

Elige «Enlace o QR» al emitir una factura, o «Preparar enlace y QR» en la
confirmación de una factura pendiente. El cliente abre Stripe Checkout sin
necesitar cuenta. La pantalla permite compartir/copiar el enlace y comprobar
el cobro. Un enlace dura 23 horas; tras caducidad confirmada puede renovarse.
La factura siempre existe antes del cobro y no se altera su emisión fiscal.

## Configuración privada de servidor

Apagado por defecto. Todas las variables son exclusivamente de servidor:

| Variable | Contenido |
| --- | --- |
| `QUICK_STRIPE_ENABLED` | `true` para permitir preparar sesiones nuevas |
| `QUICK_STRIPE_COMPANY_ID` | UUID de la empresa autorizada, elegida en ejecución |
| `QUICK_STRIPE_ACCOUNT_ID` | Cuenta de Stripe de esa empresa, verificada por API |
| `QUICK_STRIPE_MODE` | `test` o `live`; claves y eventos deben coincidir |
| `QUICK_STRIPE_SECRET_KEY` | Clave del modo elegido; si falta, se usa `STRIPE_SECRET_KEY` |
| `QUICK_STRIPE_WEBHOOK_SECRET` | Secreto independiente del endpoint de cobros |
| `QUICK_STRIPE_RETURN_ORIGIN` | Origen público de Fast; predeterminado `https://fast.facturacion-autonomos.app` |

Los Secrets se guardan en el gestor de entorno, nunca en Git, capturas o logs.
Un preview de Vercel no admite modo live. Local solo admite retorno HTTP a
localhost en test. La vinculación empresa/cuenta es explícita: este piloto no
hace Connect ni cobra facturas de otros comerciantes con la cuenta de Factu.

## Webhook y despliegue

1. Validar Quality y Supabase Acceptance del commit exacto y la migración nueva.
   No aplicar `db push` al historial antiguo sin reconciliar.
2. Registrar `/api/webhooks/stripe-collections` para los eventos
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`.
   Debe recibir el cuerpo original y su firma. No reutilizar el webhook Billing.
3. Probar en modo test todo el recorrido de checkout, retorno y webhook; consultar
   el ledger y verificar que la factura continúa pendiente de cobro real.
4. Activar live únicamente con la cuenta y la empresa verificadas. Cambiar el
   nombre comercial público no cambia el titular fiscal de Stripe.

La tabla `quick_stripe_payments` y sus RPC son privadas, con RLS y sin grants
al navegador. La confirmación real y el evento central de cobro son atómicos.
Al desactivar `QUICK_STRIPE_ENABLED` se oculta la creación, pero la ruta firmada
sigue procesando pagos ya iniciados mientras se conserve su configuración.
No retirar la migración ni el webhook mientras existan sesiones o pagos.

## Límites de esta entrega

No incluye NFC, Connect, devoluciones desde Fast ni conciliación bancaria.
La confirmación es «cliente pagó a Stripe», nunca «ING recibió el abono».
Una factura editada o cobrada por otra vía después de compartir el enlace puede
recibir dinero por el enlace antiguo: se conserva como cobro en revisión y nunca
sobrescribe la nueva factura. Esa revisión se realiza en Stripe y Factu antes de
volver a cobrar o devolver. No se deduce una devolución fiscal de un reembolso.

## Verificación

- `npx vitest run src/lib/quick-invoicing src/quick-app src/app/api/webhooks/stripe-collections`
- `npm run build:quick` y `node scripts/test-quick-stripe-ui.mjs --local`
- `npm run test:central-global-synthetic` con Supabase disposable de localhost.
- Regresiones de ADR-0007, Quality, tipos, lint y build.

La prueba UI usa datos sintéticos y respuestas simuladas. No demuestra un cargo
real ni sustituye la prueba con Stripe de test y su webhook público. Las pruebas
PostgreSQL ejecutan la migración y el RPC de cobro central de producción sobre
facturas sintéticas, incluida concurrencia, aislamiento, replay y rollback.
