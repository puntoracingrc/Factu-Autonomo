import { describe, expect, it } from "vitest";
import { issueDocument } from ".";
import { DEFAULT_PROFILE, type Document } from "../types";
import { withDocumentRelationshipIntegritySignals } from "./relationships";

const NOW = "2026-07-11T10:00:00.000Z";

function issuedInvoice(): Document {
  return issueDocument(
    {
      id: "original",
      type: "factura",
      number: "F-2026-0001",
      date: "2026-07-10",
      client: { name: "Cliente" },
      items: [
        {
          id: "line-original",
          description: "Servicio",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
      status: "borrador",
      createdAt: NOW,
      updatedAt: NOW,
    },
    DEFAULT_PROFILE,
    NOW,
  );
}

function issuedRectification(
  original: Document,
  type: "anulacion" | "correccion" = "anulacion",
  date = "2026-07-11",
): Document {
  return issueDocument(
    {
      id: "rectification",
      type: "factura",
      number: "FR-2026-0001",
      date,
      client: { ...original.documentSnapshot!.customer },
      items: original.documentSnapshot!.items.map((item) => ({
        id: `rect-${item.id}`,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: type === "anulacion" ? -item.unitPrice : item.unitPrice,
        ivaPercent: item.ivaPercent,
      })),
      status: "borrador",
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      rectification: {
        originalDocumentId: original.id,
        originalNumber: original.documentSnapshot!.number,
        originalDate: original.documentSnapshot!.date,
        reason: "Corrección",
        type,
      },
      createdAt: NOW,
      updatedAt: NOW,
    },
    DEFAULT_PROFILE,
    NOW,
  );
}

describe("document relationship integrity", () => {
  it("acepta una relación bidireccional sellada", () => {
    const original = issuedInvoice();
    const rectification = issuedRectification(original);
    const linkedOriginal: Document = {
      ...original,
      status: "anulada",
      documentLifecycle: "canceled",
      rectifiedById: rectification.id,
    };

    const result = withDocumentRelationshipIntegritySignals([
      linkedOriginal,
      rectification,
    ]);

    expect(result.every((document) => !document.snapshotIntegrity)).toBe(true);
  });

  it("bloquea un estado anulado vivo sin rectificativa", () => {
    const manipulated: Document = {
      ...issuedInvoice(),
      status: "anulada",
      documentLifecycle: "canceled",
    };

    const [result] = withDocumentRelationshipIntegritySignals([manipulated]);

    expect(result.snapshotIntegrity).toEqual({
      status: "blocked",
      issues: ["document_relationship_invalid"],
    });
  });

  it("bloquea ambos lados si la rectificativa es anterior a la original", () => {
    const original = issuedInvoice();
    const rectification = issuedRectification(
      original,
      "anulacion",
      "2026-07-09",
    );
    const linkedOriginal: Document = {
      ...original,
      status: "anulada",
      documentLifecycle: "canceled",
      rectifiedById: rectification.id,
    };

    const result = withDocumentRelationshipIntegritySignals([
      linkedOriginal,
      rectification,
    ]);

    expect(
      result.every(
        (document) =>
          document.snapshotIntegrity?.issues.includes(
            "document_relationship_invalid",
          ) === true,
      ),
    ).toBe(true);
  });

  it("bloquea una rectificativa emitida cuyo original no existe", () => {
    const original = issuedInvoice();
    const rectification = issuedRectification(original);

    const [result] = withDocumentRelationshipIntegritySignals([
      rectification,
    ]);

    expect(result.snapshotIntegrity?.status).toBe("blocked");
  });
});
