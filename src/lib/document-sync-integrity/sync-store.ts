import { DocumentSyncPolicyError } from "./errors";
import {
  buildDocumentSyncConflict,
  isExpectedVersionSatisfied,
} from "./sync-conflicts";
import { buildDocumentSyncSafeSummary } from "./sync-policy";
import type {
  DocumentSyncCandidate,
  DocumentSyncConflict,
  DocumentSyncCurrentState,
  DocumentSyncIntegrityLock,
  DocumentSyncLifecycle,
  DocumentSyncSafeSummary,
} from "./types";

// PHASE2C8_IN_MEMORY_DOCUMENT_SYNC_STORE_V1
assertServerOnlyModule();

export interface DocumentSyncStoreScope {
  userId: string;
  scopeId?: string;
}

export interface DocumentSyncStoreRecord {
  documentId: string;
  localDocumentId: string;
  userId: string;
  scopeId?: string;
  version: number;
  payloadHash?: string | null;
  snapshotHash?: string | null;
  pdfSnapshotHash?: string | null;
  documentNumber?: string | null;
  documentSeries?: string | null;
  lifecycle: DocumentSyncLifecycle;
  integrityLock: DocumentSyncIntegrityLock;
  statusLegacy?: string | null;
  updatedAt?: string;
}

export interface DocumentSyncStoreSnapshot {
  records: DocumentSyncStoreRecord[];
  conflicts: DocumentSyncConflict[];
}

export type DocumentSyncStoreOperationResult =
  | {
      status: "accepted";
      record: DocumentSyncStoreRecord;
      safeSummary: DocumentSyncSafeSummary;
    }
  | {
      status: "deleted";
      documentId: string;
      localDocumentId: string;
      safeSummary: DocumentSyncSafeSummary;
    }
  | {
      status: "rejected";
      error: DocumentSyncPolicyError;
      safeSummary: DocumentSyncSafeSummary;
    }
  | {
      status: "conflict";
      conflict: DocumentSyncConflict;
      safeSummary: DocumentSyncSafeSummary;
    };

export interface DocumentSyncStore {
  getById(
    documentId: string,
    scope: DocumentSyncStoreScope,
  ): DocumentSyncStoreRecord | null;
  listByScope(scope: DocumentSyncStoreScope): DocumentSyncStoreRecord[];
  putDraft(record: DocumentSyncStoreRecord): DocumentSyncStoreOperationResult;
  updateDraft(
    record: DocumentSyncStoreRecord,
    expectedVersion: number,
  ): DocumentSyncStoreOperationResult;
  deleteDraft(
    documentId: string,
    expectedVersion: number,
    scope: DocumentSyncStoreScope,
  ): DocumentSyncStoreOperationResult;
  recordConflict(conflict: DocumentSyncConflict): void;
  getConflicts(scope: DocumentSyncStoreScope): DocumentSyncConflict[];
  snapshot(): DocumentSyncStoreSnapshot;
  reset(): void;
}

export type InMemoryDocumentSyncStore = DocumentSyncStore;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El store local/staging de sincronizacion documental solo puede cargarse en servidor.",
    );
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function scopeKey(scope: DocumentSyncStoreScope): string {
  return `${scope.userId}::${scope.scopeId ?? "default"}`;
}

function recordKey(record: Pick<DocumentSyncStoreRecord, "documentId" | "userId" | "scopeId">): string {
  return `${scopeKey(record)}::${record.documentId}`;
}

function sameScope(
  record: Pick<DocumentSyncStoreRecord, "userId" | "scopeId">,
  scope: DocumentSyncStoreScope,
): boolean {
  return record.userId === scope.userId && (record.scopeId ?? undefined) === scope.scopeId;
}

function isProtected(record: DocumentSyncStoreRecord): boolean {
  return (
    record.lifecycle !== "draft" ||
    record.integrityLock === "locked" ||
    Boolean(record.statusLegacy && record.statusLegacy !== "borrador")
  );
}

function toCurrentState(record: DocumentSyncStoreRecord): DocumentSyncCurrentState {
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

function candidateFromRecord(
  operationKind: DocumentSyncCandidate["operationKind"],
  record: DocumentSyncStoreRecord,
  expectedVersion?: number,
): DocumentSyncCandidate {
  return {
    operationKind,
    documentId: record.documentId,
    localDocumentId: record.localDocumentId,
    expectedVersion,
    candidateVersion: record.version,
    payloadHash: record.payloadHash,
    snapshotHash: record.snapshotHash,
    pdfSnapshotHash: record.pdfSnapshotHash,
    documentNumber: record.documentNumber,
    documentSeries: record.documentSeries,
    lifecycle: record.lifecycle,
    integrityLock: record.integrityLock,
    statusLegacy: record.statusLegacy,
    updatedAt: record.updatedAt,
    requestedResponseShape: "safe_summary",
    context: {
      userId: record.userId,
      scopeId: record.scopeId,
      userIdSource: "test",
    },
  };
}

function rejected(
  code: ConstructorParameters<typeof DocumentSyncPolicyError>[0],
  candidate: DocumentSyncCandidate,
  currentState: DocumentSyncCurrentState | null,
): DocumentSyncStoreOperationResult {
  const error = new DocumentSyncPolicyError(code);
  const safeSummary = buildDocumentSyncSafeSummary(
    candidate,
    currentState,
    error.riskFlags,
  );

  return {
    status: "rejected",
    error,
    safeSummary,
  };
}

function conflict(
  candidate: DocumentSyncCandidate,
  currentState: DocumentSyncCurrentState | null,
): DocumentSyncStoreOperationResult {
  const safeSummary = buildDocumentSyncSafeSummary(candidate, currentState, [
    "version_conflict",
  ]);
  return {
    status: "conflict",
    conflict: buildDocumentSyncConflict({
      candidate,
      currentState,
      conflictReason: currentState
        ? "expected_version_mismatch"
        : "document_not_found",
      safeSummary,
    }),
    safeSummary,
  };
}

export function createInMemoryDocumentSyncStore(
  initialRecords: DocumentSyncStoreRecord[] = [],
): InMemoryDocumentSyncStore {
  const records = new Map<string, DocumentSyncStoreRecord>();
  let conflicts: DocumentSyncConflict[] = [];

  for (const initialRecord of initialRecords) {
    const copied = clone(initialRecord);
    records.set(recordKey(copied), copied);
  }

  return {
    getById(documentId, scope) {
      const record = records.get(`${scopeKey(scope)}::${documentId}`);
      return record ? clone(record) : null;
    },

    listByScope(scope) {
      return [...records.values()]
        .filter((record) => sameScope(record, scope))
        .sort((a, b) => a.documentId.localeCompare(b.documentId))
        .map((record) => clone(record));
    },

    putDraft(record) {
      const incoming = clone(record);
      const key = recordKey(incoming);
      const existing = records.get(key);
      const candidate = candidateFromRecord("create_draft", incoming);

      if (existing) return conflict(candidate, toCurrentState(existing));
      if (isProtected(incoming)) return rejected("PROTECTED_DOCUMENT", candidate, null);

      const stored = {
        ...incoming,
        version: Math.max(1, incoming.version || 1),
      };
      records.set(key, clone(stored));

      return {
        status: "accepted",
        record: clone(stored),
        safeSummary: buildDocumentSyncSafeSummary(candidate, toCurrentState(stored)),
      };
    },

    updateDraft(record, expectedVersion) {
      const incoming = clone(record);
      const key = recordKey(incoming);
      const current = records.get(key);
      const candidate = candidateFromRecord(
        "update_draft",
        incoming,
        expectedVersion,
      );

      if (!current) return conflict(candidate, null);
      const currentState = toCurrentState(current);
      if (isProtected(current)) {
        return rejected("PROTECTED_DOCUMENT", candidate, currentState);
      }
      if (!isExpectedVersionSatisfied(expectedVersion, current.version)) {
        return conflict(candidate, currentState);
      }

      const stored = {
        ...incoming,
        userId: current.userId,
        scopeId: current.scopeId,
        documentId: current.documentId,
        localDocumentId: current.localDocumentId,
        version: current.version + 1,
      };
      records.set(key, clone(stored));

      return {
        status: "accepted",
        record: clone(stored),
        safeSummary: buildDocumentSyncSafeSummary(candidate, toCurrentState(stored)),
      };
    },

    deleteDraft(documentId, expectedVersion, scope) {
      const key = `${scopeKey(scope)}::${documentId}`;
      const current = records.get(key);
      const candidate = candidateFromRecord(
        "delete_draft",
        current ?? {
          documentId,
          localDocumentId: documentId,
          userId: scope.userId,
          scopeId: scope.scopeId,
          version: expectedVersion,
          lifecycle: "draft",
          integrityLock: "unlocked",
          statusLegacy: "borrador",
        },
        expectedVersion,
      );

      if (!current) return conflict(candidate, null);
      const currentState = toCurrentState(current);
      if (isProtected(current)) {
        return rejected("PROTECTED_DOCUMENT", candidate, currentState);
      }
      if (!isExpectedVersionSatisfied(expectedVersion, current.version)) {
        return conflict(candidate, currentState);
      }

      records.delete(key);
      return {
        status: "deleted",
        documentId: current.documentId,
        localDocumentId: current.localDocumentId,
        safeSummary: buildDocumentSyncSafeSummary(candidate, currentState),
      };
    },

    recordConflict(newConflict) {
      conflicts = [...conflicts, clone(newConflict)];
    },

    getConflicts(scope) {
      return conflicts
        .filter(
          (entry) =>
            entry.serverDerivedUserId === scope.userId &&
            (entry.serverDerivedScopeId ?? undefined) === scope.scopeId,
        )
        .map((entry) => clone(entry));
    },

    snapshot() {
      return {
        records: [...records.values()].map((record) => clone(record)),
        conflicts: conflicts.map((entry) => clone(entry)),
      };
    },

    reset() {
      records.clear();
      conflicts = [];
    },
  };
}
