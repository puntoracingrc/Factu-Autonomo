import { ServerDocumentError } from "./errors";
import type { ServerDocumentRepositoryStore } from "./repository";
import type {
  JsonObject,
  ServerDocumentConflictReason,
  ServerDocumentConflictRecord,
  ServerDocumentRecord,
  ServerDocumentVersionRecord,
} from "./types";

assertServerOnlyModule();

export interface SupabaseStoreErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface SupabaseQueryResult<T> {
  data: T;
  error: SupabaseStoreErrorLike | null;
}

export interface SupabaseFilterBuilder<T> extends PromiseLike<SupabaseQueryResult<T[] | null>> {
  eq(column: string, value: unknown): SupabaseFilterBuilder<T>;
  select(columns?: string): SupabaseFilterBuilder<T>;
  maybeSingle(): Promise<SupabaseQueryResult<T | null>>;
  single(): Promise<SupabaseQueryResult<T>>;
}

export interface SupabaseServerDocumentClient {
  from(table: string): {
    select(columns?: string): SupabaseFilterBuilder<Record<string, unknown>>;
    insert(
      row: Record<string, unknown> | Record<string, unknown>[],
    ): SupabaseFilterBuilder<Record<string, unknown>>;
    update(row: Record<string, unknown>): SupabaseFilterBuilder<Record<string, unknown>>;
  };
}

export type DbDocumentConflictType =
  | "version"
  | "integrity_lock"
  | "snapshot"
  | "delete"
  | "numbering"
  | "payload"
  | "legacy"
  | "unknown";

export class ServerDocumentStoreError extends Error {
  readonly operation: string;
  readonly causeCode?: string;

  constructor(operation: string, error: SupabaseStoreErrorLike) {
    super(error.message ?? `Error de base de datos en ${operation}.`);
    this.name = "ServerDocumentStoreError";
    this.operation = operation;
    this.causeCode = error.code;
  }
}

const SERVER_DOCUMENT_COLUMNS = [
  "id",
  "user_id",
  "local_document_id",
  "document_type",
  "document_kind",
  "document_lifecycle",
  "integrity_lock",
  "status_legacy",
  "version",
  "payload",
  "document_snapshot",
  "pdf_snapshot",
  "snapshot_hash",
  "pdf_content_hash",
  "issuer_nif",
  "numserie",
  "issue_date",
  "created_at",
  "updated_at",
  "issued_at",
  "canceled_at",
].join(", ");

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adapter Supabase de documentos solo puede cargarse en servidor.",
    );
  }
}

function assertNoError(
  operation: string,
  error: SupabaseStoreErrorLike | null,
): asserts error is null {
  if (error) throw new ServerDocumentStoreError(operation, error);
}

function stringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new ServerDocumentStoreError("map_row", {
      message: `Columna ${key} inválida o ausente.`,
    });
  }
  return value;
}

function nullableStringField(
  row: Record<string, unknown>,
  key: string,
): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new ServerDocumentStoreError("map_row", {
      message: `Columna ${key} inválida.`,
    });
  }
  return value;
}

function numberField(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== "number") {
    throw new ServerDocumentStoreError("map_row", {
      message: `Columna ${key} inválida o ausente.`,
    });
  }
  return value;
}

function jsonObjectField(
  row: Record<string, unknown>,
  key: string,
): JsonObject {
  const value = row[key];
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new ServerDocumentStoreError("map_row", {
      message: `Columna ${key} debe ser un objeto JSON.`,
    });
  }
  return value as JsonObject;
}

function nullableJsonObjectField(
  row: Record<string, unknown>,
  key: string,
): JsonObject | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ServerDocumentStoreError("map_row", {
      message: `Columna ${key} debe ser un objeto JSON o null.`,
    });
  }
  return value as JsonObject;
}

function parseDocumentType(value: string): ServerDocumentRecord["documentType"] {
  if (value === "factura" || value === "presupuesto" || value === "recibo") {
    return value;
  }
  throw new ServerDocumentStoreError("map_row", {
    message: `document_type no soportado: ${value}`,
  });
}

function parseDocumentKind(value: string): ServerDocumentRecord["documentKind"] {
  if (
    value === "standard" ||
    value === "rectificativa" ||
    value === "quote" ||
    value === "receipt"
  ) {
    return value;
  }
  throw new ServerDocumentStoreError("map_row", {
    message: `document_kind no soportado: ${value}`,
  });
}

function parseDocumentLifecycle(
  value: string,
): ServerDocumentRecord["documentLifecycle"] {
  if (value === "draft" || value === "issued" || value === "canceled") {
    return value;
  }
  throw new ServerDocumentStoreError("map_row", {
    message: `document_lifecycle no soportado: ${value}`,
  });
}

function parseIntegrityLock(
  value: string,
): ServerDocumentRecord["integrityLock"] {
  if (value === "unlocked" || value === "locked") return value;
  throw new ServerDocumentStoreError("map_row", {
    message: `integrity_lock no soportado: ${value}`,
  });
}

export function mapServerDocumentRowToRecord(
  row: Record<string, unknown>,
): ServerDocumentRecord {
  return {
    id: stringField(row, "id"),
    userId: stringField(row, "user_id"),
    localDocumentId: stringField(row, "local_document_id"),
    documentType: parseDocumentType(stringField(row, "document_type")),
    documentKind: parseDocumentKind(stringField(row, "document_kind")),
    documentLifecycle: parseDocumentLifecycle(
      stringField(row, "document_lifecycle"),
    ),
    integrityLock: parseIntegrityLock(stringField(row, "integrity_lock")),
    statusLegacy: stringField(row, "status_legacy"),
    version: numberField(row, "version"),
    payload: jsonObjectField(row, "payload"),
    documentSnapshot: nullableJsonObjectField(row, "document_snapshot"),
    pdfSnapshot: nullableJsonObjectField(row, "pdf_snapshot"),
    snapshotHash: nullableStringField(row, "snapshot_hash"),
    pdfContentHash: nullableStringField(row, "pdf_content_hash"),
    issuerNif: nullableStringField(row, "issuer_nif"),
    numserie: nullableStringField(row, "numserie"),
    issueDate: nullableStringField(row, "issue_date"),
    createdAt: stringField(row, "created_at"),
    updatedAt: stringField(row, "updated_at"),
    issuedAt: nullableStringField(row, "issued_at"),
    canceledAt: nullableStringField(row, "canceled_at"),
  };
}

export function mapServerDocumentRecordToInsert(
  document: ServerDocumentRecord,
): Record<string, unknown> {
  return {
    id: document.id,
    user_id: document.userId,
    local_document_id: document.localDocumentId,
    document_type: document.documentType,
    document_kind: document.documentKind,
    document_lifecycle: document.documentLifecycle,
    integrity_lock: document.integrityLock,
    status_legacy: document.statusLegacy,
    version: document.version,
    payload: document.payload,
    document_snapshot: document.documentSnapshot ?? null,
    pdf_snapshot: document.pdfSnapshot ?? null,
    snapshot_hash: document.snapshotHash ?? null,
    pdf_content_hash: document.pdfContentHash ?? null,
    issuer_nif: document.issuerNif ?? null,
    numserie: document.numserie ?? null,
    issue_date: document.issueDate ?? null,
    created_at: document.createdAt,
    updated_at: document.updatedAt,
    issued_at: document.issuedAt ?? null,
    canceled_at: document.canceledAt ?? null,
  };
}

export function mapServerDocumentRecordToUpdate(
  document: ServerDocumentRecord,
): Record<string, unknown> {
  const row = mapServerDocumentRecordToInsert(document);
  delete row.id;
  delete row.user_id;
  return row;
}

export function mapServerDocumentVersionToInsert(
  version: ServerDocumentVersionRecord,
): Record<string, unknown> {
  return {
    id: version.id,
    server_document_id: version.serverDocumentId,
    user_id: version.userId,
    version: version.version,
    change_type: version.changeType,
    payload_before_hash: version.payloadBeforeHash ?? null,
    payload_after_hash: version.payloadAfterHash ?? null,
    changed_fields: version.changedFields,
    actor_type: version.actorType,
    actor_id: version.actorId ?? null,
    created_at: version.createdAt,
  };
}

export function mapDomainConflictReasonToDbType(
  reason: ServerDocumentConflictReason,
): DbDocumentConflictType {
  switch (reason) {
    case "missing_expected_version":
    case "version_mismatch":
      return "version";
    case "locked_document":
    case "forbidden_lifecycle_transition":
      return "integrity_lock";
    case "snapshot_mutation":
      return "snapshot";
    case "duplicate_local_document_id":
      return "payload";
    case "not_found":
    case "forbidden_user_scope":
      return "unknown";
  }
}

export function mapDocumentConflictToInsert(
  conflict: ServerDocumentConflictRecord,
): Record<string, unknown> {
  return {
    id: conflict.id,
    user_id: conflict.userId,
    server_document_id: conflict.serverDocumentId ?? null,
    local_document_id: conflict.localDocumentId,
    conflict_type: mapDomainConflictReasonToDbType(conflict.conflictType),
    incoming_payload_hash: conflict.incomingPayloadHash ?? null,
    server_payload_hash: conflict.serverPayloadHash ?? null,
    resolution_status: conflict.resolutionStatus,
    created_at: conflict.createdAt,
    resolved_at: conflict.resolvedAt ?? null,
  };
}

export class SupabaseServerDocumentStore
  implements ServerDocumentRepositoryStore
{
  constructor(private readonly client: SupabaseServerDocumentClient) {}

  async findDocumentById(id: string): Promise<ServerDocumentRecord | null> {
    const { data, error } = await this.client
      .from("server_documents")
      .select(SERVER_DOCUMENT_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    assertNoError("find_document_by_id", error);
    return data ? mapServerDocumentRowToRecord(data) : null;
  }

  async findDocumentByLocalId(
    userId: string,
    localDocumentId: string,
  ): Promise<ServerDocumentRecord | null> {
    const { data, error } = await this.client
      .from("server_documents")
      .select(SERVER_DOCUMENT_COLUMNS)
      .eq("user_id", userId)
      .eq("local_document_id", localDocumentId)
      .maybeSingle();

    assertNoError("find_document_by_local_id", error);
    return data ? mapServerDocumentRowToRecord(data) : null;
  }

  async insertDocument(
    document: ServerDocumentRecord,
  ): Promise<ServerDocumentRecord> {
    const { data, error } = await this.client
      .from("server_documents")
      .insert(mapServerDocumentRecordToInsert(document))
      .select(SERVER_DOCUMENT_COLUMNS)
      .single();

    assertNoError("insert_document", error);
    return mapServerDocumentRowToRecord(data);
  }

  async updateDocument(
    document: ServerDocumentRecord,
  ): Promise<ServerDocumentRecord> {
    const { data, error } = await this.client
      .from("server_documents")
      .update(mapServerDocumentRecordToUpdate(document))
      .eq("id", document.id)
      .eq("user_id", document.userId)
      .select(SERVER_DOCUMENT_COLUMNS)
      .single();

    if (error?.code === "PGRST116") {
      throw new ServerDocumentError("DOCUMENT_NOT_FOUND");
    }
    assertNoError("update_document", error);
    return mapServerDocumentRowToRecord(data);
  }

  async insertDocumentVersion(
    version: ServerDocumentVersionRecord,
  ): Promise<void> {
    const { error } = await this.client
      .from("server_document_versions")
      .insert(mapServerDocumentVersionToInsert(version));

    assertNoError("insert_document_version", error);
  }

  async insertDocumentConflict(
    conflict: ServerDocumentConflictRecord,
  ): Promise<void> {
    const { error } = await this.client
      .from("document_conflicts")
      .insert(mapDocumentConflictToInsert(conflict));

    assertNoError("insert_document_conflict", error);
  }
}
