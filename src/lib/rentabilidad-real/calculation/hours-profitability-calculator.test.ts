import { describe, expect, it } from "vitest";
import type {
  RentabilidadRealHoursProfitabilityInput,
  RentabilidadRealWorkCost,
} from "./types";
import { calculateRentabilidadRealHoursProfitability } from "./hours-profitability-calculator";

function cost(
  amount: number,
  ivaAmount = 0,
  fiscalDeductible?: boolean,
): RentabilidadRealWorkCost {
  return {
    id: `cost_${amount}`,
    sourceType: "expense",
    date: "2026-07-02",
    supplierName: "Proveedor",
    description: "Coste",
    amount,
    fiscalDeductible,
    ivaAmount,
    total: amount + ivaAmount,
    category: "Servicios",
    sourceLink: {
      sourceType: "expense",
      label: "Coste",
    },
  };
}

function input(
  overrides: Partial<RentabilidadRealHoursProfitabilityInput> = {},
): RentabilidadRealHoursProfitabilityInput {
  return {
    sourceType: "manual",
    projectName: "Proyecto",
    billingModel: "hours",
    incomeWithoutIndirectTax: 1000,
    vatFromIncome: 210,
    directCosts: [],
    fixedCostCandidates: [],
    fixedCostAllocationInput: {
      method: "none",
      totalFixedCostsForPeriod: 0,
    },
    billedHours: 10,
    realWorkedHours: 10,
    irpfProvisionPercentage: 20,
    ...overrides,
  };
}

describe("calculateRentabilidadRealHoursProfitability", () => {
  it("calcula por horas simple", () => {
    const result = calculateRentabilidadRealHoursProfitability(input());

    expect(result.billedHourlyRate).toBe(100);
    expect(result.effectiveHourlyRateBeforeCosts).toBe(100);
    expect(result.operatingProfitPerRealHour).toBe(100);
  });

  it("proyecto cerrado con más horas reales que facturadas", () => {
    const result = calculateRentabilidadRealHoursProfitability(
      input({
        billingModel: "closed_project",
        billedHours: 10,
        realWorkedHours: 14,
      }),
    );

    expect(result.unbilledHours).toBe(4);
    expect(result.unbilledHoursPercentage).toBe(28.57);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "real_hours_exceed_billed_hours",
    );
  });

  it("calcula iguala mensual", () => {
    const result = calculateRentabilidadRealHoursProfitability(
      input({
        billingModel: "monthly_retainer",
        incomeWithoutIndirectTax: 1200,
        billedHours: 12,
        realWorkedHours: 15,
      }),
    );

    expect(result.billingModel).toBe("monthly_retainer");
    expect(result.effectiveHourlyRateBeforeCosts).toBe(80);
  });

  it("gastos directos reducen margen", () => {
    const result = calculateRentabilidadRealHoursProfitability(
      input({ directCosts: [cost(100, 21)] }),
    );

    expect(result.totalDirectCosts).toBe(100);
    expect(result.grossMargin).toBe(900);
  });

  it("gastos fijos por horas reducen beneficio operativo", () => {
    const result = calculateRentabilidadRealHoursProfitability(
      input({
        fixedCostCandidates: [cost(800)],
        fixedCostAllocationInput: {
          method: "hours",
          totalFixedCostsForPeriod: 800,
          monthlyWorkHours: 80,
        },
        realWorkedHours: 10,
      }),
    );

    expect(result.allocatedFixedCosts).toBe(100);
    expect(result.operatingProfit).toBe(900);
  });

  it("por horas con solo un fijo seleccionado calcula 80 euros", () => {
    const result = calculateRentabilidadRealHoursProfitability(
      input({
        incomeWithoutIndirectTax: 800,
        vatFromIncome: 168,
        directCosts: [cost(50, 10.5)],
        fixedCostCandidates: [cost(600), cost(1120.25)],
        fixedCostAllocationInput: {
          method: "hours",
          totalFixedCostsForPeriod: 600,
          monthlyWorkHours: 120,
        },
        billedHours: 10,
        totalRealHoursOverride: 16,
      }),
    );

    expect(result.allocatedFixedCosts).toBe(80);
    expect(result.grossMargin).toBe(750);
    expect(result.operatingProfit).toBe(670);
    expect(result.operatingProfitPerRealHour).toBe(41.88);
    expect(result.estimatedIrpfProvision).toBe(134);
    expect(result.prudentAvailableCash).toBe(536);
    expect(result.prudentCashPerRealHour).toBe(33.5);
  });

  it("por horas con todos los fijos seleccionados calcula 229,37 euros", () => {
    const result = calculateRentabilidadRealHoursProfitability(
      input({
        incomeWithoutIndirectTax: 800,
        directCosts: [cost(50, 10.5)],
        fixedCostAllocationInput: {
          method: "hours",
          totalFixedCostsForPeriod: 1720.25,
          monthlyWorkHours: 120,
        },
        billedHours: 10,
        totalRealHoursOverride: 16,
      }),
    );

    expect(result.allocatedFixedCosts).toBe(229.37);
    expect(result.operatingProfit).toBe(520.63);
  });

  it("por horas sin fijos seleccionados aplica cero y avisa", () => {
    const result = calculateRentabilidadRealHoursProfitability(
      input({
        incomeWithoutIndirectTax: 800,
        fixedCostCandidates: [cost(600)],
        fixedCostAllocationInput: {
          method: "hours",
          totalFixedCostsForPeriod: 0,
          monthlyWorkHours: 120,
        },
        totalRealHoursOverride: 16,
      }),
    );

    expect(result.allocatedFixedCosts).toBe(0);
    expect(result.operatingProfit).toBe(800);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "fixed_cost_allocation_incomplete",
    );
    expect(Number.isFinite(result.operatingProfitPerRealHour)).toBe(true);
  });

  it("IVA no reduce beneficio operativo", () => {
    const result = calculateRentabilidadRealHoursProfitability(input());

    expect(result.operatingProfit).toBe(1000);
    expect(result.estimatedVatToReserve).toBe(210);
  });

  it("IRPF reduce caja prudente", () => {
    const result = calculateRentabilidadRealHoursProfitability(input());

    expect(result.estimatedIrpfProvision).toBe(200);
    expect(result.prudentAvailableCash).toBe(800);
  });

  it("mantiene un coste directo no deducible fuera de la base IRPF", () => {
    const result = calculateRentabilidadRealHoursProfitability(
      input({ directCosts: [cost(121, 0, false)] }),
    );

    expect(result.operatingProfit).toBe(879);
    expect(result.estimatedIrpfBase).toBe(1000);
    expect(result.estimatedVatToReserve).toBe(210);
    expect(result.estimatedIrpfProvision).toBe(200);
    expect(result.prudentAvailableCash).toBe(679);
  });

  it("prorratea la parte deducible de los fijos en la base IRPF por horas", () => {
    const result = calculateRentabilidadRealHoursProfitability(
      input({
        fixedCostCandidates: [cost(100, 0, true), cost(300, 0, false)],
        fixedCostAllocationInput: {
          method: "hours",
          totalFixedCostsForPeriod: 400,
          fiscalDeductibleFixedCostsForPeriod: 100,
          monthlyWorkHours: 40,
        },
        realWorkedHours: 10,
      }),
    );

    expect(result.allocatedFixedCosts).toBe(100);
    expect(result.operatingProfit).toBe(900);
    expect(result.estimatedIrpfBase).toBe(975);
    expect(result.estimatedIrpfProvision).toBe(195);
    expect(result.prudentAvailableCash).toBe(705);
  });

  it("ajustes internos reducen beneficio interno por hora sin tocar IVA, IRPF ni beneficio documentado", () => {
    const result = calculateRentabilidadRealHoursProfitability(
      input({
        directCosts: [cost(100, 21)],
        internalAdjustmentsTotal: 200,
      }),
    );

    expect(result.operatingProfit).toBe(900);
    expect(result.documentedOperatingProfit).toBe(900);
    expect(result.internalAdjustmentsTotal).toBe(200);
    expect(result.internalRealProfit).toBe(700);
    expect(result.operatingProfitPerRealHour).toBe(90);
    expect(result.internalRealProfitPerRealHour).toBe(70);
    expect(result.estimatedVatToReserve).toBe(189);
    expect(result.estimatedIrpfProvision).toBe(180);
    expect(result.internalPrudentCashPerRealHour).toBe(52);
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        "internal_adjustments_reduce_hourly_profit",
        "documented_vs_internal_profitability",
      ]),
    );
  });

  it("horas cero no divide por cero y genera warning", () => {
    const result = calculateRentabilidadRealHoursProfitability(
      input({
        billedHours: 0,
        realWorkedHours: 0,
      }),
    );

    expect(result.billedHourlyRate).toBe(0);
    expect(result.operatingProfitPerRealHour).toBe(0);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "zero_real_hours",
    );
  });

  it("operatingProfit negativo no genera IRPF positivo", () => {
    const result = calculateRentabilidadRealHoursProfitability(
      input({
        directCosts: [cost(1200, 252)],
      }),
    );

    expect(result.operatingProfit).toBe(-200);
    expect(result.estimatedIrpfProvision).toBe(0);
  });
});
