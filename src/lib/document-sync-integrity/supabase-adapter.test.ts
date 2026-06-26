import { describe, expect, it } from "vitest";
import { createSupabaseLocalStagingDocumentSyncAdapter } from "./supabase-adapter";
import { createSupabaseDocumentSyncStore } from "./supabase-store";
import type {
  DocumentSyncSupabaseClientLike,
  DocumentSyncSupabaseFilterBuilder,
  DocumentSyncSupabaseQueryResult,
} from "./supabase-contract";
import type { DocumentSyncCandidate } from "./types";

const NOW = "2026-06-26T20:20:00.000Z";
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
  operations: FakeOperation[] = [];
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
    ) => {
      const operation: FakeOperation = {
        table,
        action,
        payload,
        columns,
        filters: [],
      };
      this.operations.push(operation);
      return new FakeBuilder(
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
    payload_hash: "hash:create",
    snapshot_hash: null,
    pdf_content_hash: null,
    numserie: null,
    document_series: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function candidate(
  overrides: Partial<DocumentSyncCandidate> = {},
): DocumentSyncCandidate {
  return {
    operationKind: "create_draft",
    documentId: "SYNTHETIC_ONLY_DOC_A",
    localDocumentId: "SYNTHETIC_ONLY_LOCAL_A",
    payloadHash: "hash:create",
    requestedResponseShape: "safe_summary",
    context: {
      userId: scope.userId,
      scopeId: scope.scopeId,
      requestId: "SYNTHETIC_ONLY_REQUEST",
      userIdSource: "test",
    },
    ...overrides,
  };
}

function adapter(initial: Record<string, unknown>[] = []) {
  const client = new FakeClient({ server_documents: initial });
  const store = createSupabaseDocumentSyncStore(client, {
    serverScope: scope,
    now: () => NOW,
    idFactory: (prefix) => `SYNTHETIC_ONLY_${prefix}`,
  });
  return {
    client,
    adapter: createSupabaseLocalStagingDocumentSyncAdapter(store, {
      serverScope: scope,
    }),
  };
}

describe("Supabase local/staging document sync adapter", () => {
  it("create draft accepted", async () => {
    const subject = adapter();
    const result = await subject.adapter.apply(candidate());

    expect(result.status).toBe("accepted");
    expect(await subject.adapter.getSafeState(scope)).toMatchObject({ total: 1 });
  });

  it("update draft accepted", async () => {
    const subject = adapter([row()]);
    const result = await subject.adapter.apply(
      candidate({
        operationKind: "update_draft",
        expectedVersion: 1,
        payloadHash: "hash:update",
      }),
    );

    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") throw new Error("expected accepted");
    expect(result.version).toBe(2);
  });

  it("version conflict se registra", async () => {
    const subject = adapter([row({ version: 2 })]);
    const result = await subject.adapter.apply(
      candidate({
        operationKind: "update_draft",
        expectedVersion: 1,
        payloadHash: "hash:stale",
      }),
    );

    expect(result.status).toBe("conflict");
    expect(await subject.adapter.getConflictReport(scope)).toMatchObject({
      totalConflicts: 1,
    });
  });

  it("rechaza protected", async () => {
    const subject = adapter([
      row({ document_lifecycle: "issued", integrity_lock: "locked" }),
    ]);
    const result = await subject.adapter.apply(
      candidate({
        operationKind: "update_draft",
        expectedVersion: 1,
        payloadHash: "hash:update",
      }),
    );

    expect(result.status).toBe("rejected");
  });

  it("rechaza hash congelado y numeracion emitida", async () => {
    const subject = adapter([
      row({
        snapshot_hash: "hash:snapshot",
        numserie: "SYNTHETIC-1",
      }),
    ]);

    const hashResult = await subject.adapter.apply(
      candidate({
        operationKind: "update_draft",
        expectedVersion: 1,
        snapshotHash: "hash:other",
      }),
    );
    const numberResult = await subject.adapter.apply(
      candidate({
        operationKind: "update_draft",
        expectedVersion: 1,
        documentNumber: "SYNTHETIC-2",
      }),
    );

    expect(hashResult.status).toBe("rejected");
    expect(numberResult.status).toBe("rejected");
  });

  it("cross-user payload identity rejected", async () => {
    const subject = adapter([row()]);
    const result = await subject.adapter.apply(
      candidate({
        operationKind: "update_draft",
        expectedVersion: 1,
        payloadUserId: "SYNTHETIC_ONLY_USER_B",
      }),
    );

    expect(result.status).toBe("rejected");
  });

  it("conflict report y safe report no filtran cuerpos completos", async () => {
    const subject = adapter([row({ version: 2 })]);
    await subject.adapter.apply(
      candidate({
        operationKind: "update_draft",
        expectedVersion: 1,
        payloadHash: "hash:stale",
      }),
    );

    const report = await subject.adapter.getSafeReport(scope);
    const serialized = JSON.stringify(report);

    expect(report.totalConflicts).toBe(1);
    expect(serialized).not.toContain("payload\":");
    expect(serialized).not.toContain("document_snapshot");
    expect(serialized).not.toContain("pdf_snapshot");
  });

  it("no usa Supabase real", () => {
    const runtime = `${createSupabaseLocalStagingDocumentSyncAdapter.toString()}`;

    expect(runtime).not.toContain("@supabase");
    expect(runtime).not.toContain("createClient");
    expect(runtime).not.toContain("process.env");
  });
});
