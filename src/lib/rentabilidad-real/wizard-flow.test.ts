import { describe, expect, it } from "vitest";
import {
  buildRentabilidadRealWizardAnswersFromForm,
  scoreRentabilidadRealWizardForm,
} from "./wizard-flow";

describe("rentabilidad real wizard scoring integration", () => {
  it("multi cobro horas + obras recomienda ambos modos", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["closed_jobs", "hours"],
      materialStockModes: ["none"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
      analysisInterests: ["jobs", "real_hours"],
    });

    expect(result.level).toBe(3);
    expect(result.primaryProfile).toBe("mixed");
    expect(result.recommendedCalculationModes).toEqual([
      "RR_TRADES_JOBS",
      "RR_HOURS_PROJECTS",
    ]);
  });

  it("instalacion con materiales recomienda obras sin ir a stock", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["installation_materials"],
      materialStockModes: ["install_products_for_job"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(false);
    expect(result.recommendedCalculationModes).toEqual(["RR_TRADES_JOBS"]);
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
  });

  it("precio cerrado por proyecto recomienda horas/proyectos", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["closed_projects"],
      materialStockModes: ["none"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(false);
    expect(result.primaryProfile).toBe("hours_projects");
    expect(result.recommendedProductIds).toContain("RR_HOURS_PROJECTS");
  });

  it("trabajos + horas + precio minimo recomienda ambos modos y simulador", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["closed_jobs", "hours"],
      materialStockModes: ["job_materials"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
      analysisInterests: ["jobs", "real_hours", "minimum_price"],
    });

    expect(result.recommendedProductIds).toEqual(
      expect.arrayContaining([
        "RR_TRADES_JOBS",
        "RR_HOURS_PROJECTS",
        "RR_PRICE_SIMULATOR",
      ]),
    );
  });

  it("facturas o presupuestos concretos no fuerza perfil raro", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["labor_only"],
      materialStockModes: ["none"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
      analysisInterests: ["documents"],
    });

    expect(result.outOfPhase).toBe(false);
    expect(result.primaryProfile).toBe("basic");
  });

  it("escenario 1 autonomo simple con documento concreto queda en nivel 1", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["visits_services", "labor_only"],
      materialStockModes: ["none"],
      workVehicleTypes: ["none"],
      hasPayrollEmployees: "no",
      hasPremises: "no",
      hasRelevantToolsOrEquipment: "no",
      isInModulesRegime: "no",
      appliesNormalVat: "yes",
      hasProfessionalWithholding: "no",
      analysisInterests: ["documents", "minimum_price"],
    });

    expect(result.level).toBe(1);
    expect(result.primaryProfile).toBe("basic");
    expect(result.recommendedCalculationModes).toEqual([]);
    expect(result.recommendedProductIds).toContain("RR_BASE");
    expect(result.recommendedProductIds).toContain("RR_PRICE_SIMULATOR");
  });

  it("visitas o servicios sin costes operativos quedan en perfil simple", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["visits_services"],
      materialStockModes: ["none"],
      workVehicleTypes: ["none"],
      hasPayrollEmployees: "no",
      hasPremises: "no",
      hasRelevantToolsOrEquipment: "no",
      isInModulesRegime: "no",
      analysisInterests: ["services_visits"],
    });

    expect(result.level).toBe(1);
    expect(result.primaryProfile).toBe("basic");
    expect(result.recommendedCalculationModes).toEqual([]);
  });

  it("visitas o servicios con vehiculo recomiendan obras y estructura ligera", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["visits_services"],
      materialStockModes: ["none"],
      workVehicleTypes: ["dedicated_van"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.level).toBe(4);
    expect(result.primaryProfile).toBe("trades_jobs");
    expect(result.recommendedCalculationModes).toEqual(["RR_TRADES_JOBS"]);
    expect(result.recommendedProductIds).toContain("RR_ASSETS_LIGHT");
  });

  it("clientes e informes no rompen scoring", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["monthly_retainer"],
      materialStockModes: ["none"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
      analysisInterests: ["clients"],
    });

    expect(result.outOfPhase).toBe(false);
    expect(result.recommendedProductIds).toContain("RR_HOURS_PROJECTS");
  });

  it("materiales para trabajo no van a futureLevel 5", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["closed_jobs"],
      materialStockModes: ["job_materials"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(false);
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
  });

  it("producto aportado por cliente no va a futureLevel 5", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["visits_services"],
      materialStockModes: ["customer_products"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(false);
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
  });

  it("producto comprado para instalar no va a futureLevel 5", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["installation_materials"],
      materialStockModes: ["install_products_for_job"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(false);
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
  });

  it("material habitual sin inventario no va a futureLevel 5", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["closed_jobs"],
      materialStockModes: ["habitual_material_no_inventory"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(false);
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
  });

  it.each([
    ["stock propio", "stock_inventory"],
    ["tienda fisica", "physical_store"],
    ["e-commerce", "ecommerce"],
  ] as const)("%s va a futureLevel 5", (_label, materialMode) => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["closed_jobs"],
      materialStockModes: [materialMode],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(true);
    expect(result.futureLevel).toBe(5);
    expect(result.unavailableProductIds).toContain("RR_STOCK_COMMERCE");
  });

  it("coche particular y moto pueden coexistir sin prometer fiscalidad", () => {
    const answers = buildRentabilidadRealWizardAnswersFromForm({
      legalForm: "individual",
      chargeModels: ["hours"],
      materialStockModes: ["none"],
      workVehicleTypes: ["private_car", "private_motorbike"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(answers.workVehicleUses).toEqual([
      "private_car",
      "private_motorbike",
    ]);
    expect(answers.usesPrivateVehicleForWork).toBe(true);
  });

  it("furgoneta y coche pueden coexistir", () => {
    const answers = buildRentabilidadRealWizardAnswersFromForm({
      legalForm: "individual",
      chargeModels: ["closed_jobs"],
      materialStockModes: ["none"],
      workVehicleTypes: ["dedicated_van", "private_car"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(answers.workVehicleUses).toEqual(["dedicated_van", "private_car"]);
  });

  it("sin vehiculo excluye otros si llega normalizado desde UI", () => {
    const answers = buildRentabilidadRealWizardAnswersFromForm({
      legalForm: "individual",
      chargeModels: ["hours"],
      materialStockModes: ["none"],
      workVehicleTypes: ["none"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(answers.hasWorkVehicle).toBe(false);
    expect(answers.workVehicleUses).toEqual([]);
  });

  it("cualquier vehiculo recomienda RR_ASSETS_LIGHT sin tapar obras", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["closed_jobs"],
      materialStockModes: ["none"],
      workVehicleTypes: ["private_car", "private_motorbike"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.level).toBe(4);
    expect(result.primaryProfile).toBe("trades_jobs");
    expect(result.recommendedProductIds).toContain("RR_TRADES_JOBS");
    expect(result.recommendedProductIds).toContain("RR_ASSETS_LIGHT");
  });

  it("vehiculo no tapa horas/proyectos", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["hours"],
      materialStockModes: ["none"],
      workVehicleTypes: ["renting_leasing"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.level).toBe(4);
    expect(result.primaryProfile).toBe("hours_projects");
    expect(result.recommendedProductIds).toContain("RR_HOURS_PROJECTS");
    expect(result.recommendedProductIds).toContain("RR_ASSETS_LIGHT");
  });

  it("normaliza respuestas antiguas single-value", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModel: "mixed",
      hasPayrollEmployees: "no",
      hasStockOrCommerce: "no",
      isInModulesRegime: "no",
      profitUnit: "invoice",
    });

    expect(result.outOfPhase).toBe(false);
    expect(result.recommendedCalculationModes).toEqual([
      "RR_TRADES_JOBS",
      "RR_HOURS_PROJECTS",
    ]);
  });

  it("manda módulos a fase futura nivel 6", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["closed_jobs"],
      materialStockModes: ["none"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "yes",
    });

    expect(result.outOfPhase).toBe(true);
    expect(result.futureLevel).toBe(6);
  });

  it("manda S.L. a fase futura nivel 7", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "sl",
      chargeModels: ["closed_jobs"],
      materialStockModes: ["none"],
      hasPayrollEmployees: "no",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(true);
    expect(result.futureLevel).toBe(7);
  });

  it("manda empleados a fase futura nivel 8", () => {
    const result = scoreRentabilidadRealWizardForm({
      legalForm: "individual",
      chargeModels: ["closed_jobs"],
      materialStockModes: ["none"],
      hasPayrollEmployees: "yes",
      isInModulesRegime: "no",
    });

    expect(result.outOfPhase).toBe(true);
    expect(result.futureLevel).toBe(8);
  });
});
