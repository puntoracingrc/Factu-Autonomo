export type DocumentType = "factura" | "presupuesto" | "recibo";

export type DocumentKind =
  | "factura"
  | "factura_rectificativa"
  | "presupuesto"
  | "recibo";

export type DocumentStatus =
  | "borrador"
  | "enviado"
  | "aceptado"
  | "pagado"
  | "vencido"
  | "rectificada"
  | "anulada";

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

export interface DocumentUnitsSettings {
  enabledUnitIds: string[];
  defaultUnitId: string;
}

export interface Client {
  firstName?: string;
  lastName?: string;
  name: string;
  nif?: string;
  email?: string;
  phone?: string;
  /** Tipo de vía congelado en el documento (calle, avenida…). */
  streetType?: string;
  address?: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  nif?: string;
  email?: string;
  phone?: string;
  /** Identificador de tipo de vía (calle, avenida…). */
  streetType?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssuerSnapshot {
  name: string;
  nif: string;
  address: string;
  city: string;
  postalCode: string;
  phone?: string;
  email?: string;
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

export interface Expense {
  id: string;
  date: string;
  supplierId?: string;
  supplierName: string;
  description: string;
  amount: number;
  ivaPercent: number;
  category: string;
  paymentMethod: string;
  notes?: string;
  /** Gasto generado desde un gasto fijo */
  recurringExpenseId?: string;
  recurringOccurrenceKey?: string;
  createdAt: string;
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

export interface VerifactuSettings {
  enabled: boolean;
  environment: "test" | "production";
}

export interface VerifactuChainState {
  issuerNif: string;
  lastHash: string;
  recordCount: number;
}

export type VerifactuSubmissionStatus =
  | "registered"
  | "test_registered"
  | "pending"
  | "failed"
  | "not_required";

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

export interface BusinessProfile {
  name: string;
  nif: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  iban?: string;
  logoUrl?: string;
  /** Frases reutilizables en notas de facturas, presupuestos y recibos */
  documentPhrases?: DocumentPhrasesSettings;
  /** Formas de pago reutilizables en facturas, presupuestos y recibos */
  documentPaymentMethods?: DocumentPaymentMethodsSettings;
  /** Unidades de medida en líneas de facturas y presupuestos */
  documentUnits?: DocumentUnitsSettings;
  iva: IvaSettings;
  /** Sin repercutir IVA en ventas ni deducir IVA en gastos */
  vatExempt?: boolean;
  /** % IRPF estimado sobre el beneficio (modelo 130 orientativo) */
  irpfPercent?: number;
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
  name: "",
  nif: "",
  address: "",
  city: "",
  postalCode: "",
  phone: "",
  email: "",
  iva: {
    rates: [0, 4, 10, 21],
    defaultRate: 21,
  },
  irpfPercent: 20,
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
