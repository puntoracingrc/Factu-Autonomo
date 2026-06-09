import { describe, expect, it } from "vitest";
import {
  assignNextDocumentNumber,
  formatDocumentNumber,
} from "./documents";
import {
  canDeleteDocument,
  canRectifyInvoice,
  itemsForAnulacion,
  originalStatusAfterRectification,
} from "./rectificativas";
import type { Document } from "./types";

function invoice(
  id: string,
  number: string,
  status: Document["status"],
  extra: Partial<Document> = {},
): Document {
  return {
    id,
    type: "factura",
    number,
    date: "2026-06-01",
    client: { name: "Ana García", firstName: "Ana", lastName: "García" },
    items: [
      {
        id: "l1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status,
    createdAt: "",
    updatedAt: "",
    ...extra,
  };
}

describe("facturas rectificativas", () => {
  it("permite rectificar facturas emitidas", () => {
    expect(canRectifyInvoice(invoice("1", "F-2026-0001", "pagado"))).toBe(
      true,
    );
    expect(canRectifyInvoice(invoice("1", "F-2026-0001", "borrador"))).toBe(
      false,
    );
  });

  it("no permite rectificar dos veces", () => {
    expect(
      canRectifyInvoice(
        invoice("1", "F-2026-0001", "pagado", { rectifiedById: "fr1" }),
      ),
    ).toBe(false);
  });

  it("anulación genera importes negativos", () => {
    const original = invoice("1", "F-2026-0001", "pagado");
    const negated = itemsForAnulacion(original.items);
    expect(negated[0].unitPrice).toBe(-100);
  });

  it("marca original como anulada o rectificada", () => {
    expect(originalStatusAfterRectification("anulacion")).toBe("anulada");
    expect(originalStatusAfterRectification("correccion")).toBe("rectificada");
  });

  it("numeración FR independiente de F", () => {
    const docs = [
      invoice("1", "F-2026-0001", "pagado"),
      invoice("2", "FR-2026-0001", "enviado", {
        rectification: {
          originalDocumentId: "1",
          originalNumber: "F-2026-0001",
          originalDate: "2026-06-01",
          reason: "Error",
          type: "anulacion",
        },
      }),
    ];
    const next = assignNextDocumentNumber(docs, "factura_rectificativa", 2026);
    expect(next.number).toBe("FR-2026-0002");
    expect(formatDocumentNumber("factura", 2026, 2)).toBe("F-2026-0002");
  });

  it("no permite borrar facturas emitidas", () => {
    expect(canDeleteDocument(invoice("1", "F-2026-0001", "pagado"))).toBe(
      false,
    );
    expect(canDeleteDocument(invoice("1", "F-2026-0001", "borrador"))).toBe(
      true,
    );
  });
});
