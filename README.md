# Facturación Autónomos

Programa de facturación **sencillo** para autónomos. Funciona en **PC, iPhone y Android** desde el navegador (no hace falta instalar nada complicado).

## ¿Qué puedes hacer?

- Guardar **clientes** y reutilizarlos en facturas, recibos y presupuestos
- Crear **facturas**, **presupuestos** y **recibos** en PDF
- Registrar **gastos y compras**
- Guardar **proveedores**
- Ver un **resumen** de ingresos, gastos y balance (acumulado y trimestral con Pro)
- Plan **Gratis** o **Pro** (5,99 €/mes) — ver `/precios` y `docs/MARKET_PRICING.md`

## Empezar (para ti o alguien sin experiencia técnica)

1. Abre una terminal en esta carpeta
2. Escribe: `npm install` (solo la primera vez)
3. Escribe: `npm run dev`
4. Abre en el navegador: **http://localhost:3000**

### En el móvil

- Conecta el móvil a la misma WiFi que el PC, o despliega en internet (Vercel)
- Abre la dirección en Safari (iPhone) o Chrome (Android)
- Menú → **Añadir a pantalla de inicio** — quedará como una app

## Tus datos

Puedes empezar sin cuenta y guardar los datos **en tu dispositivo**. Al crear
una cuenta con nube activa, la app sincroniza cada usuario de forma aislada con
Supabase y permite copias adicionales en Google Drive. La cuenta incluye
confirmacion de email y recuperacion de contraseña.

## Tecnología

Next.js · React · TypeScript · Tailwind CSS · Supabase · Stripe · Vercel · PWA

El estado de seguridad vigente se concentra en
`docs/operacion/security-current-state.md`. La configuración de despliegue y
secretos está en `docs/VERCEL_PRODUCCION.md`. El PDF consolidado está en
`output/pdf/estado-actual-seguridad.pdf`.
