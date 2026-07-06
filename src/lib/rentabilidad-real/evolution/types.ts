import type { RentabilidadRealDocumentAnalysisMode } from "@/lib/rentabilidad-real/document-analysis-modes";
import type { RentabilidadRealCalculationWarning } from "@/lib/rentabilidad-real/calculation";
import type {
  RentabilidadRealDocumentReportSettings,
} from "@/lib/rentabilidad-real/reports";

export type RentabilidadRealEvolutionGrouping = "monthly" | "quarterly";

export interface RentabilidadRealEvolutionReportSettings {
  grouping: RentabilidadRealEvolutionGrouping;
  documentReportSettings: RentabilidadRealDocumentReportSettings;
}

export interface RentabilidadRealEvolutionModeBreakdownRow {
  analysisMode: RentabilidadRealDocumentAnalysisMode;
  documentCount: number;
  incomeWithoutIndirectTax: number;
  operatingProfit: number;
}

export interface RentabilidadRealEvolutionPeriodRow {
  periodId: string;
  periodLabel: string;
  periodStartDate: string;
  periodEndDate: string;
  documentCount: number;
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
  documentsWithoutAnalysisMode: number;
  modeBreakdown: RentabilidadRealEvolutionModeBreakdownRow[];
}

export interface RentabilidadRealEvolutionSummary {
  periodCount: number;
  documentCount: number;
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
  documentsWithoutAnalysisMode: number;
}

export interface RentabilidadRealEvolutionReport {
  rows: RentabilidadRealEvolutionPeriodRow[];
  summary: RentabilidadRealEvolutionSummary;
  warnings: RentabilidadRealCalculationWarning[];
}
