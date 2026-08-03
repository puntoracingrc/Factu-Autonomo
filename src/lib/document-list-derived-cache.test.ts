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

  it("conserva el orden y remapea la revision actual al cambiar el cobro", () => {
    const older = {
      ...invoice("invoice-5", "F-2026-0001"),
      status: "enviado" as const,
      paymentStatus: "pending" as const,
    };
    const newer = {
      ...invoice("invoice-6", "F-2026-0002"),
      status: "enviado" as const,
      paymentStatus: "pending" as const,
    };
    const data = dataWithDocuments([older, newer]);
    const first = getDocumentListBase(data.documents, data.profile);
    const paidNewer = {
      ...newer,
      status: "pagado" as const,
      paymentStatus: "paid" as const,
      paidAt: "2026-08-02T10:05:00.000Z",
      updatedAt: "2026-08-02T10:05:00.000Z",
    };

    const second = getDocumentListBase([older, paidNewer], data.profile);

    expect(second).not.toBe(first);
    expect(second.yearsByType.factura).toBe(first.yearsByType.factura);
    expect(second.byType.factura).toEqual([paidNewer, older]);
    expect(second.byType.factura[0]).toBe(paidNewer);
  });

  it("recalcula cuando cambia un campo que participa en el orden", () => {
    const firstInvoice = invoice("invoice-7", "F-2026-0001");
    const secondInvoice = invoice("invoice-8", "F-2026-0002");
    const data = dataWithDocuments([firstInvoice, secondInvoice]);
    const first = getDocumentListBase(data.documents, data.profile);
    const renumbered = { ...firstInvoice, number: "F-2026-0003" };

    const second = getDocumentListBase(
      [renumbered, secondInvoice],
      data.profile,
    );

    expect(second.yearsByType.factura).not.toBe(first.yearsByType.factura);
    expect(second.byType.factura.map((document) => document.id)).toEqual([
      renumbered.id,
      secondInvoice.id,
    ]);
  });

  it("recalcula al emitir un borrador porque cambia su clase de orden", () => {
    const draft = invoice("invoice-9", "Borrador");
    const issued = invoice("invoice-10", "F-2026-0001");
    const data = dataWithDocuments([draft, issued]);
    const first = getDocumentListBase(data.documents, data.profile);
    const emittedDraft = {
      ...draft,
      number: "F-2026-0002",
      status: "enviado" as const,
    };

    const second = getDocumentListBase(
      [emittedDraft, issued],
      data.profile,
    );

    expect(second.yearsByType.factura).not.toBe(first.yearsByType.factura);
    expect(second.byType.factura[0]).toBe(emittedDraft);
  });
});
