import type {
  FiscalEvidencePersistenceConflictReason,
  FiscalEvidencePersistenceCreateInput,
  FiscalEvidencePersistenceRecord,
  FiscalEvidencePersistenceRejectionReason,
  FiscalEvidencePersistenceStore,
  FiscalEvidencePersistenceStoreResult,
  FiscalEvidenceSafeMetadata,
} from "./types";

assertServerOnlyModule();

export interface SupabaseFiscalEvidencePersistenceStoreErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface SupabaseFiscalEvidencePersistenceQueryResult<T> {
  data: T;
  error: SupabaseFiscalEvidencePersistenceStoreErrorLike | null;
}

export interface SupabaseFiscalEvidencePersistenceRpcBuilder<T> {
  single(): Promise<SupabaseFiscalEvidencePersistenceQueryResult<T>>;
}

export interface SupabaseFiscalEvidencePersistenceClient {
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): SupabaseFiscalEvidencePersistenceRpcBuilder<Record<string, unknown> | null>;
}

export class FiscalEvidencePersistenceStoreError extends Error {
  readonly operation: string;
  readonly causeCode?: string;

  constructor(
    operation: string,
    error: SupabaseFiscalEvidencePersistenceStoreErrorLike,
  ) {
    super(error.message ?? `Error de base de datos en ${operation}.`);
    this.name = "FiscalEvidencePersistenceStoreError";
    this.operation = operation;
    this.causeCode = error.code;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adapter Supabase de evidencia fiscal solo puede cargarse en servidor.",
    );
  }
}

function assertNoError(
  operation: string,
  error: SupabaseFiscalEvidencePersistenceStoreErrorLike | null,
): asserts error is null {
  if (error) throw new FiscalEvidencePersistenceStoreError(operation, error);
}

function stringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new FiscalEvidencePersistenceStoreError("map_rpc_row", {
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
    throw new FiscalEvidencePersistenceStoreError("map_rpc_row", {
      message: `Columna ${key} invalida.`,
    });
  }
  return value;
}

function numberField(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== "number") {
    throw new FiscalEvidencePersistenceStoreError("map_rpc_row", {
      message: `Columna ${key} invalida o ausente.`,
    });
  }
  return value;
}

function booleanField(row: Record<string, unknown>, key: string): boolean {
  const value = row[key];
  if (typeof value !== "boolean") {
    throw new FiscalEvidencePersistenceStoreError("map_rpc_row", {
      message: `Columna ${key} invalida o ausente.`,
    });
  }
  return value;
}

function parseEnvironment(value: string): "test" | "production" {
  if (value === "test" || value === "production") return value;
  throw new FiscalEvidencePersistenceStoreError("map_rpc_row", {
    message: `environment no soportado: ${value}`,
  });
}

function parseValidationStatus(value: string): "valid" {
  if (value === "valid") return value;
  throw new FiscalEvidencePersistenceStoreError("map_rpc_row", {
    message: `payload_validation_status no soportado: ${value}`,
  });
}

function parseEvidenceFinality(value: string): "internal_dry_run_evidence" {
  if (value === "internal_dry_run_evidence") return value;
  throw new FiscalEvidencePersistenceStoreError("map_rpc_row", {
    message: `evidence_finality no soportado: ${value}`,
  });
}

function parseTransportable(value: boolean): false {
  if (value === false) return false;
  throw new FiscalEvidencePersistenceStoreError("map_rpc_row", {
    message: "transportable no puede ser true en evidencia interna.",
  });
}

function parseMetadataSafe(value: unknown): FiscalEvidenceSafeMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new FiscalEvidencePersistenceStoreError("map_rpc_row", {
      message: "metadata_safe invalida.",
    });
  }
  return value as FiscalEvidenceSafeMetadata;
}

function parseResultStatus(
  value: string,
): FiscalEvidencePersistenceStoreResult["status"] {
  if (value === "created" || value === "existing" || value === "rejected" || value === "conflict") {
    return value;
  }
  throw new FiscalEvidencePersistenceStoreError("map_rpc_row", {
    message: `result_status no soportado: ${value}`,
  });
}

function parseRejectionReason(
  value: string | null,
): FiscalEvidencePersistenceRejectionReason {
  const allowed: FiscalEvidencePersistenceRejectionReason[] = [
    "record_not_found",
    "payload_candidate_missing",
    "payload_validation_not_valid",
    "payload_packet_mismatch",
    "record_packet_mismatch",
    "xml_candidate_digest_invalid",
    "evidence_finality_invalid",
    "transportable_not_allowed",
    "metadata_unsafe",
  ];
  if (value && allowed.includes(value as FiscalEvidencePersistenceRejectionReason)) {
    return value as FiscalEvidencePersistenceRejectionReason;
  }
  throw new FiscalEvidencePersistenceStoreError("map_rpc_row", {
    message: `reason no soportado: ${value ?? "null"}`,
  });
}

function parseConflictReason(
  value: string | null,
): FiscalEvidencePersistenceConflictReason {
  const allowed: FiscalEvidencePersistenceConflictReason[] = [
    "chain_state_missing",
    "chain_state_inconsistent",
  ];
  if (value && allowed.includes(value as FiscalEvidencePersistenceConflictReason)) {
    return value as FiscalEvidencePersistenceConflictReason;
  }
  throw new FiscalEvidencePersistenceStoreError("map_rpc_row", {
    message: `reason no soportado: ${value ?? "null"}`,
  });
}

export function mapFiscalEvidencePersistenceRpcRowToRecord(
  row: Record<string, unknown>,
): FiscalEvidencePersistenceRecord {
  return {
    id: stringField(row, "evidence_packet_id"),
    userId: stringField(row, "evidence_user_id"),
    environment: parseEnvironment(stringField(row, "evidence_environment")),
    recordId: stringField(row, "evidence_record_id"),
    operationId: stringField(row, "evidence_operation_id"),
    recordSequence: numberField(row, "evidence_record_sequence"),
    recordHash: stringField(row, "evidence_record_hash"),
    previousHash: nullableStringField(row, "evidence_previous_hash"),
    payloadCandidateId: stringField(row, "evidence_payload_candidate_id"),
    payloadValidationStatus: parseValidationStatus(
      stringField(row, "evidence_payload_validation_status"),
    ),
    xmlCandidateDigest: nullableStringField(row, "evidence_xml_candidate_digest"),
    evidenceFinality: parseEvidenceFinality(
      stringField(row, "evidence_finality"),
    ),
    transportable: parseTransportable(
      booleanField(row, "evidence_transportable"),
    ),
    createdAt: stringField(row, "evidence_created_at"),
    metadataSafe: parseMetadataSafe(row.evidence_metadata_safe),
  };
}

export function mapFiscalEvidencePersistenceRpcRowToResult(
  row: Record<string, unknown>,
): FiscalEvidencePersistenceStoreResult {
  const status = parseResultStatus(stringField(row, "result_status"));

  if (status === "rejected") {
    return {
      status,
      reason: parseRejectionReason(nullableStringField(row, "reason")),
      message:
        nullableStringField(row, "message") ??
        "La persistencia local de evidencia fue rechazada.",
    };
  }

  if (status === "conflict") {
    return {
      status,
      reason: parseConflictReason(nullableStringField(row, "reason")),
      message:
        nullableStringField(row, "message") ??
        "La persistencia local de evidencia encontro un conflicto.",
    };
  }

  return {
    status,
    evidence: mapFiscalEvidencePersistenceRpcRowToRecord(row),
    atomicity: "postgres_rpc",
  };
}

export class SupabaseFiscalEvidencePersistenceStore
  implements FiscalEvidencePersistenceStore
{
  constructor(private readonly client: SupabaseFiscalEvidencePersistenceClient) {}

  async createFiscalEvidencePacketLocalStaging(
    input: FiscalEvidencePersistenceCreateInput,
  ): Promise<FiscalEvidencePersistenceStoreResult> {
    const { data, error } = await this.client
      .rpc("create_fiscal_evidence_packet_local_staging", {
        p_user_id: input.userId,
        p_record_id: input.recordId,
        p_payload_candidate_id: input.payloadCandidateId,
        p_payload_validation_status: input.payloadValidationStatus,
        p_xml_candidate_digest: input.xmlCandidateDigest,
        p_evidence_finality: input.evidenceFinality,
        p_transportable: input.transportable,
        p_metadata_safe: input.metadataSafe,
        p_created_at: input.createdAt,
      })
      .single();
    assertNoError("create_fiscal_evidence_packet_local_staging", error);
    if (!data) {
      throw new FiscalEvidencePersistenceStoreError(
        "create_fiscal_evidence_packet_local_staging",
        { message: "La RPC no devolvio datos." },
      );
    }
    return mapFiscalEvidencePersistenceRpcRowToResult(data);
  }
}
