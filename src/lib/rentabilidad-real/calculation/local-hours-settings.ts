import type {
  RentabilidadRealFixedCostAllocationMethod,
  RentabilidadRealHoursBillingModel,
  RentabilidadRealHoursSourceType,
  RentabilidadRealManualDirectCost,
} from "./types";

const HOURS_SETTINGS_STORAGE_KEY =
  "fa_rentabilidad_real_hours_calculation_settings";
const DEFAULT_MANUAL_PROJECT_ID = "hours_manual_project";

export interface RentabilidadRealHoursCalculationSettings {
  sourceType: RentabilidadRealHoursSourceType;
  selectedDocumentId?: string;
  manualProjectId: string;
  projectName: string;
  customerName?: string;
  billingModel: RentabilidadRealHoursBillingModel;
  incomeWithoutIndirectTax?: number;
  vatPercent?: number;
  billedHours?: number;
  realWorkedHours?: number;
  nonBillableHours?: number;
  meetingHours?: number;
  revisionHours?: number;
  adminHours?: number;
  totalRealHoursOverride?: number;
  manualDirectCosts: RentabilidadRealManualDirectCost[];
  fixedCostAllocationMethod: RentabilidadRealFixedCostAllocationMethod;
  manualAmount?: number;
  monthlyRevenue?: number;
  monthlyWorkHours?: number;
  irpfProvisionPercentage: number;
}

export const DEFAULT_RENTABILIDAD_REAL_HOURS_SETTINGS: RentabilidadRealHoursCalculationSettings =
  {
    sourceType: "document",
    manualProjectId: DEFAULT_MANUAL_PROJECT_ID,
    projectName: "",
    billingModel: "hours",
    manualDirectCosts: [],
    fixedCostAllocationMethod: "hours",
    irpfProvisionPercentage: 20,
  };

function storageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeMethod(
  value: unknown,
): RentabilidadRealFixedCostAllocationMethod {
  return value === "none" ||
    value === "manual_amount" ||
    value === "revenue_share" ||
    value === "monthly_jobs" ||
    value === "hours"
    ? value
    : "hours";
}

function normalizeBillingModel(value: unknown): RentabilidadRealHoursBillingModel {
  return value === "closed_project" || value === "monthly_retainer" || value === "hours"
    ? value
    : "hours";
}

function normalizeSourceType(value: unknown): RentabilidadRealHoursSourceType {
  return value === "manual" ? "manual" : "document";
}

function normalizeManualCosts(value: unknown): RentabilidadRealManualDirectCost[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const source = item as Partial<RentabilidadRealManualDirectCost>;
      const ivaAmount = numberOrUndefined(source.ivaAmount);
      return {
        id: typeof source.id === "string" ? source.id : `manual_${index}`,
        description:
          typeof source.description === "string"
            ? source.description
            : "Coste manual",
        amount: numberOrUndefined(source.amount) ?? 0,
        ...(ivaAmount !== undefined ? { ivaAmount } : {}),
      };
    })
    .filter((item): item is RentabilidadRealManualDirectCost => Boolean(item));
}

function normalizeSettings(
  settings: Partial<RentabilidadRealHoursCalculationSettings> | null | undefined,
): RentabilidadRealHoursCalculationSettings {
  return {
    sourceType: normalizeSourceType(settings?.sourceType),
    selectedDocumentId:
      typeof settings?.selectedDocumentId === "string"
        ? settings.selectedDocumentId
        : undefined,
    manualProjectId:
      typeof settings?.manualProjectId === "string" &&
      settings.manualProjectId.trim()
        ? settings.manualProjectId
        : DEFAULT_MANUAL_PROJECT_ID,
    projectName:
      typeof settings?.projectName === "string" ? settings.projectName : "",
    customerName:
      typeof settings?.customerName === "string"
        ? settings.customerName
        : undefined,
    billingModel: normalizeBillingModel(settings?.billingModel),
    incomeWithoutIndirectTax: numberOrUndefined(settings?.incomeWithoutIndirectTax),
    vatPercent: numberOrUndefined(settings?.vatPercent),
    billedHours: numberOrUndefined(settings?.billedHours),
    realWorkedHours: numberOrUndefined(settings?.realWorkedHours),
    nonBillableHours: numberOrUndefined(settings?.nonBillableHours),
    meetingHours: numberOrUndefined(settings?.meetingHours),
    revisionHours: numberOrUndefined(settings?.revisionHours),
    adminHours: numberOrUndefined(settings?.adminHours),
    totalRealHoursOverride: numberOrUndefined(settings?.totalRealHoursOverride),
    manualDirectCosts: normalizeManualCosts(settings?.manualDirectCosts),
    fixedCostAllocationMethod: normalizeMethod(
      settings?.fixedCostAllocationMethod,
    ),
    manualAmount: numberOrUndefined(settings?.manualAmount),
    monthlyRevenue: numberOrUndefined(settings?.monthlyRevenue),
    monthlyWorkHours: numberOrUndefined(settings?.monthlyWorkHours),
    irpfProvisionPercentage:
      numberOrUndefined(settings?.irpfProvisionPercentage) ?? 20,
  };
}

export function getStoredRentabilidadRealHoursSettings(): RentabilidadRealHoursCalculationSettings {
  if (!storageAvailable()) return DEFAULT_RENTABILIDAD_REAL_HOURS_SETTINGS;

  try {
    const raw = localStorage.getItem(HOURS_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_RENTABILIDAD_REAL_HOURS_SETTINGS;
    return normalizeSettings(
      JSON.parse(raw) as Partial<RentabilidadRealHoursCalculationSettings>,
    );
  } catch {
    return DEFAULT_RENTABILIDAD_REAL_HOURS_SETTINGS;
  }
}

export function setStoredRentabilidadRealHoursSettings(
  settings: Partial<RentabilidadRealHoursCalculationSettings>,
): RentabilidadRealHoursCalculationSettings {
  const normalized = normalizeSettings(settings);
  if (storageAvailable()) {
    localStorage.setItem(HOURS_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function clearRentabilidadRealHoursSettingsForTests(): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(HOURS_SETTINGS_STORAGE_KEY);
}
