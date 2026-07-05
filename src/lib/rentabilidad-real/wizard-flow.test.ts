import { describe, expect, it } from "vitest";
import { scoreRentabilidadRealWizardForm } from "./wizard-flow";

describe("rentabilidad real wizard scoring integration", () => {
  it("clasifica pintor por obras como nivel 2", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModel: "closed_jobs",
      hasPayrollEmployees: "no",
      hasStockOrCommerce: "no",
      isInModulesRegime: "no",
      profitUnit: "job",
    });

    expect(result.level).toBe(2);
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
  });

  it("clasifica diseñador con retención como nivel 3", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModel: "projects",
      hasProfessionalWithholding: "yes",
      hasPayrollEmployees: "no",
      hasStockOrCommerce: "no",
      isInModulesRegime: "no",
    });

    expect(result.level).toBe(3);
    expect(result.recommendedProductIds).toContain("RR_HOURS_PROJECTS");
  });

  it("clasifica autónomo con local o vehículo como nivel 4", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModel: "mixed",
      hasPremises: "yes",
      hasWorkVehicle: "yes",
      hasPayrollEmployees: "no",
      hasStockOrCommerce: "no",
      isInModulesRegime: "no",
    });

    expect(result.level).toBe(4);
    expect(result.recommendedProductIds).toContain("RR_ASSETS_LIGHT");
  });

  it("manda stock a fase futura nivel 5", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModel: "products",
      hasStockOrCommerce: "yes",
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(true);
    expect(result.futureLevel).toBe(5);
  });

  it("manda módulos a fase futura nivel 6", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModel: "mixed",
      hasPayrollEmployees: "no",
      hasStockOrCommerce: "no",
      isInModulesRegime: "yes",
    });

    expect(result.outOfPhase).toBe(true);
    expect(result.futureLevel).toBe(6);
  });

  it("manda S.L. a fase futura nivel 7", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "sl",
      chargeModel: "mixed",
      hasPayrollEmployees: "no",
      hasStockOrCommerce: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(true);
    expect(result.futureLevel).toBe(7);
  });

  it("manda empleados a fase futura nivel 8", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModel: "mixed",
      hasPayrollEmployees: "yes",
      hasStockOrCommerce: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(true);
    expect(result.futureLevel).toBe(8);
  });
});
