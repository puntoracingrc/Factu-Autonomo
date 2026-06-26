import { describe, expect, it } from "vitest";
import {
  createSupabaseDocumentSyncStore,
  createSupabaseLocalStagingDocumentSyncAdapter,
} from "../src/lib/document-sync-integrity";
import type {
  DocumentSyncCandidate,
  DocumentSyncSupabaseClientLike,
  DocumentSyncSupabaseFilterBuilder,
  DocumentSyncSupabaseQueryResult,
} from "../src/lib/document-sync-integrity";

// PHASE2C23_SUPABASE_LOCAL_SYNC_CONCURRENCY_IDEMPOTENCY_V1

const scope = {
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

class FakeBuilder implements DocumentSyncSupabaseFilterBuilder<Record<string, unknown>> {
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

class FakeClient implements DocumentSyncSupabaseClientLike {
  tables = new Map<string, Record<string, unknown>[]>();

  constructor(initial: Record<string, Record<string, unknown>[]> = {}) {
    for (const [table, rows] of Object.entries(initial)) {
      this.tables.set(table, rows.map((row) => ({ ...row })));
    }
  }

  from(table: string) {
    const makeBuilder = (
      action: FakeOperation["action"],
      payload?: Record<string, unknown> | Record<string, unknown>[],
      columns?: string,
    ) =>
      new FakeBuilder(
        (operation, mode) => this.execute(operation, mode),
        { table, action, payload, columns, filters: [] },
      );

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
    const rows = this.tables.get(operation.table) ?? [];
    const matches = () =>
      rows.filter((row) =>
        operation.filters.every((filter) => row[filter.column] === filter.value),
      );

    if (operation.action === "select") {
      const found = matches();
      return { data: mode === "single" ? found[0] ?? null : found, error: null };
    }

    if (operation.action === "insert") {
      const payloads = Array.isArray(operation.payload)
        ? operation.payload
        : [operation.payload ?? {}];
      rows.push(...payloads.map((payload) => ({ ...payload })));
      this.tables.set(operation.table, rows);
      return { data: mode === "single" ? payloads[0] ?? null : payloads, error: null };
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

function candidate(
  overrides: Partial<DocumentSyncCandidate> = {},
): DocumentSyncCandidate {
  return {
    operationKind: "update_draft",
    documentId: "SYNTHETIC_ONLY_DOC_A",
    localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
    expectedVersion: 1,
    payloadHash: "hash:update",
    requestedResponseShape: "safe_summary",
    context: {
      userId: scope.userId,
      scopeId: scope.scopeId,
      userIdSource: "test",
    },
    ...overrides,
  };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "SYNTHETIC_ONLY_DOC_A",
    user_id: scope.userId,
    scope_id: scope.scopeId,
    local_document_id: "SYNTHETIC_ONLY_LOCAL_A",
    document_type: "factura",
    document_kind: "standard",
    payload: {},
    version: 1,
    document_lifecycle: "draft",
    integrity_lock: "unlocked",
    status_legacy: "borrador",
    payload_hash: "hash:create",
    snapshot_hash: null,
    pdf_content_hash: null,
    numserie: null,
    document_series: null,
    created_at: "2026-06-26T21:00:00.000Z",
    updated_at: "2026-06-26T21:00:00.000Z",
    ...overrides,
  };
}

function makeAdapter() {
  const client = new FakeClient({ server_documents: [row()] });
  const store = createSupabaseDocumentSyncStore(client, {
    serverScope: scope,
    now: () => "2026-06-26T21:00:00.000Z",
    idFactory: (prefix) => `SYNTHETIC_ONLY_${prefix}`,
  });
  return {
    client,
    adapter: createSupabaseLocalStagingDocumentSyncAdapter(store, {
      serverScope: scope,
    }),
  };
}

describe("Phase 2C.23 Supabase local sync concurrency with fake client", () => {
  it("allows one concurrent update and records one safe conflict", async () => {
    const { adapter } = makeAdapter();
    const [first, second] = await Promise.all([
      adapter.apply(candidate({ payloadHash: "hash:first" })),
      adapter.apply(candidate({ payloadHash: "hash:second" })),
    ]);
    const statuses = [first.status, second.status].sort();

    expect(statuses).toEqual(["accepted", "conflict"]);
    const safeState = await adapter.getSafeState(scope);
    expect(safeState.records[0]?.currentVersion ?? safeState.records[0]?.candidateVersion).toBe(2);

    const replay = await adapter.apply(candidate({ payloadHash: "hash:replay" }));
    expect(["conflict", "noop"]).toContain(replay.status);

    const report = await adapter.getConflictReport(scope);
    const serialized = JSON.stringify(report);
    expect(report.totalConflicts).toBeGreaterThanOrEqual(1);
    expect(serialized).not.toContain("document_snapshot");
    expect(serialized).not.toContain("pdf_snapshot");
    expect(serialized).not.toContain("payload\":{");
  });
});
