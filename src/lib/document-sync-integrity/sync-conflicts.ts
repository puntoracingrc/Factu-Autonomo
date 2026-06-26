import type {
  DocumentSyncCandidate,
  DocumentSyncConflict,
  DocumentSyncConflictReason,
  DocumentSyncCurrentState,
  DocumentSyncSafeSummary,
} from "./types";

// PHASE2C4_SYNC_CONFLICT_VERSIONING_V1
assertServerOnlyModule();

export type DocumentSyncVersionComparison =
  | "same_version"
  | "remote_ahead"
  | "local_ahead";

export interface DocumentSyncVersionComparisonInput {
  localVersion?: number;
  remoteVersion?: number;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La integridad de sincronizacion documental solo puede cargarse en servidor.",
    );
  }
}

export function compareDocumentSyncVersions(
  input: DocumentSyncVersionComparisonInput,
): DocumentSyncVersionComparison {
  const localVersion = input.localVersion ?? 0;
  const remoteVersion = input.remoteVersion ?? 0;

  if (localVersion === remoteVersion) return "same_version";
  return remoteVersion > localVersion ? "remote_ahead" : "local_ahead";
}

export function isExpectedVersionSatisfied(
  expectedVersion: number | undefined,
  currentVersion: number | undefined,
): boolean {
  if (!Number.isInteger(expectedVersion) || !Number.isInteger(currentVersion)) {
    return false;
  }

  return expectedVersion === currentVersion;
}

export function buildDocumentSyncConflict(input: {
  candidate: DocumentSyncCandidate;
  currentState?: DocumentSyncCurrentState | null;
  conflictReason: DocumentSyncConflictReason;
  safeSummary: DocumentSyncSafeSummary;
}): DocumentSyncConflict {
  const current = input.currentState ?? null;

  return {
    documentId: current?.documentId ?? input.candidate.documentId,
    localDocumentId: input.candidate.localDocumentId,
    serverDerivedUserId: input.candidate.context.userId,
    serverDerivedScopeId: input.candidate.context.scopeId,
    localVersion: input.candidate.candidateVersion,
    remoteVersion: current?.version,
    expectedVersion: input.candidate.expectedVersion,
    conflictReason: input.conflictReason,
    safeSummary: input.safeSummary,
  };
}
