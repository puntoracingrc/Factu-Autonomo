import { describe, expect, it } from "vitest";
import { buildClientProfitabilityReport } from "./client-profitability-report";
import type { RentabilidadRealDocumentReportRow } from "./types";

function row(
  overrides: Partial<RentabilidadRealDocumentReportRow> = {},
): RentabilidadRealDocumentReportRow {
  return {
    unitId: overrides.unitId ?? "unit_1",
    primaryDocumentId: overrides.primaryDocumentId ?? "doc_1",
    sourceType: overrides.sourceType ?? "invoice",
    workSourceType: overrides.workSourceType ?? "invoice",
    analysisMode: overrides.analysisMode ?? "fixed_price_work",
    documentLabel: overrides.documentLabel ?? "Factura F-1",
    clientId: overrides.clientId ?? "client_1",
    clientName: overrides.clientName ?? "Cliente Demo",
    date: overrides.date ?? "2026-07-01",
    incomeWithoutIndirectTax: overrides.incomeWithoutIndirectTax ?? 100,
    expectedIncomeWithoutIndirectTax: overrides.expectedIncomeWithoutIndirectTax,
    actualIncomeWithoutIndirectTax: overrides.actualIncomeWithoutIndirectTax ?? 100,
    totalDirectCosts: overrides.totalDirectCosts ?? 20,
    linkedExpensesCount: overrides.linkedExpensesCount ?? 1,
    unlinkedCandidatesCount: overrides.unlinkedCandidatesCount ?? 0,
    allocatedFixedCosts: overrides.allocatedFixedCosts ?? 0,
    operatingProfit: overrides.operatingProfit ?? 80,
    marginPercentage: overrides.marginPercentage ?? 80,
    estimatedVatToReserve: overrides.estimatedVatToReserve ?? 16.8,
    estimatedIrpfProvision: overrides.estimatedIrpfProvision ?? 16,
    prudentAvailableCash: overrides.prudentAvailableCash ?? 64,
    internalAdjustmentsTotal: overrides.internalAdjustmentsTotal ?? 0,
    internalRealProfit: overrides.internalRealProfit ?? 80,
    internalPrudentAvailableCash: overrides.internalPrudentAvailableCash ?? 64,
    warnings: overrides.warnings ?? [],
    sourceLinks: overrides.sourceLinks ?? [],
    qualityFlags: overrides.qualityFlags ?? [],
  };
}

describe("buildClientProfitabilityReport", () => {
  it("agrupa documentos por cliente y calcula totales", () => {
    const report = buildClientProfitabilityReport([
      row({ unitId: "u1", incomeWithoutIndirectTax: 100, operatingProfit: 50 }),
      row({ unitId: "u2", incomeWithoutIndirectTax: 200, operatingProfit: 100 }),
    ]);

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      clientId: "client_1",
      documentCount: 2,
      incomeWithoutIndirectTax: 300,
      operatingProfit: 150,
    });
  });

  it("calcula margen medio ponderado por ingresos", () => {
    const report = buildClientProfitabilityReport([
      row({ unitId: "u1", incomeWithoutIndirectTax: 100, operatingProfit: 10 }),
      row({ unitId: "u2", incomeWithoutIndirectTax: 900, operatingProfit: 450 }),
    ]);

    expect(report.rows[0].averageMarginPercentage).toBe(46);
  });

  it("maneja cliente desconocido", () => {
    const report = buildClientProfitabilityReport([
      row({ clientId: "", clientName: "", incomeWithoutIndirectTax: 50 }),
    ]);

    expect(report.rows[0]).toMatchObject({
      clientId: "unknown_client",
      clientName: "Cliente sin identificar",
    });
  });

  it("detecta cliente con margen negativo", () => {
    const report = buildClientProfitabilityReport([
      row({
        clientId: "client_bad",
        clientName: "Cliente Bajo",
        operatingProfit: -20,
        qualityFlags: ["negative_profit", "low_margin"],
      }),
    ]);

    expect(report.rows[0].negativeProfitDocumentsCount).toBe(1);
    expect(report.rows[0].warnings.map((warning) => warning.code)).toContain(
      "client_has_negative_profit_documents",
    );
  });

  it("identifica clientes con beneficio interno menor que documentado", () => {
    const report = buildClientProfitabilityReport([
      row({
        operatingProfit: 100,
        internalAdjustmentsTotal: 25,
        internalRealProfit: 75,
      }),
    ]);

    expect(report.clientsWithInternalProfitLowerThanDocumented).toHaveLength(1);
  });

  it("no muta filas de entrada", () => {
    const rows = [row({ qualityFlags: ["low_margin"] })];
    const before = JSON.parse(JSON.stringify(rows));

    buildClientProfitabilityReport(rows);

    expect(rows).toEqual(before);
  });
});
