export type DocumentType = "factura" | "presupuesto" | "recibo";

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
  rectification?: RectificationInfo;
  rectifiedById?: string;
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
}

export const DEFAULT_PROFILE: BusinessProfile = {
  name: "",
  nif: "",
  address: "",
  city: "",
  postalCode: "",
  phone: "",
  email: "",
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
