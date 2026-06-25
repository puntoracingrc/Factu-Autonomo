import { FiscalOperationTransactionError } from "./transaction-errors";
import type {
  FiscalOperationTransactionInput,
  FiscalOperationTransactionResult,
  FiscalOperationTransactionRejectionReason,
} from "./transaction-types";
import type {
  FiscalEnvironment,
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
  FiscalOperationStatus,
  FiscalOperationType,
} from "./types";

assertServerOnlyModule();

export interface SupabaseFiscalOperationTransactionErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface SupabaseFiscalOperationTransactionQueryResult<T> {
  data: T;
  error: SupabaseFiscalOperationTransactionErrorLike | null;
}

export interface SupabaseFiscalOperationTransactionRpcBuilder<T> {
  single(): Promise<SupabaseFiscalOperationTransactionQueryResult<T>>;
}

export interface SupabaseFiscalOperationTransactionClient {
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): SupabaseFiscalOperationTransactionRpcBuilder<Record<string, unknown> | null>;
}

export class FiscalOperationTransactionStoreError extends Error {
  readonly operation: string;
  readonly causeCode?: string;

  constructor(
    operation: string,
    error: SupabaseFiscalOperationTransactionErrorLike,
  ) {
    super(error.message ?? `Error de base de datos en ${operation}.`);
    this.name = "FiscalOperationTransactionStoreError";
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
  error: SupabaseFiscalOperationTransactionErrorLike | null,
): asserts error is null {
  if (error) throw new FiscalOperationTransactionStoreError(operation, error);
}

function stringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new FiscalOperationTransactionStoreError("map_rpc_row", {
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
    throw new FiscalOperationTransactionStoreError("map_rpc_row", {
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
    throw new FiscalOperationTransactionStoreError("map_rpc_row", {
      message: `Columna ${key} invalida o ausente.`,
    });
  }
  return value;
}

function parseResultStatus(
  value: string,
): FiscalOperationTransactionResult["status"] {
  if (
    value === "created" ||
    value === "existing" ||
    value === "rejected" ||
    value === "conflict"
  ) {
    return value;
  }
  throw new FiscalOperationTransactionStoreError("map_rpc_row", {
    message: `result_status no soportado: ${value}`,
  });
}

function parseReason(
  value: string | null,
): FiscalOperationTransactionRejectionReason {
  const allowed: FiscalOperationTransactionRejectionReason[] = [
    "missing_expected_document_version",
    "document_not_found",
    "document_version_conflict",
    "document_not_eligible",
    "snapshot_hash_missing",
    "issuer_nif_missing",
    "numserie_missing",
    "issue_date_missing",
    "unsupported_operation",
    "invalid_environment",
    "operation_race",
    "identity_race",
  ];
  if (value && allowed.includes(value as FiscalOperationTransactionRejectionReason)) {
    return value as FiscalOperationTransactionRejectionReason;
  }
  throw new FiscalOperationTransactionStoreError("map_rpc_row", {
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
  throw new FiscalOperationTransactionStoreError("map_rpc_row", {
    message: `operation_type no soportado: ${value}`,
  });
}

function parseFiscalEnvironment(value: string): FiscalEnvironment {
  if (value === "test" || value === "production") return value;
  throw new FiscalOperationTransactionStoreError("map_rpc_row", {
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
  throw new FiscalOperationTransactionStoreError("map_rpc_row", {
    message: `status no soportado: ${value}`,
  });
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

function identityFromRpcRow(
  row: Record<string, unknown>,
): FiscalInvoiceIdentityRecord | null {
  const id = nullableUuidField(row, "invoice_identity_id");
  if (!id) return null;

  return {
    id,
    userId: stringField(row, "invoice_identity_user_id"),
    serverDocumentId: stringField(
      row,
      "invoice_identity_server_document_id",
    ),
    environment: parseFiscalEnvironment(
      stringField(row, "invoice_identity_environment"),
    ),
    issuerNif: stringField(row, "invoice_identity_issuer_nif"),
    numserie: stringField(row, "invoice_identity_numserie"),
    fechaExpedicion: stringField(row, "invoice_identity_fecha_expedicion"),
    createdAt: stringField(row, "invoice_identity_created_at"),
  };
}

function requestedAtValue(value: Date | string | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function mapFiscalOperationTransactionRpcRowToResult(
  row: Record<string, unknown>,
): FiscalOperationTransactionResult {
  const status = parseResultStatus(stringField(row, "result_status"));

  if (status === "rejected" || status === "conflict") {
    return {
      status,
      reason: parseReason(nullableStringField(row, "reason")),
      message:
        nullableStringField(row, "message") ??
        new FiscalOperationTransactionError(
          parseReason(nullableStringField(row, "reason")),
        ).message,
    };
  }

  const operation = operationFromRpcRow(row);
  const invoiceIdentity = identityFromRpcRow(row);

  if (status === "created") {
    if (!invoiceIdentity) {
      throw new FiscalOperationTransactionStoreError("map_rpc_row", {
        message: "created necesita invoiceIdentity.",
      });
    }
    return {
      status,
      operation,
      invoiceIdentity,
      atomicity: "postgres_rpc",
    };
  }

  return {
    status,
    operation,
    invoiceIdentity,
    atomicity: "postgres_rpc",
  };
}

export class SupabaseFiscalOperationTransactionStore {
  constructor(
    private readonly client: SupabaseFiscalOperationTransactionClient,
  ) {}

  async reserveFiscalOperation(
    input: FiscalOperationTransactionInput,
  ): Promise<FiscalOperationTransactionResult> {
    const { data, error } = await this.client
      .rpc("reserve_fiscal_operation", {
        p_user_id: input.userId,
        p_server_document_id: input.serverDocumentId,
        p_operation_type: input.operationType,
        p_environment: input.environment,
        p_expected_document_version: input.expectedDocumentVersion ?? null,
        p_idempotency_key: input.idempotencyKey ?? null,
        p_requested_by: input.requestedBy,
        p_requested_at: requestedAtValue(input.requestedAt),
      })
      .single();

    assertNoError("reserve_fiscal_operation", error);
    if (!data) {
      throw new FiscalOperationTransactionStoreError(
        "reserve_fiscal_operation",
        { message: "La RPC no devolvio resultado." },
      );
    }

    return mapFiscalOperationTransactionRpcRowToResult(data);
  }
}
