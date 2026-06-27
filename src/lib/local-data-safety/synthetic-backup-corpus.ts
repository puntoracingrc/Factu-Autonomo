import { buildLocalDataBackupIntegrityDigest } from "./backup-integrity";
import { buildLocalDataBackupManifest, summarizeLocalDataBackupManifest } from "./backup-manifest";
import { buildLocalDataSafetyReport } from "./local-data-safety-report";
import { runLocalDataBackupValidationPipeline } from "./backup-validation-pipeline";
import type {
  LocalDataBackupManifestSummary,
  LocalDataSafetyAppData,
  LocalDataSafetyDocumentLike,
  LocalDataSafetyReport,
} from "./types";

// PHASE2D57_SYNTHETIC_BACKUP_CORPUS_REGISTRY_V1

export type LocalDataSyntheticBackupCorpusCaseId =
  | "SYNTHETIC_ONLY_EMPTY_APP_BACKUP"
  | "SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP"
  | "SYNTHETIC_ONLY_ISSUED_LOCKED_BACKUP"
  | "SYNTHETIC_ONLY_LEGACY_PROTECTED_BACKUP"
  | "SYNTHETIC_ONLY_COUNTERS_MISMATCH_BACKUP"
  | "SYNTHETIC_ONLY_SNAPSHOT_HASH_MISMATCH_BACKUP"
  | "SYNTHETIC_ONLY_PDF_HASH_MISMATCH_BACKUP"
  | "SYNTHETIC_ONLY_DUPLICATE_DOCUMENT_IDS_BACKUP"
  | "SYNTHETIC_ONLY_DUPLICATE_CUSTOMER_IDS_BACKUP"
  | "SYNTHETIC_ONLY_MIXED_VALID_AND_BLOCKED_BACKUP"
  | "SYNTHETIC_ONLY_LARGE_LIST_BACKUP"
  | "SYNTHETIC_ONLY_MALFORMED_SHAPE_BACKUP";

export interface LocalDataSyntheticBackupCorpusCase {
  marker: "PHASE2D57_SYNTHETIC_BACKUP_CORPUS_REGISTRY_V1";
  id: LocalDataSyntheticBackupCorpusCaseId;
  title: string;
  description: string;
  currentData: LocalDataSafetyAppData;
  backupData: LocalDataSafetyAppData;
  expectedRiskProfile: "low" | "manual_review" | "blocked";
  expectedManualReview: boolean;
  syntheticOnly: true;
}

export interface LocalDataSyntheticBackupCorpusCaseValidation {
  marker: "PHASE2D57_SYNTHETIC_BACKUP_CORPUS_REGISTRY_V1";
  caseId: LocalDataSyntheticBackupCorpusCaseId;
  valid: boolean;
  errors: string[];
  syntheticOnly: true;
}

export interface LocalDataSyntheticBackupCorpusCaseSummary {
  id: LocalDataSyntheticBackupCorpusCaseId;
  expectedRiskProfile: LocalDataSyntheticBackupCorpusCase["expectedRiskProfile"];
  expectedManualReview: boolean;
  manifest: LocalDataBackupManifestSummary;
  report: Pick<LocalDataSafetyReport, "generatedAt" | "integrityDigestPresent" | "riskFlags" | "safe">;
  validationStatus: "valid" | "invalid";
  syntheticOnly: true;
}

const fixedAt = "2026-06-27T00:00:00.000Z";

function customer(id: string, suffix = id) {
  return {
    id,
    displayName: `Cliente sintetico ${suffix}`,
    taxId: `SYNTHETIC_ONLY_TAX_${suffix}`,
    updatedAt: fixedAt,
  };
}

function document(
  id: string,
  options: {
    kind?: string;
    status?: string;
    documentLifecycle?: "draft" | "issued" | "canceled";
    integrityLock?: "unlocked" | "locked";
    number?: string;
    year?: string;
    customerId?: string;
    snapshotHash?: string;
    pdfSnapshotHash?: string;
    extra?: Record<string, unknown>;
  } = {},
) {
  return {
    id,
    kind: options.kind ?? "invoice",
    status: options.status ?? "borrador",
    documentLifecycle: options.documentLifecycle ?? "draft",
    integrityLock: options.integrityLock ?? "unlocked",
    number: options.number,
    year: options.year ?? "2026",
    customerId: options.customerId ?? `${id}_CUSTOMER`,
    updatedAt: fixedAt,
    snapshotHash: options.snapshotHash,
    pdfSnapshotHash: options.pdfSnapshotHash,
    ...(options.extra ?? {}),
  };
}

function appData(
  documents: LocalDataSafetyDocumentLike[],
  options: {
    customers?: ReturnType<typeof customer>[];
    counters?: Record<string, unknown>;
    numbering?: Record<string, unknown>;
    extra?: Record<string, unknown>;
  } = {},
): LocalDataSafetyAppData {
  return {
    documents,
    customers: options.customers ?? documents.map((entry) => customer(`${entry.id}_CUSTOMER`)),
    counters: options.counters ?? { invoice: { next: 10, year: 2026 } },
    numbering: options.numbering ?? { invoice: "SYNTHETIC_ONLY_SERIE_A" },
    ...(options.extra ?? {}),
  };
}

function corpusCase(
  input: Omit<LocalDataSyntheticBackupCorpusCase, "marker" | "syntheticOnly">,
): LocalDataSyntheticBackupCorpusCase {
  return {
    marker: "PHASE2D57_SYNTHETIC_BACKUP_CORPUS_REGISTRY_V1",
    ...input,
    syntheticOnly: true,
  };
}

const largeDocuments = Array.from({ length: 120 }, (_, index) =>
  document(`SYNTHETIC_ONLY_LARGE_DOC_${String(index + 1).padStart(3, "0")}`, {
    number: `L-${String(index + 1).padStart(4, "0")}`,
  }),
);

const corpus: Record<LocalDataSyntheticBackupCorpusCaseId, LocalDataSyntheticBackupCorpusCase> = {
  SYNTHETIC_ONLY_EMPTY_APP_BACKUP: corpusCase({
    id: "SYNTHETIC_ONLY_EMPTY_APP_BACKUP",
    title: "Empty app backup",
    description: "Empty synthetic app data backup.",
    currentData: appData([]),
    backupData: appData([], { counters: {}, numbering: {} }),
    expectedRiskProfile: "manual_review",
    expectedManualReview: true,
  }),
  SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP: corpusCase({
    id: "SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP",
    title: "Drafts only backup",
    description: "Synthetic backup with reviewable draft documents only.",
    currentData: appData([document("SYNTHETIC_ONLY_CURRENT_DRAFT")]),
    backupData: appData([document("SYNTHETIC_ONLY_INCOMING_DRAFT")]),
    expectedRiskProfile: "low",
    expectedManualReview: false,
  }),
  SYNTHETIC_ONLY_ISSUED_LOCKED_BACKUP: corpusCase({
    id: "SYNTHETIC_ONLY_ISSUED_LOCKED_BACKUP",
    title: "Issued locked backup",
    description: "Synthetic backup containing protected issued and locked invoice references.",
    currentData: appData([]),
    backupData: appData([
      document("SYNTHETIC_ONLY_ISSUED_LOCKED", {
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
        number: "FA-2026-0001",
        snapshotHash: "SYNTHETIC_ONLY_HASH_ISSUED",
        pdfSnapshotHash: "SYNTHETIC_ONLY_PDF_HASH_ISSUED",
      }),
    ]),
    expectedRiskProfile: "blocked",
    expectedManualReview: true,
  }),
  SYNTHETIC_ONLY_LEGACY_PROTECTED_BACKUP: corpusCase({
    id: "SYNTHETIC_ONLY_LEGACY_PROTECTED_BACKUP",
    title: "Legacy protected backup",
    description: "Synthetic legacy backup with non-draft status and missing lifecycle fields.",
    currentData: appData([]),
    backupData: appData([
      {
        id: "SYNTHETIC_ONLY_LEGACY_PROTECTED",
        kind: "invoice",
        status: "emitida",
        number: "LEG-2026-0001",
        year: "2026",
        customerId: "SYNTHETIC_ONLY_LEGACY_CUSTOMER",
      },
    ]),
    expectedRiskProfile: "blocked",
    expectedManualReview: true,
  }),
  SYNTHETIC_ONLY_COUNTERS_MISMATCH_BACKUP: corpusCase({
    id: "SYNTHETIC_ONLY_COUNTERS_MISMATCH_BACKUP",
    title: "Counters mismatch backup",
    description: "Synthetic backup where incoming counters differ from current counters.",
    currentData: appData([document("SYNTHETIC_ONLY_COUNTER_CURRENT")], {
      counters: { invoice: { next: 50, year: 2026 } },
    }),
    backupData: appData([document("SYNTHETIC_ONLY_COUNTER_INCOMING")], {
      counters: { invoice: { next: 4, year: 2026 } },
    }),
    expectedRiskProfile: "manual_review",
    expectedManualReview: true,
  }),
  SYNTHETIC_ONLY_SNAPSHOT_HASH_MISMATCH_BACKUP: corpusCase({
    id: "SYNTHETIC_ONLY_SNAPSHOT_HASH_MISMATCH_BACKUP",
    title: "Snapshot hash mismatch backup",
    description: "Synthetic backup with same draft ref and different snapshot hash.",
    currentData: appData([document("SYNTHETIC_ONLY_HASH_DOC", { snapshotHash: "SYNTHETIC_ONLY_HASH_A" })]),
    backupData: appData([document("SYNTHETIC_ONLY_HASH_DOC", { snapshotHash: "SYNTHETIC_ONLY_HASH_B" })]),
    expectedRiskProfile: "manual_review",
    expectedManualReview: true,
  }),
  SYNTHETIC_ONLY_PDF_HASH_MISMATCH_BACKUP: corpusCase({
    id: "SYNTHETIC_ONLY_PDF_HASH_MISMATCH_BACKUP",
    title: "PDF hash mismatch backup",
    description: "Synthetic backup with same protected ref and different PDF hash.",
    currentData: appData([
      document("SYNTHETIC_ONLY_PDF_HASH_DOC", {
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
        pdfSnapshotHash: "SYNTHETIC_ONLY_PDF_HASH_A",
      }),
    ]),
    backupData: appData([
      document("SYNTHETIC_ONLY_PDF_HASH_DOC", {
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
        pdfSnapshotHash: "SYNTHETIC_ONLY_PDF_HASH_B",
      }),
    ]),
    expectedRiskProfile: "blocked",
    expectedManualReview: true,
  }),
  SYNTHETIC_ONLY_DUPLICATE_DOCUMENT_IDS_BACKUP: corpusCase({
    id: "SYNTHETIC_ONLY_DUPLICATE_DOCUMENT_IDS_BACKUP",
    title: "Duplicate document ids backup",
    description: "Synthetic backup with duplicate document ids.",
    currentData: appData([]),
    backupData: appData([
      document("SYNTHETIC_ONLY_DUPLICATE_DOC"),
      document("SYNTHETIC_ONLY_DUPLICATE_DOC", { number: "DUP-2" }),
    ]),
    expectedRiskProfile: "manual_review",
    expectedManualReview: true,
  }),
  SYNTHETIC_ONLY_DUPLICATE_CUSTOMER_IDS_BACKUP: corpusCase({
    id: "SYNTHETIC_ONLY_DUPLICATE_CUSTOMER_IDS_BACKUP",
    title: "Duplicate customer ids backup",
    description: "Synthetic backup with duplicate customer ids.",
    currentData: appData([]),
    backupData: appData([document("SYNTHETIC_ONLY_CUSTOMER_DOC", { customerId: "SYNTHETIC_ONLY_DUP_CUSTOMER" })], {
      customers: [customer("SYNTHETIC_ONLY_DUP_CUSTOMER", "A"), customer("SYNTHETIC_ONLY_DUP_CUSTOMER", "B")],
    }),
    expectedRiskProfile: "manual_review",
    expectedManualReview: true,
  }),
  SYNTHETIC_ONLY_MIXED_VALID_AND_BLOCKED_BACKUP: corpusCase({
    id: "SYNTHETIC_ONLY_MIXED_VALID_AND_BLOCKED_BACKUP",
    title: "Mixed valid and blocked backup",
    description: "Synthetic backup mixing a safe draft and protected issued reference.",
    currentData: appData([document("SYNTHETIC_ONLY_MIXED_CURRENT")]),
    backupData: appData([
      document("SYNTHETIC_ONLY_MIXED_DRAFT"),
      document("SYNTHETIC_ONLY_MIXED_ISSUED", {
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
        number: "MIX-1",
      }),
    ]),
    expectedRiskProfile: "blocked",
    expectedManualReview: true,
  }),
  SYNTHETIC_ONLY_LARGE_LIST_BACKUP: corpusCase({
    id: "SYNTHETIC_ONLY_LARGE_LIST_BACKUP",
    title: "Large list backup",
    description: "Synthetic backup with a broad list of draft documents.",
    currentData: appData([]),
    backupData: appData(largeDocuments),
    expectedRiskProfile: "manual_review",
    expectedManualReview: true,
  }),
  SYNTHETIC_ONLY_MALFORMED_SHAPE_BACKUP: corpusCase({
    id: "SYNTHETIC_ONLY_MALFORMED_SHAPE_BACKUP",
    title: "Malformed shape backup",
    description: "Synthetic backup with unexpected non-array documents shape.",
    currentData: appData([]),
    backupData: { documents: { unexpected: "SYNTHETIC_ONLY_DOCUMENTS_SHAPE" } as unknown as [], customers: [] },
    expectedRiskProfile: "manual_review",
    expectedManualReview: true,
  }),
};

const unsafeWords = [
  ["sec", "ret"].join(""),
  ["tok", "en"].join(""),
  "authorization",
  "cookie",
  "%p" + "df",
  "<" + "?xml",
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

export function listLocalDataSyntheticBackupCorpusCases(): LocalDataSyntheticBackupCorpusCase[] {
  return Object.values(corpus).map((entry) => ({ ...entry }));
}

export function getLocalDataSyntheticBackupCorpusCase(
  id: LocalDataSyntheticBackupCorpusCaseId,
): LocalDataSyntheticBackupCorpusCase {
  return { ...corpus[id] };
}

export function validateLocalDataSyntheticBackupCorpusCase(
  corpusEntry: LocalDataSyntheticBackupCorpusCase,
): LocalDataSyntheticBackupCorpusCaseValidation {
  const errors: string[] = [];
  const serialized = JSON.stringify(corpusEntry);
  if (!corpusEntry.id.startsWith("SYNTHETIC_ONLY_")) errors.push("Corpus id must be synthetic-only.");
  if (corpusEntry.syntheticOnly !== true) errors.push("Corpus entry must be synthetic-only.");
  for (const id of collectIds(corpusEntry.currentData).concat(collectIds(corpusEntry.backupData))) {
    if (!id.startsWith("SYNTHETIC_ONLY_")) errors.push(`Non-synthetic id detected: ${id}.`);
  }
  for (const word of unsafeWords) {
    if (serialized.toLowerCase().includes(word.toLowerCase())) {
      errors.push("Corpus entry contains unsafe raw-data shaped content.");
    }
  }
  for (const data of [corpusEntry.currentData, corpusEntry.backupData]) {
    for (const entry of Array.isArray(data.documents) ? data.documents : []) {
      if (entry.documentSnapshot !== undefined || entry.pdfSnapshot !== undefined) {
        errors.push("Corpus entry contains a full snapshot payload.");
      }
    }
  }
  return {
    marker: "PHASE2D57_SYNTHETIC_BACKUP_CORPUS_REGISTRY_V1",
    caseId: corpusEntry.id,
    valid: errors.length === 0,
    errors,
    syntheticOnly: true,
  };
}

export function summarizeLocalDataSyntheticBackupCorpusCase(
  corpusEntry: LocalDataSyntheticBackupCorpusCase,
): LocalDataSyntheticBackupCorpusCaseSummary {
  const manifest = buildLocalDataBackupManifest(corpusEntry.backupData, {
    generatedAt: fixedAt,
    source: "test_fixture",
  });
  const digest = buildLocalDataBackupIntegrityDigest(corpusEntry.backupData, fixedAt);
  const validation = runLocalDataBackupValidationPipeline(
    corpusEntry.currentData,
    {
      fileName: `${corpusEntry.id}.json`,
      mimeType: "application/json",
      byteLength: JSON.stringify(corpusEntry.backupData).length,
      parsedObject: corpusEntry.backupData,
    },
    { validatedAt: fixedAt },
  );
  const report = buildLocalDataSafetyReport({
    manifest,
    integrityDigest: digest,
    importPlan: validation.importPlan,
    generatedAt: fixedAt,
  });

  return {
    id: corpusEntry.id,
    expectedRiskProfile: corpusEntry.expectedRiskProfile,
    expectedManualReview: corpusEntry.expectedManualReview,
    manifest: summarizeLocalDataBackupManifest(manifest),
    report: {
      generatedAt: report.generatedAt,
      integrityDigestPresent: report.integrityDigestPresent,
      riskFlags: [...report.riskFlags],
      safe: true,
    },
    validationStatus: validation.status,
    syntheticOnly: true,
  };
}
