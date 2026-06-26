import { describe, expect, it } from "vitest";
import { buildDocumentSyncConflict } from "./sync-conflicts";
import { buildDocumentSyncSafeSummary } from "./sync-policy";
import {
  createSupabaseDocumentSyncStore,
  DocumentSyncSupabaseStoreError,
} from "./supabase-store";
import type {
  DocumentSyncSupabaseClientLike,
  DocumentSyncSupabaseErrorLike,
  DocumentSyncSupabaseFilterBuilder,
  DocumentSyncSupabaseQueryResult,
} from "./supabase-contract";
import { DocumentSyncSupabaseSafetyError } from "./supabase-contract";
import type { DocumentSyncStoreRecord, DocumentSyncStoreScope } from "./sync-store";
import type { DocumentSyncCandidate } from "./types";

const NOW = "2026-06-26T20:10:00.000Z";
const scope: DocumentSyncStoreScope = {
  userId: "SYNTHETIC_ONLY_USER_A",
  scopeId: "SYNTHETIC_ONLY_SCOPE_A",
};

interface FakeOperation {
  table: string;
  action: "select" | "insert" | "update" | "delete";
  columns?: string;
  payload?: Record<string, unknown> | Record<string, unknown>[];
  filters: Array<{ column: string; value: unknown }>;
}

class FakeSupabaseBuilder
  implements DocumentSyncSupabaseFilterBuilder<Record<string, unknown>>
{
  constructor(
    private readonly execute: (
      operation: FakeOperation,
      mode: "list" | "single",
    ) => DocumentSyncSupabaseQueryResult<
      Record<string, unknown>[] | Record<string, unknown> | null
    >,
    private readonly operation: FakeOperation,
  ) {}

  eq(column: string, value: unknown) {
    this.operation.filters.push({ column, value });
    return this;
  }

  limit() {
    return this;
  }

  order() {
    return this;
  }

  select(columns?: string) {
    this.operation.columns = columns;
    return this;
  }

  async maybeSingle() {
    const result = this.execute(this.operation, "single");
    return {
      data: Array.isArray(result.data) ? result.data[0] ?? null : result.data,
      error: result.error,
    } as DocumentSyncSupabaseQueryResult<Record<string, unknown> | null>;
  }

  async single() {
    const result = await this.maybeSingle();
    return {
      data: result.data ?? {},
      error: result.error,
    };
  }

  then<TResult1 = DocumentSyncSupabaseQueryResult<Record<string, unknown>[] | null>, TResult2 = never>(
    onfulfilled?:
      | ((
          value: DocumentSyncSupabaseQueryResult<
            Record<string, unknown>[] | null
          >,
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const result = this.execute(this.operation, "list");
    return Promise.resolve({
      data: Array.isArray(result.data) ? result.data : result.data ? [result.data] : [],
      error: result.error,
    }).then(onfulfilled, onrejected);
  }
}

class FakeSupabaseClient implements DocumentSyncSupabaseClientLike {
  operations: FakeOperation[] = [];
  tables = new Map<string, Record<string, unknown>[]>();
  private failures: Array<{
    action: FakeOperation["action"];
    error: DocumentSyncSupabaseErrorLike;
  }> = [];

  constructor(initial: Record<string, Record<string, unknown>[]> = {}) {
    for (const [table, rows] of Object.entries(initial)) {
      this.tables.set(table, rows.map((row) => ({ ...row })));
    }
  }

  failNext(
    action: FakeOperation["action"],
    error: DocumentSyncSupabaseErrorLike,
  ) {
    this.failures.push({ action, error });
  }

  from(table: string) {
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
      return new FakeSupabaseBuilder(
        (nextOperation, mode) => this.execute(nextOperation, mode),
        operation,
      );
    };

    return {
      select: (columns?: string) => makeBuilder("select", undefined, columns),
      insert: (payload: Record<string, unknown> | Record<string, unknown>[]) =>
        makeBuilder("insert", payload),
      update: (payload: Record<string, unknown>) => makeBuilder("update", payload),
      delete: () => makeBuilder("delete"),
    };
  }

  private execute(
    operation: FakeOperation,
    mode: "list" | "single",
  ): DocumentSyncSupabaseQueryResult<
    Record<string, unknown>[] | Record<string, unknown> | null
  > {
    const failureIndex = this.failures.findIndex(
      (entry) => entry.action === operation.action,
    );
    if (failureIndex >= 0) {
      const [failure] = this.failures.splice(failureIndex, 1);
      return { data: null, error: failure.error };
    }

    const rows = this.tables.get(operation.table) ?? [];
    const matches = () =>
      rows.filter((row) =>
        operation.filters.every((filter) => row[filter.column] === filter.value),
      );

    if (operation.action === "select") {
      const result = matches();
      return { data: mode === "single" ? result[0] ?? null : result, error: null };
    }

    if (operation.action === "insert") {
      const payloads = Array.isArray(operation.payload)
        ? operation.payload
        : [operation.payload ?? {}];
      rows.push(...payloads.map((payload) => ({ ...payload })));
      this.tables.set(operation.table, rows);
      return {
        data: mode === "single" ? payloads[0] ?? null : payloads,
        error: null,
      };
    }

    if (operation.action === "update") {
      const found = matches();
      for (const row of found) Object.assign(row, operation.payload);
      return { data: mode === "single" ? found[0] ?? null : found, error: null };
    }

    const found = matches();
    this.tables.set(
      operation.table,
      rows.filter((row) => !found.includes(row)),
    );
    return { data: mode === "single" ? found[0] ?? null : found, error: null };
  }
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "SYNTHETIC_ONLY_DOC_A",
    user_id: scope.userId,
    scope_id: scope.scopeId,
    local_document_id: "SYNTHETIC_ONLY_LOCAL_A",
    version: 1,
    document_lifecycle: "draft",
    integrity_lock: "unlocked",
    status_legacy: "borrador",
    payload_hash: "hash:payload",
    snapshot_hash: null,
    pdf_content_hash: null,
    numserie: null,
    document_series: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function record(overrides: Partial<DocumentSyncStoreRecord> = {}) {
  return {
    documentId: "SYNTHETIC_ONLY_DOC_A",
    localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
    userId: scope.userId,
    scopeId: scope.scopeId,
    version: 1,
    payloadHash: "hash:payload",
    lifecycle: "draft" as const,
    integrityLock: "unlocked" as const,
    statusLegacy: "borrador",
    ...overrides,
  };
}

function createStore(client: FakeSupabaseClient) {
  return createSupabaseDocumentSyncStore(client, {
    serverScope: scope,
    now: () => NOW,
    idFactory: (prefix) => `SYNTHETIC_ONLY_${prefix}`,
  });
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

describe("Supabase injected document sync store", () => {
  it("getById filtra por scope", async () => {
    const client = new FakeSupabaseClient({
      server_documents: [row(), row({ id: "SYNTHETIC_ONLY_DOC_B", user_id: "OTHER" })],
    });
    const store = createStore(client);

    const found = await store.getById("SYNTHETIC_ONLY_DOC_A", scope);

    expect(found?.documentId).toBe("SYNTHETIC_ONLY_DOC_A");
    expect(client.operations[0]).toMatchObject({
      table: "server_documents",
      action: "select",
      filters: [
        { column: "id", value: "SYNTHETIC_ONLY_DOC_A" },
        { column: "user_id", value: scope.userId },
        { column: "scope_id", value: scope.scopeId },
      ],
    });
    expect(client.operations[0].columns).not.toContain("*");
  });

  it("listByScope filtra por scope", async () => {
    const client = new FakeSupabaseClient({
      server_documents: [row(), row({ id: "SYNTHETIC_ONLY_DOC_B", scope_id: "OTHER" })],
    });
    const store = createStore(client);

    const list = await store.listByScope(scope);

    expect(list).toHaveLength(1);
    expect(list[0]?.documentId).toBe("SYNTHETIC_ONLY_DOC_A");
  });

  it("update usa expectedVersion y crea version tecnica", async () => {
    const client = new FakeSupabaseClient({ server_documents: [row()] });
    const store = createStore(client);

    const result = await store.updateDraft(record({ payloadHash: "hash:new" }), 1);

    expect(result.status).toBe("accepted");
    const update = client.operations.find((operation) => operation.action === "update");
    expect(update).toMatchObject({
      filters: [
        { column: "id", value: "SYNTHETIC_ONLY_DOC_A" },
        { column: "version", value: 1 },
        { column: "user_id", value: scope.userId },
        { column: "scope_id", value: scope.scopeId },
      ],
    });
    expect(client.tables.get("server_document_versions")).toHaveLength(1);
  });

  it("update con version mismatch devuelve conflict", async () => {
    const client = new FakeSupabaseClient({
      server_documents: [row({ version: 2 })],
    });
    const store = createStore(client);

    const result = await store.updateDraft(record({ payloadHash: "hash:new" }), 1);

    expect(result.status).toBe("conflict");
  });

  it("update DB error se traduce a error controlado", async () => {
    const client = new FakeSupabaseClient({ server_documents: [row()] });
    client.failNext("update", {
      code: "DB001",
      message: "raw payload should never leak",
    });
    const store = createStore(client);

    try {
      await store.updateDraft(record({ payloadHash: "hash:new" }), 1);
      throw new Error("expected controlled db error");
    } catch (error) {
      expect(error).toMatchObject({
        name: "DocumentSyncSupabaseStoreError",
        operation: "update_draft",
        causeCode: "DB001",
      } satisfies Partial<DocumentSyncSupabaseStoreError>);
      expect(error instanceof Error ? error.message : String(error)).not.toContain(
        "raw payload",
      );
    }
  });

  it("delete draft elimina con version correcta", async () => {
    const client = new FakeSupabaseClient({ server_documents: [row()] });
    const store = createStore(client);

    const result = await store.deleteDraft("SYNTHETIC_ONLY_DOC_A", 1, scope);

    expect(result.status).toBe("deleted");
    expect(await store.getById("SYNTHETIC_ONLY_DOC_A", scope)).toBeNull();
  });

  it("delete protected se rechaza", async () => {
    const client = new FakeSupabaseClient({
      server_documents: [row({ document_lifecycle: "issued", integrity_lock: "locked" })],
    });
    const store = createStore(client);

    const result = await store.deleteDraft("SYNTHETIC_ONLY_DOC_A", 1, scope);

    expect(result.status).toBe("rejected");
  });

  it("recordConflict inserta conflicto seguro", async () => {
    const client = new FakeSupabaseClient();
    const store = createStore(client);
    const safeSummary = buildDocumentSyncSafeSummary(candidate(), null, [
      "version_conflict",
    ]);
    const conflict = buildDocumentSyncConflict({
      candidate: candidate(),
      currentState: null,
      conflictReason: "document_not_found",
      safeSummary,
    });

    await store.recordConflict(conflict);

    expect(client.tables.get("document_conflicts")).toHaveLength(1);
    expect(JSON.stringify(client.tables.get("document_conflicts"))).not.toContain(
      "payload completo",
    );
  });

  it("no permite cross-user scope", async () => {
    const client = new FakeSupabaseClient({ server_documents: [row()] });
    const store = createStore(client);

    await expect(
      store.getById("SYNTHETIC_ONLY_DOC_A", {
        userId: "SYNTHETIC_ONLY_USER_B",
        scopeId: scope.scopeId,
      }),
    ).rejects.toThrow(DocumentSyncSupabaseSafetyError);
  });

  it("no crea cliente real ni lee entorno", () => {
    const runtime = `${createSupabaseDocumentSyncStore.toString()}`;

    expect(runtime).not.toContain("@supabase");
    expect(runtime).not.toContain("createClient");
    expect(runtime).not.toContain("process.env");
  });
});
