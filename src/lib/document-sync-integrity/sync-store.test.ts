import { describe, expect, it } from "vitest";
import {
  createInMemoryDocumentSyncStore,
  type DocumentSyncStoreRecord,
  type DocumentSyncStoreScope,
} from "./sync-store";
import { buildDocumentSyncConflict } from "./sync-conflicts";
import { buildDocumentSyncSafeSummary } from "./sync-policy";
import type { DocumentSyncCandidate } from "./types";

const scope: DocumentSyncStoreScope = {
  userId: "SYNTHETIC_ONLY_USER_A",
  scopeId: "SYNTHETIC_ONLY_SCOPE_A",
};

function record(
  overrides: Partial<DocumentSyncStoreRecord> = {},
): DocumentSyncStoreRecord {
  return {
    documentId: "SYNTHETIC_ONLY_DOC_A",
    localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
    userId: scope.userId,
    scopeId: scope.scopeId,
    version: 1,
    payloadHash: "hash:payload-a",
    lifecycle: "draft",
    integrityLock: "unlocked",
    statusLegacy: "borrador",
    ...overrides,
  };
}

function candidate(): DocumentSyncCandidate {
  return {
    operationKind: "update_draft",
    documentId: "SYNTHETIC_ONLY_DOC_A",
    localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
    expectedVersion: 1,
    requestedResponseShape: "safe_summary",
    context: {
      userId: scope.userId,
      scopeId: scope.scopeId,
      userIdSource: "test",
    },
  };
}

describe("in-memory document sync store", () => {
  it("crea store vacio", () => {
    const store = createInMemoryDocumentSyncStore();

    expect(store.listByScope(scope)).toEqual([]);
    expect(store.getConflicts(scope)).toEqual([]);
  });

  it("carga initial records sinteticos", () => {
    const store = createInMemoryDocumentSyncStore([record()]);

    expect(store.getById("SYNTHETIC_ONLY_DOC_A", scope)).toMatchObject({
      documentId: "SYNTHETIC_ONLY_DOC_A",
    });
  });

  it("lista por scope y no cruza scope", () => {
    const other = {
      userId: "SYNTHETIC_ONLY_USER_B",
      scopeId: "SYNTHETIC_ONLY_SCOPE_B",
    };
    const store = createInMemoryDocumentSyncStore([
      record(),
      record({
        documentId: "SYNTHETIC_ONLY_DOC_B",
        localDocumentId: "SYNTHETIC_ONLY_LOCAL_B",
        userId: other.userId,
        scopeId: other.scopeId,
      }),
    ]);

    expect(store.listByScope(scope)).toHaveLength(1);
    expect(store.listByScope(other)).toHaveLength(1);
    expect(store.getById("SYNTHETIC_ONLY_DOC_B", scope)).toBeNull();
  });

  it("put draft asigna version inicial", () => {
    const store = createInMemoryDocumentSyncStore();
    const result = store.putDraft(record({ version: 0 }));

    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") throw new Error("expected accepted");
    expect(result.record.version).toBe(1);
  });

  it("update draft con expectedVersion correcto incrementa version", () => {
    const store = createInMemoryDocumentSyncStore([record()]);
    const result = store.updateDraft(
      record({ payloadHash: "hash:payload-b" }),
      1,
    );

    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") throw new Error("expected accepted");
    expect(result.record.version).toBe(2);
    expect(result.record.payloadHash).toBe("hash:payload-b");
  });

  it("update draft con expectedVersion incorrecto da conflict", () => {
    const store = createInMemoryDocumentSyncStore([record({ version: 2 })]);
    const result = store.updateDraft(record({ payloadHash: "hash:new" }), 1);

    expect(result.status).toBe("conflict");
    if (result.status !== "conflict") throw new Error("expected conflict");
    expect(result.conflict.conflictReason).toBe("expected_version_mismatch");
  });

  it("delete draft elimina con version correcta", () => {
    const store = createInMemoryDocumentSyncStore([record()]);
    const result = store.deleteDraft("SYNTHETIC_ONLY_DOC_A", 1, scope);

    expect(result.status).toBe("deleted");
    expect(store.getById("SYNTHETIC_ONLY_DOC_A", scope)).toBeNull();
  });

  it("rechaza delete protected", () => {
    const store = createInMemoryDocumentSyncStore([
      record({ lifecycle: "issued", integrityLock: "locked" }),
    ]);
    const result = store.deleteDraft("SYNTHETIC_ONLY_DOC_A", 1, scope);

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("expected rejected");
    expect(result.error.code).toBe("PROTECTED_DOCUMENT");
  });

  it("recordConflict guarda salida segura por scope", () => {
    const store = createInMemoryDocumentSyncStore();
    const safeSummary = buildDocumentSyncSafeSummary(candidate(), null, [
      "version_conflict",
    ]);
    const conflict = buildDocumentSyncConflict({
      candidate: candidate(),
      currentState: null,
      conflictReason: "document_not_found",
      safeSummary,
    });

    store.recordConflict(conflict);

    expect(store.getConflicts(scope)).toHaveLength(1);
    expect(JSON.stringify(store.getConflicts(scope))).not.toContain("fullPayload");
  });

  it("devuelve outputs clonados", () => {
    const source = record();
    const store = createInMemoryDocumentSyncStore([source]);
    const loaded = store.getById("SYNTHETIC_ONLY_DOC_A", scope);

    if (!loaded) throw new Error("expected loaded");
    loaded.payloadHash = "hash:external-mutation";

    expect(store.getById("SYNTHETIC_ONLY_DOC_A", scope)?.payloadHash).toBe(
      "hash:payload-a",
    );
  });

  it("no usa Supabase, red, filesystem ni navegador en runtime observable", () => {
    const runtime = `${createInMemoryDocumentSyncStore.toString()}`;

    expect(runtime).not.toContain(["@", "supabase"].join(""));
    expect(runtime).not.toContain(["fe", "tch"].join(""));
    expect(runtime).not.toContain("axios");
    expect(runtime).not.toContain(["node:", "fs"].join(""));
    expect(runtime).not.toContain("localStorage");
  });
});
