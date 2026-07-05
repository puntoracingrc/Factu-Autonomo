import type { RentabilidadRealFixedCostAllocationMethod } from "./types";

const CALCULATION_SETTINGS_STORAGE_KEY =
  "fa_rentabilidad_real_work_calculation_settings";

export interface RentabilidadRealCalculationSettings {
  fixedCostAllocationMethod: RentabilidadRealFixedCostAllocationMethod;
  manualAmount?: number;
  monthlyRevenue?: number;
  monthlyJobs?: number;
  workHours?: number;
  monthlyWorkHours?: number;
  selectedFixedCostIds?: string[];
  irpfProvisionPercentage: number;
}

export const DEFAULT_RENTABILIDAD_REAL_CALCULATION_SETTINGS: RentabilidadRealCalculationSettings =
  {
    fixedCostAllocationMethod: "none",
    irpfProvisionPercentage: 20,
  };

function storageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeSettings(
  value: Partial<RentabilidadRealCalculationSettings> | null | undefined,
): RentabilidadRealCalculationSettings {
  const method = value?.fixedCostAllocationMethod;
  const fixedCostAllocationMethod: RentabilidadRealFixedCostAllocationMethod =
    method === "manual_amount" ||
    method === "revenue_share" ||
    method === "monthly_jobs" ||
    method === "hours" ||
    method === "none"
      ? method
      : "none";

  return {
    fixedCostAllocationMethod,
    manualAmount: numberOrUndefined(value?.manualAmount),
    monthlyRevenue: numberOrUndefined(value?.monthlyRevenue),
    monthlyJobs: numberOrUndefined(value?.monthlyJobs),
    workHours: numberOrUndefined(value?.workHours),
    monthlyWorkHours: numberOrUndefined(value?.monthlyWorkHours),
    selectedFixedCostIds: Array.isArray(value?.selectedFixedCostIds)
      ? value.selectedFixedCostIds.filter(
          (item): item is string => typeof item === "string",
        )
      : undefined,
    irpfProvisionPercentage:
      numberOrUndefined(value?.irpfProvisionPercentage) ??
      DEFAULT_RENTABILIDAD_REAL_CALCULATION_SETTINGS.irpfProvisionPercentage,
  };
}

export function getStoredRentabilidadRealCalculationSettings(): RentabilidadRealCalculationSettings {
  if (!storageAvailable()) {
    return DEFAULT_RENTABILIDAD_REAL_CALCULATION_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(CALCULATION_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_RENTABILIDAD_REAL_CALCULATION_SETTINGS;
    return normalizeSettings(JSON.parse(raw) as Partial<RentabilidadRealCalculationSettings>);
  } catch {
    return DEFAULT_RENTABILIDAD_REAL_CALCULATION_SETTINGS;
  }
}

export function setStoredRentabilidadRealCalculationSettings(
  settings: Partial<RentabilidadRealCalculationSettings>,
): RentabilidadRealCalculationSettings {
  const normalized = normalizeSettings(settings);
  if (storageAvailable()) {
    localStorage.setItem(
      CALCULATION_SETTINGS_STORAGE_KEY,
      JSON.stringify(normalized),
    );
  }
  return normalized;
}

export function clearRentabilidadRealCalculationSettingsForTests(): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(CALCULATION_SETTINGS_STORAGE_KEY);
}
