export type DocumentType = "factura" | "presupuesto" | "recibo";

export type DocumentKind =
  | "factura"
  | "factura_rectificativa"
  | "presupuesto"
  | "recibo";

export type DocumentStatus =
  | "borrador"
  | "enviado"
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
  unitPrice: number;
  ivaPercent: number;
}

export interface Client {
  firstName?: string;
  lastName?: string;
  name: string;
  nif?: string;
  email?: string;
  phone?: string;
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
  category?: string;
  notes?: string;
  createdAt: string;
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
  iva: IvaSettings;
  /** Sin repercutir IVA en ventas ni deducir IVA en gastos */
  vatExempt?: boolean;
  /** % IRPF estimado sobre el beneficio (modelo 130 orientativo) */
  irpfPercent?: number;
  numbering: NumberingSettings;
  /** Veri*Factu: registro encadenado y QR en facturas emitidas */
  verifactu?: VerifactuSettings;
}

export type SyncEntityType =
  | "document"
  | "customer"
  | "expense"
  | "supplier"
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
