import { todayISO } from "./calculations";
import { isQuoteExpired } from "./quote-validity";
import { hasLegacyImportProtectionClaim } from "./document-integrity/legacy-import-attestation";
import { isRectificativa } from "./rectificativas";
import type { Document, LineItem } from "./types";

export type InvoiceDraftFromQuote = Omit<
  Document,
  "id" | "number" | "createdAt" | "updatedAt"
>;

interface BuildInvoiceDraftFromQuoteOptions {
  date?: string;
  lineIdFactory?: () => string;
}

const invoiceBySourceQuoteCache = new WeakMap<
  Document[],
  ReadonlyMap<string, Document>
>();

function invoiceBySourceQuote(documents: Document[]): ReadonlyMap<string, Document> {
  const cached = invoiceBySourceQuoteCache.get(documents);
  if (cached) return cached;

  const indexed = new Map<string, Document>();
  for (const document of documents) {
    if (
      document.type !== "factura" ||
      isRectificativa(document) ||
      !document.sourceQuoteDocumentId ||
      indexed.has(document.sourceQuoteDocumentId)
    ) {
      continue;
    }
    indexed.set(document.sourceQuoteDocumentId, document);
  }
  invoiceBySourceQuoteCache.set(documents, indexed);
  return indexed;
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
    !hasLegacyImportProtectionClaim(doc) &&
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
  return invoiceBySourceQuote(documents).get(quoteId);
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
    salesTerms: quote.salesTerms,
    paymentTerms: quote.paymentTerms,
    status: "borrador",
    sourceQuoteDocumentId: quote.id,
    sourceQuoteNumber: quote.number,
  };
}
