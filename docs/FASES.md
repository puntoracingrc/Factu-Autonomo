# Plan por fases — qué haces tú vs qué hace el código

Usa este documento como hoja de ruta. Marca cada ítem al completarlo.

**Producción:** https://facturacion-autonomos.app  
**Repo:** https://github.com/puntoracingrc/Factu-Autonomo

---

## Ya hecho (código desplegado)

- [x] App en Vercel + GitHub `main`
- [x] Veri\*Factu MVP (huella v0.1.2, QR, rectificativas, sin borrar emitidas)
- [x] Borrador interno de declaración marcado como no válido y no publicado
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

Enlaza el proyecto y ejecuta `supabase db push` para aplicar las migraciones
versionadas completas. `supabase/schema.sql` se conserva únicamente como
fixture histórico de pruebas y no debe usarse para una instalación actual.

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

- [x] `/legal/declaracion-responsable` — contención noindex sin PII ni afirmación de cumplimiento
- [ ] Sustituir la contención por una declaración definitiva solo tras revisión técnica y jurídica
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

> La interfaz pública sigue cerrada. La primera apertura será una sola factura
> central, de un solo usuario, exclusivamente contra preproducción AEAT.

**Tú:**

- [ ] Entregar el certificado FNMT o sello mediante un archivo local seguro,
      nunca por chat, Git ni variable P12 global
- [ ] Aprobar una única factura sintética/controlada con identidad central test
- [ ] Ejecutar la prueba y volver a activar inmediatamente el interruptor de
      emergencia

**Código:**

- [x] mTLS con certificado en servidor
- [x] XML base oficial `RegFactuSistemaFacturacion`
- [x] Importes exigidos para rectificativas sustitutivas
- [x] Certificado cifrado y vinculado a usuario + NIF + entorno test
- [x] Ledger transaccional, leases y reintento del XML exacto ante ambigüedad
- [x] Ruta autenticada que solo acepta el ID del documento central
- [ ] Aplicar las migraciones y ejecutar la prueba mínima contra AEAT
- [ ] Atestación servidor-cliente y apertura pública posterior

---

## Fase 6 — Tú: lanzamiento

- [ ] Dominio propio (opcional)
- [ ] Política reembolsos, analytics, marketing
- [ ] Actualizar declaración al cambiar versión (`NEXT_PUBLIC_APP_VERSION`)

---

## Cuando termines una fase

Escríbeme: **“Fase X hecha”** y seguimos con la siguiente.
