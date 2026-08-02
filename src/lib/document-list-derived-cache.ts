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

export function getDocumentListBase(
  documents: readonly Document[],
  profile: BusinessProfile,
): DocumentListBase {
  const cached = cache.get(documents)?.get(profile);
  if (cached) return cached;

  const base = buildDocumentListBase(documents, profile);
  let byProfile = cache.get(documents);
  if (!byProfile) {
    byProfile = new WeakMap();
    cache.set(documents, byProfile);
  }
  byProfile.set(profile, base);
  return base;
}
