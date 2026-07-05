import { describe, expect, it } from "vitest";
import { scoreRentabilidadRealProfile } from "./scoring";

describe("rentabilidad real scoring", () => {
  it("clasifica un autonomo simple como nivel 1", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      hasPayrollEmployees: false,
      isInModulesRegime: false,
      hasStockOrCommerce: false,
    });

    expect(result.level).toBe(1);
    expect(result.recommendedProductIds).toContain("RR_BASE");
    expect(result.outOfPhase).toBe(false);
  });

  it("clasifica pintor o electricista por obras como nivel 2", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      profession: "Pintor",
      workModel: "trades_jobs",
      worksByJobs: true,
      hasPayrollEmployees: false,
      isInModulesRegime: false,
      hasStockOrCommerce: false,
    });

    expect(result.level).toBe(2);
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
    expect(result.outOfPhase).toBe(false);
  });

  it("clasifica profesional por horas con retencion como nivel 3", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      profession: "Consultor",
      worksByHours: true,
      hasProfessionalWithholding: true,
      hasPayrollEmployees: false,
      isInModulesRegime: false,
      hasStockOrCommerce: false,
    });

    expect(result.level).toBe(3);
    expect(result.recommendedProductIds).toContain("RR_HOURS_PROJECTS");
    expect(result.outOfPhase).toBe(false);
  });

  it("clasifica autonomo con vehiculo, local o herramientas como nivel 4", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      hasWorkVehicle: true,
      hasRelevantToolsOrEquipment: true,
      hasPayrollEmployees: false,
      isInModulesRegime: false,
      hasStockOrCommerce: false,
    });

    expect(result.level).toBe(4);
    expect(result.recommendedProductIds).toContain("RR_ASSETS_LIGHT");
    expect(result.outOfPhase).toBe(false);
  });

  it("deja S.L. fuera de fase y la manda a nivel 7", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "sl",
      hasPayrollEmployees: false,
      isInModulesRegime: false,
      hasStockOrCommerce: false,
    });

    expect(result.outOfPhase).toBe(true);
    expect(result.futureLevel).toBe(7);
    expect(result.unavailableProductIds).toContain("RR_SIMPLE_SL");
  });

  it("deja modulos fuera de fase y los manda a nivel 6", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      isInModulesRegime: true,
      hasPayrollEmployees: false,
      hasStockOrCommerce: false,
    });

    expect(result.outOfPhase).toBe(true);
    expect(result.futureLevel).toBe(6);
    expect(result.unavailableProductIds).toContain(
      "RR_MODULES_SPECIAL_REGIMES",
    );
  });

  it("deja stock y comercio fuera de fase y los manda a nivel 5", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      hasStockOrCommerce: true,
      hasPayrollEmployees: false,
      isInModulesRegime: false,
    });

    expect(result.outOfPhase).toBe(true);
    expect(result.futureLevel).toBe(5);
    expect(result.unavailableProductIds).toContain("RR_STOCK_COMMERCE");
  });

  it("deja empleados fuera de fase y los manda a nivel 8", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      hasPayrollEmployees: true,
      isInModulesRegime: false,
      hasStockOrCommerce: false,
    });

    expect(result.outOfPhase).toBe(true);
    expect(result.futureLevel).toBe(8);
    expect(result.unavailableProductIds).toContain(
      "RR_SL_EMPLOYEES_PARTNERS",
    );
  });
});
