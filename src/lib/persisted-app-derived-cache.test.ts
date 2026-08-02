import { describe, expect, it } from "vitest";

import {
  isPersistedAppDerivedCache,
  PERSISTED_APP_DERIVED_CACHE_VERSION,
  readPersistedCustomerListSnapshot,
  readPersistedDocumentListSnapshot,
  readPersistedInvoiceIntegritySnapshot,
  rememberPersistedAppDerivedCache,
  type PersistedAppDerivedCache,
} from "./persisted-app-derived-cache";
import { EMPTY_DATA } from "./types";

function emptyDerivedCache(): PersistedAppDerivedCache {
  return {
    version: PERSISTED_APP_DERIVED_CACHE_VERSION,
    invoiceIntegrity: {
      blockedDocumentIds: [],
      claimedDocumentIds: [],
      validDocumentIds: [],
      issuesByDocumentId: [],
    },
    documentLists: {
      invoiceIds: [],
      quoteIds: [],
      receiptIds: [],
    },
    customerLists: {
      invoicedTotals: [],
      recentDescendingIds: [],
      duplicateGroupIds: [],
    },
  };
}

describe("persisted app derived cache", () => {
  it("registra los indices solo para las referencias exactas de la copia", () => {
    const data = {
      ...EMPTY_DATA,
      profile: { ...EMPTY_DATA.profile },
      documents: [...EMPTY_DATA.documents],
      customers: [...EMPTY_DATA.customers],
    };
    const derived = emptyDerivedCache();

    rememberPersistedAppDerivedCache(data, derived);

    expect(
      readPersistedInvoiceIntegritySnapshot(data.documents, data.profile),
    ).toBe(derived.invoiceIntegrity);
    expect(
      readPersistedDocumentListSnapshot(data.documents, data.profile),
    ).toBe(derived.documentLists);
    expect(
      readPersistedCustomerListSnapshot(data.customers, data.documents),
    ).toBe(derived.customerLists);
    expect(
      readPersistedDocumentListSnapshot([], data.profile),
    ).toBeNull();
  });

  it("rechaza estructuras incompletas o con valores no finitos", () => {
    const derived = emptyDerivedCache();

    expect(isPersistedAppDerivedCache(derived)).toBe(true);
    expect(
      isPersistedAppDerivedCache({
        ...derived,
        customerLists: {
          ...derived.customerLists,
          invoicedTotals: [["c1", Number.NaN]],
        },
      }),
    ).toBe(false);
    expect(
      isPersistedAppDerivedCache({
        ...derived,
        documentLists: { invoiceIds: [] },
      }),
    ).toBe(false);
  });
});
