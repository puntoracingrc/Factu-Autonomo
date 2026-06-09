# Factura Autónomo

Programa de facturación **sencillo** para autónomos. Funciona en **PC, iPhone y Android** desde el navegador (no hace falta instalar nada complicado).

## ¿Qué puedes hacer?

- Guardar **clientes** y reutilizarlos en facturas, recibos y presupuestos
- Crear **facturas**, **presupuestos** y **recibos** en PDF
- Registrar **gastos y compras**
- Guardar **proveedores**
- Ver un **resumen** de ingresos, gastos y balance
- Preguntar al **asistente inteligente** sobre tus finanzas

## Empezar (para ti o alguien sin experiencia técnica)

1. Abre una terminal en esta carpeta
2. Escribe: `npm install` (solo la primera vez)
3. Escribe: `npm run dev`
4. Abre en el navegador: **http://localhost:3000**

### En el móvil

- Conecta el móvil a la misma WiFi que el PC, o despliega en internet (Vercel)
- Abre la dirección en Safari (iPhone) o Chrome (Android)
- Menú → **Añadir a pantalla de inicio** — quedará como una app

## Asistente IA

Funciona en **modo básico** sin configurar nada. Si quieres respuestas más inteligentes:

1. Copia `.env.example` a `.env.local`
2. Añade tu clave de OpenAI: `OPENAI_API_KEY=sk-...`

## Tus datos

Todo se guarda **en tu dispositivo** (navegador). No necesitas cuenta ni contraseña.

## Tecnología

Next.js · TypeScript · Tailwind CSS · PWA
