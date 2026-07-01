# Plan por fases — qué haces tú vs qué hace el código

Usa este documento como hoja de ruta. Marca cada ítem al completarlo.

**Producción:** https://facturacion-autonomos.app  
**Repo:** https://github.com/puntoracingrc/Factu-Autonomo

---

## Ya hecho (código desplegado)

- [x] App en Vercel + GitHub `main`
- [x] Veri\*Factu MVP (huella v0.1.2, QR, rectificativas, sin borrar emitidas)
- [x] Declaración responsable art. 15 (generada en la app)
- [x] Encabezado emisor congelado al emitir
- [x] Verificación de cadena de huellas en Configuración
- [x] `.env.example` con todas las variables
- [x] Guías: `PRODUCTOR_SIF.md`, `VERIFACTU.md`, `DEPLOY.md`

---

## Fase 0 — Tú: figura legal y productor

**Solo tú.** El código no puede darte de alta en Hacienda.

- [ ] Autónomo o SL con epígrafe coherente (software / SaaS)
- [ ] NIF/CIF, razón social, domicilio postal, email de soporte
- [ ] Revisar `/legal/terminos` y `/legal/privacidad` (asesoría recomendada)

**Siguiente:** Fase 1 en paralelo.

---

## Fase 1 — Tú: Supabase

En [supabase.com](https://supabase.com) → SQL Editor, **en orden**:

1. [ ] `supabase/schema.sql`
2. [ ] `supabase/billing.sql`
3. [ ] `supabase/billing-scans.sql` y `supabase/billing-scan-credits.sql` (si aún no están)
4. [ ] `supabase/referrals.sql` (programa invita a un amigo)
5. [ ] `supabase/verifactu.sql`

Copia URL + anon key + service role key.

---

## Fase 2 — Tú: variables Vercel + redeploy

Vercel → Settings → Environment Variables → **Redeploy** sin caché.

Plantilla completa: **`.env.example`** en la raíz del repo.

### Mínimo imprescindible ahora

- [ ] `NEXT_PUBLIC_VERIFACTU_DEVELOPER_NIF`
- [ ] `NEXT_PUBLIC_VERIFACTU_DEVELOPER_NAME`
- [ ] `NEXT_PUBLIC_VERIFACTU_DEVELOPER_ADDRESS`
- [ ] `NEXT_PUBLIC_VERIFACTU_DEVELOPER_CITY`
- [ ] `NEXT_PUBLIC_VERIFACTU_DEVELOPER_EMAIL`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### Comprobar

- [ ] `/legal/declaracion-responsable` — sin `PENDIENTE-NIF`
- [ ] Configuración → Veri\*Factu → “Configuración del productor: completa”
- [ ] Configuración → crear cuenta cloud

---

## Fase 3 — Tú: Stripe (cobrar Pro)

Ver `docs/DEPLOY.md` y `docs/VERCEL_PRODUCCION.md`.

- [ ] Cuenta Stripe + producto Pro (5,99 €/mes, 49 €/año)
- [ ] Webhook → `https://facturacion-autonomos.app/api/webhooks/stripe`
- [ ] Variables `STRIPE_*` y `NEXT_PUBLIC_BILLING_ENABLED=true`
- [ ] Prueba con tarjeta `4242 4242 4242 4242`

---

## Fase 4 — Tú: probar Veri\*Factu

- [ ] Datos de emisor en Configuración (tu negocio de prueba)
- [ ] Emitir factura → PDF con QR
- [ ] Validar QR en https://prewww2.aeat.es
- [ ] Rectificar una factura → comprobar R1/R4
- [ ] Configuración → “Verificar cadena de huellas” → debe salir OK

Si algo falla, dímelo y lo corregimos en código.

---

## Fase 5 — Tú + código: remisión real AEAT

**Tú:**

- [ ] Certificado FNMT o sello de empresa → P12
- [ ] `VERIFACTU_CERT_P12_BASE64`, `VERIFACTU_CERT_PASSWORD`
- [ ] `VERIFACTU_AEAT_SUBMIT=true`, `VERIFACTU_ENVIRONMENT=test`
- [ ] `VERIFACTU_AEAT_CERT_CHANNEL=personal` para la opción A

**Código:**

- [x] mTLS con certificado en servidor
- [x] XML base oficial `RegFactuSistemaFacturacion`
- [ ] Registro de eventos completo

---

## Fase 6 — Tú: lanzamiento

- [ ] Dominio propio (opcional)
- [ ] Política reembolsos, analytics, marketing
- [ ] Actualizar declaración al cambiar versión (`NEXT_PUBLIC_APP_VERSION`)

---

## Backlog estratégico futuro

Documentación de investigación que no implica implementación inmediata:

- [ ] `docs/research/regulatory-change-monitor-v1.md` — vigilancia normativa y técnica interna, backoffice administrativo, evidencias, fuentes oficiales y revisión humana obligatoria antes de cualquier cambio legal/técnico.

---

## Cuando termines una fase

Escríbeme: **“Fase X hecha”** y seguimos con la siguiente.
