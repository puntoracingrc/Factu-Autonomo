import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./TaxSummaryCard.tsx", import.meta.url),
  "utf8",
);
const fiscalPanelSource = readFileSync(
  new URL("./FiscalSummaryPanel.tsx", import.meta.url),
  "utf8",
);
const quarterlyCardSource = readFileSync(
  new URL("./QuarterlyTaxSummaryCard.tsx", import.meta.url),
  "utf8",
);

describe("TaxSummaryCard integrity warning", () => {
  it("mantiene visible el riesgo aunque los importes incluidos sean cero", () => {
    expect(source).toContain(
      "const hasIntegrityBlocks = taxes.integrityBlockedDocuments > 0",
    );
    expect(source).toContain('role="alert"');
    expect(source).toContain("Resumen fiscal incompleto");
    expect(source).toContain("documento fiscal bloqueado");
    expect(source).toContain("Sus importes no están incluidos");
    expect(source).toContain('href="/facturas"');
    expect(source).toContain(
      "No hay movimientos fiscales verificables incluidos en este periodo.",
    );
    expect(source).toContain("taxes.unsupportedRectificationDocuments > 0");
    expect(source).toContain("Rectificación interperiodo pendiente");
    expect(source).toContain("La exportación permanece bloqueada");
  });
});

describe("TaxSummaryCard fiscal semantics", () => {
  it("presenta el resultado tras IRPF sin mezclarlo con la posición de IVA", () => {
    expect(source).toContain("Resultado económico tras reservar IRPF");
    expect(source).toContain("taxes.profitAfterIrpfReserve");
    expect(source).toContain("el IVA va aparte");
    expect(source).toContain("Beneficio económico antes de reservar IRPF");
    expect(source).toContain("Base estimada para IRPF");
    expect(source).toContain("taxes.estimatedIrpfBase");
    expect(source).not.toContain("Beneficio neto");
    expect(source).not.toContain("Después de IVA neto");
    expect(source).not.toContain("taxes.estimatedNetProfit");
  });

  it("separa cabecera o importe íntegro del bloqueo por IVA mixto incompleto", () => {
    expect(source).toContain("taxes.headerVatExpenseCount");
    expect(source).toContain("Cabecera o contrato de importe íntegro");
    expect(source).toContain("contrato de importe íntegro no desgravable");
    expect(source).toContain(
      "if (taxes.vatExempt || taxes.headerVatExpenseCount === 0) return null",
    );
    expect(source).toContain("taxes.unsupportedMixedVatExpenses");
    expect(source).toContain("Desglose de IVA mixto incompleto");
    expect(source).toContain(
      "El IVA deducible y la posición de IVA no deben considerarse completos",
    );
    expect(source).toContain("La exportación permanece bloqueada");
    expect(source).toContain('href="/gastos"');
    expect(source).toContain("hasUnsupportedMixedVat");
  });

  it("deshabilita CSV y PDF cuando hay gastos mixtos bloqueados", () => {
    for (const panel of [fiscalPanelSource, quarterlyCardSource]) {
      expect(panel).toContain("taxes.unsupportedMixedVatExpenses > 0");
      expect(panel).toContain("disabled={exportBlocked}");
      expect(panel).toContain(
        "Revisa los bloqueos indicados en el resumen antes de exportar",
      );
    }
  });

  it("explica los gastos no deducibles sin ocultar que siguen en control", () => {
    expect(source).toContain("taxes.nonDeductibleExpenseCount");
    expect(source).toContain("taxes.nonDeductibleExpenseTotal");
    expect(source).toContain("gasto no deducible");
    expect(source).toContain("sigue en Gastos, balance y rentabilidad");
    expect(source).toContain("sí reduce el beneficio");
    expect(source).toContain("aporta 0 a la base");
    expect(source).toContain("no reduce la");
    expect(source).toContain("estimación de IRPF");
    expect(source).toMatch(
      /const hasSummaryData =[\s\S]*taxes\.nonDeductibleExpenseCount > 0[\s\S]*taxes\.unsupportedMixedVatExpenses > 0;/,
    );
    expect(source).toContain("!hasSummaryData");
    expect(source).not.toContain(
      "No hay ventas ni gastos fiscalmente deducibles en este periodo.",
    );
  });
});
