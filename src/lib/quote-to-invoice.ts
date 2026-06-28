import { todayISO } from "./calculations";
import { isQuoteExpired } from "./quote-validity";
import type { Document, LineItem } from "./types";

export type InvoiceDraftFromQuote = Omit<
  Document,
  "id" | "number" | "createdAt" | "updatedAt"
>;

interface BuildInvoiceDraftFromQuoteOptions {
  date?: string;
  lineIdFactory?: () => string;
}

function cloneLineItem(
  item: LineItem,
  lineIdFactory: () => string,
): LineItem {
  return {
    ...item,
    id: lineIdFactory(),
  };
}

export function canConvertQuoteToInvoice(doc: Document): boolean {
  return (
    doc.type === "presupuesto" &&
    doc.status !== "anulada" &&
    doc.status !== "rechazado" &&
    doc.status !== "vencido" &&
    !isQuoteExpired(doc)
  );
}

export function findInvoiceCreatedFromQuote(
  documents: Document[],
  quoteId: string,
): Document | undefined {
  return documents.find(
    (doc) =>
      doc.type === "factura" &&
      doc.sourceQuoteDocumentId === quoteId,
  );
}

export function buildInvoiceDraftFromQuote(
  quote: Document,
  options: BuildInvoiceDraftFromQuoteOptions = {},
): InvoiceDraftFromQuote {
  if (!canConvertQuoteToInvoice(quote)) {
    throw new Error("Solo se puede convertir un presupuesto activo a factura.");
  }

  const lineIdFactory =
    options.lineIdFactory ?? (() => crypto.randomUUID());

  return {
    type: "factura",
    date: options.date ?? todayISO(),
    customerId: quote.customerId,
    client: { ...quote.client },
    items: quote.items.map((item) => cloneLineItem(item, lineIdFactory)),
    notes: quote.notes,
    paymentTerms: quote.paymentTerms,
    status: "borrador",
    sourceQuoteDocumentId: quote.id,
    sourceQuoteNumber: quote.number,
  };
}
