import { isDraftInvoiceNumber, sortDocumentsByNewest } from "./documents";
import { findInvoiceCreatedFromQuote } from "./quote-to-invoice";
import { isRectificativa } from "./rectificativas";
import { findReceiptForInvoice } from "./receipts";
import type { Document, DocumentType, Expense } from "./types";

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

export type DocumentChainRole =
  | "factura"
  | "rectificativa"
  | "presupuesto"
  | "recibo"
  | "gastos";

export interface DocumentChainItem {
  id: string;
  role: DocumentChainRole;
  title: string;
  value: string;
  href?: string;
  document?: Document;
  expenseCount?: number;
  current: boolean;
}

const TYPE_PATHS: Record<DocumentType, string> = {
  factura: "facturas",
  presupuesto: "presupuestos",
  recibo: "recibos",
};

export function encodeDocumentIdForPath(id: string): string {
  return encodeURIComponent(encodeURIComponent(id));
}

export function decodeDocumentIdFromPath(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export function documentDetailPath(document: Pick<Document, "id" | "type">): string {
  return `/${TYPE_PATHS[document.type]}/${encodeDocumentIdForPath(document.id)}`;
}

export function documentShortNumber(document: Pick<Document, "type" | "number" | "id">): string {
  if (isDraftInvoiceNumber(document)) return "borrador";
  return document.number || document.id.slice(0, 8);
}

function findRectificationForInvoice(
  documents: Document[],
  invoice: Document | undefined,
): Document | undefined {
  if (!invoice?.rectifiedById) return undefined;
  return documents.find(
    (document) =>
      document.id === invoice.rectifiedById && document.type === "factura",
  );
}

function findOriginalForRectification(
  documents: Document[],
  rectification: Document,
): Document | undefined {
  const originalId = rectification.rectification?.originalDocumentId;
  if (!originalId) return undefined;
  return documents.find(
    (document) => document.id === originalId && document.type === "factura",
  );
}

function linkedReceiptForInvoice(
  documents: Document[],
  invoice: Document | undefined,
): Document | undefined {
  if (!invoice) return undefined;
  return findReceiptForInvoice(documents, invoice.id, invoice.receiptDocumentId);
}

function pushDocumentChainItem(
  items: DocumentChainItem[],
  document: Document | undefined,
  role: Exclude<DocumentChainRole, "gastos">,
  title: string,
  currentDocumentId: string,
) {
  if (!document) return;
  if (items.some((item) => item.document?.id === document.id)) return;

  items.push({
    id: `${role}-${document.id}`,
    role,
    title,
    value: documentShortNumber(document),
    href: documentDetailPath(document),
    document,
    current: document.id === currentDocumentId,
  });
}

export function getDocumentChainItems(
  document: Document,
  documents: Document[],
  expenses: Expense[] = [],
): DocumentChainItem[] {
  let invoice: Document | undefined;
  let rectification: Document | undefined;
  let quote: Document | undefined;
  let receipt: Document | undefined;

  if (document.type === "factura") {
    if (isRectificativa(document)) {
      rectification = document;
      invoice = findOriginalForRectification(documents, document);
      quote =
        findQuoteLinkedToInvoice(documents, document) ??
        (invoice ? findQuoteLinkedToInvoice(documents, invoice) : undefined);
    } else {
      invoice = document;
      rectification = findRectificationForInvoice(documents, document);
      quote = findQuoteLinkedToInvoice(documents, document);
    }

    receipt =
      linkedReceiptForInvoice(documents, rectification) ??
      linkedReceiptForInvoice(documents, invoice);
  } else if (document.type === "presupuesto") {
    quote = document;
    invoice = findInvoiceCreatedFromQuote(documents, document.id);
    rectification = findRectificationForInvoice(documents, invoice);
    receipt =
      linkedReceiptForInvoice(documents, rectification) ??
      linkedReceiptForInvoice(documents, invoice);
  } else {
    receipt = document;
    const linkedInvoice = findInvoiceLinkedToReceipt(documents, document);
    if (linkedInvoice && isRectificativa(linkedInvoice)) {
      rectification = linkedInvoice;
      invoice = findOriginalForRectification(documents, linkedInvoice);
    } else {
      invoice = linkedInvoice;
      rectification = findRectificationForInvoice(documents, linkedInvoice);
    }
    quote =
      (rectification
        ? findQuoteLinkedToInvoice(documents, rectification)
        : undefined) ??
      (invoice ? findQuoteLinkedToInvoice(documents, invoice) : undefined);
  }

  const items: DocumentChainItem[] = [];
  pushDocumentChainItem(items, invoice, "factura", "Factura", document.id);
  pushDocumentChainItem(
    items,
    rectification,
    "rectificativa",
    "Rectificativa",
    document.id,
  );
  pushDocumentChainItem(
    items,
    quote,
    "presupuesto",
    "Presupuesto",
    document.id,
  );
  pushDocumentChainItem(items, receipt, "recibo", "Recibo", document.id);

  const workDocumentIds = new Set(
    [invoice, rectification, quote].map((item) => item?.id).filter(Boolean),
  );
  const linkedExpenses = expenses.filter(
    (expense) =>
      expense.workDocumentId && workDocumentIds.has(expense.workDocumentId),
  );
  if (linkedExpenses.length > 0) {
    items.push({
      id: `gastos-${[...workDocumentIds].join("-")}`,
      role: "gastos",
      title: "Gastos",
      value: `${linkedExpenses.length} gasto${
        linkedExpenses.length === 1 ? "" : "s"
      }`,
      href: "/gastos",
      expenseCount: linkedExpenses.length,
      current: false,
    });
  }

  return items;
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
