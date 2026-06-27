import { LocalDataSafetyError } from "./errors";
import {
  buildDocumentSafeSummary,
  counterCount,
  customersFrom,
  documentKind,
  documentLifecycle,
  documentRiskFlags,
  documentStatus,
  documentsFrom,
  expensesFrom,
  increment,
  isProtectedDocument,
  nowIso,
  providersFrom,
  uniqueRiskFlags,
} from "./helpers";
import type {
  LocalDataBackupManifest,
  LocalDataBackupManifestOptions,
  LocalDataBackupManifestSummary,
  LocalDataProtectedDocumentRef,
  LocalDataRiskFlag,
  LocalDataSafetyAppData,
} from "./types";

// PHASE2D2_BACKUP_MANIFEST_CONTRACT_V1

function buildProtectedRef(
  document: ReturnType<typeof documentsFrom>[number],
): LocalDataProtectedDocumentRef {
  const summary = buildDocumentSafeSummary(document);
  return {
    documentRef: summary.documentRef,
    kind: summary.kind,
    status: summary.status,
    lifecycle: summary.lifecycle,
    integrityLock: summary.integrityLock,
    number: summary.number,
    year: summary.year,
    snapshotHashPresent: summary.snapshotHashPresent,
    pdfSnapshotHashPresent: summary.pdfSnapshotHashPresent,
  };
}

export function buildLocalDataBackupManifest(
  appData: LocalDataSafetyAppData,
  options: LocalDataBackupManifestOptions = {},
): LocalDataBackupManifest {
  const documents = documentsFrom(appData);
  const protectedDocuments = documents.filter(isProtectedDocument);
  const riskFlags: LocalDataRiskFlag[] = [];
  const documentKinds: Record<string, number> = {};
  const documentStatuses: Record<string, number> = {};
  const lifecycleCounts: Record<string, number> = {};

  for (const document of documents) {
    increment(documentKinds, documentKind(document));
    increment(documentStatuses, documentStatus(document) ?? "unknown");
    increment(lifecycleCounts, documentLifecycle(document) ?? "unknown");
    riskFlags.push(...documentRiskFlags(document));
  }

  if (counterCount(appData) > 0) riskFlags.push("counter_state_present");

  return {
    marker: "PHASE2D2_BACKUP_MANIFEST_CONTRACT_V1",
    manifestVersion: options.manifestVersion ?? "local-data-backup-manifest-v1",
    generatedAt: options.generatedAt ?? nowIso(),
    source: options.source ?? "local_app_data",
    integrityDigest: options.integrityDigest,
    totals: {
      documents: documents.length,
      customers: customersFrom(appData).length,
      providers: providersFrom(appData).length,
      expenses: expensesFrom(appData).length,
      counters: counterCount(appData),
      protectedDocuments: protectedDocuments.length,
      draftDocuments: documents.length - protectedDocuments.length,
    },
    documentKinds,
    documentStatuses,
    lifecycleCounts,
    riskFlags: uniqueRiskFlags(riskFlags),
    protectedDocumentRefs: protectedDocuments.map(buildProtectedRef),
  };
}

export function validateLocalDataBackupManifest(
  manifest: LocalDataBackupManifest,
): LocalDataBackupManifest {
  if (manifest.marker !== "PHASE2D2_BACKUP_MANIFEST_CONTRACT_V1") {
    throw new LocalDataSafetyError("INVALID_MANIFEST", "Invalid backup manifest marker.");
  }
  if (manifest.manifestVersion !== "local-data-backup-manifest-v1") {
    throw new LocalDataSafetyError("INVALID_MANIFEST", "Invalid backup manifest version.");
  }
  if (!manifest.generatedAt || Number.isNaN(Date.parse(manifest.generatedAt))) {
    throw new LocalDataSafetyError("INVALID_MANIFEST", "Invalid backup manifest date.");
  }
  if (manifest.totals.documents < manifest.totals.protectedDocuments) {
    throw new LocalDataSafetyError("INVALID_MANIFEST", "Protected document count is invalid.");
  }
  if (manifest.protectedDocumentRefs.length !== manifest.totals.protectedDocuments) {
    throw new LocalDataSafetyError("INVALID_MANIFEST", "Protected document refs are incomplete.");
  }
  return manifest;
}

export function summarizeLocalDataBackupManifest(
  manifest: LocalDataBackupManifest,
): LocalDataBackupManifestSummary {
  const validated = validateLocalDataBackupManifest(manifest);
  return {
    manifestVersion: validated.manifestVersion,
    generatedAt: validated.generatedAt,
    source: validated.source,
    totals: { ...validated.totals },
    riskFlags: [...validated.riskFlags],
  };
}
