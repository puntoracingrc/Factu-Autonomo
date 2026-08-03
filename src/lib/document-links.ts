import { roundMoney } from "./calculations";
import { isDraftInvoiceNumber, sortDocumentsByNewest } from "./documents";
import {
  expenseAllocatedAmountForWorkIds,
  explicitExpenseWorkAllocations,
} from "./expense-work-allocations";
import { expensesLinkedToWorkDocumentIds } from "./expense-work-index";
import { expenseFiscalAmounts } from "./expenses";
import { hasLegacyImportProtectionClaim } from "./document-integrity/legacy-import-attestation";
import { isRectificativa } from "./rectificativas";
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
  expenseAmount?: number;
  current: boolean;
}

const TYPE_PATHS: Record<DocumentType, string> = {
  factura: "facturas",
  presupuesto: "presupuestos",
  recibo: "recibos",
};

interface DocumentLinkIndex {
  invoiceById: Map<string, Document>;
  quoteById: Map<string, Document>;
  invoiceByQuoteId: Map<string, Document>;
  receiptsById: Map<string, IndexedDocument[]>;
  receiptsByInvoiceId: Map<string, IndexedDocument[]>;
}

interface IndexedDocument {
  document: Document;
  position: number;
}

const documentLinkIndexCache = new WeakMap<Document[], DocumentLinkIndex>();

function isReceiptLike(document: Document): boolean {
  return (
    document.type === "recibo" ||
    document.documentSnapshot?.documentType === "recibo"
  );
}

function pushIndexedDocument(
  index: Map<string, IndexedDocument[]>,
  key: string | undefined,
  entry: IndexedDocument,
) {
  if (!key) return;
  const documents = index.get(key) ?? [];
  documents.push(entry);
  index.set(key, documents);
}

function buildDocumentLinkIndex(documents: Document[]): DocumentLinkIndex {
  const invoiceById = new Map<string, Document>();
  const quoteById = new Map<string, Document>();
  const invoiceByQuoteId = new Map<string, Document>();
  const receiptsById = new Map<string, IndexedDocument[]>();
  const receiptsByInvoiceId = new Map<string, IndexedDocument[]>();

  documents.forEach((document, position) => {
    if (document.type === "factura" && !invoiceById.has(document.id)) {
      invoiceById.set(document.id, document);
    }
    if (document.type === "presupuesto" && !quoteById.has(document.id)) {
      quoteById.set(document.id, document);
    }
    if (
      document.type === "factura" &&
      document.sourceQuoteDocumentId &&
      !invoiceByQuoteId.has(document.sourceQuoteDocumentId)
    ) {
      invoiceByQuoteId.set(document.sourceQuoteDocumentId, document);
    }
    if (!isReceiptLike(document)) return;

    const entry = { document, position };
    pushIndexedDocument(receiptsById, document.id, entry);
    const invoiceIds = new Set([
      document.sourceDocumentId,
      document.documentSnapshot?.sourceDocumentId,
    ]);
    for (const invoiceId of invoiceIds) {
      pushIndexedDocument(receiptsByInvoiceId, invoiceId, entry);
    }
  });

  return {
    invoiceById,
    quoteById,
    invoiceByQuoteId,
    receiptsById,
    receiptsByInvoiceId,
  };
}

function getDocumentLinkIndex(documents: Document[]): DocumentLinkIndex {
  const cached = documentLinkIndexCache.get(documents);
  if (cached) return cached;

  const index = buildDocumentLinkIndex(documents);
  documentLinkIndexCache.set(documents, index);
  return index;
}

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
  index: DocumentLinkIndex,
  invoice: Document | undefined,
): Document | undefined {
  if (!invoice?.rectifiedById) return undefined;
  return index.invoiceById.get(invoice.rectifiedById);
}

function findOriginalForRectification(
  index: DocumentLinkIndex,
  rectification: Document,
): Document | undefined {
  const originalId = rectification.rectification?.originalDocumentId;
  if (!originalId) return undefined;
  return index.invoiceById.get(originalId);
}

function linkedReceiptForInvoice(
  index: DocumentLinkIndex,
  invoice: Document | undefined,
): Document | undefined {
  if (!invoice) return undefined;
  const candidates = new Map<number, Document>();
  for (const entry of index.receiptsByInvoiceId.get(invoice.id) ?? []) {
    candidates.set(entry.position, entry.document);
  }
  if (invoice.receiptDocumentId) {
    for (const entry of index.receiptsById.get(invoice.receiptDocumentId) ?? []) {
      candidates.set(entry.position, entry.document);
    }
  }
  return candidates.size === 1 ? [...candidates.values()][0] : undefined;
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
  expenseAllocations: Record<string, number> = {},
): DocumentChainItem[] {
  const index = getDocumentLinkIndex(documents);
  let invoice: Document | undefined;
  let rectification: Document | undefined;
  let quote: Document | undefined;
  let receipt: Document | undefined;

  if (document.type === "factura") {
    if (isRectificativa(document)) {
      rectification = document;
      invoice = findOriginalForRectification(index, document);
      quote =
        findQuoteLinkedToInvoiceWithIndex(index, document) ??
        (invoice ? findQuoteLinkedToInvoiceWithIndex(index, invoice) : undefined);
    } else {
      invoice = document;
      rectification = findRectificationForInvoice(index, document);
      quote = findQuoteLinkedToInvoiceWithIndex(index, document);
    }

    receipt =
      linkedReceiptForInvoice(index, rectification) ??
      linkedReceiptForInvoice(index, invoice);
  } else if (document.type === "presupuesto") {
    quote = document;
    invoice = index.invoiceByQuoteId.get(document.id);
    rectification = findRectificationForInvoice(index, invoice);
    receipt =
      linkedReceiptForInvoice(index, rectification) ??
      linkedReceiptForInvoice(index, invoice);
  } else {
    receipt = document;
    const linkedInvoice = findInvoiceLinkedToReceiptWithIndex(index, document);
    if (linkedInvoice && isRectificativa(linkedInvoice)) {
      rectification = linkedInvoice;
      invoice = findOriginalForRectification(index, linkedInvoice);
    } else {
      invoice = linkedInvoice;
      rectification = findRectificationForInvoice(index, linkedInvoice);
    }
    quote =
      (rectification
        ? findQuoteLinkedToInvoiceWithIndex(index, rectification)
        : undefined) ??
      (invoice ? findQuoteLinkedToInvoiceWithIndex(index, invoice) : undefined);
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
  const linkedExpenses = expensesLinkedToWorkDocumentIds(
    expenses,
    workDocumentIds as Set<string>,
  ).filter(
    (expense) => {
      const fiscal = expenseFiscalAmounts(expense);
      return (
        expenseAllocatedAmountForWorkIds(
          expense,
          workDocumentIds as Set<string>,
          fiscal.operatingCost,
        ) !== 0
      );
    },
  );
  if (linkedExpenses.length > 0) {
    const expenseAmount = linkedExpenses.reduce((total, expense) => {
      const operatingCost = expenseFiscalAmounts(expense).operatingCost;
      const persistedAllocation = expenseAllocatedAmountForWorkIds(
        expense,
        workDocumentIds as Set<string>,
        operatingCost,
      );
      const allocation =
        explicitExpenseWorkAllocations(expense).length === 0
          ? expenseAllocations[expense.id]
          : undefined;
      const appliedCost =
        allocation === undefined
          ? persistedAllocation
          : Math.sign(operatingCost || 1) *
            Math.min(Math.abs(allocation), Math.abs(operatingCost));
      return roundMoney(total + appliedCost);
    }, 0);
    items.push({
      id: `gastos-${[...workDocumentIds].join("-")}`,
      role: "gastos",
      title: "Gastos",
      value: `${linkedExpenses.length} gasto${
        linkedExpenses.length === 1 ? "" : "s"
      }`,
      href: "/gastos",
      expenseCount: linkedExpenses.length,
      expenseAmount,
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

export function applyDocumentLinkUpdate(
  documents: Document[],
  update: DocumentLinkUpdate,
): Document[] {
  const updatedAt = update.updatedAt ?? new Date().toISOString();
  if (update.relation === "quote_invoice") {
    const invoice = documents.find(
      (document) =>
        document.id === update.invoiceId && document.type === "factura",
    );
    const currentQuote = invoice?.sourceQuoteDocumentId
      ? documents.find(
          (document) =>
            document.id === invoice.sourceQuoteDocumentId &&
            document.type === "presupuesto",
        )
      : undefined;
    const nextQuote = update.quoteId
      ? documents.find(
          (document) =>
            document.id === update.quoteId && document.type === "presupuesto",
        )
      : undefined;
    const conflictingInvoice = nextQuote
      ? documents.find(
          (document) =>
            document.type === "factura" &&
            document.id !== invoice?.id &&
            document.sourceQuoteDocumentId === nextQuote.id,
        )
      : undefined;
    if (
      [invoice, currentQuote, nextQuote, conflictingInvoice].some(
        (document) =>
          document !== undefined && hasLegacyImportProtectionClaim(document),
      )
    ) {
      return documents;
    }
    return applyQuoteInvoiceLink(
      documents,
      update.invoiceId,
      update.quoteId,
      updatedAt,
    );
  }

  // La relación factura-recibo tiene efectos fiscales y solo puede nacer del
  // flujo canónico de cobro, que sella ambos extremos de forma atómica.
  // El editor genérico de vínculos queda deliberadamente en modo lectura.
  return documents;
}

export function findQuoteLinkedToInvoice(
  documents: Document[],
  invoice: Document,
): Document | undefined {
  return findQuoteLinkedToInvoiceWithIndex(
    getDocumentLinkIndex(documents),
    invoice,
  );
}

function findQuoteLinkedToInvoiceWithIndex(
  index: DocumentLinkIndex,
  invoice: Document,
): Document | undefined {
  if (invoice.type !== "factura" || !invoice.sourceQuoteDocumentId) return undefined;
  return index.quoteById.get(invoice.sourceQuoteDocumentId);
}

export function findInvoiceLinkedToReceipt(
  documents: Document[],
  receipt: Document,
): Document | undefined {
  return findInvoiceLinkedToReceiptWithIndex(
    getDocumentLinkIndex(documents),
    receipt,
  );
}

function findInvoiceLinkedToReceiptWithIndex(
  index: DocumentLinkIndex,
  receipt: Document,
): Document | undefined {
  if (receipt.type !== "recibo" || !receipt.sourceDocumentId) return undefined;
  return index.invoiceById.get(receipt.sourceDocumentId);
}

export function getDocumentLinkBadges(
  document: Document,
  documents: Document[],
): DocumentLinkBadge[] {
  const index = getDocumentLinkIndex(documents);
  if (document.type === "presupuesto") {
    const invoice = index.invoiceByQuoteId.get(document.id);
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
    const invoice = findInvoiceLinkedToReceiptWithIndex(index, document);
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
  const quote = findQuoteLinkedToInvoiceWithIndex(index, document);
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

  const receipt = linkedReceiptForInvoice(index, document);
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
