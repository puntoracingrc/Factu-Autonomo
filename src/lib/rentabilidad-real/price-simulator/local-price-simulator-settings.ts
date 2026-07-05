import type {
  RentabilidadRealPriceSimulatorInput,
  RentabilidadRealPriceSimulatorMode,
  RentabilidadRealPriceSimulatorObjectiveType,
} from "./types";

const PRICE_SIMULATOR_SETTINGS_STORAGE_KEY =
  "fa_rentabilidad_real_price_simulator_settings";

export type RentabilidadRealPriceSimulatorSourceMode = "manual" | "document";

export interface RentabilidadRealPriceSimulatorSettings
  extends RentabilidadRealPriceSimulatorInput {
  sourceMode: RentabilidadRealPriceSimulatorSourceMode;
  selectedDocumentId?: string;
}

export const DEFAULT_RENTABILIDAD_REAL_PRICE_SIMULATOR_SETTINGS: RentabilidadRealPriceSimulatorSettings =
  {
    sourceMode: "manual",
    mode: "job",
    objectiveType: "per_job",
    targetNetProfit: 300,
    directCosts: 0,
    monthlyFixedCosts: 0,
    selfEmployedFee: 0,
    selfEmployedFeeIncludedInFixedCosts: true,
    fixedCostAllocationMethod: "none",
    manualAllocatedFixedCosts: 0,
    desiredMarginPercentage: 15,
    irpfProvisionPercentage: 20,
    vatRate: 21,
    internalAdjustments: 0,
    jobsPerMonth: 10,
    monthlyBillableHours: 120,
    estimatedRealHours: 8,
    monthlyDirectCostsEstimate: 0,
    averageJobPrice: 0,
    monthlyExpectedRevenue: 0,
  };

function storageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

function numberOrDefault(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeMode(value: unknown): RentabilidadRealPriceSimulatorMode {
  return value === "hourly_rate" ||
    value === "job" ||
    value === "closed_project" ||
    value === "monthly_revenue"
    ? value
    : DEFAULT_RENTABILIDAD_REAL_PRICE_SIMULATOR_SETTINGS.mode;
}

function normalizeObjective(
  value: unknown,
): RentabilidadRealPriceSimulatorObjectiveType {
  return value === "per_job" || value === "monthly" || value === "per_hour"
    ? value
    : DEFAULT_RENTABILIDAD_REAL_PRICE_SIMULATOR_SETTINGS.objectiveType;
}

function normalizeFixedCostMethod(
  value: unknown,
): RentabilidadRealPriceSimulatorSettings["fixedCostAllocationMethod"] {
  return value === "none" ||
    value === "manual_amount" ||
    value === "revenue_share" ||
    value === "monthly_jobs" ||
    value === "hours"
    ? value
    : DEFAULT_RENTABILIDAD_REAL_PRICE_SIMULATOR_SETTINGS.fixedCostAllocationMethod;
}

function normalizeSourceMode(
  value: unknown,
): RentabilidadRealPriceSimulatorSourceMode {
  return value === "document" ? "document" : "manual";
}

function normalizeSettings(
  settings:
    | Partial<RentabilidadRealPriceSimulatorSettings>
    | null
    | undefined,
): RentabilidadRealPriceSimulatorSettings {
  return {
    sourceMode: normalizeSourceMode(settings?.sourceMode),
    selectedDocumentId:
      typeof settings?.selectedDocumentId === "string"
        ? settings.selectedDocumentId
        : undefined,
    mode: normalizeMode(settings?.mode),
    objectiveType: normalizeObjective(settings?.objectiveType),
    targetNetProfit: numberOrDefault(
      settings?.targetNetProfit,
      DEFAULT_RENTABILIDAD_REAL_PRICE_SIMULATOR_SETTINGS.targetNetProfit,
    ),
    directCosts: numberOrDefault(settings?.directCosts, 0),
    monthlyFixedCosts: numberOrDefault(settings?.monthlyFixedCosts, 0),
    selfEmployedFee: numberOrDefault(settings?.selfEmployedFee, 0),
    selfEmployedFeeIncludedInFixedCosts:
      typeof settings?.selfEmployedFeeIncludedInFixedCosts === "boolean"
        ? settings.selfEmployedFeeIncludedInFixedCosts
        : true,
    fixedCostAllocationMethod: normalizeFixedCostMethod(
      settings?.fixedCostAllocationMethod,
    ),
    manualAllocatedFixedCosts: numberOrUndefined(
      settings?.manualAllocatedFixedCosts,
    ),
    desiredMarginPercentage: numberOrDefault(
      settings?.desiredMarginPercentage,
      DEFAULT_RENTABILIDAD_REAL_PRICE_SIMULATOR_SETTINGS.desiredMarginPercentage,
    ),
    irpfProvisionPercentage: numberOrDefault(
      settings?.irpfProvisionPercentage,
      DEFAULT_RENTABILIDAD_REAL_PRICE_SIMULATOR_SETTINGS.irpfProvisionPercentage,
    ),
    vatRate: numberOrDefault(
      settings?.vatRate,
      DEFAULT_RENTABILIDAD_REAL_PRICE_SIMULATOR_SETTINGS.vatRate,
    ),
    internalAdjustments: numberOrDefault(settings?.internalAdjustments, 0),
    jobsPerMonth: numberOrUndefined(settings?.jobsPerMonth),
    monthlyBillableHours: numberOrUndefined(settings?.monthlyBillableHours),
    estimatedRealHours: numberOrUndefined(settings?.estimatedRealHours),
    monthlyDirectCostsEstimate: numberOrUndefined(
      settings?.monthlyDirectCostsEstimate,
    ),
    averageJobPrice: numberOrUndefined(settings?.averageJobPrice),
    monthlyExpectedRevenue: numberOrUndefined(settings?.monthlyExpectedRevenue),
  };
}

export function getStoredRentabilidadRealPriceSimulatorSettings(): RentabilidadRealPriceSimulatorSettings {
  if (!storageAvailable()) {
    return DEFAULT_RENTABILIDAD_REAL_PRICE_SIMULATOR_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(PRICE_SIMULATOR_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_RENTABILIDAD_REAL_PRICE_SIMULATOR_SETTINGS;
    return normalizeSettings(
      JSON.parse(raw) as Partial<RentabilidadRealPriceSimulatorSettings>,
    );
  } catch {
    return DEFAULT_RENTABILIDAD_REAL_PRICE_SIMULATOR_SETTINGS;
  }
}

export function setStoredRentabilidadRealPriceSimulatorSettings(
  settings: Partial<RentabilidadRealPriceSimulatorSettings>,
): RentabilidadRealPriceSimulatorSettings {
  const normalized = normalizeSettings(settings);
  if (storageAvailable()) {
    localStorage.setItem(
      PRICE_SIMULATOR_SETTINGS_STORAGE_KEY,
      JSON.stringify(normalized),
    );
  }
  return normalized;
}

export function clearRentabilidadRealPriceSimulatorSettingsForTests(): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(PRICE_SIMULATOR_SETTINGS_STORAGE_KEY);
}
