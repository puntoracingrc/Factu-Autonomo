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
    expect(cardsSource).toContain("Resumen rápido");
    expect(cardsSource).toContain("Te queda aprox.");
    expect(cardsSource).toContain("base IRPF");
    expect(cardsSource).toContain("estimatedIrpfBase");
    expect(panelSource).toContain(
      "taxes.nonDeductibleExpenseCount > 0",
    );
    expect(panelSource).toContain(
      "estimatedIrpfBase={taxes.estimatedIrpfBase}",
    );
  });

  it("presenta ventas facturadas y no filtra el resumen fiscal por cobro", () => {
    expect(cardsSource).toContain("Has facturado");
    expect(cardsSource).toContain("invoicedIncome");
    expect(panelSource).toContain("taxes.salesBase + taxes.salesIva");
    expect(panelSource).toContain("invoicedIncome={periodInvoiced}");
    expect(panelSource).not.toContain("isCollectedDocument");
    expect(panelSource).not.toContain("collectedSalesTotal");
  });

  it("rotula un neto negativo como saldo a favor sin perder magnitud", () => {
    expect(cardsSource).toContain("expenseBalanceIsCredit");
    expect(cardsSource).toContain('"Tienes saldo a favor" : "Has gastado"');
    expect(cardsSource).toContain("Math.abs(spent)");
    expect(panelSource).toContain("spent={periodSpent}");
  });

  it("enseña de un vistazo cuánto apartar para impuestos", () => {
    expect(cardsSource).toContain("Aparta para impuestos");
    expect(cardsSource).toContain("totalToSetAside");
    expect(cardsSource).toContain("ivaToPay + irpfEstimate");
    expect(cardsSource).toContain("IVA {formatMoney(ivaToPay)}");
    expect(cardsSource).toContain("IRPF {formatMoney(irpfEstimate)}");
  });

  it("desglosa el beneficio por mes y el cobro pendiente del filtro elegido", () => {
    expect(cardsSource).toContain("Resultado por meses");
    expect(cardsSource).toContain("Beneficio {row.label}");
    expect(cardsSource).toContain("Falta por cobrar");
    expect(cardsSource).toContain("Tu beneficio real a día de hoy");
    expect(panelSource).toContain("selectedMonthKeys");
    expect(panelSource).toContain("isPendingInvoicePayment");
    expect(panelSource).toContain("monthlyBenefitRows={monthlyBenefitRows}");
    expect(panelSource).toContain("mode === \"quarter\"");
    expect(panelSource).toContain("mode === \"months\"");
    expect(panelSource).toContain("mode === \"year\"");
  });
});
