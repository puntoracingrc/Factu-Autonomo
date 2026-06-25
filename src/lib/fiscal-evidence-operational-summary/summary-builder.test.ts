import { describe, expect, it } from "vitest";
import type {
  FiscalEvidenceIntegrityEvidenceSummary,
  FiscalEvidenceIntegrityEvidenceRecord,
  FiscalEvidenceIntegrityResult,
} from "@/lib/fiscal-evidence-integrity";
import {
  FiscalEvidenceOperationalSummaryBuilder,
  type FiscalEvidenceOperationalSummaryIntegrityReader,
  type FiscalEvidenceOperationalSummaryStore,
} from "./index";

const NOW = "2026-06-25T18:30:00.000Z";
const HASH_1 =
  "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const HASH_2 =
  "sha256:2222222222222222222222222222222222222222222222222222222222222222";
const HASH_3 =
  "sha256:3333333333333333333333333333333333333333333333333333333333333333";
const XML_DIGEST =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function evidence(
  sequence: number,
  overrides: Partial<FiscalEvidenceIntegrityEvidenceRecord> = {},
): FiscalEvidenceIntegrityEvidenceRecord {
  const hash = sequence === 1 ? HASH_1 : sequence === 2 ? HASH_2 : HASH_3;
  return {
    id: `evidence-${sequence}`,
    userId: "user-a",
    environment: "test",
    recordId: `record-${sequence}`,
    operationId: `operation-${sequence}`,
    recordSequence: sequence,
    recordHash: hash,
    previousHash: sequence === 1 ? null : HASH_1,
    payloadCandidateId: `payload-${sequence}`,
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

function evidenceSummary(
  row: FiscalEvidenceIntegrityEvidenceRecord,
): FiscalEvidenceIntegrityEvidenceSummary {
  return {
    id: row.id,
    userId: row.userId,
    environment: row.environment,
    recordId: row.recordId,
    operationId: row.operationId,
    recordSequence: row.recordSequence,
    recordHash: row.recordHash,
    previousHash: row.previousHash,
    payloadCandidateId: row.payloadCandidateId,
    payloadValidationStatus: row.payloadValidationStatus,
    xmlCandidateDigest: row.xmlCandidateDigest,
    evidenceFinality: row.evidenceFinality,
    transportable: row.transportable,
    createdAt: row.createdAt,
  };
}

function validResult(
  row: FiscalEvidenceIntegrityEvidenceRecord,
): FiscalEvidenceIntegrityResult {
  return {
    phase: "PHASE2B4T_FISCAL_EVIDENCE_READ_INTEGRITY_V1",
    status: "valid",
    evidence: evidenceSummary(row),
    checks: [],
  };
}

class MemoryStore implements FiscalEvidenceOperationalSummaryStore {
  evidenceRows: FiscalEvidenceIntegrityEvidenceRecord[] = [
    evidence(1),
    evidence(2),
    evidence(3),
  ];
  transportAttemptCount = 0;

  async findEvidencePackets(): Promise<
    readonly FiscalEvidenceIntegrityEvidenceRecord[]
  > {
    return this.evidenceRows;
  }

  async countFiscalTransportAttempts(): Promise<number> {
    return this.transportAttemptCount;
  }
}

class MemoryIntegrityReader
  implements FiscalEvidenceOperationalSummaryIntegrityReader
{
  results: FiscalEvidenceIntegrityResult[] = [
    validResult(evidence(1)),
    validResult(evidence(2)),
    validResult(evidence(3)),
  ];

  async readFiscalEvidenceIntegrity(): Promise<
    readonly FiscalEvidenceIntegrityResult[]
  > {
    return this.results;
  }
}

function builder(
  store = new MemoryStore(),
  reader = new MemoryIntegrityReader(),
) {
  return {
    store,
    reader,
    builder: new FiscalEvidenceOperationalSummaryBuilder(store, reader),
  };
}

describe("FiscalEvidenceOperationalSummaryBuilder", () => {
  it("crea resumen ok con conteos, ultimo registro y respuesta segura", async () => {
    const { builder: summaryBuilder } = builder();

    const summary = await summaryBuilder.buildFiscalEvidenceOperationalSummary({
      userId: "user-a",
      environment: "test",
      generatedAt: NOW,
    });

    expect(summary).toMatchObject({
      phase: "PHASE2B4U_FISCAL_EVIDENCE_OPERATIONAL_SUMMARY_CHECKPOINT_V1",
      status: "ok",
      userId: "user-a",
      environment: "test",
      generatedAt: NOW,
      totalEvidencePackets: 3,
      totalCoveredRecords: 3,
      latestRecordSequence: 3,
      latestRecordHash: HASH_3,
      validEvidenceCount: 3,
      mismatchEvidenceCount: 0,
      rejectedEvidenceCount: 0,
      unsafeMetadataEvidenceCount: 0,
      missingRecordCount: 0,
      missingChainCount: 0,
      hasSequenceGaps: false,
      sequenceGaps: [],
      hasTransportableNotFalse: false,
      hasFullXmlOrSnapshotMetadata: false,
      transportAttemptCount: 0,
      hasTransportAttempts: false,
    });

    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("<FiscalPayloadCandidate");
    expect(serialized).not.toContain("documentSnapshot");
    expect(serialized).not.toContain("document_snapshot");
    expect(serialized).not.toContain("pdf_snapshot");
    expect(serialized).not.toContain("payloadDocument");
    expect(serialized.toLowerCase()).not.toContain("token");
    expect(serialized).not.toContain("service_role");
  });

  it("marca attention para gaps, mismatch, rechazos, metadata insegura y transporte", async () => {
    const store = new MemoryStore();
    store.evidenceRows = [
      evidence(1),
      evidence(3, {
        transportable: true,
        metadataSafe: {
          phase: "PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1",
          includesFullXml: false,
          includesDocumentMaterial: false,
          signed: false,
          aeatReady: false,
          document_snapshot: { forbidden: true },
        },
      }),
    ];
    store.transportAttemptCount = 1;

    const reader = new MemoryIntegrityReader();
    const thirdEvidence = evidenceSummary(evidence(3));
    reader.results = [
      validResult(evidence(1)),
      {
        phase: "PHASE2B4T_FISCAL_EVIDENCE_READ_INTEGRITY_V1",
        status: "mismatch",
        evidence: thirdEvidence,
        checks: [],
        mismatches: [
          {
            field: "record_hash",
            source: "fiscal_records",
            evidenceValue: HASH_3,
            referenceValue: HASH_2,
          },
        ],
      },
      {
        phase: "PHASE2B4T_FISCAL_EVIDENCE_READ_INTEGRITY_V1",
        status: "rejected",
        reason: "transportable_not_false",
        message: "transportable",
        evidence: thirdEvidence,
        checks: [],
      },
      {
        phase: "PHASE2B4T_FISCAL_EVIDENCE_READ_INTEGRITY_V1",
        status: "unsafe_metadata",
        evidence: thirdEvidence,
        reasons: ["metadata_sensitive_marker"],
        checks: [],
      },
      {
        phase: "PHASE2B4T_FISCAL_EVIDENCE_READ_INTEGRITY_V1",
        status: "missing_record",
        evidence: thirdEvidence,
        checks: [],
      },
      {
        phase: "PHASE2B4T_FISCAL_EVIDENCE_READ_INTEGRITY_V1",
        status: "missing_chain",
        evidence: thirdEvidence,
        checks: [],
      },
    ];

    const summary = await builder(
      store,
      reader,
    ).builder.buildFiscalEvidenceOperationalSummary({
      userId: "user-a",
      environment: "test",
      generatedAt: NOW,
    });

    expect(summary).toMatchObject({
      status: "attention",
      totalEvidencePackets: 2,
      totalCoveredRecords: 2,
      latestRecordSequence: 3,
      latestRecordHash: HASH_3,
      validEvidenceCount: 1,
      mismatchEvidenceCount: 1,
      rejectedEvidenceCount: 1,
      unsafeMetadataEvidenceCount: 1,
      missingRecordCount: 1,
      missingChainCount: 1,
      hasSequenceGaps: true,
      sequenceGaps: [2],
      hasTransportableNotFalse: true,
      hasFullXmlOrSnapshotMetadata: true,
      transportAttemptCount: 1,
      hasTransportAttempts: true,
    });
    expect(JSON.stringify(summary)).not.toContain("document_snapshot");
  });

  it("devuelve resumen vacio seguro cuando no hay evidencia", async () => {
    const store = new MemoryStore();
    store.evidenceRows = [];
    const reader = new MemoryIntegrityReader();
    reader.results = [
      {
        phase: "PHASE2B4T_FISCAL_EVIDENCE_READ_INTEGRITY_V1",
        status: "rejected",
        reason: "evidence_not_found",
        message: "empty",
        checks: [],
      },
    ];

    const summary = await builder(
      store,
      reader,
    ).builder.buildFiscalEvidenceOperationalSummary({
      userId: "user-a",
      environment: "test",
      generatedAt: NOW,
    });

    expect(summary).toMatchObject({
      status: "ok",
      totalEvidencePackets: 0,
      totalCoveredRecords: 0,
      latestRecordSequence: null,
      latestRecordHash: null,
      validEvidenceCount: 0,
      rejectedEvidenceCount: 0,
      hasSequenceGaps: false,
    });
  });

  it("rechaza input sin user_id", async () => {
    await expect(
      builder().builder.buildFiscalEvidenceOperationalSummary({
        userId: " ",
        environment: "test",
      }),
    ).rejects.toMatchObject({
      name: "FiscalEvidenceOperationalSummaryError",
      code: "invalid_summary_input",
    });
  });
});
