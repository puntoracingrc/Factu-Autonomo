import { describe, expect, it } from "vitest";
import { PLANS, formatPlanPrice, isProPlan, yearlySavingsPercent } from "./plans";

describe("billing plans", () => {
  it("posiciona Pro por debajo de competidores habituales", () => {
    expect(PLANS.pro.priceMonthlyEur).toBeLessThan(12);
    expect(PLANS.pro.priceYearlyEur).toBeLessThan(100);
    expect(PLANS.pro_plus.priceMonthlyEur).toBeGreaterThan(
      PLANS.pro.priceMonthlyEur ?? 0,
    );
  });

  it("limita el plan gratis", () => {
    expect(PLANS.free.limits.maxDocumentsPerMonth).toBe(10);
    expect(PLANS.free.limits.maxCustomers).toBe(15);
    expect(PLANS.free.limits.cloudSync).toBe(false);
    expect(PLANS.free.limits.databaseImport).toBe(false);
    expect(PLANS.free.limits.aiTextAutofill).toBe(false);
  });

  it("desbloquea funciones en pro y trial", () => {
    expect(isProPlan("pro")).toBe(true);
    expect(isProPlan("pro_plus")).toBe(true);
    expect(isProPlan("trial")).toBe(true);
    expect(isProPlan("free")).toBe(false);
    expect(PLANS.pro.limits.databaseImport).toBe(true);
    expect(PLANS.trial.limits.databaseImport).toBe(true);
    expect(PLANS.pro.limits.aiTextAutofill).toBe(true);
    expect(PLANS.trial.limits.aiTextAutofill).toBe(true);
    expect(PLANS.pro.limits.quarterlyExport).toBe(true);
    expect(PLANS.pro_plus.limits.productCreationFromExpenses).toBe(true);
    expect(PLANS.pro.limits.productCreationFromExpenses).toBe(false);
  });

  it("formatea precios en español", () => {
    expect(formatPlanPrice(5.99, "month")).toContain("5,99");
    expect(formatPlanPrice(49, "year")).toContain("49,00");
  });

  it("calcula ahorro anual", () => {
    expect(yearlySavingsPercent()).toBeGreaterThan(0);
    expect(yearlySavingsPercent("pro_plus")).toBeGreaterThan(0);
  });
});
