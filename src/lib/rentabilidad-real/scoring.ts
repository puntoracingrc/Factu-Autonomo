import type {
  RentabilidadRealAddonProductId,
  RentabilidadRealCalculationModeProductId,
  RentabilidadRealFutureReason,
  RentabilidadRealLevel,
  RentabilidadRealPrimaryProfile,
  RentabilidadRealProductId,
  RentabilidadRealProfileLabel,
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
    typeof answers.sellsProductsWithStock !== "boolean"
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
  if (hasLightStructure) return "Autónomo con estructura ligera";
  if (isTradesOrJobs && isHoursOrProjects) {
    return "Autónomo mixto por obras y horas";
  }
  if (isHoursOrProjects) return "Profesional por horas y proyectos";
  if (isTradesOrJobs) return "Autónomo por obras y oficios";
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
  answers: RentabilidadRealWizardAnswers,
): RentabilidadRealScoringResult {
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

  if (answers.hasStockOrCommerce || answers.sellsProductsWithStock) {
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
      answers.hasRelevantToolsOrEquipment ||
      answers.hasLightMachinery ||
      answers.hasSignificantFixedCosts,
  );

  const isMixed = answers.workModel === "mixed";
  const isHoursOrProjects = Boolean(
    isMixed ||
      answers.workModel === "hours_projects" ||
      answers.worksByHours ||
      answers.worksByProjects ||
      answers.hasMonthlyRetainers ||
      answers.hasRecurringClients ||
      answers.hasProfessionalWithholding ||
      includesAnyKeyword(answers.profession, HOURS_PROJECTS_KEYWORDS),
  );

  const isTradesOrJobs = Boolean(
    isMixed ||
      answers.workModel === "trades_jobs" ||
      answers.worksByJobs ||
      answers.worksWithClosedServices ||
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
    answers.wantsMinimumPrice
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
      explanation: hasLightStructure
        ? "Tu perfil sigue siendo de autónomo persona física. La estructura ligera se suma a tu forma real de cobrar, para que vehículo, local o herramientas no tapen el modo de cálculo."
        : isTradesOrJobs && isHoursOrProjects
          ? "Combinas trabajos cerrados con horas, proyectos o clientes recurrentes, así que conviene activar ambos modos de cálculo."
          : isHoursOrProjects
            ? "Tu rentabilidad depende de horas facturables, proyectos, clientes recurrentes o retenciones profesionales."
            : "Tu perfil encaja con trabajos cerrados, obras, reparaciones o servicios con costes variables sencillos.",
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
    recommendedAddons: [],
    optionalProductIds: ["RR_PRICE_SIMULATOR", "RR_ADVISOR_REVIEW"],
    pendingQuestions,
  });
}
