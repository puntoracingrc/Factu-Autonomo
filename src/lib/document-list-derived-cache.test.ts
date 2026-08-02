import { describe, expect, it } from "vitest";

import { getDocumentListBase } from "./document-list-derived-cache";
import {
  PERSISTED_APP_DERIVED_CACHE_VERSION,
  rememberPersistedAppDerivedCache,
  type PersistedAppDerivedCache,
} from "./persisted-app-derived-cache";
import type { AppData, Document } from "./types";
import { EMPTY_DATA } from "./types";

const NOW = "2026-08-02T10:00:00.000Z";

function invoice(id: string, number: string): Document {
  return {
    id,
    type: "factura",
    number,
    date: "2026-08-02",
    client: { name: "Cliente" },
    items: [],
    status: "borrador",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function derived(invoiceIds: string[]): PersistedAppDerivedCache {
  return {
    version: PERSISTED_APP_DERIVED_CACHE_VERSION,
    invoiceIntegrity: {
      blockedDocumentIds: [],
      claimedDocumentIds: [],
      validDocumentIds: [],
      issuesByDocumentId: [],
    },
    documentLists: { invoiceIds, quoteIds: [], receiptIds: [] },
    customerLists: {
      invoicedTotals: [],
      recentDescendingIds: [],
      duplicateGroupIds: [],
    },
  };
}

function dataWithDocuments(documents: Document[]): AppData {
  return {
    ...EMPTY_DATA,
    profile: { ...EMPTY_DATA.profile },
    documents,
    customers: [],
  };
}

describe("document list derived cache", () => {
  it("reutiliza el orden persistido ligado a las referencias exactas", () => {
    const older = invoice("invoice-1", "F-2026-0001");
    const newer = invoice("invoice-2", "F-2026-0002");
    const data = dataWithDocuments([older, newer]);
    rememberPersistedAppDerivedCache(data, derived([older.id, newer.id]));

    const base = getDocumentListBase(data.documents, data.profile);

    expect(base.byType.factura.map((document) => document.id)).toEqual([
      older.id,
      newer.id,
    ]);
    expect(getDocumentListBase(data.documents, data.profile)).toBe(base);
  });

  it("recalcula con el camino seguro cuando el indice contiene otro id", () => {
    const older = invoice("invoice-3", "F-2026-0001");
    const newer = invoice("invoice-4", "F-2026-0002");
    const data = dataWithDocuments([older, newer]);
    rememberPersistedAppDerivedCache(
      data,
      derived(["invoice-desconocida", older.id]),
    );

    const base = getDocumentListBase(data.documents, data.profile);

    expect(base.byType.factura.map((document) => document.id)).toEqual([
      newer.id,
      older.id,
    ]);
  });
});
