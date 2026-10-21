import { afterEach, describe, expect, it, vi } from "vitest";
import { commitAppDataDurably } from "@/lib/app-data-durability";
import {
  inspectPersistedData, normalizeLoadedData, readPersistedDataSnapshot,
  readPersistedDataSnapshotPreferPersistentCache, saveData,
} from "@/lib/storage";
import { EMPTY_DATA, type AppData, type Document } from "@/lib/types";
import { syntheticIntent, syntheticProfile } from "@/lib/quick-invoicing/test-fixtures";
import { quickPdfContext } from "@/lib/quick-invoicing/context";
import { quickIssuedDocument } from "@/lib/quick-invoicing/render";
import { selectCentralBusinessEventsSyncBaseline } from "@/lib/central-business-authority/events-app-data-sync";
import { syncCentralInvoiceAuthorityEventsIntoAppData } from "./events-app-data-sync";
import { receiveConfirmedCentralInvoiceChange } from "./management-reception";
import type { CentralInvoiceAuthorityEventsPullResult } from "./events-client";

const KEY = "synthetic-company-delete-reception";
const OTHER_KEY = "synthetic-other-company";
const NOW = "2026-10-21T10:00:00.000Z";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function harness() {
  const storage = new MemoryStorage();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", storage);
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
  const doc: Document = { ...quickIssuedDocument({
    id: "quick-synthetic-operation", type: "factura", number: "F-2026-0042",
    date: "2026-10-21", client: syntheticIntent().client,
    items: syntheticIntent().items, status: "enviado", createdAt: NOW, updatedAt: NOW,
    issuedAt: NOW, quickPdfContext: quickPdfContext(syntheticProfile),
  }, syntheticProfile),
    centralInvoiceAuthority: {
      schemaVersion: 1, source: "central_invoice_authority",
      serverDocumentId: "synthetic-server-document", identityId: "synthetic-identity",
      outboxEventId: "synthetic-issued", eventType: "invoice_issued",
      fullNumber: "F-2026-0042", sequence: 42, documentVersion: 1, receivedAt: NOW,
    },
  };
  // A central event inserts the invoice without changing the old local counter.
  // The background read derives that counter again, without a business edit.
  let current: AppData = {
    ...normalizeLoadedData({ ...EMPTY_DATA, profile: syntheticProfile }),
    documents: [doc], meta: { lastModified: NOW, pendingChanges: [] },
  };
  expect(saveData(current, { storageKey: KEY })).toEqual({ status: "applied" });
  const persistedRaw = storage.getItem(KEY);
  // Reading a different workspace evicts the one-entry equivalent-object cache.
  readPersistedDataSnapshot(OTHER_KEY);
  return { storage, doc, persistedRaw, get data() { return current; },
    commit: <T,>(expected: AppData, build: (previous: AppData) => { data: AppData; value: T }) => {
      const result = commitAppDataDurably({ expected, getCurrent: () => current,
        trackLegacyChanges: false, build,
        persist: (candidate, base) => saveData(candidate, { storageKey: KEY, expected: base }),
      });
      if (result.status === "applied") current = result.data;
      return result;
    },
  };
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("confirmed deletion across persisted normalization and cache eviction", () => {
  it("recognizes exact stored bytes even if the read model derives a newer counter", async () => {
    const h = harness();
    const persisted = await readPersistedDataSnapshotPreferPersistentCache({ storageKey: KEY });
    expect(persisted?.counters.factura).toBe(42);
    expect(h.data.counters.factura).toBeLessThan(42);
    expect(inspectPersistedData(h.data, { storageKey: KEY })).toEqual({ status: "applied" });
    expect(selectCentralBusinessEventsSyncBaseline({ memory: h.data, persisted,
      persistedMatchesMemory: inspectPersistedData(h.data, { storageKey: KEY }).status === "applied",
    })).toBe(h.data);
    expect(h.storage.getItem(KEY)).toBe(h.persistedRaw);
  });

  it("receives a confirmed tombstone once without repeating deletion or touching another company", async () => {
    const h = harness();
    readPersistedDataSnapshot(KEY);
    h.storage.setItem(OTHER_KEY, "other-company-unchanged");
    const result: CentralInvoiceAuthorityEventsPullResult = {
      ok: true, schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_CLIENT_V1", nextCursor: null,
      events: [{ schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER_V1",
        eventId: "synthetic-deleted", documentId: h.doc.centralInvoiceAuthority!.serverDocumentId,
        identityId: h.doc.centralInvoiceAuthority!.identityId, eventType: "invoice_deleted",
        createdAt: NOW, fullNumber: h.doc.number, sequence: 42, documentVersion: 2,
        emittedHash: "synthetic-tombstone", safeSummary: {},
        documentPayload: { deleted: true, localDocumentId: h.doc.id },
      }],
    };
    const pullEvents = vi.fn(async () => result);
    await expect(receiveConfirmedCentralInvoiceChange({ action: "delete", document: h.doc,
      eventId: "synthetic-deleted", isCurrent: () => true, getCurrentData: () => h.data,
      syncEvents: async (expected, options) => {
        const transition = await syncCentralInvoiceAuthorityEventsIntoAppData(
          { data: expected, eventId: options.eventId }, { pullEvents });
        return h.commit(expected, () => transition);
      },
    })).resolves.toBeNull();
    expect(pullEvents).toHaveBeenCalledOnce();
    expect(h.data.documents).toEqual([]);
    expect(readPersistedDataSnapshot(KEY)?.documents).toEqual([]);
    expect(h.storage.getItem(OTHER_KEY)).toBe("other-company-unchanged");
  });

  it("still rejects a real concurrent edit even with identical timestamps", () => {
    const h = harness();
    const concurrent: AppData = { ...h.data,
      documents: h.data.documents.map((doc): Document => ({ ...doc, notes: "Concurrent change" })),
    };
    expect(saveData(concurrent, { storageKey: KEY })).toEqual({ status: "applied" });
    readPersistedDataSnapshot(OTHER_KEY);
    const raw = h.storage.getItem(KEY);
    expect(inspectPersistedData(h.data, { storageKey: KEY })).toEqual({
      status: "blocked", reason: "stale_precondition",
    });
    expect(h.commit(h.data, (data) => ({ data: { ...data, documents: [] }, value: true })))
      .toEqual({ status: "blocked", reason: "stale_precondition" });
    expect(h.storage.getItem(KEY)).toBe(raw);
  });
});
