# Documentación técnica — Factu Autónomo

**Versión del documento:** junio 2026  
**Repositorio:** `puntoracingrc/Factu-Autonomo`  
**Producción:** https://factu-autonomo.vercel.app

---

## Aviso importante — estado del proyecto

**Factu Autónomo es un proyecto en desarrollo activo.** No debe considerarse una aplicación comercial lista para vender ni un SIF (Sistema Informático de Facturación) certificado o validado por la AEAT a día de hoy.

| Aspecto | Estado actual |
|---------|---------------|
| Facturación básica (facturas, presupuestos, recibos) | Funcional en entorno de uso personal / pruebas |
| Veri\*Factu | Implementación parcial: huella, QR, XML y cadena local; remisión real a AEAT **no operativa** (sin mTLS/certificado) |
| Cumplimiento legal / fiscal | Orientativo; el usuario es responsable de validar con su asesor |
| Billing / suscripciones | Implementado pero desactivable (`NEXT_PUBLIC_BILLING_ENABLED`) |
| Sincronización en la nube | Opcional, requiere Supabase + plan Pro cuando billing está activo |
| Escaneo de gastos con IA | Funcional con cuotas; depende de OpenAI |
| Garantía / soporte comercial | No existe |

Este documento describe **lo que está implementado hoy** y **cómo está integrado**, no una hoja de ruta comercial ni una certificación de conformidad.

---

## 1. Resumen del producto

Factu Autónomo es una aplicación web para autónomos y pequeños negocios que centraliza:

- Emisión de **facturas**, **presupuestos** y **recibos**
- Registro de **gastos** (manual, escaneo IA, gastos fijos recurrentes)
- Gestión de **clientes** y **proveedores**
- Resumen **fiscal orientativo** (IVA repercutido/soportado, estimación IRPF)
- Generación de **PDF** con logo, desglose de IVA y QR Veri\*Factu (facturas emitidas)
- Integración opcional con **Veri\*Factu** (cadena de huellas SHA-256 spec AEAT v0.1.2)
- **Sincronización** multi-dispositivo vía Supabase (opcional)
- Modelo de **suscripción** Stripe (Free / Trial / Pro)

La app funciona principalmente como **SPA cliente** (React + Next.js App Router): los datos viven en **localStorage** del navegador y, opcionalmente, se sincronizan con Supabase.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS 4, Lucide icons |
| Estado global | Context API (`AppStore`, `BillingContext`, `CloudSyncContext`) |
| Persistencia local | `localStorage` (`factura-autonomo-data`) |
| PDF | jsPDF + jspdf-autotable |
| QR | qrcode |
| Backend / API | Route Handlers de Next.js (`src/app/api/*`) |
| Auth / sync | Supabase (`@supabase/supabase-js`) |
| Pagos | Stripe (checkout, portal, webhooks) |
| Escaneo gastos | OpenAI Vision (API route) |
| Tests | Vitest (~220 tests) |
| Despliegue | Vercel |

---

## 3. Arquitectura general

```
┌─────────────────────────────────────────────────────────────┐
│  Páginas (App Router)                                       │
│  DocumentForm, ExpenseScanCard, FiscalSummaryPanel, etc.    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  AppStore (Context)                                         │
│  CRUD documentos, gastos, clientes, proveedores, Veri*Factu│
└──────┬───────────────────────────────┬──────────────────────┘
       │                               │
       ▼                               ▼
┌──────────────┐              ┌───────────────────┐
│ localStorage │              │ CloudSyncContext  │
│ (primario)   │◄────────────►│ Supabase sync     │
└──────────────┘              └───────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  API Routes                                                  │
│  /api/verifactu/*  /api/expenses/scan  /api/billing/*        │
│  /api/webhooks/stripe                                        │
└──────────────────────────────────────────────────────────────┘
```

**Principio de diseño:** la app es usable **sin conexión a servicios externos** (excepto funciones que las requieren explícitamente: escaneo IA, sync cloud, Stripe, registro Veri\*Factu en servidor). Los datos del negocio residen en el dispositivo del usuario hasta que activa la cuenta cloud.

---

## 4. Modelo de datos principal

Definido en `src/lib/types.ts`. Estructura raíz `AppData`:

| Entidad | Descripción |
|---------|-------------|
| `profile` | `BusinessProfile` — datos del negocio, IVA, numeración, Veri\*Factu, frases, formas de pago, unidades |
| `documents` | Facturas, presupuestos, recibos (rectificativas = factura + `rectification`) |
| `expenses` | Gastos puntuales |
| `recurringExpenses` | Plantillas de gastos fijos |
| `suppliers` | Proveedores |
| `customers` | Clientes persistentes |
| `counters` | Contadores de uso (documentos/mes para billing) |
| `verifactuChain` | Punta de la cadena de huellas por NIF emisor |
| `meta` | `lastModified`, `lastSyncedAt`, `pendingChanges` |

### Documento (`Document`)

Campos relevantes:

- `type`: `factura` | `presupuesto` | `recibo`
- `number`, `date`, `dueDate` (solo facturas)
- `client`: datos del cliente embebidos
- `items[]`: líneas con `description`, `quantity`, `unit`, `unitPrice`, `ivaPercent`
- `notes`, `paymentTerms`
- `status`: borrador, enviado, aceptado (presupuestos), pagado, vencido, rectificada, anulada
- `issuer`: snapshot congelado del emisor en la emisión
- `rectification`: metadatos si es rectificativa (tipo, factura original, motivo)
- `verifactu`: huella, QR, CSV, estado de remisión
- `sourceDocumentId` / `receiptDocumentId`: vínculo factura ↔ recibo

### Perfil de negocio (`BusinessProfile`)

- Identidad: nombre, NIF, dirección, CP, ciudad, teléfono, email, IBAN, logo
- `iva`: tipos configurables y tipo por defecto
- `vatExempt`: régimen exento (sin IVA en ventas ni deducible en gastos)
- `irpfPercent`: % para estimación modelo 130
- `numbering`: año, formatos por tipo, última secuencia
- `documentPhrases`, `documentPaymentMethods`, `documentUnits`: catálogos configurables
- `verifactu`: `{ enabled, environment: test|production }`

---

## 5. Navegación y secciones de la aplicación

Barra inferior (`AppShell`): Inicio, Clientes, Facturas, Presupuestos, Recibos, Gastos, Impuestos, Proveedores, Ajustes.

Rutas fuera de la barra: `/precios`, `/legal/*`, `/auth/callback`.

---

### 5.1 Inicio (`/`)

**Archivo:** `src/app/page.tsx`

Panel de resumen del negocio:

| Elemento | Función |
|----------|---------|
| Tarjetas ingresos / gastos / balance | Suma documentos cobrados y gastos del periodo |
| `UsageBanner` | Aviso de límites del plan (documentos/mes, clientes) |
| `TaxDeadlineBanner` | Recordatorio plazo modelo 303 |
| `RecurringDueBanner` | Gastos fijos próximos a vencer |
| `FiscalSummaryTeaser` | Acceso rápido a `/impuestos` (resumen completo en Pro) |
| Acciones rápidas | Enlaces a nuevo documento, gasto, cliente |

**Integración:** lee `AppStore.data` y `BillingContext` para calcular totales (`src/lib/income.ts`, `src/lib/taxes.ts`).

---

### 5.2 Clientes (`/clientes`)

**Archivo:** `src/app/clientes/page.tsx`

| Función | Detalle |
|---------|---------|
| Listado | Todos los `Customer` guardados |
| Alta / edición | Nombre, apellidos, NIF, email, teléfono, dirección, notas |
| Eliminación | Con confirmación |
| Límite Free | Máx. 15 clientes si billing activo |
| Vinculación | Al crear documentos, `ClientPicker` permite seleccionar cliente existente o crear uno nuevo (`upsertCustomerForDocument`) |

**Integración:** clientes se reutilizan en facturas, presupuestos y recibos. No se sincronizan automáticamente con documentos ya emitidos si se editan después.

---

### 5.3 Facturas (`/facturas`)

**Archivos:** `src/app/facturas/page.tsx`, `nuevo/page.tsx`, `[id]/page.tsx`, `[id]/rectificar/page.tsx`

#### Listado

- Muestra facturas ordinarias y rectificativas
- Badge **Veri\*Factu** si tiene registro
- Acciones: editar (solo borrador), PDF, email/WhatsApp, marcar cobrado, rectificar, eliminar (solo borrador)

#### Crear / editar (`DocumentForm type="factura"`)

| Bloque | Características |
|--------|-----------------|
| Cliente | `ClientPicker` con autocompletado de clientes guardados |
| Fechas | Fecha emisión + fecha vencimiento |
| Conceptos | Líneas: descripción, cantidad, unidad (configurable), precio, IVA % |
| Forma de pago | Texto libre + selector de formas guardadas en Ajustes |
| Notas | Textarea + frases guardadas por tipo |
| Totales | Base, IVA, total en tiempo real |
| Vista previa PDF | Genera PDF sin guardar (número BORRADOR o real si edición) |
| Guardar | Toast + redirección al listado; PDF opcional en segundo plano |

#### Estados y reglas

| Estado | Comportamiento |
|--------|----------------|
| `borrador` | Editable, eliminable |
| `enviado` / `pagado` / `vencido` | Solo lectura; emisor congelado (`IssuerSnapshot`) |
| Emisión | Valida campos obligatorios del perfil (nombre, NIF, dirección, CP, ciudad) |

#### Marcar como cobrado

- Cambia estado a `pagado`
- Crea **recibo automático** vinculado (`buildReceiptFromInvoice`) copiando líneas, unidades y forma de pago
- El recibo auto-generado **no cuenta** como ingreso fiscal duplicado

#### Rectificativas (`/facturas/[id]/rectificar`)

**Formulario:** `RectificativaForm`

| Tipo | Efecto |
|------|--------|
| Anulación (R1) | Invierte importes; factura original → `anulada` |
| Corrección (R4) | Líneas editables con importes negativos/positivos; original → `rectificada` |

- Numeración propia (`FR-AAAA-NNNN`)
- No editable ni eliminable tras emisión
- Registro Veri\*Factu como alta con TipoFactura R1/R4

#### PDF y envío

- Logo del emisor (perfil o snapshot)
- Tabla de conceptos con unidades formateadas
- Desglose IVA por tipo
- Forma de pago y notas
- IBAN (solo facturas no cobradas)
- QR Veri\*Factu + CSV (si emitida y registrada)
- Marca de agua en modo pruebas

#### Compartir

- Email (`mailto:` + descarga PDF)
- WhatsApp (`wa.me` + mensaje predefinido)
- Web Share API en móvil

---

### 5.4 Presupuestos (`/presupuestos`)

**Mismo formulario** que facturas (`DocumentForm type="presupuesto"`) con diferencias:

| Característica | Presupuesto | Factura |
|----------------|-------------|---------|
| Fecha vencimiento | No | Sí |
| Estado «Aceptado» | Sí (`MarkAsAcceptedButton`) | No |
| Estado «Cobrado» | No (mapeado internamente a aceptado) | Sí |
| Veri\*Factu | No | Sí |
| Rectificativa | No | Sí |
| IBAN en PDF | No | Sí (si pendiente) |

Frases, formas de pago y unidades tienen sección propia en Ajustes (tipo `presupuesto`).

---

### 5.5 Recibos (`/recibos`)

**Mismo formulario** que facturas/presupuestos (`DocumentForm type="recibo"`):

| Característica | Recibo |
|----------------|--------|
| Origen | Manual o auto-generado al cobrar factura |
| Estado | Cobrado (`pagado`) |
| Veri\*Factu | No |
| Fecha vencimiento | No |
| Ingresos fiscales | Sí (excepto recibos auto-generados) |
| Frases / pago / unidades | Sí (configuración tipo `recibo` en Ajustes) |

---

### 5.6 Gastos (`/gastos`)

#### Listado (`/gastos`)

- Gastos ordenados por fecha
- Total del listado
- Badge si proviene de gasto fijo
- Eliminar (no hay edición inline en AppStore)

#### Nuevo gasto (`/gastos/nuevo`)

| Campo | Opciones |
|-------|----------|
| Fecha | Date picker |
| Proveedor | Texto + enlace a proveedor guardado |
| Descripción | Texto libre |
| Importe | Numérico |
| IVA | Selector de tipos del perfil (0 si exento) |
| Categoría | Material, Suministros, Transporte, Alquiler, Seguros, Profesionales, Otros |
| Forma de pago | Efectivo, Tarjeta, Transferencia, Bizum, Domiciliación |
| Notas | Opcional |

#### Escaneo con IA (`ExpenseScanCard`)

Flujo:

1. Usuario sube foto/PDF del ticket o factura de compra
2. Cliente comprime imagen si es foto (`prepare-scan-file.ts`)
3. `POST /api/expenses/scan` → OpenAI extrae campos
4. Formulario se rellena con sugerencias
5. Detección de proveedor duplicado (`suppliers.ts`) con opción de fusionar

**Cuotas de escaneo** (si billing activo):

| Plan | Límite |
|------|--------|
| Free | 2 escaneos de prueba (lifetime) |
| Pro / Trial | 30/mes |
| Pack extra | +10 escaneos (€1,99) |

#### Gastos fijos (`/gastos/fijos`)

Plantillas `RecurringExpense`:

| Campo | Opciones |
|-------|----------|
| Nombre / proveedor / importe / IVA / categoría | Igual que gasto puntual |
| Frecuencia | Mensual, trimestral, anual |
| Día de cargo | Inicio/m mitad/fin de mes o día concreto |
| Duración | Indefinida, hasta fecha, N ocurrencias |
| Activo | On/off |

**Generación automática:** `syncRecurringExpenses` crea filas en `expenses` con `recurringExpenseId` + `recurringOccurrenceKey` para evitar duplicados.

**UI de avisos:** `RecurringDueBanner` (inicio), `RecurringUpcomingList` (gastos).

---

### 5.7 Proveedores (`/proveedores`)

| Función | Detalle |
|---------|---------|
| CRUD | Nombre, NIF, email, teléfono, categoría, notas |
| Detección duplicados | Por NIF, nombre exacto o similitud |
| Fusión | `mergeSuppliers` relink gastos al proveedor destino |
| Integración escaneo | Al guardar gasto escaneado, propone vincular o crear proveedor |

---

### 5.8 Impuestos (`/impuestos`)

**Componente principal:** `FiscalSummaryPanel`

Resumen orientativo (no sustituye asesoría fiscal):

| Métrica | Cálculo |
|---------|---------|
| Ingresos | Facturas/recibos emitidos y cobrados (excl. borradores, recibos auto) |
| Gastos | Suma de gastos del periodo |
| IVA repercutido | De líneas de venta |
| IVA soportado / deducible | De gastos (0 si exento) |
| Resultado IVA | Repercutido − deducible |
| IRPF estimado | % configurable sobre beneficio bruto (modelo 130 orientativo) |

**Filtros:** trimestre, año, todo.

**Exportaciones (Pro):**

- CSV trimestral (`export-quarterly.ts`)
- PDF anual (`export-annual-pdf.ts`)

**Teaser en inicio:** versión reducida para usuarios Free.

---

### 5.9 Configuración / Ajustes (`/configuracion`)

Secciones de la página:

#### Cuenta y plan

- `PlanStatusCard`: plan actual, trial, uso
- `SubscriptionBillingCard`: checkout Stripe, portal de cliente
- `CloudAccountCard`: registro/login Supabase, sync manual, export/import JSON

#### Datos del negocio

- Logo (PNG/JPG/WebP ≤ 2 MB, base64 en perfil; auto-guardado)
- Nombre*, NIF*, teléfono, email, dirección*, CP*, ciudad*, IBAN

#### Personalización de documentos

| Tarjeta | Función |
|---------|---------|
| `DocumentPhrasesCard` | Frases de notas por tipo (factura / presupuesto / recibo), predeterminada por tipo |
| `DocumentPaymentMethodsCard` | Formas de pago por tipo, predeterminada por tipo |
| `DocumentUnitsCard` | Unidades activas (ud, m, m², ml, km, h, día, mes, serv., kg, t…) y unidad por defecto |

#### Régimen fiscal

- Exento de IVA (checkbox)
- IRPF % (modelo 130)
- Tipos de IVA editables + tipo por defecto

#### Numeración

- Año en curso
- Plantilla de formato (`{num}`, `{year}`)
- Última secuencia por tipo: F (factura), FR (rectificativa), P (presupuesto), R (recibo)
- Vista previa del siguiente número

#### Veri\*Factu

- `VerifactuSettingsCard`: activar/desactivar, entorno test/producción
- Verificación de integridad de cadena de huellas
- Estado del productor SIF (variables de entorno del despliegue)

**Nota:** los datos del emisor en documentos **ya emitidos** no cambian aunque se edite el perfil (snapshot congelado).

---

### 5.10 Precios (`/precios`)

**Archivo:** `src/app/precios/page.tsx`

- Comparativa Free vs Pro
- Precios: €5,99/mes o €49/año
- Trial 14 días
- Checkout Stripe (mensual/anual)
- No aparece en la barra de navegación inferior

---

### 5.11 Páginas legales

| Ruta | Contenido |
|------|-----------|
| `/legal/privacidad` | Política de privacidad (borrador) |
| `/legal/terminos` | Términos de uso (borrador) |
| `/legal/declaracion-responsable` | Declaración responsable del SIF (art. 15) — datos del productor desde env vars |

---

## 6. Integración Veri\*Factu

Documentación de despliegue adicional: `docs/VERIFACTU.md`, `docs/PRODUCTOR_SIF.md`.

### 6.1 Cuándo aplica

Función: `needsVerifactuRegistration()` en `src/lib/verifactu/eligibility.ts`

| Condición | Requerido |
|-----------|-----------|
| `profile.verifactu.enabled === true` | Sí (activado por defecto) |
| `doc.type === "factura"` | Solo facturas |
| `doc.status !== "borrador"` | Debe estar emitida |
| NIF emisor presente | Sí |
| Ya registrada | Se omite si `status` es `registered` o `test_registered` |

**No aplica a:** presupuestos, recibos, facturas en borrador.

**Rectificativas:** son `type: "factura"` con `rectification`; se registran como **alta** con TipoFactura R1 (anulación) o R4 (corrección).

### 6.2 Flujo completo al guardar una factura emitida

```
DocumentForm.handleSave()
    │
    ├─► addDocument / updateDocument (AppStore)
    │
    ├─► attachIssuerSnapshot() — congela datos emisor
    │
    ├─► finalizeVerifactuDocument()
    │       │
    │       ├─ ¿needsVerifactuRegistration? → NO → fin
    │       │
    │       ├─ ¿Token Supabase? → POST /api/verifactu/register
    │       │       ├─ OK → guarda verifactu + cadena del servidor
    │       │       └─ Fallo → registro local (fallback silencioso)
    │       │
    │       └─ Sin token → registro local únicamente
    │
    └─► finishDocumentSave() — toast, listado, PDF opcional
```

### 6.3 Registro local vs servidor

| Aspecto | Local (navegador) | Servidor (`/api/verifactu/register`) |
|---------|-------------------|--------------------------------------|
| Requisito | Siempre disponible | Usuario autenticado en Supabase |
| Cadena de huellas | `AppData.verifactuChain` | Tabla `verifactu_chain_state` (prioritaria si hay sesión) |
| Remisión AEAT | Nunca | Intento si `VERIFACTU_AEAT_SUBMIT=true` + certificado |
| CSV | Sintético de prueba | Real de AEAT si remisión OK |
| Persistencia | localStorage | Supabase (`verifactu_records`) |

### 6.4 Algoritmo de huella (AEAT spec v0.1.2)

**Módulos:** `src/lib/verifactu/hash.ts`, `record-input.ts`, `timestamp.ts`

Campos concatenados (registro de alta):

`IDEmisorFactura`, `NumSerieFactura`, `FechaExpedicionFactura`, `TipoFactura`, `CuotaTotal`, `ImporteTotal`, `Huella` (anterior), `FechaHoraHusoGenRegistro`

→ SHA-256 → hex 64 caracteres mayúsculas.

Cada registro encadena con el anterior (`previousHash` → `lastHash` en cadena).

**Verificación manual:** botón en Ajustes → `verifyDocumentHashChain()` recalcula y valida la cadena local.

### 6.5 QR en el PDF

**Módulos:** `src/lib/verifactu/qr.ts`, `qr-image.ts`, `src/lib/pdf.ts`

- URL según entorno: `prewww2.aeat.es` (test) o `www2.agenciatributaria.gob.es` (producción)
- Parámetros: NIF, numserie, fecha, importe
- Bloque PDF: QR 28×28 mm, texto «QR tributario», CSV si existe
- Marca «MODO PRUEBAS» en entorno test

### 6.6 XML y remisión AEAT

- XML generado: `buildRegistroFacturacionXml()` (`src/lib/verifactu/xml.ts`)
- Remisión: `submitRegistroToAeat()` (`src/lib/verifactu/aeat-submit.ts`)
- **Limitación crítica:** el certificado P12 está contemplado en variables de entorno pero **no se usa mTLS real** en el `fetch` actual. La remisión a AEAT es simulada o incompleta.

### 6.7 Configuración del productor SIF (despliegue)

Variables `NEXT_PUBLIC_VERIFACTU_*` — ver `docs/VERIFACTU.md` y `docs/PRODUCTOR_SIF.md`.

Estado visible en Configuración → «Verificación in situ (SIF)» via `getProducerConfigStatus()`.

### 6.8 Estados de registro

| Status | Significado |
|--------|-------------|
| `test_registered` | Registro local en entorno test |
| `registered` | Registro en entorno producción |
| `pending` | Pendiente de remisión |
| `failed` | Error en remisión AEAT |
| `not_required` | No aplica (borrador, tipo no factura, desactivado) |

### 6.9 Fallos y limitaciones Veri\*Factu

| Situación | Comportamiento |
|-----------|----------------|
| Error al calcular huella | Alerta al usuario; documento **ya guardado** sin `verifactu` |
| Servidor no disponible | Fallback silencioso a registro local |
| Remisión AEAT fallida | `status: failed`; registro persistido igualmente |
| Documento ya tiene `verifactu` | No reintenta (incluso si `failed`) |
| Multidispositivo | Cadena local y servidor pueden divergir; no hay sync automático de cadena |

**Aspectos no implementados o WIP:**

- mTLS con certificado FNMT/sello
- Registro de eventos SIF completo
- Validación XSD estricta del XML
- `RegistroAnulacion` AEAT desde UI (rectificativas usan alta R1/R4)
- Reintento automático de registros fallidos
- Modo dual VERI\*Factu + no-VERI\*Factu certificado

---

## 7. Sincronización en la nube

**Contexto:** `CloudSyncContext` (`src/context/CloudSyncContext.tsx`)

| Aspecto | Detalle |
|---------|---------|
| Backend | Supabase, tabla `sync_entities` |
| Auth | Email/contraseña, callback `/auth/callback` |
| Modelo | Incremental: `SyncChange[]` con diff por entidad |
| Entidades | document, customer, expense, recurring_expense, supplier, profile, counters |
| Merge | Remoto sobre local con resolución por timestamp |
| Reintento | Cada 30 s si hay cambios pendientes |
| Acceso Pro | Requerido cuando `NEXT_PUBLIC_BILLING_ENABLED=true` |
| Backup manual | Export/import JSON (`src/lib/backup.ts`) independiente del sync |

**Clave local:** `factura-autonomo-data` en localStorage.

---

## 8. Billing y planes

Activable con `NEXT_PUBLIC_BILLING_ENABLED=true`. Si está desactivado, todos los usuarios tienen capacidades Pro.

| Plan | Documentos/mes | Clientes | Escaneos | Cloud | Export fiscal |
|------|----------------|----------|----------|-------|---------------|
| Free | 10 | 15 | 2 (lifetime) | No | No |
| Trial (14 d) | ∞ | ∞ | 30/mes | Sí | Sí |
| Pro | ∞ | ∞ | 30/mes | Sí | Sí |

**Stripe:** checkout suscripción, portal, webhooks (`/api/webhooks/stripe`), packs de escaneos.

**Contador local:** `fa_billing_usage_v1` en localStorage.

---

## 9. API Routes

| Ruta | Método | Función |
|------|--------|---------|
| `/api/expenses/scan` | GET, POST | Cuota de escaneos; extracción OpenAI |
| `/api/billing/checkout` | POST | Checkout suscripción Stripe |
| `/api/billing/checkout-scan-pack` | POST | Compra pack escaneos |
| `/api/billing/portal` | POST | Portal cliente Stripe |
| `/api/billing/profile` | GET | Perfil billing Supabase |
| `/api/webhooks/stripe` | POST | Eventos Stripe |
| `/api/verifactu/register` | POST | Registro Veri\*Factu + AEAT |
| `/api/verifactu/status` | GET | Estado software/entorno/cert |
| `/api/verifactu/declaration` | GET | JSON declaración responsable |
| `/api/email/welcome` | POST | Email bienvenida |

Autenticación en rutas protegidas: Bearer JWT Supabase (`getUserFromBearer`).

---

## 10. Módulos clave de la librería

| Área | Archivos principales |
|------|---------------------|
| Documentos | `documents.ts`, `numbering.ts`, `issuer-snapshot.ts`, `invoice-compliance.ts` |
| PDF / share | `pdf.ts`, `pdf-logo.ts`, `share.ts` |
| Recibos / rectificativas | `receipts.ts`, `rectificativas.ts`, `quotes.ts` |
| Gastos | `recurring-expenses.ts`, `suppliers.ts`, `expense-scan/*` |
| Fiscal | `taxes.ts`, `vat-regime.ts`, `iva.ts`, `periods.ts` |
| Veri\*Factu | `src/lib/verifactu/*` |
| Billing | `src/lib/billing/*` |
| Cloud | `src/lib/cloud/*` |
| UX | `src/lib/factu/*` (asistente Factu, hitos, toasts) |

---

## 11. Tests y calidad

- **220 tests** Vitest en `src/lib/**/*.test.ts`
- Cobertura destacada: huellas Veri\*Factu (vectores oficiales AEAT), numeración, impuestos, proveedores, rectificativas, billing
- Build: `npm run build` (Next.js)
- Lint: ESLint

---

## 12. Despliegue

| Entorno | Plataforma |
|---------|------------|
| Producción | Vercel (auto-deploy desde `main`) |
| Variables | Ver `docs/DEPLOY.md`, `docs/VERCEL_PRODUCCION.md` |

Variables críticas: Supabase URL/keys, Stripe keys, OpenAI key (escaneo), Veri\*Factu producer vars, `NEXT_PUBLIC_BILLING_ENABLED`.

---

## 13. Limitaciones generales del producto (resumen)

1. **Proyecto en desarrollo** — no comercializable como SIF certificado.
2. **Datos en el navegador** — riesgo de pérdida si no hay backup ni sync cloud.
3. **Sin edición de gastos** — solo alta y borrado.
4. **Veri\*Factu incompleto** — cadena y QR funcionan; remisión AEAT real no operativa.
5. **Fiscal orientativo** — no sustituye gestoría ni modelos oficiales.
6. **Legal en borrador** — privacidad y términos no revisados legalmente.
7. **Billing opcional** — puede estar desactivado en producción.
8. **Dependencia OpenAI** — escaneo requiere API externa y tiene cuotas.
9. **Sin multi-usuario / roles** — una cuenta = un negocio.
10. **Sin integración bancaria** — IBAN solo informativo en PDF.

---

## 14. Mapa de rutas completo

| Ruta | Tipo | Shell |
|------|------|-------|
| `/` | Dashboard | Sí |
| `/clientes` | Clientes CRUD | Sí |
| `/facturas` | Listado facturas | Sí |
| `/facturas/nuevo` | Crear factura | Sí |
| `/facturas/[id]` | Editar/ver factura | Sí |
| `/facturas/[id]/rectificar` | Rectificativa | Sí |
| `/presupuestos` | Listado presupuestos | Sí |
| `/presupuestos/nuevo` | Crear presupuesto | Sí |
| `/presupuestos/[id]` | Editar/ver presupuesto | Sí |
| `/recibos` | Listado recibos | Sí |
| `/recibos/nuevo` | Crear recibo | Sí |
| `/recibos/[id]` | Editar/ver recibo | Sí |
| `/gastos` | Listado gastos | Sí |
| `/gastos/nuevo` | Nuevo gasto + escaneo | Sí |
| `/gastos/fijos` | Gastos recurrentes | Sí |
| `/proveedores` | Proveedores | Sí |
| `/impuestos` | Resumen fiscal | Sí |
| `/configuracion` | Ajustes | Sí |
| `/precios` | Planes | Sí |
| `/auth/callback` | OAuth Supabase | No |
| `/legal/privacidad` | Legal | No |
| `/legal/terminos` | Legal | No |
| `/legal/declaracion-responsable` | SIF | No |

---

*Documento generado a partir del estado del código en la rama `main`. Actualizar cuando cambien funcionalidades relevantes.*
