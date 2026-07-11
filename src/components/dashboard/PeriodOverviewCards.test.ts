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

  it("rotula un neto negativo como saldo a favor sin perder magnitud", () => {
    expect(cardsSource).toContain("expenseBalanceIsCredit");
    expect(cardsSource).toContain('"Saldo a favor" : "Gasto neto"');
    expect(cardsSource).toContain("Math.abs(spent)");
    expect(panelSource).toContain("periodExpenseBalanceIsCredit");
    expect(panelSource).toContain("Math.abs(periodSpent)");
  });
});
