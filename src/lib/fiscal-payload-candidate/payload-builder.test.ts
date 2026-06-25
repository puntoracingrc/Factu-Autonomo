import { describe, expect, it } from "vitest";
import { FiscalPayloadCandidateError } from "./errors";
import {
  FISCAL_PAYLOAD_CANDIDATE_XML_MARKER,
  buildFiscalPayloadCandidate,
  buildFiscalPayloadCandidateResult,
} from "./payload-builder";
import type {
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
} from "@/lib/fiscal-operations/types";
import type {
  FiscalChainHeadState,
  FiscalRecordWithChainLocalStagingRecord,
} from "@/lib/fiscal-records";

const NOW = "2026-06-25T14:30:00.000Z";
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
    rendererVersion: "phase2b4n-o-test",
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

function operation(
  overrides: Partial<FiscalOperationRecord> = {},
): Pick<
  FiscalOperationRecord,
  | "id"
  | "userId"
  | "serverDocumentId"
  | "operationType"
  | "environment"
  | "documentSnapshotHash"
> {
  return {
    id: "operation-1",
    userId: "user-a",
    serverDocumentId: "server-doc-1",
    operationType: "alta_inicial",
    environment: "test",
    documentSnapshotHash: "fnv1a32:aaaaaaaa",
    ...overrides,
  };
}

function identity(
  overrides: Partial<FiscalInvoiceIdentityRecord> = {},
): FiscalInvoiceIdentityRecord {
  return {
    id: "identity-1",
    userId: "user-a",
    serverDocumentId: "server-doc-1",
    environment: "test",
    issuerNif: "B12345678",
    numserie: "F-2026-0001",
    fechaExpedicion: "2026-06-25",
    createdAt: NOW,
    ...overrides,
  };
}

function input(overrides: {
  record?: Partial<FiscalRecordWithChainLocalStagingRecord>;
  chain?: Partial<FiscalChainHeadState> | null;
  operation?: Partial<FiscalOperationRecord>;
  identity?: Partial<FiscalInvoiceIdentityRecord> | null;
} = {}) {
  const rec = record(overrides.record);
  const id =
    overrides.identity === null
      ? null
      : identity({
          id: rec.invoiceIdentityId,
          userId: rec.userId,
          serverDocumentId: rec.serverDocumentId,
          environment: rec.environment,
          issuerNif: rec.issuerNif,
          numserie: rec.numserie,
          fechaExpedicion: rec.fechaExpedicion,
          ...overrides.identity,
        });
  return {
    record: rec,
    chain:
      overrides.chain === null
        ? null
        : chain({
            userId: rec.userId,
            environment: rec.environment,
            issuerNif: rec.issuerNif,
            lastRecordId: rec.id,
            lastHash: rec.recordHash,
            recordCount: rec.recordSequence,
            ...overrides.chain,
          }),
    operation: operation({
      id: rec.operationId,
      userId: rec.userId,
      serverDocumentId: rec.serverDocumentId,
      environment: rec.environment,
      documentSnapshotHash: rec.documentSnapshotHash,
      operationType:
        rec.recordTypeCandidate === "anulacion" ? "anulacion" : "alta_inicial",
      ...overrides.operation,
    }),
    invoiceIdentity: id,
    generatedAtCandidate: NOW,
  };
}

describe("buildFiscalPayloadCandidate", () => {
  it("construye payload candidato desde registro alta", () => {
    const payload = buildFiscalPayloadCandidate(input());

    expect(payload).toMatchObject({
      payloadCandidateId:
        "payload-candidate:record-1:phase2b4n-o-payload-candidate-v1",
      recordId: "record-1",
      operationId: "operation-1",
      recordType: "alta",
      issuerNif: "B12345678",
      numserie: "F-2026-0001",
      fechaExpedicion: "2026-06-25",
      recordHash: RECORD_HASH,
      previousHash: null,
      recordSequence: 1,
      environment: "test",
      generatedAtCandidate: NOW,
      formatVersionCandidate: "phase2b4n-o-payload-candidate-v1",
      finality: "candidate_not_aeat",
      transportable: false,
      safeMetadata: {
        source: "local_staging_fiscal_record_chain",
        aeatReady: false,
        signed: false,
      },
    });
    expect(payload.candidateXml).toContain(FISCAL_PAYLOAD_CANDIDATE_XML_MARKER);
    expect(payload.candidateXml).toContain('transportable="false"');
  });

  it("construye payload candidato desde registro anulacion", () => {
    const payload = buildFiscalPayloadCandidate(
      input({
        record: {
          id: "record-2",
          operationId: "operation-2",
          recordTypeCandidate: "anulacion",
          recordSequence: 2,
          previousRecordId: "record-1",
          previousHash: PREVIOUS_HASH,
        },
        operation: { id: "operation-2", operationType: "anulacion" },
      }),
    );

    expect(payload).toMatchObject({
      recordId: "record-2",
      operationId: "operation-2",
      recordType: "anulacion",
      previousRecordId: "record-1",
      previousHash: PREVIOUS_HASH,
      recordSequence: 2,
      finality: "candidate_not_aeat",
      transportable: false,
    });
  });

  it("permite construir payload de un registro historico con cadena avanzada", () => {
    const payload = buildFiscalPayloadCandidate(
      input({
        chain: {
          lastRecordId: "record-3",
          lastHash:
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          recordCount: 3,
        },
      }),
    );

    expect(payload.recordSequence).toBe(1);
    expect(payload.recordHash).toBe(RECORD_HASH);
  });

  it("rechaza falta de recordHash, issuerNif, numserie y fechaExpedicion", () => {
    expect(() =>
      buildFiscalPayloadCandidate(input({ record: { recordHash: "" } })),
    ).toThrow(FiscalPayloadCandidateError);
    expect(() =>
      buildFiscalPayloadCandidate(input({ record: { issuerNif: "" } })),
    ).toThrow(FiscalPayloadCandidateError);
    expect(() =>
      buildFiscalPayloadCandidate(input({ record: { numserie: "" } })),
    ).toThrow(FiscalPayloadCandidateError);
    expect(() =>
      buildFiscalPayloadCandidate(input({ record: { fechaExpedicion: "" } })),
    ).toThrow(FiscalPayloadCandidateError);
    expect(
      buildFiscalPayloadCandidateResult(input({ record: { recordHash: "" } })),
    ).toMatchObject({
      status: "rejected",
      reason: "record_hash_missing",
    });
    expect(
      buildFiscalPayloadCandidateResult(input({ record: { issuerNif: "" } })),
    ).toMatchObject({
      status: "rejected",
      reason: "issuer_nif_missing",
    });
    expect(
      buildFiscalPayloadCandidateResult(input({ record: { numserie: "" } })),
    ).toMatchObject({
      status: "rejected",
      reason: "numserie_missing",
    });
    expect(
      buildFiscalPayloadCandidateResult(
        input({ record: { fechaExpedicion: "" } }),
      ),
    ).toMatchObject({
      status: "rejected",
      reason: "fecha_expedicion_missing",
    });
  });

  it("rechaza hashes no normalizados", () => {
    expect(
      buildFiscalPayloadCandidateResult(
        input({ record: { recordHash: "candidate_not_final:sha256:abc" } }),
      ),
    ).toMatchObject({
      status: "rejected",
      reason: "record_hash_not_normalized",
    });

    expect(
      buildFiscalPayloadCandidateResult(
        input({
          record: {
            recordSequence: 2,
            previousRecordId: "record-previous",
            previousHash:
              "sha256:BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
          },
        }),
      ),
    ).toMatchObject({
      status: "rejected",
      reason: "previous_hash_not_normalized",
    });
  });

  it("rechaza estado de cadena inconsistente", () => {
    expect(
      buildFiscalPayloadCandidateResult(
        input({
          chain: { issuerNif: "B00000000" },
        }),
      ),
    ).toMatchObject({
      status: "rejected",
      reason: "chain_state_inconsistent",
    });

    expect(
      buildFiscalPayloadCandidateResult(
        input({
          chain: { lastHash: PREVIOUS_HASH },
        }),
      ),
    ).toMatchObject({
      status: "rejected",
      reason: "chain_state_inconsistent",
    });
  });

  it("rechaza operacion, identidad y tipo de registro que no corresponden", () => {
    expect(
      buildFiscalPayloadCandidateResult(
        input({ operation: { id: "operation-other" } }),
      ),
    ).toMatchObject({
      status: "rejected",
      reason: "operation_mismatch",
    });
    expect(
      buildFiscalPayloadCandidateResult(
        input({ identity: { id: "identity-other" } }),
      ),
    ).toMatchObject({
      status: "rejected",
      reason: "identity_mismatch",
    });
    expect(
      buildFiscalPayloadCandidateResult(
        input({ operation: { operationType: "anulacion" } }),
      ),
    ).toMatchObject({
      status: "rejected",
      reason: "operation_type_mismatch",
    });
  });

  it("no firma, no transporta, no llama AEAT, no usa certificados y no escribe DB", () => {
    const payload = buildFiscalPayloadCandidate(input());
    const serialized = JSON.stringify(payload);

    expect(payload.transportable).toBe(false);
    expect(payload.safeMetadata.signed).toBe(false);
    expect(serialized).toContain("candidate_not_aeat");
    expect(serialized).toContain(FISCAL_PAYLOAD_CANDIDATE_XML_MARKER);
    expect(serialized).not.toContain("agenciatributaria");
    expect(serialized).not.toContain("Suministro");
    expect(serialized).not.toContain("Signature");
    expect(serialized).not.toContain("Certificate");
    expect(serialized).not.toContain("private_key");
    expect(serialized).not.toContain("fetch(");
    expect(serialized).not.toContain("fiscal_transport_attempts");
    expect(serialized).not.toContain(".insert");
    expect(serialized).not.toContain(".update");
  });
});
