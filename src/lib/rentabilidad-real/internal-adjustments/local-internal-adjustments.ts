import {
  createInternalProfitabilityAdjustment,
  validateInternalProfitabilityAdjustment,
} from "./internal-adjustments";
import type {
  CreateInternalProfitabilityAdjustmentInput,
  InternalProfitabilityAdjustment,
} from "./types";

const INTERNAL_ADJUSTMENTS_STORAGE_KEY =
  "fa_rentabilidad_real_internal_adjustments";

function storageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

function isStoredAdjustment(
  value: unknown,
): value is InternalProfitabilityAdjustment {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<InternalProfitabilityAdjustment>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.sourceDocumentId === "string" &&
    validateInternalProfitabilityAdjustment(candidate).ok
  );
}

function normalizeStoredAdjustments(value: unknown): InternalProfitabilityAdjustment[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isStoredAdjustment)
    .map((adjustment) =>
      createInternalProfitabilityAdjustment({
        id: adjustment.id,
        sourceDocumentId: adjustment.sourceDocumentId,
        sourceType: adjustment.sourceType,
        amount: adjustment.amount,
        label: adjustment.label,
        category: adjustment.category,
        note: adjustment.note,
        createdAt: adjustment.createdAt,
        updatedAt: adjustment.updatedAt,
      }),
    );
}

export function getStoredInternalAdjustments(): InternalProfitabilityAdjustment[] {
  if (!storageAvailable()) return [];

  try {
    const raw = localStorage.getItem(INTERNAL_ADJUSTMENTS_STORAGE_KEY);
    if (!raw) return [];
    return normalizeStoredAdjustments(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function setStoredInternalAdjustments(
  adjustments: readonly InternalProfitabilityAdjustment[],
): InternalProfitabilityAdjustment[] {
  const normalized = normalizeStoredAdjustments(adjustments);
  if (storageAvailable()) {
    localStorage.setItem(
      INTERNAL_ADJUSTMENTS_STORAGE_KEY,
      JSON.stringify(normalized),
    );
  }
  return normalized;
}

export function addStoredInternalAdjustment(
  adjustment: CreateInternalProfitabilityAdjustmentInput,
): InternalProfitabilityAdjustment {
  const created = createInternalProfitabilityAdjustment(adjustment);
  setStoredInternalAdjustments([...getStoredInternalAdjustments(), created]);
  return created;
}

export function updateStoredInternalAdjustment(
  adjustment: InternalProfitabilityAdjustment,
): InternalProfitabilityAdjustment {
  const updated = createInternalProfitabilityAdjustment({
    ...adjustment,
    updatedAt: new Date().toISOString(),
  });
  setStoredInternalAdjustments(
    getStoredInternalAdjustments().map((item) =>
      item.id === updated.id ? updated : item,
    ),
  );
  return updated;
}

export function removeStoredInternalAdjustment(id: string): void {
  setStoredInternalAdjustments(
    getStoredInternalAdjustments().filter((item) => item.id !== id),
  );
}

export function getInternalAdjustmentsForSource(
  sourceDocumentId: string,
): InternalProfitabilityAdjustment[] {
  return getStoredInternalAdjustments().filter(
    (adjustment) => adjustment.sourceDocumentId === sourceDocumentId,
  );
}

export function clearInternalAdjustmentsForTests(): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(INTERNAL_ADJUSTMENTS_STORAGE_KEY);
}
