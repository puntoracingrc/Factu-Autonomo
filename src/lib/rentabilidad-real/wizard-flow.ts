import { scoreRentabilidadRealProfile } from "./scoring";
import type {
  RentabilidadRealAnalysisInterest,
  RentabilidadRealChargeModel,
  RentabilidadRealMaterialStockMode,
  RentabilidadRealScoringResult,
  RentabilidadRealVehicleUse,
  RentabilidadRealWizardAnswers,
} from "./types";

export type RentabilidadRealWizardLegalFormAnswer =
  | "individual"
  | "sl"
  | "community"
  | "civil_company"
  | "unknown";

export type RentabilidadRealWizardChargeModelAnswer =
  | "hours"
  | "closed_projects"
  | "closed_jobs"
  | "visits_services"
  | "monthly_retainer"
  | "installation_materials"
  | "labor_only"
  | "projects"
  | "job_materials"
  | "customer_products"
  | "products"
  | "stock_commerce"
  | "mixed";

export type RentabilidadRealWizardMaterialStockAnswer =
  | "none"
  | "job_materials"
  | "customer_products"
  | "install_products_for_job"
  | "habitual_material_no_inventory"
  | "stock_inventory"
  | "physical_store"
  | "ecommerce"
  | "stock_commerce";

export type RentabilidadRealWizardYesNoUnknown = "yes" | "no" | "unknown";
export type RentabilidadRealWizardYesNo = "yes" | "no";

export type RentabilidadRealWizardVehicleAnswer =
  | "none"
  | "dedicated_van"
  | "private_car"
  | "private_motorbike"
  | "renting_leasing"
  | "industrial_truck"
  | "taxi_vtc_transport";

export type RentabilidadRealWizardProfitUnitAnswer =
  | "jobs"
  | "real_hours"
  | "projects"
  | "clients"
  | "documents"
  | "services_visits"
  | "minimum_price"
  | "job"
  | "hour"
  | "project"
  | "client"
  | "invoice"
  | "service";

export interface RentabilidadRealWizardFormState {
  legalForm?: RentabilidadRealWizardLegalFormAnswer;
  chargeModel?: RentabilidadRealWizardChargeModelAnswer;
  chargeModels?: RentabilidadRealWizardChargeModelAnswer[];
  materialStockModes?: RentabilidadRealWizardMaterialStockAnswer[];
  hasPayrollEmployees?: RentabilidadRealWizardYesNoUnknown;
  hasPremises?: RentabilidadRealWizardYesNo;
  hasWorkVehicle?: RentabilidadRealWizardYesNo;
  workVehicleType?: RentabilidadRealWizardVehicleAnswer;
  workVehicleTypes?: RentabilidadRealWizardVehicleAnswer[];
  hasRelevantToolsOrEquipment?: RentabilidadRealWizardYesNo;
  hasStockOrCommerce?: RentabilidadRealWizardYesNo;
  isInModulesRegime?: RentabilidadRealWizardYesNoUnknown;
  appliesNormalVat?: RentabilidadRealWizardYesNoUnknown;
  hasProfessionalWithholding?: RentabilidadRealWizardYesNoUnknown;
  profitUnit?: RentabilidadRealWizardProfitUnitAnswer;
  analysisInterests?: RentabilidadRealWizardProfitUnitAnswer[];
}

function yesNo(value: RentabilidadRealWizardYesNo | undefined): boolean | undefined {
  if (value === "yes") return true;
  if (value === "no") return false;
  return undefined;
}

function yesNoUnknown(
  value: RentabilidadRealWizardYesNoUnknown | undefined,
): boolean | undefined {
  if (value === "yes") return true;
  if (value === "no") return false;
  return undefined;
}

function hasWorkVehicleFromType(
  value: RentabilidadRealWizardVehicleAnswer | undefined,
): boolean | undefined {
  if (!value) return undefined;
  return value !== "none";
}

function unique<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeChargeModel(
  value: RentabilidadRealWizardChargeModelAnswer,
): RentabilidadRealChargeModel[] {
  if (value === "mixed") return ["closed_jobs", "hours"];
  if (value === "projects") return ["closed_projects"];
  if (value === "job_materials" || value === "products") {
    return ["installation_materials"];
  }
  if (value === "customer_products") return ["installation_materials"];
  if (value === "stock_commerce") return [];
  return [value];
}

function normalizeChargeModels(
  form: RentabilidadRealWizardFormState,
): RentabilidadRealChargeModel[] {
  return unique(
    asArray(form.chargeModels ?? form.chargeModel).flatMap(normalizeChargeModel),
  );
}

function normalizeMaterialStockMode(
  value: RentabilidadRealWizardMaterialStockAnswer,
): RentabilidadRealMaterialStockMode[] {
  if (value === "stock_commerce") return ["stock_inventory"];
  return [value];
}

function normalizeMaterialStockModes(
  form: RentabilidadRealWizardFormState,
): RentabilidadRealMaterialStockMode[] {
  const fromQuestion = asArray(form.materialStockModes).flatMap(
    normalizeMaterialStockMode,
  );
  const fromLegacyChargeModel = asArray(form.chargeModel).flatMap((value) => {
    if (value === "job_materials") return ["job_materials" as const];
    if (value === "products") return ["install_products_for_job" as const];
    if (value === "customer_products") return ["customer_products" as const];
    if (value === "stock_commerce") return ["stock_inventory" as const];
    return [];
  });
  const fromLegacyQuestion =
    form.hasStockOrCommerce === "yes"
      ? (["stock_inventory"] as const)
      : [];
  const modes = unique([
    ...fromQuestion,
    ...fromLegacyChargeModel,
    ...fromLegacyQuestion,
  ]);
  return modes.includes("none") && modes.length > 1
    ? modes.filter((mode) => mode !== "none")
    : modes;
}

function normalizeVehicleUses(
  form: RentabilidadRealWizardFormState,
): RentabilidadRealVehicleUse[] {
  const values = asArray(form.workVehicleTypes ?? form.workVehicleType).filter(
    (value): value is RentabilidadRealVehicleUse => value !== "none",
  );
  return unique(values);
}

function normalizeAnalysisInterest(
  value: RentabilidadRealWizardProfitUnitAnswer,
): RentabilidadRealAnalysisInterest {
  if (value === "job") return "jobs";
  if (value === "hour") return "real_hours";
  if (value === "project") return "projects";
  if (value === "client") return "clients";
  if (value === "invoice") return "documents";
  if (value === "service") return "services_visits";
  return value;
}

function normalizeAnalysisInterests(
  form: RentabilidadRealWizardFormState,
): RentabilidadRealAnalysisInterest[] {
  return unique(
    asArray(form.analysisInterests ?? form.profitUnit).map(
      normalizeAnalysisInterest,
    ),
  );
}

export function buildRentabilidadRealWizardAnswersFromForm(
  form: RentabilidadRealWizardFormState,
): RentabilidadRealWizardAnswers {
  const chargeModels = normalizeChargeModels(form);
  const materialStockModes = normalizeMaterialStockModes(form);
  const workVehicleUses = normalizeVehicleUses(form);
  const analysisInterests = normalizeAnalysisInterests(form);
  const noVehicleSelected = asArray(
    form.workVehicleTypes ?? form.workVehicleType,
  ).includes("none");
  const hasWorkVehicle =
    workVehicleUses.length > 0
      ? true
      : noVehicleSelected
        ? false
        : (hasWorkVehicleFromType(form.workVehicleType) ??
          yesNo(form.hasWorkVehicle));
  const hasStockOrCommerce = materialStockModes.some((mode) =>
    ["stock_inventory", "physical_store", "ecommerce"].includes(mode),
  );
  const hasMaterialStockAnswer =
    materialStockModes.length > 0 || form.hasStockOrCommerce !== undefined;
  const hasSafeMaterials = materialStockModes.some((mode) =>
    [
      "job_materials",
      "customer_products",
      "install_products_for_job",
      "habitual_material_no_inventory",
    ].includes(mode),
  );
  const answers: RentabilidadRealWizardAnswers = {
    chargeModels,
    materialStockModes,
    workVehicleUses,
    analysisInterests,
    hasPayrollEmployees: yesNoUnknown(form.hasPayrollEmployees),
    hasRelevantPremises: yesNo(form.hasPremises),
    hasOffice: yesNo(form.hasPremises),
    hasWorkVehicle,
    workVehicleUse:
      workVehicleUses[0] ??
      (form.workVehicleType && form.workVehicleType !== "none"
        ? form.workVehicleType
        : undefined),
    usesPrivateVehicleForWork:
      workVehicleUses.includes("private_car") ||
      workVehicleUses.includes("private_motorbike"),
    hasRelevantToolsOrEquipment: yesNo(form.hasRelevantToolsOrEquipment),
    hasStockOrCommerce: hasMaterialStockAnswer
      ? hasStockOrCommerce
      : undefined,
    sellsProductsWithStock: hasMaterialStockAnswer
      ? hasStockOrCommerce
      : undefined,
    isInModulesRegime: yesNoUnknown(form.isInModulesRegime),
    appliesNormalVat: yesNoUnknown(form.appliesNormalVat),
    hasProfessionalWithholding: yesNoUnknown(
      form.hasProfessionalWithholding,
    ),
    hasMaterials: hasMaterialStockAnswer ? hasSafeMaterials : undefined,
    wantsMinimumPrice: analysisInterests.includes("minimum_price"),
  };

  if (form.legalForm === "individual") answers.legalForm = "individual";
  if (form.legalForm === "sl") answers.legalForm = "sl";
  if (form.legalForm === "community" || form.legalForm === "civil_company") {
    answers.legalForm = "other_company";
    answers.advancedCompanyCase = true;
  }

  const usesHoursModel = chargeModels.some((model) =>
    ["hours", "closed_projects", "monthly_retainer"].includes(model),
  );
  const usesTradesModel = chargeModels.some((model) =>
    ["closed_jobs", "visits_services", "installation_materials"].includes(model),
  );

  if (usesHoursModel && usesTradesModel) {
    answers.workModel = "mixed";
  } else if (usesHoursModel) {
    answers.workModel = "hours_projects";
  } else if (usesTradesModel) {
    answers.workModel = "trades_jobs";
  } else if (hasStockOrCommerce) {
    answers.workModel = "commerce_stock";
  }

  if (
    chargeModels.includes("hours") ||
    analysisInterests.includes("real_hours")
  ) {
    answers.worksByHours = true;
  }
  if (
    chargeModels.includes("closed_projects") ||
    analysisInterests.includes("projects")
  ) {
    answers.worksByProjects = true;
  }
  if (
    chargeModels.includes("closed_jobs") ||
    chargeModels.includes("installation_materials") ||
    analysisInterests.includes("jobs")
  ) {
    answers.worksByJobs = true;
  }
  if (
    chargeModels.includes("visits_services") ||
    analysisInterests.includes("services_visits")
  ) {
    answers.worksWithClosedServices = true;
  }
  if (chargeModels.includes("installation_materials") || hasSafeMaterials) {
    answers.doesRepairsInstallationsOrTrades = true;
  }
  if (chargeModels.includes("monthly_retainer")) {
    answers.hasMonthlyRetainers = true;
  }
  if (analysisInterests.includes("clients")) answers.hasRecurringClients = true;

  return answers;
}

export function scoreRentabilidadRealWizardForm(
  form: RentabilidadRealWizardFormState,
): RentabilidadRealScoringResult {
  return scoreRentabilidadRealProfile(
    buildRentabilidadRealWizardAnswersFromForm(form),
  );
}
