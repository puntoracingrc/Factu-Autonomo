import type {
  RentabilidadRealReportFixedCostAllocationMode,
  RentabilidadRealReportPeriod,
  RentabilidadRealReportSettings,
  RentabilidadRealReportSourceTypes,
} from "./types";

const REPORT_SETTINGS_STORAGE_KEY = "fa_rentabilidad_real_report_settings";

export const DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS: RentabilidadRealReportSettings =
  {
    period: "all",
    sourceTypes: "both",
    includeQuotesWithoutInvoice: true,
    includeInternalAdjustments: true,
    fixedCostAllocationMode: "none",
    irpfProvisionPercentage: 20,
    lowMarginThresholdPercentage: 15,
  };

function storageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

function numberOrDefault(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizePeriod(value: unknown): RentabilidadRealReportPeriod {
  return value === "all" ||
    value === "current_month" ||
    value === "current_quarter" ||
    value === "custom"
    ? value
    : DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS.period;
}

function normalizeSourceTypes(value: unknown): RentabilidadRealReportSourceTypes {
  return value === "invoices" || value === "quotes" || value === "both"
    ? value
    : DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS.sourceTypes;
}

function normalizeFixedCostMode(
  value: unknown,
): RentabilidadRealReportFixedCostAllocationMode {
  return value === "none" ||
    value === "use_saved_settings" ||
    value === "revenue_share_report"
    ? value
    : DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS.fixedCostAllocationMode;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeSettings(
  settings: Partial<RentabilidadRealReportSettings> | null | undefined,
): RentabilidadRealReportSettings {
  return {
    period: normalizePeriod(settings?.period),
    sourceTypes: normalizeSourceTypes(settings?.sourceTypes),
    includeQuotesWithoutInvoice:
      typeof settings?.includeQuotesWithoutInvoice === "boolean"
        ? settings.includeQuotesWithoutInvoice
        : DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS.includeQuotesWithoutInvoice,
    includeInternalAdjustments:
      typeof settings?.includeInternalAdjustments === "boolean"
        ? settings.includeInternalAdjustments
        : DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS.includeInternalAdjustments,
    fixedCostAllocationMode: normalizeFixedCostMode(
      settings?.fixedCostAllocationMode,
    ),
    irpfProvisionPercentage: numberOrDefault(
      settings?.irpfProvisionPercentage,
      DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS.irpfProvisionPercentage,
    ),
    lowMarginThresholdPercentage: numberOrDefault(
      settings?.lowMarginThresholdPercentage,
      DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS.lowMarginThresholdPercentage,
    ),
    customStartDate: stringOrUndefined(settings?.customStartDate),
    customEndDate: stringOrUndefined(settings?.customEndDate),
  };
}

export function getStoredRentabilidadRealReportSettings(): RentabilidadRealReportSettings {
  if (!storageAvailable()) return DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS;

  try {
    const raw = localStorage.getItem(REPORT_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS;
    return normalizeSettings(
      JSON.parse(raw) as Partial<RentabilidadRealReportSettings>,
    );
  } catch {
    return DEFAULT_RENTABILIDAD_REAL_REPORT_SETTINGS;
  }
}

export function setStoredRentabilidadRealReportSettings(
  settings: Partial<RentabilidadRealReportSettings>,
): RentabilidadRealReportSettings {
  const normalized = normalizeSettings(settings);
  if (storageAvailable()) {
    localStorage.setItem(REPORT_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function clearRentabilidadRealReportSettingsForTests(): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(REPORT_SETTINGS_STORAGE_KEY);
}
