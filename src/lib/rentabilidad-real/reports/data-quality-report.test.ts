import { describe, expect, it } from "vitest";
import { EMPTY_DATA, type AppData } from "@/lib/types";
import { DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS } from "./local-report-settings";
import { buildDataQualityReport } from "./data-quality-report";
import type { RentabilidadRealDocumentReportRow } from "./types";

function row(
  qualityFlags: RentabilidadRealDocumentReportRow["qualityFlags"],
  overrides: Partial<RentabilidadRealDocumentReportRow> = {},
): RentabilidadRealDocumentReportRow {
  return {
    unitId: "unit_1",
    primaryDocumentId: "doc_1",
    sourceType: "invoice",
    workSourceType: "invoice",
    analysisMode: "fixed_price_work",
    documentLabel: "Factura F-1",
    clientId: "client_1",
    clientName: "Cliente",
    date: "2026-07-01",
    incomeWithoutIndirectTax: 100,
    totalDirectCosts: 0,
    linkedExpensesCount: 0,
    unlinkedCandidatesCount: qualityFlags.includes("has_unlinked_candidates")
      ? 1
      : 0,
    allocatedFixedCosts: 0,
    operatingProfit: 100,
    marginPercentage: 100,
    estimatedVatToReserve: 21,
    estimatedIrpfProvision: 20,
    prudentAvailableCash: 80,
    internalAdjustmentsTotal: qualityFlags.includes("has_internal_adjustments")
      ? 10
      : 0,
    internalRealProfit: 90,
    internalPrudentAvailableCash: 70,
    warnings: [],
    sourceLinks: [],
    qualityFlags,
    ...overrides,
  };
}

describe("buildDataQualityReport", () => {
  it("detecta unidades sin gastos enlazados y candidatos sin enlazar", () => {
    const report = buildDataQualityReport(
      EMPTY_DATA,
      [row(["no_linked_expenses", "has_unlinked_candidates"])],
      DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
    );

    expect(report.unitsWithoutLinkedExpenses).toBe(1);
    expect(report.unitsWithUnlinkedExpenseCandidates).toBe(1);
    expect(report.recommendations.join(" ")).toContain("gastos sin enlazar");
    expect(report.actionItems.map((action) => action.id)).toEqual(
      expect.arrayContaining([
        "review_unlinked_expenses",
        "review_missing_expenses",
      ]),
    );
  });

  it("detecta presupuestos sin factura y facturas sin presupuesto", () => {
    const report = buildDataQualityReport(
      EMPTY_DATA,
      [row(["quote_without_invoice"]), row(["invoice_without_quote"])],
      DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
    );

    expect(report.quotesWithoutInvoice).toBe(1);
    expect(report.invoicesWithoutQuote).toBe(1);
    expect(report.actionItems.map((action) => action.id)).toEqual(
      expect.arrayContaining([
        "review_quote_without_invoice",
        "review_invoice_without_quote",
      ]),
    );
  });

  it("detecta ajustes internos", () => {
    const report = buildDataQualityReport(
      EMPTY_DATA,
      [row(["has_internal_adjustments"])],
      DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
    );

    expect(report.unitsWithInternalAdjustments).toBe(1);
    expect(report.recommendations.join(" ")).toContain(
      "ajustes internos no fiscales",
    );
    expect(report.actionItems.map((action) => action.id)).toContain(
      "review_internal_adjustments",
    );
  });

  it("detecta falta de regla de gastos fijos", () => {
    const report = buildDataQualityReport(
      EMPTY_DATA,
      [row(["no_fixed_cost_rule"])],
      DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
    );

    expect(report.fixedCostsWithoutAllocationRule).toBe(1);
    expect(report.recommendations.join(" ")).toContain("gastos fijos");
    expect(report.actionItems.map((action) => action.id)).toContain(
      "configure_fixed_costs",
    );
  });

  it("genera recomendaciones claras para escaneos y datos fiscales", () => {
    const report = buildDataQualityReport(
      EMPTY_DATA,
      [row(["scanned_expense_review_needed", "missing_tax_data"])],
      DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
    );

    expect(report.scannedExpensesPossiblyUnreviewed).toBe(1);
    expect(report.documentsMissingTaxData).toBe(1);
    expect(report.recommendations.length).toBeGreaterThanOrEqual(2);
  });

  it("detecta documentos sin modo de analisis", () => {
    const report = buildDataQualityReport(
      EMPTY_DATA,
      [row([], { analysisMode: "unknown" })],
      DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
    );

    expect(report.documentsWithoutAnalysisMode).toBe(1);
    expect(report.recommendations.join(" ")).toContain("modo de análisis");
    expect(report.actionItems.map((action) => action.id)).toContain(
      "assign_analysis_mode",
    );
  });

  it("detecta margen bajo, beneficio negativo y ofrece acciones", () => {
    const report = buildDataQualityReport(
      EMPTY_DATA,
      [row(["low_margin", "negative_profit"])],
      DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
    );

    expect(report.lowMarginDocuments).toBe(1);
    expect(report.negativeProfitDocuments).toBe(1);
    expect(report.actionItems.map((action) => action.id)).toEqual(
      expect.arrayContaining(["review_low_margin", "review_negative_profit"]),
    );
  });

  it("detecta senales de stock o comercio como modulo futuro", () => {
    const appData: AppData = {
      ...EMPTY_DATA,
      expenses: [
        {
          id: "expense_stock",
          date: "2026-07-01",
          supplierName: "Proveedor",
          description: "Compra para stock de tienda online",
          amount: 100,
          ivaPercent: 21,
          category: "Inventario",
          paymentMethod: "Tarjeta",
          createdAt: "2026-07-01T10:00:00.000Z",
        },
      ],
    };
    const report = buildDataQualityReport(
      appData,
      [],
      DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
    );

    expect(report.possibleStockOrCommerceSignals).toBe(1);
    expect(report.actionItems.map((action) => action.id)).toContain(
      "review_stock_future_module",
    );
  });

  it("no crea acciones si no hay alertas", () => {
    const report = buildDataQualityReport(
      EMPTY_DATA,
      [],
      DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
    );

    expect(report.recommendations).toEqual([]);
    expect(report.actionItems).toEqual([]);
  });
});
