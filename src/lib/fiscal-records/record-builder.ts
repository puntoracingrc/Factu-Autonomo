import { FiscalRecordError } from "./errors";
import type {
  FiscalRecordBuildInput,
  FiscalRecordBuildResult,
  FiscalRecordCandidate,
  FiscalRecordHashInputCandidate,
  FiscalRecordType,
} from "./types";

export const FISCAL_RECORD_CANDIDATE_SCHEMA_VERSION =
  "phase2b4j-record-candidate-v1";

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El builder de registro fiscal candidato solo puede cargarse en servidor.",
    );
  }
}

assertServerOnlyModule();

function isoDateTime(value: Date | string | undefined): string {
  if (!value) return new Date().toISOString();
  return typeof value === "string" ? value : value.toISOString();
}

function requiredText(
  value: string | null | undefined,
  reason: ConstructorParameters<typeof FiscalRecordError>[0],
): string {
  const normalized = value?.trim();
  if (!normalized) throw new FiscalRecordError(reason);
  return normalized;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}

export function mapFiscalOperationTypeToRecordType(
  operationType: string | null | undefined,
): FiscalRecordType {
  const normalized = requiredText(operationType, "operation_type_missing");
  if (normalized === "alta_inicial" || normalized === "alta_subsanacion") {
    return "alta";
  }
  if (normalized === "anulacion") return "anulacion";
  throw new FiscalRecordError("unsupported_operation_type");
}

export function buildFiscalRecordCandidate(
  input: FiscalRecordBuildInput,
): FiscalRecordCandidate {
  const { operation, invoiceIdentity, material } = input;

  if (operation.status !== "processing") {
    throw new FiscalRecordError("operation_not_processing");
  }
  if (!material.dryRun || material.finality !== "preliminary_not_aeat") {
    throw new FiscalRecordError("material_not_dry_run");
  }
  if (!invoiceIdentity) {
    throw new FiscalRecordError("invoice_identity_missing");
  }

  const operationId = requiredText(operation.id, "operation_id_missing");
  const invoiceIdentityId = requiredText(
    invoiceIdentity.id,
    "invoice_identity_id_missing",
  );
  const serverDocumentId = requiredText(
    operation.serverDocumentId,
    "server_document_id_missing",
  );
  const issuerNif = requiredText(invoiceIdentity.issuerNif, "issuer_nif_missing");
  const numserie = requiredText(invoiceIdentity.numserie, "numserie_missing");
  const fechaExpedicion = requiredText(
    invoiceIdentity.fechaExpedicion,
    "fecha_expedicion_missing",
  );
  const documentSnapshotHash = requiredText(
    operation.documentSnapshotHash,
    "document_snapshot_hash_missing",
  );
  const recordTypeCandidate = mapFiscalOperationTypeToRecordType(
    operation.operationType,
  );

  if (material.operationId !== operationId) {
    throw new FiscalRecordError("material_operation_mismatch");
  }
  if (material.invoiceIdentityId !== invoiceIdentityId) {
    throw new FiscalRecordError("material_identity_mismatch");
  }
  if (material.serverDocumentId !== serverDocumentId) {
    throw new FiscalRecordError("material_document_mismatch");
  }

  const recordTimestampCandidate = isoDateTime(input.recordTimestampCandidate);
  const hashInputCandidate: FiscalRecordHashInputCandidate = {
    marker: "PHASE2B4J_RECORD_HASH_INPUT_CANDIDATE",
    operationId,
    invoiceIdentityId,
    serverDocumentId,
    operationType: operation.operationType,
    recordTypeCandidate,
    environment: operation.environment,
    issuerNif,
    numserie,
    fechaExpedicion,
    documentSnapshotHash,
    pdfContentHash: material.pdfContentHash,
    recordTimestampCandidate,
    schemaVersionCandidate: FISCAL_RECORD_CANDIDATE_SCHEMA_VERSION,
  };

  return {
    candidate: true,
    finality: "candidate_not_aeat",
    operationId,
    invoiceIdentityId,
    serverDocumentId,
    operationType: operation.operationType,
    recordTypeCandidate,
    environment: operation.environment,
    issuerNif,
    numserie,
    fechaExpedicion,
    documentSnapshotHash,
    pdfContentHash: material.pdfContentHash,
    schemaVersionCandidate: FISCAL_RECORD_CANDIDATE_SCHEMA_VERSION,
    recordTimestampCandidate,
    hashInputCandidate: stableStringify(hashInputCandidate),
  };
}

export function buildFiscalRecordCandidateResult(
  input: FiscalRecordBuildInput,
): FiscalRecordBuildResult {
  try {
    return {
      status: "built",
      record: buildFiscalRecordCandidate(input),
    };
  } catch (error) {
    if (error instanceof FiscalRecordError) {
      return {
        status: "rejected",
        reason: error.reason,
        message: error.message,
      };
    }
    throw error;
  }
}
