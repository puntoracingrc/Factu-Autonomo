# ✅ Lo que solo tú puedes hacer

**Hoja de ruta por fases:** [`docs/FASES.md`](FASES.md) ← empieza aquí.

El código de monetización está implementado y probado. Para **cobrar dinero real**, completa esta lista en orden.

## Obligatorio (sin esto no hay ingresos)

- [ ] **Cuenta Stripe** — verificar negocio, activar pagos en EUR, crear producto Pro (5,99 €/mes y 49 €/año).
- [ ] **Proyecto Supabase en producción** — ejecutar `schema.sql` + `billing.sql`.
- [ ] **Desplegar en Vercel** (u otro host) con dominio propio.
- [ ] **Variables de entorno** — ver `docs/DEPLOY.md` y `.env.example`.
- [ ] **Webhook Stripe** apuntando a `/api/webhooks/stripe` con los 3 eventos indicados.
- [ ] **Activar facturación:** `NEXT_PUBLIC_BILLING_ENABLED=true` en producción.
- [ ] **Probar un pago real** (o en test mode primero) de punta a punta: registro → checkout → Pro activo.

## Legal y negocio (recomendado antes de publicitar)

- [ ] Revisar textos en `/legal/privacidad` y `/legal/terminos` con asesoría si facturas como negocio.
- [ ] Alta de autónomo / SL y capacidad de emitir facturas a tus clientes.
- [ ] Política de reembolsos (14 días) comunicada en web o términos.
- [ ] Email de soporte (ej. `hola@tu-dominio.com`) en configuración o pie de página.

## Marketing (cuando lo anterior esté listo)

- [ ] Publicar landing / precios en redes o foros de autónomos.
- [ ] Configurar analytics (Vercel Analytics, Plausible, etc.).
- [ ] Opcional: Resend/SendGrid para emails de bienvenida y recordatorios trimestrales.

## No necesitas hacer

- El código de planes, límites, Stripe Checkout, webhook y export CSV ya está hecho.
- Los tests (`npm test`) cubren la lógica de billing.
- En local, sin `BILLING_ENABLED`, la app funciona como antes (todo desbloqueado).

## Comandos útiles

```bash
cd ~/Projects/factura-autonomo
npm test          # 100+ tests
npm run lint
npm run build     # verificar antes de deploy (sin dev server activo)
```

## Veri*Factu (antes de julio 2027)

- [ ] Ejecutar `supabase/verifactu.sql` en Supabase.
- [ ] Poner tu **NIF real** en Configuración (emisor).
- [ ] Como **productor del software**, completar `docs/PRODUCTOR_SIF.md` (NIF, domicilio, declaración art. 15).
- [ ] Configurar `NEXT_PUBLIC_VERIFACTU_DEVELOPER_*` en Vercel (ver `docs/VERIFACTU.md`).
- [ ] Probar una factura emitida: debe mostrar badge **Veri*Factu** y QR en el PDF.
- [ ] Validar el QR en https://prewww2.aeat.es (entorno pruebas).
- [ ] (Opcional producción) Certificado FNMT o sello + variables `VERIFACTU_CERT_*` y `VERIFACTU_AEAT_SUBMIT=true`.

Detalle técnico: `docs/VERIFACTU.md`.

## Soporte

Si algo falla tras el deploy, revisa en orden: variables Vercel → logs webhook Stripe → tabla `user_subscriptions` en Supabase.
