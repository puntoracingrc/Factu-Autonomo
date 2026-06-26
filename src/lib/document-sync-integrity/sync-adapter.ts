import { planDocumentSyncMutation } from "./sync-planner";
import {
  createInMemoryDocumentSyncStore,
  type DocumentSyncStore,
  type DocumentSyncStoreRecord,
  type DocumentSyncStoreScope,
} from "./sync-store";
import { buildDocumentSyncSafeSummary } from "./sync-policy";
import type {
  DocumentSyncCandidate,
  DocumentSyncConflict,
  DocumentSyncCurrentState,
  DocumentSyncDecisionStatus,
  DocumentSyncSafeSummary,
} from "./types";

// PHASE2C9_LOCAL_STAGING_SYNC_ADAPTER_V1
assertServerOnlyModule();

export type LocalStagingDocumentSyncAdapterResult =
  | {
      status: "accepted";
      decisionStatus: Extract<DocumentSyncDecisionStatus, "accepted">;
      safeSummary: DocumentSyncSafeSummary;
      version: number;
    }
  | {
      status: "rejected";
      decisionStatus: Extract<DocumentSyncDecisionStatus, "rejected">;
      reason: string;
      message: string;
      safeSummary: DocumentSyncSafeSummary;
    }
  | {
      status: "conflict";
      decisionStatus: Extract<DocumentSyncDecisionStatus, "conflict">;
      conflict: DocumentSyncConflict;
      safeSummary: DocumentSyncSafeSummary;
    }
  | {
      status: "noop";
      decisionStatus: Extract<DocumentSyncDecisionStatus, "noop">;
      reason: "no_effective_change" | "protected_remote_preserved";
      safeSummary: DocumentSyncSafeSummary;
    };

export interface LocalStagingDocumentSyncSafeState {
  scope: DocumentSyncStoreScope;
  total: number;
  records: DocumentSyncSafeSummary[];
}

export interface LocalStagingDocumentSyncConflictReport {
  scope: DocumentSyncStoreScope;
  totalConflicts: number;
  conflicts: DocumentSyncConflict[];
}

export interface LocalStagingDocumentSyncAdapter {
  plan: typeof planDocumentSyncMutation;
  apply(candidate: DocumentSyncCandidate): LocalStagingDocumentSyncAdapterResult;
  getSafeState(scope: DocumentSyncStoreScope): LocalStagingDocumentSyncSafeState;
  getConflictReport(
    scope: DocumentSyncStoreScope,
  ): LocalStagingDocumentSyncConflictReport;
  readonly store: DocumentSyncStore;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adaptador local/staging de sincronizacion documental solo puede cargarse en servidor.",
    );
  }
}

function scopeFromCandidate(candidate: DocumentSyncCandidate): DocumentSyncStoreScope {
  return {
    userId: candidate.context.userId,
    scopeId: candidate.context.scopeId,
  };
}

function currentStateFromRecord(
  record: DocumentSyncStoreRecord,
): DocumentSyncCurrentState {
  return {
    exists: true,
    documentId: record.documentId,
    localDocumentId: record.localDocumentId,
    userId: record.userId,
    scopeId: record.scopeId,
    version: record.version,
    payloadHash: record.payloadHash,
    snapshotHash: record.snapshotHash,
    pdfSnapshotHash: record.pdfSnapshotHash,
    documentNumber: record.documentNumber,
    documentSeries: record.documentSeries,
    lifecycle: record.lifecycle,
    integrityLock: record.integrityLock,
    statusLegacy: record.statusLegacy,
    updatedAt: record.updatedAt,
  };
}

function findCurrent(
  store: DocumentSyncStore,
  candidate: DocumentSyncCandidate,
): DocumentSyncStoreRecord | null {
  const scope = scopeFromCandidate(candidate);
  if (candidate.documentId) {
    const byId = store.getById(candidate.documentId, scope);
    if (byId) return byId;
  }

  return (
    store
      .listByScope(scope)
      .find((record) => record.localDocumentId === candidate.localDocumentId) ??
    null
  );
}

function syntheticDocumentId(candidate: DocumentSyncCandidate): string {
  return candidate.documentId ?? `SYNTHETIC_ONLY_LOCAL_${candidate.localDocumentId}`;
}

function recordFromCandidate(
  candidate: DocumentSyncCandidate,
  current: DocumentSyncStoreRecord | null,
  version: number,
): DocumentSyncStoreRecord {
  return {
    documentId: current?.documentId ?? syntheticDocumentId(candidate),
    localDocumentId: current?.localDocumentId ?? candidate.localDocumentId,
    userId: candidate.context.userId,
    scopeId: candidate.context.scopeId,
    version,
    payloadHash: candidate.payloadHash ?? current?.payloadHash,
    snapshotHash: candidate.snapshotHash ?? current?.snapshotHash,
    pdfSnapshotHash: candidate.pdfSnapshotHash ?? current?.pdfSnapshotHash,
    documentNumber: candidate.documentNumber ?? current?.documentNumber,
    documentSeries: candidate.documentSeries ?? current?.documentSeries,
    lifecycle: candidate.lifecycle ?? current?.lifecycle ?? "draft",
    integrityLock: candidate.integrityLock ?? current?.integrityLock ?? "unlocked",
    statusLegacy: candidate.statusLegacy ?? current?.statusLegacy ?? "borrador",
    updatedAt: candidate.updatedAt ?? current?.updatedAt,
  };
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

export function createLocalStagingDocumentSyncAdapter(
  store: DocumentSyncStore = createInMemoryDocumentSyncStore(),
): LocalStagingDocumentSyncAdapter {
  return {
    store,
    plan: planDocumentSyncMutation,

    apply(candidate) {
      const current = findCurrent(store, candidate);
      const currentState = current ? currentStateFromRecord(current) : null;
      const plan = planDocumentSyncMutation(candidate, currentState);

      if (plan.status === "conflict") {
        store.recordConflict(plan.conflict);
        return {
          status: "conflict",
          decisionStatus: "conflict",
          conflict: plan.conflict,
          safeSummary: plan.safeSummary,
        };
      }

      if (plan.status === "rejectedMutation") {
        return {
          status: "rejected",
          decisionStatus: "rejected",
          reason: plan.rejection.code,
          message: plan.rejection.message,
          safeSummary: plan.safeSummary,
        };
      }

      if (plan.status === "noop") {
        return {
          status: "noop",
          decisionStatus: "noop",
          reason: plan.reason,
          safeSummary: plan.safeSummary,
        };
      }

      const nextRecord = recordFromCandidate(candidate, current, plan.nextVersion);
      const storeResult =
        candidate.operationKind === "create_draft"
          ? store.putDraft(nextRecord)
          : candidate.operationKind === "delete_draft"
            ? store.deleteDraft(
                nextRecord.documentId,
                candidate.expectedVersion ?? 0,
                scopeFromCandidate(candidate),
              )
            : store.updateDraft(nextRecord, candidate.expectedVersion ?? 0);

      if (storeResult.status === "conflict") {
        store.recordConflict(storeResult.conflict);
        return {
          status: "conflict",
          decisionStatus: "conflict",
          conflict: storeResult.conflict,
          safeSummary: storeResult.safeSummary,
        };
      }

      if (storeResult.status === "rejected") {
        return {
          status: "rejected",
          decisionStatus: "rejected",
          reason: storeResult.error.code,
          message: storeResult.error.message,
          safeSummary: storeResult.safeSummary,
        };
      }

      return {
        status: "accepted",
        decisionStatus: "accepted",
        safeSummary: storeResult.safeSummary,
        version:
          storeResult.status === "accepted"
            ? storeResult.record.version
            : plan.nextVersion,
      };
    },

    getSafeState(scope) {
      const records = store.listByScope(scope).map(safeSummaryForRecord);
      return {
        scope: { ...scope },
        total: records.length,
        records,
      };
    },

    getConflictReport(scope) {
      const conflicts = store.getConflicts(scope);
      return {
        scope: { ...scope },
        totalConflicts: conflicts.length,
        conflicts,
      };
    },
  };
}
