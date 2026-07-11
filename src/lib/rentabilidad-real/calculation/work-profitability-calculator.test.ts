import { describe, expect, it } from "vitest";
import type {
  RentabilidadRealWorkCost,
  RentabilidadRealWorkIncome,
  RentabilidadRealWorkProfitabilityInput,
} from "./types";
import { calculateRentabilidadRealWorkProfitability } from "./work-profitability-calculator";

function income(
  sourceType: "quote" | "invoice",
  subtotal: number,
  iva: number,
): RentabilidadRealWorkIncome {
  return {
    sourceType,
    documentId: `${sourceType}_1`,
    number: sourceType === "quote" ? "P-1" : "F-1",
    date: "2026-07-01",
    customerName: "Cliente Demo",
    subtotal,
    iva,
    total: subtotal + iva,
    sourceLink: {
      sourceType,
      sourceId: `${sourceType}_1`,
      label: sourceType,
    },
  };
}

function cost(
  amount: number,
  ivaAmount = 0,
  fiscalDeductible?: boolean,
): RentabilidadRealWorkCost {
  return {
    id: `cost_${amount}`,
    sourceType: "expense",
    date: "2026-07-02",
    supplierName: "Proveedor Demo",
    description: "Material",
    amount,
    fiscalDeductible,
    ivaAmount,
    total: amount + ivaAmount,
    category: "Material",
    sourceLink: {
      sourceType: "expense",
      sourceId: `cost_${amount}`,
      label: "Gasto",
    },
  };
}

function input(
  overrides: Partial<RentabilidadRealWorkProfitabilityInput> = {},
): RentabilidadRealWorkProfitabilityInput {
  return {
    source: {
      sourceType: "invoice",
      sourceDocumentId: "invoice_1",
    },
    invoiceSummary: income("invoice", 1000, 210),
    directCosts: [],
    fixedCostCandidates: [],
    fixedCostAllocationInput: {
      method: "none",
      totalFixedCostsForPeriod: 0,
    },
    ...overrides,
  };
}

describe("calculateRentabilidadRealWorkProfitability", () => {
  it("calcula factura simple sin costes", () => {
    const result = calculateRentabilidadRealWorkProfitability(input());

    expect(result.incomeWithoutIndirectTax).toBe(1000);
    expect(result.totalDirectCosts).toBe(0);
    expect(result.grossMargin).toBe(1000);
    expect(result.operatingProfit).toBe(1000);
  });

  it("calcula factura con costes directos", () => {
    const result = calculateRentabilidadRealWorkProfitability(
      input({
        directCosts: [cost(100, 21), cost(50, 10.5)],
      }),
    );

    expect(result.totalDirectCosts).toBe(150);
    expect(result.grossMargin).toBe(850);
  });

  it("calcula factura con gastos fijos imputados", () => {
    const result = calculateRentabilidadRealWorkProfitability(
      input({
        directCosts: [cost(100)],
        fixedCostCandidates: [cost(300)],
        fixedCostAllocationInput: {
          method: "manual_amount",
          totalFixedCostsForPeriod: 300,
          manualAmount: 80,
        },
      }),
    );

    expect(result.allocatedFixedCosts).toBe(80);
    expect(result.operatingProfit).toBe(820);
  });

  it("presupuesto sin factura genera cálculo previsto y warning", () => {
    const result = calculateRentabilidadRealWorkProfitability(
      input({
        source: {
          sourceType: "quote",
          sourceDocumentId: "quote_1",
        },
        quoteSummary: income("quote", 900, 189),
        invoiceSummary: undefined,
        warnings: [
          {
            code: "quote_without_invoice",
            message: "Presupuesto sin factura.",
            severity: "info",
          },
        ],
      }),
    );

    expect(result.expectedIncomeWithoutIndirectTax).toBe(900);
    expect(result.actualIncomeWithoutIndirectTax).toBeUndefined();
    expect(result.incomeWithoutIndirectTax).toBe(900);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "quote_without_invoice",
    );
  });

  it("factura con presupuesto vinculado muestra previsto vs real", () => {
    const result = calculateRentabilidadRealWorkProfitability(
      input({
        quoteSummary: income("quote", 900, 189),
        invoiceSummary: income("invoice", 1000, 210),
      }),
    );

    expect(result.expectedIncomeWithoutIndirectTax).toBe(900);
    expect(result.actualIncomeWithoutIndirectTax).toBe(1000);
    expect(result.incomeWithoutIndirectTax).toBe(1000);
  });

  it("IVA se muestra como reserva, no reduce beneficio operativo", () => {
    const result = calculateRentabilidadRealWorkProfitability(
      input({
        directCosts: [cost(100, 21)],
      }),
    );

    expect(result.operatingProfit).toBe(900);
    expect(result.estimatedVatToReserve).toBe(189);
  });

  it("IRPF provision reduce caja prudente, no margen operativo", () => {
    const result = calculateRentabilidadRealWorkProfitability(
      input({
        taxReserve: {
          irpfProvisionPercentage: 20,
        },
      }),
    );

    expect(result.operatingProfit).toBe(1000);
    expect(result.estimatedIrpfProvision).toBe(200);
    expect(result.prudentAvailableCash).toBe(800);
  });

  it("un coste directo no deducible reduce margen y caja, no la base IRPF", () => {
    const result = calculateRentabilidadRealWorkProfitability(
      input({
        directCosts: [cost(121, 0, false)],
        taxReserve: { irpfProvisionPercentage: 20 },
      }),
    );

    expect(result.operatingProfit).toBe(879);
    expect(result.estimatedIrpfBase).toBe(1000);
    expect(result.estimatedVatToReserve).toBe(210);
    expect(result.estimatedIrpfProvision).toBe(200);
    expect(result.prudentAvailableCash).toBe(679);
  });

  it("prorratea solo la parte deducible de los costes fijos asignados", () => {
    const result = calculateRentabilidadRealWorkProfitability(
      input({
        fixedCostCandidates: [cost(100, 0, true), cost(120, 0, false)],
        fixedCostAllocationInput: {
          method: "monthly_jobs",
          totalFixedCostsForPeriod: 220,
          fiscalDeductibleFixedCostsForPeriod: 100,
          monthlyJobs: 2,
        },
        taxReserve: { irpfProvisionPercentage: 20 },
      }),
    );

    expect(result.allocatedFixedCosts).toBe(110);
    expect(result.operatingProfit).toBe(890);
    expect(result.estimatedIrpfBase).toBe(950);
    expect(result.estimatedIrpfProvision).toBe(190);
    expect(result.prudentAvailableCash).toBe(700);
  });

  it("un fijo completamente no deducible no reduce la base IRPF", () => {
    const result = calculateRentabilidadRealWorkProfitability(
      input({
        fixedCostCandidates: [cost(120, 0, false)],
        fixedCostAllocationInput: {
          method: "monthly_jobs",
          totalFixedCostsForPeriod: 120,
          fiscalDeductibleFixedCostsForPeriod: 0,
          monthlyJobs: 1,
        },
        taxReserve: { irpfProvisionPercentage: 20 },
      }),
    );

    expect(result.allocatedFixedCosts).toBe(120);
    expect(result.operatingProfit).toBe(880);
    expect(result.estimatedIrpfBase).toBe(1000);
    expect(result.estimatedIrpfProvision).toBe(200);
    expect(result.prudentAvailableCash).toBe(680);
  });

  it("mantiene como deducibles los costes legacy sin la marca nueva", () => {
    const result = calculateRentabilidadRealWorkProfitability(
      input({
        directCosts: [cost(100)],
        taxReserve: { irpfProvisionPercentage: 20 },
      }),
    );

    expect(result.estimatedIrpfBase).toBe(900);
    expect(result.estimatedIrpfProvision).toBe(180);
    expect(result.prudentAvailableCash).toBe(720);
  });

  it("ajustes internos reducen beneficio interno sin tocar resultado documentado ni impuestos", () => {
    const result = calculateRentabilidadRealWorkProfitability(
      input({
        directCosts: [cost(100, 21)],
        internalAdjustmentsTotal: 150,
        taxReserve: {
          irpfProvisionPercentage: 20,
        },
      }),
    );

    expect(result.operatingProfit).toBe(900);
    expect(result.documentedOperatingProfit).toBe(900);
    expect(result.internalAdjustmentsTotal).toBe(150);
    expect(result.internalRealProfit).toBe(750);
    expect(result.estimatedVatToReserve).toBe(189);
    expect(result.estimatedIrpfProvision).toBe(180);
    expect(result.prudentAvailableCash).toBe(720);
    expect(result.internalPrudentAvailableCash).toBe(570);
  });

  it("operatingProfit negativo no genera IRPF positivo", () => {
    const result = calculateRentabilidadRealWorkProfitability(
      input({
        directCosts: [cost(1200, 252)],
      }),
    );

    expect(result.operatingProfit).toBe(-200);
    expect(result.estimatedIrpfProvision).toBe(0);
  });
});
