import type { FiscalOperationRepositoryStore } from "./repository";
import type {
  FiscalEnvironment,
  FiscalInvoiceIdentityCreateInput,
  FiscalInvoiceIdentityLookupInput,
  FiscalInvoiceIdentityRecord,
  FiscalOperationCreateInput,
  FiscalOperationRecord,
  FiscalOperationStatus,
  FiscalOperationType,
} from "./types";

assertServerOnlyModule();

export interface SupabaseFiscalStoreErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface SupabaseFiscalQueryResult<T> {
  data: T;
  error: SupabaseFiscalStoreErrorLike | null;
}

export interface SupabaseFiscalFilterBuilder<T>
  extends PromiseLike<SupabaseFiscalQueryResult<T[] | null>> {
  eq(column: string, value: unknown): SupabaseFiscalFilterBuilder<T>;
  select(columns?: string): SupabaseFiscalFilterBuilder<T>;
  maybeSingle(): Promise<SupabaseFiscalQueryResult<T | null>>;
  single(): Promise<SupabaseFiscalQueryResult<T>>;
}

export interface SupabaseFiscalOperationClient {
  from(table: string): {
    select(columns?: string): SupabaseFiscalFilterBuilder<Record<string, unknown>>;
    insert(
      row: Record<string, unknown> | Record<string, unknown>[],
    ): SupabaseFiscalFilterBuilder<Record<string, unknown>>;
  };
}

export class FiscalOperationStoreError extends Error {
  readonly operation: string;
  readonly causeCode?: string;

  constructor(operation: string, error: SupabaseFiscalStoreErrorLike) {
    super(error.message ?? `Error de base de datos en ${operation}.`);
    this.name = "FiscalOperationStoreError";
    this.operation = operation;
    this.causeCode = error.code;
  }
}

const FISCAL_OPERATION_COLUMNS = [
  "id",
  "user_id",
  "server_document_id",
  "operation_type",
  "environment",
  "idempotency_key",
  "requested_by",
  "requested_at",
  "expected_document_version",
  "document_snapshot_hash",
  "status",
  "completed_at",
  "failed_at",
  "failure_code",
  "failure_message",
  "created_at",
  "updated_at",
].join(", ");

const FISCAL_INVOICE_IDENTITY_COLUMNS = [
  "id",
  "user_id",
  "server_document_id",
  "environment",
  "issuer_nif",
  "numserie",
  "fecha_expedicion",
  "created_at",
].join(", ");

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adapter Supabase fiscal solo puede cargarse en servidor.",
    );
  }
}

function assertNoError(
  operation: string,
  error: SupabaseFiscalStoreErrorLike | null,
): asserts error is null {
  if (error) throw new FiscalOperationStoreError(operation, error);
}

function stringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new FiscalOperationStoreError("map_row", {
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
    throw new FiscalOperationStoreError("map_row", {
      message: `Columna ${key} invalida.`,
    });
  }
  return value;
}

function numberField(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== "number") {
    throw new FiscalOperationStoreError("map_row", {
      message: `Columna ${key} invalida o ausente.`,
    });
  }
  return value;
}

function parseFiscalOperationType(value: string): FiscalOperationType {
  if (
    value === "alta_inicial" ||
    value === "alta_subsanacion" ||
    value === "anulacion"
  ) {
    return value;
  }
  throw new FiscalOperationStoreError("map_row", {
    message: `operation_type no soportado: ${value}`,
  });
}

function parseFiscalEnvironment(value: string): FiscalEnvironment {
  if (value === "test" || value === "production") return value;
  throw new FiscalOperationStoreError("map_row", {
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
  throw new FiscalOperationStoreError("map_row", {
    message: `status no soportado: ${value}`,
  });
}

export function mapFiscalOperationRowToRecord(
  row: Record<string, unknown>,
): FiscalOperationRecord {
  return {
    id: stringField(row, "id"),
    userId: stringField(row, "user_id"),
    serverDocumentId: stringField(row, "server_document_id"),
    operationType: parseFiscalOperationType(stringField(row, "operation_type")),
    environment: parseFiscalEnvironment(stringField(row, "environment")),
    idempotencyKey: stringField(row, "idempotency_key"),
    requestedBy: nullableStringField(row, "requested_by"),
    requestedAt: stringField(row, "requested_at"),
    expectedDocumentVersion: numberField(row, "expected_document_version"),
    documentSnapshotHash: stringField(row, "document_snapshot_hash"),
    status: parseFiscalOperationStatus(stringField(row, "status")),
    completedAt: nullableStringField(row, "completed_at"),
    failedAt: nullableStringField(row, "failed_at"),
    failureCode: nullableStringField(row, "failure_code"),
    failureMessage: nullableStringField(row, "failure_message"),
    createdAt: stringField(row, "created_at"),
    updatedAt: stringField(row, "updated_at"),
  };
}

export function mapFiscalInvoiceIdentityRowToRecord(
  row: Record<string, unknown>,
): FiscalInvoiceIdentityRecord {
  return {
    id: stringField(row, "id"),
    userId: stringField(row, "user_id"),
    serverDocumentId: stringField(row, "server_document_id"),
    environment: parseFiscalEnvironment(stringField(row, "environment")),
    issuerNif: stringField(row, "issuer_nif"),
    numserie: stringField(row, "numserie"),
    fechaExpedicion: stringField(row, "fecha_expedicion"),
    createdAt: stringField(row, "created_at"),
  };
}

export function mapFiscalOperationCreateToInsert(
  input: FiscalOperationCreateInput,
): Record<string, unknown> {
  return {
    id: input.id,
    user_id: input.draft.userId,
    server_document_id: input.draft.serverDocumentId,
    operation_type: input.draft.operationType,
    environment: input.draft.environment,
    idempotency_key: input.draft.idempotencyKey,
    requested_by: input.draft.requestedBy,
    requested_at: input.draft.requestedAt,
    expected_document_version: input.draft.expectedDocumentVersion,
    document_snapshot_hash: input.draft.documentSnapshotHash,
    status: "requested",
    completed_at: null,
    failed_at: null,
    failure_code: null,
    failure_message: null,
    created_at: input.createdAt,
    updated_at: input.updatedAt,
  };
}

export function mapFiscalInvoiceIdentityCreateToInsert(
  input: FiscalInvoiceIdentityCreateInput,
): Record<string, unknown> {
  return {
    id: input.id,
    user_id: input.userId,
    server_document_id: input.serverDocumentId,
    environment: input.environment,
    issuer_nif: input.issuerNif,
    numserie: input.numserie,
    fecha_expedicion: input.fechaExpedicion,
    created_at: input.createdAt,
  };
}

export class SupabaseFiscalOperationStore
  implements FiscalOperationRepositoryStore
{
  constructor(private readonly client: SupabaseFiscalOperationClient) {}

  async findOperationByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<FiscalOperationRecord | null> {
    const { data, error } = await this.client
      .from("fiscal_operations")
      .select(FISCAL_OPERATION_COLUMNS)
      .eq("user_id", userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    assertNoError("find_operation_by_idempotency_key", error);
    return data ? mapFiscalOperationRowToRecord(data) : null;
  }

  async findInvoiceIdentity(
    input: FiscalInvoiceIdentityLookupInput,
  ): Promise<FiscalInvoiceIdentityRecord | null> {
    const { data, error } = await this.client
      .from("fiscal_invoice_identities")
      .select(FISCAL_INVOICE_IDENTITY_COLUMNS)
      .eq("user_id", input.userId)
      .eq("environment", input.environment)
      .eq("issuer_nif", input.issuerNif)
      .eq("numserie", input.numserie)
      .eq("fecha_expedicion", input.fechaExpedicion)
      .maybeSingle();

    assertNoError("find_invoice_identity", error);
    return data ? mapFiscalInvoiceIdentityRowToRecord(data) : null;
  }

  async createInvoiceIdentity(
    input: FiscalInvoiceIdentityCreateInput,
  ): Promise<FiscalInvoiceIdentityRecord> {
    const { data, error } = await this.client
      .from("fiscal_invoice_identities")
      .insert(mapFiscalInvoiceIdentityCreateToInsert(input))
      .select(FISCAL_INVOICE_IDENTITY_COLUMNS)
      .single();

    assertNoError("create_invoice_identity", error);
    return mapFiscalInvoiceIdentityRowToRecord(data);
  }

  async createFiscalOperation(
    input: FiscalOperationCreateInput,
  ): Promise<FiscalOperationRecord> {
    const { data, error } = await this.client
      .from("fiscal_operations")
      .insert(mapFiscalOperationCreateToInsert(input))
      .select(FISCAL_OPERATION_COLUMNS)
      .single();

    assertNoError("create_fiscal_operation", error);
    return mapFiscalOperationRowToRecord(data);
  }
}
