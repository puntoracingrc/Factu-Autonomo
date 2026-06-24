import { describe, expect, it } from "vitest";
import {
  ServerDocumentError,
  ServerDocumentRepository,
  assertExpectedVersion,
  buildDocumentConflictReason,
  canMutateServerDocument,
  detectForbiddenLifecycleDowngrade,
  detectProtectedSnapshotMutation,
  isServerDocumentLocked,
  type JsonObject,
  type ServerDocumentConflictRecord,
  type ServerDocumentRecord,
  type ServerDocumentRepositoryStore,
  type ServerDocumentVersionRecord,
} from ".";

const NOW = "2026-06-24T20:00:00.000Z";

function payload(overrides: JsonObject = {}): JsonObject {
  return {
    number: "BORRADOR",
    date: "2026-06-24",
    total: 121,
    ...overrides,
  };
}

function document(
  overrides: Partial<ServerDocumentRecord> = {},
): ServerDocumentRecord {
  return {
    id: "server-doc-1",
    userId: "user-a",
    localDocumentId: "local-doc-1",
    documentType: "factura",
    documentKind: "standard",
    documentLifecycle: "draft",
    integrityLock: "unlocked",
    statusLegacy: "borrador",
    version: 1,
    payload: payload(),
    documentSnapshot: null,
    pdfSnapshot: null,
    snapshotHash: null,
    pdfContentHash: null,
    createdAt: "2026-06-24T19:00:00.000Z",
    updatedAt: "2026-06-24T19:00:00.000Z",
    ...overrides,
  };
}

class MemoryServerDocumentStore implements ServerDocumentRepositoryStore {
  documents = new Map<string, ServerDocumentRecord>();
  versions: ServerDocumentVersionRecord[] = [];
  conflicts: ServerDocumentConflictRecord[] = [];

  constructor(initial: ServerDocumentRecord[] = []) {
    for (const entry of initial) this.documents.set(entry.id, entry);
  }

  async findDocumentById(id: string): Promise<ServerDocumentRecord | null> {
    return this.documents.get(id) ?? null;
  }

  async findDocumentByLocalId(
    userId: string,
    localDocumentId: string,
  ): Promise<ServerDocumentRecord | null> {
    return (
      [...this.documents.values()].find(
        (entry) =>
          entry.userId === userId && entry.localDocumentId === localDocumentId,
      ) ?? null
    );
  }

  async insertDocument(
    serverDocument: ServerDocumentRecord,
  ): Promise<ServerDocumentRecord> {
    this.documents.set(serverDocument.id, serverDocument);
    return serverDocument;
  }

  async updateDocument(
    serverDocument: ServerDocumentRecord,
  ): Promise<ServerDocumentRecord> {
    this.documents.set(serverDocument.id, serverDocument);
    return serverDocument;
  }

  async insertDocumentVersion(
    version: ServerDocumentVersionRecord,
  ): Promise<void> {
    this.versions.push(version);
  }

  async insertDocumentConflict(
    conflict: ServerDocumentConflictRecord,
  ): Promise<void> {
    this.conflicts.push(conflict);
  }
}

function repository(store: MemoryServerDocumentStore) {
  let next = 1;
  return new ServerDocumentRepository(store, {
    now: () => NOW,
    generateId: () => `generated-${next++}`,
  });
}

function expectServerDocumentError(
  action: () => unknown,
  code: ServerDocumentError["code"],
) {
  expect(action).toThrow(ServerDocumentError);
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(ServerDocumentError);
    expect((error as ServerDocumentError).code).toBe(code);
  }
}

describe("server document guards", () => {
  it("permite mutar draft/unlocked con expectedVersion correcto", () => {
    const current = document();

    expect(canMutateServerDocument(current, 1)).toBe(true);
    expect(buildDocumentConflictReason(current, { expectedVersion: 1 })).toBeNull();
  });

  it("rechaza draft con expectedVersion antiguo", () => {
    const current = document({ version: 2 });

    expectServerDocumentError(
      () => assertExpectedVersion(current, 1),
      "VERSION_MISMATCH",
    );
    expect(buildDocumentConflictReason(current, { expectedVersion: 1 })).toBe(
      "version_mismatch",
    );
  });

  it("rechaza update sin expectedVersion", () => {
    const current = document();

    expectServerDocumentError(
      () => assertExpectedVersion(current, undefined),
      "MISSING_EXPECTED_VERSION",
    );
    expect(buildDocumentConflictReason(current, {})).toBe(
      "missing_expected_version",
    );
  });

  it("rechaza locked", () => {
    const current = document({ integrityLock: "locked" });

    expect(isServerDocumentLocked(current)).toBe(true);
    expectServerDocumentError(
      () => canMutateServerDocument(current, 1),
      "DOCUMENT_LOCKED",
    );
  });

  it("rechaza issued aunque integrity_lock venga inconsistente", () => {
    const current = document({
      documentLifecycle: "issued",
      integrityLock: "unlocked",
    });

    expect(isServerDocumentLocked(current)).toBe(true);
    expectServerDocumentError(
      () => canMutateServerDocument(current, 1),
      "DOCUMENT_LOCKED",
    );
  });

  it("rechaza issued -> draft", () => {
    const current = document({
      documentLifecycle: "issued",
      integrityLock: "locked",
    });

    expect(
      detectForbiddenLifecycleDowngrade(current, {
        expectedVersion: 1,
        documentLifecycle: "draft",
      }),
    ).toBe(true);
    expect(
      buildDocumentConflictReason(current, {
        expectedVersion: 1,
        documentLifecycle: "draft",
      }),
    ).toBe("forbidden_lifecycle_transition");
  });

  it("rechaza canceled -> draft", () => {
    const current = document({
      documentLifecycle: "canceled",
      integrityLock: "locked",
    });

    expect(
      detectForbiddenLifecycleDowngrade(current, {
        expectedVersion: 1,
        documentLifecycle: "draft",
      }),
    ).toBe(true);
  });

  it("detecta intento de borrar document_snapshot", () => {
    const current = document({
      documentLifecycle: "issued",
      integrityLock: "locked",
      documentSnapshot: { customer: { name: "Cliente" } },
    });

    expect(
      detectProtectedSnapshotMutation(current, {
        expectedVersion: 1,
        documentSnapshot: null,
      }),
    ).toBe(true);
  });

  it("detecta intento de cambiar snapshot_hash", () => {
    const current = document({
      documentLifecycle: "issued",
      integrityLock: "locked",
      snapshotHash: "hash-original",
    });

    expect(
      detectProtectedSnapshotMutation(current, {
        expectedVersion: 1,
        snapshotHash: "hash-cambiado",
      }),
    ).toBe(true);
  });

  it("detecta intento de cambiar pdf_snapshot", () => {
    const current = document({
      documentLifecycle: "issued",
      integrityLock: "locked",
      pdfSnapshot: { template: "classic" },
    });

    expect(
      detectProtectedSnapshotMutation(current, {
        expectedVersion: 1,
        pdfSnapshot: { template: "modern" },
      }),
    ).toBe(true);
  });

  it("detecta intento de cambiar pdf_content_hash", () => {
    const current = document({
      documentLifecycle: "issued",
      integrityLock: "locked",
      pdfContentHash: "pdf-original",
    });

    expect(
      detectProtectedSnapshotMutation(current, {
        expectedVersion: 1,
        pdfContentHash: "pdf-cambiado",
      }),
    ).toBe(true);
  });
});

describe("server document repository", () => {
  it("crea borrador y version inicial", async () => {
    const store = new MemoryServerDocumentStore();
    const repo = repository(store);

    const result = await repo.createDraft("user-a", {
      localDocumentId: "local-doc-new",
      documentType: "factura",
      documentKind: "standard",
      statusLegacy: "borrador",
      payload: payload({ number: "BORRADOR" }),
    });

    expect(result.status).toBe("accepted");
    expect(store.documents.size).toBe(1);
    expect(store.versions).toHaveLength(1);
    expect(store.versions[0].changeType).toBe("create");
  });

  it("actualiza borrador con expectedVersion correcto", async () => {
    const store = new MemoryServerDocumentStore([document()]);
    const repo = repository(store);

    const result = await repo.updateDraft("user-a", "server-doc-1", {
      expectedVersion: 1,
      payload: payload({ notes: "Nueva nota" }),
    });

    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") return;
    expect(result.document.version).toBe(2);
    expect(result.document.payload.notes).toBe("Nueva nota");
    expect(store.versions.at(-1)?.changeType).toBe("update");
  });

  it("registra conflicto con expectedVersion antiguo", async () => {
    const store = new MemoryServerDocumentStore([document({ version: 2 })]);
    const repo = repository(store);

    const result = await repo.updateDraft("user-a", "server-doc-1", {
      expectedVersion: 1,
      payload: payload({ notes: "Obsoleto" }),
    });

    expect(result.status).toBe("conflict");
    if (result.status !== "conflict") return;
    expect(result.reason).toBe("version_mismatch");
    expect(store.conflicts).toHaveLength(1);
    expect(store.documents.get("server-doc-1")?.version).toBe(2);
  });

  it("rechaza update sin expectedVersion sin registrar conflicto", async () => {
    const store = new MemoryServerDocumentStore([document()]);
    const repo = repository(store);

    const result = await repo.updateDraft("user-a", "server-doc-1", {
      payload: payload({ notes: "Sin version" }),
    });

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") return;
    expect(result.reason).toBe("missing_expected_version");
    expect(store.conflicts).toHaveLength(0);
  });

  it("registra conflicto al intentar cambiar locked", async () => {
    const store = new MemoryServerDocumentStore([
      document({ integrityLock: "locked" }),
    ]);
    const repo = repository(store);

    const result = await repo.updateDraft("user-a", "server-doc-1", {
      expectedVersion: 1,
      payload: payload({ notes: "No permitido" }),
    });

    expect(result.status).toBe("conflict");
    if (result.status !== "conflict") return;
    expect(result.reason).toBe("locked_document");
    expect(store.conflicts).toHaveLength(1);
  });

  it("registra conflicto por local_document_id duplicado", async () => {
    const store = new MemoryServerDocumentStore([document()]);
    const repo = repository(store);

    const result = await repo.createDraft("user-a", {
      localDocumentId: "local-doc-1",
      documentType: "factura",
      documentKind: "standard",
      statusLegacy: "borrador",
      payload: payload({ duplicate: true }),
    });

    expect(result.status).toBe("conflict");
    if (result.status !== "conflict") return;
    expect(result.reason).toBe("duplicate_local_document_id");
    expect(store.conflicts).toHaveLength(1);
  });

  it("usuario A no accede a documento de usuario B", async () => {
    const store = new MemoryServerDocumentStore([
      document({ id: "server-doc-b", userId: "user-b" }),
    ]);
    const repo = repository(store);

    await expect(repo.readDocumentById("user-a", "server-doc-b")).rejects.toMatchObject({
      code: "FORBIDDEN_USER_SCOPE",
      reason: "forbidden_user_scope",
    });
  });

  it("errores tipados son estables", () => {
    const error = new ServerDocumentError("SNAPSHOT_MUTATION");

    expect(error.name).toBe("ServerDocumentError");
    expect(error.code).toBe("SNAPSHOT_MUTATION");
    expect(error.reason).toBe("snapshot_mutation");
    expect(error.message).toContain("snapshots");
  });
});
