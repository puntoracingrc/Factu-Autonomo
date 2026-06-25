import { describe, expect, it } from "vitest";
import type { FiscalEvidencePacket } from "@/lib/fiscal-evidence-packet";
import type { FiscalPayloadCandidate } from "@/lib/fiscal-payload-candidate";
import type { FiscalPayloadValidationResult } from "@/lib/fiscal-payload-validation";
import type {
  FiscalChainHeadState,
  FiscalRecordWithChainLocalStagingRecord,
} from "@/lib/fiscal-records";
import {
  FiscalEvidencePersistenceRepository,
  type FiscalEvidencePersistenceCreateInput,
  type FiscalEvidencePersistenceStore,
  type FiscalEvidencePersistenceStoreResult,
} from "./index";

const NOW = "2026-06-25T15:30:00.000Z";
const HASH =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const XML_DIGEST =
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
    recordHash: HASH,
    hashAlgorithm: "sha256-candidate",
    recordTimestamp: NOW,
    documentSnapshotHash: "fnv1a32:aaaaaaaa",
    pdfContentHash: null,
    schemaVersion: "phase2b4m-chain-local-staging-v1",
    rendererVersion: null,
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
    lastHash: HASH,
    recordCount: 1,
    updatedAt: NOW,
    ...overrides,
  };
}

function payload(
  overrides: Partial<FiscalPayloadCandidate> = {},
): FiscalPayloadCandidate {
  return {
    payloadCandidateId: "payload-1",
    recordId: "record-1",
    operationId: "operation-1",
    recordType: "alta",
    issuerNif: "B12345678",
    numserie: "F-2026-0001",
    fechaExpedicion: "2026-06-25",
    recordHash: HASH,
    previousRecordId: null,
    previousHash: null,
    recordSequence: 1,
    environment: "test",
    generatedAtCandidate: NOW,
    formatVersionCandidate: "phase2b4n-o-payload-candidate-v1",
    finality: "candidate_not_aeat",
    transportable: false,
    candidateXml: "<FiscalPayloadCandidate>redacted</FiscalPayloadCandidate>",
    safeMetadata: {
      source: "local_staging_fiscal_record_chain",
      phase: "PHASE2B4N_O_FISCAL_PAYLOAD_CANDIDATE_LOCAL_ACCEPTANCE_V1",
      aeatReady: false,
      signed: false,
    },
    ...overrides,
  };
}

function validation(
  candidate = payload(),
): FiscalPayloadValidationResult {
  return {
    status: "valid",
    payload: candidate,
    errors: [],
    warnings: [],
    checkedAt: NOW,
  };
}

function packet(
  overrides: Partial<FiscalEvidencePacket> = {},
): FiscalEvidencePacket {
  return {
    evidencePacketId: "evidence:record-1:payload-1:phase2b4p-q",
    recordId: "record-1",
    operationId: "operation-1",
    recordSequence: 1,
    recordHash: HASH,
    previousHash: null,
    payloadCandidateId: "payload-1",
    payloadValidationStatus: "valid",
    generatedAt: NOW,
    environment: "test",
    finality: "internal_dry_run_evidence",
    transportable: false,
    payloadXmlDigest: XML_DIGEST,
    payloadXmlMarkerPresent: true,
    safeMetadata: {
      phase: "PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1",
      source: "local_dry_run",
      includesFullXml: false,
      includesDocumentSnapshot: false,
      signed: false,
      aeatReady: false,
    },
    ...overrides,
  };
}

function evidenceResult(
  input: FiscalEvidencePersistenceCreateInput,
  status: "created" | "existing" = "created",
): FiscalEvidencePersistenceStoreResult {
  return {
    status,
    atomicity: "postgres_rpc",
    evidence: {
      id: "evidence-row-1",
      userId: input.userId,
      environment: "test",
      recordId: input.recordId,
      operationId: "operation-1",
      recordSequence: 1,
      recordHash: HASH,
      previousHash: null,
      payloadCandidateId: input.payloadCandidateId,
      payloadValidationStatus: "valid",
      xmlCandidateDigest: input.xmlCandidateDigest,
      evidenceFinality: "internal_dry_run_evidence",
      transportable: false,
      createdAt: input.createdAt,
      metadataSafe: input.metadataSafe,
    },
  };
}

class MemoryStore implements FiscalEvidencePersistenceStore {
  calls: FiscalEvidencePersistenceCreateInput[] = [];
  nextStatus: "created" | "existing" = "created";

  async createFiscalEvidencePacketLocalStaging(
    input: FiscalEvidencePersistenceCreateInput,
  ): Promise<FiscalEvidencePersistenceStoreResult> {
    this.calls.push(input);
    return evidenceResult(input, this.nextStatus);
  }
}

function repository(store = new MemoryStore()) {
  return {
    store,
    repo: new FiscalEvidencePersistenceRepository(store),
  };
}

describe("FiscalEvidencePersistenceRepository", () => {
  it("persiste un paquete de evidencia interno con metadata segura", async () => {
    const { store, repo } = repository();

    const result = await repo.persistFiscalEvidencePacketLocalStaging({
      record: record(),
      chain: chain(),
      payload: payload(),
      validation: validation(),
      packet: packet(),
      createdAt: NOW,
    });

    expect(result.status).toBe("created");
    expect(store.calls).toHaveLength(1);
    expect(store.calls[0]).toMatchObject({
      userId: "user-a",
      recordId: "record-1",
      payloadCandidateId: "payload-1",
      payloadValidationStatus: "valid",
      xmlCandidateDigest: XML_DIGEST,
      evidenceFinality: "internal_dry_run_evidence",
      transportable: false,
    });
    expect(store.calls[0].metadataSafe).toEqual({
      phase: "PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1",
      evidencePacketPhase: "PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1",
      source: "local_staging_internal_evidence",
      includesFullXml: false,
      includesDocumentMaterial: false,
      signed: false,
      aeatReady: false,
      payloadXmlMarkerPresent: true,
    });
    const serialized = JSON.stringify(store.calls[0]);
    expect(serialized).not.toContain("<FiscalPayloadCandidate");
    expect(serialized).not.toContain("documentSnapshotHash");
    expect(serialized).not.toContain("document_snapshot");
    expect(serialized).not.toContain("payloadDocument");
    expect(serialized).not.toContain("service_role");
    expect(serialized).not.toContain("fiscal_transport_attempts");
  });

  it("devuelve existing si la RPC ya tenia evidencia para el registro", async () => {
    const { store, repo } = repository();
    store.nextStatus = "existing";

    const result = await repo.persistFiscalEvidencePacketLocalStaging({
      record: record(),
      chain: chain(),
      payload: payload(),
      validation: validation(),
      packet: packet(),
      createdAt: NOW,
    });

    expect(result.status).toBe("existing");
  });

  it("rechaza antes de tocar store si la validacion no es valid", async () => {
    const { store, repo } = repository();

    const result = await repo.persistFiscalEvidencePacketLocalStaging({
      record: record(),
      chain: chain(),
      payload: payload(),
      validation: {
        status: "rejected",
        errors: [{ code: "record_hash_missing", message: "missing" }],
        warnings: [],
        checkedAt: NOW,
      },
      packet: packet(),
      createdAt: NOW,
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "payload_validation_not_valid",
    });
    expect(store.calls).toHaveLength(0);
  });

  it("rechaza si el paquete no corresponde al registro", async () => {
    const { store, repo } = repository();

    const result = await repo.persistFiscalEvidencePacketLocalStaging({
      record: record(),
      chain: chain(),
      payload: payload(),
      validation: validation(),
      packet: packet({ recordId: "other-record" }),
      createdAt: NOW,
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "record_packet_mismatch",
    });
    expect(store.calls).toHaveLength(0);
  });

  it("rechaza si la cabecera de cadena no confirma el registro", async () => {
    const { store, repo } = repository();

    const result = await repo.persistFiscalEvidencePacketLocalStaging({
      record: record(),
      chain: chain({ lastHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" }),
      payload: payload(),
      validation: validation(),
      packet: packet(),
      createdAt: NOW,
    });

    expect(result).toMatchObject({
      status: "conflict",
      reason: "chain_state_inconsistent",
    });
    expect(store.calls).toHaveLength(0);
  });
});
