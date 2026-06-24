import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  authenticatedServerDocumentContext,
  resolveAuthenticatedServerDocumentContext,
} from "./auth-context";
import { handleServerDocumentIngestForServer } from "./ingest-wiring";
import {
  safeRejectedResponse,
  sanitizeServerDocumentIngestResult,
} from "./safe-response";
import { createServerDocumentRepositoryForServer } from "./server-factory";
import {
  mapServerDocumentRecordToInsert,
  type SupabaseFilterBuilder,
  type SupabaseQueryResult,
  type SupabaseServerDocumentClient,
} from "./supabase-store";
import type {
  JsonObject,
  ServerDocumentRecord,
} from "./types";

const NOW = "2026-06-24T23:10:00.000Z";

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
    id: "generated-1",
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

function expectNoSensitiveFields(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("payload");
  expect(serialized).not.toContain("documentSnapshot");
  expect(serialized).not.toContain("pdfSnapshot");
  expect(serialized).not.toContain("document_snapshot");
  expect(serialized).not.toContain("pdf_snapshot");
  expect(serialized).not.toContain("xml_payload");
  expect(serialized).not.toContain("responseBody");
  expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
}

describe("server document ingest wiring", () => {
  it("factory crea repository con cliente inyectado y sin tocarlo hasta operar", async () => {
    const client = new FakeSupabaseClient();
    const repository = createServerDocumentRepositoryForServer(client, {
      now: () => NOW,
      generateId: () => "generated-unused",
    });

    expect(client.operations).toHaveLength(0);
    client.queue({ data: null, error: null });
    await repository.readDocumentByLocalId("user-a", "local-doc-1");

    expect(client.operations).toMatchObject([
      {
        table: "server_documents",
        action: "select",
        filters: [
          { column: "user_id", value: "user-a" },
          { column: "local_document_id", value: "local-doc-1" },
        ],
      },
    ]);
  });

  it("factory no requiere store manual ni lee service role", () => {
    const client = new FakeSupabaseClient();
    const before = process.env.SUPABASE_SERVICE_ROLE_KEY;

    process.env.SUPABASE_SERVICE_ROLE_KEY = "NO_DEBE_USARSE";
    const repository = createServerDocumentRepositoryForServer(client);

    expect(repository).toBeTruthy();
    expect(client.operations).toHaveLength(0);
    if (before === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = before;
    }
  });

  it("auth context acepta usuario resuelto por servidor", () => {
    expect(authenticatedServerDocumentContext(" user-a ")).toEqual({
      status: "authenticated",
      context: { authenticatedUserId: "user-a" },
    });
  });

  it("auth context rechaza usuario ausente", () => {
    expect(authenticatedServerDocumentContext(null)).toMatchObject({
      status: "unauthorized",
      reason: "missing_user",
    });
  });

  it("auth context ignora user_id del body porque solo usa resolver servidor", async () => {
    const result = await resolveAuthenticatedServerDocumentContext(
      { body: { user_id: "user-b" }, tokenUserId: "user-a" },
      async (source) => ({ authenticatedUserId: source.tokenUserId }),
    );

    expect(result).toEqual({
      status: "authenticated",
      context: { authenticatedUserId: "user-a" },
    });
  });

  it("safe response elimina payload y snapshots aunque lleguen por error", () => {
    const result = sanitizeServerDocumentIngestResult({
      status: "accepted",
      serverDocumentId: "doc-1",
      localDocumentId: "local-1",
      version: 1,
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      updatedAt: NOW,
      versionId: "version-1",
      payload: payload(),
      documentSnapshot: { customer: "secreto" },
      pdfSnapshot: { renderer: "secreto" },
    } as never);

    expect(result).toEqual({
      status: "accepted",
      serverDocumentId: "doc-1",
      localDocumentId: "local-1",
      version: 1,
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      updatedAt: NOW,
      versionId: "version-1",
    });
    expectNoSensitiveFields(result);
  });

  it("safe response no filtra errores internos", () => {
    const result = safeRejectedResponse(
      "store_error",
      "No se pudo procesar el ingest documental de forma segura.",
    );

    expect(result).toMatchObject({
      status: "rejected",
      reason: "store_error",
    });
    expectNoSensitiveFields(result);
  });

  it("wiring ejecuta ingest con factory, fake auth y fake Supabase", async () => {
    const client = new FakeSupabaseClient();
    client.queue({ data: null, error: null });
    client.queue({ data: documentRow(), error: null });
    client.queue({ data: null, error: null });

    const result = await handleServerDocumentIngestForServer({
      authSource: { tokenUserId: "user-a" },
      authResolver: async (source) => ({
        authenticatedUserId: source.tokenUserId,
      }),
      supabaseClient: client,
      body: createBody({ user_id: "user-b" }),
      repositoryOptions: {
        now: () => NOW,
        generateId: (() => {
          let next = 1;
          return () => `generated-${next++}`;
        })(),
      },
    });

    expect(result).toMatchObject({
      status: "accepted",
      serverDocumentId: "generated-1",
      localDocumentId: "local-doc-1",
      version: 1,
      versionId: "generated-2",
    });
    expect(client.operations.map((operation) => operation.table)).toEqual([
      "server_documents",
      "server_documents",
      "server_document_versions",
    ]);
    expect(client.operations[1].payload).toMatchObject({
      user_id: "user-a",
    });
    expectNoSensitiveFields(result);
  });

  it("wiring sin auth devuelve unauthorized y no toca Supabase", async () => {
    const client = new FakeSupabaseClient();
    const result = await handleServerDocumentIngestForServer({
      authSource: {},
      authResolver: async () => null,
      supabaseClient: client,
      body: createBody(),
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "unauthorized",
    });
    expect(client.operations).toHaveLength(0);
  });

  it("wiring server-only no importa cliente Supabase de navegador", () => {
    const root = process.cwd();
    const files = [
      "src/lib/server-documents/auth-context.ts",
      "src/lib/server-documents/server-factory.ts",
      "src/lib/server-documents/safe-response.ts",
      "src/lib/server-documents/ingest-wiring.ts",
    ];
    const source = files
      .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
      .join("\n");

    expect(source).not.toContain("use client");
    expect(source).not.toContain("@/lib/supabase/client");
    expect(source).not.toContain("getSupabaseClient");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
