import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./WorkExpenseLinkingPanel.tsx", import.meta.url),
  "utf8",
);

describe("WorkExpenseLinkingPanel fiscal allocation semantics", () => {
  it("reparte el coste operativo completo sin convertirlo en deducción fiscal", () => {
    expect(source).toContain("expenseFiscalAmounts");
    expect(source).not.toContain("expenseTotals");
    expect(source.match(/expenseFiscalAmounts\(expense\)/g)).toHaveLength(2);
    expect(source).toMatch(
      /setExpenseCostAllocationForWork\([\s\S]*?amount,\s*fiscal\.operatingCost,/,
    );
    expect(source).toContain("allocationAmount ?? fiscal.operatingCost");
    expect(source).toContain("allocationAmount < fiscal.operatingCost");
    expect(source).toContain("formatMoney(fiscal.operatingCost)");
  });

  it("conserva visibles los importes registrados y explica el no deducible", () => {
    expect(source).toContain("Base registrada");
    expect(source).toContain("formatMoney(fiscal.registeredBase)");
    expect(source).toContain("formatMoney(fiscal.registeredIva)");
    expect(source).toContain("formatMoney(fiscal.registeredTotal)");
    expect(source).toContain("reduce la rentabilidad por su coste completo");
    expect(source).toContain(
      "su base e IVA fiscalmente deducibles siguen en 0",
    );
    expect(source).toContain("su asignación fiscal permanece separada");
  });
});
