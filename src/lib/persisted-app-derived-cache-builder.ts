import {
  buildCustomerInvoicedTotals,
  findDuplicateCustomerGroups,
  sortCustomers,
} from "./customers";
import { inspectInvoiceListIntegrity } from "./document-list-integrity-cache";
import {
  getFacturasIncludingRectificativas,
  sortDocumentsByNumberDesc,
  sortInvoicesByPeriodAndNumberDesc,
} from "./documents";
import {
  PERSISTED_APP_DERIVED_CACHE_VERSION,
  type PersistedAppDerivedCache,
} from "./persisted-app-derived-cache";
import type { AppData } from "./types";

export function buildPersistedAppDerivedCache(
  data: AppData,
): PersistedAppDerivedCache {
  const invoiceIntegrity = inspectInvoiceListIntegrity(
    data.documents,
    data.profile,
  );
  const invoices = sortInvoicesByPeriodAndNumberDesc(
    getFacturasIncludingRectificativas(data.documents),
    data.profile.numbering,
  );
  const quotes = sortDocumentsByNumberDesc(
    data.documents.filter((document) => document.type === "presupuesto"),
  );
  const receipts = sortDocumentsByNumberDesc(
    data.documents.filter((document) => document.type === "recibo"),
  );
  const invoicedTotals = buildCustomerInvoicedTotals(
    data.customers,
    data.documents,
  );
  const recentCustomers = sortCustomers(
    data.customers,
    data.documents,
    "reciente",
    "desc",
    invoicedTotals,
  );

  return {
    version: PERSISTED_APP_DERIVED_CACHE_VERSION,
    invoiceIntegrity: {
      blockedDocumentIds: [...invoiceIntegrity.blockedDocumentIds],
      claimedDocumentIds: [...invoiceIntegrity.recovery.claimedDocumentIds],
      validDocumentIds: [...invoiceIntegrity.recovery.validDocumentIds],
      issuesByDocumentId: [...invoiceIntegrity.recovery.issuesByDocumentId].map(
        ([documentId, issues]) => [documentId, [...issues]],
      ),
    },
    documentLists: {
      invoiceIds: invoices.map((document) => document.id),
      quoteIds: quotes.map((document) => document.id),
      receiptIds: receipts.map((document) => document.id),
    },
    customerLists: {
      invoicedTotals: [...invoicedTotals],
      recentDescendingIds: recentCustomers.map((customer) => customer.id),
      duplicateGroupIds: findDuplicateCustomerGroups(data.customers).map(
        (group) => group.map((customer) => customer.id),
      ),
    },
  };
}
