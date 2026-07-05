import {
  getRentabilidadRealAddonProductIds,
  getRentabilidadRealCalculationModeProductIds,
} from "./catalog";
import type {
  RentabilidadRealAddonProductId,
  RentabilidadRealCalculationModeProductId,
  RentabilidadRealPrimaryProfile,
  RentabilidadRealProductId,
  RentabilidadRealScoringResult,
  RentabilidadRealWizardAnswers,
} from "./types";

const WIZARD_ANSWERS_STORAGE_KEY = "fa_rentabilidad_real_wizard_answers";
const LAST_SCORING_STORAGE_KEY = "fa_rentabilidad_real_last_scoring";

function storageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

function readJson<T>(key: string): T | null {
  if (!storageAvailable()) return null;

  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!storageAvailable()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function productIdsFromStoredResult(
  result: Partial<RentabilidadRealScoringResult>,
): RentabilidadRealProductId[] {
  return Array.isArray(result.recommendedProductIds)
    ? [...result.recommendedProductIds]
    : [];
}

function primaryProfileFromStoredResult({
  result,
  calculationModes,
  addons,
}: {
  result: Partial<RentabilidadRealScoringResult>;
  calculationModes: readonly RentabilidadRealCalculationModeProductId[];
  addons: readonly RentabilidadRealAddonProductId[];
}): RentabilidadRealPrimaryProfile {
  if (result.primaryProfile) return result.primaryProfile;
  if (result.outOfPhase) {
    if (result.futureLevel === 5) return "stock_commerce";
    if (result.futureLevel === 6) return "modules_special_regimes";
    if (result.futureLevel === 7) return "simple_sl";
    if (result.futureLevel === 8) return "sl_employees_partners";
    return "advanced_company";
  }
  if (
    calculationModes.includes("RR_TRADES_JOBS") &&
    calculationModes.includes("RR_HOURS_PROJECTS")
  ) {
    return "mixed";
  }
  if (calculationModes.includes("RR_TRADES_JOBS")) return "trades_jobs";
  if (calculationModes.includes("RR_HOURS_PROJECTS")) return "hours_projects";
  if (addons.includes("RR_ASSETS_LIGHT")) return "light_structure";
  return "basic";
}

function normalizeStoredScoringResult(
  result: RentabilidadRealScoringResult | null,
): RentabilidadRealScoringResult | null {
  if (!result) return null;

  const recommendedProductIds = productIdsFromStoredResult(result);
  const recommendedCalculationModes =
    result.recommendedCalculationModes ??
    getRentabilidadRealCalculationModeProductIds(recommendedProductIds);
  const recommendedAddons =
    result.recommendedAddons ??
    getRentabilidadRealAddonProductIds(recommendedProductIds);
  const futureReasons = result.futureReasons ?? [];

  return {
    ...result,
    primaryProfile: primaryProfileFromStoredResult({
      result,
      calculationModes: recommendedCalculationModes,
      addons: recommendedAddons,
    }),
    recommendedCalculationModes,
    recommendedAddons,
    outOfPhaseReasons: result.outOfPhaseReasons ?? futureReasons,
  };
}

export function getStoredRentabilidadRealWizardAnswers(): RentabilidadRealWizardAnswers | null {
  return readJson<RentabilidadRealWizardAnswers>(WIZARD_ANSWERS_STORAGE_KEY);
}

export function setStoredRentabilidadRealWizardAnswers(
  answers: RentabilidadRealWizardAnswers,
): void {
  writeJson(WIZARD_ANSWERS_STORAGE_KEY, answers);
}

export function getStoredRentabilidadRealLastScoringResult(): RentabilidadRealScoringResult | null {
  return normalizeStoredScoringResult(
    readJson<RentabilidadRealScoringResult>(LAST_SCORING_STORAGE_KEY),
  );
}

export function setStoredRentabilidadRealLastScoringResult(
  result: RentabilidadRealScoringResult,
): void {
  writeJson(LAST_SCORING_STORAGE_KEY, result);
}

export function clearRentabilidadRealWizardStorageForTests(): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(WIZARD_ANSWERS_STORAGE_KEY);
  localStorage.removeItem(LAST_SCORING_STORAGE_KEY);
}
