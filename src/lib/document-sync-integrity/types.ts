// PHASE2C2_SERVER_SYNC_INTEGRITY_POLICY_V1
export type DocumentSyncOperationKind =
  | "create_draft"
  | "update_draft"
  | "delete_draft"
  | "sync_local_backup"
  | "restore_draft_backup"
  | "attach_snapshot_reference"
  | "preserve_issued_remote"
  | "reject_locked_mutation";

export type DocumentSyncDecisionStatus =
  | "accepted"
  | "rejected"
  | "conflict"
  | "noop";

export type DocumentSyncLifecycle = "draft" | "issued" | "canceled";

export type DocumentSyncIntegrityLock = "unlocked" | "locked";

export type DocumentSyncResponseShape =
  | "safe_summary"
  | "full_record"
  | "select_all";

export type DocumentSyncRiskFlag =
  | "protected_issued_document"
  | "protected_canceled_document"
  | "protected_locked_document"
  | "protected_legacy_non_draft"
  | "snapshot_hash_change"
  | "pdf_snapshot_hash_change"
  | "emitted_numbering_change"
  | "missing_expected_version"
  | "version_conflict"
  | "payload_identity_ignored"
  | "cross_user_mutation"
  | "cross_scope_mutation"
  | "unsafe_response_shape"
  | "document_not_found"
  | "duplicate_document"
  | "no_effective_change";

export type DocumentSyncPolicyErrorCode =
  | "INVALID_CANDIDATE"
  | "DOCUMENT_NOT_FOUND"
  | "DOCUMENT_ALREADY_EXISTS"
  | "MISSING_EXPECTED_VERSION"
  | "PROTECTED_DOCUMENT"
  | "LOCKED_DOCUMENT"
  | "CANCELED_DOCUMENT"
  | "LEGACY_NON_DRAFT"
  | "SNAPSHOT_HASH_CHANGE"
  | "PDF_SNAPSHOT_HASH_CHANGE"
  | "EMITTED_NUMBERING_CHANGE"
  | "CROSS_USER_MUTATION"
  | "CROSS_SCOPE_MUTATION"
  | "UNSAFE_RESPONSE_SHAPE";

export type DocumentSyncConflictReason =
  | "document_not_found"
  | "document_already_exists"
  | "expected_version_mismatch"
  | "remote_ahead"
  | "local_ahead"
  | "same_version_conflict";

export interface DocumentSyncServerContext {
  userId: string;
  scopeId?: string;
  requestId?: string;
  userIdSource: "server" | "test";
}

export interface DocumentSyncCandidate {
  operationKind: DocumentSyncOperationKind;
  localDocumentId: string;
  documentId?: string;
  expectedVersion?: number;
  candidateVersion?: number;
  payloadHash?: string | null;
  snapshotHash?: string | null;
  pdfSnapshotHash?: string | null;
  documentNumber?: string | null;
  documentSeries?: string | null;
  lifecycle?: DocumentSyncLifecycle;
  integrityLock?: DocumentSyncIntegrityLock;
  statusLegacy?: string | null;
  updatedAt?: string;
  payloadUserId?: string | null;
  payloadScopeId?: string | null;
  requestedResponseShape?: DocumentSyncResponseShape;
  context: DocumentSyncServerContext;
}

export interface DocumentSyncCurrentState {
  exists: true;
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

export interface DocumentSyncSafeSummary {
  operationKind: DocumentSyncOperationKind;
  documentId?: string;
  localDocumentId: string;
  serverDerivedUserId: string;
  serverDerivedScopeId?: string;
  requestId?: string;
  currentVersion?: number;
  expectedVersion?: number;
  candidateVersion?: number;
  lifecycle?: DocumentSyncLifecycle;
  integrityLock?: DocumentSyncIntegrityLock;
  statusLegacy?: string | null;
  documentNumber?: string | null;
  documentSeries?: string | null;
  payloadHashPresent: boolean;
  snapshotHashPresent: boolean;
  pdfSnapshotHashPresent: boolean;
  riskFlags: DocumentSyncRiskFlag[];
}

export interface DocumentSyncConflict {
  documentId?: string;
  localDocumentId: string;
  serverDerivedUserId: string;
  serverDerivedScopeId?: string;
  localVersion?: number;
  remoteVersion?: number;
  expectedVersion?: number;
  conflictReason: DocumentSyncConflictReason;
  safeSummary: DocumentSyncSafeSummary;
}

export type DocumentSyncDecision =
  | {
      status: "accepted";
      operationKind: DocumentSyncOperationKind;
      safeSummary: DocumentSyncSafeSummary;
      riskFlags: DocumentSyncRiskFlag[];
    }
  | {
      status: "rejected";
      operationKind: DocumentSyncOperationKind;
      error: import("./errors").DocumentSyncPolicyError;
      safeSummary: DocumentSyncSafeSummary;
      riskFlags: DocumentSyncRiskFlag[];
    }
  | {
      status: "conflict";
      operationKind: DocumentSyncOperationKind;
      conflict: DocumentSyncConflict;
      safeSummary: DocumentSyncSafeSummary;
      riskFlags: DocumentSyncRiskFlag[];
    }
  | {
      status: "noop";
      operationKind: DocumentSyncOperationKind;
      reason: "no_effective_change" | "protected_remote_preserved";
      safeSummary: DocumentSyncSafeSummary;
      riskFlags: DocumentSyncRiskFlag[];
    };
