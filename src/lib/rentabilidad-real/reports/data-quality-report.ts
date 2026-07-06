import type { AppData } from "@/lib/types";
import type {
  RentabilidadRealDataQualityAction,
  RentabilidadRealDataQualityReport,
  RentabilidadRealDocumentReportRow,
  RentabilidadRealReportSettings,
} from "./types";

function hasStockOrCommerceSignal(text: string): boolean {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return [
    "stock",
    "inventario",
    "almacen",
    "tienda",
    "ecommerce",
    "e-commerce",
    "shopify",
    "woocommerce",
    "reventa",
    "venta online",
  ].some((word) => normalized.includes(word));
}

function possibleStockOrCommerceSignals(appData: AppData): number {
  let count = 0;

  for (const expense of appData.expenses) {
    const text = [
      expense.description,
      expense.category,
      expense.supplierName,
      ...(expense.purchaseLines?.map((line) => line.description) ?? []),
    ].join(" ");
    if (hasStockOrCommerceSignal(text)) count += 1;
  }

  for (const document of appData.documents) {
    const text = document.items.map((item) => item.description).join(" ");
    if (hasStockOrCommerceSignal(text)) count += 1;
  }

  for (const product of appData.products) {
    const text = [product.name, product.family, product.sku].join(" ");
    if (hasStockOrCommerceSignal(text)) count += 1;
  }

  return count;
}

export function getDataQualityRecommendations(
  report: Omit<RentabilidadRealDataQualityReport, "recommendations" | "actionItems">,
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
  if (report.lowMarginDocuments > 0) {
    recommendations.push(
      "Hay documentos con margen bajo. Revisa gastos enlazados, precio y reparto de fijos.",
    );
  }
  if (report.negativeProfitDocuments > 0) {
    recommendations.push(
      "Hay documentos con beneficio negativo. Conviene revisarlos antes de tomar decisiones.",
    );
  }
  if (report.possibleStockOrCommerceSignals > 0) {
    recommendations.push(
      "Hay señales de stock, tienda o reventa. Ese análisis pertenece a un módulo futuro aparte.",
    );
  }

  return recommendations;
}

export function getDataQualityActionItems(
  report: Omit<RentabilidadRealDataQualityReport, "recommendations" | "actionItems">,
): RentabilidadRealDataQualityAction[] {
  const actions: RentabilidadRealDataQualityAction[] = [];

  if (report.documentsWithoutAnalysisMode > 0) {
    actions.push({
      id: "assign_analysis_mode",
      title: "Documentos sin modo",
      description: "Marca si son obra, horas, instalación o documento simple.",
      count: report.documentsWithoutAnalysisMode,
      ctaLabel: "Asignar modo de análisis",
      href: "/rentabilidad-real/informes#informe-documentos",
      severity: "warning",
    });
  }
  if (report.unitsWithUnlinkedExpenseCandidates > 0) {
    actions.push({
      id: "review_unlinked_expenses",
      title: "Gastos candidatos",
      description: "Pueden pertenecer a trabajos y cambiar el margen.",
      count: report.unitsWithUnlinkedExpenseCandidates,
      ctaLabel: "Ver gastos candidatos",
      href: "/rentabilidad-real/calculadora/trabajo",
      severity: "warning",
    });
  }
  if (report.unitsWithoutLinkedExpenses > 0) {
    actions.push({
      id: "review_missing_expenses",
      title: "Documentos sin gastos",
      description: "El margen puede estar incompleto si hubo costes del trabajo.",
      count: report.unitsWithoutLinkedExpenses,
      ctaLabel: "Abrir calculadora de trabajo",
      href: "/rentabilidad-real/calculadora/trabajo",
      severity: "info",
    });
  }
  if (report.fixedCostsWithoutAllocationRule > 0) {
    actions.push({
      id: "configure_fixed_costs",
      title: "Fijos sin reparto",
      description: "Elige si se reparten o si no se aplican a este análisis.",
      count: report.fixedCostsWithoutAllocationRule,
      ctaLabel: "Configurar reparto de gastos fijos",
      href: "/rentabilidad-real/calculadora/trabajo",
      severity: "warning",
    });
  }
  if (report.quotesWithoutInvoice > 0) {
    actions.push({
      id: "review_quote_without_invoice",
      title: "Presupuestos previstos",
      description: "Aparecen como previsto mientras no tengan factura vinculada.",
      count: report.quotesWithoutInvoice,
      ctaLabel: "Abrir informe filtrado",
      href: "/rentabilidad-real/informes#informe-documentos",
      severity: "info",
    });
  }
  if (report.invoicesWithoutQuote > 0) {
    actions.push({
      id: "review_invoice_without_quote",
      title: "Facturas sin presupuesto",
      description: "Se analizan como trabajos independientes.",
      count: report.invoicesWithoutQuote,
      ctaLabel: "Abrir informe filtrado",
      href: "/rentabilidad-real/informes#informe-documentos",
      severity: "info",
    });
  }
  if (report.lowMarginDocuments > 0) {
    actions.push({
      id: "review_low_margin",
      title: "Margen bajo",
      description: "Revisa precio, costes directos y fijos imputados.",
      count: report.lowMarginDocuments,
      ctaLabel: "Abrir informe filtrado",
      href: "/rentabilidad-real/informes#informe-documentos",
      severity: "warning",
    });
  }
  if (report.negativeProfitDocuments > 0) {
    actions.push({
      id: "review_negative_profit",
      title: "Beneficio negativo",
      description: "Son documentos donde el cálculo sale por debajo de cero.",
      count: report.negativeProfitDocuments,
      ctaLabel: "Abrir informe filtrado",
      href: "/rentabilidad-real/informes#informe-documentos",
      severity: "risk",
    });
  }
  if (report.unitsWithInternalAdjustments > 0) {
    actions.push({
      id: "review_internal_adjustments",
      title: "Ajustes internos",
      description: "No son fiscales; revisa que siguen teniendo sentido.",
      count: report.unitsWithInternalAdjustments,
      ctaLabel: "Abrir calculadora de trabajo",
      href: "/rentabilidad-real/calculadora/trabajo",
      severity: "info",
    });
  }
  if (report.possibleStockOrCommerceSignals > 0) {
    actions.push({
      id: "review_stock_future_module",
      title: "Stock o tienda detectado",
      description: "Stock, tienda y reventa son un módulo futuro aparte.",
      count: report.possibleStockOrCommerceSignals,
      ctaLabel: "Ver módulo futuro de Stock",
      href: "/rentabilidad-real#modulos-disponibles",
      severity: "info",
    });
  }

  return actions;
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
    lowMarginDocuments: documentRows.filter((row) =>
      row.qualityFlags.includes("low_margin"),
    ).length,
    negativeProfitDocuments: documentRows.filter((row) =>
      row.qualityFlags.includes("negative_profit"),
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
    possibleStockOrCommerceSignals: possibleStockOrCommerceSignals(appData),
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
    actionItems: getDataQualityActionItems(normalized),
  };
}
