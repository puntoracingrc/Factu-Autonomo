import type {
  RentabilidadRealDocumentAnalysisMode,
  RentabilidadRealDocumentAnalysisModesById,
} from "./types";
import {
  RENTABILIDAD_REAL_DOCUMENT_ANALYSIS_MODE_LABELS,
  RENTABILIDAD_REAL_DOCUMENT_ANALYSIS_MODES,
} from "./types";
import { workspaceScopedBrowserStorageKey } from "@/lib/workspace-owner-runtime";

const DOCUMENT_ANALYSIS_MODES_STORAGE_KEY =
  "fa_rentabilidad_real_document_analysis_modes_v1";

function storageKey(): string {
  return workspaceScopedBrowserStorageKey(DOCUMENT_ANALYSIS_MODES_STORAGE_KEY);
}

function storageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeDocumentAnalysisMode(
  value: unknown,
): RentabilidadRealDocumentAnalysisMode {
  return RENTABILIDAD_REAL_DOCUMENT_ANALYSIS_MODES.includes(
    value as RentabilidadRealDocumentAnalysisMode,
  )
    ? (value as RentabilidadRealDocumentAnalysisMode)
    : "unknown";
}

function normalizeModes(
  value: unknown,
): RentabilidadRealDocumentAnalysisModesById {
  if (!isPlainObject(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([documentId]) => documentId.trim().length > 0)
      .map(([documentId, mode]) => [
        documentId,
        normalizeDocumentAnalysisMode(mode),
      ]),
  );
}

export function getStoredDocumentAnalysisModes(): RentabilidadRealDocumentAnalysisModesById {
  if (!storageAvailable()) return {};

  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return {};
    return normalizeModes(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function setStoredDocumentAnalysisModes(
  modes: RentabilidadRealDocumentAnalysisModesById,
): RentabilidadRealDocumentAnalysisModesById {
  const normalized = normalizeModes(modes);
  if (storageAvailable()) {
    localStorage.setItem(
      storageKey(),
      JSON.stringify(normalized),
    );
  }
  return normalized;
}

export function getDocumentAnalysisMode(
  documentId: string,
): RentabilidadRealDocumentAnalysisMode {
  return getStoredDocumentAnalysisModes()[documentId] ?? "unknown";
}

export function setDocumentAnalysisMode(
  documentId: string,
  mode: RentabilidadRealDocumentAnalysisMode,
): RentabilidadRealDocumentAnalysisModesById {
  const cleanDocumentId = documentId.trim();
  if (!cleanDocumentId) return getStoredDocumentAnalysisModes();

  return setStoredDocumentAnalysisModes({
    ...getStoredDocumentAnalysisModes(),
    [cleanDocumentId]: normalizeDocumentAnalysisMode(mode),
  });
}

export function removeDocumentAnalysisMode(
  documentId: string,
): RentabilidadRealDocumentAnalysisModesById {
  const remaining = { ...getStoredDocumentAnalysisModes() };
  delete remaining[documentId];
  return setStoredDocumentAnalysisModes(remaining);
}

export function clearDocumentAnalysisModesForTests(): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(storageKey());
}

export function getDocumentAnalysisModeLabel(
  mode: RentabilidadRealDocumentAnalysisMode,
): string {
  return RENTABILIDAD_REAL_DOCUMENT_ANALYSIS_MODE_LABELS[
    normalizeDocumentAnalysisMode(mode)
  ];
}
