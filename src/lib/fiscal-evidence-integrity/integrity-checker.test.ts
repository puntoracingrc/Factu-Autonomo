import { describe, expect, it } from "vitest";
import {
  FiscalEvidenceIntegrityChecker,
  type FiscalEvidenceIntegrityChainState,
  type FiscalEvidenceIntegrityEvidenceRecord,
  type FiscalEvidenceIntegrityFiscalRecord,
  type FiscalEvidenceIntegrityReadInput,
  type FiscalEvidenceIntegrityStore,
} from "./index";

const NOW = "2026-06-25T16:20:00.000Z";
const HASH =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PREVIOUS_HASH =
  "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const XML_DIGEST =
  "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

function evidence(
  overrides: Partial<FiscalEvidenceIntegrityEvidenceRecord> = {},
): FiscalEvidenceIntegrityEvidenceRecord {
  return {
    id: "evidence-row-1",
    userId: "user-a",
    environment: "test",
    recordId: "record-1",
    operationId: "operation-1",
    recordSequence: 2,
    recordHash: HASH,
    previousHash: PREVIOUS_HASH,
    payloadCandidateId: "payload-1",
    payloadValidationStatus: "valid",
    xmlCandidateDigest: XML_DIGEST,
    evidenceFinality: "internal_dry_run_evidence",
    transportable: false,
    createdAt: NOW,
    metadataSafe: {
      phase: "PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1",
      evidencePacketPhase:
        "PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1",
      source: "local_staging_internal_evidence",
      includesFullXml: false,
      includesDocumentMaterial: false,
      signed: false,
      aeatReady: false,
      payloadXmlMarkerPresent: true,
    },
    ...overrides,
  };
}

function record(
  overrides: Partial<FiscalEvidenceIntegrityFiscalRecord> = {},
): FiscalEvidenceIntegrityFiscalRecord {
  return {
    id: "record-1",
    userId: "user-a",
    operationId: "operation-1",
    environment: "test",
    issuerNif: "B12345678",
    recordSequence: 2,
    recordHash: HASH,
    previousHash: PREVIOUS_HASH,
    ...overrides,
  };
}

function chain(
  overrides: Partial<FiscalEvidenceIntegrityChainState> = {},
): FiscalEvidenceIntegrityChainState {
  return {
    userId: "user-a",
    environment: "test",
    issuerNif: "B12345678",
    lastRecordId: "record-1",
    lastHash: HASH,
    recordCount: 2,
    updatedAt: NOW,
    ...overrides,
  };
}

class MemoryStore implements FiscalEvidenceIntegrityStore {
  evidenceRows: FiscalEvidenceIntegrityEvidenceRecord[] = [evidence()];
  fiscalRecord: FiscalEvidenceIntegrityFiscalRecord | null = record();
  chainState: FiscalEvidenceIntegrityChainState | null = chain();
  reads: FiscalEvidenceIntegrityReadInput[] = [];

  async findEvidencePackets(
    input: FiscalEvidenceIntegrityReadInput,
  ): Promise<readonly FiscalEvidenceIntegrityEvidenceRecord[]> {
    this.reads.push(input);
    return this.evidenceRows;
  }

  async findFiscalRecord(): Promise<FiscalEvidenceIntegrityFiscalRecord | null> {
    return this.fiscalRecord;
  }

  async findFiscalChainState(): Promise<FiscalEvidenceIntegrityChainState | null> {
    return this.chainState;
  }
}

function checker(store = new MemoryStore()) {
  return {
    store,
    checker: new FiscalEvidenceIntegrityChecker(store),
  };
}

describe("FiscalEvidenceIntegrityChecker", () => {
  it("devuelve valid con respuesta segura para evidencia consistente", async () => {
    const { checker: integrityChecker } = checker();

    const results = await integrityChecker.readFiscalEvidenceIntegrity({
      userId: "user-a",
      environment: "test",
      recordId: "record-1",
      operationId: "operation-1",
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      phase: "PHASE2B4T_FISCAL_EVIDENCE_READ_INTEGRITY_V1",
      status: "valid",
      evidence: {
        recordId: "record-1",
        operationId: "operation-1",
        payloadValidationStatus: "valid",
        evidenceFinality: "internal_dry_run_evidence",
        transportable: false,
        metadata: {
          phase: "PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1",
          includesFullXml: false,
          includesDocumentMaterial: false,
          signed: false,
          aeatReady: false,
        },
      },
    });

    const serialized = JSON.stringify(results);
    expect(serialized).not.toContain("<FiscalPayloadCandidate");
    expect(serialized).not.toContain("documentSnapshot");
    expect(serialized).not.toContain("document_snapshot");
    expect(serialized).not.toContain("pdf_snapshot");
    expect(serialized).not.toContain("payloadDocument");
    expect(serialized.toLowerCase()).not.toContain("token");
    expect(serialized).not.toContain("service_role");
    expect(serialized).not.toContain("fiscal_transport_attempts");
  });

  it("pasa filtros de lectura por user_id, record_id, operation_id y environment", async () => {
    const { store, checker: integrityChecker } = checker();

    await integrityChecker.readFiscalEvidenceIntegrity({
      userId: "user-a",
      recordId: "record-1",
      operationId: "operation-1",
      environment: "test",
    });

    expect(store.reads).toEqual([
      {
        userId: "user-a",
        recordId: "record-1",
        operationId: "operation-1",
        environment: "test",
      },
    ]);
  });

  it("devuelve mismatch cuando record_hash no coincide con fiscal_records", async () => {
    const { store, checker: integrityChecker } = checker();
    store.fiscalRecord = record({
      recordHash:
        "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    });

    const [result] = await integrityChecker.readFiscalEvidenceIntegrity({
      userId: "user-a",
    });

    expect(result.status).toBe("mismatch");
    if (result.status !== "mismatch") throw new Error("Expected mismatch");
    expect(result.mismatches).toContainEqual({
      field: "record_hash",
      source: "fiscal_records",
      evidenceValue: HASH,
      referenceValue:
        "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    });
  });

  it("devuelve mismatch cuando previous_hash no coincide con fiscal_records", async () => {
    const { store, checker: integrityChecker } = checker();
    store.fiscalRecord = record({ previousHash: null });

    const [result] = await integrityChecker.readFiscalEvidenceIntegrity({
      userId: "user-a",
    });

    expect(result.status).toBe("mismatch");
    if (result.status !== "mismatch") throw new Error("Expected mismatch");
    expect(result.mismatches).toContainEqual({
      field: "previous_hash",
      source: "fiscal_records",
      evidenceValue: PREVIOUS_HASH,
      referenceValue: null,
    });
  });

  it("devuelve missing_record sin exponer material documental", async () => {
    const { store, checker: integrityChecker } = checker();
    store.fiscalRecord = null;

    const [result] = await integrityChecker.readFiscalEvidenceIntegrity({
      userId: "user-a",
    });

    expect(result.status).toBe("missing_record");
    expect(JSON.stringify(result)).not.toContain("document_snapshot");
  });

  it("devuelve missing_chain cuando falta fiscal_chain_state", async () => {
    const { store, checker: integrityChecker } = checker();
    store.chainState = null;

    const [result] = await integrityChecker.readFiscalEvidenceIntegrity({
      userId: "user-a",
    });

    expect(result.status).toBe("missing_chain");
  });

  it("devuelve unsafe_metadata sin devolver metadata cruda sensible", async () => {
    const { store, checker: integrityChecker } = checker();
    store.evidenceRows = [
      evidence({
        metadataSafe: {
          phase: "PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1",
          includesFullXml: false,
          includesDocumentMaterial: false,
          signed: false,
          aeatReady: false,
          candidateXml: "<FiscalPayloadCandidate>unsafe</FiscalPayloadCandidate>",
        },
      }),
    ];

    const [result] = await integrityChecker.readFiscalEvidenceIntegrity({
      userId: "user-a",
    });

    expect(result.status).toBe("unsafe_metadata");
    expect(JSON.stringify(result)).not.toContain("<FiscalPayloadCandidate");
    if (result.status !== "unsafe_metadata") {
      throw new Error("Expected unsafe metadata");
    }
    expect(result.reasons).toContain("metadata_sensitive_marker");
  });

  it("rechaza transportable=true antes de comparar cadena", async () => {
    const { store, checker: integrityChecker } = checker();
    store.evidenceRows = [evidence({ transportable: true })];

    const [result] = await integrityChecker.readFiscalEvidenceIntegrity({
      userId: "user-a",
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "transportable_not_false",
    });
  });

  it("rechaza evidencia sin digest de XML candidato", async () => {
    const { store, checker: integrityChecker } = checker();
    store.evidenceRows = [evidence({ xmlCandidateDigest: null })];

    const [result] = await integrityChecker.readFiscalEvidenceIntegrity({
      userId: "user-a",
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "xml_candidate_digest_missing",
    });
  });

  it("devuelve rejected si no hay evidencia para los filtros", async () => {
    const { store, checker: integrityChecker } = checker();
    store.evidenceRows = [];

    const [result] = await integrityChecker.readFiscalEvidenceIntegrity({
      userId: "user-a",
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "evidence_not_found",
    });
  });
});
