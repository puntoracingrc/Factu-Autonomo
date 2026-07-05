import { describe, expect, it } from "vitest";
import { allocateRentabilidadRealFixedCosts } from "./fixed-cost-allocation";

describe("allocateRentabilidadRealFixedCosts", () => {
  it("none devuelve 0 y warning si hay gastos fijos", () => {
    const result = allocateRentabilidadRealFixedCosts({
      method: "none",
      totalFixedCostsForPeriod: 300,
    });

    expect(result.allocatedFixedCosts).toBe(0);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "fixed_cost_allocation_missing",
    );
  });

  it("manual_amount devuelve el importe manual", () => {
    const result = allocateRentabilidadRealFixedCosts({
      method: "manual_amount",
      totalFixedCostsForPeriod: 300,
      manualAmount: 80,
    });

    expect(result.allocatedFixedCosts).toBe(80);
    expect(result.warnings).toHaveLength(0);
  });

  it("revenue_share calcula proporción por facturación", () => {
    const result = allocateRentabilidadRealFixedCosts({
      method: "revenue_share",
      totalFixedCostsForPeriod: 500,
      workRevenue: 1000,
      monthlyRevenue: 5000,
    });

    expect(result.allocatedFixedCosts).toBe(100);
  });

  it("monthly_jobs divide entre trabajos", () => {
    const result = allocateRentabilidadRealFixedCosts({
      method: "monthly_jobs",
      totalFixedCostsForPeriod: 600,
      monthlyJobs: 3,
    });

    expect(result.allocatedFixedCosts).toBe(200);
  });

  it("hours calcula proporción por horas", () => {
    const result = allocateRentabilidadRealFixedCosts({
      method: "hours",
      totalFixedCostsForPeriod: 800,
      workHours: 10,
      monthlyWorkHours: 80,
    });

    expect(result.allocatedFixedCosts).toBe(100);
  });

  it("no divide por cero y genera warnings con datos incompletos", () => {
    const result = allocateRentabilidadRealFixedCosts({
      method: "revenue_share",
      totalFixedCostsForPeriod: 500,
      workRevenue: 1000,
      monthlyRevenue: 0,
    });

    expect(result.allocatedFixedCosts).toBe(0);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "fixed_cost_allocation_incomplete",
    );
  });
});
