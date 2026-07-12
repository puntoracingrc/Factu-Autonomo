import { describe, expect, it } from "vitest";
import {
  getDocumentChainItems,
  type DocumentChainItem,
} from "@/lib/document-links";
import type { Document, DocumentType } from "@/lib/types";
import { selectDocumentRelationshipPresentationItems } from "./document-relationship-presentation";

function document(
  overrides: Partial<Document> & { id: string; type: DocumentType },
): Document {
  return {
    number: `${overrides.type}-${overrides.id}`,
    date: "2026-07-12",
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
    createdAt: "2026-07-12T08:00:00.000Z",
    updatedAt: "2026-07-12T08:00:00.000Z",
    ...overrides,
  };
}

function chainItem(
  role: DocumentChainItem["role"],
  linkedDocument?: Document,
  overrides: Partial<DocumentChainItem> = {},
): DocumentChainItem {
  return {
    id: linkedDocument ? `${role}-${linkedDocument.id}` : `${role}-summary`,
    role,
    title: role,
    value: linkedDocument?.number ?? role,
    document: linkedDocument,
    current: false,
    ...overrides,
  };
}

describe("document relationship presentation", () => {
  it("muestra en una factura solo sus documentos vinculados y conserva gastos intactos", () => {
    const invoice = document({ id: "invoice", type: "factura" });
    const rectification = document({
      id: "rectification",
      type: "factura",
      rectification: {
        originalDocumentId: invoice.id,
        originalNumber: invoice.number,
        originalDate: invoice.date,
        reason: "Corrección",
        type: "correccion",
      },
    });
    const quote = document({ id: "quote", type: "presupuesto" });
    const receipt = document({ id: "receipt", type: "recibo" });
    const current = chainItem("factura", invoice, { current: true });
    const linkedRectification = chainItem("rectificativa", rectification);
    const linkedQuote = chainItem("presupuesto", quote);
    const linkedReceipt = chainItem("recibo", receipt);
    const expenses = chainItem("gastos", undefined, {
      expenseCount: 2,
      expenseAmount: 84.7,
      value: "2 gastos",
    });
    const chain = [
      current,
      linkedRectification,
      linkedQuote,
      linkedReceipt,
      expenses,
    ];

    const result = selectDocumentRelationshipPresentationItems(chain, invoice);

    expect(result).toEqual([
      linkedQuote,
      linkedRectification,
      linkedReceipt,
      expenses,
    ]);
    expect(result[3]).toBe(expenses);
    expect(result[3]).toMatchObject({
      expenseCount: 2,
      expenseAmount: 84.7,
    });
    expect(chain).toHaveLength(5);
  });

  it("muestra en una rectificativa el original, presupuesto, recibo y gastos", () => {
    const original = document({ id: "original", type: "factura" });
    const rectification = document({
      id: "rectification",
      type: "factura",
      rectification: {
        originalDocumentId: original.id,
        originalNumber: original.number,
        originalDate: original.date,
        reason: "Corrección",
        type: "correccion",
      },
    });
    const items = [
      chainItem("factura", original),
      chainItem("rectificativa", rectification, { current: true }),
      chainItem("presupuesto", document({ id: "quote", type: "presupuesto" })),
      chainItem("recibo", document({ id: "receipt", type: "recibo" })),
      chainItem("gastos", undefined, { expenseCount: 1, expenseAmount: 25 }),
    ];

    expect(
      selectDocumentRelationshipPresentationItems(items, rectification).map(
        (item) => item.role,
      ),
    ).toEqual(["factura", "presupuesto", "recibo", "gastos"]);
  });

  it("muestra desde un presupuesto factura, rectificativa, recibo y gastos", () => {
    const quote = document({ id: "quote", type: "presupuesto" });
    const items = [
      chainItem("factura", document({ id: "invoice", type: "factura" })),
      chainItem(
        "rectificativa",
        document({ id: "rectification", type: "factura" }),
      ),
      chainItem("presupuesto", quote, { current: true }),
      chainItem("recibo", document({ id: "receipt", type: "recibo" })),
      chainItem("gastos", undefined, { expenseCount: 3, expenseAmount: 150 }),
    ];

    expect(
      selectDocumentRelationshipPresentationItems(items, quote).map(
        (item) => item.role,
      ),
    ).toEqual(["factura", "rectificativa", "recibo", "gastos"]);
  });

  it("muestra desde un recibo únicamente su factura origen directa", () => {
    const source = document({ id: "invoice", type: "factura" });
    const receipt = document({
      id: "receipt",
      type: "recibo",
      sourceDocumentId: source.id,
    });
    const sourceItem = chainItem("factura", source);
    const items = [
      sourceItem,
      chainItem("presupuesto", document({ id: "quote", type: "presupuesto" })),
      chainItem("recibo", receipt, { current: true }),
      chainItem("gastos", undefined, { expenseCount: 1, expenseAmount: 40 }),
    ];

    const result = selectDocumentRelationshipPresentationItems(items, receipt);

    expect(result).toEqual([sourceItem]);
    expect(result[0]).toBe(sourceItem);
  });

  it("reconoce una rectificativa como origen directo del recibo sin mostrar el original", () => {
    const original = document({ id: "original", type: "factura" });
    const rectification = document({ id: "rectification", type: "factura" });
    const receipt = document({
      id: "receipt",
      type: "recibo",
      sourceDocumentId: rectification.id,
    });
    const directSource = chainItem("rectificativa", rectification);

    expect(
      selectDocumentRelationshipPresentationItems(
        [chainItem("factura", original), directSource, chainItem("recibo", receipt)],
        receipt,
      ),
    ).toEqual([directSource]);
  });

  it("excluye por marca current y por id aunque la cadena sea incoherente", () => {
    const invoice = document({ id: "invoice", type: "factura" });
    const quote = document({ id: "quote", type: "presupuesto" });
    const markedCurrent = chainItem("recibo", document({ id: "other", type: "recibo" }), {
      current: true,
    });

    const result = selectDocumentRelationshipPresentationItems(
      [
        chainItem("factura", invoice, { current: false }),
        chainItem("presupuesto", quote),
        markedCurrent,
      ],
      invoice,
    );

    expect(result).toEqual([expect.objectContaining({ document: quote })]);
  });

  it("no confunde un id real con la clave sintética de otro vínculo", () => {
    const invoice = document({
      id: "presupuesto-quote",
      type: "factura",
    });
    const quote = document({ id: "quote", type: "presupuesto" });
    const linkedQuote = chainItem("presupuesto", quote);

    expect(linkedQuote.id).toBe(invoice.id);
    expect(
      selectDocumentRelationshipPresentationItems(
        [chainItem("factura", invoice, { current: true }), linkedQuote],
        invoice,
      ),
    ).toEqual([linkedQuote]);
  });

  it("no inventa un origen de recibo ausente, inexistente o ambiguo", () => {
    const source = document({ id: "invoice", type: "factura" });
    const sourceItem = chainItem("factura", source);
    const withoutSource = document({ id: "receipt-1", type: "recibo" });
    const missingSource = document({
      id: "receipt-2",
      type: "recibo",
      sourceDocumentId: "missing",
    });
    const ambiguousSource = document({
      id: "receipt-3",
      type: "recibo",
      sourceDocumentId: source.id,
    });

    expect(
      selectDocumentRelationshipPresentationItems([sourceItem], withoutSource),
    ).toEqual([]);
    expect(
      selectDocumentRelationshipPresentationItems([sourceItem], missingSource),
    ).toEqual([]);
    expect(
      selectDocumentRelationshipPresentationItems(
        [sourceItem, { ...sourceItem, id: "duplicate-source" }],
        ambiguousSource,
      ),
    ).toEqual([]);
  });

  it("no muestra un origen vivo contrario al origen congelado", () => {
    const liveSource = document({ id: "invoice-live", type: "factura" });
    const receipt = document({
      id: "receipt-mismatch",
      type: "recibo",
      sourceDocumentId: liveSource.id,
      documentSnapshot: {
        sourceDocumentId: "invoice-frozen",
      } as Document["documentSnapshot"],
    });

    expect(
      selectDocumentRelationshipPresentationItems(
        [chainItem("factura", liveSource), chainItem("recibo", receipt)],
        receipt,
      ),
    ).toEqual([]);
  });

  it("compone la cadena canónica sin repetir la tarjeta actual", () => {
    const quote = document({ id: "quote-real", type: "presupuesto" });
    const invoice = document({
      id: "invoice-real",
      type: "factura",
      sourceQuoteDocumentId: quote.id,
      sourceQuoteNumber: quote.number,
    });
    const receipt = document({
      id: "receipt-real",
      type: "recibo",
      sourceDocumentId: invoice.id,
    });
    const linkedInvoice = { ...invoice, receiptDocumentId: receipt.id };
    const documents = [quote, linkedInvoice, receipt];

    const invoicePresentation = selectDocumentRelationshipPresentationItems(
      getDocumentChainItems(linkedInvoice, documents),
      linkedInvoice,
    );
    const receiptPresentation = selectDocumentRelationshipPresentationItems(
      getDocumentChainItems(receipt, documents),
      receipt,
    );

    expect(invoicePresentation.map((item) => item.role)).toEqual([
      "presupuesto",
      "recibo",
    ]);
    expect(
      invoicePresentation.some(
        (item) => item.document?.id === linkedInvoice.id,
      ),
    ).toBe(false);
    expect(receiptPresentation.map((item) => item.document?.id)).toEqual([
      linkedInvoice.id,
    ]);
  });
});
