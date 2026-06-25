import {
  FISCAL_RECORD_LOCAL_STAGING_SCHEMA_VERSION,
  type FiscalRecordHeadCandidate,
  type FiscalRecordLocalPersistenceConflictReason,
  type FiscalRecordLocalPersistenceRejectionReason,
  type FiscalRecordLocalStagingCreateInput,
  type FiscalRecordLocalStagingRecord,
  type FiscalRecordLocalStagingRepositoryStore,
  type FiscalRecordLocalStagingStoreResult,
} from "./repository";
import type { FiscalRecordType } from "./types";

assertServerOnlyModule();

export interface SupabaseFiscalRecordStoreErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface SupabaseFiscalRecordQueryResult<T> {
  data: T;
  error: SupabaseFiscalRecordStoreErrorLike | null;
}

export interface SupabaseFiscalRecordFilterBuilder<T>
  extends PromiseLike<SupabaseFiscalRecordQueryResult<T[] | null>> {
  eq(column: string, value: unknown): SupabaseFiscalRecordFilterBuilder<T>;
  order(
    column: string,
    options?: { ascending?: boolean },
  ): SupabaseFiscalRecordFilterBuilder<T>;
  limit(count: number): SupabaseFiscalRecordFilterBuilder<T>;
  maybeSingle(): Promise<SupabaseFiscalRecordQueryResult<T | null>>;
}

export interface SupabaseFiscalRecordRpcBuilder<T> {
  single(): Promise<SupabaseFiscalRecordQueryResult<T>>;
}

export interface SupabaseFiscalRecordLocalStagingClient {
  from(table: string): {
    select(
      columns?: string,
    ): SupabaseFiscalRecordFilterBuilder<Record<string, unknown>>;
  };
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): SupabaseFiscalRecordRpcBuilder<Record<string, unknown> | null>;
}

export class FiscalRecordLocalStagingStoreError extends Error {
  readonly operation: string;
  readonly causeCode?: string;

  constructor(operation: string, error: SupabaseFiscalRecordStoreErrorLike) {
    super(error.message ?? `Error de base de datos en ${operation}.`);
    this.name = "FiscalRecordLocalStagingStoreError";
    this.operation = operation;
    this.causeCode = error.code;
  }
}

const FISCAL_RECORD_HEAD_COLUMNS = [
  "id",
  "record_hash",
  "record_sequence",
].join(", ");

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adapter Supabase de registros fiscales solo puede cargarse en servidor.",
    );
  }
}

function assertNoError(
  operation: string,
  error: SupabaseFiscalRecordStoreErrorLike | null,
): asserts error is null {
  if (error) throw new FiscalRecordLocalStagingStoreError(operation, error);
}

function stringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new FiscalRecordLocalStagingStoreError("map_rpc_row", {
      message: `Columna ${key} invalida o ausente.`,
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
    throw new FiscalRecordLocalStagingStoreError("map_rpc_row", {
      message: `Columna ${key} invalida.`,
    });
  }
  return value;
}

function numberField(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== "number") {
    throw new FiscalRecordLocalStagingStoreError("map_rpc_row", {
      message: `Columna ${key} invalida o ausente.`,
    });
  }
  return value;
}

function parseRecordTypeCandidate(value: string): FiscalRecordType {
  if (value === "alta" || value === "anulacion") return value;
  throw new FiscalRecordLocalStagingStoreError("map_rpc_row", {
    message: `record_type_candidate no soportado: ${value}`,
  });
}

function parseHashAlgorithm(value: string): "sha256-candidate" {
  if (value === "sha256-candidate") return value;
  throw new FiscalRecordLocalStagingStoreError("map_rpc_row", {
    message: `hash_algorithm no soportado: ${value}`,
  });
}

function parseSchemaVersion(value: string): "phase2b4l-local-staging-v1" {
  if (value === FISCAL_RECORD_LOCAL_STAGING_SCHEMA_VERSION) return value;
  throw new FiscalRecordLocalStagingStoreError("map_rpc_row", {
    message: `schema_version no soportado: ${value}`,
  });
}

function parseResultStatus(
  value: string,
): FiscalRecordLocalStagingStoreResult["status"] {
  if (value === "created" || value === "existing" || value === "rejected" || value === "conflict") {
    return value;
  }
  throw new FiscalRecordLocalStagingStoreError("map_rpc_row", {
    message: `result_status no soportado: ${value}`,
  });
}

function parseRejectionReason(
  value: string | null,
): FiscalRecordLocalPersistenceRejectionReason {
  const allowed: FiscalRecordLocalPersistenceRejectionReason[] = [
    "operation_not_found",
    "operation_not_processing",
    "invoice_identity_missing",
    "issuer_nif_missing",
    "numserie_missing",
    "fecha_expedicion_missing",
    "document_snapshot_hash_missing",
    "record_hash_missing",
    "unsupported_hash_algorithm",
    "unsupported_schema_version",
    "unsupported_operation_type",
  ];
  if (value && allowed.includes(value as FiscalRecordLocalPersistenceRejectionReason)) {
    return value as FiscalRecordLocalPersistenceRejectionReason;
  }
  throw new FiscalRecordLocalStagingStoreError("map_rpc_row", {
    message: `reason no soportado: ${value ?? "null"}`,
  });
}

function parseConflictReason(
  value: string | null,
): FiscalRecordLocalPersistenceConflictReason {
  if (value === "record_chain_head_changed") return value;
  throw new FiscalRecordLocalStagingStoreError("map_rpc_row", {
    message: `reason no soportado: ${value ?? "null"}`,
  });
}

function hasRecord(row: Record<string, unknown>): boolean {
  return typeof row.record_id === "string";
}

export function mapFiscalRecordHeadRowToCandidate(
  row: Record<string, unknown>,
): FiscalRecordHeadCandidate {
  return {
    id: stringField(row, "id"),
    recordHash: stringField(row, "record_hash"),
    recordSequence: numberField(row, "record_sequence"),
  };
}

export function mapFiscalRecordLocalStagingRpcRowToRecord(
  row: Record<string, unknown>,
): FiscalRecordLocalStagingRecord {
  return {
    id: stringField(row, "record_id"),
    userId: stringField(row, "record_user_id"),
    operationId: stringField(row, "record_operation_id"),
    invoiceIdentityId: stringField(row, "record_invoice_identity_id"),
    serverDocumentId: stringField(row, "record_server_document_id"),
    environment: stringField(row, "record_environment") as "test" | "production",
    issuerNif: stringField(row, "record_issuer_nif"),
    numserie: stringField(row, "record_numserie"),
    fechaExpedicion: stringField(row, "record_fecha_expedicion"),
    recordTypeCandidate: parseRecordTypeCandidate(
      stringField(row, "record_type_candidate"),
    ),
    recordSequence: numberField(row, "record_sequence"),
    previousRecordId: nullableStringField(row, "record_previous_record_id"),
    previousHash: nullableStringField(row, "record_previous_hash"),
    recordHash: stringField(row, "record_hash"),
    hashAlgorithm: parseHashAlgorithm(stringField(row, "record_hash_algorithm")),
    recordTimestamp: stringField(row, "record_timestamp"),
    documentSnapshotHash: stringField(row, "record_document_snapshot_hash"),
    pdfContentHash: nullableStringField(row, "record_pdf_content_hash"),
    schemaVersion: parseSchemaVersion(stringField(row, "record_schema_version")),
    rendererVersion: nullableStringField(row, "record_renderer_version"),
    createdAt: stringField(row, "record_created_at"),
  };
}

export function mapFiscalRecordLocalStagingRpcRowToResult(
  row: Record<string, unknown>,
): FiscalRecordLocalStagingStoreResult {
  const status = parseResultStatus(stringField(row, "result_status"));

  if (status === "rejected") {
    return {
      status,
      reason: parseRejectionReason(nullableStringField(row, "reason")),
      message:
        nullableStringField(row, "message") ??
        "La persistencia local del registro fiscal fue rechazada.",
    };
  }

  if (status === "conflict") {
    return {
      status,
      reason: parseConflictReason(nullableStringField(row, "reason")),
      message:
        nullableStringField(row, "message") ??
        "La persistencia local del registro fiscal encontro un conflicto.",
    };
  }

  if (!hasRecord(row)) {
    throw new FiscalRecordLocalStagingStoreError("map_rpc_row", {
      message: "La RPC no devolvio registro fiscal.",
    });
  }

  return {
    status,
    record: mapFiscalRecordLocalStagingRpcRowToRecord(row),
    atomicity: "postgres_rpc",
  };
}

export class SupabaseFiscalRecordLocalStagingStore
  implements FiscalRecordLocalStagingRepositoryStore
{
  constructor(private readonly client: SupabaseFiscalRecordLocalStagingClient) {}

  async findLatestFiscalRecordHead(input: {
    userId: string;
    environment: "test" | "production";
    issuerNif: string;
  }): Promise<FiscalRecordHeadCandidate | null> {
    const { data, error } = await this.client
      .from("fiscal_records")
      .select(FISCAL_RECORD_HEAD_COLUMNS)
      .eq("user_id", input.userId)
      .eq("environment", input.environment)
      .eq("issuer_nif", input.issuerNif)
      .order("record_sequence", { ascending: false })
      .limit(1)
      .maybeSingle();
    assertNoError("find_latest_fiscal_record_head", error);
    return data ? mapFiscalRecordHeadRowToCandidate(data) : null;
  }

  async createFiscalRecordLocalStaging(
    input: FiscalRecordLocalStagingCreateInput,
  ): Promise<FiscalRecordLocalStagingStoreResult> {
    const { data, error } = await this.client
      .rpc("create_fiscal_record_local_staging", {
        p_user_id: input.userId,
        p_operation_id: input.operationId,
        p_expected_previous_record_id: input.expectedPreviousRecordId,
        p_expected_previous_hash: input.expectedPreviousHash,
        p_record_hash: input.recordHash,
        p_hash_algorithm: input.hashAlgorithm,
        p_record_timestamp: input.recordTimestamp,
        p_schema_version: input.schemaVersion,
        p_renderer_version: input.rendererVersion ?? null,
      })
      .single();
    assertNoError("create_fiscal_record_local_staging", error);
    if (!data) {
      throw new FiscalRecordLocalStagingStoreError(
        "create_fiscal_record_local_staging",
        { message: "La RPC no devolvio datos." },
      );
    }
    return mapFiscalRecordLocalStagingRpcRowToResult(data);
  }
}
