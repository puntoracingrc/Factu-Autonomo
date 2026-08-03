import {
  getFacturasIncludingRectificativas,
  sortDocumentsByNumberDesc,
  sortInvoicesByPeriodAndNumberDesc,
} from "./documents";
import { readPersistedDocumentListSnapshot } from "./persisted-app-derived-cache";
import { availableProductPeriodYears } from "./product-period-summary";
import type { BusinessProfile, Document, DocumentType } from "./types";

export interface DocumentListBase {
  byType: Record<DocumentType, Document[]>;
  yearsByType: Record<DocumentType, number[]>;
}

const cache = new WeakMap<
  readonly Document[],
  WeakMap<BusinessProfile, DocumentListBase>
>();
const latestByProfile = new WeakMap<
  BusinessProfile,
  { documents: readonly Document[]; base: DocumentListBase }
>();

function hasSameDocumentListOrderInputs(
  previous: readonly Document[],
  current: readonly Document[],
): boolean {
  if (previous === current || previous.length !== current.length) return false;

  for (let index = 0; index < previous.length; index += 1) {
    const before = previous[index];
    const after = current[index];
    if (
      before.id !== after.id ||
      before.type !== after.type ||
      before.number !== after.number ||
      before.date !== after.date ||
      before.createdAt !== after.createdAt ||
      before.rectification !== after.rectification ||
      (before.type === "factura" &&
        (before.status === "borrador") !== (after.status === "borrador"))
    ) {
      return false;
    }
  }

  return true;
}

function resolvePersistedOrder(
  ids: readonly string[],
  documents: readonly Document[],
): Document[] | null {
  if (ids.length !== documents.length) return null;
  const byId = new Map(documents.map((document) => [document.id, document]));
  if (byId.size !== documents.length) return null;

  const seen = new Set<string>();
  const result: Document[] = [];
  for (const id of ids) {
    const document = byId.get(id);
    if (!document || seen.has(id)) return null;
    seen.add(id);
    result.push(document);
  }
  return result;
}

function buildDocumentListBase(
  documents: readonly Document[],
  profile: BusinessProfile,
): DocumentListBase {
  const invoices = getFacturasIncludingRectificativas([...documents]);
  const quotes = documents.filter(
    (document) => document.type === "presupuesto",
  );
  const receipts = documents.filter((document) => document.type === "recibo");
  const persisted = readPersistedDocumentListSnapshot(documents, profile);
  const persistedInvoices = persisted
    ? resolvePersistedOrder(persisted.invoiceIds, invoices)
    : null;
  const persistedQuotes = persisted
    ? resolvePersistedOrder(persisted.quoteIds, quotes)
    : null;
  const persistedReceipts = persisted
    ? resolvePersistedOrder(persisted.receiptIds, receipts)
    : null;
  const byType: Record<DocumentType, Document[]> = {
    factura:
      persistedInvoices ??
      sortInvoicesByPeriodAndNumberDesc(invoices, profile.numbering),
    presupuesto: persistedQuotes ?? sortDocumentsByNumberDesc(quotes),
    recibo: persistedReceipts ?? sortDocumentsByNumberDesc(receipts),
  };

  return {
    byType,
    yearsByType: {
      factura: availableProductPeriodYears(byType.factura, []),
      presupuesto: availableProductPeriodYears(byType.presupuesto, []),
      recibo: availableProductPeriodYears(byType.recibo, []),
    },
  };
}

function remapDocumentListBase(
  previous: { documents: readonly Document[]; base: DocumentListBase },
  documents: readonly Document[],
): DocumentListBase | null {
  if (!hasSameDocumentListOrderInputs(previous.documents, documents)) {
    return null;
  }

  const currentById = new Map(
    documents.map((document) => [document.id, document]),
  );
  if (currentById.size !== documents.length) return null;

  const remap = (ordered: readonly Document[]): Document[] | null => {
    const result: Document[] = [];
    for (const document of ordered) {
      const current = currentById.get(document.id);
      if (!current || current.type !== document.type) return null;
      result.push(current);
    }
    return result;
  };
  const invoices = remap(previous.base.byType.factura);
  const quotes = remap(previous.base.byType.presupuesto);
  const receipts = remap(previous.base.byType.recibo);
  if (
    !invoices ||
    !quotes ||
    !receipts ||
    invoices.length + quotes.length + receipts.length !== documents.length
  ) {
    return null;
  }

  return {
    byType: { factura: invoices, presupuesto: quotes, recibo: receipts },
    yearsByType: previous.base.yearsByType,
  };
}

export function getDocumentListBase(
  documents: readonly Document[],
  profile: BusinessProfile,
): DocumentListBase {
  const cached = cache.get(documents)?.get(profile);
  if (cached) return cached;

  const previous = latestByProfile.get(profile);
  const base =
    (previous && remapDocumentListBase(previous, documents)) ||
    buildDocumentListBase(documents, profile);
  let byProfile = cache.get(documents);
  if (!byProfile) {
    byProfile = new WeakMap();
    cache.set(documents, byProfile);
  }
  byProfile.set(profile, base);
  latestByProfile.set(profile, { documents, base });
  return base;
}
