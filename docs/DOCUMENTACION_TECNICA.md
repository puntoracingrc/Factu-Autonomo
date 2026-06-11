# Documentación técnica — Factu Autónomo

**Versión del documento:** junio 2026  
**Repositorio:** `puntoracingrc/Factu-Autonomo`  
**Producción:** https://facturacion-autonomos.app  
**Contacto:** info@facturacion-autonomos.app

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
- Programa **«Invita a un amigo»** (escaneos IA extra para invitador e invitado)

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
| Tests | Vitest (**266 tests**, jun. 2026) |
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
│  /api/referrals/*  /api/webhooks/stripe                      │
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
| `customers` | Clientes persistentes (`streetType`, dirección, CP, ciudad) |
| `suppliers` | Proveedores (`streetType`, dirección, CP, ciudad, web) |
| `counters` | Contadores de uso (documentos/mes para billing) |
| `verifactuChain` | Punta de la cadena de huellas por NIF emisor |
| `meta` | `lastModified`, `lastSyncedAt`, `pendingChanges` |

### Documento (`Document`)

Campos relevantes:

- `type`: `factura` | `presupuesto` | `recibo`
- `number`, `date`, `dueDate` (solo facturas)
- `client`: datos del cliente embebidos (`streetType` + dirección formateada en PDF/listados)
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

Rutas fuera de la barra: `/precios`, `/legal/*`, `/auth/callback`, `/ayuda`.

---

### Manual de usuario (`/ayuda`)

**Público:** guía paso a paso para usuarios (no sustituye esta documentación técnica).

| Pieza | Ubicación |
|-------|-----------|
| Índice y secciones | `src/app/ayuda/`, contenido en `src/lib/manual/sections/` |
| Ayuda contextual (🤖+?) | `FactuHelpButton` en cabecera → `src/lib/manual/route-help.ts` |
| Capturas | `public/ayuda/capturas/` |

**Mantenimiento obligatorio:** cualquier cambio que altere el uso visible de la app debe actualizar el manual **y sustituir las capturas afectadas** en el mismo commit/PR (`npm run manual:screenshots` → `public/ayuda/capturas/`). Regla Cursor: `.cursor/rules/manual-usuario.mdc`. Procedimiento: `src/lib/manual/MAINTENANCE.md`. Verificación: `npm run manual:verify` (incluye test de que existen todos los PNG referenciados).

---

### 5.1 Inicio (`/`)

**Archivo:** `src/app/page.tsx`

Panel de resumen del negocio:

| Elemento | Función |
|----------|---------|
| Accesos rápidos | Botones a avisos, clientes, factura, presupuesto, recibo y gasto |
| `/avisos` | Centro de avisos y recomendaciones (`collectAppRecommendations`) |
| `UsageBanner` / banners fiscales | Consolidados en `/avisos` (ya no en inicio) |

**Integración:** el resumen fiscal (`FiscalSummaryPanel` en `/impuestos`) concentra trimestre, año e historial completo. Los avisos contextuales se generan en `src/lib/recommendations.ts` a partir de perfil, facturas, gastos fijos, billing y sync.

---

### 5.2 Clientes (`/clientes`)

**Archivo:** `src/app/clientes/page.tsx`

| Función | Detalle |
|---------|---------|
| Listado | Ordenación configurable + buscador |
| Alta / edición | Nombre, apellidos, NIF, email, teléfono, **tipo de vía** + **nombre de calle/número**, CP, ciudad, notas |
| Dirección | `StreetTypeSelect` + campo sin prefijos (C/, Avda.); migración automática de direcciones legacy (`customer-address.ts`) |
| Búsqueda | `CustomerListSearch` — filtra por nombre, apellidos, NIF, teléfono, email, dirección |
| Ordenación | `CustomerSortBar`: nombre, apellidos, **volumen facturado**, dirección (A→Z / Z→A o mayor/menor facturación) |
| Total facturado | `customerInvoicedTotal` — suma documentos de venta vinculados al cliente |
| Atajos documento | `CustomerDocumentActions` — enlaces a nueva factura/presupuesto con `?cliente=id` |
| NIF único | `validateUniqueCustomer` / `findCustomerByNif` — no permite duplicar NIF |
| Unificación | Manual (selección múltiple) + banner de duplicados por NIF; `mergeCustomers` enriquece datos |
| Eliminación | Con confirmación |
| Límite Free | Máx. 15 clientes si billing activo |

**Módulos:** `src/lib/customers.ts`, `src/lib/customer-address.ts`, componentes en `src/components/clients/`.

**Integración:** `ClientPicker` en documentos usa `customerToFormValues`; al guardar, `upsertCustomerForDocument` persiste `streetType` y dirección por separado. Los documentos ya emitidos conservan el snapshot del cliente.

---

### 5.3 Facturas (`/facturas`)

**Archivos:** `src/app/facturas/page.tsx`, `nuevo/page.tsx`, `[id]/page.tsx`, `[id]/rectificar/page.tsx`

#### Listado

**Componente:** `DocumentList` (`src/components/documents/DocumentList.tsx`) — compartido por facturas, presupuestos y recibos.

| Función | Detalle |
|---------|---------|
| Orden | **Más reciente primero** por `date` (y `createdAt` como desempate) — `sortDocumentsByNewest` |
| Búsqueda | Número, nombre cliente, NIF, dirección, importe total, factura original (rectificativas) — `filterDocumentsByQuery` |
| Contador | «X de Y resultados» |

- Muestra facturas ordinarias y rectificativas
- Badge **Veri\*Factu** si tiene registro
- Acciones: editar (solo borrador), PDF, email/WhatsApp, marcar cobrado, **recordatorio de pago** (`PaymentReminderButton`), rectificar, eliminar (solo borrador)

#### Crear / editar (`DocumentForm type="factura"`)

| Bloque | Características |
|--------|-----------------|
| Cliente | `ClientPicker` con autocompletado de clientes guardados |
| Fechas | Fecha emisión + fecha vencimiento |
| Conceptos | Líneas: descripción, cantidad, unidad (configurable), precio **con o sin IVA** (`LineItemPriceFields`), IVA % |
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

**Listado:** mismo `DocumentList` (búsqueda ampliada, orden por fecha).

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

**Mismo formulario** que facturas/presupuestos (`DocumentForm type="recibo"`).

**Listado:** mismo `DocumentList` (búsqueda ampliada, orden por fecha).

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
- Filtros por periodo (trimestre, mes, año) y proveedor — `expense-filters.ts`
- Gráfico por proveedor (`ExpenseSupplierDonut`)
- Total del listado
- Badge si proviene de gasto fijo
- Eliminar (no hay edición inline en AppStore)

#### Nuevo gasto (`/gastos/nuevo`)

| Campo | Opciones |
|-------|----------|
| Fecha | Date picker |
| Proveedor | Texto + enlace a proveedor guardado |
| Descripción | Texto libre |
| Importe | Numérico **con opción de introducir importe con IVA incluido** (`ExpenseAmountFields`) |
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

**Archivo:** `src/app/proveedores/page.tsx`

| Función | Detalle |
|---------|---------|
| Listado | Ordenación + buscador; formulario oculto hasta «Nuevo proveedor» |
| Alta / edición | Nombre, NIF, teléfono, web, **tipo de vía** + calle/número, CP, ciudad, notas |
| Volumen compras | `supplierPurchasedTotal` — suma gastos vinculados (por `supplierId` o similitud de nombre) |
| Búsqueda | `SupplierListSearch` |
| Ordenación | `SupplierSortBar`: nombre, **volumen de compras**, dirección |
| Unificación | Manual + banner duplicados; `mergeSuppliers` relink gastos |
| Eliminación | Con confirmación (sin atajos a facturas — no aplican) |

**Módulos:** `src/lib/suppliers.ts`, `src/components/suppliers/`, reutiliza `StreetTypeSelect` y `customer-address.ts` (`normalizeStreetFields`).

**Integración escaneo:** al guardar gasto, `ensureSupplierForExpense` propone vincular o crear proveedor.

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
- **`ReferralCard`**: programa «Invita a un amigo» — código personal, enlace compartible, canje; **+5 escaneos IA** para invitador e invitado (`REFERRAL_BONUS_SCANS`)
- `CloudAccountCard`: registro/login Supabase, sync manual, export/import JSON, campo código de invitación al registrarse

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
| Backend | Supabase: `sync_entities` (datos negocio) + tablas billing/referidos/Veri\*Factu |
| Auth | Email/contraseña, callback `/auth/callback` |
| Modelo | Incremental: `SyncChange[]` con diff por entidad |
| Entidades | document, customer, expense, recurring_expense, supplier, profile, counters |
| Merge | Remoto sobre local con resolución por timestamp |
| Reintento | Cada 30 s si hay cambios pendientes de subir |
| Descarga periódica | Cada 45 s con pestaña visible (misma cuenta en varios dispositivos) |
| Acceso Pro | Requerido cuando `NEXT_PUBLIC_BILLING_ENABLED=true` |
| Backup manual | Export/import JSON (`src/lib/backup.ts`) independiente del sync |
| Referidos | Tras login, `ReferralRedeemOnLogin` aplica código `?ref=` guardado en localStorage |

**Tablas Supabase adicionales (servidor):** `user_subscriptions`, `user_usage`, `referral_codes`, `referral_redemptions`, `verifactu_*`, `payment_receipts`.

**Clave local:** `factura-autonomo-data` en localStorage. Código de invitación pendiente: `fa_pending_referral_code`.

---

## 8. Billing y planes

Activable con `NEXT_PUBLIC_BILLING_ENABLED=true`. Si está desactivado, todos los usuarios tienen capacidades Pro.

| Plan | Documentos/mes | Clientes | Escaneos | Cloud | Export fiscal |
|------|----------------|----------|----------|-------|---------------|
| Free | 10 | 15 | 2 (lifetime) | No | No |
| Trial (14 d) | ∞ | ∞ | 30/mes | Sí | Sí |
| Pro | ∞ | ∞ | 30/mes | Sí | Sí |

**Stripe:** checkout suscripción, portal, webhooks (`/api/webhooks/stripe`), packs de escaneos.

**Programa de referidos** (requiere `supabase/referrals.sql`):

| Pieza | Ubicación |
|-------|-----------|
| Tablas | `referral_codes`, `referral_redemptions` |
| Lógica servidor | `src/lib/billing/referrals.ts`, `grant-bonus-scans.ts` |
| API | `GET /api/referrals/me`, `POST /api/referrals/redeem` |
| UI | `ReferralCard`, `ReferralCapture` (?ref= en URL), `ReferralRedeemOnLogin` |
| Recompensa | 5 escaneos extra por parte; un canje por cuenta; sin auto-referido |

Los escaneos extra se acreditan en `scan_credits` (Pro/trial) o `scan_trial_remaining` (Gratis) vía `grantBonusScans`.

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
| `/api/referrals/me` | GET | Código de invitación y estadísticas del usuario |
| `/api/referrals/redeem` | POST | Canjear código de invitación (Bearer) |
| `/api/webhooks/stripe` | POST | Eventos Stripe |
| `/api/verifactu/register` | POST | Registro Veri\*Factu + AEAT |
| `/api/verifactu/status` | GET | Estado software/entorno/cert |
| `/api/verifactu/declaration` | GET | JSON declaración responsable |
| `/api/email/welcome` | POST | Email bienvenida |
| `/api/email/payment-reminder` | POST | Recordatorio de pago factura |

Autenticación en rutas protegidas: Bearer JWT Supabase (`getUserFromBearer`).

---

## 10. Módulos clave de la librería

| Área | Archivos principales |
|------|---------------------|
| Documentos | `documents.ts` (filtro/búsqueda, orden por fecha), `numbering.ts`, `issuer-snapshot.ts`, `invoice-compliance.ts` |
| Clientes / dirección | `customers.ts`, `customer-address.ts`, `customer-document-links.ts` |
| PDF / share | `pdf.ts`, `pdf-logo.ts`, `share.ts`, `payment-reminder-client.ts` |
| Recibos / rectificativas | `receipts.ts`, `rectificativas.ts`, `quotes.ts` |
| Gastos | `recurring-expenses.ts`, `suppliers.ts`, `expense-filters.ts`, `expense-scan/*` |
| Referidos | `src/lib/billing/referrals.ts`, `referral-codes.ts`, `src/lib/referrals/*` |
| Fiscal | `taxes.ts`, `vat-regime.ts`, `iva.ts`, `periods.ts` |
| Veri\*Factu | `src/lib/verifactu/*` |
| Billing | `src/lib/billing/*` (planes, escaneos, referidos, Stripe) |
| Cloud | `src/lib/cloud/*` |
| UX | `src/lib/factu/*` (asistente Factu, hitos, toasts) |

---

## 11. Tests y calidad

- **266 tests** Vitest en `src/lib/**/*.test.ts` (jun. 2026)
- Cobertura destacada: huellas Veri\*Factu (vectores oficiales AEAT), numeración, impuestos, proveedores, clientes, direcciones, documentos (buscador), rectificativas, billing, referidos
- Build: `npm run build` (Next.js)
- Lint: ESLint

---

## 12. Despliegue

| Entorno | Plataforma |
|---------|------------|
| Producción | Vercel (auto-deploy desde `main`) |
| Variables | Ver `docs/DEPLOY.md`, `docs/VERCEL_PRODUCCION.md` |

Variables críticas: Supabase URL/keys, Stripe keys, OpenAI key (escaneo), Veri\*Factu producer vars, `NEXT_PUBLIC_BILLING_ENABLED`.

**SQL Supabase (orden):** `schema.sql` → `billing.sql` → scans/credits → **`referrals.sql`** → `verifactu.sql` (ver `docs/FASES.md`).

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
9. **Referidos** — requiere migración SQL en Supabase; recompensa en escaneos, no descuento Stripe.
10. **Sin multi-usuario / roles** — una cuenta = un negocio.
11. **Sin integración bancaria** — IBAN solo informativo en PDF.

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
| `/ayuda`, `/ayuda/[slug]` | Manual de usuario | Sí |

---

## 15. Mejoras recientes (jun. 2026)

Resumen de funcionalidades añadidas o ampliadas desde la última revisión mayor del documento:

| Área | Mejora |
|------|--------|
| **Clientes** | Tipo de vía separado; buscador; orden por nombre/apellidos/facturación/dirección; total facturado; atajos factura/presupuesto; NIF único; unificación |
| **Proveedores** | Paridad con clientes (dirección, buscador, orden por compras/dirección); edición; formulario bajo demanda |
| **Documentos** | Listado unificado con búsqueda por NIF, dirección e importe; orden cronológico descendente |
| **Formularios** | Precio/importe introducible **con IVA incluido** en líneas y gastos |
| **Referidos** | Código personal, enlace `?ref=`, +5 escaneos IA para ambos |
| **Gastos** | Filtros de periodo/proveedor; gráfico donut por proveedor |
| **Facturas** | Recordatorio de pago por email |
| **Manual** | `/ayuda` con capturas; regla de mantenimiento en commits |
| **Tests** | Suite ampliada a 266 tests |

---

*Documento actualizado con el estado del código en `main` (jun. 2026): clientes/proveedores con dirección estructurada, buscadores, referidos, listado de documentos mejorado.*
