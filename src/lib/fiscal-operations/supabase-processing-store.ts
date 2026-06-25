import { FiscalOperationProcessingError } from "./processing-errors";
import type {
  FiscalOperationProcessingInput,
  FiscalOperationProcessingRejectionReason,
  FiscalOperationProcessingResult,
} from "./processing-types";
import type {
  FiscalEnvironment,
  FiscalOperationRecord,
  FiscalOperationStatus,
  FiscalOperationType,
} from "./types";

assertServerOnlyModule();

export interface SupabaseFiscalOperationProcessingErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface SupabaseFiscalOperationProcessingQueryResult<T> {
  data: T;
  error: SupabaseFiscalOperationProcessingErrorLike | null;
}

export interface SupabaseFiscalOperationProcessingRpcBuilder<T> {
  single(): Promise<SupabaseFiscalOperationProcessingQueryResult<T>>;
}

export interface SupabaseFiscalOperationProcessingClient {
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): SupabaseFiscalOperationProcessingRpcBuilder<Record<string, unknown> | null>;
}

export class FiscalOperationProcessingStoreError extends Error {
  readonly operation: string;
  readonly causeCode?: string;

  constructor(
    operation: string,
    error: SupabaseFiscalOperationProcessingErrorLike,
  ) {
    super(error.message ?? `Error de base de datos en ${operation}.`);
    this.name = "FiscalOperationProcessingStoreError";
    this.operation = operation;
    this.causeCode = error.code;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adapter RPC fiscal solo puede cargarse en servidor.",
    );
  }
}

function assertNoError(
  operation: string,
  error: SupabaseFiscalOperationProcessingErrorLike | null,
): asserts error is null {
  if (error) throw new FiscalOperationProcessingStoreError(operation, error);
}

function stringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new FiscalOperationProcessingStoreError("map_rpc_row", {
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
    throw new FiscalOperationProcessingStoreError("map_rpc_row", {
      message: `Columna ${key} invalida.`,
    });
  }
  return value;
}

function nullableUuidField(
  row: Record<string, unknown>,
  key: string,
): string | null {
  return nullableStringField(row, key);
}

function numberField(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== "number") {
    throw new FiscalOperationProcessingStoreError("map_rpc_row", {
      message: `Columna ${key} invalida o ausente.`,
    });
  }
  return value;
}

function parseResultStatus(
  value: string,
): FiscalOperationProcessingResult["status"] {
  if (
    value === "processing" ||
    value === "existing_processing" ||
    value === "rejected" ||
    value === "conflict"
  ) {
    return value;
  }
  throw new FiscalOperationProcessingStoreError("map_rpc_row", {
    message: `result_status no soportado: ${value}`,
  });
}

function parseReason(
  value: string | null,
): FiscalOperationProcessingRejectionReason {
  const allowed: FiscalOperationProcessingRejectionReason[] = [
    "operation_not_found",
    "operation_status_incompatible",
    "operation_processing_race",
  ];
  if (value && allowed.includes(value as FiscalOperationProcessingRejectionReason)) {
    return value as FiscalOperationProcessingRejectionReason;
  }
  throw new FiscalOperationProcessingStoreError("map_rpc_row", {
    message: `reason no soportado: ${value ?? "null"}`,
  });
}

function parseFiscalOperationType(value: string): FiscalOperationType {
  if (
    value === "alta_inicial" ||
    value === "alta_subsanacion" ||
    value === "anulacion"
  ) {
    return value;
  }
  throw new FiscalOperationProcessingStoreError("map_rpc_row", {
    message: `operation_type no soportado: ${value}`,
  });
}

function parseFiscalEnvironment(value: string): FiscalEnvironment {
  if (value === "test" || value === "production") return value;
  throw new FiscalOperationProcessingStoreError("map_rpc_row", {
    message: `environment no soportado: ${value}`,
  });
}

function parseFiscalOperationStatus(value: string): FiscalOperationStatus {
  if (
    value === "requested" ||
    value === "processing" ||
    value === "completed" ||
    value === "failed_retryable" ||
    value === "failed_final"
  ) {
    return value;
  }
  throw new FiscalOperationProcessingStoreError("map_rpc_row", {
    message: `status no soportado: ${value}`,
  });
}

function hasOperation(row: Record<string, unknown>): boolean {
  return typeof row.operation_id === "string";
}

function operationFromRpcRow(
  row: Record<string, unknown>,
): FiscalOperationRecord {
  return {
    id: stringField(row, "operation_id"),
    userId: stringField(row, "operation_user_id"),
    serverDocumentId: stringField(row, "operation_server_document_id"),
    operationType: parseFiscalOperationType(stringField(row, "operation_type")),
    environment: parseFiscalEnvironment(stringField(row, "operation_environment")),
    idempotencyKey: stringField(row, "operation_idempotency_key"),
    requestedBy: nullableUuidField(row, "operation_requested_by"),
    requestedAt: stringField(row, "operation_requested_at"),
    expectedDocumentVersion: numberField(
      row,
      "operation_expected_document_version",
    ),
    documentSnapshotHash: stringField(
      row,
      "operation_document_snapshot_hash",
    ),
    status: parseFiscalOperationStatus(stringField(row, "operation_status")),
    completedAt: nullableStringField(row, "operation_completed_at"),
    failedAt: nullableStringField(row, "operation_failed_at"),
    failureCode: nullableStringField(row, "operation_failure_code"),
    failureMessage: nullableStringField(row, "operation_failure_message"),
    createdAt: stringField(row, "operation_created_at"),
    updatedAt: stringField(row, "operation_updated_at"),
  };
}

function markedAtValue(value: Date | string | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function mapFiscalOperationProcessingRpcRowToResult(
  row: Record<string, unknown>,
): FiscalOperationProcessingResult {
  const status = parseResultStatus(stringField(row, "result_status"));

  if (status === "rejected") {
    const reason = parseReason(nullableStringField(row, "reason"));
    return {
      status,
      reason,
      message:
        nullableStringField(row, "message") ??
        new FiscalOperationProcessingError(reason).message,
      operation: hasOperation(row) ? operationFromRpcRow(row) : null,
    };
  }

  if (status === "conflict") {
    const reason = parseReason(nullableStringField(row, "reason"));
    return {
      status,
      reason,
      message:
        nullableStringField(row, "message") ??
        new FiscalOperationProcessingError(reason).message,
    };
  }

  return {
    status,
    operation: operationFromRpcRow(row),
    atomicity: "postgres_rpc",
  };
}

export class SupabaseFiscalOperationProcessingStore {
  constructor(
    private readonly client: SupabaseFiscalOperationProcessingClient,
  ) {}

  async markFiscalOperationProcessing(
    input: FiscalOperationProcessingInput,
  ): Promise<FiscalOperationProcessingResult> {
    const { data, error } = await this.client
      .rpc("mark_fiscal_operation_processing", {
        p_user_id: input.userId,
        p_operation_id: input.operationId,
        p_marked_at: markedAtValue(input.markedAt),
      })
      .single();

    assertNoError("mark_fiscal_operation_processing", error);
    if (!data) {
      throw new FiscalOperationProcessingStoreError(
        "mark_fiscal_operation_processing",
        { message: "La RPC no devolvio resultado." },
      );
    }

    return mapFiscalOperationProcessingRpcRowToResult(data);
  }
}
