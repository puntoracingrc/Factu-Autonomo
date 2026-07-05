import { describe, expect, it } from "vitest";
import type { RentabilidadRealPriceSimulatorInput } from "./types";
import { simulateRentabilidadRealMinimumPrice } from "./price-simulator";

function input(
  overrides: Partial<RentabilidadRealPriceSimulatorInput> = {},
): RentabilidadRealPriceSimulatorInput {
  return {
    mode: "job",
    objectiveType: "per_job",
    targetNetProfit: 400,
    directCosts: 100,
    monthlyFixedCosts: 600,
    selfEmployedFee: 0,
    selfEmployedFeeIncludedInFixedCosts: true,
    fixedCostAllocationMethod: "monthly_jobs",
    desiredMarginPercentage: 10,
    irpfProvisionPercentage: 20,
    vatRate: 21,
    internalAdjustments: 0,
    jobsPerMonth: 6,
    estimatedRealHours: 10,
    monthlyBillableHours: 120,
    monthlyDirectCostsEstimate: 500,
    averageJobPrice: 850,
    ...overrides,
  };
}

describe("simulateRentabilidadRealMinimumPrice", () => {
  it("calcula precio mínimo por trabajo", () => {
    const result = simulateRentabilidadRealMinimumPrice(input());

    expect(result.fixedCostAllocation).toBe(100);
    expect(result.requiredOperatingProfit).toBe(500);
    expect(result.minimumPriceWithoutVat).toBe(700);
  });

  it("calcula precio recomendado con margen", () => {
    const result = simulateRentabilidadRealMinimumPrice(input());

    expect(result.recommendedPriceWithoutVat).toBe(770);
    expect(result.expectedDocumentedProfit).toBe(570);
    expect(result.estimatedIrpfProvision).toBe(114);
    expect(result.prudentCash).toBe(456);
  });

  it("añade IVA solo al precio mostrado al cliente", () => {
    const result = simulateRentabilidadRealMinimumPrice(input());

    expect(result.recommendedPriceWithoutVat).toBe(770);
    expect(result.priceWithVat).toBe(931.7);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "vat_is_not_profit",
    );
  });

  it("calcula precio por hora real", () => {
    const result = simulateRentabilidadRealMinimumPrice(
      input({
        mode: "hourly_rate",
        objectiveType: "per_hour",
        targetNetProfit: 40,
        directCosts: 50,
        fixedCostAllocationMethod: "hours",
        monthlyFixedCosts: 1200,
        monthlyBillableHours: 120,
        estimatedRealHours: 10,
      }),
    );

    expect(result.targetNetProfitForCalculation).toBe(400);
    expect(result.minimumHourlyRate).toBe(65);
    expect(result.recommendedHourlyRate).toBe(71.5);
  });

  it("calcula facturación mínima mensual y trabajos necesarios", () => {
    const result = simulateRentabilidadRealMinimumPrice(
      input({
        mode: "monthly_revenue",
        objectiveType: "monthly",
        targetNetProfit: 1600,
        directCosts: 0,
        monthlyFixedCosts: 900,
        monthlyDirectCostsEstimate: 500,
        averageJobPrice: 850,
      }),
    );

    expect(result.monthlyMinimumRevenue).toBe(3400);
    expect(result.requiredJobsPerMonth).toBe(4);
  });

  it("trata el IRPF como provisión", () => {
    const result = simulateRentabilidadRealMinimumPrice(input());

    expect(result.requiredOperatingProfit).toBe(500);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "irpf_is_provision",
    );
  });

  it("los ajustes internos suben el precio interno necesario", () => {
    const result = simulateRentabilidadRealMinimumPrice(
      input({ internalAdjustments: 50 }),
    );

    expect(result.minimumPriceWithoutVat).toBe(700);
    expect(result.minimumInternalPriceWithoutVat).toBe(750);
    expect(result.recommendedInternalPriceWithoutVat).toBe(825);
    expect(result.expectedInternalProfitAfterAdjustments).toBe(520);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "internal_adjustments_do_not_reduce_taxes",
    );
  });

  it("no divide por cero y avisa con datos incompletos", () => {
    const result = simulateRentabilidadRealMinimumPrice(
      input({
        mode: "hourly_rate",
        objectiveType: "per_hour",
        estimatedRealHours: 0,
        fixedCostAllocationMethod: "none",
        averageJobPrice: 0,
      }),
    );

    expect(result.minimumHourlyRate).toBe(0);
    expect(result.recommendedHourlyRate).toBe(0);
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        "estimated_real_hours_missing",
        "fixed_cost_allocation_missing",
      ]),
    );
  });
});
