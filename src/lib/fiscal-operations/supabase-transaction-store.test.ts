import { describe, expect, it } from "vitest";
import {
  FiscalOperationTransactionStoreError,
  mapFiscalOperationTransactionRpcRowToResult,
  SupabaseFiscalOperationTransactionStore,
  type SupabaseFiscalOperationTransactionClient,
  type SupabaseFiscalOperationTransactionQueryResult,
} from "./supabase-transaction-store";

const NOW = "2026-06-25T10:00:00.000Z";

interface FakeRpcCall {
  functionName: string;
  args: Record<string, unknown>;
}

class FakeRpcBuilder {
  constructor(
    private readonly result: SupabaseFiscalOperationTransactionQueryResult<
      Record<string, unknown> | null
    >,
  ) {}

  async single(): Promise<
    SupabaseFiscalOperationTransactionQueryResult<Record<string, unknown> | null>
  > {
    return this.result;
  }
}

class FakeRpcClient implements SupabaseFiscalOperationTransactionClient {
  calls: FakeRpcCall[] = [];
  private results: Array<
    SupabaseFiscalOperationTransactionQueryResult<Record<string, unknown> | null>
  > = [];

  queue(
    result: SupabaseFiscalOperationTransactionQueryResult<
      Record<string, unknown> | null
    >,
  ) {
    this.results.push(result);
  }

  rpc(functionName: string, args: Record<string, unknown>): FakeRpcBuilder {
    this.calls.push({ functionName, args });
    return new FakeRpcBuilder(
      this.results.shift() ?? {
        data: null,
        error: null,
      },
    );
  }
}

function rpcRow(overrides: Record<string, unknown> = {}) {
  return {
    result_status: "created",
    reason: null,
    message: null,
    atomicity: "postgres_rpc",
    operation_id: "operation-1",
    operation_user_id: "user-a",
    operation_server_document_id: "server-doc-1",
    operation_type: "alta_inicial",
    operation_environment: "test",
    operation_idempotency_key: "key-a",
    operation_requested_by: "user-a",
    operation_requested_at: NOW,
    operation_expected_document_version: 9,
    operation_document_snapshot_hash: "fnv1a32:aaaaaaaa",
    operation_status: "requested",
    operation_completed_at: null,
    operation_failed_at: null,
    operation_failure_code: null,
    operation_failure_message: null,
    operation_created_at: NOW,
    operation_updated_at: NOW,
    invoice_identity_id: "identity-1",
    invoice_identity_user_id: "user-a",
    invoice_identity_server_document_id: "server-doc-1",
    invoice_identity_environment: "test",
    invoice_identity_issuer_nif: "B12345678",
    invoice_identity_numserie: "F-2026-0009",
    invoice_identity_fecha_expedicion: "2026-06-25",
    invoice_identity_created_at: NOW,
    ...overrides,
  };
}

describe("mapFiscalOperationTransactionRpcRowToResult", () => {
  it("mapea respuesta created", () => {
    const result = mapFiscalOperationTransactionRpcRowToResult(rpcRow());

    expect(result.status).toBe("created");
    if (result.status !== "created") throw new Error("Expected created");
    expect(result.atomicity).toBe("postgres_rpc");
    expect(result.operation).toMatchObject({
      id: "operation-1",
      operationType: "alta_inicial",
      status: "requested",
      expectedDocumentVersion: 9,
    });
    expect(result.invoiceIdentity).toMatchObject({
      id: "identity-1",
      issuerNif: "B12345678",
      numserie: "F-2026-0009",
    });
  });

  it("mapea respuesta existing sin identidad", () => {
    const result = mapFiscalOperationTransactionRpcRowToResult(
      rpcRow({
        result_status: "existing",
        invoice_identity_id: null,
        invoice_identity_user_id: null,
        invoice_identity_server_document_id: null,
        invoice_identity_environment: null,
        invoice_identity_issuer_nif: null,
        invoice_identity_numserie: null,
        invoice_identity_fecha_expedicion: null,
        invoice_identity_created_at: null,
      }),
    );

    expect(result.status).toBe("existing");
    if (result.status !== "existing") throw new Error("Expected existing");
    expect(result.atomicity).toBe("postgres_rpc");
    expect(result.invoiceIdentity).toBeNull();
  });

  it("mapea respuesta rejected", () => {
    const result = mapFiscalOperationTransactionRpcRowToResult(
      rpcRow({
        result_status: "rejected",
        reason: "document_not_eligible",
        message: "No elegible",
      }),
    );

    expect(result).toEqual({
      status: "rejected",
      reason: "document_not_eligible",
      message: "No elegible",
    });
  });

  it("mapea respuesta conflict", () => {
    const result = mapFiscalOperationTransactionRpcRowToResult(
      rpcRow({
        result_status: "conflict",
        reason: "document_version_conflict",
        message: "Version antigua",
      }),
    );

    expect(result).toEqual({
      status: "conflict",
      reason: "document_version_conflict",
      message: "Version antigua",
    });
  });

  it("rechaza respuestas created sin identidad fiscal", () => {
    expect(() =>
      mapFiscalOperationTransactionRpcRowToResult(
        rpcRow({
          invoice_identity_id: null,
        }),
      ),
    ).toThrow(FiscalOperationTransactionStoreError);
  });
});

describe("SupabaseFiscalOperationTransactionStore", () => {
  it("llama a la RPC transaccional con input controlado", async () => {
    const client = new FakeRpcClient();
    client.queue({ data: rpcRow(), error: null });
    const store = new SupabaseFiscalOperationTransactionStore(client);

    const result = await store.reserveFiscalOperation({
      userId: "user-a",
      serverDocumentId: "server-doc-1",
      operationType: "alta_inicial",
      environment: "test",
      expectedDocumentVersion: 9,
      idempotencyKey: "key-a",
      requestedBy: "user-a",
      requestedAt: new Date(NOW),
    });

    expect(result.status).toBe("created");
    expect(client.calls).toEqual([
      {
        functionName: "reserve_fiscal_operation",
        args: {
          p_user_id: "user-a",
          p_server_document_id: "server-doc-1",
          p_operation_type: "alta_inicial",
          p_environment: "test",
          p_expected_document_version: 9,
          p_idempotency_key: "key-a",
          p_requested_by: "user-a",
          p_requested_at: NOW,
        },
      },
    ]);
  });

  it("convierte errores DB en errores tipados", async () => {
    const client = new FakeRpcClient();
    client.queue({
      data: null,
      error: { code: "42501", message: "permission denied" },
    });
    const store = new SupabaseFiscalOperationTransactionStore(client);

    await expect(
      store.reserveFiscalOperation({
        userId: "user-a",
        serverDocumentId: "server-doc-1",
        operationType: "alta_inicial",
        environment: "test",
        expectedDocumentVersion: 9,
        requestedBy: "user-a",
      }),
    ).rejects.toMatchObject({
      name: "FiscalOperationTransactionStoreError",
      operation: "reserve_fiscal_operation",
      causeCode: "42501",
    });
  });

  it("no llama tablas ni endpoints AEAT desde el adapter", async () => {
    const client = new FakeRpcClient();
    client.queue({ data: rpcRow(), error: null });
    const store = new SupabaseFiscalOperationTransactionStore(client);

    await store.reserveFiscalOperation({
      userId: "user-a",
      serverDocumentId: "server-doc-1",
      operationType: "alta_subsanacion",
      environment: "test",
      expectedDocumentVersion: 9,
      requestedBy: "user-a",
    });

    const serialized = JSON.stringify(client.calls);
    expect(client.calls).toHaveLength(1);
    expect(client.calls[0]?.functionName).toBe("reserve_fiscal_operation");
    expect(serialized).not.toContain("fiscal_records");
    expect(serialized).not.toContain("fiscal_chain_state");
    expect(serialized).not.toContain("fiscal_transport_attempts");
    expect(serialized).not.toContain("xml");
    expect(serialized).not.toContain("AEAT");
  });
});
