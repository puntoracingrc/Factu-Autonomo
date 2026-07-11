import { describe, expect, it } from "vitest";
import {
  canMarkAsCollected,
  collectedIncome,
  isCollectedDocument,
  pendingCollection,
  statusAfterUnmarkingCollection,
} from "./income";
import { issueDocument } from "./document-integrity";
import { DEFAULT_PROFILE, type Document } from "./types";

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

  it("no duplica ingresos con recibo vinculado a factura", () => {
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

  it("no duplica un recibo legacy referido solo desde la factura", () => {
    const paidInvoice = {
      ...invoice("pagado", 121),
      id: "inv-legacy",
      receiptDocumentId: "receipt-legacy",
    };
    const legacyReceipt: Document = {
      ...invoice("pagado", 121),
      id: "receipt-legacy",
      type: "recibo",
      number: "R-2026-0001",
      sourceDocumentId: undefined,
      snapshotIntegrity: {
        status: "blocked",
        issues: ["document_relationship_invalid"],
      },
    };

    expect(collectedIncome([paidInvoice, legacyReceipt])).toBeCloseTo(121, 0);
    expect(isCollectedDocument(legacyReceipt)).toBe(false);
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

  it("incluye rectificativas vigentes positivas pendientes de cobro", () => {
    const original = invoice("rectificada", 121, {
      id: "original",
      rectifiedById: "rect-1",
    });
    const rectificativa = invoice("enviado", 60.5, {
      id: "rect-1",
      number: "FR-2026-0001",
      rectification: {
        originalDocumentId: original.id,
        originalNumber: original.number,
        originalDate: original.date,
        reason: "Corrección de datos",
        type: "correccion",
      },
    });

    expect(pendingCollection([original, rectificativa])).toBeCloseTo(60.5, 2);
  });

  it("no trata una rectificativa negativa como pendiente de cobro", () => {
    const rectificativaNegativa = invoice("enviado", -121, {
      id: "rect-1",
      number: "FR-2026-0001",
      rectification: {
        originalDocumentId: "original",
        originalNumber: "F-2026-0001",
        originalDate: "2026-06-09",
        reason: "Anulación total",
        type: "anulacion",
      },
    });

    expect(pendingCollection([rectificativaNegativa])).toBe(0);
  });

  it("vuelve a enviado al desmarcar cobro", () => {
    expect(statusAfterUnmarkingCollection(invoice("pagado"))).toBe("enviado");
  });

  it("usa el total histórico sellado para cobrado y pendiente", () => {
    const issued = issueDocument(
      invoice("borrador", 121),
      DEFAULT_PROFILE,
      "2026-06-09T10:00:00.000Z",
    );
    const drifted = {
      ...issued,
      items: [{ ...issued.items[0], unitPrice: 999 }],
    };

    expect(pendingCollection([drifted])).toBeCloseTo(121, 2);
    expect(collectedIncome([{ ...drifted, status: "pagado" }])).toBeCloseTo(
      121,
      2,
    );
  });
});
