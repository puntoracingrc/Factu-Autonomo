import type { LocalDataRiskFlag, LocalDataSafetyAppData } from "./types";

// PHASE2D46_IMPORT_RESTORE_SYNTHETIC_UI_FIXTURES_V1

export type ImportRestoreSyntheticUiFixtureId =
  | "SYNTHETIC_ONLY_SAFE_BACKUP_PREVIEW"
  | "SYNTHETIC_ONLY_PROTECTED_OVERWRITE_WARNING"
  | "SYNTHETIC_ONLY_MALFORMED_BACKUP_REJECTED"
  | "SYNTHETIC_ONLY_SNAPSHOT_MISMATCH_MANUAL_REVIEW"
  | "SYNTHETIC_ONLY_NUMBERING_RISK_MANUAL_REVIEW"
  | "SYNTHETIC_ONLY_EMPTY_BACKUP"
  | "SYNTHETIC_ONLY_LARGE_LIST_PAGINATED";

export type ImportRestoreSyntheticUiScenario =
  | "safe_backup_preview"
  | "protected_overwrite_warning"
  | "malformed_backup_rejected"
  | "snapshot_mismatch_manual_review"
  | "numbering_risk_manual_review"
  | "empty_backup"
  | "large_list_paginated";

export interface ImportRestoreSyntheticUiFixture {
  marker: "PHASE2D46_IMPORT_RESTORE_SYNTHETIC_UI_FIXTURES_V1";
  id: ImportRestoreSyntheticUiFixtureId;
  scenario: ImportRestoreSyntheticUiScenario;
  title: string;
  description: string;
  currentData: LocalDataSafetyAppData;
  incomingData?: LocalDataSafetyAppData;
  rawJson: string;
  expectedStatus: "preview_ready" | "invalid";
  expectedManualReview: boolean;
  expectedRiskFlags: LocalDataRiskFlag[];
  expectedPreviewItems: number;
  syntheticOnly: true;
}

export interface ImportRestoreSyntheticUiFixtureValidation {
  marker: "PHASE2D46_IMPORT_RESTORE_SYNTHETIC_UI_FIXTURES_V1";
  fixtureId: ImportRestoreSyntheticUiFixtureId;
  valid: boolean;
  errors: string[];
  syntheticOnly: true;
}

const generatedAt = "2026-06-27T00:00:00.000Z";

function doc(
  id: string,
  options: {
    status?: string;
    lifecycle?: "draft" | "issued" | "canceled";
    lock?: "unlocked" | "locked";
    number?: string;
    snapshotHash?: string;
    pdfSnapshotHash?: string;
  } = {},
) {
  return {
    id,
    kind: "invoice",
    status: options.status ?? "borrador",
    documentLifecycle: options.lifecycle ?? "draft",
    integrityLock: options.lock ?? "unlocked",
    number: options.number,
    year: "2026",
    customerId: `${id}_CUSTOMER`,
    updatedAt: generatedAt,
    snapshotHash: options.snapshotHash,
    pdfSnapshotHash: options.pdfSnapshotHash,
  };
}

function appData(documents: ReturnType<typeof doc>[], extras: Partial<LocalDataSafetyAppData> = {}): LocalDataSafetyAppData {
  return {
    documents,
    customers: documents.map((entry) => ({
      id: `${entry.id}_CUSTOMER`,
      displayName: `Cliente sintetico ${entry.id}`,
      updatedAt: generatedAt,
    })),
    counters: extras.counters ?? { invoice: { next: 10, year: 2026 } },
    numbering: extras.numbering ?? { invoice: "SYNTHETIC_ONLY_SERIE_A" },
    ...extras,
  };
}

function fixture(
  input: Omit<ImportRestoreSyntheticUiFixture, "marker" | "rawJson" | "syntheticOnly"> & {
    rawJson?: string;
  },
): ImportRestoreSyntheticUiFixture {
  const rawJson = input.rawJson ?? JSON.stringify(input.incomingData ?? {}, null, 2);
  return {
    marker: "PHASE2D46_IMPORT_RESTORE_SYNTHETIC_UI_FIXTURES_V1",
    ...input,
    rawJson,
    syntheticOnly: true,
  };
}

const largeDocuments = Array.from({ length: 24 }, (_, index) =>
  doc(`SYNTHETIC_ONLY_LARGE_${String(index + 1).padStart(2, "0")}`),
);

const fixtures: Record<ImportRestoreSyntheticUiFixtureId, ImportRestoreSyntheticUiFixture> = {
  SYNTHETIC_ONLY_SAFE_BACKUP_PREVIEW: fixture({
    id: "SYNTHETIC_ONLY_SAFE_BACKUP_PREVIEW",
    scenario: "safe_backup_preview",
    title: "Vista previa segura",
    description: "Copia sintetica con un borrador nuevo y sin acciones reales.",
    currentData: appData([doc("SYNTHETIC_ONLY_CURRENT_DRAFT")]),
    incomingData: appData([doc("SYNTHETIC_ONLY_INCOMING_DRAFT")]),
    expectedStatus: "preview_ready",
    expectedManualReview: false,
    expectedRiskFlags: ["incoming_would_add_document"],
    expectedPreviewItems: 1,
  }),
  SYNTHETIC_ONLY_PROTECTED_OVERWRITE_WARNING: fixture({
    id: "SYNTHETIC_ONLY_PROTECTED_OVERWRITE_WARNING",
    scenario: "protected_overwrite_warning",
    title: "Aviso por documento protegido",
    description: "Copia sintetica que intentaria cambiar una factura emitida protegida.",
    currentData: appData([
      doc("SYNTHETIC_ONLY_PROTECTED_DOC", {
        status: "emitida",
        lifecycle: "issued",
        lock: "locked",
        number: "FA-2026-0001",
        snapshotHash: "SYNTHETIC_ONLY_HASH_CURRENT",
      }),
    ]),
    incomingData: appData([
      doc("SYNTHETIC_ONLY_PROTECTED_DOC", {
        status: "emitida",
        lifecycle: "issued",
        lock: "locked",
        number: "FA-2026-0001",
        snapshotHash: "SYNTHETIC_ONLY_HASH_INCOMING",
      }),
    ]),
    expectedStatus: "preview_ready",
    expectedManualReview: true,
    expectedRiskFlags: [
      "protected_issued_document",
      "protected_locked_document",
      "incoming_would_overwrite_protected",
      "review_manual_confirmation_required",
    ],
    expectedPreviewItems: 1,
  }),
  SYNTHETIC_ONLY_MALFORMED_BACKUP_REJECTED: fixture({
    id: "SYNTHETIC_ONLY_MALFORMED_BACKUP_REJECTED",
    scenario: "malformed_backup_rejected",
    title: "Copia malformada rechazada",
    description: "Entrada sintetica que no puede convertirse en JSON revisable.",
    currentData: appData([]),
    rawJson: "{\"documents\":[",
    expectedStatus: "invalid",
    expectedManualReview: true,
    expectedRiskFlags: ["backup_malformed"],
    expectedPreviewItems: 0,
  }),
  SYNTHETIC_ONLY_SNAPSHOT_MISMATCH_MANUAL_REVIEW: fixture({
    id: "SYNTHETIC_ONLY_SNAPSHOT_MISMATCH_MANUAL_REVIEW",
    scenario: "snapshot_mismatch_manual_review",
    title: "Hash de snapshot distinto",
    description: "Borrador sintetico con hash diferente para revision manual.",
    currentData: appData([doc("SYNTHETIC_ONLY_DRAFT_HASH", { snapshotHash: "SYNTHETIC_ONLY_HASH_A" })]),
    incomingData: appData([doc("SYNTHETIC_ONLY_DRAFT_HASH", { snapshotHash: "SYNTHETIC_ONLY_HASH_B" })]),
    expectedStatus: "preview_ready",
    expectedManualReview: true,
    expectedRiskFlags: ["snapshot_hash_present", "incoming_snapshot_hash_mismatch", "review_manual_confirmation_required"],
    expectedPreviewItems: 1,
  }),
  SYNTHETIC_ONLY_NUMBERING_RISK_MANUAL_REVIEW: fixture({
    id: "SYNTHETIC_ONLY_NUMBERING_RISK_MANUAL_REVIEW",
    scenario: "numbering_risk_manual_review",
    title: "Riesgo de numeracion",
    description: "Copia sintetica con contador distinto para revision manual.",
    currentData: appData([doc("SYNTHETIC_ONLY_NUMBERING_BASE")], {
      counters: { invoice: { next: 10, year: 2026 } },
    }),
    incomingData: appData([doc("SYNTHETIC_ONLY_NUMBERING_INCOMING")], {
      counters: { invoice: { next: 99, year: 2026 } },
    }),
    expectedStatus: "preview_ready",
    expectedManualReview: true,
    expectedRiskFlags: ["incoming_counter_change", "review_manual_confirmation_required"],
    expectedPreviewItems: 1,
  }),
  SYNTHETIC_ONLY_EMPTY_BACKUP: fixture({
    id: "SYNTHETIC_ONLY_EMPTY_BACKUP",
    scenario: "empty_backup",
    title: "Copia vacia",
    description: "Copia sintetica vacia para comprobar copy prudente.",
    currentData: appData([doc("SYNTHETIC_ONLY_EXISTING_DRAFT")]),
    incomingData: appData([], { counters: {}, numbering: {} }),
    expectedStatus: "preview_ready",
    expectedManualReview: true,
    expectedRiskFlags: ["incoming_counter_change", "review_manual_confirmation_required"],
    expectedPreviewItems: 0,
  }),
  SYNTHETIC_ONLY_LARGE_LIST_PAGINATED: fixture({
    id: "SYNTHETIC_ONLY_LARGE_LIST_PAGINATED",
    scenario: "large_list_paginated",
    title: "Lista amplia paginable",
    description: "Copia sintetica con suficientes filas para revisar paginacion de vista previa.",
    currentData: appData([], { counters: { invoice: { next: 1, year: 2026 } } }),
    incomingData: appData(largeDocuments, { counters: { invoice: { next: 99, year: 2026 } } }),
    expectedStatus: "preview_ready",
    expectedManualReview: true,
    expectedRiskFlags: ["incoming_would_add_document", "incoming_counter_change", "review_manual_confirmation_required"],
    expectedPreviewItems: largeDocuments.length,
  }),
};

const unsafeFixtureWords = [
  ["sec", "ret"].join(""),
  ["tok", "en"].join(""),
  ["pass", "word"].join(""),
  "document" + "Snapshot",
  "pdf" + "Snapshot",
  "%p" + "df",
];

function collectIds(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectIds);
  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
    const nested = collectIds(entry);
    return key === "id" || key === "localId" || key === "customerId"
      ? [String(entry), ...nested]
      : nested;
  });
}

export function listImportRestoreSyntheticUiFixtures(): ImportRestoreSyntheticUiFixture[] {
  return Object.values(fixtures).map((entry) => ({ ...entry }));
}

export function getImportRestoreSyntheticUiFixture(
  id: ImportRestoreSyntheticUiFixtureId,
): ImportRestoreSyntheticUiFixture {
  return { ...fixtures[id] };
}

export function validateImportRestoreSyntheticUiFixture(
  fixtureToValidate: ImportRestoreSyntheticUiFixture,
): ImportRestoreSyntheticUiFixtureValidation {
  const errors: string[] = [];
  const serialized = JSON.stringify(fixtureToValidate);

  if (!fixtureToValidate.id.startsWith("SYNTHETIC_ONLY_")) errors.push("Fixture id must be synthetic-only.");
  if (fixtureToValidate.syntheticOnly !== true) errors.push("Fixture must be marked synthetic-only.");
  for (const word of unsafeFixtureWords) {
    if (serialized.toLowerCase().includes(word.toLowerCase())) {
      errors.push("Fixture contains unsafe raw-data shaped content.");
    }
  }
  for (const id of collectIds(fixtureToValidate.currentData).concat(collectIds(fixtureToValidate.incomingData))) {
    if (!id.startsWith("SYNTHETIC_ONLY_")) errors.push(`Fixture id ${id} is not synthetic-only.`);
  }
  if (fixtureToValidate.expectedStatus === "preview_ready") {
    try {
      JSON.parse(fixtureToValidate.rawJson);
    } catch {
      errors.push("Preview-ready fixture must contain parseable JSON.");
    }
  }
  if (fixtureToValidate.rawJson.length > 25000) errors.push("Fixture raw JSON is too large for UI preview tests.");

  return {
    marker: "PHASE2D46_IMPORT_RESTORE_SYNTHETIC_UI_FIXTURES_V1",
    fixtureId: fixtureToValidate.id,
    valid: errors.length === 0,
    errors,
    syntheticOnly: true,
  };
}
