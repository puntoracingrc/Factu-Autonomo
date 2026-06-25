import { describe, expect, it } from "vitest";
import {
  FISCAL_PAYLOAD_CANDIDATE_XML_MARKER,
  type FiscalPayloadCandidate,
} from "@/lib/fiscal-payload-candidate";
import { validateFiscalPayloadCandidate } from "@/lib/fiscal-payload-validation";
import type {
  FiscalChainHeadState,
  FiscalRecordWithChainLocalStagingRecord,
} from "@/lib/fiscal-records";
import {
  buildFiscalEvidencePacket,
  buildFiscalEvidencePacketResult,
} from "./evidence-packet-builder";

const NOW = "2026-06-25T15:20:00.000Z";
const RECORD_HASH =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PREVIOUS_HASH =
  "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function record(
  overrides: Partial<FiscalRecordWithChainLocalStagingRecord> = {},
): FiscalRecordWithChainLocalStagingRecord {
  return {
    id: "record-1",
    userId: "user-a",
    operationId: "operation-1",
    invoiceIdentityId: "identity-1",
    serverDocumentId: "server-doc-1",
    environment: "test",
    issuerNif: "B12345678",
    numserie: "F-2026-0001",
    fechaExpedicion: "2026-06-25",
    recordTypeCandidate: "alta",
    recordSequence: 1,
    previousRecordId: null,
    previousHash: null,
    recordHash: RECORD_HASH,
    hashAlgorithm: "sha256-candidate",
    recordTimestamp: NOW,
    documentSnapshotHash: "fnv1a32:aaaaaaaa",
    pdfContentHash: "fnv1a32:bbbbbbbb",
    schemaVersion: "phase2b4m-chain-local-staging-v1",
    rendererVersion: "phase2b4p-q-test",
    createdAt: NOW,
    ...overrides,
  };
}

function chain(
  overrides: Partial<FiscalChainHeadState> = {},
): FiscalChainHeadState {
  return {
    userId: "user-a",
    environment: "test",
    issuerNif: "B12345678",
    lastRecordId: "record-1",
    lastHash: RECORD_HASH,
    recordCount: 1,
    updatedAt: NOW,
    ...overrides,
  };
}

function payload(
  overrides: Partial<FiscalPayloadCandidate> = {},
): FiscalPayloadCandidate {
  return {
    payloadCandidateId: "payload-candidate:record-1:phase2b4n-o-payload-candidate-v1",
    recordId: "record-1",
    operationId: "operation-1",
    recordType: "alta",
    issuerNif: "B12345678",
    numserie: "F-2026-0001",
    fechaExpedicion: "2026-06-25",
    recordHash: RECORD_HASH,
    previousRecordId: null,
    previousHash: null,
    recordSequence: 1,
    environment: "test",
    generatedAtCandidate: NOW,
    formatVersionCandidate: "phase2b4n-o-payload-candidate-v1",
    finality: "candidate_not_aeat",
    transportable: false,
    candidateXml: `<FiscalPayloadCandidate marker="${FISCAL_PAYLOAD_CANDIDATE_XML_MARKER}" finality="candidate_not_aeat" transportable="false" />`,
    safeMetadata: {
      source: "local_staging_fiscal_record_chain",
      phase: "PHASE2B4N_O_FISCAL_PAYLOAD_CANDIDATE_LOCAL_ACCEPTANCE_V1",
      aeatReady: false,
      signed: false,
    },
    ...overrides,
  };
}

describe("buildFiscalEvidencePacket", () => {
  it("crea paquete de evidencia valido", () => {
    const candidate = payload();
    const validation = validateFiscalPayloadCandidate(candidate, {
      checkedAt: NOW,
    });
    const packet = buildFiscalEvidencePacket({
      record: record(),
      chain: chain(),
      payload: candidate,
      validation,
      generatedAt: NOW,
    });

    expect(packet).toMatchObject({
      evidencePacketId:
        "evidence:record-1:payload-candidate:record-1:phase2b4n-o-payload-candidate-v1:phase2b4p-q",
      recordId: "record-1",
      operationId: "operation-1",
      recordSequence: 1,
      recordHash: RECORD_HASH,
      previousHash: null,
      payloadCandidateId:
        "payload-candidate:record-1:phase2b4n-o-payload-candidate-v1",
      payloadValidationStatus: "valid",
      generatedAt: NOW,
      environment: "test",
      finality: "internal_dry_run_evidence",
      transportable: false,
      payloadXmlMarkerPresent: true,
      safeMetadata: {
        includesFullXml: false,
        includesDocumentSnapshot: false,
        signed: false,
        aeatReady: false,
      },
    });
    expect(packet.payloadXmlDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("rechaza payload no validado", () => {
    const result = buildFiscalEvidencePacketResult({
      record: record(),
      chain: chain(),
      payload: payload(),
      validation: null,
      generatedAt: NOW,
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "validation_missing",
    });
  });

  it("rechaza payload invalido", () => {
    const invalidPayload = payload({ finality: "aeat_final" as "candidate_not_aeat" });
    const validation = validateFiscalPayloadCandidate(invalidPayload, {
      checkedAt: NOW,
    });
    const result = buildFiscalEvidencePacketResult({
      record: record(),
      chain: chain(),
      payload: invalidPayload,
      validation,
      generatedAt: NOW,
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "payload_invalid",
    });
  });

  it("rechaza payload validado de otro registro", () => {
    const otherPayload = payload({
      payloadCandidateId:
        "payload-candidate:record-other:phase2b4n-o-payload-candidate-v1",
      recordId: "record-other",
    });
    const validation = validateFiscalPayloadCandidate(payload(), {
      checkedAt: NOW,
    });
    const result = buildFiscalEvidencePacketResult({
      record: record(),
      chain: chain(),
      payload: otherPayload,
      validation,
      generatedAt: NOW,
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "payload_not_validated",
    });
  });

  it("rechaza cadena inconsistente", () => {
    const candidate = payload();
    const validation = validateFiscalPayloadCandidate(candidate);
    const result = buildFiscalEvidencePacketResult({
      record: record(),
      chain: chain({ lastHash: PREVIOUS_HASH }),
      payload: candidate,
      validation,
      generatedAt: NOW,
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "chain_state_inconsistent",
    });
  });

  it("no contiene XML completo, snapshots, tokens, secretos ni transporte", () => {
    const candidate = payload();
    const validation = validateFiscalPayloadCandidate(candidate);
    const packet = buildFiscalEvidencePacket({
      record: record(),
      chain: chain(),
      payload: candidate,
      validation,
      generatedAt: NOW,
    });
    const serialized = JSON.stringify(packet);

    expect(packet.transportable).toBe(false);
    expect(serialized).not.toContain("<FiscalPayloadCandidate");
    expect(serialized).not.toContain(FISCAL_PAYLOAD_CANDIDATE_XML_MARKER);
    expect(serialized).not.toContain("documentSnapshot");
    expect(serialized).not.toContain("payloadDocument");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("service_role");
    expect(serialized).not.toContain("private_key");
    expect(serialized).not.toContain("agenciatributaria");
    expect(serialized).not.toContain("fiscal_transport_attempts");
  });

  it("mantiene errores tipados estables", () => {
    const result = buildFiscalEvidencePacketResult({
      record: null,
      chain: null,
      payload: null,
      validation: null,
      generatedAt: NOW,
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "record_missing",
    });
  });
});
