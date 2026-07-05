import { describe, expect, it } from "vitest";
import { EMPTY_DATA } from "@/lib/types";
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
  });

  it("detecta presupuestos sin factura y facturas sin presupuesto", () => {
    const report = buildDataQualityReport(
      EMPTY_DATA,
      [row(["quote_without_invoice"]), row(["invoice_without_quote"])],
      DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
    );

    expect(report.quotesWithoutInvoice).toBe(1);
    expect(report.invoicesWithoutQuote).toBe(1);
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
  });

  it("detecta falta de regla de gastos fijos", () => {
    const report = buildDataQualityReport(
      EMPTY_DATA,
      [row(["no_fixed_cost_rule"])],
      DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS,
    );

    expect(report.fixedCostsWithoutAllocationRule).toBe(1);
    expect(report.recommendations.join(" ")).toContain("gastos fijos");
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
});
