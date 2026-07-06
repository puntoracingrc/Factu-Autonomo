import type { AppData } from "@/lib/types";
import type {
  RentabilidadRealDataQualityReport,
  RentabilidadRealDocumentReportRow,
  RentabilidadRealReportSettings,
} from "./types";

export function getDataQualityRecommendations(
  report: Omit<RentabilidadRealDataQualityReport, "recommendations">,
): string[] {
  const recommendations: string[] = [];

  if (report.unitsWithUnlinkedExpenseCandidates > 0) {
    recommendations.push(
      "Hay gastos sin enlazar que podrían pertenecer a trabajos. Asignarlos mejorará la rentabilidad real.",
    );
  }
  if (report.quotesWithoutInvoice > 0) {
    recommendations.push(
      "Hay presupuestos sin factura vinculada. Se mostrarán como rentabilidad prevista.",
    );
  }
  if (report.invoicesWithoutQuote > 0) {
    recommendations.push(
      "Hay facturas sin presupuesto origen. Se analizarán como facturas independientes.",
    );
  }
  if (report.fixedCostsWithoutAllocationRule > 0) {
    recommendations.push(
      "Hay gastos fijos existentes sin regla de reparto. Configura una regla para ver beneficio operativo más real.",
    );
  }
  if (report.unitsWithInternalAdjustments > 0) {
    recommendations.push(
      "Hay ajustes internos no fiscales. Se muestran separados del resultado documentado.",
    );
  }
  if (report.unitsWithoutLinkedExpenses > 0) {
    recommendations.push(
      "Hay documentos sin gastos enlazados. Puedes analizarlos igualmente, pero el margen puede estar incompleto.",
    );
  }
  if (report.scannedExpensesPossiblyUnreviewed > 0) {
    recommendations.push(
      "Hay gastos procedentes de escaneo IA. Revisarlos mejora la calidad del informe.",
    );
  }
  if (report.documentsMissingTaxData > 0) {
    recommendations.push(
      "Hay documentos con datos fiscales incompletos. Revisa IVA y gastos antes de tomar decisiones.",
    );
  }
  if (report.documentsWithoutAnalysisMode > 0) {
    recommendations.push(
      "Hay documentos sin modo de análisis. Asignar un modo ayuda a interpretar mejor los informes.",
    );
  }

  return recommendations;
}

export function buildDataQualityReport(
  appData: AppData,
  documentRows: readonly RentabilidadRealDocumentReportRow[],
  settings: RentabilidadRealReportSettings,
): RentabilidadRealDataQualityReport {
  const base = {
    totalAnalysisUnits: documentRows.length,
    unitsWithoutLinkedExpenses: documentRows.filter((row) =>
      row.qualityFlags.includes("no_linked_expenses"),
    ).length,
    unitsWithUnlinkedExpenseCandidates: documentRows.filter((row) =>
      row.qualityFlags.includes("has_unlinked_candidates"),
    ).length,
    quotesWithoutInvoice: documentRows.filter((row) =>
      row.qualityFlags.includes("quote_without_invoice"),
    ).length,
    invoicesWithoutQuote: documentRows.filter((row) =>
      row.qualityFlags.includes("invoice_without_quote"),
    ).length,
    unitsWithInternalAdjustments: documentRows.filter((row) =>
      row.qualityFlags.includes("has_internal_adjustments"),
    ).length,
    fixedCostsWithoutAllocationRule: documentRows.filter((row) =>
      row.qualityFlags.includes("no_fixed_cost_rule"),
    ).length,
    scannedExpensesPossiblyUnreviewed: documentRows.filter((row) =>
      row.qualityFlags.includes("scanned_expense_review_needed"),
    ).length,
    documentsMissingTaxData: documentRows.filter((row) =>
      row.qualityFlags.includes("missing_tax_data"),
    ).length,
    documentsWithoutAnalysisMode: documentRows.filter(
      (row) => row.analysisMode === "unknown",
    ).length,
  };

  const hasAnyExpense = appData.expenses.length > 0 || appData.recurringExpenses.length > 0;
  const normalized = {
    ...base,
    fixedCostsWithoutAllocationRule:
      settings.fixedCostAllocationMode === "none"
        ? base.fixedCostsWithoutAllocationRule
        : base.fixedCostsWithoutAllocationRule,
    unitsWithoutLinkedExpenses:
      hasAnyExpense || documentRows.length > 0 ? base.unitsWithoutLinkedExpenses : 0,
  };

  return {
    ...normalized,
    recommendations: getDataQualityRecommendations(normalized),
  };
}
