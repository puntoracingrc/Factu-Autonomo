import { describe, expect, it } from "vitest";
import type { Document } from "./types";
import { cancellationListPresentationForDocument } from "./rectification-list-presentation";

function document(overrides: Partial<Document> & Pick<Document, "id">): Document {
  const { id, ...rest } = overrides;
  return {
    id,
    type: "factura",
    number: `F-${overrides.id}`,
    date: "2026-08-04",
    client: { name: "Cliente" },
    items: [
      {
        id: "line-1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    createdAt: "2026-08-04T10:00:00.000Z",
    updatedAt: "2026-08-04T10:00:00.000Z",
    ...rest,
  };
}

describe("rectification list presentation", () => {
  it("explica una anulacion como neutral en cobros", () => {
    const original = document({
      id: "invoice-1",
      number: "F-2026-2969",
      status: "anulada",
      rectifiedById: "rectification-1",
    });
    const rectification = document({
      id: "rectification-1",
      number: "FR-2026-0002",
      rectification: {
        originalDocumentId: original.id,
        originalNumber: original.number,
        originalDate: original.date,
        reason: "Cliente incorrecto",
        type: "anulacion",
      },
    });

    expect(
      cancellationListPresentationForDocument(rectification, [
        original,
        rectification,
      ]),
    ).toEqual({
      cashImpact: 0,
      title: "Anulación total",
      description:
        "Invalida F-2026-2969. No registra por sí sola un cobro ni una pérdida de caja.",
    });
    expect(
      cancellationListPresentationForDocument(original, [
        original,
        rectification,
      ]),
    ).toEqual({
      cashImpact: 0,
      title: "Factura anulada",
      description:
        "FR-2026-0002 la deja sin efecto. La pareja no suma ni resta cobros.",
    });
  });

  it("mantiene la rentabilidad normal fuera de una anulacion total", () => {
    const correction = document({
      id: "correction-1",
      rectification: {
        originalDocumentId: "invoice-1",
        originalNumber: "F-2026-2969",
        originalDate: "2026-08-04",
        reason: "Importe incorrecto",
        type: "correccion",
      },
    });

    expect(
      cancellationListPresentationForDocument(correction, [correction]),
    ).toBeNull();
  });
});
