import type {
  LocalStagingDocumentSyncAdapter,
  LocalStagingDocumentSyncSafeState,
} from "./sync-adapter";
import type {
  DocumentSyncStore,
  DocumentSyncStoreRecord,
  DocumentSyncStoreScope,
} from "./sync-store";
import { buildDocumentSyncSafeSummary } from "./sync-policy";
import type {
  DocumentSyncConflict,
  DocumentSyncSafeSummary,
} from "./types";

// PHASE2C11_LOCAL_STAGING_SYNC_SAFE_REPORT_V1
assertServerOnlyModule();

export interface DocumentSyncSafeReport {
  scope: DocumentSyncStoreScope;
  totalDrafts: number;
  totalProtected: number;
  totalConflicts: number;
  latestVersion: number;
  rejectedReasons: Record<string, number>;
  safeSummaries: DocumentSyncSafeSummary[];
  conflicts: DocumentSyncConflict[];
}

type ReportSource = LocalStagingDocumentSyncAdapter | DocumentSyncStore;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El reporte local/staging de sincronizacion documental solo puede cargarse en servidor.",
    );
  }
}

function isAdapter(source: ReportSource): source is LocalStagingDocumentSyncAdapter {
  return "getSafeState" in source && "getConflictReport" in source;
}

function isProtectedSummary(summary: DocumentSyncSafeSummary): boolean {
  return (
    summary.lifecycle !== "draft" ||
    summary.integrityLock === "locked" ||
    Boolean(summary.statusLegacy && summary.statusLegacy !== "borrador")
  );
}

function safeSummaryForRecord(
  record: DocumentSyncStoreRecord,
): DocumentSyncSafeSummary {
  return buildDocumentSyncSafeSummary({
    operationKind: "sync_local_backup",
    documentId: record.documentId,
    localDocumentId: record.localDocumentId,
    candidateVersion: record.version,
    payloadHash: record.payloadHash,
    snapshotHash: record.snapshotHash,
    pdfSnapshotHash: record.pdfSnapshotHash,
    documentNumber: record.documentNumber,
    documentSeries: record.documentSeries,
    lifecycle: record.lifecycle,
    integrityLock: record.integrityLock,
    statusLegacy: record.statusLegacy,
    requestedResponseShape: "safe_summary",
    context: {
      userId: record.userId,
      scopeId: record.scopeId,
      userIdSource: "test",
    },
  });
}

function stateFromStore(
  store: DocumentSyncStore,
  scope: DocumentSyncStoreScope,
): LocalStagingDocumentSyncSafeState {
  const records = store.listByScope(scope).map(safeSummaryForRecord);
  return {
    scope: { ...scope },
    total: records.length,
    records,
  };
}

function increment(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

export function buildDocumentSyncSafeReport(
  source: ReportSource,
  scope: DocumentSyncStoreScope,
): DocumentSyncSafeReport {
  const state = isAdapter(source)
    ? source.getSafeState(scope)
    : stateFromStore(source, scope);
  const conflicts = isAdapter(source)
    ? source.getConflictReport(scope).conflicts
    : source.getConflicts(scope);
  const rejectedReasons: Record<string, number> = {};

  for (const conflict of conflicts) {
    const reasons = new Set([
      conflict.conflictReason,
      ...conflict.safeSummary.riskFlags,
    ]);
    for (const reason of reasons) increment(rejectedReasons, reason);
  }

  return {
    scope: { ...scope },
    totalDrafts: state.records.filter(
      (summary) => summary.lifecycle === "draft" && !isProtectedSummary(summary),
    ).length,
    totalProtected: state.records.filter(isProtectedSummary).length,
    totalConflicts: conflicts.length,
    latestVersion: Math.max(
      0,
      ...state.records.map((summary) => summary.currentVersion ?? summary.candidateVersion ?? 0),
    ),
    rejectedReasons,
    safeSummaries: state.records,
    conflicts,
  };
}
