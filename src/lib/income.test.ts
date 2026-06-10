import { describe, expect, it } from "vitest";
import {
  canMarkAsCollected,
  collectedIncome,
  isCollectedDocument,
  pendingCollection,
  statusAfterUnmarkingCollection,
} from "./income";
import type { Document } from "./types";

function invoice(
  status: Document["status"],
  total = 100,
  extra: Partial<Document> = {},
): Document {
  return {
    id: "1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-06-09",
    client: { name: "Ana", firstName: "Ana", lastName: "" },
    items: [
      {
        id: "l1",
        description: "Servicio",
        quantity: 1,
        unitPrice: total / 1.21,
        ivaPercent: 21,
      },
    ],
    status,
    createdAt: "2026-06-09",
    updatedAt: "2026-06-09",
    ...extra,
  };
}

describe("income helpers", () => {
  it("cuenta facturas y recibos manuales cobrados", () => {
    const docs: Document[] = [
      invoice("pagado", 121),
      { ...invoice("pagado", 60), id: "2", type: "recibo", number: "R-1" },
      invoice("enviado", 200),
    ];
    expect(collectedIncome(docs)).toBeCloseTo(181, 0);
    expect(isCollectedDocument(docs[1])).toBe(true);
  });

  it("no duplica ingresos con recibo automático de factura", () => {
    const paidInvoice = { ...invoice("pagado", 121), id: "inv-1" };
    const autoReceipt = {
      ...invoice("pagado", 121),
      id: "r-1",
      type: "recibo" as const,
      number: "R-2026-0001",
      sourceDocumentId: "inv-1",
      receiptDocumentId: undefined,
    };
    expect(collectedIncome([paidInvoice, autoReceipt])).toBeCloseTo(121, 0);
  });

  it("excluye anuladas y rectificadas del cobro", () => {
    expect(canMarkAsCollected(invoice("enviado", 100, { rectifiedById: "fr1" }))).toBe(
      false,
    );
    expect(canMarkAsCollected(invoice("anulada"))).toBe(false);
  });

  it("calcula pendiente solo con facturas emitidas", () => {
    const docs = [
      invoice("enviado", 100),
      invoice("borrador", 50),
      invoice("pagado", 30),
    ];
    expect(pendingCollection(docs)).toBeCloseTo(100, 0);
  });

  it("vuelve a enviado al desmarcar cobro", () => {
    expect(statusAfterUnmarkingCollection(invoice("pagado"))).toBe("enviado");
  });
});
