import { isDraftInvoiceNumber, sortDocumentsByNewest } from "./documents";
import { findInvoiceCreatedFromQuote } from "./quote-to-invoice";
import { findReceiptForInvoice } from "./receipts";
import type { Document, DocumentType } from "./types";

export type DocumentLinkRelation = "quote_invoice" | "invoice_receipt";

export type DocumentLinkUpdate =
  | {
      relation: "quote_invoice";
      invoiceId: string;
      quoteId: string | null;
      updatedAt?: string;
    }
  | {
      relation: "invoice_receipt";
      invoiceId: string;
      receiptId: string | null;
      updatedAt?: string;
    };

export interface DocumentLinkBadge {
  id: string;
  label: string;
  href?: string;
  tone: "blue" | "green";
}

const TYPE_PATHS: Record<DocumentType, string> = {
  factura: "facturas",
  presupuesto: "presupuestos",
  recibo: "recibos",
};

export function documentDetailPath(document: Pick<Document, "id" | "type">): string {
  return `/${TYPE_PATHS[document.type]}/${encodeURIComponent(document.id)}`;
}

export function documentShortNumber(document: Pick<Document, "type" | "number" | "id">): string {
  if (isDraftInvoiceNumber(document)) return "borrador";
  return document.number || document.id.slice(0, 8);
}

function clearQuoteLink(document: Document, updatedAt: string): Document {
  if (!document.sourceQuoteDocumentId && !document.sourceQuoteNumber) return document;
  return {
    ...document,
    sourceQuoteDocumentId: undefined,
    sourceQuoteNumber: undefined,
    updatedAt,
  };
}

function clearInvoiceReceiptLink(document: Document, updatedAt: string): Document {
  if (!document.receiptDocumentId) return document;
  return {
    ...document,
    receiptDocumentId: undefined,
    updatedAt,
  };
}

function clearReceiptInvoiceLink(document: Document, updatedAt: string): Document {
  if (!document.sourceDocumentId) return document;
  return {
    ...document,
    sourceDocumentId: undefined,
    updatedAt,
  };
}

function applyQuoteInvoiceLink(
  documents: Document[],
  invoiceId: string,
  quoteId: string | null,
  updatedAt: string,
): Document[] {
  const invoice = documents.find((document) => document.id === invoiceId);
  if (!invoice || invoice.type !== "factura") return documents;

  const quote = quoteId
    ? documents.find(
        (document) => document.id === quoteId && document.type === "presupuesto",
      )
    : null;
  if (quoteId && !quote) return documents;

  return documents.map((document) => {
    if (document.id === invoiceId) {
      return {
        ...document,
        sourceQuoteDocumentId: quote?.id,
        sourceQuoteNumber: quote?.number,
        updatedAt,
      };
    }

    if (
      quote &&
      document.type === "factura" &&
      document.sourceQuoteDocumentId === quote.id
    ) {
      return clearQuoteLink(document, updatedAt);
    }

    return document;
  });
}

function applyInvoiceReceiptLink(
  documents: Document[],
  invoiceId: string,
  receiptId: string | null,
  updatedAt: string,
): Document[] {
  const invoice = documents.find((document) => document.id === invoiceId);
  if (!invoice || invoice.type !== "factura") return documents;

  const receipt = receiptId
    ? documents.find((document) => document.id === receiptId && document.type === "recibo")
    : null;
  if (receiptId && !receipt) return documents;

  return documents.map((document) => {
    if (document.id === invoiceId) {
      return {
        ...document,
        receiptDocumentId: receipt?.id,
        updatedAt,
      };
    }

    if (
      receipt &&
      document.type === "factura" &&
      document.receiptDocumentId === receipt.id
    ) {
      return clearInvoiceReceiptLink(document, updatedAt);
    }

    if (document.type !== "recibo") return document;

    if (receipt && document.id === receipt.id) {
      return {
        ...document,
        sourceDocumentId: invoice.id,
        updatedAt,
      };
    }

    if (document.sourceDocumentId === invoice.id) {
      return clearReceiptInvoiceLink(document, updatedAt);
    }

    return document;
  });
}

export function applyDocumentLinkUpdate(
  documents: Document[],
  update: DocumentLinkUpdate,
): Document[] {
  const updatedAt = update.updatedAt ?? new Date().toISOString();
  if (update.relation === "quote_invoice") {
    return applyQuoteInvoiceLink(
      documents,
      update.invoiceId,
      update.quoteId,
      updatedAt,
    );
  }

  return applyInvoiceReceiptLink(
    documents,
    update.invoiceId,
    update.receiptId,
    updatedAt,
  );
}

export function findQuoteLinkedToInvoice(
  documents: Document[],
  invoice: Document,
): Document | undefined {
  if (invoice.type !== "factura" || !invoice.sourceQuoteDocumentId) return undefined;
  return documents.find(
    (document) =>
      document.id === invoice.sourceQuoteDocumentId &&
      document.type === "presupuesto",
  );
}

export function findInvoiceLinkedToReceipt(
  documents: Document[],
  receipt: Document,
): Document | undefined {
  if (receipt.type !== "recibo" || !receipt.sourceDocumentId) return undefined;
  return documents.find(
    (document) =>
      document.id === receipt.sourceDocumentId && document.type === "factura",
  );
}

export function getDocumentLinkBadges(
  document: Document,
  documents: Document[],
): DocumentLinkBadge[] {
  if (document.type === "presupuesto") {
    const invoice = findInvoiceCreatedFromQuote(documents, document.id);
    return invoice
      ? [
          {
            id: `invoice-${invoice.id}`,
            label: `Factura ${documentShortNumber(invoice)}`,
            href: documentDetailPath(invoice),
            tone: "blue",
          },
        ]
      : [];
  }

  if (document.type === "recibo") {
    const invoice = findInvoiceLinkedToReceipt(documents, document);
    return invoice
      ? [
          {
            id: `invoice-${invoice.id}`,
            label: `Factura ${documentShortNumber(invoice)}`,
            href: documentDetailPath(invoice),
            tone: "blue",
          },
        ]
      : [];
  }

  const badges: DocumentLinkBadge[] = [];
  const quote = findQuoteLinkedToInvoice(documents, document);
  if (quote) {
    badges.push({
      id: `quote-${quote.id}`,
      label: `Presupuesto ${documentShortNumber(quote)}`,
      href: documentDetailPath(quote),
      tone: "blue",
    });
  } else if (document.sourceQuoteNumber) {
    badges.push({
      id: `quote-number-${document.sourceQuoteNumber}`,
      label: `Presupuesto ${document.sourceQuoteNumber}`,
      tone: "blue",
    });
  }

  const receipt = findReceiptForInvoice(
    documents,
    document.id,
    document.receiptDocumentId,
  );
  if (receipt) {
    badges.push({
      id: `receipt-${receipt.id}`,
      label: `Recibo ${documentShortNumber(receipt)}`,
      href: documentDetailPath(receipt),
      tone: "green",
    });
  }

  return badges;
}

export function linkableDocuments(
  documents: Document[],
  type: DocumentType,
  excludeId?: string,
): Document[] {
  return sortDocumentsByNewest(
    documents.filter(
      (document) => document.type === type && document.id !== excludeId,
    ),
  );
}
