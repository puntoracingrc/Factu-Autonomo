import { buildDocumentSyncSafeSummary } from "./sync-policy";
import type {
  DocumentSyncAllowedMutationPlan,
  DocumentSyncMutationPlan,
} from "./sync-planner";
import type { DocumentSyncStoreRecord } from "./sync-store";
import type {
  DocumentSyncConflict,
  DocumentSyncConflictReason,
  DocumentSyncCurrentState,
  DocumentSyncIntegrityLock,
  DocumentSyncLifecycle,
  DocumentSyncRiskFlag,
} from "./types";
import type {
  DocumentSyncSupabaseConflictRow,
} from "./supabase-contract";

// PHASE2C14_SUPABASE_SYNC_SAFE_MAPPING_V1
assertServerOnlyModule();

export const DOCUMENT_SYNC_SUPABASE_DOCUMENT_COLUMNS = [
  "id",
  "user_id",
  "scope_id",
  "local_document_id",
  "version",
  "document_lifecycle",
  "integrity_lock",
  "status_legacy",
  "payload_hash",
  "snapshot_hash",
  "pdf_content_hash",
  "numserie",
  "document_series",
  "created_at",
  "updated_at",
].join(", ");

export const DOCUMENT_SYNC_SUPABASE_CONFLICT_COLUMNS = [
  "id",
  "user_id",
  "scope_id",
  "server_document_id",
  "local_document_id",
  "conflict_type",
  "incoming_payload_hash",
  "server_payload_hash",
  "local_version",
  "remote_version",
  "expected_version",
  "resolution_status",
  "created_at",
  "resolved_at",
].join(", ");

export class DocumentSyncSupabaseMappingError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "DocumentSyncSupabaseMappingError";
    this.field = field;
  }
}

export interface DocumentSyncSupabaseDraftUpdateInput {
  updatedAt?: string;
  payloadHash?: string | null;
  snapshotHash?: string | null;
  pdfSnapshotHash?: string | null;
  documentNumber?: string | null;
  documentSeries?: string | null;
  statusLegacy?: string | null;
  lifecycle?: DocumentSyncLifecycle;
  integrityLock?: DocumentSyncIntegrityLock;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El mapper Supabase de sincronizacion documental solo puede cargarse en servidor.",
    );
  }
}

function stringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DocumentSyncSupabaseMappingError(
      `Columna segura ausente o invalida: ${key}.`,
      key,
    );
  }
  return value;
}

function optionalStringField(
  row: Record<string, unknown>,
  key: string,
): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new DocumentSyncSupabaseMappingError(
      `Columna segura invalida: ${key}.`,
      key,
    );
  }
  return value;
}

function numberField(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new DocumentSyncSupabaseMappingError(
      `Columna version ausente o invalida: ${key}.`,
      key,
    );
  }
  return value;
}

function parseLifecycle(value: string): DocumentSyncLifecycle {
  if (value === "draft" || value === "issued" || value === "canceled") {
    return value;
  }
  throw new DocumentSyncSupabaseMappingError(
    "document_lifecycle no soportado.",
    "document_lifecycle",
  );
}

function parseIntegrityLock(value: string): DocumentSyncIntegrityLock {
  if (value === "unlocked" || value === "locked") return value;
  throw new DocumentSyncSupabaseMappingError(
    "integrity_lock no soportado.",
    "integrity_lock",
  );
}

function rowFromUnknown(row: unknown): Record<string, unknown> {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new DocumentSyncSupabaseMappingError("Fila Supabase invalida.");
  }
  return row as Record<string, unknown>;
}

function conflictReasonFromType(
  value: DocumentSyncSupabaseConflictRow["conflict_type"],
): DocumentSyncConflictReason {
  switch (value) {
    case "version":
      return "expected_version_mismatch";
    case "payload":
      return "same_version_conflict";
    case "delete":
      return "document_not_found";
    case "snapshot":
    case "numbering":
    case "integrity_lock":
    case "unknown":
      return "remote_ahead";
  }
}

function parseConflictType(
  value: string,
): DocumentSyncSupabaseConflictRow["conflict_type"] {
  if (
    value === "version" ||
    value === "snapshot" ||
    value === "delete" ||
    value === "numbering" ||
    value === "integrity_lock" ||
    value === "payload" ||
    value === "unknown"
  ) {
    return value;
  }
  throw new DocumentSyncSupabaseMappingError(
    "conflict_type no soportado.",
    "conflict_type",
  );
}

function riskFlagsFromConflictType(
  value: DocumentSyncSupabaseConflictRow["conflict_type"],
): DocumentSyncRiskFlag[] {
  switch (value) {
    case "version":
      return ["version_conflict"];
    case "snapshot":
      return ["snapshot_hash_change"];
    case "numbering":
      return ["emitted_numbering_change"];
    case "integrity_lock":
      return ["protected_locked_document"];
    case "delete":
      return ["document_not_found"];
    case "payload":
    case "unknown":
      return [];
  }
}

function conflictTypeFromReason(
  reason: DocumentSyncConflictReason,
): DocumentSyncSupabaseConflictRow["conflict_type"] {
  switch (reason) {
    case "expected_version_mismatch":
    case "remote_ahead":
    case "local_ahead":
    case "same_version_conflict":
      return "version";
    case "document_not_found":
      return "delete";
    case "document_already_exists":
      return "payload";
  }
}

function maybeSet(
  row: Record<string, unknown>,
  key: string,
  value: string | number | null | undefined,
): void {
  if (value !== undefined) row[key] = value;
}

export function mapSupabaseDocumentRowToSyncCurrentState(
  row: unknown,
): DocumentSyncCurrentState {
  const safeRow = rowFromUnknown(row);
  return {
    exists: true,
    documentId: stringField(safeRow, "id"),
    localDocumentId: stringField(safeRow, "local_document_id"),
    userId: stringField(safeRow, "user_id"),
    scopeId: optionalStringField(safeRow, "scope_id") ?? undefined,
    version: numberField(safeRow, "version"),
    payloadHash: optionalStringField(safeRow, "payload_hash"),
    snapshotHash: optionalStringField(safeRow, "snapshot_hash"),
    pdfSnapshotHash: optionalStringField(safeRow, "pdf_content_hash"),
    documentNumber: optionalStringField(safeRow, "numserie"),
    documentSeries: optionalStringField(safeRow, "document_series"),
    lifecycle: parseLifecycle(stringField(safeRow, "document_lifecycle")),
    integrityLock: parseIntegrityLock(stringField(safeRow, "integrity_lock")),
    statusLegacy: optionalStringField(safeRow, "status_legacy"),
    updatedAt: optionalStringField(safeRow, "updated_at") ?? undefined,
  };
}

export function mapSupabaseDocumentRowToStoreRecord(
  row: unknown,
): DocumentSyncStoreRecord {
  const current = mapSupabaseDocumentRowToSyncCurrentState(row);
  return {
    documentId: current.documentId,
    localDocumentId: current.localDocumentId,
    userId: current.userId,
    scopeId: current.scopeId,
    version: current.version,
    payloadHash: current.payloadHash,
    snapshotHash: current.snapshotHash,
    pdfSnapshotHash: current.pdfSnapshotHash,
    documentNumber: current.documentNumber,
    documentSeries: current.documentSeries,
    lifecycle: current.lifecycle,
    integrityLock: current.integrityLock,
    statusLegacy: current.statusLegacy,
    updatedAt: current.updatedAt,
  };
}

export function mapDocumentSyncRecordToSupabaseInsert(
  record: DocumentSyncStoreRecord,
  now: string,
): Record<string, unknown> {
  return {
    id: record.documentId,
    user_id: record.userId,
    scope_id: record.scopeId ?? null,
    local_document_id: record.localDocumentId,
    version: record.version,
    document_lifecycle: record.lifecycle,
    integrity_lock: record.integrityLock,
    status_legacy: record.statusLegacy ?? "borrador",
    payload_hash: record.payloadHash ?? null,
    snapshot_hash: record.snapshotHash ?? null,
    pdf_content_hash: record.pdfSnapshotHash ?? null,
    numserie: record.documentNumber ?? null,
    document_series: record.documentSeries ?? null,
    created_at: now,
    updated_at: record.updatedAt ?? now,
  };
}

export function mapDocumentSyncRecordToSupabaseUpdate(
  record: DocumentSyncStoreRecord,
  now: string,
): Record<string, unknown> {
  const row = mapDocumentSyncRecordToSupabaseInsert(record, now);
  delete row.id;
  delete row.user_id;
  delete row.scope_id;
  delete row.local_document_id;
  delete row.created_at;
  return row;
}

export function mapSyncMutationToSupabaseDraftUpdate(
  plan: DocumentSyncMutationPlan,
  input: DocumentSyncSupabaseDraftUpdateInput = {},
): Record<string, unknown> {
  if (plan.status !== "allowedMutation") {
    throw new DocumentSyncSupabaseMappingError(
      "Solo un plan allowedMutation puede mapearse a update de borrador.",
    );
  }

  const allowedPlan = plan as DocumentSyncAllowedMutationPlan;
  const row: Record<string, unknown> = {
    version: allowedPlan.nextVersion,
    updated_at: input.updatedAt,
    document_lifecycle:
      input.lifecycle ?? allowedPlan.safeSummary.lifecycle ?? "draft",
    integrity_lock:
      input.integrityLock ?? allowedPlan.safeSummary.integrityLock ?? "unlocked",
    status_legacy:
      input.statusLegacy ?? allowedPlan.safeSummary.statusLegacy ?? "borrador",
  };

  maybeSet(row, "payload_hash", input.payloadHash);
  maybeSet(row, "snapshot_hash", input.snapshotHash);
  maybeSet(row, "pdf_content_hash", input.pdfSnapshotHash);
  maybeSet(
    row,
    "numserie",
    input.documentNumber ?? allowedPlan.safeSummary.documentNumber,
  );
  maybeSet(
    row,
    "document_series",
    input.documentSeries ?? allowedPlan.safeSummary.documentSeries,
  );

  return row;
}

export function mapSupabaseConflictRowToSyncConflict(
  row: unknown,
): DocumentSyncConflict {
  const safeRow = rowFromUnknown(row);
  const conflictType = parseConflictType(stringField(safeRow, "conflict_type"));
  const localDocumentId = stringField(safeRow, "local_document_id");
  const userId = stringField(safeRow, "user_id");
  const scopeId = optionalStringField(safeRow, "scope_id") ?? undefined;
  const documentId =
    optionalStringField(safeRow, "server_document_id") ?? undefined;
  const localVersion = safeRow.local_version;
  const remoteVersion = safeRow.remote_version;
  const expectedVersion = safeRow.expected_version;
  const safeSummary = buildDocumentSyncSafeSummary(
    {
      operationKind: "sync_local_backup",
      documentId,
      localDocumentId,
      candidateVersion: typeof localVersion === "number" ? localVersion : undefined,
      expectedVersion:
        typeof expectedVersion === "number" ? expectedVersion : undefined,
      requestedResponseShape: "safe_summary",
      context: {
        userId,
        scopeId,
        userIdSource: "server",
      },
    },
    null,
    riskFlagsFromConflictType(conflictType),
  );

  return {
    documentId,
    localDocumentId,
    serverDerivedUserId: userId,
    serverDerivedScopeId: scopeId,
    localVersion: typeof localVersion === "number" ? localVersion : undefined,
    remoteVersion: typeof remoteVersion === "number" ? remoteVersion : undefined,
    expectedVersion:
      typeof expectedVersion === "number" ? expectedVersion : undefined,
    conflictReason: conflictReasonFromType(conflictType),
    safeSummary,
  };
}

export function mapSyncConflictToSupabaseConflictInsert(
  conflict: DocumentSyncConflict,
  input: {
    id: string;
    createdAt: string;
  },
): Record<string, unknown> {
  return {
    id: input.id,
    user_id: conflict.serverDerivedUserId,
    scope_id: conflict.serverDerivedScopeId ?? null,
    server_document_id: conflict.documentId ?? null,
    local_document_id: conflict.localDocumentId,
    conflict_type: conflictTypeFromReason(conflict.conflictReason),
    incoming_payload_hash: null,
    server_payload_hash: null,
    local_version: conflict.localVersion ?? null,
    remote_version: conflict.remoteVersion ?? null,
    expected_version: conflict.expectedVersion ?? null,
    resolution_status: "open",
    created_at: input.createdAt,
    resolved_at: null,
  };
}
