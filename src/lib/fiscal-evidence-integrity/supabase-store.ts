import { FiscalEvidenceIntegrityError } from "./errors";
import type {
  FiscalEvidenceIntegrityChainState,
  FiscalEvidenceIntegrityEnvironment,
  FiscalEvidenceIntegrityEvidenceRecord,
  FiscalEvidenceIntegrityFiscalRecord,
  FiscalEvidenceIntegrityReadInput,
  FiscalEvidenceIntegrityStore,
} from "./types";

assertServerOnlyModule();

export interface SupabaseFiscalEvidenceIntegrityStoreErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface SupabaseFiscalEvidenceIntegrityQueryResult<T> {
  data: T;
  error: SupabaseFiscalEvidenceIntegrityStoreErrorLike | null;
}

export interface SupabaseFiscalEvidenceIntegrityFilterBuilder<T>
  extends PromiseLike<SupabaseFiscalEvidenceIntegrityQueryResult<T[] | null>> {
  eq(
    column: string,
    value: unknown,
  ): SupabaseFiscalEvidenceIntegrityFilterBuilder<T>;
  order(
    column: string,
    options?: { ascending?: boolean },
  ): SupabaseFiscalEvidenceIntegrityFilterBuilder<T>;
  maybeSingle(): Promise<SupabaseFiscalEvidenceIntegrityQueryResult<T | null>>;
}

export interface SupabaseFiscalEvidenceIntegrityClient {
  from(table: string): {
    select(
      columns?: string,
    ): SupabaseFiscalEvidenceIntegrityFilterBuilder<Record<string, unknown>>;
  };
}

export class SupabaseFiscalEvidenceIntegrityStoreError extends Error {
  readonly operation: string;
  readonly causeCode?: string;

  constructor(
    operation: string,
    error: SupabaseFiscalEvidenceIntegrityStoreErrorLike,
  ) {
    super(error.message ?? `Error de base de datos en ${operation}.`);
    this.name = "SupabaseFiscalEvidenceIntegrityStoreError";
    this.operation = operation;
    this.causeCode = error.code;
  }
}

const EVIDENCE_COLUMNS = [
  "id",
  "user_id",
  "environment",
  "record_id",
  "operation_id",
  "record_sequence",
  "record_hash",
  "previous_hash",
  "payload_candidate_id",
  "payload_validation_status",
  "xml_candidate_digest",
  "evidence_finality",
  "transportable",
  "created_at",
  "metadata_safe",
].join(", ");

const RECORD_COLUMNS = [
  "id",
  "user_id",
  "operation_id",
  "environment",
  "issuer_nif",
  "record_sequence",
  "record_hash",
  "previous_hash",
].join(", ");

const CHAIN_COLUMNS = [
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
      "El adapter Supabase de integridad de evidencia fiscal solo puede cargarse en servidor.",
    );
  }
}

function assertNoError(
  operation: string,
  error: SupabaseFiscalEvidenceIntegrityStoreErrorLike | null,
): asserts error is null {
  if (error) throw new SupabaseFiscalEvidenceIntegrityStoreError(operation, error);
}

function stringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new FiscalEvidenceIntegrityError(
      "map_row_failed",
      `Columna ${key} invalida o ausente.`,
    );
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
    throw new FiscalEvidenceIntegrityError(
      "map_row_failed",
      `Columna ${key} invalida.`,
    );
  }
  return value;
}

function numberField(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value === "number") return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  throw new FiscalEvidenceIntegrityError(
    "map_row_failed",
    `Columna ${key} invalida o ausente.`,
  );
}

function booleanField(row: Record<string, unknown>, key: string): boolean {
  const value = row[key];
  if (typeof value !== "boolean") {
    throw new FiscalEvidenceIntegrityError(
      "map_row_failed",
      `Columna ${key} invalida o ausente.`,
    );
  }
  return value;
}

function parseEnvironment(value: string): FiscalEvidenceIntegrityEnvironment {
  if (value === "test" || value === "production") return value;
  throw new FiscalEvidenceIntegrityError(
    "map_row_failed",
    `environment no soportado: ${value}`,
  );
}

export function mapFiscalEvidenceIntegrityEvidenceRow(
  row: Record<string, unknown>,
): FiscalEvidenceIntegrityEvidenceRecord {
  return {
    id: stringField(row, "id"),
    userId: stringField(row, "user_id"),
    environment: parseEnvironment(stringField(row, "environment")),
    recordId: stringField(row, "record_id"),
    operationId: stringField(row, "operation_id"),
    recordSequence: numberField(row, "record_sequence"),
    recordHash: stringField(row, "record_hash"),
    previousHash: nullableStringField(row, "previous_hash"),
    payloadCandidateId: stringField(row, "payload_candidate_id"),
    payloadValidationStatus: stringField(row, "payload_validation_status"),
    xmlCandidateDigest: nullableStringField(row, "xml_candidate_digest"),
    evidenceFinality: stringField(row, "evidence_finality"),
    transportable: booleanField(row, "transportable"),
    createdAt: stringField(row, "created_at"),
    metadataSafe: row.metadata_safe,
  };
}

export function mapFiscalEvidenceIntegrityRecordRow(
  row: Record<string, unknown>,
): FiscalEvidenceIntegrityFiscalRecord {
  return {
    id: stringField(row, "id"),
    userId: stringField(row, "user_id"),
    operationId: stringField(row, "operation_id"),
    environment: parseEnvironment(stringField(row, "environment")),
    issuerNif: stringField(row, "issuer_nif"),
    recordSequence: numberField(row, "record_sequence"),
    recordHash: stringField(row, "record_hash"),
    previousHash: nullableStringField(row, "previous_hash"),
  };
}

export function mapFiscalEvidenceIntegrityChainRow(
  row: Record<string, unknown>,
): FiscalEvidenceIntegrityChainState {
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

export class SupabaseFiscalEvidenceIntegrityStore
  implements FiscalEvidenceIntegrityStore
{
  constructor(private readonly client: SupabaseFiscalEvidenceIntegrityClient) {}

  async findEvidencePackets(
    input: FiscalEvidenceIntegrityReadInput,
  ): Promise<readonly FiscalEvidenceIntegrityEvidenceRecord[]> {
    let query = this.client
      .from("fiscal_evidence_packets")
      .select(EVIDENCE_COLUMNS)
      .eq("user_id", input.userId);

    if (input.recordId) query = query.eq("record_id", input.recordId);
    if (input.operationId) query = query.eq("operation_id", input.operationId);
    if (input.environment) query = query.eq("environment", input.environment);

    const { data, error } = await query.order("record_sequence", {
      ascending: true,
    });
    assertNoError("find_fiscal_evidence_packets", error);
    return (data ?? []).map(mapFiscalEvidenceIntegrityEvidenceRow);
  }

  async findFiscalRecord(input: {
    readonly userId: string;
    readonly recordId: string;
  }): Promise<FiscalEvidenceIntegrityFiscalRecord | null> {
    const { data, error } = await this.client
      .from("fiscal_records")
      .select(RECORD_COLUMNS)
      .eq("user_id", input.userId)
      .eq("id", input.recordId)
      .maybeSingle();
    assertNoError("find_fiscal_record", error);
    return data ? mapFiscalEvidenceIntegrityRecordRow(data) : null;
  }

  async findFiscalChainState(input: {
    readonly userId: string;
    readonly environment: FiscalEvidenceIntegrityEnvironment;
    readonly issuerNif: string;
  }): Promise<FiscalEvidenceIntegrityChainState | null> {
    const { data, error } = await this.client
      .from("fiscal_chain_state")
      .select(CHAIN_COLUMNS)
      .eq("user_id", input.userId)
      .eq("environment", input.environment)
      .eq("issuer_nif", input.issuerNif)
      .maybeSingle();
    assertNoError("find_fiscal_chain_state", error);
    return data ? mapFiscalEvidenceIntegrityChainRow(data) : null;
  }
}
