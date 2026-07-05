import { scoreRentabilidadRealProfile } from "./scoring";
import type {
  RentabilidadRealScoringResult,
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
  | "projects"
  | "closed_jobs"
  | "visits_services"
  | "job_materials"
  | "customer_products"
  | "stock_commerce"
  | "products"
  | "mixed";

export type RentabilidadRealWizardYesNoUnknown = "yes" | "no" | "unknown";
export type RentabilidadRealWizardYesNo = "yes" | "no";

export type RentabilidadRealWizardVehicleAnswer =
  | "none"
  | "dedicated_van"
  | "private_car"
  | "private_motorbike"
  | "renting_leasing";

export type RentabilidadRealWizardProfitUnitAnswer =
  | "job"
  | "hour"
  | "project"
  | "client"
  | "invoice"
  | "service";

export interface RentabilidadRealWizardFormState {
  legalForm?: RentabilidadRealWizardLegalFormAnswer;
  chargeModel?: RentabilidadRealWizardChargeModelAnswer;
  hasPayrollEmployees?: RentabilidadRealWizardYesNoUnknown;
  hasPremises?: RentabilidadRealWizardYesNo;
  hasWorkVehicle?: RentabilidadRealWizardYesNo;
  workVehicleType?: RentabilidadRealWizardVehicleAnswer;
  hasRelevantToolsOrEquipment?: RentabilidadRealWizardYesNo;
  hasStockOrCommerce?: RentabilidadRealWizardYesNo;
  isInModulesRegime?: RentabilidadRealWizardYesNoUnknown;
  appliesNormalVat?: RentabilidadRealWizardYesNoUnknown;
  hasProfessionalWithholding?: RentabilidadRealWizardYesNoUnknown;
  profitUnit?: RentabilidadRealWizardProfitUnitAnswer;
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

export function buildRentabilidadRealWizardAnswersFromForm(
  form: RentabilidadRealWizardFormState,
): RentabilidadRealWizardAnswers {
  const hasWorkVehicle =
    hasWorkVehicleFromType(form.workVehicleType) ?? yesNo(form.hasWorkVehicle);
  const answers: RentabilidadRealWizardAnswers = {
    hasPayrollEmployees: yesNoUnknown(form.hasPayrollEmployees),
    hasRelevantPremises: yesNo(form.hasPremises),
    hasOffice: yesNo(form.hasPremises),
    hasWorkVehicle,
    workVehicleUse:
      form.workVehicleType && form.workVehicleType !== "none"
        ? form.workVehicleType
        : undefined,
    usesPrivateVehicleForWork:
      form.workVehicleType === "private_car" ||
      form.workVehicleType === "private_motorbike",
    hasRelevantToolsOrEquipment: yesNo(form.hasRelevantToolsOrEquipment),
    hasStockOrCommerce: yesNo(form.hasStockOrCommerce),
    sellsProductsWithStock:
      form.chargeModel === "stock_commerce" ? true : undefined,
    isInModulesRegime: yesNoUnknown(form.isInModulesRegime),
    appliesNormalVat: yesNoUnknown(form.appliesNormalVat),
    hasProfessionalWithholding: yesNoUnknown(
      form.hasProfessionalWithholding,
    ),
  };

  if (form.legalForm === "individual") answers.legalForm = "individual";
  if (form.legalForm === "sl") answers.legalForm = "sl";
  if (form.legalForm === "community" || form.legalForm === "civil_company") {
    answers.legalForm = "other_company";
    answers.advancedCompanyCase = true;
  }

  if (form.chargeModel === "hours") {
    answers.workModel = "hours_projects";
    answers.worksByHours = true;
  }
  if (form.chargeModel === "projects") {
    answers.workModel = "hours_projects";
    answers.worksByProjects = true;
  }
  if (form.chargeModel === "closed_jobs") {
    answers.workModel = "trades_jobs";
    answers.worksByJobs = true;
    answers.worksWithClosedServices = true;
  }
  if (form.chargeModel === "visits_services") {
    answers.workModel = "trades_jobs";
    answers.worksWithClosedServices = true;
  }
  if (
    form.chargeModel === "products" ||
    form.chargeModel === "job_materials"
  ) {
    answers.workModel = "trades_jobs";
    answers.worksByJobs = true;
    answers.hasMaterials = true;
    answers.doesRepairsInstallationsOrTrades = true;
  }
  if (form.chargeModel === "customer_products") {
    answers.workModel = "trades_jobs";
    answers.worksByJobs = true;
    answers.worksWithClosedServices = true;
  }
  if (form.chargeModel === "stock_commerce") {
    answers.workModel = "commerce_stock";
    answers.hasStockOrCommerce = true;
    answers.sellsProductsWithStock = true;
  }
  if (form.chargeModel === "mixed") answers.workModel = "mixed";

  if (form.profitUnit === "job") answers.worksByJobs = true;
  if (form.profitUnit === "hour") answers.worksByHours = true;
  if (form.profitUnit === "project") answers.worksByProjects = true;
  if (form.profitUnit === "client") answers.hasRecurringClients = true;
  if (form.profitUnit === "service") answers.worksWithClosedServices = true;

  return answers;
}

export function scoreRentabilidadRealWizardForm(
  form: RentabilidadRealWizardFormState,
): RentabilidadRealScoringResult {
  return scoreRentabilidadRealProfile(
    buildRentabilidadRealWizardAnswersFromForm(form),
  );
}
