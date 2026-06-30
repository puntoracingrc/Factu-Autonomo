import { describe, expect, it } from "vitest";
import {
  applyDocumentLinkUpdate,
  documentDetailPath,
  getDocumentLinkBadges,
} from "./document-links";
import type { Document, DocumentType } from "./types";

function document(overrides: Partial<Document> & { id: string; type: DocumentType }): Document {
  return {
    number:
      overrides.type === "factura"
        ? `F-${overrides.id}`
        : overrides.type === "presupuesto"
          ? `P-${overrides.id}`
          : `R-${overrides.id}`,
    date: "2026-06-30",
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
    createdAt: "2026-06-30T08:00:00.000Z",
    updatedAt: "2026-06-30T08:00:00.000Z",
    ...overrides,
  };
}

describe("document links", () => {
  it("vincula una factura a un presupuesto y limpia enlaces duplicados", () => {
    const quote = document({ id: "quote-1", type: "presupuesto" });
    const firstInvoice = document({
      id: "invoice-1",
      type: "factura",
      sourceQuoteDocumentId: quote.id,
      sourceQuoteNumber: quote.number,
    });
    const secondInvoice = document({ id: "invoice-2", type: "factura" });

    const result = applyDocumentLinkUpdate(
      [quote, firstInvoice, secondInvoice],
      {
        relation: "quote_invoice",
        invoiceId: secondInvoice.id,
        quoteId: quote.id,
        updatedAt: "2026-06-30T09:00:00.000Z",
      },
    );

    expect(result.find((doc) => doc.id === "invoice-2")).toMatchObject({
      sourceQuoteDocumentId: "quote-1",
      sourceQuoteNumber: "P-quote-1",
    });
    expect(result.find((doc) => doc.id === "invoice-1")).toMatchObject({
      sourceQuoteDocumentId: undefined,
      sourceQuoteNumber: undefined,
    });
    expect(getDocumentLinkBadges(quote, result)[0]?.label).toBe(
      "Factura F-invoice-2",
    );
  });

  it("vincula factura y recibo por los dos lados", () => {
    const invoice = document({ id: "invoice-1", type: "factura" });
    const oldReceipt = document({
      id: "receipt-1",
      type: "recibo",
      sourceDocumentId: invoice.id,
    });
    const newReceipt = document({ id: "receipt-2", type: "recibo" });

    const result = applyDocumentLinkUpdate(
      [invoice, oldReceipt, newReceipt],
      {
        relation: "invoice_receipt",
        invoiceId: invoice.id,
        receiptId: newReceipt.id,
        updatedAt: "2026-06-30T09:00:00.000Z",
      },
    );

    expect(result.find((doc) => doc.id === "invoice-1")).toMatchObject({
      receiptDocumentId: "receipt-2",
    });
    expect(result.find((doc) => doc.id === "receipt-2")).toMatchObject({
      sourceDocumentId: "invoice-1",
    });
    expect(result.find((doc) => doc.id === "receipt-1")).toMatchObject({
      sourceDocumentId: undefined,
    });
    expect(getDocumentLinkBadges(invoice, result).map((badge) => badge.label)).toEqual([
      "Recibo R-receipt-2",
    ]);
  });

  it("desvincula factura y recibo", () => {
    const invoice = document({
      id: "invoice-1",
      type: "factura",
      receiptDocumentId: "receipt-1",
    });
    const receipt = document({
      id: "receipt-1",
      type: "recibo",
      sourceDocumentId: "invoice-1",
    });

    const result = applyDocumentLinkUpdate([invoice, receipt], {
      relation: "invoice_receipt",
      invoiceId: invoice.id,
      receiptId: null,
      updatedAt: "2026-06-30T09:00:00.000Z",
    });

    expect(result.find((doc) => doc.id === "invoice-1")?.receiptDocumentId).toBe(
      undefined,
    );
    expect(result.find((doc) => doc.id === "receipt-1")?.sourceDocumentId).toBe(
      undefined,
    );
  });

  it("codifica ids con barras para que los enlaces abran el detalle", () => {
    const invoice = document({ id: "Factura/2940/", type: "factura" });

    expect(documentDetailPath(invoice)).toBe("/facturas/Factura%2F2940%2F");
  });
});
