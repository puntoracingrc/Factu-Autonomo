import type {
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

export function getStoredRentabilidadRealWizardAnswers(): RentabilidadRealWizardAnswers | null {
  return readJson<RentabilidadRealWizardAnswers>(WIZARD_ANSWERS_STORAGE_KEY);
}

export function setStoredRentabilidadRealWizardAnswers(
  answers: RentabilidadRealWizardAnswers,
): void {
  writeJson(WIZARD_ANSWERS_STORAGE_KEY, answers);
}

export function getStoredRentabilidadRealLastScoringResult(): RentabilidadRealScoringResult | null {
  return readJson<RentabilidadRealScoringResult>(LAST_SCORING_STORAGE_KEY);
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
