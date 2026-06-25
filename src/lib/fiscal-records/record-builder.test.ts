import { describe, expect, it } from "vitest";
import { FiscalRecordError } from "./errors";
import {
  buildFiscalRecordCandidate,
  buildFiscalRecordCandidateResult,
} from "./record-builder";
import type {
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
  FiscalOperationType,
} from "@/lib/fiscal-operations/types";
import type { FiscalRecordMaterialCandidate } from "@/lib/fiscal-record-material/types";

const NOW = "2026-06-25T12:30:00.000Z";

function operation(
  overrides: Partial<FiscalOperationRecord> = {},
): FiscalOperationRecord {
  return {
    id: "operation-1",
    userId: "user-a",
    serverDocumentId: "server-doc-1",
    operationType: "alta_inicial",
    environment: "test",
    idempotencyKey: "key-a",
    requestedBy: "user-a",
    requestedAt: NOW,
    expectedDocumentVersion: 9,
    documentSnapshotHash: "fnv1a32:aaaaaaaa",
    status: "processing",
    completedAt: null,
    failedAt: null,
    failureCode: null,
    failureMessage: null,
    createdAt: NOW,
    updatedAt: NOW,
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

function material(
  overrides: Partial<FiscalRecordMaterialCandidate> = {},
): FiscalRecordMaterialCandidate {
  return {
    dryRun: true,
    finality: "preliminary_not_aeat",
    operationId: "operation-1",
    invoiceIdentityId: "identity-1",
    serverDocumentId: "server-doc-1",
    operationType: "alta_inicial",
    recordTypeCandidate: "alta_inicial",
    issuerNif: "B12345678",
    numserie: "F-2026-0001",
    fechaExpedicion: "2026-06-25",
    documentSnapshotHash: "fnv1a32:aaaaaaaa",
    pdfContentHash: "fnv1a32:bbbbbbbb",
    schemaVersionCandidate: "phase2b4g-dry-run-v1",
    hashInputCandidate: "{}",
    createdAtCandidate: NOW,
    ...overrides,
  };
}

function input(overrides: {
  operation?: Partial<FiscalOperationRecord>;
  identity?: Partial<FiscalInvoiceIdentityRecord> | null;
  material?: Partial<FiscalRecordMaterialCandidate>;
} = {}) {
  const op = operation(overrides.operation);
  const id =
    overrides.identity === null ? null : identity(overrides.identity ?? {});
  return {
    operation: op,
    invoiceIdentity: id,
    material: material({
      operationId: op.id,
      invoiceIdentityId: id?.id ?? "identity-1",
      serverDocumentId: op.serverDocumentId,
      operationType: op.operationType as FiscalOperationType,
      documentSnapshotHash: op.documentSnapshotHash,
      pdfContentHash: "fnv1a32:bbbbbbbb",
      ...overrides.material,
    }),
    recordTimestampCandidate: NOW,
  };
}

describe("buildFiscalRecordCandidate", () => {
  it("construye candidato alta desde alta_inicial", () => {
    const record = buildFiscalRecordCandidate(input());

    expect(record).toMatchObject({
      candidate: true,
      finality: "candidate_not_aeat",
      operationId: "operation-1",
      invoiceIdentityId: "identity-1",
      serverDocumentId: "server-doc-1",
      operationType: "alta_inicial",
      recordTypeCandidate: "alta",
      environment: "test",
      issuerNif: "B12345678",
      numserie: "F-2026-0001",
      fechaExpedicion: "2026-06-25",
      documentSnapshotHash: "fnv1a32:aaaaaaaa",
      schemaVersionCandidate: "phase2b4j-record-candidate-v1",
    });
    expect(record.hashInputCandidate).toContain(
      "PHASE2B4J_RECORD_HASH_INPUT_CANDIDATE",
    );
  });

  it("construye candidato alta desde alta_subsanacion", () => {
    const record = buildFiscalRecordCandidate(
      input({
        operation: { operationType: "alta_subsanacion" },
        material: {
          operationType: "alta_subsanacion",
          recordTypeCandidate: "alta_subsanacion",
        },
      }),
    );

    expect(record.operationType).toBe("alta_subsanacion");
    expect(record.recordTypeCandidate).toBe("alta");
  });

  it("construye candidato anulacion", () => {
    const record = buildFiscalRecordCandidate(
      input({
        operation: { operationType: "anulacion" },
        material: {
          operationType: "anulacion",
          recordTypeCandidate: "anulacion",
        },
      }),
    );

    expect(record.operationType).toBe("anulacion");
    expect(record.recordTypeCandidate).toBe("anulacion");
  });

  it("rechaza operacion no processing", () => {
    expect(() =>
      buildFiscalRecordCandidate(input({ operation: { status: "requested" } })),
    ).toThrow(FiscalRecordError);
    expect(
      buildFiscalRecordCandidateResult(
        input({ operation: { status: "requested" } }),
      ),
    ).toMatchObject({
      status: "rejected",
      reason: "operation_not_processing",
    });
  });

  it("rechaza falta de identidad fiscal", () => {
    expect(() =>
      buildFiscalRecordCandidate(input({ identity: null })),
    ).toThrow(FiscalRecordError);
    expect(buildFiscalRecordCandidateResult(input({ identity: null }))).toMatchObject({
      status: "rejected",
      reason: "invoice_identity_missing",
    });
  });

  it("rechaza falta de snapshot hash", () => {
    expect(() =>
      buildFiscalRecordCandidate(
        input({
          operation: { documentSnapshotHash: "" },
          material: { documentSnapshotHash: "" },
        }),
      ),
    ).toThrow(FiscalRecordError);
    expect(
      buildFiscalRecordCandidateResult(
        input({
          operation: { documentSnapshotHash: "" },
          material: { documentSnapshotHash: "" },
        }),
      ),
    ).toMatchObject({
      status: "rejected",
      reason: "document_snapshot_hash_missing",
    });
  });

  it("rechaza falta de issuerNif, numserie y fecha expedicion", () => {
    expect(() =>
      buildFiscalRecordCandidate(input({ identity: { issuerNif: "" } })),
    ).toThrow(FiscalRecordError);
    expect(() =>
      buildFiscalRecordCandidate(input({ identity: { numserie: "" } })),
    ).toThrow(FiscalRecordError);
    expect(() =>
      buildFiscalRecordCandidate(
        input({ identity: { fechaExpedicion: "" } }),
      ),
    ).toThrow(FiscalRecordError);
    expect(
      buildFiscalRecordCandidateResult(input({ identity: { issuerNif: "" } })),
    ).toMatchObject({
      status: "rejected",
      reason: "issuer_nif_missing",
    });
    expect(
      buildFiscalRecordCandidateResult(input({ identity: { numserie: "" } })),
    ).toMatchObject({
      status: "rejected",
      reason: "numserie_missing",
    });
    expect(
      buildFiscalRecordCandidateResult(
        input({ identity: { fechaExpedicion: "" } }),
      ),
    ).toMatchObject({
      status: "rejected",
      reason: "fecha_expedicion_missing",
    });
  });

  it("rechaza material que no corresponde", () => {
    expect(() =>
      buildFiscalRecordCandidate(
        input({ material: { operationId: "operation-other" } }),
      ),
    ).toThrow(FiscalRecordError);
  });

  it("no genera XML AEAT ni escribe en base de datos", () => {
    const record = buildFiscalRecordCandidate(input());
    const serialized = JSON.stringify(record);

    expect(serialized).not.toContain("xml");
    expect(serialized).not.toContain("AEAT");
    expect(serialized).not.toContain("fiscal_records");
    expect(serialized).not.toContain(".insert");
    expect(serialized).not.toContain(".update");
  });
});
