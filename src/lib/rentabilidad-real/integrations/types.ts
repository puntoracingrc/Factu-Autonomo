import type {
  DocumentAcceptanceStatus,
  DocumentPaymentStatus,
  DocumentStatus,
  ExpenseBusinessKind,
  ProductSource,
} from "@/lib/types";

export type ProfitabilityExistingDataStatus =
  | "detected"
  | "pending_mapping"
  | "read_only_connected"
  | "not_found"
  | "risk_detected";

export type ProfitabilitySourceType =
  | "invoice"
  | "quote"
  | "expense"
  | "recurring_expense"
  | "product"
  | "tax_summary"
  | "customer"
  | "supplier"
  | "profile"
  | "google_drive"
  | "google_places"
  | "admin"
  | "document_autofill"
  | "fiscal_record";

export interface ProfitabilitySourceLink {
  sourceType: ProfitabilitySourceType;
  sourceId?: string;
  label: string;
  href?: string;
}

export interface ProfitabilityDataSourceWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "risk";
  source?: ProfitabilitySourceLink;
}

export interface ProfitabilityIncomeSource {
  id: string;
  number: string;
  date: string;
  customerId?: string;
  customerName: string;
  status: DocumentStatus;
  paymentStatus?: DocumentPaymentStatus;
  acceptanceStatus?: DocumentAcceptanceStatus;
  sourceQuoteDocumentId?: string;
  sourceQuoteNumber?: string;
  subtotal: number;
  iva: number;
  total: number;
  lineCount: number;
  sourceLink: ProfitabilitySourceLink;
}

export interface ProfitabilityQuoteSource {
  id: string;
  number: string;
  date: string;
  customerId?: string;
  customerName: string;
  status: DocumentStatus;
  acceptanceStatus?: DocumentAcceptanceStatus;
  linkedInvoiceId?: string;
  subtotal: number;
  iva: number;
  total: number;
  lineCount: number;
  sourceLink: ProfitabilitySourceLink;
}

export interface ProfitabilityCostSource {
  id: string;
  date: string;
  supplierName: string;
  description: string;
  amount: number;
  ivaPercent: number;
  ivaAmount: number;
  total: number;
  category: string;
  businessKind: ExpenseBusinessKind;
  origin: "manual" | "scan" | "import" | "recurring";
  workDocumentId?: string;
  recurringExpenseId?: string;
  purchaseLineCount: number;
  sourceLink: ProfitabilitySourceLink;
}

export interface ProfitabilityFixedCostSource {
  id: string;
  date: string;
  supplierName: string;
  description: string;
  amount: number;
  ivaPercent: number;
  ivaAmount: number;
  total: number;
  category: string;
  frequency?: "monthly" | "quarterly" | "annual";
  enabled?: boolean;
  sourceLink: ProfitabilitySourceLink;
}

export interface ProfitabilityTaxContext {
  vatExempt: boolean;
  salesBase: number;
  salesIva: number;
  expenseBase: number;
  expenseIva: number;
  netIva: number;
  ivaToPay: number;
  ivaCredit: number;
  grossProfit: number;
  irpfPercent: number;
  irpfEstimate: number;
  profitAfterIrpfReserve: number;
  sourceLink: ProfitabilitySourceLink;
}

export interface ProfitabilityArticleSource {
  id: string;
  key: string;
  name: string;
  family: string;
  source: ProductSource;
  saleUnitPrice?: number;
  purchaseNetUnitCost?: number;
  ivaPercent?: number;
  supplierName?: string;
  sourceLink: ProfitabilitySourceLink;
}

export interface ProfitabilityProviderScanSource {
  expenseId: string;
  supplierName: string;
  hasPurchaseDocument: boolean;
  purchaseLineCount: number;
  sourceLink: ProfitabilitySourceLink;
}

export interface ProfitabilityAddressSource {
  sourceType: "customer" | "supplier" | "profile";
  sourceId?: string;
  label: string;
  address?: string;
  city?: string;
  postalCode?: string;
  sourceLink: ProfitabilitySourceLink;
}

export interface ProfitabilityInputDraft {
  incomes: ProfitabilityIncomeSource[];
  quotes: ProfitabilityQuoteSource[];
  directCostCandidates: ProfitabilityCostSource[];
  fixedCostCandidates: ProfitabilityFixedCostSource[];
  taxContext: ProfitabilityTaxContext;
  articleCandidates: ProfitabilityArticleSource[];
  providerScanCandidates: ProfitabilityProviderScanSource[];
  addressCandidates: ProfitabilityAddressSource[];
  sourceLinks: ProfitabilitySourceLink[];
  warnings: ProfitabilityDataSourceWarning[];
  missingData: string[];
}

export interface ProfitabilityExistingDataStatusItem {
  key:
    | "invoices"
    | "quotes"
    | "quote_invoice_relation"
    | "expenses"
    | "fixed_expenses"
    | "ai_scans"
    | "articles"
    | "taxes"
    | "fiscal_record"
    | "google_drive"
    | "google_addresses"
    | "document_autofill"
    | "admin_diagnostics";
  label: string;
  status: ProfitabilityExistingDataStatus;
  detail: string;
  sourceLink?: ProfitabilitySourceLink;
}
