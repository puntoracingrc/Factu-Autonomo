import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cardsSource = readFileSync(
  new URL("./PeriodOverviewCards.tsx", import.meta.url),
  "utf8",
);
const panelSource = readFileSync(
  new URL("./FiscalSummaryPanel.tsx", import.meta.url),
  "utf8",
);

describe("PeriodOverviewCards fiscal semantics", () => {
  it("distingue el gasto operativo de la base estimada para IRPF", () => {
    expect(cardsSource).toContain("hasNonDeductibleExpenses");
    expect(cardsSource).toContain("Beneficio económico est.");
    expect(cardsSource).toContain("Base estimada para IRPF");
    expect(cardsSource).toContain("estimatedIrpfBase");
    expect(panelSource).toContain(
      "taxes.nonDeductibleExpenseCount > 0",
    );
    expect(panelSource).toContain(
      "estimatedIrpfBase={taxes.estimatedIrpfBase}",
    );
  });
});
