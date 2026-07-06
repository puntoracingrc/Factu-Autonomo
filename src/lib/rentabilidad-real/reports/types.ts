import type { ProfitabilitySourceLink } from "@/lib/rentabilidad-real/integrations";
import type { RentabilidadRealCalculationSettings } from "@/lib/rentabilidad-real/calculation";
import type {
  RentabilidadRealDocumentAnalysisMode,
  RentabilidadRealDocumentAnalysisModeFilter,
  RentabilidadRealDocumentAnalysisModesById,
} from "@/lib/rentabilidad-real/document-analysis-modes";
import type {
  RentabilidadRealCalculationWarning,
  RentabilidadRealWorkSourceType,
} from "@/lib/rentabilidad-real/calculation";

export type RentabilidadRealAnalysisUnitSourceType =
  | "invoice"
  | "quote"
  | "quote_invoice_pair";

export interface RentabilidadRealAnalysisUnit {
  id: string;
  primaryDocumentId: string;
  sourceType: RentabilidadRealAnalysisUnitSourceType;
  quoteDocumentId?: string;
  invoiceDocumentId?: string;
  sourceQuoteDocumentId?: string;
  clientId: string;
  clientName: string;
  date: string;
  documentNumber: string;
  title: string;
  status: string;
  relatedDocumentIds: string[];
  hasInvoice: boolean;
  hasQuote: boolean;
  hasLinkedExpenses: boolean;
  hasInternalAdjustments: boolean;
  warnings: RentabilidadRealCalculationWarning[];
}

export type RentabilidadRealReportPeriod =
  | "all"
  | "current_month"
  | "current_quarter"
  | "custom";

export type RentabilidadRealReportSourceTypes = "invoices" | "quotes" | "both";

export type RentabilidadRealReportFixedCostAllocationMode =
  | "none"
  | "use_saved_settings"
  | "revenue_share_report";

export interface RentabilidadRealReportSettings {
  period: RentabilidadRealReportPeriod;
  sourceTypes: RentabilidadRealReportSourceTypes;
  includeQuotesWithoutInvoice: boolean;
  includeInternalAdjustments: boolean;
  fixedCostAllocationMode: RentabilidadRealReportFixedCostAllocationMode;
  analysisModeFilter: RentabilidadRealDocumentAnalysisModeFilter;
  irpfProvisionPercentage: number;
  lowMarginThresholdPercentage: number;
  customStartDate?: string;
  customEndDate?: string;
}

export interface RentabilidadRealDocumentReportSettings
  extends RentabilidadRealReportSettings {
  savedWorkCalculationSettings?: RentabilidadRealCalculationSettings;
  reportRevenueWithoutIndirectTax?: number;
  documentAnalysisModes?: RentabilidadRealDocumentAnalysisModesById;
}

export type RentabilidadRealDocumentReportQualityFlag =
  | "no_linked_expenses"
  | "has_unlinked_candidates"
  | "quote_without_invoice"
  | "invoice_without_quote"
  | "low_margin"
  | "negative_profit"
  | "has_internal_adjustments"
  | "no_fixed_cost_rule"
  | "missing_tax_data"
  | "scanned_expense_review_needed";

export interface RentabilidadRealDocumentReportRow {
  unitId: string;
  primaryDocumentId: string;
  sourceType: RentabilidadRealAnalysisUnitSourceType;
  workSourceType: RentabilidadRealWorkSourceType;
  analysisMode: RentabilidadRealDocumentAnalysisMode;
  documentLabel: string;
  clientId: string;
  clientName: string;
  date: string;
  incomeWithoutIndirectTax: number;
  expectedIncomeWithoutIndirectTax?: number;
  actualIncomeWithoutIndirectTax?: number;
  totalDirectCosts: number;
  linkedExpensesCount: number;
  unlinkedCandidatesCount: number;
  allocatedFixedCosts: number;
  operatingProfit: number;
  marginPercentage: number;
  estimatedVatToReserve: number;
  estimatedIrpfProvision: number;
  prudentAvailableCash: number;
  internalAdjustmentsTotal: number;
  internalRealProfit: number;
  internalPrudentAvailableCash: number;
  warnings: RentabilidadRealCalculationWarning[];
  sourceLinks: ProfitabilitySourceLink[];
  qualityFlags: RentabilidadRealDocumentReportQualityFlag[];
}

export interface RentabilidadRealDocumentReportSummary {
  rowCount: number;
  incomeWithoutIndirectTax: number;
  totalDirectCosts: number;
  allocatedFixedCosts: number;
  operatingProfit: number;
  averageMarginPercentage: number;
  estimatedVatToReserve: number;
  estimatedIrpfProvision: number;
  prudentAvailableCash: number;
  internalAdjustmentsTotal: number;
  internalRealProfit: number;
  internalPrudentAvailableCash: number;
  lowMarginDocumentsCount: number;
  negativeProfitDocumentsCount: number;
  unlinkedCandidatesCount: number;
}

export interface RentabilidadRealDocumentProfitabilityReport {
  rows: RentabilidadRealDocumentReportRow[];
  summary: RentabilidadRealDocumentReportSummary;
  warnings: RentabilidadRealCalculationWarning[];
  settings: RentabilidadRealReportSettings;
}

export type RentabilidadRealDocumentReportSort =
  | "date_desc"
  | "date_asc"
  | "client"
  | "income_desc"
  | "profit_asc"
  | "profit_desc"
  | "margin_asc";

export interface RentabilidadRealDocumentReportFilters {
  clientId?: string;
  sourceType?: RentabilidadRealAnalysisUnitSourceType;
  qualityFlag?: RentabilidadRealDocumentReportQualityFlag;
}

export interface RentabilidadRealClientReportRow {
  clientId: string;
  clientName: string;
  documentCount: number;
  invoiceCount: number;
  quoteOnlyCount: number;
  incomeWithoutIndirectTax: number;
  totalDirectCosts: number;
  allocatedFixedCosts: number;
  operatingProfit: number;
  averageMarginPercentage: number;
  estimatedVatToReserve: number;
  estimatedIrpfProvision: number;
  prudentAvailableCash: number;
  internalAdjustmentsTotal: number;
  internalRealProfit: number;
  internalPrudentAvailableCash: number;
  lowMarginDocumentsCount: number;
  negativeProfitDocumentsCount: number;
  unlinkedCandidatesCount: number;
  warnings: RentabilidadRealCalculationWarning[];
}

export type RentabilidadRealClientReportSort =
  | "profit_desc"
  | "profit_asc"
  | "income_desc"
  | "margin_asc"
  | "low_margin_desc"
  | "unlinked_candidates_desc"
  | "client";

export interface RentabilidadRealClientProfitabilityReport {
  rows: RentabilidadRealClientReportRow[];
  mostProfitableClient?: RentabilidadRealClientReportRow;
  leastProfitableClient?: RentabilidadRealClientReportRow;
  clientWithMostLowMarginDocuments?: RentabilidadRealClientReportRow;
  clientWithMostUnlinkedCandidates?: RentabilidadRealClientReportRow;
  clientsWithInternalProfitLowerThanDocumented: RentabilidadRealClientReportRow[];
}

export interface RentabilidadRealDataQualityReport {
  totalAnalysisUnits: number;
  unitsWithoutLinkedExpenses: number;
  unitsWithUnlinkedExpenseCandidates: number;
  quotesWithoutInvoice: number;
  invoicesWithoutQuote: number;
  unitsWithInternalAdjustments: number;
  fixedCostsWithoutAllocationRule: number;
  scannedExpensesPossiblyUnreviewed: number;
  documentsMissingTaxData: number;
  documentsWithoutAnalysisMode: number;
  recommendations: string[];
}
