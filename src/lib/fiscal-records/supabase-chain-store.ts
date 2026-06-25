import {
  FISCAL_RECORD_CHAIN_LOCAL_STAGING_SCHEMA_VERSION,
  type FiscalChainHeadState,
  type FiscalRecordChainPersistenceConflictReason,
  type FiscalRecordChainPersistenceRejectionReason,
  type FiscalRecordWithChainCreateInput,
  type FiscalRecordWithChainLocalStagingRecord,
  type FiscalRecordWithChainRepositoryStore,
  type FiscalRecordWithChainStoreResult,
} from "./chain-persistence";
import type { FiscalRecordType } from "./types";

assertServerOnlyModule();

export interface SupabaseFiscalRecordChainStoreErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface SupabaseFiscalRecordChainQueryResult<T> {
  data: T;
  error: SupabaseFiscalRecordChainStoreErrorLike | null;
}

export interface SupabaseFiscalRecordChainFilterBuilder<T>
  extends PromiseLike<SupabaseFiscalRecordChainQueryResult<T[] | null>> {
  eq(column: string, value: unknown): SupabaseFiscalRecordChainFilterBuilder<T>;
  maybeSingle(): Promise<SupabaseFiscalRecordChainQueryResult<T | null>>;
}

export interface SupabaseFiscalRecordChainRpcBuilder<T> {
  single(): Promise<SupabaseFiscalRecordChainQueryResult<T>>;
}

export interface SupabaseFiscalRecordChainLocalStagingClient {
  from(table: string): {
    select(
      columns?: string,
    ): SupabaseFiscalRecordChainFilterBuilder<Record<string, unknown>>;
  };
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): SupabaseFiscalRecordChainRpcBuilder<Record<string, unknown> | null>;
}

export class FiscalRecordChainLocalStagingStoreError extends Error {
  readonly operation: string;
  readonly causeCode?: string;

  constructor(operation: string, error: SupabaseFiscalRecordChainStoreErrorLike) {
    super(error.message ?? `Error de base de datos en ${operation}.`);
    this.name = "FiscalRecordChainLocalStagingStoreError";
    this.operation = operation;
    this.causeCode = error.code;
  }
}

const FISCAL_CHAIN_HEAD_COLUMNS = [
  "user_id",
  "environment",
  "issuer_nif",
  "last_record_id",
  "last_hash",
  "record_count",
  "updated_at",
].join(", ");

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adapter Supabase de cadena fiscal solo puede cargarse en servidor.",
    );
  }
}

function assertNoError(
  operation: string,
  error: SupabaseFiscalRecordChainStoreErrorLike | null,
): asserts error is null {
  if (error) throw new FiscalRecordChainLocalStagingStoreError(operation, error);
}

function stringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new FiscalRecordChainLocalStagingStoreError("map_rpc_row", {
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
    throw new FiscalRecordChainLocalStagingStoreError("map_rpc_row", {
      message: `Columna ${key} invalida.`,
    });
  }
  return value;
}

function numberField(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== "number") {
    throw new FiscalRecordChainLocalStagingStoreError("map_rpc_row", {
      message: `Columna ${key} invalida o ausente.`,
    });
  }
  return value;
}

function parseEnvironment(value: string): "test" | "production" {
  if (value === "test" || value === "production") return value;
  throw new FiscalRecordChainLocalStagingStoreError("map_rpc_row", {
    message: `environment no soportado: ${value}`,
  });
}

function parseRecordTypeCandidate(value: string): FiscalRecordType {
  if (value === "alta" || value === "anulacion") return value;
  throw new FiscalRecordChainLocalStagingStoreError("map_rpc_row", {
    message: `record_type_candidate no soportado: ${value}`,
  });
}

function parseHashAlgorithm(value: string): "sha256-candidate" {
  if (value === "sha256-candidate") return value;
  throw new FiscalRecordChainLocalStagingStoreError("map_rpc_row", {
    message: `hash_algorithm no soportado: ${value}`,
  });
}

function parseSchemaVersion(value: string): "phase2b4m-chain-local-staging-v1" {
  if (value === FISCAL_RECORD_CHAIN_LOCAL_STAGING_SCHEMA_VERSION) return value;
  throw new FiscalRecordChainLocalStagingStoreError("map_rpc_row", {
    message: `schema_version no soportado: ${value}`,
  });
}

function parseResultStatus(
  value: string,
): FiscalRecordWithChainStoreResult["status"] {
  if (value === "created" || value === "existing" || value === "rejected" || value === "conflict") {
    return value;
  }
  throw new FiscalRecordChainLocalStagingStoreError("map_rpc_row", {
    message: `result_status no soportado: ${value}`,
  });
}

function parseRejectionReason(
  value: string | null,
): FiscalRecordChainPersistenceRejectionReason {
  const allowed: FiscalRecordChainPersistenceRejectionReason[] = [
    "operation_not_found",
    "operation_not_processing",
    "invoice_identity_missing",
    "identity_or_snapshot_missing",
    "record_hash_invalid",
    "unsupported_hash_algorithm",
    "unsupported_schema_version",
    "unsupported_operation_type",
  ];
  if (value && allowed.includes(value as FiscalRecordChainPersistenceRejectionReason)) {
    return value as FiscalRecordChainPersistenceRejectionReason;
  }
  throw new FiscalRecordChainLocalStagingStoreError("map_rpc_row", {
    message: `reason no soportado: ${value ?? "null"}`,
  });
}

function parseConflictReason(
  value: string | null,
): FiscalRecordChainPersistenceConflictReason {
  const allowed: FiscalRecordChainPersistenceConflictReason[] = [
    "record_chain_head_changed",
    "existing_record_without_chain",
    "chain_state_unavailable",
  ];
  if (value && allowed.includes(value as FiscalRecordChainPersistenceConflictReason)) {
    return value as FiscalRecordChainPersistenceConflictReason;
  }
  throw new FiscalRecordChainLocalStagingStoreError("map_rpc_row", {
    message: `reason no soportado: ${value ?? "null"}`,
  });
}

export function mapFiscalChainHeadRowToState(
  row: Record<string, unknown>,
): FiscalChainHeadState {
  return {
    userId: stringField(row, "user_id"),
    environment: parseEnvironment(stringField(row, "environment")),
    issuerNif: stringField(row, "issuer_nif"),
    lastRecordId: nullableStringField(row, "last_record_id"),
    lastHash: nullableStringField(row, "last_hash"),
    recordCount: numberField(row, "record_count"),
    updatedAt: stringField(row, "updated_at"),
  };
}

export function mapFiscalRecordWithChainRpcRowToRecord(
  row: Record<string, unknown>,
): FiscalRecordWithChainLocalStagingRecord {
  return {
    id: stringField(row, "record_id"),
    userId: stringField(row, "record_user_id"),
    operationId: stringField(row, "record_operation_id"),
    invoiceIdentityId: stringField(row, "record_invoice_identity_id"),
    serverDocumentId: stringField(row, "record_server_document_id"),
    environment: parseEnvironment(stringField(row, "record_environment")),
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

export function mapFiscalRecordWithChainRpcRowToChain(
  row: Record<string, unknown>,
): FiscalChainHeadState {
  return {
    userId: stringField(row, "chain_user_id"),
    environment: parseEnvironment(stringField(row, "chain_environment")),
    issuerNif: stringField(row, "chain_issuer_nif"),
    lastRecordId: nullableStringField(row, "chain_last_record_id"),
    lastHash: nullableStringField(row, "chain_last_hash"),
    recordCount: numberField(row, "chain_record_count"),
    updatedAt: stringField(row, "chain_updated_at"),
  };
}

export function mapFiscalRecordWithChainRpcRowToResult(
  row: Record<string, unknown>,
): FiscalRecordWithChainStoreResult {
  const status = parseResultStatus(stringField(row, "result_status"));

  if (status === "rejected") {
    return {
      status,
      reason: parseRejectionReason(nullableStringField(row, "reason")),
      message:
        nullableStringField(row, "message") ??
        "La persistencia atomica local fue rechazada.",
    };
  }

  if (status === "conflict") {
    return {
      status,
      reason: parseConflictReason(nullableStringField(row, "reason")),
      message:
        nullableStringField(row, "message") ??
        "La persistencia atomica local encontro un conflicto.",
    };
  }

  return {
    status,
    record: mapFiscalRecordWithChainRpcRowToRecord(row),
    chain: mapFiscalRecordWithChainRpcRowToChain(row),
    atomicity: "postgres_rpc",
  };
}

export class SupabaseFiscalRecordChainLocalStagingStore
  implements FiscalRecordWithChainRepositoryStore
{
  constructor(private readonly client: SupabaseFiscalRecordChainLocalStagingClient) {}

  async findFiscalChainHead(input: {
    userId: string;
    environment: "test" | "production";
    issuerNif: string;
  }): Promise<FiscalChainHeadState | null> {
    const { data, error } = await this.client
      .from("fiscal_chain_state")
      .select(FISCAL_CHAIN_HEAD_COLUMNS)
      .eq("user_id", input.userId)
      .eq("environment", input.environment)
      .eq("issuer_nif", input.issuerNif)
      .maybeSingle();
    assertNoError("find_fiscal_chain_head", error);
    return data ? mapFiscalChainHeadRowToState(data) : null;
  }

  async createFiscalRecordWithChainLocalStaging(
    input: FiscalRecordWithChainCreateInput,
  ): Promise<FiscalRecordWithChainStoreResult> {
    const { data, error } = await this.client
      .rpc("create_fiscal_record_with_chain_local_staging", {
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
    assertNoError("create_fiscal_record_with_chain_local_staging", error);
    if (!data) {
      throw new FiscalRecordChainLocalStagingStoreError(
        "create_fiscal_record_with_chain_local_staging",
        { message: "La RPC no devolvio datos." },
      );
    }
    return mapFiscalRecordWithChainRpcRowToResult(data);
  }
}
