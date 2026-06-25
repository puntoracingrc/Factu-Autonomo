import { describe, expect, it } from "vitest";
import {
  buildFiscalInvoiceIdentity,
  buildFiscalOperationDraft,
  buildFiscalOperationIdempotencyKey,
  decideFiscalOperationDraft,
  FiscalOperationError,
  normalizeFiscalEnvironment,
} from ".";
import type { ServerDocumentRecord } from "@/lib/server-documents/types";

const NOW = "2026-06-25T08:00:00.000Z";

function serverDocument(
  overrides: Partial<ServerDocumentRecord> = {},
): ServerDocumentRecord {
  return {
    id: "server-doc-1",
    userId: "user-a",
    localDocumentId: "local-doc-1",
    documentType: "factura",
    documentKind: "standard",
    documentLifecycle: "issued",
    integrityLock: "locked",
    statusLegacy: "enviado",
    version: 7,
    payload: { ignored: "not-authoritative" },
    documentSnapshot: { number: "F-2026-0007" },
    pdfSnapshot: { rendererVersion: "document-pdf-renderer-v1" },
    snapshotHash: "fnv1a32:11111111",
    pdfContentHash: "fnv1a32:22222222",
    issuerNif: " b 12345678 ",
    numserie: " F-2026-0007 ",
    issueDate: "2026-06-25",
    createdAt: NOW,
    updatedAt: NOW,
    issuedAt: NOW,
    ...overrides,
  };
}

function buildInput(overrides: Record<string, unknown> = {}) {
  return {
    serverDocument: serverDocument(),
    operationType: "alta_inicial",
    environment: "test",
    expectedDocumentVersion: 7,
    requestedBy: "user-a",
    requestedAt: NOW,
    ...overrides,
  };
}

function expectFiscalError(
  action: () => unknown,
  reason: FiscalOperationError["reason"],
) {
  expect(action).toThrow(FiscalOperationError);

  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(FiscalOperationError);
    expect((error as FiscalOperationError).reason).toBe(reason);
  }
}

describe("fiscal operation domain prep", () => {
  it("construye identidad fiscal valida desde documento servidor", () => {
    const identity = buildFiscalInvoiceIdentity(serverDocument(), "test");

    expect(identity).toEqual({
      environment: "test",
      issuerNif: "B12345678",
      numserie: "F-2026-0007",
      fechaExpedicion: "2026-06-25",
    });
  });

  it("rechaza documento sin issuerNif", () => {
    expectFiscalError(
      () =>
        buildFiscalOperationDraft(
          buildInput({ serverDocument: serverDocument({ issuerNif: " " }) }),
        ),
      "issuer_nif_missing",
    );
  });

  it("rechaza documento sin numserie", () => {
    expectFiscalError(
      () =>
        buildFiscalOperationDraft(
          buildInput({ serverDocument: serverDocument({ numserie: null }) }),
        ),
      "numserie_missing",
    );
  });

  it("rechaza documento sin issueDate", () => {
    expectFiscalError(
      () =>
        buildFiscalOperationDraft(
          buildInput({ serverDocument: serverDocument({ issueDate: undefined }) }),
        ),
      "issue_date_missing",
    );
  });

  it("rechaza documento sin snapshotHash", () => {
    expectFiscalError(
      () =>
        buildFiscalOperationDraft(
          buildInput({ serverDocument: serverDocument({ snapshotHash: "" }) }),
        ),
      "snapshot_hash_missing",
    );
  });

  it("rechaza expectedDocumentVersion ausente", () => {
    expectFiscalError(
      () => buildFiscalOperationDraft(buildInput({ expectedDocumentVersion: undefined })),
      "expected_document_version_missing",
    );
  });

  it("rechaza borrador no emitido o no bloqueado", () => {
    expectFiscalError(
      () =>
        buildFiscalOperationDraft(
          buildInput({
            serverDocument: serverDocument({
              documentLifecycle: "draft",
              integrityLock: "unlocked",
              statusLegacy: "borrador",
            }),
          }),
        ),
      "document_not_eligible",
    );
  });

  it("genera idempotency key estable", () => {
    const first = buildFiscalOperationDraft(buildInput());
    const second = buildFiscalOperationDraft(buildInput());

    expect(first.idempotencyKey).toBe(second.idempotencyKey);
    expect(first.idempotencyKey).toMatch(/^fiscal-operation-v1:fnv1a32:/);
  });

  it("cambia idempotency key si cambia snapshotHash", () => {
    const first = buildFiscalOperationDraft(buildInput());
    const second = buildFiscalOperationDraft(
      buildInput({
        serverDocument: serverDocument({ snapshotHash: "fnv1a32:33333333" }),
      }),
    );

    expect(first.idempotencyKey).not.toBe(second.idempotencyKey);
  });

  it("cambia idempotency key si cambia operationType", () => {
    const alta = buildFiscalOperationDraft(buildInput());
    const anulacion = buildFiscalOperationDraft(
      buildInput({ operationType: "anulacion" }),
    );

    expect(alta.idempotencyKey).not.toBe(anulacion.idempotencyKey);
  });

  it("permite alta inicial sin bloquear subsanacion o anulacion futura por diseno", () => {
    const alta = buildFiscalOperationDraft(buildInput());
    const subsanacion = buildFiscalOperationDraft(
      buildInput({ operationType: "alta_subsanacion" }),
    );
    const anulacion = buildFiscalOperationDraft(
      buildInput({ operationType: "anulacion" }),
    );

    expect(alta.operationType).toBe("alta_inicial");
    expect(subsanacion.operationType).toBe("alta_subsanacion");
    expect(anulacion.operationType).toBe("anulacion");
    expect(new Set([
      alta.idempotencyKey,
      subsanacion.idempotencyKey,
      anulacion.idempotencyKey,
    ])).toHaveLength(3);
  });

  it("diferencia alta inicial, subsanacion y anulacion", () => {
    const operationTypes = [
      "alta_inicial",
      "alta_subsanacion",
      "anulacion",
    ] as const;

    for (const operationType of operationTypes) {
      const draft = buildFiscalOperationDraft(buildInput({ operationType }));
      expect(draft.operationType).toBe(operationType);
      expect(draft.status).toBe("requested");
      expect(draft.authority).toBe("server_document");
    }
  });

  it("no usa payload cliente como autoridad fiscal", () => {
    const inputA = {
      ...buildInput(),
      clientPayload: { issuerNif: "A99999999", total: 1 },
    };
    const inputB = {
      ...buildInput(),
      clientPayload: { issuerNif: "B99999999", total: 999999 },
    };
    const withPayloadA = buildFiscalOperationDraft(inputA);
    const withPayloadB = buildFiscalOperationDraft(inputB);

    expect(withPayloadA.invoiceIdentity).toEqual(withPayloadB.invoiceIdentity);
    expect(withPayloadA.idempotencyKey).toBe(withPayloadB.idempotencyKey);
    expect(JSON.stringify(withPayloadA)).not.toContain("clientPayload");
  });

  it("mantiene errores tipados estables", () => {
    const decision = decideFiscalOperationDraft(
      buildInput({
        operationType: "registro_magico",
      }),
    );

    expect(decision).toMatchObject({
      status: "rejected",
      reason: "unsupported_operation",
    });
  });

  it("rechaza environment invalido", () => {
    expectFiscalError(
      () => normalizeFiscalEnvironment("staging"),
      "invalid_environment",
    );
  });

  it("rechaza tipo de documento no fiscal", () => {
    expectFiscalError(
      () =>
        buildFiscalOperationDraft(
          buildInput({
            serverDocument: serverDocument({
              documentType: "presupuesto",
              documentKind: "quote",
            }),
          }),
        ),
      "document_not_eligible",
    );
  });

  it("permite construir la key directamente sin XML ni transporte", () => {
    const key = buildFiscalOperationIdempotencyKey({
      userId: "user-a",
      serverDocumentId: "server-doc-1",
      operationType: "alta_inicial",
      invoiceIdentity: {
        environment: "test",
        issuerNif: "B12345678",
        numserie: "F-2026-0007",
        fechaExpedicion: "2026-06-25",
      },
      expectedDocumentVersion: 7,
      documentSnapshotHash: "fnv1a32:11111111",
    });

    expect(key).toBe(
      buildFiscalOperationDraft(buildInput()).idempotencyKey,
    );
  });
});
