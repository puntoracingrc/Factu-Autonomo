import type { BusinessFiscalProfile } from "./fiscal-profile/types";
import type { TaxModelDiagnosticSession } from "./tax-model-diagnostic/contracts";
import type { FiscalNotificationsWorkspace } from "./fiscal-notifications/types";
import type { FiscalAdvisoryModelPreferencesV1 } from "./fiscal-advisory-models/preferences";

export type DocumentType = "factura" | "presupuesto" | "recibo";

export type DocumentKind =
  "factura" | "factura_rectificativa" | "presupuesto" | "recibo";

export type DocumentStatus =
  | "borrador"
  | "enviado"
  | "aceptado"
  | "rechazado"
  | "pagado"
  | "vencido"
  | "rectificada"
  | "anulada";

export type DocumentLifecycle = "draft" | "issued" | "canceled";

export type DocumentIntegrityLock = "unlocked" | "locked";

export type DocumentDeliveryStatus = "not_sent" | "sent";

export type DocumentPaymentStatus =
  "not_applicable" | "pending" | "paid" | "overdue";

export interface DocumentCollectionStatusOverrideV1 {
  schemaVersion: 1;
  status: "collected" | "pending";
  updatedAt: string;
}

export type DocumentAcceptanceStatus =
  "not_applicable" | "pending" | "accepted" | "rejected";

export type RectificationType = "anulacion" | "correccion";

export interface RectificationInfo {
  originalDocumentId: string;
  originalNumber: string;
  originalDate: string;
  reason: string;
  type: RectificationType;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  /** Identificador de unidad (ud, m, m2, h…) */
  unit?: string;
  unitPrice: number;
  ivaPercent: number;
}

export interface LineItemSnapshot {
  id: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  ivaPercent: number;
  subtotal: number;
  ivaAmount: number;
  total: number;
}

export interface DocumentUnitsSettings {
  enabledUnitIds: string[];
  defaultUnitId: string;
}

export type CustomerType = "person" | "company";
export type AddressResidenceType =
  | ""
  | "flat"
  | "house"
  | "chalet"
  | "duplex"
  | "attic"
  | "ground_floor"
  | "local"
  | "shop"
  | "office"
  | "warehouse"
  | "workshop"
  | "storage"
  | "garage"
  | "storage_room"
  | "plot"
  | "farm";

export interface Client {
  customerType?: CustomerType;
  firstName?: string;
  lastName?: string;
  name: string;
  contactName?: string;
  nif?: string;
  email?: string;
  phone?: string;
  /** Tipo de vía congelado en el documento (calle, avenida…). */
  streetType?: string;
  /** Piso/puerta/escalera, cuando aplica. */
  addressExtra?: string;
  /** Tipo de inmueble cuando ayuda a entender la dirección. */
  residenceType?: AddressResidenceType;
  address?: string;
  /** Ciudad congelada en el documento. */
  city?: string;
  /** Código postal congelado en el documento. */
  postalCode?: string;
}

export interface Customer {
  id: string;
  customerType?: CustomerType;
  firstName: string;
  lastName: string;
  name: string;
  contactName?: string;
  /** IDs de fichas absorbidas en una fusión segura. */
  mergedCustomerIds?: string[];
  nif?: string;
  email?: string;
  phone?: string;
  /** Identificador de tipo de vía (calle, avenida…). */
  streetType?: string;
  addressExtra?: string;
  residenceType?: AddressResidenceType;
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssuerSnapshot {
  commercialName?: string;
  name: string;
  nif: string;
  vatId?: string;
  address: string;
  city: string;
  postalCode: string;
  province?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  iban?: string;
  logoUrl?: string;
  capturedAt: string;
}

export interface Document {
  id: string;
  type: DocumentType;
  number: string;
  date: string;
  dueDate?: string;
  /** Referencia editable a la ficha maestra; `client` sigue siendo snapshot visible. */
  customerId?: string;
  client: Client;
  items: LineItem[];
  notes?: string;
  /** Condiciones de venta visibles en el PDF, separadas de las notas libres. */
  salesTerms?: string;
  /** Forma de pago visible en el PDF (transferencia, Bizum, etc.) */
  paymentTerms?: string;
  status: DocumentStatus;
  /** Encabezado del emisor congelado al emitir (no cambia si editas Configuración). */
  issuer?: IssuerSnapshot;
  rectification?: RectificationInfo;
  rectifiedById?: string;
  /** Registro Veri*Factu (hash encadenado, QR, CSV) */
  verifactu?: VerifactuInfo;
  /** Origen operativo de la confirmación; no forma parte del snapshot fiscal. */
  verifactuPersistence?:
    "server_confirmed" | "legacy_unverified" | "simulation";
  /** Snapshot fiscal/documental congelado al emitir. */
  documentSnapshot?: DocumentSnapshot;
  /**
   * Atestación explícita de un documento histórico importado. No es un sello
   * de emisión de esta app ni acredita Veri*Factu.
   */
  legacyImportAttestation?: LegacyImportAttestation;
  /**
   * Recuperación explícita y reversible de una incidencia histórica de Factu.
   * No es una importación legacy, un sello de emisión ni evidencia Veri*Factu.
   */
  appIssuedRecoveryAttestation?: AppIssuedDocumentRecoveryAttestation;
  /** Procedencia persistente también para borradores externos todavía editables. */
  legacyImportProvenance?: LegacyImportProvenance;
  /** Snapshot mínimo de configuración PDF congelado al emitir. */
  pdfSnapshot?: DocumentPdfSnapshot;
  /**
   * Sello externo a los snapshots. Permite distinguir una ausencia legacy
   * migrable de la pérdida posterior de contenido que ya era obligatorio.
   */
  snapshotSeal?: DocumentSnapshotSeal;
  /** Expectativa persistente: este documento ya debe conservar sello y pareja. */
  snapshotIntegrityRequired?: true;
  /** Señal local segura: impide usar snapshots cuyo hash no se puede verificar. */
  snapshotIntegrity?: DocumentSnapshotIntegritySignal;
  /** Copia opaca recuperable cuando la proyección activa tuvo que sanear datos. */
  integrityQuarantine?: {
    reason: "malformed_document";
    rawDocument: unknown;
  };
  /** Ciclo documental nuevo; `status` se mantiene como compatibilidad UI. */
  documentLifecycle?: DocumentLifecycle;
  /** Bloqueo de integridad: documentos emitidos/cancelados no admiten edición genérica. */
  integrityLock?: DocumentIntegrityLock;
  deliveryStatus?: DocumentDeliveryStatus;
  paymentStatus?: DocumentPaymentStatus;
  acceptanceStatus?: DocumentAcceptanceStatus;
  issuedAt?: string;
  sentAt?: string;
  paidAt?: string;
  acceptedAt?: string;
  /**
   * Estado de cobro operativo elegido por el usuario para un histórico
   * importado. No modifica ni forma parte de su contenido fiscal atestado.
   */
  collectionStatusOverride?: DocumentCollectionStatusOverrideV1;
  /** Presupuesto desde el que se creó esta factura en borrador. */
  sourceQuoteDocumentId?: string;
  sourceQuoteNumber?: string;
  /** Recibo generado automáticamente al cobrar una factura */
  sourceDocumentId?: string;
  /** Recibo vinculado cuando la factura se marca como cobrada */
  receiptDocumentId?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentSnapshotIntegrityIssue =
  | "document_snapshot_missing"
  | "document_hash_mismatch"
  | "document_hash_unsupported"
  | "document_snapshot_invalid"
  | "document_snapshot_semantic_invalid"
  | "document_relationship_invalid"
  | "draft_snapshot_state_invalid"
  | "pdf_snapshot_missing"
  | "pdf_hash_mismatch"
  | "pdf_hash_unsupported"
  | "pdf_snapshot_invalid"
  | "pdf_snapshot_semantic_invalid"
  | "pdf_without_document_snapshot"
  | "snapshot_seal_missing"
  | "snapshot_seal_invalid"
  | "document_seal_identity_mismatch"
  | "snapshot_context_mismatch"
  | "document_strong_hash_mismatch"
  | "pdf_strong_hash_mismatch"
  | "document_seal_mismatch"
  | "pdf_seal_mismatch"
  | "legacy_import_attestation_invalid"
  | "app_issued_recovery_invalid";

export interface DocumentSnapshotSeal {
  version: 1;
  documentId: string;
  contextHash: string;
  documentContentHash: string;
  pdfContentHash: string;
  documentSnapshotHash: string;
  pdfSnapshotHash: string;
}

export interface DocumentSnapshotIntegritySignal {
  status: "blocked";
  issues: DocumentSnapshotIntegrityIssue[];
}

export interface Supplier {
  id: string;
  name: string;
  nif?: string;
  email?: string;
  phone?: string;
  website?: string;
  streetType?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  category?: string;
  notes?: string;
  createdAt: string;
}

export type RecurringExpenseFrequency = "monthly" | "quarterly" | "annual";

export type RecurringDueTiming =
  | { kind: "start_of_month" }
  | { kind: "mid_of_month" }
  | { kind: "end_of_month" }
  | { kind: "day_of_month"; day: number };

export type RecurringDuration =
  | { kind: "indefinite" }
  | { kind: "until_date"; endDate: string }
  | { kind: "occurrences"; count: number };

export interface RecurringOccurrenceExclusion {
  /** Clave estable `${recurringExpenseId}:${YYYY-MM-DD}` de la ocurrencia. */
  key: string;
  /** Instante en el que el usuario excluyó el cargo generado. */
  excludedAt: string;
}

export interface RecurringOccurrenceExclusionSyncPayload extends RecurringOccurrenceExclusion {
  /** Plantilla a la que pertenece la exclusión estable. */
  templateId: string;
}

export interface RecurringExpense {
  id: string;
  supplierName: string;
  description: string;
  amount: number;
  ivaPercent: number;
  /** Marca gastos reales que el usuario quiere controlar sin tratarlos como desgravables. */
  deductibility?: ExpenseDeductibility;
  category: string;
  paymentMethod: string;
  frequency: RecurringExpenseFrequency;
  dueTiming: RecurringDueTiming;
  /** Mes 1-12 para gastos anuales */
  dueMonth?: number;
  duration: RecurringDuration;
  startDate: string;
  /**
   * Fecha que conserva la cadencia original al abrir un tramo posterior.
   * Si falta o no es válida, el calendario usa `startDate`.
   */
  scheduleAnchorDate?: string;
  enabled: boolean;
  notes?: string;
  /**
   * Tombstones de cargos concretos borrados por el usuario. Al vivir en la
   * plantilla viajan con la copia local, backups y sincronización cloud.
   */
  occurrenceExclusions?: RecurringOccurrenceExclusion[];
  createdAt: string;
  updatedAt: string;
}

export type ExpenseBusinessKind =
  "purchase" | "purchase_invoice" | "quick_ticket" | "fixed";

export type ExpenseDeductibility = "deductible" | "non_deductible" | "personal";

export type ExpenseLineCalculationBasis =
  "m2" | "ml" | "unit" | "kg" | "hour" | "fixed" | "unknown";

export type ExpenseLineCalculationFormula =
  | "m2*netPrice"
  | "ml*netPrice"
  | "units*netPrice"
  | "quantity*unitPrice"
  | "fixed"
  | "unknown";

export type ExpenseLineProductRole =
  | "main_product"
  | "component"
  | "service"
  | "shipping"
  | "discount"
  | "unknown";

export interface ExpensePurchaseLine {
  id: string;
  /** Referencia/código del proveedor leído en columnas tipo REF., Código o Artículo. */
  supplierReference?: string;
  description: string;
  /** Si esta línea alimenta el catálogo de productos y sus históricos de coste. */
  catalogProduct?: boolean;
  /** Cantidad original de la columna Cant./Uds.; puede ser distinta de la cantidad cobrada. */
  sourceQuantity?: number;
  quantity: number;
  /** Cantidad que realmente multiplica el precio neto: m2, ml o unidades. */
  chargeQuantity?: number;
  calculationBasis?: ExpenseLineCalculationBasis;
  /** Unidad leída o introducida: ud, m, h, kg... */
  unit?: string;
  dimensionUnit?: "mm" | "cm" | "m" | "unknown";
  width?: number;
  height?: number;
  length?: number;
  /** Precio unitario sin IVA, antes de descuento si existe. */
  unitPrice: number;
  discountPercent?: number;
  /** Precio neto tras descuento cuando el proveedor lo muestra separado. */
  netUnitPrice?: number;
  ivaPercent?: number;
  /** Base de la línea sin IVA tras descuento, si viene del documento. */
  total?: number;
  calculationFormula?: ExpenseLineCalculationFormula;
  calculationExpectedTotal?: number;
  calculationDifference?: number;
  productGroupIndex?: number;
  productRole?: ExpenseLineProductRole;
}

export interface ExpensePurchaseDocument {
  /** Número que aparece en la factura del proveedor. */
  invoiceNumber?: string;
  /** Fecha de emisión del documento del proveedor. */
  issueDate?: string;
  /** Fecha de vencimiento o pago si aparece. */
  dueDate?: string;
  /** NIF/CIF del proveedor leído del documento. */
  supplierNif?: string;
  supplierAddress?: string;
  supplierPostalCode?: string;
  supplierCity?: string;
  /** Condiciones o forma de pago escrita por el proveedor. */
  paymentTerms?: string;
}

export type ProviderSummaryExpenseStatus =
  "pending_original" | "completed_with_original";

export interface ExpenseProviderSummaryInfo {
  status: ProviderSummaryExpenseStatus;
  summaryId: string;
  fileName?: string;
  importedAt: string;
  providerName?: string;
  completedAt?: string;
  summaryInvoiceTotal?: number;
  /** Tipo de IVA que figuraba en el resumen, aunque no sea recuperable. */
  summaryIvaPercent?: number;
  summaryIvaAmount?: number;
  /** Tipo de recargo de equivalencia indicado por el proveedor. */
  summaryRecargoPercent?: number;
  /** Cuota de recargo separada del IVA y aplicada sobre la misma base. */
  summaryRecargoAmount?: number;
}

/** Reparto operativo de un gasto entre trabajos. No modifica el documento fiscal. */
export interface ExpenseWorkAllocation {
  workDocumentId: string;
  /** Coste operativo aplicado a este trabajo, sin alterar el total del gasto. */
  amount: number;
  /** Líneas de compra incluidas cuando el gasto tiene detalle estructurado. */
  includedLineIds?: string[];
  /** `operatingCost` canónico firmado usado al crear o actualizar este reparto. */
  fullAmountAtAllocation?: number;
  allocatedAt: string;
  updatedAt?: string;
}

export interface ExpenseWorkAllocationCostRepairEvent {
  action: "applied" | "rolled_back";
  at: string;
}

/**
 * Evidencia reversible de una reconciliación explícita de repartos antiguos.
 * Vive en el gasto operativo y nunca modifica el documento fiscal vinculado.
 */
export interface ExpenseWorkAllocationCostRepair {
  schemaVersion: 1;
  kind: "provider_summary_equivalence_surcharge_v1";
  repairId: string;
  status: "applied" | "rolled_back";
  legacyOperatingCost: number;
  canonicalOperatingCost: number;
  beforeFingerprint: string;
  afterFingerprint: string;
  beforeAllocations: ExpenseWorkAllocation[];
  afterAllocations: ExpenseWorkAllocation[];
  events: ExpenseWorkAllocationCostRepairEvent[];
}

/**
 * Referencia mínima a un original de gasto verificado en el Drive del usuario.
 * Factu no conserva nombre local, ruta, bytes, texto ni token de Google.
 */
export interface ExpenseOriginalArchiveV1 {
  schemaVersion: 1;
  status: "archived_verified";
  source: "scan" | "expense_inbox";
  sourceSha256: string;
  sourceMimeType:
    "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  driveFileId: string;
  driveFolderId: string;
  documentDate: string;
  verification: "SHA256_READBACK_MATCH";
  archivedAt: string;
}

export interface Expense {
  id: string;
  date: string;
  origin?: "manual" | "scan" | "import" | "recurring";
  /** Entrada del buzón que originó el gasto; evita duplicarlo si falla su cierre. */
  sourceInboxItemId?: string;
  /** Original PDF/imagen verificado en el Drive del usuario; nunca contiene bytes. */
  originalArchive?: ExpenseOriginalArchiveV1;
  /** Clasificación práctica para separar compras, facturas recibidas, tickets y fijos. */
  businessKind?: ExpenseBusinessKind;
  supplierId?: string;
  supplierName: string;
  description: string;
  amount: number;
  ivaPercent: number;
  /** Marca gastos reales que el usuario quiere controlar sin tratarlos como desgravables. */
  deductibility?: ExpenseDeductibility;
  category: string;
  paymentMethod: string;
  notes?: string;
  /** Datos estructurados de la factura/ticket de proveedor. */
  purchaseDocument?: ExpensePurchaseDocument;
  /** Líneas de compra detectadas por IA o introducidas manualmente. */
  purchaseLines?: ExpensePurchaseLine[];
  /** Gasto creado desde un resumen de proveedor, pendiente de la factura original. */
  providerSummary?: ExpenseProviderSummaryInfo;
  /** Factura o presupuesto al que pertenece esta compra para calcular margen del trabajo. */
  workDocumentId?: string;
  /** Repartos operativos persistentes; permite usar líneas distintas en varios trabajos. */
  workAllocations?: ExpenseWorkAllocation[];
  /** El usuario ha indicado que el importe restante no corresponde a ningún trabajo. */
  workAllocationClosed?: boolean;
  /** Auditoría reversible de un ajuste explícito del coste de los repartos. */
  workAllocationCostRepair?: ExpenseWorkAllocationCostRepair;
  /** Gasto generado desde un gasto fijo */
  recurringExpenseId?: string;
  recurringOccurrenceKey?: string;
  createdAt: string;
}

export type ProductSource = "manual" | "detected";

export interface ProductSaleFacet {
  enabled?: boolean;
  description?: string;
  unit?: string;
  /** Precio de venta recomendado al cliente, sin IVA. */
  unitPrice?: number;
  ivaPercent?: number;
}

export interface ProductPurchaseFacet {
  enabled?: boolean;
  description?: string;
  unit?: string;
  /** Tarifa del proveedor antes de descuento, sin IVA. */
  listPrice?: number;
  discountPercent?: number;
  /** Coste real tras descuento, sin IVA. */
  netUnitCost?: number;
  ivaPercent?: number;
  supplierId?: string;
  supplierName?: string;
  supplierReference?: string;
  /** Cuántas unidades de venta equivale a una unidad de compra. */
  purchaseToSaleFactor?: number;
}

export type ProductCalculationKind = "none" | "area";

export interface ProductCalculationTemplate {
  kind: ProductCalculationKind;
  unit?: string;
  roundingDecimals?: number;
}

export interface ProductAttribute {
  key: string;
  label: string;
  value: string;
  unit?: string;
}

/** Producto o material reutilizable; puede nacer manualmente o desde líneas escaneadas. */
export interface Product {
  id: string;
  /** Clave normalizada usada para respetar futuras detecciones del mismo producto. */
  key: string;
  /** Otras claves detectadas que se han unido a este producto. */
  aliases?: string[];
  name: string;
  family: string;
  subfamily?: string;
  sku?: string;
  externalId?: string;
  unit?: string;
  supplierId?: string;
  supplierName?: string;
  /** Precio de tarifa/PVP proveedor antes de descuento, sin IVA. */
  pvp?: number;
  /** Coste habitual neto tras descuento, sin IVA. */
  cost?: number;
  ivaPercent?: number;
  sales?: ProductSaleFacet;
  purchase?: ProductPurchaseFacet;
  calculation?: ProductCalculationTemplate;
  /** Campos libres para sectores distintos: talla, color, material, tejido, acabado... */
  attributes?: ProductAttribute[];
  notes?: string;
  /** Oculto de la lista sin borrar las compras históricas que lo originaron. */
  hidden?: boolean;
  source: ProductSource;
  createdAt: string;
  updatedAt: string;
}

export interface IvaSettings {
  rates: number[];
  defaultRate: number;
}

export interface NumberingLastSequence {
  factura: number;
  factura_rectificativa: number;
  presupuesto: number;
  recibo: number;
}

export interface NumberingFormat {
  template: string;
  padding: number;
}

export interface NumberingFormats {
  factura: NumberingFormat;
  factura_rectificativa: NumberingFormat;
  presupuesto: NumberingFormat;
  recibo: NumberingFormat;
}

export interface NumberingSettings {
  year: number;
  lastSequence: NumberingLastSequence;
  formats: NumberingFormats;
}

export interface GooglePlacesSettings {
  enabled: boolean;
}

export interface TaxRateSummarySnapshot {
  ivaPercent: number;
  taxableBase: number;
  ivaAmount: number;
  total: number;
}

export interface TaxSummarySnapshot {
  subtotal: number;
  iva: number;
  total: number;
  vatExempt: boolean;
  byRate: TaxRateSummarySnapshot[];
}

export interface NumberingSnapshot {
  documentKind: DocumentKind;
  number: string;
  year: number;
  format: NumberingFormat;
}

export interface VerifactuSettings {
  enabled: boolean;
  environment: "test" | "production";
  /** Consentimiento explícito introducido al pasar VeriFactu a opt-in seguro. */
  optInVersion?: 1;
}

export interface VerifactuChainState {
  issuerNif: string;
  lastHash: string;
  lastNumSerie?: string;
  lastFechaExpedicion?: string;
  recordCount: number;
}

export type VerifactuSubmissionStatus =
  "registered" | "test_registered" | "pending" | "failed" | "not_required";

export interface VerifactuInfo {
  recordHash: string;
  previousHash: string;
  recordTimestamp: string;
  qrUrl: string;
  csv?: string;
  status: VerifactuSubmissionStatus;
  recordType: "alta" | "anulacion";
  environment: "test" | "production";
  /** Código AEAT: F1, R1, R4… */
  tipoFactura?: string;
  cuotaTotal?: string;
  importeTotal?: string;
  submittedAt?: string;
  errorMessage?: string;
}

export interface DocumentPhrase {
  id: string;
  text: string;
  documentType: DocumentType;
}

export interface DocumentPhrasesSettings {
  phrases: DocumentPhrase[];
  defaultPhraseId: Partial<Record<DocumentType, string>>;
}

export interface DocumentPaymentMethod {
  id: string;
  text: string;
  documentType: DocumentType;
}

export interface DocumentPaymentMethodsSettings {
  methods: DocumentPaymentMethod[];
  defaultMethodId: Partial<Record<DocumentType, string>>;
}

export type DocumentTemplateStyle = "clasico" | "editorial" | "futuro";
export type DocumentTemplateFont = "moderna" | "limpia" | "clasica" | "tecnica";
export type DocumentTemplateAccent = "azul" | "esmeralda" | "carbon" | "coral";
export type DocumentTemplateDensity = "compacta" | "normal" | "amplia";
export type DocumentTemplateFontSize = "pequena" | "normal" | "grande";

export interface DocumentTemplateSettings {
  style: DocumentTemplateStyle;
  font: DocumentTemplateFont;
  accent: DocumentTemplateAccent;
  density: DocumentTemplateDensity;
  bodyFontSize: DocumentTemplateFontSize;
  titleFontSize: DocumentTemplateFontSize;
  issuerFontSize: DocumentTemplateFontSize;
  totalFontSize: DocumentTemplateFontSize;
  showLogo: boolean;
  showIssuerBox: boolean;
  showPaymentBox: boolean;
}

export interface ProductFamilyMarkupRule {
  id: string;
  family: string;
  /** Incremento automático sobre base de proveedor/coste al llevar productos a documentos. */
  markupPercent: number;
}

export interface ProductFamilyMarkupSettings {
  rules: ProductFamilyMarkupRule[];
}

export type AppThemePreference = "system" | "light" | "dark";
export type AppDensityPreference = "comfortable" | "compact";
export type AppStartPagePreference =
  "panel" | "customers" | "invoices" | "expenses" | "taxes" | "settings";
export type DocumentEmailSendPreference = "ask" | "gmail" | "mailto" | "native";
export type DocumentWhatsAppSendPreference = "ask" | "direct" | "native";

export interface AppPreferences {
  theme: AppThemePreference;
  density: AppDensityPreference;
  startPage: AppStartPagePreference;
  reduceMotion: boolean;
  documentEmailMethod: DocumentEmailSendPreference;
  documentWhatsAppMethod: DocumentWhatsAppSendPreference;
}

export type DocumentSnapshotSource =
  | "issue"
  | "legacy_backfill"
  | "legacy_import_attested"
  | "customer_repair"
  | "app_issued_recovery";

export type LegacyImportSource =
  "pcfacturacion" | "holded" | "facturadirecta" | "generic_documents";

export type LegacyImportCompletenessException =
  | "issuer_name_missing"
  | "issuer_nif_missing_or_nonstandard"
  | "issuer_address_missing"
  | "issuer_city_missing"
  | "issuer_postal_code_missing"
  | "customer_name_missing"
  | "customer_nif_missing_or_nonstandard"
  | "customer_address_missing"
  | "customer_city_missing"
  | "customer_postal_code_missing"
  | "line_description_missing";

interface LegacyImportAcceptedStateV1 {
  status: DocumentStatus;
  documentLifecycle: "issued";
  integrityLock: "locked";
  deliveryStatus: DocumentDeliveryStatus | null;
  paymentStatus: DocumentPaymentStatus | null;
  acceptanceStatus: DocumentAcceptanceStatus | null;
  issuedAt: string | null;
  sentAt: string | null;
  paidAt: string | null;
  acceptedAt: string | null;
  updatedAt: string;
  relationships: {
    sourceQuoteDocumentId: string | null;
    sourceQuoteNumber: string | null;
    rectifiedById: null;
    receiptDocumentId: null;
    sourceDocumentId: null;
  };
}

export type LegacyImportRelationshipKind =
  "rectification_correction" | "rectification_cancellation" | "invoice_receipt";

export type LegacyImportRelationshipRole =
  "original_invoice" | "rectification" | "invoice" | "receipt";

interface LegacyImportAcceptedStateV3 extends Omit<
  LegacyImportAcceptedStateV1,
  "documentLifecycle" | "relationships"
> {
  documentLifecycle: "issued" | "canceled";
  relationships: {
    sourceQuoteDocumentId: string | null;
    sourceQuoteNumber: string | null;
    rectifiedById: string | null;
    receiptDocumentId: string | null;
    sourceDocumentId: string | null;
  };
}

interface LegacyImportOriginalEvidenceV1 {
  /**
   * Los importadores actuales no conservan el binario original. El usuario
   * debe guardarlo fuera de la app hasta que exista almacenamiento de adjuntos.
   */
  kind: "source_files_not_stored";
  preservation: "user_managed";
}

interface LegacyImportAttestationBaseV1 {
  kind: "historical_import_user_accepted";
  importer: LegacyImportSource;
  documentId: string;
  attestedAt: string;
  snapshotContentHash: string;
  originalEvidence: LegacyImportOriginalEvidenceV1;
  /** Estado operativo y relaciones congelados al aceptar el histórico. */
  acceptedState: LegacyImportAcceptedStateV1;
  attestationHash: string;
}

export interface LegacyImportAttestationV1 extends LegacyImportAttestationBaseV1 {
  schemaVersion: 1;
}

/**
 * Huellas del paquete técnico que el rollout inicial generó para una
 * importación externa. No conserva ni afirma un PDF original, un sello de
 * emisión de Factu o evidencia Veri*Factu: el rollback del alcance exportable
 * depende de la copia completa descargada antes de confirmar la reparación.
 */
export interface LegacyImportRolloutRepairEvidenceV1 {
  schemaVersion: 1;
  kind: "verified_importer_rollout_bundle";
  beforeDocumentFingerprint: string;
  bundleFingerprint: string;
  documentSnapshotStrongHash: string;
  pdfSnapshotStrongHash: string;
  sealContextHash: string;
  hadVerifactuProfileContext: boolean;
  rollback: "external_workspace_backup";
}

/**
 * V2 hace explícita la decisión del usuario de conservar el contenido fiscal
 * histórico tal como fue importado, aunque no cumpla campos exigidos hoy.
 */
export interface LegacyImportAttestationV2 extends LegacyImportAttestationBaseV1 {
  schemaVersion: 2;
  acceptanceBasis: "amounts_as_filed_user_attested";
  amountOrigin: "verified_legacy_snapshot" | "persisted_lines_user_confirmed";
  /** Procedencia original preservada; `attestedAt` es una fecha distinta. */
  importProvenance: LegacyImportProvenanceV2;
  sourceRecord: {
    type: DocumentType;
    number: string;
    date: string;
    dueDate?: string;
    client: Client;
    items: LineItem[];
    issuer: IssuerSnapshot;
    notes?: string;
    paymentTerms?: string;
  };
  sourceRecordHash: string;
  acceptedTaxSummary: TaxSummarySnapshot;
  acceptedContentPolicy: {
    kind: "stored_fiscal_content_user_authoritative";
    completenessExceptions: LegacyImportCompletenessException[];
  };
  /** Registro auditado y sin PII de una conversión explícita del rollout. */
  rolloutRepairEvidence?: LegacyImportRolloutRepairEvidenceV1;
}

/**
 * V3 conserva una relación histórica inequívoca como un grupo atómico. No
 * convierte la pareja en documentos emitidos por Factu ni fabrica evidencia
 * moderna: ambos extremos siguen siendo históricos importados atestados.
 */
export interface LegacyImportAttestationV3 extends Omit<
  LegacyImportAttestationV2,
  "schemaVersion" | "acceptedState" | "attestationHash"
> {
  schemaVersion: 3;
  acceptedState: LegacyImportAcceptedStateV3;
  relationshipGroup: {
    kind: LegacyImportRelationshipKind;
    role: LegacyImportRelationshipRole;
    counterpartDocumentId: string;
    /** Huella canónica y recalculable del grupo mostrado y confirmado. */
    groupFingerprint: string;
    /** Hash del vínculo y del contenido fiscal congelado de ambos extremos. */
    relationshipHash: string;
  };
  attestationHash: string;
}

export type LegacyImportAttestation =
  | LegacyImportAttestationV1
  | LegacyImportAttestationV2
  | LegacyImportAttestationV3;

export interface LegacyImportProvenanceV1 {
  schemaVersion: 1;
  kind: "external_import";
  importer: LegacyImportSource;
  importedAt: string;
}

export type LegacyImportIssuerOrigin =
  "source_document" | "current_profile_at_import" | "unknown_legacy_import";

/**
 * V2 separa una fecha de importación realmente conocida de la fecha en la que
 * se registró la procedencia. También declara si el encabezado del emisor vino
 * del archivo histórico o del perfil activo usado por el importador.
 */
export interface LegacyImportProvenanceV2 {
  schemaVersion: 2;
  kind: "external_import";
  importer: LegacyImportSource;
  importedAt: string | null;
  provenanceRecordedAt: string;
  issuerOrigin: LegacyImportIssuerOrigin;
  documentStateAtImport: "draft" | "issued" | "unknown_legacy_import";
}

export type LegacyImportProvenance =
  LegacyImportProvenanceV1 | LegacyImportProvenanceV2;

export type AppIssuedDocumentRecoveryKindV1 =
  "pre_canonical_rectification_v1" | "receipt_source_snapshot_gap_v1";

export type AppIssuedDocumentRecoveryKindV2 =
  "pre_seal_snapshot_pdf_gap_v1" | "receipt_source_and_payment_markers_gap_v1";

export type AppIssuedDocumentRecoveryKind =
  AppIssuedDocumentRecoveryKindV1 | AppIssuedDocumentRecoveryKindV2;

export type AppIssuedDocumentRecoveryRole =
  | "original_invoice"
  | "rectification"
  | "standalone_invoice"
  | "invoice"
  | "receipt";

export type AppIssuedDocumentRecoveryVerifactuDispositionV2 =
  "none" | "profile_context_only" | "preserved_unattested_test_artifact";

export interface AppIssuedDocumentRecoveryPdfEvidenceV1 {
  kind: "external_pdf_user_confirmed";
  sha256: string;
  byteLength: number;
  mediaType: "application/pdf";
  preservation: "user_managed";
  confirmedSummary: {
    number: string;
    date: string;
    subtotal: number;
    iva: number;
    total: number;
    /** Huella del snapshot fiscal completo que el usuario contrastó en UI. */
    confirmedFiscalContentHash: string;
  };
}

export type AppIssuedDocumentRecoveryEvidenceSlotV1<T> =
  { present: false } | { present: true; value: T };

export interface AppIssuedDocumentRecoveryBeforeEvidenceV1 {
  documentSnapshot: AppIssuedDocumentRecoveryEvidenceSlotV1<DocumentSnapshot>;
  pdfSnapshot: AppIssuedDocumentRecoveryEvidenceSlotV1<DocumentPdfSnapshot>;
  snapshotSeal: AppIssuedDocumentRecoveryEvidenceSlotV1<DocumentSnapshotSeal>;
  snapshotIntegrityRequired: AppIssuedDocumentRecoveryEvidenceSlotV1<true>;
  snapshotIntegrity: AppIssuedDocumentRecoveryEvidenceSlotV1<DocumentSnapshotIntegritySignal>;
  verifactu: AppIssuedDocumentRecoveryEvidenceSlotV1<VerifactuInfo>;
  verifactuPersistence: AppIssuedDocumentRecoveryEvidenceSlotV1<
    NonNullable<Document["verifactuPersistence"]>
  >;
}

export interface AppIssuedDocumentRecoveryAcceptedStateV1 {
  status: DocumentStatus;
  documentLifecycle: "issued" | "canceled";
  integrityLock: "locked";
  deliveryStatus: DocumentDeliveryStatus | null;
  paymentStatus: DocumentPaymentStatus | null;
  acceptanceStatus: DocumentAcceptanceStatus | null;
  issuedAt: string | null;
  sentAt: string | null;
  paidAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  relationships: {
    sourceQuoteDocumentId: string | null;
    sourceQuoteNumber: string | null;
    rectifiedById: string | null;
    receiptDocumentId: string | null;
    sourceDocumentId: string | null;
  };
}

export interface AppIssuedDocumentRecoveryEventV1 {
  action: "applied" | "rolled_back";
  at: string;
}

/**
 * Atestación de recuperación de contenido emitido por Factu. Mantiene la
 * evidencia original byte-semánticamente separada y nunca equivale al sello
 * moderno de emisión ni a una atestación de importación legacy.
 */
export interface AppIssuedDocumentRecoveryAttestationV1 {
  schemaVersion: 1;
  kind: "app_issued_document_recovery";
  recoveryKind: AppIssuedDocumentRecoveryKindV1;
  repairId: string;
  status: "applied" | "rolled_back";
  documentId: string;
  role: AppIssuedDocumentRecoveryRole;
  counterpartDocumentId: string;
  groupFingerprint: string;
  acceptedState: AppIssuedDocumentRecoveryAcceptedStateV1;
  beforeEvidence: AppIssuedDocumentRecoveryBeforeEvidenceV1;
  beforeFingerprint: string;
  afterFingerprint: string;
  sourcePdfEvidence?: AppIssuedDocumentRecoveryPdfEvidenceV1;
  /** Snapshot reconstruido y etiquetado solo para contenido sin bundle. */
  recoveredSnapshot?: DocumentSnapshot;
  events: AppIssuedDocumentRecoveryEventV1[];
  attestationHash: string;
}

/**
 * V2 añade grupos standalone y declara expresamente cómo se trató cualquier
 * contexto o artefacto TEST local de Veri*Factu. No eleva ese artefacto a
 * acreditación ni modifica la evidencia original del documento.
 */
export interface AppIssuedDocumentRecoveryAttestationV2 {
  schemaVersion: 2;
  kind: "app_issued_document_recovery";
  recoveryKind: AppIssuedDocumentRecoveryKindV2;
  repairId: string;
  status: "applied" | "rolled_back";
  documentId: string;
  role: AppIssuedDocumentRecoveryRole;
  counterpartDocumentId: string | null;
  groupFingerprint: string;
  acceptedState: AppIssuedDocumentRecoveryAcceptedStateV1;
  beforeEvidence: AppIssuedDocumentRecoveryBeforeEvidenceV1;
  beforeFingerprint: string;
  afterFingerprint: string;
  sourcePdfEvidence?: AppIssuedDocumentRecoveryPdfEvidenceV1;
  recoveredSnapshot?: DocumentSnapshot;
  verifactuDisposition: AppIssuedDocumentRecoveryVerifactuDispositionV2;
  events: AppIssuedDocumentRecoveryEventV1[];
  attestationHash: string;
}

export type AppIssuedDocumentRecoveryAttestation =
  | AppIssuedDocumentRecoveryAttestationV1
  | AppIssuedDocumentRecoveryAttestationV2;

export interface FiscalContextSnapshot {
  vatExempt: boolean;
  iva: IvaSettings;
  verifactu?: VerifactuSettings;
}

export interface DocumentSnapshot {
  schemaVersion: number;
  capturedAt: string;
  source: DocumentSnapshotSource;
  documentType: DocumentType;
  documentKind: DocumentKind;
  number: string;
  date: string;
  dueDate?: string;
  issuer: IssuerSnapshot;
  customer: Client;
  items: LineItemSnapshot[];
  taxSummary: TaxSummarySnapshot;
  currency: "EUR";
  paymentTerms?: string;
  salesTerms?: string;
  notes?: string;
  rectification?: RectificationInfo;
  /** Factura de origen congelada al emitir un recibo automático nuevo. */
  sourceDocumentId?: string;
  numbering: NumberingSnapshot;
  fiscalContext: FiscalContextSnapshot;
  verifactu?: VerifactuInfo;
  snapshotHash: string;
}

export interface DocumentPdfSnapshot {
  schemaVersion: number;
  renderedAt: string;
  rendererVersion: string;
  template: DocumentTemplateSettings;
  contentHash: string;
}

export interface AdvisorContact {
  /** Nombre comercial de la gestoría; es opcional incluso al activar la sección. */
  firmName?: string;
  advisorName: string;
  email: string;
  phone: string;
}

export interface BusinessProfile {
  commercialName?: string;
  name: string;
  nif: string;
  vatId?: string;
  address: string;
  city: string;
  postalCode: string;
  province?: string;
  country?: string;
  phone: string;
  email: string;
  website?: string;
  iban?: string;
  logoUrl?: string;
  /** Contacto opcional para correos al gestor iniciados expresamente por el usuario. */
  advisorContact?: AdvisorContact;
  /** Frases reutilizables en notas de facturas, presupuestos y recibos */
  documentPhrases?: DocumentPhrasesSettings;
  /** Formas de pago reutilizables en facturas, presupuestos y recibos */
  documentPaymentMethods?: DocumentPaymentMethodsSettings;
  /** Unidades de medida en líneas de facturas y presupuestos */
  documentUnits?: DocumentUnitsSettings;
  /** Diseño visual de facturas, presupuestos y recibos */
  documentTemplate?: DocumentTemplateSettings;
  /** Incrementos de venta por familia de producto */
  productFamilyMarkups?: ProductFamilyMarkupSettings;
  /** Autorrelleno opcional de direcciones con Google Places para cuentas Pro */
  googlePlaces?: GooglePlacesSettings;
  /** Preferencias de apariencia y comodidad de uso de la app */
  appPreferences?: AppPreferences;
  iva: IvaSettings;
  /** Sin repercutir IVA en ventas ni deducir IVA en gastos */
  vatExempt?: boolean;
  /** Contexto fiscal opcional reutilizado por el Consultor fiscal. */
  fiscalProfile?: BusinessFiscalProfile;
  /** Cuestionario confirmado para orientar los modelos tributarios. */
  taxModelDiagnostic?: TaxModelDiagnosticSession;
  /** Selección manual de fichas; organiza la vista y nunca confirma obligaciones. */
  fiscalAdvisoryModelPreferences?: FiscalAdvisoryModelPreferencesV1;
  /** % IRPF estimado sobre el beneficio (modelo 130 orientativo) */
  irpfPercent?: number;
  /** Días de validez aplicados por defecto a presupuestos nuevos; 0 desactiva la fecha automática. */
  quoteValidityDays?: number;
  numbering: NumberingSettings;
  /** Veri*Factu: registro encadenado y QR en facturas emitidas */
  verifactu?: VerifactuSettings;
}

export type UserReminderLinkKind =
  | "none"
  | "customer"
  | "document"
  | "rectify"
  | "new_invoice"
  | "new_quote"
  | "new_receipt"
  | "new_expense";

export type UserReminderTarget = "self" | "office";

export type UserReminderOrigin = "field" | "office";

export interface UserReminderLink {
  kind: UserReminderLinkKind;
  entityId?: string;
}

/** Recordatorio creado por el usuario; requiere check para archivar. */
export interface UserReminder {
  id: string;
  text: string;
  dueDate?: string;
  dueTime?: string;
  link: UserReminderLink;
  /** self = solo yo; office = visible para quien tenga la cuenta (p. ej. secretaría). */
  target: UserReminderTarget;
  /** Quién lo creó, si se conoce (misma cuenta en varios dispositivos). */
  origin?: UserReminderOrigin;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Copia exacta de un documento retirado mediante el flujo explícito. */
export interface RetiredTestDocumentV1 {
  originalIndex: number;
  document: Document;
}

/** Único backlink operativo que el retiro puede retirar de un documento superviviente. */
export interface TestDocumentRetirementBacklinkChangeV1 {
  documentId: string;
  before: Document;
  after: Document;
}

/** Identidad fiscal/numeración reservada permanentemente, incluso tras rollback. */
export interface ReservedTestDocumentIdentityV1 {
  documentId: string;
  documentType: Document["type"];
  number: string;
}

export interface TestDocumentRetirementBackupEvidenceV1 {
  /** Nombre local, nunca una ruta ni una URL. */
  filename: string;
  createdAt: string;
  exportableDataFingerprint: string;
  /** SHA-256 de los bytes JSON exactos enviados al navegador. */
  contentSha256: string;
  byteLength: number;
  /** El navegador recibió la solicitud; no afirmamos que el SO guardara el archivo. */
  disposition: "browser_download_requested";
}

export interface TestDocumentRetirementEventV1 {
  action: "applied" | "rolled_back";
  at: string;
  beforeFingerprint: string;
  afterFingerprint: string;
  /** Huella de negocio activa inmediatamente antes de la transición. */
  workspaceFingerprint: string;
  backup: TestDocumentRetirementBackupEvidenceV1;
}

/**
 * Registro append-only del retiro explícito de documentos descartados.
 * Conserva la evidencia exacta necesaria para preview, auditoría y rollback.
 */
export interface TestDocumentRetirementBatchV1 {
  schemaVersion: 1;
  kind: "explicit_test_document_retirement_v1";
  batchId: string;
  /** Valor V1 conservado por compatibilidad; semántica de producto ADR-0003 V2. */
  reason: "explicit_test_cleanup";
  status: "applied" | "rolled_back";
  tenantFingerprint: string;
  selectionFingerprint: string;
  /** Huella autocontenida del plan inmutable completo. */
  planFingerprint: string;
  selectedDocumentIds: string[];
  retiredDocuments: RetiredTestDocumentV1[];
  backlinkChanges: TestDocumentRetirementBacklinkChangeV1[];
  reservedIdentities: ReservedTestDocumentIdentityV1[];
  beforeDocumentOrder: string[];
  afterDocumentOrder: string[];
  beforeFingerprint: string;
  afterFingerprint: string;
  events: TestDocumentRetirementEventV1[];
}

export type SyncEntityType =
  | "document"
  | "customer"
  | "expense"
  | "recurring_expense"
  | "recurring_occurrence_exclusion"
  | "supplier"
  | "product"
  | "user_reminder"
  | "document_retirement_batch"
  | "fiscal_notifications_workspace"
  | "profile"
  | "counters"
  | "workspace_metadata";

export interface SyncChange {
  entityType: SyncEntityType;
  entityId: string;
  deleted: boolean;
  payload?: unknown;
  updatedAt: string;
}

export interface AppMeta {
  lastModified: string;
  lastSyncedAt?: string;
  pendingChanges?: SyncChange[];
}

export interface WorkspaceIntegrityQuarantineEntry {
  collection: string;
  index?: number;
  reason: "malformed_collection" | "malformed_record";
  rawValue: unknown;
}

export interface AppData {
  profile: BusinessProfile;
  documents: Document[];
  expenses: Expense[];
  recurringExpenses: RecurringExpense[];
  userReminders: UserReminder[];
  suppliers: Supplier[];
  products: Product[];
  customers: Customer[];
  /** Historial append-only de retiros explícitos; nunca se deriva de la lista activa. */
  testDocumentRetirementBatches?: TestDocumentRetirementBatchV1[];
  /**
   * Expediente fiscal estructurado de la cuenta. No contiene el PDF original
   * ni texto completo y permanece REVIEW_REQUIRED hasta acción explícita.
   */
  fiscalNotificationsWorkspace?: FiscalNotificationsWorkspace;
  counters: {
    factura: number;
    factura_rectificativa: number;
    presupuesto: number;
    recibo: number;
  };
  /** Estado de la cadena de huellas Veri*Factu por NIF emisor */
  verifactuChain?: VerifactuChainState | null;
  /** Marca que la migración local de presencia obligatoria ya se completó. */
  snapshotIntegrityVersion?: 1;
  /** Datos persistidos no interpretables, conservados para recuperación manual. */
  workspaceIntegrityQuarantine?: WorkspaceIntegrityQuarantineEntry[];
  meta?: AppMeta;
}

export const DEFAULT_PROFILE: BusinessProfile = {
  commercialName: "",
  name: "",
  nif: "",
  vatId: "",
  address: "",
  city: "",
  postalCode: "",
  province: "",
  country: "España",
  phone: "",
  email: "",
  website: "",
  iva: {
    rates: [0, 4, 10, 21],
    defaultRate: 21,
  },
  irpfPercent: 20,
  quoteValidityDays: 30,
  googlePlaces: {
    enabled: false,
  },
  appPreferences: {
    theme: "system",
    density: "comfortable",
    startPage: "panel",
    reduceMotion: false,
    documentEmailMethod: "ask",
    documentWhatsAppMethod: "ask",
  },
  productFamilyMarkups: {
    rules: [],
  },
  vatExempt: false,
  verifactu: {
    enabled: false,
    environment: "test",
  },
  numbering: {
    year: new Date().getFullYear(),
    lastSequence: {
      factura: 0,
      factura_rectificativa: 0,
      presupuesto: 0,
      recibo: 0,
    },
    formats: {
      factura: { template: "F-{year}-{num}", padding: 4 },
      factura_rectificativa: { template: "FR-{year}-{num}", padding: 4 },
      presupuesto: { template: "P-{year}-{num}", padding: 4 },
      recibo: { template: "R-{year}-{num}", padding: 4 },
    },
  },
};

export const EMPTY_DATA: AppData = {
  profile: DEFAULT_PROFILE,
  snapshotIntegrityVersion: 1,
  documents: [],
  expenses: [],
  recurringExpenses: [],
  userReminders: [],
  suppliers: [],
  products: [],
  customers: [],
  testDocumentRetirementBatches: [],
  counters: {
    factura: 0,
    factura_rectificativa: 0,
    presupuesto: 0,
    recibo: 0,
  },
};

export const RECTIFICATION_REASONS = [
  "Error en el importe",
  "Error en los datos del cliente",
  "Error en el concepto o descripción",
  "Devolución total de la operación",
  "Otros motivos",
] as const;

export const EXPENSE_CATEGORIES = [
  "Material",
  "Suministros",
  "Transporte",
  "Alquiler",
  "Seguros",
  "Profesionales",
  "Otros",
] as const;

export const PAYMENT_METHODS = [
  "Efectivo",
  "Tarjeta",
  "Transferencia",
  "Bizum",
  "Domiciliación",
] as const;
