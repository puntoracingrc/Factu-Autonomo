# FASE 2 - Plan tecnico de integridad documental y VeriFactu

Estado: ANALISIS INICIAL CORREGIDO / SIN IMPLEMENTAR

Rama analizada: `feat/phase2-document-integrity`

Fecha: 2026-06-24

Restricciones cumplidas durante este analisis:

- No se ha modificado codigo de producto.
- No se ha hecho commit.
- No se ha hecho deploy ni promocion en Vercel.
- No se ha accedido a Supabase produccion.
- No se han aplicado migraciones.

## 1. Marco normativo usado como referencia

Este plan no sustituye una revision legal, pero toma como criterio tecnico minimo:

- Real Decreto 1007/2023, articulo 8: los sistemas informaticos de facturacion deben garantizar integridad, conservacion, accesibilidad, legibilidad, trazabilidad e inalterabilidad de registros de facturacion. Tambien exige capacidad de remision electronica continuada, segura, correcta, integra, automatica, consecutiva, instantanea y fehaciente de los registros generados.
  Fuente: https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840
- Real Decreto 1007/2023, articulo 9: el registro de facturacion de alta debe generarse automaticamente de forma simultanea o inmediatamente anterior a la expedicion de cada factura.
  Fuente: https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840
- Orden HAC/1177/2024, articulos 10 y 11: los registros de alta y anulacion se generan en XML UTF-8 con estructura definida en el anexo.
  Fuente: https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138
- Orden HAC/1177/2024, articulo 16: en modalidad VERI*FACTU los registros se remiten a AEAT en XML, con control de flujo, reintentos periodicos y respeto del orden temporal si hay incidencias.
  Fuente: https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138
- Orden HAC/1177/2024, articulos 20 y 21: las facturas deben incluir representacion grafica QR y, en su caso, frase visible de factura verificable / VERI*FACTU; el QR debe tener tamano entre 30 y 40 mm y nivel de correccion M o superior.
  Fuente: https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138
- AEAT, descripcion de servicios web VERI*FACTU: alta, subsanacion y anulacion se encadenan cronologicamente con el registro inmediatamente anterior; los registros rechazados/no modificables deben subsanarse con nuevos registros.
  Fuente: https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_Descripcion_SWeb.pdf

## 2. Modelo actual resumido

### Datos principales

- `src/lib/types.ts`
  - `DocumentType`: `factura`, `presupuesto`, `recibo`.
  - `DocumentKind`: anade `factura_rectificativa`.
  - `DocumentStatus`: `borrador`, `enviado`, `aceptado`, `pagado`, `vencido`, `rectificada`, `anulada`.
  - `Document`: contiene `client`, `items`, `issuer`, `rectification`, `rectifiedById`, `verifactu`, `sourceDocumentId`, `receiptDocumentId`.
  - `AppData`: guarda `documents`, `customers`, `profile`, `counters`, `verifactuChain` y `meta.pendingChanges`.
- `src/context/AppStore.tsx`
  - Es el punto central de mutaciones: crear, actualizar, borrar, marcar cobrado, aceptar presupuesto, rectificar, fusionar clientes, registrar VeriFactu.
- Persistencia local
  - `src/lib/storage.ts`: guarda todo el `AppData` en `localStorage`.
- Sincronizacion nube
  - `src/lib/cloud/diff.ts`: calcula cambios por entidad.
  - `src/lib/cloud/repository.ts`: sube cambios a `sync_entities`.
  - `src/context/CloudSyncContext.tsx`: coordina push/pull, reintentos y descarga completa.
- VeriFactu
  - `src/app/api/verifactu/register/route.ts`: endpoint servidor.
  - `src/lib/verifactu/*`: hash, XML, QR, cadena, envio AEAT simulado/real.
  - `supabase/verifactu.sql` y baseline: tablas `verifactu_records` y `verifactu_chain_state`.

## 3. Decisiones corregidas tras revision

Estas decisiones sustituyen las partes imprecisas del primer borrador del plan:

1. No usar `fiscalStatus` como estado generico de facturas, presupuestos y recibos.
2. Introducir conceptualmente:
   - `documentLifecycle`: `draft | issued | canceled`
   - `integrityLock`: `unlocked | locked`
3. Reservar estados fiscales/VeriFactu para facturas y registros fiscales, no para presupuestos ni recibos.
4. Mantener `Document.status` durante Fase 2 como compatibilidad de UI y datos legacy. No debe ser la fuente unica de integridad.
5. Separar operaciones:
   - `issueDocument`
   - `markDocumentSent`
   - `markDocumentPaid`
   - `acceptQuote`
6. Un documento no se considera emitido solo porque `status` pase a `enviado`. En codigo nuevo, solo `issueDocument` emite.
7. `DocumentShareActions` debe emitir primero si el documento aun es borrador y despues ejecutar el envio. Compartir no debe saltarse la operacion de emision.
8. La asignacion definitiva de numero, snapshot y bloqueo ocurren en `issueDocument`.
9. Distinguir tres modalidades:
   - preview/test local;
   - modalidad VERI*FACTU productiva;
   - modalidad NO VERI*FACTU.
10. El modo local actual no debe considerarse automaticamente conforme a NO VERI*FACTU.
11. No mostrar frase VERI*FACTU productiva si no existe remision real o confirmacion servidor.
12. Para la primera implementacion:
   - borradores permitidos offline;
   - emision VeriFactu productiva solo con conexion y confirmacion servidor;
   - emision offline con cola fiscal queda como trabajo futuro independiente.
13. El modelo VeriFactu debe separar:
   - operacion fiscal;
   - registro fiscal inmutable;
   - intento de transporte a AEAT.
14. No usar como constraint final `unique(user_id, document_id, record_type)`, porque impediria subsanaciones/anulaciones legitimas.
15. La arquitectura atomica elegida para VeriFactu servidor es la opcion B: transaccion PostgreSQL directa desde servidor.
16. Un rollback no puede volver a habilitar mutaciones sobre documentos bloqueados.
17. El servidor debe rechazar cambios incompatibles aunque una UI antigua los intente.
18. Los documentos canonicos deben usar `version` y `expectedVersion` para bloqueo optimista.
19. La Fase 2 se divide en:
   - Fase 2A: integridad documental local.
   - Fase 2B: integridad servidor y VeriFactu.
20. El primer paso futuro sera solo Fase 2A.1: dominio de emision y bloqueo central, sin migraciones Supabase y sin cambios VeriFactu servidor.

## 4. Modelo de estados propuesto

### Principio

Hoy `Document.status` mezcla ciclo de vida, envio, pago, aceptacion, anulacion y rectificacion. En Fase 2 debe conservarse como etiqueta de compatibilidad, pero las reglas nuevas deben derivar o almacenar dimensiones separadas.

Conceptos internos propuestos:

```ts
type DocumentLifecycle = "draft" | "issued" | "canceled";
type IntegrityLock = "unlocked" | "locked";
type DeliveryStatus = "not_sent" | "sent";
type PaymentStatus = "not_applicable" | "pending" | "paid" | "overdue";
type AcceptanceStatus = "not_applicable" | "pending" | "accepted" | "rejected";
```

Notas:

- `documentLifecycle` sirve para facturas, presupuestos y recibos.
- `integrityLock` decide si se pueden cambiar campos que afectan al contenido historico.
- Rectificada/corregida no debe ser un estado generico del ciclo de vida; debe modelarse como relacion o estado derivado: `rectifiedById`, `rectification`, eventos y/o registro fiscal.
- Los estados VeriFactu se modelan en registros fiscales, no como sustituto del ciclo de vida del documento.
- `Document.status` sigue existiendo para pantallas actuales, filtros, importaciones y compatibilidad.

### Factura

Estado UI actual | Interpretacion propuesta | Editable
--- | --- | ---
`borrador` | `documentLifecycle = draft`, `integrityLock = unlocked` | Si
`enviado` | legacy: tratar como emitida y enviada para preservar historicos; codigo nuevo debe llegar aqui via `issueDocument` + `markDocumentSent` | No en campos fiscales
`vencido` | factura emitida, pendiente vencida | No en campos fiscales
`pagado` | factura emitida y cobrada | No en campos fiscales; pago es operativo
`rectificada` | factura original relacionada con rectificativa | No
`anulada` | factura cancelada por rectificativa/anulacion segun proceda | No

### Presupuesto

Estado UI actual | Interpretacion propuesta | Editable
--- | --- | ---
`borrador` | `documentLifecycle = draft`, `integrityLock = unlocked` | Si
`enviado` | presupuesto emitido documentalmente y enviado | No por defecto
`aceptado` | presupuesto emitido y aceptado | No
`pagado` | compatibilidad antigua; no debe ser estado normal de presupuesto | No
`anulada` | presupuesto cancelado | No

### Recibo

Estado UI actual | Interpretacion propuesta | Editable
--- | --- | ---
`borrador` | `documentLifecycle = draft`, `integrityLock = unlocked` | Si
`enviado` | recibo emitido/enviado | No por defecto
`pagado` | recibo emitido/cobrado | No
`anulada` | recibo cancelado | No

### Operaciones separadas

`issueDocument(draft, context)`

- Valida que el documento este en borrador.
- Asigna numero definitivo.
- Captura snapshot.
- Calcula totales y hash de contenido.
- Pasa `documentLifecycle` a `issued`.
- Pasa `integrityLock` a `locked`.
- En facturas con modalidad VERI*FACTU productiva, Fase 2B debe exigir conexion y confirmacion servidor antes de confirmar la emision.

`markDocumentSent(documentId, channel)`

- Solo marca envio.
- No asigna numero.
- No crea snapshot.
- No modifica lineas, cliente, fecha, emisor ni importes.

`markDocumentPaid(documentId, paidAt, options)`

- Solo marca cobro o crea un recibo segun reglas.
- No altera factura emitida.
- No renumera documentos ya emitidos.

`acceptQuote(documentId, acceptedAt)`

- Solo marca aceptacion.
- No modifica snapshot emitido del presupuesto.

## 5. Invariantes que nunca deben romperse

1. Un documento con `integrityLock = locked` no puede modificar:
   - numero;
   - fecha de expedicion;
   - emisor;
   - destinatario/documento de cliente congelado;
   - lineas;
   - impuestos;
   - totales;
   - vencimiento si aparece en el documento emitido;
   - forma y condiciones de pago si aparecen en el documento emitido;
   - notas visibles en el documento emitido;
   - referencias de rectificacion;
   - datos VeriFactu;
   - snapshot de plantilla/PDF si se incorpora.
2. Una factura emitida no se borra fisicamente; se anula o rectifica con otro documento/registro.
3. Una factura rectificativa no se borra ni se edita despues de emitida.
4. La numeracion de facturas emitidas y rectificativas nunca se recalcula.
5. El borrado de borradores no puede renumerar documentos emitidos.
6. La fusion de clientes no modifica snapshots de documentos emitidos.
7. El PDF historico debe regenerarse desde snapshot o conservar un hash/version de render que permita detectar cambios.
8. El registro VeriFactu se crea desde fuente servidor/snapshot confiable, no desde payload mutable enviado por navegador.
9. La cadena VeriFactu se actualiza dentro de una unica transaccion.
10. La sincronizacion nube no puede aplicar cambios que degraden un documento bloqueado.
11. Importaciones y backups no pueden reemplazar documentos bloqueados sin resolucion explicita.
12. `Document.status` no puede por si solo desbloquear un documento.
13. Un rollback o cliente antiguo no puede reabrir mutaciones sobre documentos bloqueados.
14. Toda mutacion canonica debe incluir `expectedVersion`; si no coincide, se rechaza o genera conflicto.

## 6. Hallazgos criticos

### C1. `updateDocument` permite reemplazar documentos completos

Archivos:

- `src/context/AppStore.tsx`
- `src/components/forms/DocumentForm.tsx`
- `src/components/documents/DocumentShareActions.tsx`

Problema:

- `updateDocument` reemplaza cualquier documento por `id` y actualiza `updatedAt`.
- No valida `documentLifecycle`, `integrityLock`, version, snapshot ni campos permitidos.
- `DocumentShareActions` pasa actualmente un borrador a `enviado` sin operacion centralizada de emision.

Riesgo:

- Una ruta actual o futura puede cambiar lineas, cliente, fecha, numero, estado o VeriFactu de documentos historicos.

Prioridad: P0.

### C2. Fusion de clientes modifica snapshots historicos

Archivos:

- `src/context/AppStore.tsx`
- `src/lib/customers.ts`

Problema:

- `mergeCustomers` reescribe `document.client` en todos los documentos de clientes fusionados.
- En el modelo actual `document.client` funciona como snapshot historico, no solo como referencia viva.

Riesgo:

- Una factura emitida hace anos puede cambiar destinatario al fusionar fichas.

Prioridad: P0.

### C3. Borrado y desmarcado de cobro renumeran documentos

Archivos:

- `src/context/AppStore.tsx`
- `src/lib/documents.ts`
- `src/lib/rectificativas.ts`
- `src/lib/receipts.ts`

Problema:

- `deleteDocument` borra y llama a renumeracion por tipo/ano.
- `unmarkAsCollected` puede eliminar recibo automatico y renumerar recibos.

Riesgo:

- Numeros historicos cambian despues de emitir o compartir.

Prioridad: P0.

### C4. VeriFactu servidor confia en documento enviado por navegador

Archivos:

- `src/app/api/verifactu/register/route.ts`
- `src/lib/verifactu/register.ts`
- `src/lib/verifactu/server-db.ts`

Problema:

- El endpoint valida Bearer, pero recibe `document`, `profile` y `chain` desde navegador.
- Carga cadena servidor si existe, pero puede usar datos enviados por cliente para construir alta/hash/XML.

Riesgo:

- El navegador podria enviar un documento distinto del historico real.

Prioridad: P0 para Fase 2B.

### C5. VeriFactu no es atomico ni modela operaciones fiscales completas

Archivos:

- `src/app/api/verifactu/register/route.ts`
- `src/lib/verifactu/server-db.ts`
- `supabase/verifactu.sql`
- `supabase/migrations/20260623000000_base_schema.sql`

Problema:

- Registro y cadena se persisten en varias operaciones.
- El modelo actual mezcla documento, registro fiscal y transporte.
- No contempla suficientemente `alta_inicial`, `alta_subsanacion` y `anulacion` como operaciones distintas.
- No hay separacion clara entre registro fiscal inmutable e intentos de transporte AEAT.

Riesgo:

- Dos peticiones concurrentes pueden duplicar cadena o dejar registro parcial.
- Un reintento tecnico podria crear un registro fiscal nuevo cuando solo debe repetir transporte.

Prioridad: P0 para Fase 2B.

### C6. Sincronizacion JSON permite sobrescrituras de documentos bloqueados

Archivos:

- `src/lib/cloud/diff.ts`
- `src/lib/cloud/repository.ts`
- `src/context/CloudSyncContext.tsx`
- `supabase/schema.sql`

Problema:

- La sync compara blobs JSON por entidad y aplica reemplazos por `updatedAt`.
- No existe versionado canonico por documento ni validacion de campos bloqueados.

Riesgo:

- Un movil con datos antiguos puede sobrescribir una factura emitida desde otro dispositivo.

Prioridad: P0 para Fase 2B.

### C7. PDF historico se regenera desde datos vivos y plantilla actual

Archivos:

- `src/lib/pdf.ts`
- `src/lib/document-templates.ts`
- `src/lib/issuer-snapshot.ts`

Problema:

- El PDF usa parte del snapshot (`doc.issuer`), pero tambien perfil/plantilla/regimen actuales.
- No hay `pdfSnapshot`, `rendererVersion`, `contentHash` ni artefacto PDF conservado.

Riesgo:

- Descargar hoy una factura antigua puede producir un PDF visual o fiscalmente diferente.

Prioridad: P1.

## 7. Hallazgos medios

### M1. El snapshot de emisor existe, pero no cubre todo

Archivos:

- `src/lib/issuer-snapshot.ts`
- `src/lib/pdf.ts`

Problema:

- `issuer` se captura para documentos no borrador.
- No incluye version de plantilla, regimen fiscal completo, hash de contenido, modalidad VeriFactu, datos de software productor ni version de renderer.

Prioridad: P1.

### M2. `client` mezcla snapshot y busqueda contra ficha viva

Archivos:

- `src/lib/customers.ts`
- `src/components/documents/DocumentList.tsx`

Problema:

- La app busca documentos por cliente usando datos de ficha y snapshot.
- No hay `customerId` separado de `customerSnapshot`.

Prioridad: P1.

### M3. Rectificativas utiles, pero insuficientes para variantes fiscales

Archivos:

- `src/lib/rectificativas.ts`
- `src/components/forms/RectificativaForm.tsx`

Problema:

- Existen R1/R4 conceptuales, pero faltan snapshots, atomicidad y distincion entre correccion por diferencias y sustitucion.

Prioridad: P1.

### M4. Importador reemplaza importaciones previas por prefijo

Archivos:

- `src/lib/importers/pcfacturacion.ts`
- `src/app/importar/page.tsx`

Problema:

- La reimportacion elimina documentos importados previamente por prefijo.
- No distingue documentos ya bloqueados/editados localmente.

Prioridad: P1.

### M5. AEAT real no esta implementado de forma completa

Archivos:

- `src/lib/verifactu/aeat-submit.ts`
- `src/lib/verifactu/declaration.ts`

Problema:

- Hay configuracion de certificado, pero no transporte real completo con certificado cliente y pruebas de entorno AEAT.

Prioridad: P2, fuera del primer paso.

## 8. Snapshot documental/fiscal propuesto

### Regla general

El snapshot no debe inventar valores. Debe congelar campos reales existentes y marcar explicitamente lo que hoy no existe en el modelo.

Campo que afecta al documento | Origen actual | Decision
--- | --- | ---
Tipo y clase de documento | `Document.type`, `DocumentKind` derivado por rectificativa | Congelar
Numero | `Document.number`, asignado hoy al crear | En Fase 2 debe asignarse definitivamente en `issueDocument`
Fecha de expedicion | `Document.date` | Congelar
Vencimiento | `Document.dueDate` | Congelar si aparece
Emisor | `Document.issuer` si existe; si no, `BusinessProfile` al emitir | Congelar desde `issueDocument`
Destinatario | `Document.client` | Congelar como `customerSnapshot`; separar de `customerId`
Lineas | `Document.items`: `description`, `quantity`, `unit`, `unitPrice`, `ivaPercent` | Congelar
IVA por linea | `LineItem.ivaPercent` | Congelar
Desglose IVA por tipos | `ivaBreakdownByRate(doc.items)` / `documentAmounts` | Calcular y congelar
Totales | `documentAmounts(doc, vatExempt)` | Calcular y congelar
Exencion IVA | `BusinessProfile.vatExempt` + `isVatExempt(profile)` | Congelar booleano; motivo legal no existe actualmente
No sujecion | No existe campo actual | No inventar; anadir campo futuro solo cuando se modele
Motivo exencion/no sujecion | No existe campo actual | No inventar; deuda funcional
IRPF de factura | No existe campo en `Document` ni `LineItem` | No usar `profile.irpfPercent` como retencion; hoy es estimacion fiscal general
Moneda | No existe campo; la app asume euros por formato | Documentar como implicita `EUR`; anadir campo explicito en modelo antes de usarlo legalmente
Descuentos | No existe campo actual | No inventar; pendiente si se implementan descuentos
Forma y condiciones de pago | `Document.paymentTerms` | Congelar si aparece
Notas visibles | `Document.notes` | Congelar si aparecen
Referencias de rectificacion | `Document.rectification`, `rectifiedById` | Congelar relaciones y motivo
Regimen fiscal | `BusinessProfile.vatExempt`, `BusinessProfile.iva`, reglas de IVA actuales | Congelar solo lo existente; no inventar regimenes no modelados
Numeracion/configuracion | `BusinessProfile.numbering` y resultado `Document.number` | Congelar formato usado y numero definitivo
Configuracion VeriFactu | `BusinessProfile.verifactu`, `Document.verifactu` legacy | Congelar modalidad aplicable, no inventar remision real
Plantilla/render | `BusinessProfile.documentTemplate`, `DEFAULT_DOCUMENT_TEMPLATE` | Congelar en `pdfSnapshot`
Version esquema snapshot | Nuevo campo | Definir `schemaVersion`
Version renderer/plantilla | No existe version de renderer | Crear `rendererVersion` en Fase 2A cuando se congele PDF

### Modelo conceptual de documento

```ts
interface Document {
  // Compatibilidad legacy/UI: se mantiene durante Fase 2.
  status: DocumentStatus;

  customerId?: string;
  documentLifecycle?: "draft" | "issued" | "canceled";
  integrityLock?: "unlocked" | "locked";
  deliveryStatus?: "not_sent" | "sent";
  paymentStatus?: "not_applicable" | "pending" | "paid" | "overdue";
  acceptanceStatus?: "not_applicable" | "pending" | "accepted" | "rejected";

  issuedAt?: string;
  lockedAt?: string;
  sentAt?: string;
  paidAt?: string;
  acceptedAt?: string;
  canceledAt?: string;

  documentSnapshot?: DocumentSnapshot;
  pdfSnapshot?: DocumentPdfSnapshot;

  version?: number;
}
```

### Modelo conceptual de snapshot

```ts
interface DocumentSnapshot {
  schemaVersion: 1;
  capturedAt: string;
  source: "manual" | "import" | "sync" | "backup" | "legacy_backfill";

  documentType: DocumentType;
  documentKind: DocumentKind;
  number: string;
  date: string;
  dueDate?: string;

  issuer: IssuerSnapshot;
  customer: ClientSnapshot;
  customerId?: string;

  items: LineItemSnapshot[];
  taxSummary: {
    vatExempt: boolean;
    vatExemptionReason?: string; // futuro; no existe hoy
    notSubjectReason?: string; // futuro; no existe hoy
    subtotal: number;
    iva: number;
    total: number;
    breakdown: Array<{ rate: number; base: number; quota: number }>;
  };

  currency: "EUR"; // hoy implicita; debe hacerse explicita como modelo
  discounts?: never; // no existen hoy
  irpfRetention?: never; // no existe hoy como retencion de factura

  paymentTerms?: string;
  notes?: string;
  rectification?: RectificationInfo;

  numbering: {
    formatTemplate?: string;
    padding?: number;
    assignedNumber: string;
  };

  fiscalContext: {
    vatExempt: boolean;
    ivaRates: number[];
    defaultIvaRate: number;
    verifactuMode: "none" | "local_test_preview" | "verifactu_production" | "non_verifactu";
    verifactuEnvironment?: "test" | "production";
  };

  snapshotHash: string;
}
```

### Snapshot PDF/render

```ts
interface DocumentPdfSnapshot {
  schemaVersion: 1;
  renderedAt: string;
  rendererVersion: string;
  template: DocumentTemplateSettings;
  contentHash: string;
  pdfHash?: string;
  pdfStoragePath?: string;
}
```

Decision:

- Fase 2A debe guardar snapshot de datos, plantilla y `contentHash`.
- Guardar el PDF como artefacto binario puede quedar para paso posterior, siempre que el PDF se regenere desde snapshot congelado.

## 9. Modelo corregido de VeriFactu

### Modalidades

1. Preview/test local
   - Puede calcular hash/QR de prueba para previsualizar.
   - No debe usar frase de remision VERI*FACTU productiva.
   - No debe presentarse como enviado a AEAT.
2. VERI*FACTU productivo
   - Requiere conexion.
   - Requiere servidor.
   - Requiere confirmacion de persistencia del registro/cadena.
   - La frase productiva solo aparece si existe remision real o estado legalmente valido.
3. NO VERI*FACTU
   - No equivale automaticamente a "modo local actual".
   - Requiere cumplir inalterabilidad, trazabilidad y conservacion por otros medios.
   - Debe definirse legal y tecnicamente antes de declararlo soportado.

### Separacion de entidades

No mezclar documento, registro fiscal y envio. Modelo conceptual:

```ts
type FiscalOperationType =
  | "alta_inicial"
  | "alta_subsanacion"
  | "anulacion";

interface FiscalOperation {
  id: string;
  userId: string;
  documentId: string;
  documentVersion: number;
  operationType: FiscalOperationType;
  idempotencyKey: string;
  requestedAt: string;
  requestedBy: string;
  status: "pending" | "record_created" | "transport_pending" | "completed" | "failed";
}

interface FiscalRecord {
  id: string;
  operationId: string;
  userId: string;
  documentId: string;
  documentSnapshotHash: string;

  environment: "test" | "production";
  issuerNif: string;
  numserie: string;
  fechaExpedicion: string;

  operationType: FiscalOperationType;
  recordHash: string;
  previousHash: string | null;
  recordTimestamp: string;
  xmlPayload: string;
  qrUrl: string;
  tipoFactura?: string;
  cuotaTotal?: string;
  importeTotal?: string;

  createdAt: string;
}

interface AeatTransportAttempt {
  id: string;
  fiscalRecordId: string;
  attemptNumber: number;
  status: "queued" | "submitting" | "accepted" | "rejected" | "failed_retryable" | "failed_final";
  submittedAt?: string;
  aeatCsv?: string;
  aeatResponse?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
```

Reglas:

- La identificacion de factura considera como minimo:
  - `issuer_nif`;
  - `numserie`;
  - `fecha_expedicion`;
  - `environment`.
- Una misma factura puede tener varios registros fiscales inmutables posteriores: alta inicial, subsanaciones y anulaciones.
- `idempotency_key` identifica una operacion concreta. No puede impedir una subsanacion legitima.
- Los reintentos de transporte AEAT no crean nuevos registros fiscales.
- `FiscalRecord` es inmutable. Si algo falla despues, se registra intento o nueva operacion, no se edita el registro.

### Constraints e indices

No usar como constraint final:

```sql
unique (user_id, document_id, record_type)
```

Propuesta:

- `fiscal_operations.idempotency_key` unico.
- `fiscal_records.operation_id` unico.
- Indice por identidad fiscal:
  - `(user_id, issuer_nif, numserie, fecha_expedicion, environment)`.
- Regla/RPC/transaccion que impida duplicar `alta_inicial` efectiva para la misma identidad fiscal, sin bloquear `alta_subsanacion` ni `anulacion`.
- Indice de cadena:
  - `(user_id, issuer_nif, environment, record_timestamp)`.
- `aeat_transport_attempts(fiscal_record_id, attempt_number)` unico.

### Atomicidad elegida

Arquitectura elegida: opcion B, transaccion PostgreSQL directa desde servidor.

Motivo:

- El hash/XML actual se calcula en TypeScript.
- Reimplementar canonicalizacion, XML y hash completo dentro de SQL haria la primera version mas fragil.
- Una transaccion directa con `pg` desde codigo servidor permite bloquear cadena, calcular datos en servidor y confirmar todo junto.

Flujo atomico:

1. Endpoint servidor valida Bearer y deriva `user_id`.
2. Ignora `user_id`, `plan`, `status`, `entitlement`, documento y cadena enviados por cliente.
3. Abre transaccion PostgreSQL.
4. Carga documento canonico/snapshot y verifica `expectedVersion`.
5. Reserva o recupera `FiscalOperation` por `idempotency_key`.
6. Bloquea `verifactu_chain_state` con `select ... for update` para `(user_id, issuer_nif, environment)`.
7. Obtiene `previousHash` desde la fila bloqueada.
8. Obtiene `recordTimestamp` desde la base de datos dentro de la transaccion, no desde el navegador.
9. El servidor calcula XML, QR y `recordHash` con snapshot canonico, `previousHash` y `recordTimestamp`.
10. Inserta `FiscalRecord` inmutable.
11. Actualiza cadena.
12. Inserta o deja en cola `AeatTransportAttempt`.
13. Hace commit.

No se considera atomico un flujo de varias llamadas REST/RPC independientes.

Fuera de esta transaccion puede ocurrir el transporte AEAT real, pero sus reintentos deben actualizar `AeatTransportAttempt`, no crear otro `FiscalRecord`.

## 10. Local, offline y nube

### Usuario local sin cuenta

- Puede crear y editar borradores.
- Fase 2A aplica integridad local en `AppStore`/dominio.
- Puede emitir documentalmente en local para presupuestos/recibos y, con cautela, facturas no productivas.
- No debe presentarse como VERI*FACTU productivo ni como NO VERI*FACTU conforme por defecto.
- Debe avisarse de que sin servidor no hay registro canonico, auditoria servidor ni remision real.

### Usuario Pro sincronizado

- Borradores pueden sincronizarse como entidades editables.
- Documentos emitidos deben pasar a modo canonico con version y bloqueo.
- La sync JSON puede quedar como cache, pero no como autoridad para mutaciones sensibles.
- En VERI*FACTU productivo, la emision de factura requiere servidor y confirmacion de registro/cadena.

### Dos dispositivos

- Cada documento canonico debe tener `version`.
- Toda mutacion sensible debe enviar `expectedVersion`.
- Si un dispositivo antiguo intenta editar una version ya emitida/bloqueada:
  - se rechaza;
  - se crea conflicto visible;
  - se conserva el documento bloqueado.

### Datos modificados offline

- Offline permitido para borradores.
- Emision VeriFactu productiva offline queda fuera de la primera implementacion.
- Una futura cola fiscal offline tendria que resolver numeracion, cadena, reloj, identidad y orden antes de considerarse aceptable.

### Importaciones

- Documentos importados historicos deben marcar:
  - `source = import`;
  - `sourceName`;
  - `sourceImportId`;
  - `sourceDocumentId`;
  - `importedAt`;
  - `documentLifecycle = issued` si son documentos historicos ya emitidos.
- No registrar VeriFactu retroactivamente salvo decision legal/funcional posterior.
- Reimportar no puede reemplazar documentos bloqueados sin confirmacion fuerte.

## 11. Fusion de clientes

Politica:

- Fusionar clientes solo cambia la ficha maestra `customers`.
- Documentos emitidos:
  - conservan `documentSnapshot.customer`;
  - conservan `document.client` legacy historico mientras exista;
  - pueden actualizar `customerId` hacia la ficha maestra sin tocar snapshot.
- Borradores:
  - pueden actualizarse solo si el usuario elige explicitamente "actualizar tambien borradores".
- Busqueda/listados:
  - deben encontrar por `customerId` maestro y por snapshot historico.

Test de regresion minimo:

- Fusionar dos clientes no cambia destinatario de factura emitida.
- Fusion con opcion explicita actualiza borrador.
- Listado por cliente maestro sigue mostrando historicos.

## 12. Borrado, huecos y renumeracion

Politica:

- Factura borrador: se puede borrar; no afecta emitidas.
- Factura emitida: no borrar; usar rectificativa/anulacion segun proceda.
- Factura rectificativa emitida: no borrar ni editar.
- Presupuesto borrador: se puede borrar; no renumera emitidos.
- Presupuesto emitido/enviado/aceptado: cancelar/anular como evento, no borrar por defecto.
- Recibo borrador: se puede borrar; no renumera emitidos.
- Recibo emitido/pagado: cancelar/anular como evento, no borrar por defecto.
- Desmarcar pago:
  - no borra recibo emitido;
  - no renumera;
  - si el recibo automatico era borrador/no enviado, puede cancelarse u ocultarse.

Huecos:

- Los huecos en documentos emitidos se conservan.
- La app puede explicar huecos con eventos, no arreglarlos renumerando.

## 13. Rectificativas y anulaciones

Politica:

- Crear rectificativa desde snapshot original, no desde datos vivos.
- Mantener original inmutable.
- Actualizar solo metadatos derivados:
  - `rectifiedById`;
  - relacion/evento;
  - estado UI compatible.
- Numeracion independiente para `factura_rectificativa`.
- Para anulacion total:
  - usar rectificativa/anulacion segun criterio legal y UI;
  - no borrar la factura original.
- Para correccion:
  - definir si se corrige por diferencias o por sustitucion;
  - reflejarlo en snapshot y PDF.
- VeriFactu:
  - rectificativas son altas fiscales con tipo R* cuando proceda;
  - anulacion de registro VeriFactu es operacion fiscal distinta y no debe confundirse automaticamente con rectificativa R1.

## 14. Cambios de modelo y migraciones necesarias

### Fase 2A - Sin migraciones Supabase obligatorias

La primera parte debe poder hacerse localmente:

- Nuevas funciones de dominio.
- Nuevos campos opcionales en tipos.
- Backfill en memoria/normalizacion local.
- Tests unitarios.

No aplicar migraciones Supabase en 2A.1.

### Fase 2B - Migraciones servidor

Migraciones futuras:

1. Documento canonico/versionado
   - tabla `document_records` o equivalente;
   - `document_id`;
   - `user_id`;
   - `document_snapshot jsonb`;
   - `snapshot_hash`;
   - `document_lifecycle`;
   - `integrity_lock`;
   - `version`;
   - `issued_at`;
   - `locked_at`.
2. Eventos de documento
   - tabla `document_events`;
   - emision, envio, cobro, aceptacion, rectificacion, cancelacion, importacion, conflicto.
3. VeriFactu corregido
   - `fiscal_operations`;
   - `fiscal_records`;
   - `aeat_transport_attempts`;
   - cadena por `(user_id, issuer_nif, environment)`.
4. Sync protegida
   - validacion servidor para cambios sensibles;
   - rechazo de cambios que degraden documentos bloqueados.

Privilegios:

- `authenticated` no debe escribir directamente registros fiscales, cadenas ni documento canonico bloqueado.
- Escrituras sensibles solo desde servidor o funciones protegidas.

## 15. Plan por fases pequenas

### Fase 2A - Integridad documental local

Objetivo:

- Proteger historicos ya en navegador.
- Separar emision, envio, cobro y aceptacion.
- Crear snapshots locales.
- Evitar merge/borrado/renumeracion destructiva.
- Hacer PDFs historicos estables desde snapshot.

#### Fase 2A.1 - Dominio de emision y bloqueo central

Primer paso futuro. Alcance unico:

- Crear dominio local:
  - `deriveDocumentLifecycle`
  - `deriveIntegrityLock`
  - `issueDocument`
  - `assertCanEditDocument`
  - `markDocumentSent`
  - `markDocumentPaid`
  - `acceptQuote`
- Cambiar `AppStore` para que `updateDocument` rechace cambios de campos bloqueados.
- Hacer que `DocumentShareActions` llame a `issueDocument` si comparte un borrador, y despues marque envio.
- Mantener `Document.status` para UI.
- Sin migraciones Supabase.
- Sin cambios VeriFactu servidor.
- Sin refactor completo de todos los estados.

Tests 2A.1:

- editar borrador permite cambiar cliente/lineas/fecha;
- editar emitido rechaza cliente/lineas/fecha/numero;
- compartir borrador emite primero y despues marca enviado;
- enviar emitido no cambia snapshot;
- marcar pagado no cambia snapshot;
- UI antigua simulada llamando `updateDocument` queda bloqueada.

#### Fase 2A.2 - Snapshots locales completos

- Capturar snapshot al emitir.
- Incluir campos reales y origen.
- Crear `contentHash`.
- Compatibilidad legacy con documentos sin snapshot.

Tests:

- cambiar perfil no cambia snapshot emitido;
- cambiar plantilla no cambia snapshot emitido;
- documento legacy se interpreta de forma conservadora.

#### Fase 2A.3 - Fusion de clientes segura

- Separar `customerId` de snapshot.
- No tocar documentos emitidos.
- Opcion explicita para actualizar borradores.

Tests:

- merge no cambia factura emitida;
- merge actualiza borrador solo con opcion;
- busqueda por cliente maestro sigue funcionando.

#### Fase 2A.4 - Borrado, numeracion y recibos

- Eliminar renumeracion de emitidos.
- Borrar solo borradores.
- Cancelar/anular emitidos cuando proceda.
- Desmarcar pago sin borrar recibos emitidos.

Tests:

- borrar borrador no renumera emitidos;
- borrar factura emitida se rechaza;
- desmarcar pago no elimina recibo emitido ni renumera.

#### Fase 2A.5 - PDF historico

- PDF de emitidos usa snapshot y plantilla congelada.
- Borradores usan datos vivos.

Tests:

- cambiar plantilla/perfil no cambia PDF historico;
- borrador si refleja cambios actuales;
- importados se renderizan con snapshot legacy.

### Fase 2B - Integridad servidor y VeriFactu

Objetivo:

- Documento canonico servidor.
- Versionado y `expectedVersion`.
- Sync protegida.
- Registro VeriFactu atomico.
- Intentos AEAT separados.
- Eventos de auditoria.

Pasos:

1. Documento canonico y versionado.
2. Sync protegida contra cambios de documentos bloqueados.
3. Modelo fiscal: operaciones, registros, intentos.
4. Transaccion PostgreSQL para VeriFactu.
5. Reintentos de transporte AEAT.
6. Eventos/auditoria.

Tests 2B:

- dos dispositivos no pisan documento bloqueado;
- `expectedVersion` incorrecto rechaza cambio;
- doble peticion VeriFactu crea una operacion/registro correcto;
- reintento transporte no crea nuevo registro fiscal;
- subsanacion crea nuevo registro fiscal legitimo.

## 16. Matriz minima de pruebas de Fase 2

Caso | Prueba minima | Resultado esperado
--- | --- | ---
Editar borrador | Cambiar cliente, lineas, fecha | Permitido
Editar emitido | Intentar cambiar lineas/cliente/fecha/numero | Rechazado desde dominio/store
Enviar borrador | Compartir por email/WhatsApp | Ejecuta `issueDocument` y despues `markDocumentSent`
Enviar emitido | Marcar enviado | No cambia snapshot
Marcar pagado | Factura emitida pendiente | Cambia pago/evento, no snapshot
Aceptar presupuesto | Presupuesto emitido | Cambia aceptacion, no snapshot
Fusionar clientes | Fusionar cliente usado en factura emitida | Snapshot historico intacto
Fusionar borradores | Fusion con opcion explicita | Borrador actualizado
Eliminar factura emitida | Intentar borrar | Rechazado; ofrecer rectificativa/anulacion
Eliminar presupuesto enviado | Intentar borrar | Rechazado o cancelado sin renumerar
Eliminar recibo pagado | Intentar borrar | Rechazado o cancelado sin renumerar
Renumerar tras borrado | Borrar borrador intermedio | No cambia ningun emitido
Rectificativa anulacion | Crear R1 | Original inmutable, rectificativa bloqueada, numeros independientes
Rectificativa correccion | Crear R4 | Original inmutable, snapshot original intacto
Doble VeriFactu | Dos POST simultaneos | Una operacion idempotente, registro/cadena consistentes
Subsanacion VeriFactu | Crear subsanacion posterior | Nuevo registro fiscal legitimo
Reintento transporte | Reintentar AEAT tras fallo tecnico | No crea nuevo registro fiscal
Sync concurrente | Emitir en A, editar viejo en B | B no pisa A; conflicto
Reimportacion | Importar mismo MDB tras cambios locales | No reemplaza emitidos bloqueados sin decision
Regenerar PDF | Cambiar plantilla y descargar factura antigua | PDF usa snapshot historico

## 17. Compatibilidad con datos existentes y clientes antiguos

Backfill conservador:

- Documentos con `status = borrador`:
  - `documentLifecycle = draft`;
  - `integrityLock = unlocked`;
  - sin snapshot obligatorio.
- Documentos con `status != borrador`:
  - tratar como emitidos/bloqueados para preservar historico, salvo `anulada` que se interpreta como `canceled/locked`.
  - crear snapshot legacy desde datos actuales cuando se implemente backfill.
  - marcar `snapshotSource = legacy_backfill`.
- Presupuestos y recibos no borrador:
  - `documentLifecycle = issued` en sentido documental, no fiscal.
- Documentos importados PCF:
  - conservar ids actuales;
  - asignar `source = import`, `sourceName = PC Facturacion 3.0`.
- Documentos con `verifactu` legacy:
  - conservar cache legacy;
  - no asumir remision productiva sin registro servidor valido.

Clientes antiguos:

- La UI antigua puede seguir enviando `Document.status` o blobs JSON.
- El servidor/store nuevo debe derivar `integrityLock` y rechazar cambios incompatibles.
- Si falta `expectedVersion` en una mutacion sensible, rechazar o forzar flujo de compatibilidad seguro.
- Nunca confiar en que el cliente antiguo respete campos bloqueados.

## 18. Estrategia de rollback

Codigo:

- Mantener campos nuevos opcionales.
- Mantener lectura legacy de `Document.client`, `Document.items`, `Document.issuer`, `Document.verifactu`.
- Si una release falla, se puede volver a UI anterior solo si el guard de integridad sigue activo o si el servidor rechaza mutaciones peligrosas.

Regla critica:

- Un rollback no puede volver a habilitar mutaciones sobre documentos bloqueados.

Migraciones:

- Solo migraciones `up` en `supabase/migrations`.
- Rollbacks manuales en `supabase/rollbacks`.
- No eliminar columnas legacy en Fase 2.
- Rollback seguro:
  - retirar uso de UI nueva si falla;
  - dejar tablas nuevas sin uso;
  - no borrar datos de auditoria/snapshots;
  - mantener rechazo servidor de cambios incompatibles.

Datos:

- Antes de migrar produccion, exportar snapshot de tablas afectadas.
- Ejecutar primero en Supabase local y staging.
- Validar backfill sobre copia anonimizada si existe.

## 19. Archivos implicados

### Modelo y dominio

- `src/lib/types.ts`
- `src/context/AppStore.tsx`
- `src/lib/documents.ts`
- `src/lib/issuer-snapshot.ts`
- `src/lib/invoice-compliance.ts`
- `src/lib/vat-regime.ts`
- Nuevo: `src/lib/document-integrity/*`

### UI de documentos

- `src/components/forms/DocumentForm.tsx`
- `src/components/forms/RectificativaForm.tsx`
- `src/components/documents/DocumentList.tsx`
- `src/components/documents/DocumentDetailView.tsx`
- `src/components/documents/DocumentShareActions.tsx`
- `src/components/documents/MarkAsPaidButton.tsx`
- `src/components/documents/MarkAsAcceptedButton.tsx`
- `src/components/documents/DeleteDocumentButton.tsx`
- `src/components/documents/DocumentReadOnlyActions.tsx`

### Clientes e importacion

- `src/lib/customers.ts`
- `src/app/clientes/page.tsx`
- `src/app/importar/page.tsx`
- `src/lib/importers/pcfacturacion.ts`
- `src/lib/backup.ts`

### PDF y plantillas

- `src/lib/pdf.ts`
- `src/lib/document-templates.ts`
- `src/lib/pdf-logo.ts`
- `src/lib/verifactu/qr-image.ts`

### VeriFactu

- `src/app/api/verifactu/register/route.ts`
- `src/lib/verifactu/register.ts`
- `src/lib/verifactu/server-db.ts`
- `src/lib/verifactu/finalize.ts`
- `src/lib/verifactu/client-api.ts`
- `src/lib/verifactu/hash.ts`
- `src/lib/verifactu/record-input.ts`
- `src/lib/verifactu/xml.ts`
- `src/lib/verifactu/aeat-submit.ts`
- `supabase/verifactu.sql`
- `supabase/migrations/20260623000000_base_schema.sql`
- Futuras migraciones Fase 2B.

### Sincronizacion

- `src/lib/cloud/diff.ts`
- `src/lib/cloud/incremental.ts`
- `src/lib/cloud/repository.ts`
- `src/context/CloudSyncContext.tsx`
- `supabase/schema.sql`
- `supabase/migrations/20260623000000_base_schema.sql`

## 20. Elementos expresamente fuera de alcance

- Implementar codigo en este paso de analisis.
- Aplicar migraciones Supabase ahora.
- Acceder a Supabase produccion.
- Promocionar deployments o cambiar dominios.
- Activar envio AEAT real en produccion.
- Gestion completa de certificados P12/mTLS.
- Apoderamiento/representacion AEAT.
- Subsanacion automatica completa de rechazos AEAT.
- Cola fiscal offline productiva.
- Declarar el modo local como NO VERI*FACTU conforme sin diseno legal/tecnico propio.
- Factura electronica B2B completa.
- Cambios de precios o planes comerciales.
- Cambios grandes de UX no necesarios para integridad.

## 21. Dudas abiertas

1. Criterio legal/producto para modalidad NO VERI*FACTU:
   - decidir si la app la soportara realmente o si se limitara a VERI*FACTU servidor.
2. IRPF en factura:
   - hoy `irpfPercent` es estimacion fiscal general, no retencion por factura. Si se necesita retencion en factura, hay que modelarla antes.
3. Moneda:
   - hoy es implicita EUR. Conviene hacerla explicita antes de snapshots finales.
4. Motivos de exencion/no sujecion:
   - hoy solo existe `vatExempt`; falta motivo legal visible.
5. Rectificativas:
   - decidir si la correccion por importes sera por diferencias, sustitucion o ambas.
6. Artefacto PDF:
   - decidir si se guarda siempre binario emitido o basta snapshot + `contentHash` + `rendererVersion`.
7. Transporte AEAT:
   - elegir libreria/infra para certificado cliente real y pruebas contra entorno AEAT.
8. Backfill legacy:
   - decidir si se aplica automaticamente al abrir app o como migracion asistida.

## 22. Criterio final de aceptacion

Fase 2 no debe considerarse aceptada hasta que:

1. Un documento emitido no pueda cambiar datos historicos desde UI, store, sync, importacion o backup.
2. `issueDocument`, `markDocumentSent`, `markDocumentPaid` y `acceptQuote` esten separados.
3. `DocumentShareActions` emita primero y envie despues.
4. Fusionar clientes no cambie snapshots historicos.
5. Borrar/desmarcar pago no renumere documentos emitidos.
6. Facturas emitidas solo se corrijan mediante rectificativa/anulacion o registro fiscal valido.
7. El PDF historico se regenere desde snapshot o conserve artefacto/hash verificable.
8. VeriFactu use fuente servidor confiable y operacion atomica.
9. El modelo VeriFactu separe operacion fiscal, registro inmutable e intentos de transporte.
10. Dos peticiones concurrentes VeriFactu no dupliquen cadena ni creen registros indebidos.
11. Los reintentos de transporte no creen nuevos registros fiscales.
12. Dos dispositivos no puedan sobrescribir un documento bloqueado.
13. Reimportar o importar backup no degrade documentos bloqueados sin resolucion explicita.
14. Clientes antiguos no puedan mutar documentos bloqueados.
15. Tests locales pasen:
    - `npm test`
    - `npm run lint`
    - `npx tsc --noEmit`
    - `npm run build`
    - pruebas nuevas de integridad documental y concurrencia VeriFactu.
16. Supabase local/staging pasen migraciones up de Fase 2B cuando existan.
17. Produccion siga pendiente hasta validacion separada con plan de migracion.
