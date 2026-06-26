import { DocumentSyncPolicyError } from "./errors";
import {
  buildDocumentSyncConflict,
  isExpectedVersionSatisfied,
} from "./sync-conflicts";
import type {
  DocumentSyncCandidate,
  DocumentSyncCurrentState,
  DocumentSyncDecision,
  DocumentSyncLifecycle,
  DocumentSyncOperationKind,
  DocumentSyncPolicyErrorCode,
  DocumentSyncRiskFlag,
  DocumentSyncSafeSummary,
} from "./types";

assertServerOnlyModule();

const MUTATION_REQUIRES_EXPECTED_VERSION = new Set<DocumentSyncOperationKind>([
  "update_draft",
  "delete_draft",
  "sync_local_backup",
  "restore_draft_backup",
  "attach_snapshot_reference",
]);

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La politica de sincronizacion documental solo puede cargarse en servidor.",
    );
  }
}

function hasOwn<T extends object, K extends PropertyKey>(
  value: T,
  key: K,
): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueFlags(flags: DocumentSyncRiskFlag[]): DocumentSyncRiskFlag[] {
  return [...new Set(flags)];
}

function isLegacyNonDraft(statusLegacy: string | null | undefined): boolean {
  return Boolean(statusLegacy && statusLegacy !== "borrador");
}

function isProtectedLifecycle(lifecycle: DocumentSyncLifecycle): boolean {
  return lifecycle === "issued" || lifecycle === "canceled";
}

function nullableStringChanged(
  candidateValue: string | null | undefined,
  currentValue: string | null | undefined,
): boolean {
  if (candidateValue === undefined) return false;
  return (candidateValue ?? null) !== (currentValue ?? null);
}

export function buildDocumentSyncSafeSummary(
  candidate: DocumentSyncCandidate,
  currentState?: DocumentSyncCurrentState | null,
  riskFlags: DocumentSyncRiskFlag[] = [],
): DocumentSyncSafeSummary {
  return {
    operationKind: candidate.operationKind,
    documentId: currentState?.documentId ?? candidate.documentId,
    localDocumentId: candidate.localDocumentId,
    serverDerivedUserId: candidate.context.userId,
    serverDerivedScopeId: candidate.context.scopeId,
    requestId: candidate.context.requestId,
    currentVersion: currentState?.version,
    expectedVersion: candidate.expectedVersion,
    candidateVersion: candidate.candidateVersion,
    lifecycle: currentState?.lifecycle ?? candidate.lifecycle,
    integrityLock: currentState?.integrityLock ?? candidate.integrityLock,
    statusLegacy: currentState?.statusLegacy ?? candidate.statusLegacy,
    documentNumber: currentState?.documentNumber ?? candidate.documentNumber,
    documentSeries: currentState?.documentSeries ?? candidate.documentSeries,
    payloadHashPresent: Boolean(candidate.payloadHash ?? currentState?.payloadHash),
    snapshotHashPresent: Boolean(
      candidate.snapshotHash ?? currentState?.snapshotHash,
    ),
    pdfSnapshotHashPresent: Boolean(
      candidate.pdfSnapshotHash ?? currentState?.pdfSnapshotHash,
    ),
    riskFlags: uniqueFlags(riskFlags),
  };
}

function rejected(
  candidate: DocumentSyncCandidate,
  currentState: DocumentSyncCurrentState | null | undefined,
  code: DocumentSyncPolicyErrorCode,
  riskFlags: DocumentSyncRiskFlag[],
): DocumentSyncDecision {
  const safeSummary = buildDocumentSyncSafeSummary(
    candidate,
    currentState,
    riskFlags,
  );
  return {
    status: "rejected",
    operationKind: candidate.operationKind,
    error: new DocumentSyncPolicyError(code, safeSummary.riskFlags),
    safeSummary,
    riskFlags: safeSummary.riskFlags,
  };
}

function accepted(
  candidate: DocumentSyncCandidate,
  currentState: DocumentSyncCurrentState | null | undefined,
  riskFlags: DocumentSyncRiskFlag[] = [],
): DocumentSyncDecision {
  const safeSummary = buildDocumentSyncSafeSummary(
    candidate,
    currentState,
    riskFlags,
  );
  return {
    status: "accepted",
    operationKind: candidate.operationKind,
    safeSummary,
    riskFlags: safeSummary.riskFlags,
  };
}

function noop(
  candidate: DocumentSyncCandidate,
  currentState: DocumentSyncCurrentState | null | undefined,
  reason: "no_effective_change" | "protected_remote_preserved",
  riskFlags: DocumentSyncRiskFlag[] = [],
): DocumentSyncDecision {
  const safeSummary = buildDocumentSyncSafeSummary(candidate, currentState, [
    ...riskFlags,
    reason === "no_effective_change" ? "no_effective_change" : "protected_issued_document",
  ]);

  return {
    status: "noop",
    operationKind: candidate.operationKind,
    reason,
    safeSummary,
    riskFlags: safeSummary.riskFlags,
  };
}

function conflict(
  candidate: DocumentSyncCandidate,
  currentState: DocumentSyncCurrentState | null | undefined,
  riskFlags: DocumentSyncRiskFlag[],
  conflictReason:
    | "document_not_found"
    | "document_already_exists"
    | "expected_version_mismatch",
): DocumentSyncDecision {
  const safeSummary = buildDocumentSyncSafeSummary(
    candidate,
    currentState,
    riskFlags,
  );

  return {
    status: "conflict",
    operationKind: candidate.operationKind,
    conflict: buildDocumentSyncConflict({
      candidate,
      currentState,
      conflictReason,
      safeSummary,
    }),
    safeSummary,
    riskFlags: safeSummary.riskFlags,
  };
}

function hasEffectiveChange(
  candidate: DocumentSyncCandidate,
  currentState: DocumentSyncCurrentState,
): boolean {
  if (candidate.operationKind === "delete_draft") return true;

  return (
    nullableStringChanged(candidate.payloadHash, currentState.payloadHash) ||
    nullableStringChanged(candidate.statusLegacy, currentState.statusLegacy) ||
    nullableStringChanged(candidate.snapshotHash, currentState.snapshotHash) ||
    nullableStringChanged(
      candidate.pdfSnapshotHash,
      currentState.pdfSnapshotHash,
    ) ||
    nullableStringChanged(candidate.documentNumber, currentState.documentNumber) ||
    nullableStringChanged(candidate.documentSeries, currentState.documentSeries) ||
    (candidate.lifecycle !== undefined &&
      candidate.lifecycle !== currentState.lifecycle) ||
    (candidate.integrityLock !== undefined &&
      candidate.integrityLock !== currentState.integrityLock)
  );
}

function unsafeResponseShape(candidate: DocumentSyncCandidate): boolean {
  return (
    candidate.requestedResponseShape === "full_record" ||
    candidate.requestedResponseShape === "select_all"
  );
}

function shouldPreserveProtectedRemote(
  candidate: DocumentSyncCandidate,
  currentState: DocumentSyncCurrentState | null | undefined,
): boolean {
  if (candidate.operationKind !== "preserve_issued_remote" || !currentState) {
    return false;
  }

  return (
    isProtectedLifecycle(currentState.lifecycle) ||
    currentState.integrityLock === "locked" ||
    isLegacyNonDraft(currentState.statusLegacy)
  );
}

export function evaluateDocumentSyncPolicy(
  candidate: DocumentSyncCandidate,
  currentState?: DocumentSyncCurrentState | null,
): DocumentSyncDecision {
  const flags: DocumentSyncRiskFlag[] = [];

  if (!isNonEmpty(candidate.localDocumentId) || !isNonEmpty(candidate.context.userId)) {
    return rejected(candidate, currentState, "INVALID_CANDIDATE", flags);
  }

  if (unsafeResponseShape(candidate)) {
    return rejected(candidate, currentState, "UNSAFE_RESPONSE_SHAPE", [
      "unsafe_response_shape",
    ]);
  }

  if (candidate.payloadUserId) {
    flags.push("payload_identity_ignored");
    if (candidate.payloadUserId !== candidate.context.userId) {
      return rejected(candidate, currentState, "CROSS_USER_MUTATION", [
        ...flags,
        "cross_user_mutation",
      ]);
    }
  }

  if (candidate.payloadScopeId) {
    flags.push("payload_identity_ignored");
    if (
      candidate.context.scopeId !== undefined &&
      candidate.payloadScopeId !== candidate.context.scopeId
    ) {
      return rejected(candidate, currentState, "CROSS_SCOPE_MUTATION", [
        ...flags,
        "cross_scope_mutation",
      ]);
    }
  }

  if (currentState) {
    if (currentState.userId !== candidate.context.userId) {
      return rejected(candidate, currentState, "CROSS_USER_MUTATION", [
        ...flags,
        "cross_user_mutation",
      ]);
    }

    if (
      currentState.scopeId !== undefined &&
      currentState.scopeId !== candidate.context.scopeId
    ) {
      return rejected(candidate, currentState, "CROSS_SCOPE_MUTATION", [
        ...flags,
        "cross_scope_mutation",
      ]);
    }
  }

  if (candidate.operationKind === "reject_locked_mutation") {
    return rejected(candidate, currentState, "LOCKED_DOCUMENT", [
      ...flags,
      "protected_locked_document",
    ]);
  }

  if (shouldPreserveProtectedRemote(candidate, currentState)) {
    return noop(candidate, currentState, "protected_remote_preserved", [
      ...flags,
      "protected_issued_document",
    ]);
  }

  if (currentState?.lifecycle === "canceled") {
    return rejected(candidate, currentState, "CANCELED_DOCUMENT", [
      ...flags,
      "protected_canceled_document",
    ]);
  }

  if (currentState?.lifecycle === "issued") {
    return rejected(candidate, currentState, "PROTECTED_DOCUMENT", [
      ...flags,
      "protected_issued_document",
    ]);
  }

  if (currentState?.integrityLock === "locked") {
    return rejected(candidate, currentState, "LOCKED_DOCUMENT", [
      ...flags,
      "protected_locked_document",
    ]);
  }

  if (currentState && isLegacyNonDraft(currentState.statusLegacy)) {
    return rejected(candidate, currentState, "LEGACY_NON_DRAFT", [
      ...flags,
      "protected_legacy_non_draft",
    ]);
  }

  if (
    currentState?.snapshotHash &&
    nullableStringChanged(candidate.snapshotHash, currentState.snapshotHash)
  ) {
    return rejected(candidate, currentState, "SNAPSHOT_HASH_CHANGE", [
      ...flags,
      "snapshot_hash_change",
    ]);
  }

  if (
    currentState?.pdfSnapshotHash &&
    nullableStringChanged(candidate.pdfSnapshotHash, currentState.pdfSnapshotHash)
  ) {
    return rejected(candidate, currentState, "PDF_SNAPSHOT_HASH_CHANGE", [
      ...flags,
      "pdf_snapshot_hash_change",
    ]);
  }

  if (
    currentState &&
    (nullableStringChanged(candidate.documentNumber, currentState.documentNumber) ||
      nullableStringChanged(candidate.documentSeries, currentState.documentSeries))
  ) {
    return rejected(candidate, currentState, "EMITTED_NUMBERING_CHANGE", [
      ...flags,
      "emitted_numbering_change",
    ]);
  }

  if (!currentState && candidate.operationKind !== "create_draft") {
    return conflict(candidate, currentState, [...flags, "document_not_found"], "document_not_found");
  }

  if (currentState && candidate.operationKind === "create_draft") {
    return conflict(
      candidate,
      currentState,
      [...flags, "duplicate_document"],
      "document_already_exists",
    );
  }

  if (!currentState) {
    if (candidate.lifecycle && candidate.lifecycle !== "draft") {
      return rejected(candidate, currentState, "PROTECTED_DOCUMENT", [
        ...flags,
        "protected_issued_document",
      ]);
    }
    if (candidate.integrityLock === "locked") {
      return rejected(candidate, currentState, "LOCKED_DOCUMENT", [
        ...flags,
        "protected_locked_document",
      ]);
    }
    return accepted(candidate, currentState, flags);
  }

  if (
    MUTATION_REQUIRES_EXPECTED_VERSION.has(candidate.operationKind) &&
    !Number.isInteger(candidate.expectedVersion)
  ) {
    return rejected(candidate, currentState, "MISSING_EXPECTED_VERSION", [
      ...flags,
      "missing_expected_version",
    ]);
  }

  if (
    MUTATION_REQUIRES_EXPECTED_VERSION.has(candidate.operationKind) &&
    !isExpectedVersionSatisfied(candidate.expectedVersion, currentState.version)
  ) {
    return conflict(
      candidate,
      currentState,
      [...flags, "version_conflict"],
      "expected_version_mismatch",
    );
  }

  if (!hasEffectiveChange(candidate, currentState)) {
    return noop(candidate, currentState, "no_effective_change", flags);
  }

  if (
    candidate.operationKind === "attach_snapshot_reference" &&
    (hasOwn(currentState, "snapshotHash") || hasOwn(currentState, "pdfSnapshotHash")) &&
    (currentState.snapshotHash || currentState.pdfSnapshotHash)
  ) {
    return rejected(candidate, currentState, "SNAPSHOT_HASH_CHANGE", [
      ...flags,
      "snapshot_hash_change",
    ]);
  }

  return accepted(candidate, currentState, flags);
}
