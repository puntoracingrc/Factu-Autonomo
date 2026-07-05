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
    expect(result.recommendedProductIds).toContain("RR_BASE");
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
    expect(result.recommendedProductIds).toContain("RR_FIXED_COSTS_PRO");
    expect(result.recommendedProductIds).toContain("RR_PRICE_SIMULATOR");
    expect(result.recommendedCalculationModes).toEqual(["RR_TRADES_JOBS"]);
    expect(result.recommendedAddons).toEqual([
      "RR_FIXED_COSTS_PRO",
      "RR_PRICE_SIMULATOR",
    ]);
    expect(result.primaryProfile).toBe("trades_jobs");
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
    expect(result.recommendedProductIds).toContain("RR_BASE");
    expect(result.recommendedProductIds).toContain("RR_HOURS_PROJECTS");
    expect(result.recommendedProductIds).toContain("RR_PRICE_SIMULATOR");
    expect(result.recommendedCalculationModes).toEqual(["RR_HOURS_PROJECTS"]);
    expect(result.primaryProfile).toBe("hours_projects");
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
    expect(result.recommendedProductIds).toContain("RR_BASE");
    expect(result.recommendedProductIds).toContain("RR_ASSETS_LIGHT");
    expect(result.recommendedAddons).toContain("RR_ASSETS_LIGHT");
    expect(result.primaryProfile).toBe("light_structure");
    expect(result.outOfPhase).toBe(false);
  });

  it("recomienda ambos modos para autonomo mixto de obras y horas", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      workModel: "mixed",
      hasPayrollEmployees: false,
      isInModulesRegime: false,
      hasStockOrCommerce: false,
    });

    expect(result.level).toBe(3);
    expect(result.primaryProfile).toBe("mixed");
    expect(result.recommendedCalculationModes).toEqual([
      "RR_TRADES_JOBS",
      "RR_HOURS_PROJECTS",
    ]);
    expect(result.recommendedProductIds).toEqual(
      expect.arrayContaining([
        "RR_BASE",
        "RR_TRADES_JOBS",
        "RR_HOURS_PROJECTS",
      ]),
    );
  });

  it("acepta arrays de cobro y recomienda obras + horas sin usar Mixto", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      chargeModels: ["closed_jobs", "hours"],
      materialStockModes: ["none"],
      hasPayrollEmployees: false,
      isInModulesRegime: false,
    });

    expect(result.level).toBe(3);
    expect(result.primaryProfile).toBe("mixed");
    expect(result.recommendedCalculationModes).toEqual([
      "RR_TRADES_JOBS",
      "RR_HOURS_PROJECTS",
    ]);
  });

  it("precio minimo recomienda simulador sin forzar perfil", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      chargeModels: ["labor_only"],
      materialStockModes: ["none"],
      analysisInterests: ["documents", "minimum_price"],
      hasPayrollEmployees: false,
      isInModulesRegime: false,
    });

    expect(result.outOfPhase).toBe(false);
    expect(result.primaryProfile).toBe("basic");
    expect(result.recommendedProductIds).toContain("RR_PRICE_SIMULATOR");
  });

  it("nivel 4 con vehiculo y obras mantiene el modo de obras", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      workModel: "trades_jobs",
      worksByJobs: true,
      hasWorkVehicle: true,
      hasPayrollEmployees: false,
      isInModulesRegime: false,
      hasStockOrCommerce: false,
    });

    expect(result.level).toBe(4);
    expect(result.primaryProfile).toBe("trades_jobs");
    expect(result.recommendedCalculationModes).toContain("RR_TRADES_JOBS");
    expect(result.recommendedAddons).toContain("RR_ASSETS_LIGHT");
  });

  it("nivel 4 con vehiculo y horas mantiene el modo de horas", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      workModel: "hours_projects",
      worksByHours: true,
      hasWorkVehicle: true,
      hasPayrollEmployees: false,
      isInModulesRegime: false,
      hasStockOrCommerce: false,
    });

    expect(result.level).toBe(4);
    expect(result.primaryProfile).toBe("hours_projects");
    expect(result.recommendedCalculationModes).toContain("RR_HOURS_PROJECTS");
    expect(result.recommendedAddons).toContain("RR_ASSETS_LIGHT");
  });

  it("nivel 4 mixto con vehiculo mantiene obras y horas", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      workModel: "mixed",
      hasWorkVehicle: true,
      hasRelevantToolsOrEquipment: true,
      hasPayrollEmployees: false,
      isInModulesRegime: false,
      hasStockOrCommerce: false,
    });

    expect(result.level).toBe(4);
    expect(result.primaryProfile).toBe("mixed");
    expect(result.recommendedCalculationModes).toEqual([
      "RR_TRADES_JOBS",
      "RR_HOURS_PROJECTS",
    ]);
    expect(result.recommendedAddons).toContain("RR_ASSETS_LIGHT");
  });

  it("materiales para un trabajo concreto no mandan a fase futura", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      workModel: "trades_jobs",
      hasMaterials: true,
      hasPayrollEmployees: false,
      isInModulesRegime: false,
      hasStockOrCommerce: false,
      sellsProductsWithStock: false,
    });

    expect(result.outOfPhase).toBe(false);
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
  });

  it.each([
    "job_materials",
    "customer_products",
    "install_products_for_job",
    "habitual_material_no_inventory",
  ] as const)("material/producto %s no manda a stock futuro", (mode) => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      chargeModels: ["installation_materials"],
      materialStockModes: [mode],
      hasPayrollEmployees: false,
      isInModulesRegime: false,
    });

    expect(result.outOfPhase).toBe(false);
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
    expect(result.recommendedProductIds).not.toContain("RR_STOCK_COMMERCE");
  });

  it.each([
    "stock_inventory",
    "physical_store",
    "ecommerce",
  ] as const)("stock/comercio %s va a futureLevel 5", (mode) => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      chargeModels: ["closed_jobs"],
      materialStockModes: [mode],
      hasPayrollEmployees: false,
      isInModulesRegime: false,
    });

    expect(result.outOfPhase).toBe(true);
    expect(result.futureLevel).toBe(5);
    expect(result.unavailableProductIds).toContain("RR_STOCK_COMMERCE");
  });

  it("vehiculos multiples recomiendan assets sin tapar el modo real", () => {
    const result = scoreRentabilidadRealProfile({
      legalForm: "individual",
      chargeModels: ["hours"],
      materialStockModes: ["none"],
      workVehicleUses: ["private_car", "private_motorbike"],
      hasPayrollEmployees: false,
      isInModulesRegime: false,
    });

    expect(result.level).toBe(4);
    expect(result.primaryProfile).toBe("hours_projects");
    expect(result.recommendedProductIds).toContain("RR_HOURS_PROJECTS");
    expect(result.recommendedProductIds).toContain("RR_ASSETS_LIGHT");
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
