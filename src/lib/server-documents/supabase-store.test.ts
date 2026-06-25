import { describe, expect, it } from "vitest";
import { ServerDocumentError } from "./errors";
import {
  mapDocumentConflictToInsert,
  mapDomainConflictReasonToDbType,
  mapServerDocumentRecordToInsert,
  mapServerDocumentRecordToUpdate,
  mapServerDocumentRowToRecord,
  mapServerDocumentVersionToInsert,
  ServerDocumentStoreError,
  SupabaseServerDocumentStore,
  type SupabaseFilterBuilder,
  type SupabaseQueryResult,
  type SupabaseServerDocumentClient,
} from "./supabase-store";
import type {
  JsonObject,
  ServerDocumentConflictRecord,
  ServerDocumentRecord,
  ServerDocumentVersionRecord,
} from "./types";

const NOW = "2026-06-24T21:30:00.000Z";

interface FakeOperation {
  table: string;
  action: "select" | "insert" | "update";
  columns?: string;
  payload?: Record<string, unknown> | Record<string, unknown>[];
  filters: Array<{ column: string; value: unknown }>;
}

class FakeSupabaseBuilder implements SupabaseFilterBuilder<Record<string, unknown>> {
  constructor(
    private readonly result: SupabaseQueryResult<Record<string, unknown> | null>,
    private readonly operation: FakeOperation,
  ) {}

  eq(column: string, value: unknown): SupabaseFilterBuilder<Record<string, unknown>> {
    this.operation.filters.push({ column, value });
    return this;
  }

  select(columns?: string): SupabaseFilterBuilder<Record<string, unknown>> {
    this.operation.columns = columns;
    return this;
  }

  async maybeSingle(): Promise<SupabaseQueryResult<Record<string, unknown> | null>> {
    return this.result;
  }

  async single(): Promise<SupabaseQueryResult<Record<string, unknown>>> {
    return {
      data: this.result.data ?? {},
      error: this.result.error,
    };
  }

  then<TResult1 = SupabaseQueryResult<Record<string, unknown>[] | null>, TResult2 = never>(
    onfulfilled?:
      | ((
          value: SupabaseQueryResult<Record<string, unknown>[] | null>,
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({
      data: this.result.data ? [this.result.data] : null,
      error: this.result.error,
    }).then(onfulfilled, onrejected);
  }
}

class FakeSupabaseClient implements SupabaseServerDocumentClient {
  operations: FakeOperation[] = [];
  private results: Array<SupabaseQueryResult<Record<string, unknown> | null>> = [];

  queue(result: SupabaseQueryResult<Record<string, unknown> | null>) {
    this.results.push(result);
  }

  from(table: string): ReturnType<SupabaseServerDocumentClient["from"]> {
    const nextResult = () =>
      this.results.shift() ?? {
        data: null,
        error: null,
      };
    const makeBuilder = (
      action: FakeOperation["action"],
      payload?: Record<string, unknown> | Record<string, unknown>[],
      columns?: string,
    ) => {
      const operation: FakeOperation = {
        table,
        action,
        payload,
        columns,
        filters: [],
      };
      this.operations.push(operation);
      return new FakeSupabaseBuilder(nextResult(), operation);
    };

    return {
      select: (columns?: string) => makeBuilder("select", undefined, columns),
      insert: (row: Record<string, unknown> | Record<string, unknown>[]) =>
        makeBuilder("insert", row),
      update: (row: Record<string, unknown>) => makeBuilder("update", row),
    };
  }
}

function payload(overrides: JsonObject = {}): JsonObject {
  return {
    total: 121,
    number: "BORRADOR",
    ...overrides,
  };
}

function document(
  overrides: Partial<ServerDocumentRecord> = {},
): ServerDocumentRecord {
  return {
    id: "doc-1",
    userId: "user-1",
    localDocumentId: "local-1",
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
    issuerNif: null,
    numserie: null,
    issueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    issuedAt: null,
    canceledAt: null,
    ...overrides,
  };
}

function documentRow(
  overrides: Partial<ReturnType<typeof mapServerDocumentRecordToInsert>> = {},
): Record<string, unknown> {
  return {
    ...mapServerDocumentRecordToInsert(document()),
    ...overrides,
  };
}

function version(
  overrides: Partial<ServerDocumentVersionRecord> = {},
): ServerDocumentVersionRecord {
  return {
    id: "version-1",
    serverDocumentId: "doc-1",
    userId: "user-1",
    version: 2,
    changeType: "update",
    payloadBeforeHash: "json:before",
    payloadAfterHash: "json:after",
    changedFields: ["payload", "statusLegacy"],
    actorType: "server",
    actorId: null,
    createdAt: NOW,
    ...overrides,
  };
}

function conflict(
  overrides: Partial<ServerDocumentConflictRecord> = {},
): ServerDocumentConflictRecord {
  return {
    id: "conflict-1",
    userId: "user-1",
    serverDocumentId: "doc-1",
    localDocumentId: "local-1",
    conflictType: "version_mismatch",
    incomingPayloadHash: "json:incoming",
    serverPayloadHash: "json:server",
    resolutionStatus: "open",
    createdAt: NOW,
    resolvedAt: null,
    ...overrides,
  };
}

describe("Supabase server document store mapping", () => {
  it("mapea fila DB a dominio", () => {
    const row = documentRow({
      document_lifecycle: "issued",
      integrity_lock: "locked",
      document_snapshot: { customer: { name: "Cliente" } },
      pdf_snapshot: { renderer: "v1" },
      snapshot_hash: "snapshot-hash",
      pdf_content_hash: "pdf-hash",
      issuer_nif: "B00000000",
      numserie: "F-1",
      issue_date: "2026-06-24",
      issued_at: NOW,
    });

    expect(mapServerDocumentRowToRecord(row)).toMatchObject({
      id: "doc-1",
      userId: "user-1",
      localDocumentId: "local-1",
      documentLifecycle: "issued",
      integrityLock: "locked",
      documentSnapshot: { customer: { name: "Cliente" } },
      pdfSnapshot: { renderer: "v1" },
      snapshotHash: "snapshot-hash",
      pdfContentHash: "pdf-hash",
      issuerNif: "B00000000",
      numserie: "F-1",
      issueDate: "2026-06-24",
      issuedAt: NOW,
    });
  });

  it("mapea dominio a insert DB sin cambiar datos sensibles", () => {
    const record = document({
      payload: payload({ private: "server-only" }),
      documentSnapshot: { frozen: true },
      pdfSnapshot: { rendered: true },
      snapshotHash: "snapshot-hash",
      pdfContentHash: "pdf-hash",
    });

    expect(mapServerDocumentRecordToInsert(record)).toMatchObject({
      user_id: "user-1",
      local_document_id: "local-1",
      document_type: "factura",
      document_lifecycle: "draft",
      integrity_lock: "unlocked",
      payload: { total: 121, number: "BORRADOR", private: "server-only" },
      document_snapshot: { frozen: true },
      pdf_snapshot: { rendered: true },
      snapshot_hash: "snapshot-hash",
      pdf_content_hash: "pdf-hash",
    });
  });

  it("mapea update sin id ni user_id para que el scope vaya en filtros", () => {
    const update = mapServerDocumentRecordToUpdate(document({ version: 2 }));

    expect(update).not.toHaveProperty("id");
    expect(update).not.toHaveProperty("user_id");
    expect(update).toMatchObject({
      version: 2,
      updated_at: NOW,
    });
  });

  it("mapea versiones con hashes y changedFields", () => {
    expect(mapServerDocumentVersionToInsert(version())).toMatchObject({
      id: "version-1",
      server_document_id: "doc-1",
      user_id: "user-1",
      version: 2,
      change_type: "update",
      payload_before_hash: "json:before",
      payload_after_hash: "json:after",
      changed_fields: ["payload", "statusLegacy"],
      actor_type: "server",
      actor_id: null,
    });
  });

  it("mapea razones de conflicto de dominio a enum DB 2B.2", () => {
    expect(mapDomainConflictReasonToDbType("missing_expected_version")).toBe(
      "version",
    );
    expect(mapDomainConflictReasonToDbType("version_mismatch")).toBe("version");
    expect(mapDomainConflictReasonToDbType("locked_document")).toBe(
      "integrity_lock",
    );
    expect(
      mapDomainConflictReasonToDbType("forbidden_lifecycle_transition"),
    ).toBe("integrity_lock");
    expect(mapDomainConflictReasonToDbType("snapshot_mutation")).toBe(
      "snapshot",
    );
    expect(mapDomainConflictReasonToDbType("duplicate_local_document_id")).toBe(
      "payload",
    );
    expect(mapDomainConflictReasonToDbType("forbidden_user_scope")).toBe(
      "unknown",
    );
  });

  it("mapea conflicto a insert DB estable", () => {
    expect(mapDocumentConflictToInsert(conflict())).toMatchObject({
      id: "conflict-1",
      user_id: "user-1",
      server_document_id: "doc-1",
      local_document_id: "local-1",
      conflict_type: "version",
      incoming_payload_hash: "json:incoming",
      server_payload_hash: "json:server",
      resolution_status: "open",
      resolved_at: null,
    });
  });
});

describe("SupabaseServerDocumentStore", () => {
  it("findDocumentById consulta por id y deja el scope final al repositorio", async () => {
    const client = new FakeSupabaseClient();
    client.queue({ data: documentRow(), error: null });
    const store = new SupabaseServerDocumentStore(client);

    const found = await store.findDocumentById("doc-1");

    expect(found?.id).toBe("doc-1");
    expect(client.operations).toMatchObject([
      {
        table: "server_documents",
        action: "select",
        filters: [{ column: "id", value: "doc-1" }],
      },
    ]);
  });

  it("findDocumentByLocalId siempre filtra por userId + localDocumentId", async () => {
    const client = new FakeSupabaseClient();
    client.queue({ data: documentRow(), error: null });
    const store = new SupabaseServerDocumentStore(client);

    await store.findDocumentByLocalId("user-1", "local-1");

    expect(client.operations[0]).toMatchObject({
      table: "server_documents",
      action: "select",
      filters: [
        { column: "user_id", value: "user-1" },
        { column: "local_document_id", value: "local-1" },
      ],
    });
  });

  it("insertDocument persiste borrador con lifecycle draft, lock unlocked y version 1", async () => {
    const client = new FakeSupabaseClient();
    client.queue({ data: documentRow(), error: null });
    const store = new SupabaseServerDocumentStore(client);

    await store.insertDocument(document());

    expect(client.operations[0]).toMatchObject({
      table: "server_documents",
      action: "insert",
    });
    expect(client.operations[0].payload).toMatchObject({
      document_lifecycle: "draft",
      integrity_lock: "unlocked",
      version: 1,
    });
  });

  it("updateDocument limita la mutación a id + user_id + version esperada", async () => {
    const client = new FakeSupabaseClient();
    client.queue({ data: documentRow({ version: 2 }), error: null });
    const store = new SupabaseServerDocumentStore(client);

    await store.updateDocument(document({ version: 2 }), 1);

    expect(client.operations[0]).toMatchObject({
      table: "server_documents",
      action: "update",
      filters: [
        { column: "id", value: "doc-1" },
        { column: "user_id", value: "user-1" },
        { column: "version", value: 1 },
      ],
    });
    expect(client.operations[0].payload).not.toHaveProperty("user_id");
  });

  it("insertDocumentVersion usa server_document_versions y conserva hashes", async () => {
    const client = new FakeSupabaseClient();
    client.queue({ data: null, error: null });
    const store = new SupabaseServerDocumentStore(client);

    await store.insertDocumentVersion(version());

    expect(client.operations[0]).toMatchObject({
      table: "server_document_versions",
      action: "insert",
    });
    expect(client.operations[0].payload).toMatchObject({
      payload_before_hash: "json:before",
      payload_after_hash: "json:after",
      changed_fields: ["payload", "statusLegacy"],
    });
  });

  it("insertDocumentConflict registra reason DB estable", async () => {
    const client = new FakeSupabaseClient();
    client.queue({ data: null, error: null });
    const store = new SupabaseServerDocumentStore(client);

    await store.insertDocumentConflict(
      conflict({ conflictType: "locked_document" }),
    );

    expect(client.operations[0]).toMatchObject({
      table: "document_conflicts",
      action: "insert",
    });
    expect(client.operations[0].payload).toMatchObject({
      conflict_type: "integrity_lock",
    });
  });

  it("traduce errores DB a error tipado del store", async () => {
    const client = new FakeSupabaseClient();
    client.queue({
      data: null,
      error: { code: "23505", message: "duplicate key" },
    });
    const store = new SupabaseServerDocumentStore(client);

    await expect(store.insertDocument(document())).rejects.toMatchObject({
      name: "ServerDocumentStoreError",
      operation: "insert_document",
      causeCode: "23505",
    } satisfies Partial<ServerDocumentStoreError>);
  });

  it("traduce update sin fila a VERSION_MISMATCH para carreras concurrentes", async () => {
    const client = new FakeSupabaseClient();
    client.queue({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });
    const store = new SupabaseServerDocumentStore(client);

    await expect(store.updateDocument(document(), 1)).rejects.toMatchObject({
      name: "ServerDocumentError",
      code: "VERSION_MISMATCH",
    } satisfies Partial<ServerDocumentError>);
  });
});
