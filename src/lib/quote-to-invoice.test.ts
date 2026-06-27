import { describe, expect, it } from "vitest";
import { documentTotals } from "./calculations";
import { issueDocument } from "./document-integrity";
import { assignNextDocumentNumberByType } from "./documents";
import {
  buildInvoiceDraftFromQuote,
  canConvertQuoteToInvoice,
  findInvoiceCreatedFromQuote,
} from "./quote-to-invoice";
import { DEFAULT_PROFILE, type Document } from "./types";

const quote: Document = {
  id: "quote-1",
  type: "presupuesto",
  number: "P-2026-0003",
  date: "2026-06-20",
  customerId: "customer-1",
  client: {
    firstName: "Ana",
    lastName: "García",
    name: "Ana García",
    nif: "12345678Z",
    email: "ana@example.com",
    phone: "612345678",
  },
  items: [
    {
      id: "quote-line-1",
      description: "Servicio",
      quantity: 2,
      unit: "h",
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  notes: "Validez 15 días.",
  paymentTerms: "Transferencia",
  status: "aceptado",
  documentLifecycle: "issued",
  integrityLock: "locked",
  documentSnapshot: {
    snapshotHash: "snapshot-del-presupuesto",
  } as unknown as Document["documentSnapshot"],
  pdfSnapshot: {
    contentHash: "pdf-del-presupuesto",
  } as unknown as Document["pdfSnapshot"],
  verifactu: {
    recordHash: "no-debe-copiarse",
    previousHash: "",
    recordTimestamp: "2026-06-20T10:00:00+02:00",
    qrUrl: "https://example.test/qr",
    status: "test_registered",
    recordType: "alta",
    environment: "test",
  },
  createdAt: "2026-06-20T10:00:00.000Z",
  updatedAt: "2026-06-20T10:00:00.000Z",
};

describe("quote to invoice conversion", () => {
  it("crea una factura nueva en borrador con cliente, líneas y origen", () => {
    let line = 0;
    const draft = buildInvoiceDraftFromQuote(quote, {
      date: "2026-06-27",
      lineIdFactory: () => `invoice-line-${++line}`,
    });
    const { number } = assignNextDocumentNumberByType(
      [
        quote,
        {
          ...quote,
          id: "invoice-existing",
          type: "factura",
          number: "F-2026-0001",
        },
      ],
      "factura",
      2026,
    );
    const invoice: Document = {
      ...draft,
      id: "invoice-new",
      number,
      createdAt: "2026-06-27T10:00:00.000Z",
      updatedAt: "2026-06-27T10:00:00.000Z",
    };

    expect(invoice.id).not.toBe(quote.id);
    expect(invoice.type).toBe("factura");
    expect(invoice.status).toBe("borrador");
    expect(invoice.number).toBe("F-2026-0002");
    expect(invoice.customerId).toBe(quote.customerId);
    expect(invoice.client).toEqual(quote.client);
    expect(invoice.items).toEqual([
      {
        ...quote.items[0],
        id: "invoice-line-1",
      },
    ]);
    expect(invoice.items[0].id).not.toBe(quote.items[0].id);
    expect(documentTotals(invoice).total).toBe(documentTotals(quote).total);
    expect(invoice.notes).toBe(quote.notes);
    expect(invoice.paymentTerms).toBe(quote.paymentTerms);
    expect(invoice.sourceQuoteDocumentId).toBe(quote.id);
    expect(invoice.sourceQuoteNumber).toBe(quote.number);
  });

  it("no copia snapshots, QR ni estado de emisión del presupuesto", () => {
    const draft = buildInvoiceDraftFromQuote(quote, {
      lineIdFactory: () => "invoice-line-1",
    });

    expect(draft.documentSnapshot).toBeUndefined();
    expect(draft.pdfSnapshot).toBeUndefined();
    expect(draft.verifactu).toBeUndefined();
    expect(draft.issuer).toBeUndefined();
    expect(draft.documentLifecycle).toBeUndefined();
    expect(draft.integrityLock).toBeUndefined();
    expect(draft.issuedAt).toBeUndefined();
  });

  it("no muta el presupuesto original", () => {
    const before = structuredClone(quote);

    buildInvoiceDraftFromQuote(quote, {
      lineIdFactory: () => "invoice-line-1",
    });

    expect(quote).toEqual(before);
  });

  it("la factura creada puede emitirse después con el flujo existente", () => {
    const draft = buildInvoiceDraftFromQuote(quote, {
      date: "2026-06-27",
      lineIdFactory: () => "invoice-line-1",
    });
    const invoice: Document = {
      ...draft,
      id: "invoice-new",
      number: "F-2026-0002",
      createdAt: "2026-06-27T10:00:00.000Z",
      updatedAt: "2026-06-27T10:00:00.000Z",
    };

    const issued = issueDocument(
      invoice,
      DEFAULT_PROFILE,
      "2026-06-27T10:05:00.000Z",
    );

    expect(issued.status).toBe("enviado");
    expect(issued.documentLifecycle).toBe("issued");
    expect(issued.integrityLock).toBe("locked");
    expect(issued.verifactu).toBeUndefined();
  });

  it("solo permite presupuestos activos", () => {
    expect(canConvertQuoteToInvoice(quote)).toBe(true);
    expect(canConvertQuoteToInvoice({ ...quote, type: "factura" })).toBe(false);
    expect(canConvertQuoteToInvoice({ ...quote, status: "anulada" })).toBe(false);
    expect(canConvertQuoteToInvoice({ ...quote, status: "rechazado" })).toBe(false);
  });

  it("localiza la factura ya creada desde un presupuesto", () => {
    const invoice = {
      ...quote,
      id: "invoice-from-quote",
      type: "factura",
      number: "F-2026-0004",
      status: "borrador",
      sourceQuoteDocumentId: quote.id,
      sourceQuoteNumber: quote.number,
    } satisfies Document;

    expect(findInvoiceCreatedFromQuote([quote, invoice], quote.id)).toBe(invoice);
    expect(findInvoiceCreatedFromQuote([quote, invoice], "other-quote")).toBeUndefined();
  });
});
