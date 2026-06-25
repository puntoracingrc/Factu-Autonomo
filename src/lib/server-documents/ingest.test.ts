import { describe, expect, it } from "vitest";
import { ServerDocumentRepository } from "./repository";
import { ServerDocumentStoreError } from "./supabase-store";
import { ingestServerDocument, type ServerDocumentIngestRepository } from "./ingest";
import type {
  JsonObject,
  ServerDocumentConflictRecord,
  ServerDocumentMutationDecision,
  ServerDocumentRecord,
  ServerDocumentRepositoryStore,
  ServerDocumentVersionRecord,
} from "./index";

const NOW = "2026-06-24T22:30:00.000Z";

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
    createdAt: NOW,
    updatedAt: NOW,
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
    expectedVersion: number,
  ): Promise<ServerDocumentRecord> {
    void expectedVersion;
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

function createBody(overrides: Record<string, unknown> = {}) {
  return {
    action: "createDraft",
    localDocumentId: "local-doc-1",
    documentType: "factura",
    documentKind: "standard",
    statusLegacy: "borrador",
    payload: payload(),
    ...overrides,
  };
}

function updateBody(overrides: Record<string, unknown> = {}) {
  return {
    action: "updateDraft",
    serverDocumentId: "server-doc-1",
    expectedVersion: 1,
    payload: payload({ total: 242 }),
    ...overrides,
  };
}

function expectNoSensitiveFields(result: unknown) {
  const serialized = JSON.stringify(result);

  expect(serialized).not.toContain("payload");
  expect(serialized).not.toContain("documentSnapshot");
  expect(serialized).not.toContain("pdfSnapshot");
  expect(serialized).not.toContain("document_snapshot");
  expect(serialized).not.toContain("pdf_snapshot");
  expect(serialized).not.toContain("xml_payload");
}

describe("ingestServerDocument", () => {
  it("crea un borrador valido como accepted", async () => {
    const store = new MemoryServerDocumentStore();
    const result = await ingestServerDocument(
      repository(store),
      { authenticatedUserId: "user-a" },
      createBody(),
    );

    expect(result).toMatchObject({
      status: "accepted",
      serverDocumentId: "generated-1",
      localDocumentId: "local-doc-1",
      version: 1,
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      versionId: "generated-2",
    });
    expect(store.documents.get("generated-1")?.userId).toBe("user-a");
    expectNoSensitiveFields(result);
  });

  it("ignora user_id ajeno recibido en body", async () => {
    const store = new MemoryServerDocumentStore();
    const result = await ingestServerDocument(
      repository(store),
      { authenticatedUserId: "user-a" },
      createBody({ user_id: "user-b", userId: "user-b" }),
    );

    expect(result.status).toBe("accepted");
    expect([...store.documents.values()][0]?.userId).toBe("user-a");
  });

  it("actualiza un borrador con expectedVersion correcto", async () => {
    const store = new MemoryServerDocumentStore([document()]);
    const result = await ingestServerDocument(
      repository(store),
      { authenticatedUserId: "user-a" },
      updateBody(),
    );

    expect(result).toMatchObject({
      status: "accepted",
      serverDocumentId: "server-doc-1",
      localDocumentId: "local-doc-1",
      version: 2,
      versionId: "generated-1",
    });
    expect(store.documents.get("server-doc-1")?.payload.total).toBe(242);
    expectNoSensitiveFields(result);
  });

  it("rechaza update sin expectedVersion", async () => {
    const store = new MemoryServerDocumentStore([document()]);
    const result = await ingestServerDocument(
      repository(store),
      { authenticatedUserId: "user-a" },
      updateBody({ expectedVersion: undefined }),
    );

    expect(result).toMatchObject({
      status: "rejected",
      reason: "missing_expected_version",
    });
  });

  it("devuelve conflicto con expectedVersion antiguo", async () => {
    const store = new MemoryServerDocumentStore([document({ version: 2 })]);
    const result = await ingestServerDocument(
      repository(store),
      { authenticatedUserId: "user-a" },
      updateBody({ expectedVersion: 1 }),
    );

    expect(result).toMatchObject({
      status: "conflict",
      reason: "version_mismatch",
      conflictId: "generated-1",
      serverDocumentId: "server-doc-1",
      localDocumentId: "local-doc-1",
    });
    expect(store.conflicts).toHaveLength(1);
    expectNoSensitiveFields(result);
  });

  it("usuario A no modifica documento de B", async () => {
    const store = new MemoryServerDocumentStore([
      document({ id: "doc-b", userId: "user-b" }),
    ]);
    const result = await ingestServerDocument(
      repository(store),
      { authenticatedUserId: "user-a" },
      updateBody({ serverDocumentId: "doc-b" }),
    );

    expect(result).toMatchObject({
      status: "rejected",
      reason: "forbidden_user_scope",
    });
    expect(store.documents.get("doc-b")?.version).toBe(1);
  });

  it("rechaza intento sobre locked mediante repository", async () => {
    const store = new MemoryServerDocumentStore([
      document({ integrityLock: "locked" }),
    ]);
    const result = await ingestServerDocument(
      repository(store),
      { authenticatedUserId: "user-a" },
      updateBody(),
    );

    expect(result).toMatchObject({
      status: "conflict",
      reason: "locked_document",
    });
    expect(store.documents.get("server-doc-1")?.version).toBe(1);
  });

  it("rechaza intento sobre issued mediante repository", async () => {
    const store = new MemoryServerDocumentStore([
      document({ documentLifecycle: "issued", integrityLock: "locked" }),
    ]);
    const result = await ingestServerDocument(
      repository(store),
      { authenticatedUserId: "user-a" },
      updateBody(),
    );

    expect(result).toMatchObject({
      status: "conflict",
      reason: "locked_document",
    });
  });

  it("rechaza intento sobre canceled mediante repository", async () => {
    const store = new MemoryServerDocumentStore([
      document({
        documentLifecycle: "canceled",
        integrityLock: "locked",
        canceledAt: NOW,
      }),
    ]);
    const result = await ingestServerDocument(
      repository(store),
      { authenticatedUserId: "user-a" },
      updateBody(),
    );

    expect(result).toMatchObject({
      status: "conflict",
      reason: "locked_document",
    });
  });

  it("rechaza campos protegidos en request de update", async () => {
    const store = new MemoryServerDocumentStore([document()]);
    const result = await ingestServerDocument(
      repository(store),
      { authenticatedUserId: "user-a" },
      updateBody({ documentSnapshot: { customer: "mal" } }),
    );

    expect(result).toMatchObject({
      status: "rejected",
      reason: "invalid_request",
    });
  });

  it("devuelve unauthorized sin autenticacion", async () => {
    const store = new MemoryServerDocumentStore();
    const result = await ingestServerDocument(
      repository(store),
      { authenticatedUserId: null },
      createBody(),
    );

    expect(result).toMatchObject({
      status: "rejected",
      reason: "unauthorized",
    });
    expect(store.documents.size).toBe(0);
  });

  it("valida input invalido", async () => {
    const store = new MemoryServerDocumentStore();
    const result = await ingestServerDocument(
      repository(store),
      { authenticatedUserId: "user-a" },
      createBody({ payload: "no-json-object" }),
    );

    expect(result).toMatchObject({
      status: "rejected",
      reason: "invalid_request",
    });
  });

  it("convierte error de store en respuesta segura", async () => {
    const throwingRepository: ServerDocumentIngestRepository = {
      async createDraft(): Promise<ServerDocumentMutationDecision> {
        throw new ServerDocumentStoreError("insert_document", {
          code: "SECRET_DB_CODE",
          message: "detalle interno secreto",
        });
      },
      async updateDraft(): Promise<ServerDocumentMutationDecision> {
        throw new Error("unused");
      },
    };

    const result = await ingestServerDocument(
      throwingRepository,
      { authenticatedUserId: "user-a" },
      createBody(),
    );

    expect(result).toMatchObject({
      status: "rejected",
      reason: "store_error",
      message: "No se pudo procesar el ingest documental de forma segura.",
    });
    expect(JSON.stringify(result)).not.toContain("SECRET_DB_CODE");
    expect(JSON.stringify(result)).not.toContain("detalle interno secreto");
  });
});
