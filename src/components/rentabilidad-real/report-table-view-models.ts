import { formatMoney } from "@/lib/calculations";
import {
  getDocumentAnalysisModeLabel,
  type RentabilidadRealDocumentAnalysisMode,
} from "@/lib/rentabilidad-real/document-analysis-modes";
import type { RentabilidadRealEvolutionPeriodRow } from "@/lib/rentabilidad-real/evolution";
import type {
  RentabilidadRealClientReportRow,
  RentabilidadRealDocumentReportQualityFlag,
  RentabilidadRealDocumentReportRow,
} from "@/lib/rentabilidad-real/reports";

export type ClientAlertTone = "warning" | "risk" | "info" | "ok";

export interface ClientAlertViewModel {
  label: string;
  tone: ClientAlertTone;
}

export interface ClientProfitabilityRowViewModel {
  clientId: string;
  clientName: string;
  documentCount: string;
  incomeWithoutIndirectTax: string;
  operatingProfit: string;
  internalRealProfit: string;
  averageMarginPercentage: string;
  alerts: ClientAlertViewModel[];
}

export interface DocumentProfitabilityRowViewModel {
  unitId: string;
  primaryDocumentId: string;
  documentLabel: string;
  analysisMode: RentabilidadRealDocumentAnalysisMode;
  analysisModeLabel: string;
  clientName: string;
  date: string;
  incomeWithoutIndirectTax: string;
  totalDirectCosts: string;
  allocatedFixedCosts: string;
  operatingProfit: string;
  internalRealProfit: string;
  marginPercentage: string;
  qualityFlagLabels: string[];
  hasUnlinkedCandidates: boolean;
  sourceHref?: string;
}

export interface EvolutionModeViewModel {
  analysisMode: string;
  label: string;
}

export interface EvolutionRowViewModel {
  periodId: string;
  periodLabel: string;
  documentCount: string;
  incomeWithoutIndirectTax: string;
  totalDirectCosts: string;
  allocatedFixedCosts: string;
  operatingProfit: string;
  averageMarginPercentage: string;
  prudentAvailableCash: string;
  modes: EvolutionModeViewModel[];
  alerts: string[];
}

const FLAG_LABELS: Record<RentabilidadRealDocumentReportQualityFlag, string> = {
  no_linked_expenses: "Sin gastos",
  has_unlinked_candidates: "Candidatos",
  quote_without_invoice: "Previsto",
  invoice_without_quote: "Sin presupuesto",
  low_margin: "Margen bajo",
  negative_profit: "Negativo",
  has_internal_adjustments: "Ajustes internos",
  no_fixed_cost_rule: "Sin fijos",
  missing_tax_data: "IVA incompleto",
  scanned_expense_review_needed: "Revisar escaneo",
};

function formatPercent(value: number): string {
  return `${value.toLocaleString("es-ES", { maximumFractionDigits: 2 })}%`;
}

export function buildClientProfitabilityRowViewModel(
  row: RentabilidadRealClientReportRow,
): ClientProfitabilityRowViewModel {
  const alerts: ClientAlertViewModel[] = [];

  if (row.lowMarginDocumentsCount > 0) {
    alerts.push({
      label: `${row.lowMarginDocumentsCount} margen bajo`,
      tone: "warning",
    });
  }
  if (row.negativeProfitDocumentsCount > 0) {
    alerts.push({
      label: `${row.negativeProfitDocumentsCount} negativo`,
      tone: "risk",
    });
  }
  if (row.unlinkedCandidatesCount > 0) {
    alerts.push({
      label: `${row.unlinkedCandidatesCount} candidatos`,
      tone: "info",
    });
  }
  if (row.warnings.length === 0) {
    alerts.push({ label: "OK", tone: "ok" });
  }

  return {
    clientId: row.clientId,
    clientName: row.clientName,
    documentCount: String(row.documentCount),
    incomeWithoutIndirectTax: formatMoney(row.incomeWithoutIndirectTax),
    operatingProfit: formatMoney(row.operatingProfit),
    internalRealProfit: formatMoney(row.internalRealProfit),
    averageMarginPercentage: formatPercent(row.averageMarginPercentage),
    alerts,
  };
}

function documentHref(row: RentabilidadRealDocumentReportRow): string | undefined {
  return row.sourceLinks.find(
    (link) => link.sourceType === "invoice" || link.sourceType === "quote",
  )?.href;
}

export function buildDocumentProfitabilityRowViewModel(
  row: RentabilidadRealDocumentReportRow,
): DocumentProfitabilityRowViewModel {
  return {
    unitId: row.unitId,
    primaryDocumentId: row.primaryDocumentId,
    documentLabel: row.documentLabel,
    analysisMode: row.analysisMode,
    analysisModeLabel: getDocumentAnalysisModeLabel(row.analysisMode),
    clientName: row.clientName,
    date: row.date,
    incomeWithoutIndirectTax: formatMoney(row.incomeWithoutIndirectTax),
    totalDirectCosts: formatMoney(row.totalDirectCosts),
    allocatedFixedCosts: formatMoney(row.allocatedFixedCosts),
    operatingProfit: formatMoney(row.operatingProfit),
    internalRealProfit: formatMoney(row.internalRealProfit),
    marginPercentage: formatPercent(row.marginPercentage),
    qualityFlagLabels:
      row.qualityFlags.length === 0
        ? ["OK"]
        : row.qualityFlags.slice(0, 4).map((flag) => FLAG_LABELS[flag]),
    hasUnlinkedCandidates: row.unlinkedCandidatesCount > 0,
    sourceHref: documentHref(row),
  };
}

function warningLabels(row: RentabilidadRealEvolutionPeriodRow): string[] {
  const labels: string[] = [];
  if (row.lowMarginDocumentsCount > 0) {
    labels.push(`${row.lowMarginDocumentsCount} margen bajo`);
  }
  if (row.negativeProfitDocumentsCount > 0) {
    labels.push(`${row.negativeProfitDocumentsCount} negativo`);
  }
  if (row.unlinkedCandidatesCount > 0) {
    labels.push(`${row.unlinkedCandidatesCount} gastos pendientes`);
  }
  if (row.documentsWithoutAnalysisMode > 0) {
    labels.push(`${row.documentsWithoutAnalysisMode} sin modo`);
  }
  return labels;
}

export function buildEvolutionRowViewModel(
  row: RentabilidadRealEvolutionPeriodRow,
): EvolutionRowViewModel {
  return {
    periodId: row.periodId,
    periodLabel: row.periodLabel,
    documentCount: String(row.documentCount),
    incomeWithoutIndirectTax: formatMoney(row.incomeWithoutIndirectTax),
    totalDirectCosts: formatMoney(row.totalDirectCosts),
    allocatedFixedCosts: formatMoney(row.allocatedFixedCosts),
    operatingProfit: formatMoney(row.operatingProfit),
    averageMarginPercentage: formatPercent(row.averageMarginPercentage),
    prudentAvailableCash: formatMoney(row.prudentAvailableCash),
    modes: row.modeBreakdown.map((mode) => ({
      analysisMode: mode.analysisMode,
      label: `${getDocumentAnalysisModeLabel(mode.analysisMode)} · ${
        mode.documentCount
      }`,
    })),
    alerts: warningLabels(row),
  };
}
