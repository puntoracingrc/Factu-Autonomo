export type ServerDocumentLifecycle = "draft" | "issued" | "canceled";

export type ServerDocumentIntegrityLock = "unlocked" | "locked";

export type ServerDocumentType = "factura" | "presupuesto" | "recibo";

export type ServerDocumentKind =
  | "standard"
  | "rectificativa"
  | "quote"
  | "receipt";

export type ServerDocumentConflictReason =
  | "missing_expected_version"
  | "version_mismatch"
  | "locked_document"
  | "forbidden_lifecycle_transition"
  | "snapshot_mutation"
  | "not_found"
  | "forbidden_user_scope"
  | "duplicate_local_document_id";

export type ServerDocumentChangeType =
  | "create"
  | "update"
  | "issue"
  | "cancel"
  | "sync"
  | "repair";

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export interface ServerDocumentRecord {
  id: string;
  userId: string;
  localDocumentId: string;
  documentType: ServerDocumentType;
  documentKind: ServerDocumentKind;
  documentLifecycle: ServerDocumentLifecycle;
  integrityLock: ServerDocumentIntegrityLock;
  statusLegacy: string;
  version: number;
  payload: JsonObject;
  documentSnapshot?: JsonObject | null;
  pdfSnapshot?: JsonObject | null;
  snapshotHash?: string | null;
  pdfContentHash?: string | null;
  issuerNif?: string | null;
  numserie?: string | null;
  issueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  issuedAt?: string | null;
  canceledAt?: string | null;
}

export interface ServerDocumentCreateDraftInput {
  localDocumentId: string;
  documentType: ServerDocumentType;
  documentKind: ServerDocumentKind;
  statusLegacy: string;
  payload: JsonObject;
}

export interface ServerDocumentMutationInput {
  expectedVersion?: number;
  payload?: JsonObject;
  documentLifecycle?: ServerDocumentLifecycle;
  integrityLock?: ServerDocumentIntegrityLock;
  statusLegacy?: string;
  documentSnapshot?: JsonObject | null;
  pdfSnapshot?: JsonObject | null;
  snapshotHash?: string | null;
  pdfContentHash?: string | null;
}

export interface ServerDocumentVersionRecord {
  id: string;
  serverDocumentId: string;
  userId: string;
  version: number;
  changeType: ServerDocumentChangeType;
  payloadBeforeHash?: string | null;
  payloadAfterHash?: string | null;
  changedFields: string[];
  actorType: "server" | "sync" | "system";
  actorId?: string | null;
  createdAt: string;
}

export interface ServerDocumentConflictRecord {
  id: string;
  userId: string;
  serverDocumentId?: string | null;
  localDocumentId: string;
  conflictType: ServerDocumentConflictReason;
  incomingPayloadHash?: string | null;
  serverPayloadHash?: string | null;
  resolutionStatus: "open" | "ignored" | "resolved";
  createdAt: string;
  resolvedAt?: string | null;
}

export type ServerDocumentMutationDecision =
  | {
      status: "accepted";
      document: ServerDocumentRecord;
      version: ServerDocumentVersionRecord;
    }
  | {
      status: "rejected";
      reason: ServerDocumentConflictReason;
      message: string;
    }
  | {
      status: "conflict";
      reason: ServerDocumentConflictReason;
      message: string;
      conflict: ServerDocumentConflictRecord;
    };
