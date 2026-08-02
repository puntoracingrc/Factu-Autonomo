import { describe, expect, it } from "vitest";

import { inspectInvoiceListIntegrity } from "./document-list-integrity-cache";
import {
  PERSISTED_APP_DERIVED_CACHE_VERSION,
  rememberPersistedAppDerivedCache,
} from "./persisted-app-derived-cache";
import type { Document } from "./types";
import { EMPTY_DATA } from "./types";

describe("document list integrity cache", () => {
  it("reutiliza la inspeccion mientras documentos y perfil no cambien", () => {
    const documents = [...EMPTY_DATA.documents];
    const profile = { ...EMPTY_DATA.profile };

    const first = inspectInvoiceListIntegrity(documents, profile);
    const second = inspectInvoiceListIntegrity(documents, profile);

    expect(second).toBe(first);
  });

  it("no reutiliza la inspeccion con otra revision del conjunto", () => {
    const profile = { ...EMPTY_DATA.profile };
    const first = inspectInvoiceListIntegrity([], profile);
    const second = inspectInvoiceListIntegrity([], profile);

    expect(second).not.toBe(first);
  });

  it("rehidrata una inspeccion persistida para la copia exacta", () => {
    const document: Document = {
      id: "invoice-cached",
      type: "factura",
      number: "F-2026-0001",
      date: "2026-08-02",
      client: { name: "Cliente" },
      items: [],
      status: "borrador",
      createdAt: "2026-08-02T10:00:00.000Z",
      updatedAt: "2026-08-02T10:00:00.000Z",
    };
    const data = {
      ...EMPTY_DATA,
      profile: { ...EMPTY_DATA.profile },
      documents: [document],
      customers: [],
    };
    rememberPersistedAppDerivedCache(data, {
      version: PERSISTED_APP_DERIVED_CACHE_VERSION,
      invoiceIntegrity: {
        blockedDocumentIds: [document.id],
        claimedDocumentIds: [],
        validDocumentIds: [],
        issuesByDocumentId: [],
      },
      documentLists: {
        invoiceIds: [document.id],
        quoteIds: [],
        receiptIds: [],
      },
      customerLists: {
        invoicedTotals: [],
        recentDescendingIds: [],
        duplicateGroupIds: [],
      },
    });

    const inspection = inspectInvoiceListIntegrity(
      data.documents,
      data.profile,
    );

    expect(inspection.blockedDocumentIds.has(document.id)).toBe(true);
  });
});
