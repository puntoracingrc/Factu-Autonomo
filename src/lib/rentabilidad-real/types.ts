import type { PlanId } from "@/lib/billing/plans";

export type RentabilidadRealLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type RentabilidadRealProductStatus = "available" | "coming_soon";

export type RentabilidadRealProductKind =
  | "core"
  | "calculation_mode"
  | "addon"
  | "future";

export type RentabilidadRealProductCategory =
  | "base"
  | "trades"
  | "hours_projects"
  | "fixed_costs"
  | "assets"
  | "pricing"
  | "advisor"
  | "stock_commerce"
  | "tax_regimes"
  | "company";

export type RentabilidadRealProductId =
  | "RR_BASE"
  | "RR_TRADES_JOBS"
  | "RR_HOURS_PROJECTS"
  | "RR_FIXED_COSTS_PRO"
  | "RR_ASSETS_LIGHT"
  | "RR_PRICE_SIMULATOR"
  | "RR_ADVISOR_REVIEW"
  | "RR_STOCK_COMMERCE"
  | "RR_MODULES_SPECIAL_REGIMES"
  | "RR_SIMPLE_SL"
  | "RR_SL_EMPLOYEES_PARTNERS"
  | "RR_ADVANCED_COMPANY";

export type RentabilidadRealCalculationModeProductId =
  | "RR_TRADES_JOBS"
  | "RR_HOURS_PROJECTS";

export type RentabilidadRealAddonProductId =
  | "RR_FIXED_COSTS_PRO"
  | "RR_ASSETS_LIGHT"
  | "RR_PRICE_SIMULATOR"
  | "RR_ADVISOR_REVIEW";

export type RentabilidadRealCapabilityKey =
  | "basic_profitability"
  | "jobs_profitability"
  | "hours_projects_profitability"
  | "fixed_costs_pro"
  | "assets_light"
  | "price_simulator"
  | "advisor_review"
  | "stock_commerce"
  | "modules_special_regimes"
  | "simple_sl"
  | "sl_employees_partners"
  | "advanced_company";

export type RentabilidadRealAccessStatus =
  | "included_in_pro_plus"
  | "requires_pro_plus"
  | "paid_addon"
  | "coming_soon"
  | "unavailable"
  | "decision_pending";

export type RentabilidadRealPlanKey = PlanId;

export type RentabilidadRealModuleKey =
  | "income_without_vat"
  | "basic_direct_costs"
  | "basic_fixed_costs"
  | "self_employed_fee_allocation"
  | "direct_margin"
  | "operating_profit"
  | "basic_vat_reserve"
  | "basic_irpf_reserve"
  | "prudent_cash"
  | "materials"
  | "occasional_subcontracting"
  | "travel_costs"
  | "job_fixed_cost_distribution"
  | "job_profit"
  | "minimum_job_price"
  | "real_hourly_cost"
  | "billable_hours"
  | "non_billable_hours"
  | "simple_professional_withholding"
  | "closed_projects"
  | "monthly_retainers"
  | "customer_profitability"
  | "hourly_profitability"
  | "monthly_fixed_costs"
  | "cost_distribution_methods"
  | "mixed_distribution_formula"
  | "vehicle_costs"
  | "tool_costs"
  | "workspace_costs"
  | "simple_amortization"
  | "renting_leasing_cost"
  | "minimum_price_simulation"
  | "monthly_revenue_target"
  | "desired_margin"
  | "advisor_share"
  | "advisor_validation_status"
  | "stock_margin"
  | "special_tax_regime"
  | "company_profit"
  | "payroll_costs"
  | "advanced_company_controls";

export interface RentabilidadRealProduct {
  id: RentabilidadRealProductId;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  status: RentabilidadRealProductStatus;
  category: RentabilidadRealProductCategory;
  levelMin: RentabilidadRealLevel;
  levelMax: RentabilidadRealLevel;
  targetUsers: readonly string[];
  useCases: readonly string[];
  covers: readonly string[];
  doesNotCover: readonly string[];
  includedModules: readonly RentabilidadRealModuleKey[];
  productKind: RentabilidadRealProductKind;
  capabilities: readonly RentabilidadRealCapabilityKey[];
  includedInProPlus: boolean;
  commercialAccessNote: string;
  recommendedAddons: readonly RentabilidadRealProductId[];
}

export interface RentabilidadRealUserAccessContext {
  planKey: RentabilidadRealPlanKey;
  isProPlus: boolean;
  activeProductIds: readonly RentabilidadRealProductId[];
  activeCapabilityKeys: readonly RentabilidadRealCapabilityKey[];
  activeCalculationModes?: readonly RentabilidadRealCalculationModeProductId[];
  activeAddons?: readonly RentabilidadRealAddonProductId[];
}

export interface RentabilidadRealActivationDecision {
  productId: RentabilidadRealProductId;
  accessStatus: RentabilidadRealAccessStatus;
  canActivate: boolean;
  message: string;
}

export interface RentabilidadRealUsageSummary {
  usedProductIds: readonly RentabilidadRealProductId[];
  usedCapabilityKeys: readonly RentabilidadRealCapabilityKey[];
  hasHistoricalCalculations: boolean;
  hasAssetsConfigured: boolean;
  hasAdvancedFixedCostsConfigured: boolean;
  hasHoursProjectsCalculations: boolean;
  hasJobsCalculations: boolean;
  hasPriceSimulatorScenarios: boolean;
}

export interface RentabilidadRealAffectedHistoricalItem {
  capabilityKey: RentabilidadRealCapabilityKey;
  label: string;
  reason: string;
}

export interface RentabilidadRealSwitchImpact {
  fromProductIds: readonly RentabilidadRealProductId[];
  toProductIds: readonly RentabilidadRealProductId[];
  disabledProductIds: readonly RentabilidadRealProductId[];
  disabledCapabilities: readonly RentabilidadRealCapabilityKey[];
  affectedHistoricalItems: readonly RentabilidadRealAffectedHistoricalItem[];
  willDeleteData: false;
  requiresConfirmation: boolean;
  userMessages: readonly string[];
  technicalWarnings: readonly string[];
}

export type RentabilidadRealLegalForm =
  | "individual"
  | "sl"
  | "slu"
  | "other_company";

export type RentabilidadRealWorkModel =
  | "simple"
  | "trades_jobs"
  | "hours_projects"
  | "mixed"
  | "commerce_stock"
  | "advanced";

export type RentabilidadRealVehicleUse =
  | "dedicated_van"
  | "private_car"
  | "private_motorbike"
  | "renting_leasing";

export interface RentabilidadRealWizardAnswers {
  legalForm?: RentabilidadRealLegalForm;
  profession?: string;
  workModel?: RentabilidadRealWorkModel;
  isLimitedCompany?: boolean;
  hasPayrollEmployees?: boolean;
  isInModulesRegime?: boolean;
  hasStockOrCommerce?: boolean;
  sellsProductsWithStock?: boolean;
  advancedCompanyCase?: boolean;
  hasMultipleCompanies?: boolean;
  hasInternationalOperations?: boolean;
  hasRegionalTaxRegime?: boolean;
  hasRelevantPremises?: boolean;
  hasOffice?: boolean;
  hasWorkshop?: boolean;
  hasWorkVehicle?: boolean;
  workVehicleUse?: RentabilidadRealVehicleUse;
  usesPrivateVehicleForWork?: boolean;
  hasRelevantToolsOrEquipment?: boolean;
  hasLightMachinery?: boolean;
  hasSignificantFixedCosts?: boolean;
  worksByHours?: boolean;
  worksByProjects?: boolean;
  hasMonthlyRetainers?: boolean;
  hasRecurringClients?: boolean;
  hasProfessionalWithholding?: boolean;
  worksByJobs?: boolean;
  worksWithClosedServices?: boolean;
  doesRepairsInstallationsOrTrades?: boolean;
  hasMaterials?: boolean;
  hasTravelCosts?: boolean;
  hasOccasionalSubcontracting?: boolean;
  appliesNormalVat?: boolean;
  wantsMinimumPrice?: boolean;
  wantsAdvisorReview?: boolean;
}

export type RentabilidadRealFutureReasonCode =
  | "limited_company"
  | "payroll_employees"
  | "modules_regime"
  | "stock_or_commerce"
  | "advanced_company";

export interface RentabilidadRealFutureReason {
  code: RentabilidadRealFutureReasonCode;
  label: string;
  description: string;
  futureLevel: RentabilidadRealLevel;
  productId: RentabilidadRealProductId;
}

export type RentabilidadRealProfileLabel =
  | "Autónomo básico"
  | "Autónomo por obras y oficios"
  | "Profesional por horas y proyectos"
  | "Autónomo mixto por obras y horas"
  | "Autónomo con estructura ligera"
  | "Stock y comercio"
  | "Módulos y regímenes especiales"
  | "S.L. simple"
  | "S.L. con empleados y socios"
  | "Empresa avanzada";

export type RentabilidadRealPrimaryProfile =
  | "basic"
  | "trades_jobs"
  | "hours_projects"
  | "mixed"
  | "light_structure"
  | "stock_commerce"
  | "modules_special_regimes"
  | "simple_sl"
  | "sl_employees_partners"
  | "advanced_company";

export interface RentabilidadRealScoringResult {
  level: RentabilidadRealLevel;
  score: number;
  primaryProfile: RentabilidadRealPrimaryProfile;
  profileLabel: RentabilidadRealProfileLabel;
  explanation: string;
  recommendedProductIds: readonly RentabilidadRealProductId[];
  recommendedCalculationModes: readonly RentabilidadRealCalculationModeProductId[];
  recommendedAddons: readonly RentabilidadRealAddonProductId[];
  optionalProductIds: readonly RentabilidadRealProductId[];
  unavailableProductIds: readonly RentabilidadRealProductId[];
  pendingQuestions: readonly string[];
  outOfPhase: boolean;
  futureLevel?: RentabilidadRealLevel;
  futureReasons: readonly RentabilidadRealFutureReason[];
  outOfPhaseReasons: readonly RentabilidadRealFutureReason[];
}
