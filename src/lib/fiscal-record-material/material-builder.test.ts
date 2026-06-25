import { describe, expect, it } from "vitest";
import { FiscalRecordMaterialError } from "./errors";
import {
  buildFiscalRecordMaterialDryRun,
  FISCAL_RECORD_MATERIAL_DRY_RUN_SCHEMA_VERSION,
} from "./material-builder";
import type {
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
  FiscalOperationType,
} from "@/lib/fiscal-operations/types";
import type { ServerDocumentRecord } from "@/lib/server-documents/types";

const NOW = "2026-06-25T10:00:00.000Z";

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
    numserie: "F-2026-0009",
    fechaExpedicion: "2026-06-25",
    createdAt: NOW,
    ...overrides,
  };
}

function serverDocument(
  overrides: Partial<ServerDocumentRecord> = {},
): Pick<ServerDocumentRecord, "id" | "snapshotHash" | "pdfContentHash"> {
  return {
    id: "server-doc-1",
    snapshotHash: "fnv1a32:aaaaaaaa",
    pdfContentHash: "fnv1a32:bbbbbbbb",
    ...overrides,
  };
}

function build(
  overrides: {
    operation?: Partial<FiscalOperationRecord>;
    identity?: Partial<FiscalInvoiceIdentityRecord> | null;
    document?: Partial<ServerDocumentRecord> | null;
  } = {},
) {
  return buildFiscalRecordMaterialDryRun({
    operation: operation(overrides.operation),
    invoiceIdentity:
      overrides.identity === null ? null : identity(overrides.identity),
    serverDocument:
      overrides.document === null ? null : serverDocument(overrides.document),
    createdAt: NOW,
  });
}

describe("buildFiscalRecordMaterialDryRun", () => {
  it("construye material preliminar valido desde operacion processing", () => {
    const material = build();

    expect(material).toMatchObject({
      dryRun: true,
      finality: "preliminary_not_aeat",
      operationId: "operation-1",
      invoiceIdentityId: "identity-1",
      serverDocumentId: "server-doc-1",
      operationType: "alta_inicial",
      recordTypeCandidate: "alta_inicial",
      issuerNif: "B12345678",
      numserie: "F-2026-0009",
      fechaExpedicion: "2026-06-25",
      documentSnapshotHash: "fnv1a32:aaaaaaaa",
      pdfContentHash: "fnv1a32:bbbbbbbb",
      schemaVersionCandidate: FISCAL_RECORD_MATERIAL_DRY_RUN_SCHEMA_VERSION,
      createdAtCandidate: NOW,
    });
    expect(material.hashInputCandidate).toContain(
      "PHASE2B4G_DRY_RUN_CANDIDATE",
    );
  });

  it("rechaza operacion que no esta en processing", () => {
    expect(() =>
      build({ operation: { status: "requested" } }),
    ).toThrowError(
      expect.objectContaining({
        name: "FiscalRecordMaterialError",
        code: "OPERATION_NOT_PROCESSING",
      }),
    );
  });

  it("rechaza falta de identidad fiscal", () => {
    expect(() => build({ identity: null })).toThrowError(
      expect.objectContaining({
        code: "INVOICE_IDENTITY_MISSING",
      }),
    );
  });

  it("rechaza falta de snapshot hash", () => {
    expect(() =>
      build({ operation: { documentSnapshotHash: "" } }),
    ).toThrowError(
      expect.objectContaining({
        code: "SNAPSHOT_HASH_MISSING",
      }),
    );
  });

  it("rechaza falta de issuerNif", () => {
    expect(() => build({ identity: { issuerNif: " " } })).toThrowError(
      expect.objectContaining({
        code: "ISSUER_NIF_MISSING",
      }),
    );
  });

  it("rechaza falta de numserie", () => {
    expect(() => build({ identity: { numserie: "" } })).toThrowError(
      expect.objectContaining({
        code: "NUMSERIE_MISSING",
      }),
    );
  });

  it("rechaza falta de fecha expedicion", () => {
    expect(() =>
      build({ identity: { fechaExpedicion: "" } }),
    ).toThrowError(
      expect.objectContaining({
        code: "FECHA_EXPEDICION_MISSING",
      }),
    );
  });

  it("distingue alta inicial, subsanacion y anulacion a nivel candidato", () => {
    const types: FiscalOperationType[] = [
      "alta_inicial",
      "alta_subsanacion",
      "anulacion",
    ];

    expect(
      types.map((operationType) =>
        build({ operation: { operationType } }).recordTypeCandidate,
      ),
    ).toEqual(types);
  });

  it("no genera XML AEAT ni hash fiscal definitivo", () => {
    const material = build();
    const serialized = JSON.stringify(material);

    expect(serialized).not.toContain("xmlPayload");
    expect(serialized).not.toContain("xml_payload");
    expect(serialized).not.toContain("recordHash");
    expect(serialized).not.toContain("record_hash");
    expect(serialized).not.toContain("AEAT");
  });

  it("no escribe en DB ni conoce tablas finales", () => {
    const material = build();
    const serialized = JSON.stringify(material);

    expect(serialized).not.toContain("fiscal_records");
    expect(serialized).not.toContain("fiscal_chain_state");
    expect(serialized).not.toContain("fiscal_transport_attempts");
  });

  it("mantiene errores tipados estables", () => {
    expect(() =>
      build({ operation: { status: "failed_final" } }),
    ).toThrow(FiscalRecordMaterialError);
  });
});
