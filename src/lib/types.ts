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
  /** Forma de pago visible en el PDF (transferencia, Bizum, etc.) */
  paymentTerms?: string;
  status: DocumentStatus;
  /** Encabezado del emisor congelado al emitir (no cambia si editas Configuración). */
  issuer?: IssuerSnapshot;
  rectification?: RectificationInfo;
  rectifiedById?: string;
  /** Registro Veri*Factu (hash encadenado, QR, CSV) */
  verifactu?: VerifactuInfo;
  /** Snapshot fiscal/documental congelado al emitir. */
  documentSnapshot?: DocumentSnapshot;
  /** Snapshot mínimo de configuración PDF congelado al emitir. */
  pdfSnapshot?: DocumentPdfSnapshot;
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
  enabled: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseBusinessKind =
  "purchase" | "purchase_invoice" | "quick_ticket" | "fixed";

export type ExpenseDeductibility = "deductible" | "non_deductible";

export type ExpenseLineCalculationBasis =
  | "m2"
  | "ml"
  | "unit"
  | "kg"
  | "hour"
  | "fixed"
  | "unknown";

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
  | "pending_original"
  | "completed_with_original";

export interface ExpenseProviderSummaryInfo {
  status: ProviderSummaryExpenseStatus;
  summaryId: string;
  fileName?: string;
  importedAt: string;
  providerName?: string;
  completedAt?: string;
  summaryInvoiceTotal?: number;
  summaryIvaAmount?: number;
}

export interface Expense {
  id: string;
  date: string;
  origin?: "manual" | "scan" | "import" | "recurring";
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
  | "panel"
  | "customers"
  | "invoices"
  | "expenses"
  | "taxes"
  | "settings";
export type DocumentEmailSendPreference =
  | "ask"
  | "gmail"
  | "mailto"
  | "native";
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
  | "customer_repair";

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
  notes?: string;
  rectification?: RectificationInfo;
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

export type SyncEntityType =
  | "document"
  | "customer"
  | "expense"
  | "recurring_expense"
  | "supplier"
  | "product"
  | "user_reminder"
  | "profile"
  | "counters";

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

export interface AppData {
  profile: BusinessProfile;
  documents: Document[];
  expenses: Expense[];
  recurringExpenses: RecurringExpense[];
  userReminders: UserReminder[];
  suppliers: Supplier[];
  products: Product[];
  customers: Customer[];
  counters: {
    factura: number;
    factura_rectificativa: number;
    presupuesto: number;
    recibo: number;
  };
  /** Estado de la cadena de huellas Veri*Factu por NIF emisor */
  verifactuChain?: VerifactuChainState | null;
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
    enabled: true,
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
  documents: [],
  expenses: [],
  recurringExpenses: [],
  userReminders: [],
  suppliers: [],
  products: [],
  customers: [],
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
