export const FISCAL_ADVISORY_MODEL_PREFERENCES_VERSION = 1 as const;

const MAX_MANUAL_MODEL_CODES = 300;
const CANONICAL_MODEL_CODE = /^(?:\d{2,3}|\d{2}[A-Z]|[A-Z]\d{2})$/;

export interface FiscalAdvisoryModelPreferencesV1 {
  schemaVersion: typeof FISCAL_ADVISORY_MODEL_PREFERENCES_VERSION;
  manualModelCodes: string[];
}

export function normalizeFiscalAdvisoryModelPreferencesV1(
  value: unknown,
): FiscalAdvisoryModelPreferencesV1 | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const candidate = value as Record<string, unknown>;
  if (
    candidate.schemaVersion !== FISCAL_ADVISORY_MODEL_PREFERENCES_VERSION ||
    !Array.isArray(candidate.manualModelCodes) ||
    candidate.manualModelCodes.length > MAX_MANUAL_MODEL_CODES
  ) {
    return undefined;
  }

  const seen = new Set<string>();
  const manualModelCodes: string[] = [];
  for (const code of candidate.manualModelCodes) {
    if (
      typeof code !== "string" ||
      !CANONICAL_MODEL_CODE.test(code) ||
      seen.has(code)
    ) {
      return undefined;
    }
    seen.add(code);
    manualModelCodes.push(code);
  }

  return {
    schemaVersion: FISCAL_ADVISORY_MODEL_PREFERENCES_VERSION,
    manualModelCodes,
  };
}

export function setManualFiscalAdvisoryModelSelectionV1({
  current,
  modelCode,
  selected,
  allowedModelCodes,
}: {
  current: unknown;
  modelCode: string;
  selected: boolean;
  allowedModelCodes: readonly string[];
}): FiscalAdvisoryModelPreferencesV1 | null {
  if (
    !CANONICAL_MODEL_CODE.test(modelCode) ||
    !allowedModelCodes.includes(modelCode)
  ) {
    return null;
  }
  const normalized = normalizeFiscalAdvisoryModelPreferencesV1(current);
  const nextCodes = new Set(normalized?.manualModelCodes ?? []);
  if (selected) nextCodes.add(modelCode);
  else nextCodes.delete(modelCode);

  const allowed = new Set(allowedModelCodes);
  return {
    schemaVersion: FISCAL_ADVISORY_MODEL_PREFERENCES_VERSION,
    manualModelCodes: [...nextCodes]
      .filter((code) => allowed.has(code))
      .sort((left, right) => left.localeCompare(right, "es")),
  };
}
