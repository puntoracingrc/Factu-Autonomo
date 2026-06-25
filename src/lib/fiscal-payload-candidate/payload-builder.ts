import { FiscalPayloadCandidateError } from "./errors";
import type {
  FiscalPayloadCandidate,
  FiscalPayloadCandidateBuildInput,
  FiscalPayloadCandidateBuildResult,
} from "./types";

assertServerOnlyModule();

export const FISCAL_PAYLOAD_CANDIDATE_FORMAT_VERSION =
  "phase2b4n-o-payload-candidate-v1";

export const FISCAL_PAYLOAD_CANDIDATE_PHASE_MARKER =
  "PHASE2B4N_O_FISCAL_PAYLOAD_CANDIDATE_LOCAL_ACCEPTANCE_V1";

export const FISCAL_PAYLOAD_CANDIDATE_XML_MARKER =
  "PHASE2B4N_O_XML_CANDIDATE_NOT_AEAT_FINAL";

const NORMALIZED_SHA256_REGEX = /^sha256:[a-f0-9]{64}$/;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El builder de payload fiscal candidato solo puede cargarse en servidor.",
    );
  }
}

function isoDateTime(value: Date | string | undefined): string {
  if (!value) return new Date().toISOString();
  return typeof value === "string" ? value : value.toISOString();
}

function requiredText(
  value: string | null | undefined,
  reason: ConstructorParameters<typeof FiscalPayloadCandidateError>[0],
): string {
  const normalized = value?.trim();
  if (!normalized) throw new FiscalPayloadCandidateError(reason);
  return normalized;
}

function assertNormalizedHash(
  value: string,
  reason: ConstructorParameters<typeof FiscalPayloadCandidateError>[0],
): void {
  if (!NORMALIZED_SHA256_REGEX.test(value)) {
    throw new FiscalPayloadCandidateError(reason);
  }
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function operationTypeMatchesRecordType(
  operationType: string,
  recordType: string,
): boolean {
  if (
    recordType === "alta" &&
    (operationType === "alta_inicial" || operationType === "alta_subsanacion")
  ) {
    return true;
  }
  return recordType === "anulacion" && operationType === "anulacion";
}

function assertChainConsistency(input: FiscalPayloadCandidateBuildInput): void {
  const { record, chain } = input;
  if (!chain) throw new FiscalPayloadCandidateError("chain_state_missing");

  if (
    chain.userId !== record.userId ||
    chain.environment !== record.environment ||
    chain.issuerNif !== record.issuerNif ||
    chain.recordCount < record.recordSequence
  ) {
    throw new FiscalPayloadCandidateError("chain_state_inconsistent");
  }

  if (
    chain.recordCount === record.recordSequence &&
    (chain.lastRecordId !== record.id || chain.lastHash !== record.recordHash)
  ) {
    throw new FiscalPayloadCandidateError("chain_state_inconsistent");
  }
}

function buildCandidateXml(payload: Omit<FiscalPayloadCandidate, "candidateXml">): string {
  return [
    `<FiscalPayloadCandidate marker="${FISCAL_PAYLOAD_CANDIDATE_XML_MARKER}" finality="${payload.finality}" transportable="false">`,
    `  <FormatVersion>${escapeXml(payload.formatVersionCandidate)}</FormatVersion>`,
    `  <Record id="${escapeXml(payload.recordId)}" type="${escapeXml(payload.recordType)}" sequence="${payload.recordSequence}">`,
    `    <OperationId>${escapeXml(payload.operationId)}</OperationId>`,
    `    <Environment>${escapeXml(payload.environment)}</Environment>`,
    `    <IssuerNif>${escapeXml(payload.issuerNif)}</IssuerNif>`,
    `    <NumSerie>${escapeXml(payload.numserie)}</NumSerie>`,
    `    <FechaExpedicion>${escapeXml(payload.fechaExpedicion)}</FechaExpedicion>`,
    `    <RecordHash algorithm="sha256-candidate">${escapeXml(payload.recordHash)}</RecordHash>`,
    `    <PreviousRecordId>${escapeXml(payload.previousRecordId ?? "")}</PreviousRecordId>`,
    `    <PreviousHash>${escapeXml(payload.previousHash ?? "")}</PreviousHash>`,
    "  </Record>",
    `  <GeneratedAtCandidate>${escapeXml(payload.generatedAtCandidate)}</GeneratedAtCandidate>`,
    `  <NonFinalNotice>${FISCAL_PAYLOAD_CANDIDATE_XML_MARKER}</NonFinalNotice>`,
    "</FiscalPayloadCandidate>",
  ].join("\n");
}

export function buildFiscalPayloadCandidate(
  input: FiscalPayloadCandidateBuildInput,
): FiscalPayloadCandidate {
  const { record, operation, invoiceIdentity } = input;
  const recordId = requiredText(record.id, "record_id_missing");
  const operationId = requiredText(record.operationId, "operation_id_missing");
  const issuerNif = requiredText(record.issuerNif, "issuer_nif_missing");
  const numserie = requiredText(record.numserie, "numserie_missing");
  const fechaExpedicion = requiredText(
    record.fechaExpedicion,
    "fecha_expedicion_missing",
  );
  const recordHash = requiredText(record.recordHash, "record_hash_missing");
  assertNormalizedHash(recordHash, "record_hash_not_normalized");

  if (record.recordTypeCandidate !== "alta" && record.recordTypeCandidate !== "anulacion") {
    throw new FiscalPayloadCandidateError("unsupported_record_type");
  }

  if (!Number.isInteger(record.recordSequence) || record.recordSequence < 1) {
    throw new FiscalPayloadCandidateError("record_sequence_invalid");
  }

  if (record.recordSequence === 1) {
    if (record.previousHash !== null || record.previousRecordId !== null) {
      throw new FiscalPayloadCandidateError("chain_state_inconsistent");
    }
  } else {
    const previousHash = requiredText(
      record.previousHash,
      "previous_hash_missing",
    );
    assertNormalizedHash(previousHash, "previous_hash_not_normalized");
    if (!record.previousRecordId?.trim()) {
      throw new FiscalPayloadCandidateError("chain_state_inconsistent");
    }
  }

  if (
    operation.id !== operationId ||
    operation.userId !== record.userId ||
    operation.serverDocumentId !== record.serverDocumentId ||
    operation.environment !== record.environment ||
    operation.documentSnapshotHash !== record.documentSnapshotHash
  ) {
    throw new FiscalPayloadCandidateError("operation_mismatch");
  }

  if (
    !operationTypeMatchesRecordType(
      operation.operationType,
      record.recordTypeCandidate,
    )
  ) {
    throw new FiscalPayloadCandidateError("operation_type_mismatch");
  }

  if (!invoiceIdentity) {
    throw new FiscalPayloadCandidateError("identity_missing");
  }

  if (
    invoiceIdentity.id !== record.invoiceIdentityId ||
    invoiceIdentity.userId !== record.userId ||
    invoiceIdentity.serverDocumentId !== record.serverDocumentId ||
    invoiceIdentity.environment !== record.environment ||
    invoiceIdentity.issuerNif !== issuerNif ||
    invoiceIdentity.numserie !== numserie ||
    invoiceIdentity.fechaExpedicion !== fechaExpedicion
  ) {
    throw new FiscalPayloadCandidateError("identity_mismatch");
  }

  assertChainConsistency(input);

  const payloadWithoutXml: Omit<FiscalPayloadCandidate, "candidateXml"> = {
    payloadCandidateId: `payload-candidate:${recordId}:${FISCAL_PAYLOAD_CANDIDATE_FORMAT_VERSION}`,
    recordId,
    operationId,
    recordType: record.recordTypeCandidate,
    issuerNif,
    numserie,
    fechaExpedicion,
    recordHash,
    previousRecordId: record.previousRecordId,
    previousHash: record.previousHash,
    recordSequence: record.recordSequence,
    environment: record.environment,
    generatedAtCandidate: isoDateTime(input.generatedAtCandidate),
    formatVersionCandidate: FISCAL_PAYLOAD_CANDIDATE_FORMAT_VERSION,
    finality: "candidate_not_aeat",
    transportable: false,
    safeMetadata: {
      source: "local_staging_fiscal_record_chain",
      phase: FISCAL_PAYLOAD_CANDIDATE_PHASE_MARKER,
      aeatReady: false,
      signed: false,
    },
  };

  return {
    ...payloadWithoutXml,
    candidateXml: buildCandidateXml(payloadWithoutXml),
  };
}

export function buildFiscalPayloadCandidateResult(
  input: FiscalPayloadCandidateBuildInput,
): FiscalPayloadCandidateBuildResult {
  try {
    return {
      status: "built",
      payload: buildFiscalPayloadCandidate(input),
    };
  } catch (error) {
    if (error instanceof FiscalPayloadCandidateError) {
      return {
        status: "rejected",
        reason: error.reason,
        message: error.message,
      };
    }
    throw error;
  }
}
