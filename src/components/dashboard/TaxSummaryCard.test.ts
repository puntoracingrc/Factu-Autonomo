import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./TaxSummaryCard.tsx", import.meta.url),
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
    expect(source).toContain("Resultado tras reservar IRPF");
    expect(source).toContain("taxes.profitAfterIrpfReserve");
    expect(source).toContain("El IVA se muestra por separado");
    expect(source).not.toContain("Beneficio neto");
    expect(source).not.toContain("Después de IVA neto");
    expect(source).not.toContain("taxes.estimatedNetProfit");
  });
});
