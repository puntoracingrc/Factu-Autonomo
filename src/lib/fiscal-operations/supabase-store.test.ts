import { describe, expect, it } from "vitest";
import {
  mapFiscalInvoiceIdentityCreateToInsert,
  mapFiscalInvoiceIdentityRowToRecord,
  mapFiscalOperationCreateToInsert,
  mapFiscalOperationRowToRecord,
  SupabaseFiscalOperationStore,
  type SupabaseFiscalFilterBuilder,
  type SupabaseFiscalOperationClient,
  type SupabaseFiscalQueryResult,
} from "./supabase-store";
import type {
  FiscalInvoiceIdentityCreateInput,
  FiscalOperationCreateInput,
  FiscalOperationDraft,
} from "./types";

const NOW = "2026-06-25T10:00:00.000Z";

interface FakeOperation {
  table: string;
  action: "select" | "insert";
  columns?: string;
  payload?: Record<string, unknown> | Record<string, unknown>[];
  filters: Array<{ column: string; value: unknown }>;
}

class FakeSupabaseBuilder
  implements SupabaseFiscalFilterBuilder<Record<string, unknown>>
{
  constructor(
    private readonly result: SupabaseFiscalQueryResult<Record<string, unknown> | null>,
    private readonly operation: FakeOperation,
  ) {}

  eq(column: string, value: unknown): SupabaseFiscalFilterBuilder<Record<string, unknown>> {
    this.operation.filters.push({ column, value });
    return this;
  }

  select(columns?: string): SupabaseFiscalFilterBuilder<Record<string, unknown>> {
    this.operation.columns = columns;
    return this;
  }

  async maybeSingle(): Promise<SupabaseFiscalQueryResult<Record<string, unknown> | null>> {
    return this.result;
  }

  async single(): Promise<SupabaseFiscalQueryResult<Record<string, unknown>>> {
    return {
      data: this.result.data ?? {},
      error: this.result.error,
    };
  }

  then<
    TResult1 = SupabaseFiscalQueryResult<Record<string, unknown>[] | null>,
    TResult2 = never,
  >(
    onfulfilled?:
      | ((
          value: SupabaseFiscalQueryResult<Record<string, unknown>[] | null>,
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

class FakeSupabaseClient implements SupabaseFiscalOperationClient {
  operations: FakeOperation[] = [];
  private results: Array<SupabaseFiscalQueryResult<Record<string, unknown> | null>> = [];

  queue(result: SupabaseFiscalQueryResult<Record<string, unknown> | null>) {
    this.results.push(result);
  }

  from(table: string): ReturnType<SupabaseFiscalOperationClient["from"]> {
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
    };
  }
}

function operationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "operation-1",
    user_id: "user-a",
    server_document_id: "server-doc-1",
    operation_type: "alta_inicial",
    environment: "test",
    idempotency_key: "fiscal-operation-v1:fnv1a32:aaaaaaaa",
    requested_by: "user-a",
    requested_at: NOW,
    expected_document_version: 9,
    document_snapshot_hash: "fnv1a32:11111111",
    status: "requested",
    completed_at: null,
    failed_at: null,
    failure_code: null,
    failure_message: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function identityRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "identity-1",
    user_id: "user-a",
    server_document_id: "server-doc-1",
    environment: "test",
    issuer_nif: "B12345678",
    numserie: "F-2026-0009",
    fecha_expedicion: "2026-06-25",
    created_at: NOW,
    ...overrides,
  };
}

function draft(overrides: Partial<FiscalOperationDraft> = {}): FiscalOperationDraft {
  return {
    userId: "user-a",
    serverDocumentId: "server-doc-1",
    operationType: "alta_inicial",
    environment: "test",
    invoiceIdentity: {
      environment: "test",
      issuerNif: "B12345678",
      numserie: "F-2026-0009",
      fechaExpedicion: "2026-06-25",
    },
    idempotencyKey: "fiscal-operation-v1:fnv1a32:aaaaaaaa",
    requestedBy: "user-a",
    requestedAt: NOW,
    expectedDocumentVersion: 9,
    documentSnapshotHash: "fnv1a32:11111111",
    status: "requested",
    authority: "server_document",
    ...overrides,
  };
}

function operationCreateInput(
  overrides: Partial<FiscalOperationCreateInput> = {},
): FiscalOperationCreateInput {
  return {
    id: "operation-1",
    draft: draft(),
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function identityCreateInput(
  overrides: Partial<FiscalInvoiceIdentityCreateInput> = {},
): FiscalInvoiceIdentityCreateInput {
  return {
    id: "identity-1",
    userId: "user-a",
    serverDocumentId: "server-doc-1",
    environment: "test",
    issuerNif: "B12345678",
    numserie: "F-2026-0009",
    fechaExpedicion: "2026-06-25",
    createdAt: NOW,
    ...overrides,
  };
}

describe("Supabase fiscal operation store mapping", () => {
  it("mapea operacion fiscal DB a dominio", () => {
    expect(mapFiscalOperationRowToRecord(operationRow())).toMatchObject({
      id: "operation-1",
      userId: "user-a",
      serverDocumentId: "server-doc-1",
      operationType: "alta_inicial",
      environment: "test",
      idempotencyKey: "fiscal-operation-v1:fnv1a32:aaaaaaaa",
      requestedBy: "user-a",
      expectedDocumentVersion: 9,
      documentSnapshotHash: "fnv1a32:11111111",
      status: "requested",
    });
  });

  it("mapea operacion fiscal dominio a insert", () => {
    expect(mapFiscalOperationCreateToInsert(operationCreateInput())).toMatchObject({
      id: "operation-1",
      user_id: "user-a",
      server_document_id: "server-doc-1",
      operation_type: "alta_inicial",
      environment: "test",
      idempotency_key: "fiscal-operation-v1:fnv1a32:aaaaaaaa",
      requested_by: "user-a",
      expected_document_version: 9,
      document_snapshot_hash: "fnv1a32:11111111",
      status: "requested",
      completed_at: null,
      failed_at: null,
    });
  });

  it("mapea identidad fiscal DB a dominio", () => {
    expect(mapFiscalInvoiceIdentityRowToRecord(identityRow())).toMatchObject({
      id: "identity-1",
      userId: "user-a",
      environment: "test",
      issuerNif: "B12345678",
      numserie: "F-2026-0009",
      fechaExpedicion: "2026-06-25",
    });
  });

  it("mapea identidad fiscal dominio a insert", () => {
    expect(mapFiscalInvoiceIdentityCreateToInsert(identityCreateInput())).toEqual({
      id: "identity-1",
      user_id: "user-a",
      server_document_id: "server-doc-1",
      environment: "test",
      issuer_nif: "B12345678",
      numserie: "F-2026-0009",
      fecha_expedicion: "2026-06-25",
      created_at: NOW,
    });
  });
});

describe("SupabaseFiscalOperationStore", () => {
  it("busca operacion por idempotencyKey y userId", async () => {
    const client = new FakeSupabaseClient();
    client.queue({ data: operationRow(), error: null });
    const store = new SupabaseFiscalOperationStore(client);

    const operation = await store.findOperationByIdempotencyKey(
      "user-a",
      "fiscal-operation-v1:fnv1a32:aaaaaaaa",
    );

    expect(operation?.id).toBe("operation-1");
    expect(client.operations[0]).toMatchObject({
      table: "fiscal_operations",
      action: "select",
      filters: [
        { column: "user_id", value: "user-a" },
        {
          column: "idempotency_key",
          value: "fiscal-operation-v1:fnv1a32:aaaaaaaa",
        },
      ],
    });
  });

  it("devuelve null si no existe operacion", async () => {
    const client = new FakeSupabaseClient();
    client.queue({ data: null, error: null });
    const store = new SupabaseFiscalOperationStore(client);

    await expect(
      store.findOperationByIdempotencyKey("user-a", "missing"),
    ).resolves.toBeNull();
  });

  it("crea operacion con status inicial requested", async () => {
    const client = new FakeSupabaseClient();
    client.queue({ data: operationRow(), error: null });
    const store = new SupabaseFiscalOperationStore(client);

    const operation = await store.createFiscalOperation(operationCreateInput());

    expect(operation.status).toBe("requested");
    expect(client.operations[0]).toMatchObject({
      table: "fiscal_operations",
      action: "insert",
    });
    expect(client.operations[0]?.payload).toMatchObject({
      status: "requested",
      document_snapshot_hash: "fnv1a32:11111111",
    });
  });

  it("busca y crea identidad fiscal", async () => {
    const client = new FakeSupabaseClient();
    client.queue({ data: identityRow(), error: null });
    client.queue({ data: identityRow({ id: "identity-created" }), error: null });
    const store = new SupabaseFiscalOperationStore(client);

    const found = await store.findInvoiceIdentity({
      userId: "user-a",
      environment: "test",
      issuerNif: "B12345678",
      numserie: "F-2026-0009",
      fechaExpedicion: "2026-06-25",
    });
    const created = await store.createInvoiceIdentity(identityCreateInput());

    expect(found?.id).toBe("identity-1");
    expect(created.id).toBe("identity-created");
    expect(client.operations.map((operation) => operation.table)).toEqual([
      "fiscal_invoice_identities",
      "fiscal_invoice_identities",
    ]);
  });

  it("traduce error DB a error controlado", async () => {
    const client = new FakeSupabaseClient();
    client.queue({
      data: null,
      error: { code: "23505", message: "duplicate key" },
    });
    const store = new SupabaseFiscalOperationStore(client);

    await expect(
      store.findOperationByIdempotencyKey("user-a", "key"),
    ).rejects.toMatchObject({
      name: "FiscalOperationStoreError",
      operation: "find_operation_by_idempotency_key",
      causeCode: "23505",
    });
  });

  it("no toca tablas de registros, cadena ni transporte", async () => {
    const client = new FakeSupabaseClient();
    client.queue({ data: operationRow(), error: null });
    client.queue({ data: identityRow(), error: null });
    const store = new SupabaseFiscalOperationStore(client);

    await store.findOperationByIdempotencyKey("user-a", "key");
    await store.findInvoiceIdentity({
      userId: "user-a",
      environment: "test",
      issuerNif: "B12345678",
      numserie: "F-2026-0009",
      fechaExpedicion: "2026-06-25",
    });

    expect(client.operations.map((operation) => operation.table)).not.toContain(
      "fiscal_records",
    );
    expect(client.operations.map((operation) => operation.table)).not.toContain(
      "fiscal_chain_state",
    );
    expect(client.operations.map((operation) => operation.table)).not.toContain(
      "fiscal_transport_attempts",
    );
  });
});
