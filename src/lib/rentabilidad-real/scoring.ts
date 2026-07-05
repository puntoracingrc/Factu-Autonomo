import type {
  RentabilidadRealFutureReason,
  RentabilidadRealLevel,
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

function outOfPhaseResult(params: {
  futureLevel: RentabilidadRealLevel;
  profileLabel: RentabilidadRealProfileLabel;
  explanation: string;
  productId: RentabilidadRealProductId;
  reason: RentabilidadRealFutureReason;
  pendingQuestions: readonly string[];
}): RentabilidadRealScoringResult {
  return {
    level: params.futureLevel,
    score: params.futureLevel * 10,
    profileLabel: params.profileLabel,
    explanation: params.explanation,
    recommendedProductIds: [params.productId],
    optionalProductIds: [],
    unavailableProductIds: [params.productId],
    pendingQuestions: params.pendingQuestions,
    outOfPhase: true,
    futureLevel: params.futureLevel,
    futureReasons: [params.reason],
  };
}

function baseResult(params: {
  level: RentabilidadRealLevel;
  score: number;
  profileLabel: RentabilidadRealProfileLabel;
  explanation: string;
  recommendedProductIds: readonly RentabilidadRealProductId[];
  optionalProductIds: readonly RentabilidadRealProductId[];
  pendingQuestions: readonly string[];
}): RentabilidadRealScoringResult {
  return {
    level: params.level,
    score: params.score,
    profileLabel: params.profileLabel,
    explanation: params.explanation,
    recommendedProductIds: params.recommendedProductIds,
    optionalProductIds: params.optionalProductIds,
    unavailableProductIds: [],
    pendingQuestions: params.pendingQuestions,
    outOfPhase: false,
    futureReasons: [],
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

  const hasLightStructure =
    answers.hasRelevantPremises ||
    answers.hasOffice ||
    answers.hasWorkshop ||
    answers.hasWorkVehicle ||
    answers.hasRelevantToolsOrEquipment ||
    answers.hasLightMachinery ||
    answers.hasSignificantFixedCosts;

  if (hasLightStructure) {
    return baseResult({
      level: 4,
      score: 85,
      profileLabel: "Autónomo con estructura ligera",
      explanation:
        "Tu perfil sigue siendo de autónomo persona física, pero la estructura ligera cambia el coste real de cada trabajo.",
      recommendedProductIds: ["RR_ASSETS_LIGHT", "RR_FIXED_COSTS_PRO"],
      optionalProductIds: ["RR_PRICE_SIMULATOR", "RR_ADVISOR_REVIEW"],
      pendingQuestions,
    });
  }

  const isHoursOrProjects =
    answers.workModel === "hours_projects" ||
    answers.worksByHours ||
    answers.worksByProjects ||
    answers.hasMonthlyRetainers ||
    answers.hasRecurringClients ||
    answers.hasProfessionalWithholding ||
    includesAnyKeyword(answers.profession, HOURS_PROJECTS_KEYWORDS);

  if (isHoursOrProjects) {
    return baseResult({
      level: 3,
      score: 70,
      profileLabel: "Profesional por horas y proyectos",
      explanation:
        "Tu rentabilidad depende de horas facturables, proyectos, clientes recurrentes o retenciones profesionales.",
      recommendedProductIds: ["RR_HOURS_PROJECTS"],
      optionalProductIds: [
        "RR_FIXED_COSTS_PRO",
        "RR_PRICE_SIMULATOR",
        "RR_ADVISOR_REVIEW",
      ],
      pendingQuestions,
    });
  }

  const isTradesOrJobs =
    answers.workModel === "trades_jobs" ||
    answers.worksByJobs ||
    answers.worksWithClosedServices ||
    answers.doesRepairsInstallationsOrTrades ||
    answers.hasMaterials ||
    answers.hasTravelCosts ||
    answers.hasOccasionalSubcontracting ||
    includesAnyKeyword(answers.profession, TRADE_KEYWORDS);

  if (isTradesOrJobs) {
    return baseResult({
      level: 2,
      score: 55,
      profileLabel: "Autónomo por obras y oficios",
      explanation:
        "Tu perfil encaja con trabajos cerrados, obras, reparaciones o servicios con costes variables sencillos.",
      recommendedProductIds: ["RR_TRADES_JOBS", "RR_FIXED_COSTS_PRO"],
      optionalProductIds: ["RR_PRICE_SIMULATOR", "RR_ADVISOR_REVIEW"],
      pendingQuestions,
    });
  }

  return baseResult({
    level: 1,
    score: 35,
    profileLabel: "Autónomo básico",
    explanation:
      "Tu caso encaja con un autónomo simple que necesita saber beneficio por factura o trabajo sencillo.",
    recommendedProductIds: ["RR_BASE"],
    optionalProductIds: ["RR_PRICE_SIMULATOR", "RR_ADVISOR_REVIEW"],
    pendingQuestions,
  });
}
