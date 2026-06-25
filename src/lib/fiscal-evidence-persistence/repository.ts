import { FiscalEvidencePersistenceError } from "./errors";
import {
  FISCAL_EVIDENCE_PERSISTENCE_PHASE_MARKER,
  type FiscalEvidencePersistenceInput,
  type FiscalEvidencePersistenceRepositoryResult,
  type FiscalEvidencePersistenceStore,
  type FiscalEvidenceSafeMetadata,
} from "./types";

assertServerOnlyModule();

const SHA256_DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El repositorio de evidencia fiscal solo puede cargarse en servidor.",
    );
  }
}

function isoDateTime(value: Date | string | undefined): string {
  if (!value) return new Date().toISOString();
  return typeof value === "string" ? value : value.toISOString();
}

function safeMetadata(input: FiscalEvidencePersistenceInput): FiscalEvidenceSafeMetadata {
  return {
    phase: FISCAL_EVIDENCE_PERSISTENCE_PHASE_MARKER,
    evidencePacketPhase: input.packet.safeMetadata.phase,
    source: "local_staging_internal_evidence",
    includesFullXml: false,
    includesDocumentMaterial: false,
    signed: false,
    aeatReady: false,
    payloadXmlMarkerPresent: input.packet.payloadXmlMarkerPresent,
  };
}

function reject(
  error: FiscalEvidencePersistenceError,
): FiscalEvidencePersistenceRepositoryResult {
  if (
    error.code === "chain_state_missing" ||
    error.code === "chain_state_inconsistent"
  ) {
    return {
      status: "conflict",
      reason: error.code,
      message: error.message,
    };
  }
  return {
    status: "rejected",
    reason: error.code,
    message: error.message,
  };
}

function assertInputSafe(input: FiscalEvidencePersistenceInput): void {
  const { record, chain, payload, validation, packet } = input;

  if (
    chain.userId !== record.userId ||
    chain.environment !== record.environment ||
    chain.issuerNif !== record.issuerNif ||
    chain.recordCount < record.recordSequence
  ) {
    throw new FiscalEvidencePersistenceError("chain_state_inconsistent");
  }

  if (
    chain.recordCount === record.recordSequence &&
    (chain.lastRecordId !== record.id || chain.lastHash !== record.recordHash)
  ) {
    throw new FiscalEvidencePersistenceError("chain_state_inconsistent");
  }

  if (validation.status !== "valid") {
    throw new FiscalEvidencePersistenceError("payload_validation_not_valid");
  }

  if (
    validation.payload.payloadCandidateId !== payload.payloadCandidateId ||
    validation.payload.recordId !== record.id ||
    validation.payload.operationId !== record.operationId
  ) {
    throw new FiscalEvidencePersistenceError("payload_packet_mismatch");
  }

  if (
    packet.recordId !== record.id ||
    packet.operationId !== record.operationId ||
    packet.recordSequence !== record.recordSequence ||
    packet.recordHash !== record.recordHash ||
    packet.previousHash !== record.previousHash ||
    packet.environment !== record.environment
  ) {
    throw new FiscalEvidencePersistenceError("record_packet_mismatch");
  }

  if (
    packet.payloadCandidateId !== payload.payloadCandidateId ||
    packet.payloadValidationStatus !== "valid"
  ) {
    throw new FiscalEvidencePersistenceError("payload_packet_mismatch");
  }

  if (packet.finality !== "internal_dry_run_evidence") {
    throw new FiscalEvidencePersistenceError("evidence_finality_invalid");
  }

  if (packet.transportable !== false) {
    throw new FiscalEvidencePersistenceError("transportable_not_allowed");
  }

  if (
    packet.payloadXmlDigest !== null &&
    !SHA256_DIGEST_PATTERN.test(packet.payloadXmlDigest)
  ) {
    throw new FiscalEvidencePersistenceError("xml_candidate_digest_invalid");
  }
}

export class FiscalEvidencePersistenceRepository {
  constructor(private readonly store: FiscalEvidencePersistenceStore) {}

  async persistFiscalEvidencePacketLocalStaging(
    input: FiscalEvidencePersistenceInput,
  ): Promise<FiscalEvidencePersistenceRepositoryResult> {
    try {
      assertInputSafe(input);
    } catch (error) {
      if (error instanceof FiscalEvidencePersistenceError) return reject(error);
      throw error;
    }

    return this.store.createFiscalEvidencePacketLocalStaging({
      userId: input.record.userId,
      recordId: input.record.id,
      payloadCandidateId: input.packet.payloadCandidateId,
      payloadValidationStatus: "valid",
      xmlCandidateDigest: input.packet.payloadXmlDigest,
      evidenceFinality: input.packet.finality,
      transportable: false,
      metadataSafe: safeMetadata(input),
      createdAt: isoDateTime(input.createdAt),
    });
  }
}
