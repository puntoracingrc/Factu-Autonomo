import { createHash } from "node:crypto";
import { FISCAL_PAYLOAD_CANDIDATE_XML_MARKER } from "@/lib/fiscal-payload-candidate";
import { FiscalEvidencePacketError } from "./errors";
import type {
  FiscalEvidencePacket,
  FiscalEvidencePacketBuildInput,
  FiscalEvidencePacketBuildResult,
} from "./types";

assertServerOnlyModule();

export const FISCAL_EVIDENCE_PACKET_PHASE_MARKER =
  "PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1";

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El builder de evidencia fiscal solo puede cargarse en servidor.",
    );
  }
}

function isoDateTime(value: Date | string | undefined): string {
  if (!value) return new Date().toISOString();
  return typeof value === "string" ? value : value.toISOString();
}

function digestCandidateXml(candidateXml: string | null | undefined): string | null {
  if (!candidateXml) return null;
  return `sha256:${createHash("sha256").update(candidateXml).digest("hex")}`;
}

function assertSafeChain(input: FiscalEvidencePacketBuildInput): void {
  const { record, chain } = input;
  if (!chain) throw new FiscalEvidencePacketError("chain_state_missing");
  if (!record) throw new FiscalEvidencePacketError("record_missing");

  if (
    chain.userId !== record.userId ||
    chain.environment !== record.environment ||
    chain.issuerNif !== record.issuerNif ||
    chain.recordCount < record.recordSequence
  ) {
    throw new FiscalEvidencePacketError("chain_state_inconsistent");
  }

  if (
    chain.recordCount === record.recordSequence &&
    (chain.lastRecordId !== record.id || chain.lastHash !== record.recordHash)
  ) {
    throw new FiscalEvidencePacketError("chain_state_inconsistent");
  }
}

function assertPayloadMatchesRecord(input: FiscalEvidencePacketBuildInput): void {
  const { record, payload } = input;
  if (!record) throw new FiscalEvidencePacketError("record_missing");
  if (!payload) throw new FiscalEvidencePacketError("payload_missing");

  if (
    payload.recordId !== record.id ||
    payload.operationId !== record.operationId ||
    payload.recordSequence !== record.recordSequence ||
    payload.recordHash !== record.recordHash ||
    payload.previousHash !== record.previousHash ||
    payload.environment !== record.environment
  ) {
    throw new FiscalEvidencePacketError("payload_record_mismatch");
  }
}

export function buildFiscalEvidencePacket(
  input: FiscalEvidencePacketBuildInput,
): FiscalEvidencePacket {
  const { record, payload, validation } = input;
  if (!record) throw new FiscalEvidencePacketError("record_missing");
  if (!payload) throw new FiscalEvidencePacketError("payload_missing");
  if (!validation) throw new FiscalEvidencePacketError("validation_missing");
  if (validation.status !== "valid") {
    throw new FiscalEvidencePacketError("payload_invalid");
  }
  if (validation.payload.payloadCandidateId !== payload.payloadCandidateId) {
    throw new FiscalEvidencePacketError("payload_not_validated");
  }

  assertSafeChain(input);
  assertPayloadMatchesRecord(input);

  const payloadXmlDigest = digestCandidateXml(payload.candidateXml);

  return {
    evidencePacketId: `evidence:${record.id}:${payload.payloadCandidateId}:phase2b4p-q`,
    recordId: record.id,
    operationId: record.operationId,
    recordSequence: record.recordSequence,
    recordHash: record.recordHash,
    previousHash: record.previousHash,
    payloadCandidateId: payload.payloadCandidateId,
    payloadValidationStatus: validation.status,
    generatedAt: isoDateTime(input.generatedAt),
    environment: record.environment,
    finality: "internal_dry_run_evidence",
    transportable: false,
    payloadXmlDigest,
    payloadXmlMarkerPresent: payload.candidateXml.includes(
      FISCAL_PAYLOAD_CANDIDATE_XML_MARKER,
    ),
    safeMetadata: {
      phase: FISCAL_EVIDENCE_PACKET_PHASE_MARKER,
      source: "local_dry_run",
      includesFullXml: false,
      includesDocumentSnapshot: false,
      signed: false,
      aeatReady: false,
    },
  };
}

export function buildFiscalEvidencePacketResult(
  input: FiscalEvidencePacketBuildInput,
): FiscalEvidencePacketBuildResult {
  try {
    return {
      status: "built",
      packet: buildFiscalEvidencePacket(input),
    };
  } catch (error) {
    if (error instanceof FiscalEvidencePacketError) {
      return {
        status: "rejected",
        reason: error.code,
        message: error.message,
      };
    }
    throw error;
  }
}
