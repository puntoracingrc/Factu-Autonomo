import { describe, expect, it } from "vitest";
import {
  buildRentabilidadRealWizardAnswersFromForm,
  scoreRentabilidadRealWizardForm,
} from "./wizard-flow";

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
    expect(result.recommendedProductIds).toContain("RR_BASE");
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
    expect(result.recommendedProductIds).toContain("RR_FIXED_COSTS_PRO");
    expect(result.recommendedProductIds).toContain("RR_PRICE_SIMULATOR");
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
    expect(result.recommendedProductIds).toContain("RR_BASE");
    expect(result.recommendedProductIds).toContain("RR_HOURS_PROJECTS");
  });

  it("clasifica autónomo con local o vehículo como nivel 4", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModel: "mixed",
      hasPremises: "yes",
      workVehicleType: "dedicated_van",
      hasPayrollEmployees: "no",
      hasStockOrCommerce: "no",
      isInModulesRegime: "no",
    });

    expect(result.level).toBe(4);
    expect(result.recommendedProductIds).toContain("RR_BASE");
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
    expect(result.recommendedProductIds).toContain("RR_HOURS_PROJECTS");
    expect(result.recommendedProductIds).toContain("RR_ASSETS_LIGHT");
  });

  it("instalador con materiales para trabajo no va a fase futura", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModel: "job_materials",
      hasStockOrCommerce: "no",
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(false);
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
  });

  it("producto comprado para ese trabajo no va a fase futura", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModel: "products",
      hasStockOrCommerce: "no",
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(false);
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
  });

  it("producto aportado por cliente no va a fase futura", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModel: "customer_products",
      hasStockOrCommerce: "no",
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(false);
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
  });

  it("manda stock real a fase futura nivel 5", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModel: "closed_jobs",
      hasStockOrCommerce: "yes",
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(true);
    expect(result.futureLevel).toBe(5);
  });

  it("manda tienda o e-commerce a fase futura nivel 5", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModel: "stock_commerce",
      hasStockOrCommerce: "no",
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(true);
    expect(result.futureLevel).toBe(5);
  });

  it("marca coche o moto particular como vehículo interno pendiente de validación fiscal", () => {
    const answers = buildRentabilidadRealWizardAnswersFromForm({
      legalForm: "individual",
      chargeModel: "closed_jobs",
      workVehicleType: "private_car",
      hasStockOrCommerce: "no",
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(answers.hasWorkVehicle).toBe(true);
    expect(answers.workVehicleUse).toBe("private_car");
    expect(answers.usesPrivateVehicleForWork).toBe(true);
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
