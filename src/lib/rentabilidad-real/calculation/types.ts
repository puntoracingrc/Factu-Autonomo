import type { ProfitabilitySourceLink } from "@/lib/rentabilidad-real/integrations";
import type {
  RentabilidadRealExpenseLinkCandidate,
  RentabilidadRealIgnoredExpenseReason,
} from "@/lib/rentabilidad-real/expense-linking";

export type RentabilidadRealWorkSourceType = "quote" | "invoice";

export interface RentabilidadRealWorkSource {
  sourceType: RentabilidadRealWorkSourceType;
  sourceDocumentId: string;
  sourceQuoteDocumentId?: string;
}

export interface RentabilidadRealWorkIncome {
  sourceType: "quote" | "invoice";
  documentId: string;
  number: string;
  date: string;
  customerName: string;
  subtotal: number;
  iva: number;
  total: number;
  sourceLink: ProfitabilitySourceLink;
}

export interface RentabilidadRealWorkCost {
  id: string;
  sourceType: "expense" | "recurring_expense";
  date: string;
  supplierName: string;
  description: string;
  amount: number;
  ivaAmount: number;
  total: number;
  originalAmount?: number;
  originalIvaAmount?: number;
  originalTotal?: number;
  appliedAmountOverride?: number;
  category: string;
  origin?: "manual" | "scan" | "import" | "recurring";
  workDocumentId?: string;
  sourceLink: ProfitabilitySourceLink;
}

export type RentabilidadRealFixedCostAllocationMethod =
  | "none"
  | "manual_amount"
  | "revenue_share"
  | "monthly_jobs"
  | "hours";

export interface RentabilidadRealCalculationWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "risk";
  sourceLink?: ProfitabilitySourceLink;
}

export interface RentabilidadRealFixedCostAllocationInput {
  method: RentabilidadRealFixedCostAllocationMethod;
  totalFixedCostsForPeriod: number;
  manualAmount?: number;
  workRevenue?: number;
  monthlyRevenue?: number;
  monthlyJobs?: number;
  workHours?: number;
  monthlyWorkHours?: number;
}

export interface RentabilidadRealFixedCostAllocationResult {
  method: RentabilidadRealFixedCostAllocationMethod;
  allocatedFixedCosts: number;
  warnings: RentabilidadRealCalculationWarning[];
}

export interface RentabilidadRealTaxReserveInput {
  vatChargedFromIncome: number;
  deductibleVatFromDirectCosts: number;
  operatingProfit: number;
  irpfProvisionPercentage?: number;
  hasVatData: boolean;
}

export interface RentabilidadRealTaxReserveResult {
  estimatedVatToReserve: number;
  estimatedIrpfProvision: number;
  prudentAvailableCash: number;
  irpfProvisionPercentage: number;
  warnings: RentabilidadRealCalculationWarning[];
}

export interface RentabilidadRealWorkProfitabilityInput {
  source: RentabilidadRealWorkSource;
  quoteSummary?: RentabilidadRealWorkIncome;
  invoiceSummary?: RentabilidadRealWorkIncome;
  directCosts: RentabilidadRealWorkCost[];
  linkedExpenses?: RentabilidadRealExpenseLinkCandidate[];
  candidateUnlinkedExpenses?: RentabilidadRealExpenseLinkCandidate[];
  ignoredExpensesWithReasons?: RentabilidadRealIgnoredExpenseReason[];
  fixedCostCandidates: RentabilidadRealWorkCost[];
  fixedCostAllocationInput: RentabilidadRealFixedCostAllocationInput;
  internalAdjustmentsTotal?: number;
  taxReserve?: Partial<RentabilidadRealTaxReserveInput>;
  warnings?: RentabilidadRealCalculationWarning[];
  sourceLinks?: ProfitabilitySourceLink[];
}

export interface RentabilidadRealWorkProfitabilityResult {
  sourceType: RentabilidadRealWorkSourceType;
  sourceDocumentId: string;
  sourceQuoteDocumentId?: string;
  quoteSummary?: RentabilidadRealWorkIncome;
  invoiceSummary?: RentabilidadRealWorkIncome;
  incomeWithoutIndirectTax: number;
  expectedIncomeWithoutIndirectTax?: number;
  actualIncomeWithoutIndirectTax?: number;
  directCosts: RentabilidadRealWorkCost[];
  totalDirectCosts: number;
  fixedCostCandidates: RentabilidadRealWorkCost[];
  allocatedFixedCosts: number;
  fixedCostAllocationMethod: RentabilidadRealFixedCostAllocationMethod;
  grossMargin: number;
  operatingProfit: number;
  documentedOperatingProfit: number;
  internalAdjustmentsTotal: number;
  internalRealProfit: number;
  marginPercentage: number;
  estimatedVatToReserve: number;
  estimatedIrpfProvision: number;
  prudentAvailableCash: number;
  internalPrudentAvailableCash: number;
  warnings: RentabilidadRealCalculationWarning[];
  sourceLinks: ProfitabilitySourceLink[];
  calculationVersion: "work-profitability-v1";
}

export type RentabilidadRealHoursSourceType = "document" | "manual";

export type RentabilidadRealHoursBillingModel =
  | "hours"
  | "closed_project"
  | "monthly_retainer";

export interface RentabilidadRealManualDirectCost {
  id: string;
  description: string;
  amount: number;
  ivaAmount?: number;
}

export interface RentabilidadRealHoursProfitabilityInput {
  sourceType: RentabilidadRealHoursSourceType;
  sourceDocumentId?: string;
  sourceQuoteDocumentId?: string;
  projectName: string;
  customerName?: string;
  billingModel: RentabilidadRealHoursBillingModel;
  incomeWithoutIndirectTax: number;
  vatFromIncome: number;
  directCosts: RentabilidadRealWorkCost[];
  fixedCostCandidates: RentabilidadRealWorkCost[];
  fixedCostAllocationInput: RentabilidadRealFixedCostAllocationInput;
  internalAdjustmentsTotal?: number;
  billedHours?: number;
  realWorkedHours?: number;
  nonBillableHours?: number;
  meetingHours?: number;
  revisionHours?: number;
  adminHours?: number;
  totalRealHoursOverride?: number;
  irpfProvisionPercentage?: number;
  warnings?: RentabilidadRealCalculationWarning[];
  sourceLinks?: ProfitabilitySourceLink[];
}

export interface RentabilidadRealHoursProfitabilityResult {
  sourceType: RentabilidadRealHoursSourceType;
  sourceDocumentId?: string;
  sourceQuoteDocumentId?: string;
  projectName: string;
  customerName?: string;
  billingModel: RentabilidadRealHoursBillingModel;
  incomeWithoutIndirectTax: number;
  directCosts: RentabilidadRealWorkCost[];
  totalDirectCosts: number;
  fixedCostCandidates: RentabilidadRealWorkCost[];
  allocatedFixedCosts: number;
  fixedCostAllocationMethod: RentabilidadRealFixedCostAllocationMethod;
  grossMargin: number;
  operatingProfit: number;
  documentedOperatingProfit: number;
  internalAdjustmentsTotal: number;
  internalRealProfit: number;
  estimatedVatToReserve: number;
  estimatedIrpfProvision: number;
  prudentAvailableCash: number;
  internalPrudentAvailableCash: number;
  billedHours: number;
  totalRealHours: number;
  billedHourlyRate: number;
  effectiveHourlyRateBeforeCosts: number;
  operatingProfitPerRealHour: number;
  internalRealProfitPerRealHour: number;
  prudentCashPerRealHour: number;
  internalPrudentCashPerRealHour: number;
  unbilledHours: number;
  unbilledHoursPercentage: number;
  marginPercentage: number;
  warnings: RentabilidadRealCalculationWarning[];
  sourceLinks: ProfitabilitySourceLink[];
  calculationVersion: "hours-profitability-v1";
}
