import { describe, expect, it } from "vitest";
import { PLANS, formatPlanPrice, isProPlan, yearlySavingsPercent } from "./plans";

describe("billing plans", () => {
  it("posiciona Pro por debajo de competidores habituales", () => {
    expect(PLANS.pro.priceMonthlyEur).toBeLessThan(12);
    expect(PLANS.pro.priceYearlyEur).toBeLessThan(100);
  });

  it("limita el plan gratis", () => {
    expect(PLANS.free.limits.maxDocumentsPerMonth).toBe(10);
    expect(PLANS.free.limits.maxCustomers).toBe(15);
    expect(PLANS.free.limits.cloudSync).toBe(false);
  });

  it("desbloquea funciones en pro y trial", () => {
    expect(isProPlan("pro")).toBe(true);
    expect(isProPlan("trial")).toBe(true);
    expect(isProPlan("free")).toBe(false);
    expect(PLANS.pro.limits.quarterlyExport).toBe(true);
  });

  it("formatea precios en español", () => {
    expect(formatPlanPrice(5.99, "month")).toContain("5,99");
    expect(formatPlanPrice(49, "year")).toContain("49,00");
  });

  it("calcula ahorro anual", () => {
    expect(yearlySavingsPercent()).toBeGreaterThan(0);
  });
});
