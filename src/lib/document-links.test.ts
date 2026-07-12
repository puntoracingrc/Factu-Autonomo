import { describe, expect, it } from "vitest";
import {
  applyDocumentLinkUpdate,
  decodeDocumentIdFromPath,
  documentDetailPath,
  encodeDocumentIdForPath,
  getDocumentChainItems,
  getDocumentLinkBadges,
} from "./document-links";
import { attestNewImportedDocument } from "./document-integrity/legacy-import-attestation";
import {
  DEFAULT_PROFILE,
  type Document,
  type DocumentType,
  type Expense,
} from "./types";

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

  it("mantiene inmutables los vínculos fiscales de históricos atestados", () => {
    const profile = {
      ...DEFAULT_PROFILE,
      name: "Negocio histórico",
      nif: "12345678Z",
      address: "Calle Mayor 1",
      city: "Madrid",
      postalCode: "28001",
    };
    const importedQuote = attestNewImportedDocument(
      document({
        id: "holded:presupuesto:P-2024-0001",
        type: "presupuesto",
        number: "P-2024-0001",
        client: {
          name: "Cliente histórico",
          nif: "B12345678",
          address: "Calle Cliente 2",
          city: "Madrid",
          postalCode: "28002",
        },
        issuer: {
          name: profile.name,
          nif: profile.nif,
          address: profile.address,
          city: profile.city,
          postalCode: profile.postalCode,
          capturedAt: "2024-06-30T08:00:00.000Z",
        },
      }),
      profile,
      "holded",
      "2026-07-12T08:00:00.000Z",
    );
    const invoice = document({
      id: "invoice-1",
      type: "factura",
      status: "borrador",
    });
    const documents = [importedQuote, invoice];

    const result = applyDocumentLinkUpdate(documents, {
      relation: "quote_invoice",
      invoiceId: invoice.id,
      quoteId: importedQuote.id,
      updatedAt: "2026-07-12T09:00:00.000Z",
    });

    expect(result).toBe(documents);
    expect(result[1]).toBe(invoice);

    const tamperedQuote: Document = {
      ...importedQuote,
      legacyImportAttestation: {
        ...importedQuote.legacyImportAttestation!,
        attestationHash: "sha256:tampered",
      },
    };
    const tamperedDocuments = [tamperedQuote, invoice];
    expect(
      applyDocumentLinkUpdate(tamperedDocuments, {
        relation: "quote_invoice",
        invoiceId: invoice.id,
        quoteId: tamperedQuote.id,
        updatedAt: "2026-07-12T09:00:00.000Z",
      }),
    ).toBe(tamperedDocuments);
  });

  it("no permite crear manualmente una relación fiscal factura-recibo", () => {
    const invoice = document({
      id: "invoice-1",
      type: "factura",
      status: "borrador",
    });
    const oldReceipt = document({
      id: "receipt-1",
      type: "recibo",
      status: "borrador",
      sourceDocumentId: invoice.id,
    });
    const newReceipt = document({
      id: "receipt-2",
      type: "recibo",
      status: "borrador",
    });

    const result = applyDocumentLinkUpdate(
      [invoice, oldReceipt, newReceipt],
      {
        relation: "invoice_receipt",
        invoiceId: invoice.id,
        receiptId: newReceipt.id,
        updatedAt: "2026-06-30T09:00:00.000Z",
      },
    );

    expect(result).toEqual([invoice, oldReceipt, newReceipt]);
    expect(result[0]).toBe(invoice);
    expect(result[1]).toBe(oldReceipt);
    expect(result[2]).toBe(newReceipt);
  });

  it("no permite romper manualmente una relación fiscal factura-recibo", () => {
    const invoice = document({
      id: "invoice-1",
      type: "factura",
      status: "borrador",
      receiptDocumentId: "receipt-1",
    });
    const receipt = document({
      id: "receipt-1",
      type: "recibo",
      status: "borrador",
      sourceDocumentId: "invoice-1",
    });

    const result = applyDocumentLinkUpdate([invoice, receipt], {
      relation: "invoice_receipt",
      invoiceId: invoice.id,
      receiptId: null,
      updatedAt: "2026-06-30T09:00:00.000Z",
    });

    expect(result).toEqual([invoice, receipt]);
    expect(result[0]).toBe(invoice);
    expect(result[1]).toBe(receipt);
  });

  it("no desvincula una pareja emitida", () => {
    const invoice = document({
      id: "invoice-issued",
      type: "factura",
      receiptDocumentId: "receipt-issued",
    });
    const receipt = document({
      id: "receipt-issued",
      type: "recibo",
      sourceDocumentId: invoice.id,
    });
    const documents = [invoice, receipt];

    const result = applyDocumentLinkUpdate(documents, {
      relation: "invoice_receipt",
      invoiceId: invoice.id,
      receiptId: null,
      updatedAt: "2026-06-30T09:00:00.000Z",
    });

    expect(result).toBe(documents);
    expect(result[0]).toBe(invoice);
    expect(result[1]).toBe(receipt);
  });

  it("no enlaza un recibo independiente emitido", () => {
    const invoice = document({ id: "invoice-issued", type: "factura" });
    const receipt = document({ id: "receipt-issued", type: "recibo" });
    const documents = [invoice, receipt];

    const result = applyDocumentLinkUpdate(documents, {
      relation: "invoice_receipt",
      invoiceId: invoice.id,
      receiptId: receipt.id,
      updatedAt: "2026-06-30T09:00:00.000Z",
    });

    expect(result).toBe(documents);
    expect(result[0]).toBe(invoice);
    expect(result[1]).toBe(receipt);
  });

  it("codifica ids con barras para que los enlaces abran el detalle", () => {
    const invoice = document({ id: "Factura/2940/", type: "factura" });

    expect(encodeDocumentIdForPath(invoice.id)).toBe("Factura%252F2940%252F");
    expect(decodeDocumentIdFromPath("Factura%2F2940%2F")).toBe("Factura/2940/");
    expect(documentDetailPath(invoice)).toBe("/facturas/Factura%252F2940%252F");
  });

  it("ordena la cadena como factura, rectificativa, presupuesto, recibo y gastos", () => {
    const quote = document({ id: "quote-1", type: "presupuesto" });
    const invoice = document({
      id: "invoice-1",
      type: "factura",
      status: "rectificada",
      sourceQuoteDocumentId: quote.id,
      sourceQuoteNumber: quote.number,
      rectifiedById: "rect-1",
    });
    const rectification = document({
      id: "rect-1",
      type: "factura",
      number: "FR-2026-0001",
      sourceQuoteDocumentId: quote.id,
      sourceQuoteNumber: quote.number,
      rectification: {
        originalDocumentId: invoice.id,
        originalNumber: invoice.number,
        originalDate: invoice.date,
        reason: "Error en datos",
        type: "correccion",
      },
    });
    const receipt = document({
      id: "receipt-1",
      type: "recibo",
      sourceDocumentId: rectification.id,
    });
    const expense: Expense = {
      id: "expense-1",
      date: "2026-06-30",
      supplierName: "Proveedor",
      description: "Material",
      amount: 50,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      workDocumentId: invoice.id,
      createdAt: "2026-06-30T08:00:00.000Z",
    };
    const quoteExpense: Expense = {
      ...expense,
      id: "expense-2",
      workDocumentId: quote.id,
    };
    const rectificationExpense: Expense = {
      ...expense,
      id: "expense-3",
      workDocumentId: rectification.id,
    };

    const chain = getDocumentChainItems(
      invoice,
      [quote, invoice, rectification, receipt],
      [expense, quoteExpense, rectificationExpense],
    );

    expect(chain.map((item) => item.role)).toEqual([
      "factura",
      "rectificativa",
      "presupuesto",
      "recibo",
      "gastos",
    ]);
    expect(chain.map((item) => item.value)).toEqual([
      invoice.number,
      rectification.number,
      quote.number,
      receipt.number,
      "3 gastos",
    ]);
    expect(chain[0]).toMatchObject({ current: true });
    expect(chain[1]?.href).toBe(documentDetailPath(rectification));
    expect(chain.at(-1)).toMatchObject({
      role: "gastos",
      expenseCount: 3,
      expenseAmount: 150,
    });
  });

  it("muestra en la cadena el importe parcial aplicado al trabajo", () => {
    const invoice = document({ id: "invoice-1", type: "factura" });
    const expense: Expense = {
      id: "expense-1",
      date: "2026-06-30",
      supplierName: "Proveedor",
      description: "Material compartido",
      amount: 100,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      workDocumentId: invoice.id,
      createdAt: "2026-06-30T08:00:00.000Z",
    };

    const chain = getDocumentChainItems(
      invoice,
      [invoice],
      [expense],
      { "expense-1": 40 },
    );

    expect(chain.at(-1)).toMatchObject({
      role: "gastos",
      value: "1 gasto",
      expenseAmount: 40,
    });
  });
});
