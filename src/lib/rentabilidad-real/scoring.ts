import type {
  RentabilidadRealAnalysisInterest,
  RentabilidadRealAddonProductId,
  RentabilidadRealChargeModel,
  RentabilidadRealCalculationModeProductId,
  RentabilidadRealFutureReason,
  RentabilidadRealLevel,
  RentabilidadRealMaterialStockMode,
  RentabilidadRealPrimaryProfile,
  RentabilidadRealProductId,
  RentabilidadRealProfileLabel,
  RentabilidadRealVehicleUse,
  RentabilidadRealScoringResult,
  RentabilidadRealWizardAnswers,
} from "./types";

const TRADE_KEYWORDS = [
  "pintor",
  "electricista",
  "fontanero",
  "cerrajero",
  "instalador",
  "reparador",
  "tecnico",
  "taller",
];

const HOURS_PROJECTS_KEYWORDS = [
  "disenador",
  "diseñador",
  "programador",
  "consultor",
  "abogado",
  "arquitecto",
  "marketing",
  "copywriter",
  "freelance",
];

function includesAnyKeyword(value: string | undefined, keywords: readonly string[]) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return keywords.some((keyword) => normalized.includes(keyword));
}

function unique<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

function arrayFromUnknown<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return unique(
    values.filter((item): item is T =>
      typeof item === "string" && allowed.includes(item as T),
    ),
  );
}

const CHARGE_MODE_VALUES = [
  "hours",
  "closed_jobs",
  "closed_projects",
  "visits_services",
  "monthly_retainer",
  "installation_materials",
  "labor_only",
] as const satisfies readonly RentabilidadRealChargeModel[];

const MATERIAL_STOCK_VALUES = [
  "none",
  "job_materials",
  "customer_products",
  "install_products_for_job",
  "habitual_material_no_inventory",
  "stock_inventory",
  "physical_store",
  "ecommerce",
] as const satisfies readonly RentabilidadRealMaterialStockMode[];

const VEHICLE_VALUES = [
  "dedicated_van",
  "private_car",
  "private_motorbike",
  "renting_leasing",
  "industrial_truck",
  "taxi_vtc_transport",
] as const satisfies readonly RentabilidadRealVehicleUse[];

const ANALYSIS_VALUES = [
  "jobs",
  "real_hours",
  "projects",
  "clients",
  "documents",
  "services_visits",
  "minimum_price",
] as const satisfies readonly RentabilidadRealAnalysisInterest[];

function normalizedChargeModelsFromLegacy(
  answers: RentabilidadRealWizardAnswers,
): RentabilidadRealChargeModel[] {
  const chargeModels = arrayFromUnknown(
    answers.chargeModels,
    CHARGE_MODE_VALUES,
  );
  if (answers.workModel === "mixed") {
    chargeModels.push("closed_jobs", "hours");
  }
  if (answers.workModel === "trades_jobs") chargeModels.push("closed_jobs");
  if (answers.workModel === "hours_projects") chargeModels.push("hours");
  if (answers.worksByHours) chargeModels.push("hours");
  if (answers.worksByProjects) chargeModels.push("closed_projects");
  if (answers.hasMonthlyRetainers) chargeModels.push("monthly_retainer");
  if (answers.worksByJobs) chargeModels.push("closed_jobs");
  if (answers.worksWithClosedServices) chargeModels.push("visits_services");
  if (
    answers.doesRepairsInstallationsOrTrades ||
    answers.hasMaterials
  ) {
    chargeModels.push("installation_materials");
  }
  return unique(chargeModels);
}

function normalizedMaterialStockModesFromLegacy(
  answers: RentabilidadRealWizardAnswers,
): RentabilidadRealMaterialStockMode[] {
  const modes = arrayFromUnknown(
    answers.materialStockModes,
    MATERIAL_STOCK_VALUES,
  );
  if (answers.hasMaterials) modes.push("job_materials");
  if (answers.hasStockOrCommerce || answers.sellsProductsWithStock) {
    modes.push("stock_inventory");
  }
  if (answers.workModel === "commerce_stock") modes.push("stock_inventory");
  return unique(modes.includes("none") && modes.length > 1 ? modes.filter((mode) => mode !== "none") : modes);
}

function normalizedVehicleUsesFromLegacy(
  answers: RentabilidadRealWizardAnswers,
): RentabilidadRealVehicleUse[] {
  const uses = arrayFromUnknown(answers.workVehicleUses, VEHICLE_VALUES);
  if (answers.workVehicleUse) uses.push(answers.workVehicleUse);
  return unique(uses);
}

function normalizedAnalysisInterestsFromLegacy(
  answers: RentabilidadRealWizardAnswers,
): RentabilidadRealAnalysisInterest[] {
  const interests = arrayFromUnknown(
    answers.analysisInterests,
    ANALYSIS_VALUES,
  );
  if (answers.worksByJobs) interests.push("jobs");
  if (answers.worksByHours) interests.push("real_hours");
  if (answers.worksByProjects) interests.push("projects");
  if (answers.hasRecurringClients) interests.push("clients");
  if (answers.worksWithClosedServices) interests.push("services_visits");
  if (answers.wantsMinimumPrice) interests.push("minimum_price");
  return unique(interests);
}

export function normalizeRentabilidadRealWizardAnswers(
  answers: RentabilidadRealWizardAnswers,
): RentabilidadRealWizardAnswers {
  const chargeModels = normalizedChargeModelsFromLegacy(answers);
  const materialStockModes = normalizedMaterialStockModesFromLegacy(answers);
  const workVehicleUses = normalizedVehicleUsesFromLegacy(answers);
  const analysisInterests = normalizedAnalysisInterestsFromLegacy(answers);
  const hasStockOrCommerce = Boolean(
    answers.hasStockOrCommerce ||
      answers.sellsProductsWithStock ||
      materialStockModes.some((mode) =>
        ["stock_inventory", "physical_store", "ecommerce"].includes(mode),
      ),
  );

  return {
    ...answers,
    chargeModels,
    materialStockModes,
    workVehicleUses,
    analysisInterests,
    hasStockOrCommerce,
    sellsProductsWithStock: hasStockOrCommerce || answers.sellsProductsWithStock,
    hasWorkVehicle: answers.hasWorkVehicle ?? workVehicleUses.length > 0,
    workVehicleUse: answers.workVehicleUse ?? workVehicleUses[0],
    usesPrivateVehicleForWork:
      answers.usesPrivateVehicleForWork ??
      workVehicleUses.some((use) =>
        ["private_car", "private_motorbike"].includes(use),
      ),
    hasMaterials:
      answers.hasMaterials ??
      materialStockModes.some((mode) =>
        [
          "job_materials",
          "customer_products",
          "install_products_for_job",
          "habitual_material_no_inventory",
        ].includes(mode),
      ),
    wantsMinimumPrice:
      answers.wantsMinimumPrice ??
      analysisInterests.includes("minimum_price"),
  };
}

function pendingQuestionsFor(
  answers: RentabilidadRealWizardAnswers,
): string[] {
  const pending: string[] = [];
  if (!answers.legalForm && typeof answers.isLimitedCompany !== "boolean") {
    pending.push("Forma juridica");
  }
  if (typeof answers.hasPayrollEmployees !== "boolean") {
    pending.push("Empleados en nómina");
  }
  if (typeof answers.isInModulesRegime !== "boolean") {
    pending.push("Régimen de módulos");
  }
  if (
    typeof answers.hasStockOrCommerce !== "boolean" &&
    typeof answers.sellsProductsWithStock !== "boolean" &&
    !answers.materialStockModes?.length
  ) {
    pending.push("Stock o comercio");
  }
  return pending;
}

function futureReason(
  reason: RentabilidadRealFutureReason,
): RentabilidadRealFutureReason {
  return reason;
}

function uniqueProductIds(
  productIds: readonly RentabilidadRealProductId[],
): RentabilidadRealProductId[] {
  return Array.from(new Set(productIds));
}

function recommendedProductsFor(
  calculationModes: readonly RentabilidadRealCalculationModeProductId[],
  addons: readonly RentabilidadRealAddonProductId[],
): RentabilidadRealProductId[] {
  return uniqueProductIds(["RR_BASE", ...calculationModes, ...addons]);
}

function profileLabelForModes({
  hasLightStructure,
  isTradesOrJobs,
  isHoursOrProjects,
}: {
  hasLightStructure: boolean;
  isTradesOrJobs: boolean;
  isHoursOrProjects: boolean;
}): RentabilidadRealProfileLabel {
  if (isTradesOrJobs && isHoursOrProjects) {
    return "Autónomo mixto por obras y horas";
  }
  if (isHoursOrProjects) return "Profesional por horas y proyectos";
  if (isTradesOrJobs) return "Autónomo por obras y oficios";
  if (hasLightStructure) return "Autónomo con estructura ligera";
  return "Autónomo básico";
}

function primaryProfileForModes({
  hasLightStructure,
  isTradesOrJobs,
  isHoursOrProjects,
}: {
  hasLightStructure: boolean;
  isTradesOrJobs: boolean;
  isHoursOrProjects: boolean;
}): RentabilidadRealPrimaryProfile {
  if (isTradesOrJobs && isHoursOrProjects) return "mixed";
  if (isTradesOrJobs) return "trades_jobs";
  if (isHoursOrProjects) return "hours_projects";
  if (hasLightStructure) return "light_structure";
  return "basic";
}

function scoreForLevel(level: RentabilidadRealLevel): number {
  if (level === 4) return 85;
  if (level === 3) return 70;
  if (level === 2) return 55;
  return 35;
}

function outOfPhaseResult(params: {
  futureLevel: RentabilidadRealLevel;
  primaryProfile: RentabilidadRealPrimaryProfile;
  profileLabel: RentabilidadRealProfileLabel;
  explanation: string;
  productId: RentabilidadRealProductId;
  reason: RentabilidadRealFutureReason;
  pendingQuestions: readonly string[];
}): RentabilidadRealScoringResult {
  return {
    level: params.futureLevel,
    score: params.futureLevel * 10,
    primaryProfile: params.primaryProfile,
    profileLabel: params.profileLabel,
    explanation: params.explanation,
    recommendedProductIds: [params.productId],
    recommendedCalculationModes: [],
    recommendedAddons: [],
    optionalProductIds: [],
    unavailableProductIds: [params.productId],
    pendingQuestions: params.pendingQuestions,
    outOfPhase: true,
    futureLevel: params.futureLevel,
    futureReasons: [params.reason],
    outOfPhaseReasons: [params.reason],
  };
}

function baseResult(params: {
  level: RentabilidadRealLevel;
  score: number;
  primaryProfile: RentabilidadRealPrimaryProfile;
  profileLabel: RentabilidadRealProfileLabel;
  explanation: string;
  recommendedCalculationModes: readonly RentabilidadRealCalculationModeProductId[];
  recommendedAddons: readonly RentabilidadRealAddonProductId[];
  optionalProductIds: readonly RentabilidadRealProductId[];
  pendingQuestions: readonly string[];
}): RentabilidadRealScoringResult {
  return {
    level: params.level,
    score: params.score,
    primaryProfile: params.primaryProfile,
    profileLabel: params.profileLabel,
    explanation: params.explanation,
    recommendedProductIds: recommendedProductsFor(
      params.recommendedCalculationModes,
      params.recommendedAddons,
    ),
    recommendedCalculationModes: params.recommendedCalculationModes,
    recommendedAddons: params.recommendedAddons,
    optionalProductIds: params.optionalProductIds,
    unavailableProductIds: [],
    pendingQuestions: params.pendingQuestions,
    outOfPhase: false,
    futureReasons: [],
    outOfPhaseReasons: [],
  };
}

export function scoreRentabilidadRealProfile(
  rawAnswers: RentabilidadRealWizardAnswers,
): RentabilidadRealScoringResult {
  const answers = normalizeRentabilidadRealWizardAnswers(rawAnswers);
  const pendingQuestions = pendingQuestionsFor(answers);
  const isLimitedCompany =
    answers.isLimitedCompany === true ||
    answers.legalForm === "sl" ||
    answers.legalForm === "slu";

  if (isLimitedCompany) {
    return outOfPhaseResult({
      futureLevel: 7,
      primaryProfile: "simple_sl",
      profileLabel: "S.L. simple",
      explanation:
        "Tu caso parece una S.L. o S.L.U.; esta primera fase se centra en autónomos persona física.",
      productId: "RR_SIMPLE_SL",
      pendingQuestions,
      reason: futureReason({
        code: "limited_company",
        label: "S.L. o S.L.U.",
        description:
          "Las sociedades necesitan separar costes y beneficio de sociedad antes de usar Rentabilidad Real.",
        futureLevel: 7,
        productId: "RR_SIMPLE_SL",
      }),
    });
  }

  if (answers.hasPayrollEmployees) {
    return outOfPhaseResult({
      futureLevel: 8,
      primaryProfile: "sl_employees_partners",
      profileLabel: "S.L. con empleados y socios",
      explanation:
        "Tener empleados en nómina cambia el coste real y queda fuera de la primera fase.",
      productId: "RR_SL_EMPLOYEES_PARTNERS",
      pendingQuestions,
      reason: futureReason({
        code: "payroll_employees",
        label: "Empleados en nómina",
        description:
          "Los costes laborales requieren un módulo futuro con nóminas y estructura de equipo.",
        futureLevel: 8,
        productId: "RR_SL_EMPLOYEES_PARTNERS",
      }),
    });
  }

  if (answers.isInModulesRegime) {
    return outOfPhaseResult({
      futureLevel: 6,
      primaryProfile: "modules_special_regimes",
      profileLabel: "Módulos y regímenes especiales",
      explanation:
        "El régimen de módulos necesita reglas propias y se tratará como producto futuro.",
      productId: "RR_MODULES_SPECIAL_REGIMES",
      pendingQuestions,
      reason: futureReason({
        code: "modules_regime",
        label: "Régimen de módulos",
        description:
          "La fase inicial solo cubre autónomos en estimación directa simple.",
        futureLevel: 6,
        productId: "RR_MODULES_SPECIAL_REGIMES",
      }),
    });
  }

  const hasStockCommerceFuture = Boolean(
    answers.hasStockOrCommerce ||
      answers.sellsProductsWithStock ||
      answers.materialStockModes?.some((mode) =>
        ["stock_inventory", "physical_store", "ecommerce"].includes(mode),
      ),
  );

  if (hasStockCommerceFuture) {
    return outOfPhaseResult({
      futureLevel: 5,
      primaryProfile: "stock_commerce",
      profileLabel: "Stock y comercio",
      explanation:
        "El comercio con stock requiere margen por producto e inventario, previsto para una fase posterior.",
      productId: "RR_STOCK_COMMERCE",
      pendingQuestions,
      reason: futureReason({
        code: "stock_or_commerce",
        label: "Stock o comercio",
        description:
          "Los negocios con stock necesitan controlar compras, rotación y margen por artículo.",
        futureLevel: 5,
        productId: "RR_STOCK_COMMERCE",
      }),
    });
  }

  if (
    answers.advancedCompanyCase ||
    answers.hasMultipleCompanies ||
    answers.hasInternationalOperations ||
    answers.hasRegionalTaxRegime ||
    answers.legalForm === "other_company" ||
    answers.workModel === "advanced"
  ) {
    return outOfPhaseResult({
      futureLevel: 10,
      primaryProfile: "advanced_company",
      profileLabel: "Empresa avanzada",
      explanation:
        "Tu caso tiene una complejidad superior a la primera fase y se reservará para niveles avanzados.",
      productId: "RR_ADVANCED_COMPANY",
      pendingQuestions,
      reason: futureReason({
        code: "advanced_company",
        label: "Empresa avanzada",
        description:
          "Multiempresa, territorios especiales u operaciones avanzadas requieren una fase específica.",
        futureLevel: 10,
        productId: "RR_ADVANCED_COMPANY",
      }),
    });
  }

  const hasLightStructure = Boolean(
    answers.hasRelevantPremises ||
      answers.hasOffice ||
      answers.hasWorkshop ||
      answers.hasWorkVehicle ||
      answers.workVehicleUses?.length ||
      answers.hasRelevantToolsOrEquipment ||
      answers.hasLightMachinery ||
      answers.hasSignificantFixedCosts,
  );

  const chargeModels = answers.chargeModels ?? [];
  const analysisInterests = answers.analysisInterests ?? [];
  const materialStockModes = answers.materialStockModes ?? [];
  const safeMaterialModes = materialStockModes.filter((mode) =>
    [
      "job_materials",
      "customer_products",
      "install_products_for_job",
      "habitual_material_no_inventory",
    ].includes(mode),
  );
  const isHoursOrProjects = Boolean(
    answers.workModel === "mixed" ||
      answers.workModel === "hours_projects" ||
      chargeModels.some((mode) =>
        ["hours", "closed_projects", "monthly_retainer"].includes(mode),
      ) ||
      analysisInterests.some((interest) =>
        ["real_hours", "projects"].includes(interest),
      ) ||
      answers.worksByHours ||
      answers.worksByProjects ||
      answers.hasMonthlyRetainers ||
      answers.hasRecurringClients ||
      answers.hasProfessionalWithholding ||
      includesAnyKeyword(answers.profession, HOURS_PROJECTS_KEYWORDS),
  );

  const hasClosedJobSignal = Boolean(
    answers.workModel === "mixed" ||
      answers.workModel === "trades_jobs" ||
      chargeModels.some((mode) =>
        ["closed_jobs", "installation_materials"].includes(mode),
      ) ||
      analysisInterests.includes("jobs") ||
      answers.worksByJobs,
  );
  const hasOperationalServiceSignal = Boolean(
    hasClosedJobSignal ||
      hasLightStructure ||
      safeMaterialModes.length > 0 ||
      answers.doesRepairsInstallationsOrTrades ||
      answers.hasMaterials ||
      answers.hasTravelCosts ||
      answers.hasOccasionalSubcontracting ||
      includesAnyKeyword(answers.profession, TRADE_KEYWORDS),
  );
  const hasVisitsOrServicesSignal = Boolean(
    chargeModels.includes("visits_services") ||
      analysisInterests.includes("services_visits") ||
      answers.worksWithClosedServices,
  );
  const isTradesOrJobs = Boolean(
    hasClosedJobSignal ||
      (hasVisitsOrServicesSignal && hasOperationalServiceSignal) ||
      safeMaterialModes.length > 0 ||
      answers.doesRepairsInstallationsOrTrades ||
      answers.hasMaterials ||
      answers.hasTravelCosts ||
      answers.hasOccasionalSubcontracting ||
      includesAnyKeyword(answers.profession, TRADE_KEYWORDS),
  );

  const recommendedCalculationModes: RentabilidadRealCalculationModeProductId[] =
    [];
  if (isTradesOrJobs) recommendedCalculationModes.push("RR_TRADES_JOBS");
  if (isHoursOrProjects) recommendedCalculationModes.push("RR_HOURS_PROJECTS");

  const hasFixedCostsSignal = Boolean(
    hasLightStructure ||
      answers.hasSignificantFixedCosts ||
      answers.hasRelevantPremises ||
      answers.hasOffice ||
      answers.hasWorkshop ||
      answers.hasMonthlyRetainers ||
      answers.hasRecurringClients ||
      answers.hasTravelCosts ||
      answers.hasOccasionalSubcontracting,
  );
  const recommendedAddons: RentabilidadRealAddonProductId[] = [];
  if (isTradesOrJobs || hasFixedCostsSignal) {
    recommendedAddons.push("RR_FIXED_COSTS_PRO");
  }
  if (hasLightStructure) recommendedAddons.push("RR_ASSETS_LIGHT");
  if (
    isTradesOrJobs ||
    isHoursOrProjects ||
    hasLightStructure ||
    answers.wantsMinimumPrice ||
    analysisInterests.includes("minimum_price")
  ) {
    recommendedAddons.push("RR_PRICE_SIMULATOR");
  }

  const level: RentabilidadRealLevel = hasLightStructure
    ? 4
    : isHoursOrProjects
      ? 3
      : isTradesOrJobs
        ? 2
        : 1;
  const primaryProfile = primaryProfileForModes({
    hasLightStructure,
    isTradesOrJobs,
    isHoursOrProjects,
  });
  const recommendedProductIds = recommendedProductsFor(
    recommendedCalculationModes,
    recommendedAddons,
  );
  const optionalProductIds = uniqueProductIds([
    ...(recommendedAddons.includes("RR_FIXED_COSTS_PRO")
      ? []
      : (["RR_FIXED_COSTS_PRO"] as const)),
    ...(recommendedAddons.includes("RR_PRICE_SIMULATOR")
      ? []
      : (["RR_PRICE_SIMULATOR"] as const)),
    "RR_ADVISOR_REVIEW",
  ]).filter(
    (productId) => !recommendedProductIds.includes(productId),
  ) as RentabilidadRealProductId[];

  if (level > 1) {
    return baseResult({
      level,
      score: scoreForLevel(level),
      primaryProfile,
      profileLabel: profileLabelForModes({
        hasLightStructure,
        isTradesOrJobs,
        isHoursOrProjects,
      }),
      explanation: isTradesOrJobs && isHoursOrProjects
          ? "Combinas trabajos cerrados con horas, proyectos o clientes recurrentes, así que conviene activar ambos modos de cálculo."
          : isHoursOrProjects
            ? "Tu rentabilidad depende de horas facturables, proyectos, clientes recurrentes o retenciones profesionales."
            : isTradesOrJobs
              ? "Tu perfil encaja con trabajos cerrados, obras, reparaciones o servicios con costes variables sencillos."
              : "Tu perfil sigue siendo de autónomo persona física con estructura ligera que conviene tener en cuenta para la rentabilidad interna.",
      recommendedCalculationModes,
      recommendedAddons,
      optionalProductIds,
      pendingQuestions,
    });
  }

  return baseResult({
    level: 1,
    score: 35,
    primaryProfile: "basic",
    profileLabel: "Autónomo básico",
    explanation:
      "Tu caso encaja con un autónomo simple que necesita saber beneficio por factura o trabajo sencillo.",
    recommendedCalculationModes: [],
    recommendedAddons,
    optionalProductIds: uniqueProductIds([
      ...(recommendedAddons.includes("RR_PRICE_SIMULATOR")
        ? []
        : (["RR_PRICE_SIMULATOR"] as const)),
      "RR_ADVISOR_REVIEW",
    ]),
    pendingQuestions,
  });
}
