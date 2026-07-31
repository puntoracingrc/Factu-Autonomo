import { describe, expect, it } from "vitest";

import {
  buildCentralBusinessDocumentSeriesReconciliationCommand,
  buildCentralBusinessNumberedDocumentCreateCommand,
  CentralBusinessNumberedDocumentCommandError,
} from "./numbered-document-command";

const auth = {
  userId: "00000000-0000-4000-8000-000000000001",
  deviceId: "sha256:SYNTHETIC_DEVICE",
  sessionId: "00000000-0000-4000-8000-000000000002",
  userIdSource: "test" as const,
};

describe("central business numbered document commands", () => {
  it("construye conciliaciones estables sin depender del orden del objeto", () => {
    const first = buildCentralBusinessDocumentSeriesReconciliationCommand(
      {
        action: "reconcile_series",
        auth,
        idempotencyKey: "SYNTHETIC_RECONCILIATION_A",
        entityType: "quote",
        numberTemplate: "P-{year}-{num}",
        fiscalYear: 2026,
        observedMaxSequence: 18,
        sourceDocumentCount: 18,
        sourceDigest: `sha256:${"a".repeat(64)}`,
      },
      "request-a",
    );
    const second = buildCentralBusinessDocumentSeriesReconciliationCommand(
      {
        sourceDigest: `sha256:${"a".repeat(64)}`,
        sourceDocumentCount: 18,
        observedMaxSequence: 18,
        fiscalYear: 2026,
        numberTemplate: "P-{year}-{num}",
        entityType: "quote",
        idempotencyKey: "SYNTHETIC_RECONCILIATION_A",
        auth,
        action: "reconcile_series",
      },
      "request-b",
    );

    expect(first.requestHash).toBe(second.requestHash);
    expect(first.idempotencyKeyHash).toBe(second.idempotencyKeyHash);
    expect(first.requestId).not.toBe(second.requestId);
  });

  it("crea un comando sin numero y liga tipo, fecha y entidad", () => {
    const command = buildCentralBusinessNumberedDocumentCreateCommand(
      {
        action: "create",
        auth,
        idempotencyKey: "SYNTHETIC_NUMBERED_CREATE_A",
        entityType: "receipt",
        entityId: "receipt-a",
        numberTemplate: "R-{year}-{num}",
        padding: 4,
        fiscalYear: 2026,
        payloadWithoutNumber: {
          id: "receipt-a",
          type: "recibo",
          date: "2026-07-31",
          status: "cobrado",
        },
      },
      "request-a",
    );

    expect(command).toMatchObject({
      action: "create",
      entityId: "receipt-a",
      entityType: "receipt",
      padding: 4,
    });
    expect(command.requestHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rechaza inventarios, plantillas y payloads ambiguos", () => {
    expect(() =>
      buildCentralBusinessDocumentSeriesReconciliationCommand({
        action: "reconcile_series",
        auth,
        idempotencyKey: "SYNTHETIC_RECONCILIATION_A",
        entityType: "quote",
        numberTemplate: "P-{year}",
        fiscalYear: 2026,
        observedMaxSequence: 0,
        sourceDocumentCount: 0,
        sourceDigest: `sha256:${"a".repeat(64)}`,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_NUMBER_TEMPLATE" }),
    );

    expect(() =>
      buildCentralBusinessNumberedDocumentCreateCommand({
        action: "create",
        auth,
        idempotencyKey: "SYNTHETIC_NUMBERED_CREATE_A",
        entityType: "quote",
        entityId: "quote-a",
        numberTemplate: "P-{year}-{num}",
        padding: 4,
        fiscalYear: 2026,
        payloadWithoutNumber: {
          id: "quote-a",
          type: "presupuesto",
          date: "2026-07-31",
          number: "P-2026-0001",
        },
      }),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_PAYLOAD" }),
    );

    expect(
      () =>
        buildCentralBusinessDocumentSeriesReconciliationCommand({
          action: "reconcile_series",
          auth,
          idempotencyKey: "SYNTHETIC_RECONCILIATION_A",
          entityType: "receipt",
          numberTemplate: "R-{num}",
          fiscalYear: 2026,
          observedMaxSequence: 1,
          sourceDocumentCount: 1,
          sourceDigest: "not-a-digest",
        }),
    ).toThrow(CentralBusinessNumberedDocumentCommandError);
  });
});
