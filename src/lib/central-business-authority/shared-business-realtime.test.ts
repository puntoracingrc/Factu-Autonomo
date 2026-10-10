import { describe, expect, it, vi } from "vitest";
import { EMPTY_DATA, type AppData, type Document } from "@/lib/types";
import { issueDocument } from "@/lib/document-integrity";
import {
  sharedTransitionMutations,
  commitSharedTransition,
} from "./shared-transition-mutation";
import {
  deleteSharedDocumentDraft,
  isSharedDocumentDraft,
  saveSharedDocumentDraft,
  sharedDraftServerPayload,
} from "./shared-document-drafts";
import {
  editSharedQuote,
  editSharedSupplier,
  deleteSharedSupplier,
  deleteSharedQuote,
  markSharedDocumentSent,
  mergeSharedCustomers,
  mergeSharedSuppliers,
} from "./shared-business-transitions";
import { buildCentralBusinessEventAppDataTransition } from "./events-app-data-sync";
import { parseCentralDocumentDraftPayload } from "./payload-parsers";
import type { CentralBusinessBrowserEvent } from "./events-client";
import {
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueueStorage,
} from "./durable-queue";
import type { CentralBusinessAuthorityStatusResult } from "./status-client";

const now = "2026-10-10T10:00:00.000Z";
const owner = "00000000-0000-4000-8000-000000000001";
const hash = "a".repeat(64);
function draft(extra: Partial<Document> = {}): Document {
  return {
    id: "draft",
    type: "factura",
    number: "BORRADOR",
    status: "borrador",
    date: "2026-10-10",
    client: { name: "Cliente" },
    items: [
      {
        id: "line",
        description: "Trabajo",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}
function data(documents: Document[] = []): AppData {
  return structuredClone({ ...EMPTY_DATA, documents });
}
function event(
  doc: Document,
  version = 1,
  operationKind: "upsert" | "delete" = "upsert",
): CentralBusinessBrowserEvent {
  return {
    schema: "CENTRAL_BUSINESS_EVENTS_RPC_ADAPTER_V1",
    eventId: `event-${version}`,
    eventSequence: version,
    entityType: "document_draft",
    entityId: doc.id,
    entityVersion: version,
    operationKind,
    payload:
      operationKind === "delete"
        ? null
        : JSON.parse(JSON.stringify(sharedDraftServerPayload(doc))),
    contentHash: hash,
    actorDeviceId: "other",
    createdAt: now,
  };
}
function apply(
  seed: AppData,
  ev: CentralBusinessBrowserEvent,
  knownVersion?: number,
) {
  return buildCentralBusinessEventAppDataTransition({
    data: seed,
    event: ev,
    knownVersion: knownVersion
      ? {
          entityType: ev.entityType,
          entityId: ev.entityId,
          version: knownVersion,
          deleted: false,
          contentHash: hash,
        }
      : undefined,
  });
}

describe("shared saved drafts", () => {
  it.each(["factura", "recibo"] as const)(
    "shares saved %s drafts without numbering/accounting",
    (type) => {
      const saved = saveSharedDocumentDraft(
        data(),
        draft({ type }),
        undefined,
        now,
      );
      const mutations = sharedTransitionMutations(data(), saved.data);
      expect(mutations).toHaveLength(1);
      expect(mutations[0].entityType).toBe("document_draft");
      expect(saved.data.counters).toEqual(EMPTY_DATA.counters);
      const remote = apply(data(), event(saved.value)).data.documents[0];
      expect(remote.number).toBe("BORRADOR");
      expect(remote.centralBusinessDraftVersion).toBe(1);
      expect(remote.documentSnapshot).toBeUndefined();
    },
  );
  it("keeps unsaved screen content private", () => {
    expect(sharedTransitionMutations(data(), data())).toEqual([]);
    expect(isSharedDocumentDraft(draft())).toBe(true);
  });
  it("rejects stale editors and type changes", () => {
    expect(() =>
      saveSharedDocumentDraft(
        data([draft({ notes: "socio" })]),
        draft({ notes: "yo" }),
        draft(),
        now,
      ),
    ).toThrow(/cambió/);
    expect(() =>
      saveSharedDocumentDraft(
        data([draft()]),
        draft({ type: "recibo" }),
        draft(),
        now,
      ),
    ).toThrow();
  });
  it.each([
    "issuer",
    "documentSnapshot",
    "pdfSnapshot",
    "snapshotSeal",
    "verifactu",
    "centralInvoiceAuthority",
    "legacyImportAttestation",
    "snapshotIntegrityRequired",
    "integrityQuarantine",
    "centralBusinessReceiptAuthority",
  ])("rejects fiscal evidence %s", (key) => {
    const bad = { ...draft(), [key]: {} } as Document;
    expect(isSharedDocumentDraft(bad)).toBe(false);
    expect(parseCentralDocumentDraftPayload(bad, bad.id)).toBeNull();
    expect(() =>
      saveSharedDocumentDraft(data(), bad, undefined, now),
    ).toThrow();
  });
  it("only deletes draft projection, never counters or another invoice", () => {
    const other = draft({ id: "other" });
    const result = deleteSharedDocumentDraft(data([draft(), other]), "draft");
    expect(result.data.documents).toEqual([other]);
    expect(result.data.counters).toEqual(EMPTY_DATA.counters);
  });
  it("replays own confirmation and attaches actual version without putting it in payload", () => {
    const own = draft();
    const received = apply(data([own]), event(own), 1).data.documents[0];
    expect(received.centralBusinessDraftVersion).toBe(1);
    expect(
      sharedDraftServerPayload(received).centralBusinessDraftVersion,
    ).toBeUndefined();
  });
  it("never removes or downgrades issued documents on delayed draft events", () => {
    const issued = issueDocument(
      draft({ number: "F-2026-1" }),
      EMPTY_DATA.profile,
      now,
    );
    for (const ev of [event(draft()), event(draft(), 2, "delete")])
      expect(apply(data([issued]), ev, 1).data.documents).toEqual([issued]);
  });
  it("rejects divergent first versions and accepts ordered updates", () => {
    expect(() =>
      apply(data([draft()]), event(draft({ notes: "otro" }))),
    ).toThrow();
    expect(
      apply(data([draft()]), event(draft({ notes: "otro" }), 2), 1).data
        .documents[0].notes,
    ).toBe("otro");
  });
});

describe("shared operational transitions", () => {
  it("edits/deletes quotes without renumbering neighbors", () => {
    const quote = draft({ type: "presupuesto", number: "P-2026-1" });
    const seed = data([quote, draft({ id: "other" })]);
    const changed = editSharedQuote(
      seed,
      { ...quote, notes: "Revisado", number: "forged" },
      now,
    );
    expect(changed.value.number).toBe(quote.number);
    expect(sharedTransitionMutations(seed, changed.data)[0].entityType).toBe(
      "quote",
    );
    expect(deleteSharedQuote(seed, quote.id).data.documents).toEqual([
      seed.documents[1],
    ]);
  });
  it.each(["aceptado", "rechazado"] as const)(
    "delivery preserves quote state %s",
    (status) => {
      const quote = draft({ type: "presupuesto", status });
      const sent = markSharedDocumentSent(data([quote]), quote.id, now).value;
      expect(sent.status).toBe(status);
      expect(sent.deliveryStatus).toBe("sent");
    },
  );
  it("customer merges preserve sealed historical client and remap operational IDs", () => {
    const customers = [
      {
        id: "keep",
        firstName: "Cliente",
        lastName: "",
        name: "Cliente",
        nif: "B12345678",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "remove",
        firstName: "Cliente",
        lastName: "",
        name: "Cliente",
        nif: "B-12345678",
        createdAt: now,
        updatedAt: now,
      },
    ];
    const issued = issueDocument(
      draft({ customerId: "remove", number: "F-2026-1" }),
      EMPTY_DATA.profile,
      now,
    );
    const seed = { ...data([issued]), customers };
    const result = mergeSharedCustomers(
      seed,
      "keep",
      ["remove"],
      undefined,
      now,
    );
    expect(result.data.documents[0].customerId).toBe("keep");
    for (const key of [
      "client",
      "documentSnapshot",
      "pdfSnapshot",
      "snapshotSeal",
    ] as const)
      expect(result.data.documents[0][key]).toEqual(issued[key]);
    expect(
      sharedTransitionMutations(seed, result.data).map((m) => m.entityType),
    ).toEqual(["customer", "customer"]);
  });
  it("rejects merging different NIFs", () => {
    const seed: AppData = {
      ...data(),
      customers: [
        {
          id: "a",
          firstName: "Uno",
          lastName: "",
          name: "Uno",
          nif: "A1",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "b",
          firstName: "Uno",
          lastName: "",
          name: "Uno",
          nif: "B2",
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
    expect(() =>
      mergeSharedCustomers(seed, "a", ["b"], undefined, now),
    ).toThrow(/NIF/);
  });
  it("supplier merge batches every dependent expense without changing amounts", () => {
    const seed: AppData = {
      ...data(),
      suppliers: [
        { id: "a", name: "Proveedor", createdAt: now },
        { id: "b", name: "Proveedor duplicado", createdAt: now },
      ],
      expenses: [
        {
          id: "e",
          supplierId: "b",
          supplierName: "Proveedor duplicado",
          amount: 121,
          ivaPercent: 21,
          date: "2026-10-10",
          category: "Compras",
          description: "Compra",
          paymentMethod: "Tarjeta",
          createdAt: now,
        },
      ],
      products: [
        {
          id: "p",
          key: "p",
          name: "Material",
          family: "Materiales",
          source: "manual",
          cost: 10,
          purchase: {
            supplierId: "b",
            supplierName: "Proveedor duplicado",
            netUnitCost: 10,
          },
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
    const result = mergeSharedSuppliers(seed, "a", ["b"], now);
    expect(result.data.expenses[0].supplierId).toBe("a");
    expect(result.data.expenses[0].amount).toBe(121);
    expect(result.data.products[0].purchase?.supplierId).toBe("a");
    expect(
      sharedTransitionMutations(seed, result.data).map((m) => m.entityType),
    ).toEqual(["supplier", "product", "expense"]);
    const edited = editSharedSupplier(
      result.data,
      { ...result.data.suppliers[0], name: "Proveedor actualizado" },
      now,
    );
    expect(edited.data.expenses[0].supplierName).toBe("Proveedor actualizado");
    expect(edited.data.products[0].purchase?.supplierName).toBe(
      "Proveedor actualizado",
    );
    expect(
      sharedTransitionMutations(result.data, edited.data).map(
        (m) => m.entityType,
      ),
    ).toEqual(["supplier", "product", "expense"]);
    const deleted = deleteSharedSupplier(edited.data, "a");
    expect(deleted.data.expenses[0].supplierId).toBeUndefined();
    expect(deleted.data.products[0].purchase?.supplierId).toBeUndefined();
    expect(deleted.data.expenses[0].amount).toBe(121);
    expect(deleted.data.products[0].purchase?.netUnitCost).toBe(10);
    expect(
      sharedTransitionMutations(edited.data, deleted.data).map(
        (m) => m.entityType,
      ),
    ).toEqual(["supplier", "product", "expense"]);
  });
});

class MemoryStorage implements CentralBusinessQueueStorage {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
describe("server-first shared command boundary", () => {
  function harness() {
    const storage = new MemoryStorage();
    let state = data();
    const commit = vi.fn(
      async (
        expected: AppData,
        transition: { data: AppData; value: Document },
      ) => {
        expect(expected).toBe(state);
        state = transition.data;
        return {
          status: "applied" as const,
          data: state,
          value: transition.value,
          replayed: false,
        };
      },
    );
    return {
      storage,
      commit,
      getCurrentData: () => state,
      prepare: (current: AppData) =>
        saveSharedDocumentDraft(current, draft(), undefined, now),
      sync: async () => ({
        ok: true as const,
        schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1" as const,
        pulled: 0,
        applied: 0,
        skipped: 0,
        nextSequence: 0,
        hasMore: false,
      }),
      fetchStatus: async () =>
        ({
          ok: true,
          summary: { writesPossible: true },
        }) as CentralBusinessAuthorityStatusResult,
      isCurrent: () => true,
      now: () => now,
      createId: () => "synthetic-create-draft",
    };
  }
  it("does not commit when offline or company changes", async () => {
    for (const change of [
      {
        fetchStatus: async () =>
          ({ ok: false }) as CentralBusinessAuthorityStatusResult,
      },
      { isCurrent: () => false },
    ]) {
      const h = harness();
      const result = await commitSharedTransition(owner, { ...h, ...change });
      expect(result.ok).toBe(false);
      expect(h.commit).not.toHaveBeenCalled();
    }
  });
  it("keeps ambiguous network failure pending, without a local business save", async () => {
    const h = harness();
    const result = await commitSharedTransition(owner, {
      ...h,
      mutateBatch: async () => ({
        ok: false,
        status: 0,
        code: "NETWORK_ERROR",
        message: "offline",
        retryable: true,
        conflict: false,
      }),
    });
    expect(result.ok).toBe(false);
    expect(h.commit).not.toHaveBeenCalled();
    expect(
      loadCentralBusinessDurableQueue(owner, h.storage).operations,
    ).toHaveLength(1);
  });
  it("commits only after confirmation, never advances the event cursor", async () => {
    const h = harness();
    const result = await commitSharedTransition(owner, {
      ...h,
      mutateBatch: async () => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_BATCH_MUTATION_CLIENT_V1",
        operations: [
          {
            operationIndex: 0,
            status: "committed",
            eventId: "event-1",
            eventSequence: 10,
            entityVersion: 1,
            deleted: false,
            contentHash: hash,
          },
        ],
      }),
    });
    expect(result.ok).toBe(true);
    expect(h.commit).toHaveBeenCalledOnce();
    expect(
      loadCentralBusinessDurableQueue(owner, h.storage)
        .lastAppliedEventSequence,
    ).toBe(0);
  });
});
