import { describe, expect, it } from "vitest";
import {
  mapFiscalOperationProcessingRpcRowToResult,
  SupabaseFiscalOperationProcessingStore,
  type SupabaseFiscalOperationProcessingClient,
  type SupabaseFiscalOperationProcessingQueryResult,
} from "./supabase-processing-store";

const NOW = "2026-06-25T10:00:00.000Z";

interface FakeRpcCall {
  functionName: string;
  args: Record<string, unknown>;
}

class FakeRpcBuilder {
  constructor(
    private readonly result: SupabaseFiscalOperationProcessingQueryResult<
      Record<string, unknown> | null
    >,
  ) {}

  async single(): Promise<
    SupabaseFiscalOperationProcessingQueryResult<Record<string, unknown> | null>
  > {
    return this.result;
  }
}

class FakeRpcClient implements SupabaseFiscalOperationProcessingClient {
  calls: FakeRpcCall[] = [];
  private results: Array<
    SupabaseFiscalOperationProcessingQueryResult<Record<string, unknown> | null>
  > = [];

  queue(
    result: SupabaseFiscalOperationProcessingQueryResult<
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
    result_status: "processing",
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
    operation_status: "processing",
    operation_completed_at: null,
    operation_failed_at: null,
    operation_failure_code: null,
    operation_failure_message: null,
    operation_created_at: NOW,
    operation_updated_at: NOW,
    ...overrides,
  };
}

describe("mapFiscalOperationProcessingRpcRowToResult", () => {
  it("mapea respuesta processing", () => {
    const result = mapFiscalOperationProcessingRpcRowToResult(rpcRow());

    expect(result.status).toBe("processing");
    if (result.status !== "processing") throw new Error("Expected processing");
    expect(result.atomicity).toBe("postgres_rpc");
    expect(result.operation).toMatchObject({
      id: "operation-1",
      operationType: "alta_inicial",
      status: "processing",
      expectedDocumentVersion: 9,
    });
  });

  it("mapea respuesta existing_processing", () => {
    const result = mapFiscalOperationProcessingRpcRowToResult(
      rpcRow({ result_status: "existing_processing" }),
    );

    expect(result.status).toBe("existing_processing");
    if (result.status !== "existing_processing") {
      throw new Error("Expected existing_processing");
    }
    expect(result.operation.status).toBe("processing");
  });

  it("mapea rechazo con operacion incompatible", () => {
    const result = mapFiscalOperationProcessingRpcRowToResult(
      rpcRow({
        result_status: "rejected",
        reason: "operation_status_incompatible",
        message: "Estado final",
        operation_status: "completed",
        operation_completed_at: NOW,
      }),
    );

    expect(result).toMatchObject({
      status: "rejected",
      reason: "operation_status_incompatible",
      message: "Estado final",
      operation: {
        status: "completed",
      },
    });
  });

  it("mapea rechazo sin operacion", () => {
    const result = mapFiscalOperationProcessingRpcRowToResult({
      result_status: "rejected",
      reason: "operation_not_found",
      message: "No encontrada",
      atomicity: "postgres_rpc",
      operation_id: null,
    });

    expect(result).toEqual({
      status: "rejected",
      reason: "operation_not_found",
      message: "No encontrada",
      operation: null,
    });
  });

  it("mapea conflicto controlado", () => {
    const result = mapFiscalOperationProcessingRpcRowToResult({
      result_status: "conflict",
      reason: "operation_processing_race",
      message: "Carrera",
      atomicity: "postgres_rpc",
    });

    expect(result).toEqual({
      status: "conflict",
      reason: "operation_processing_race",
      message: "Carrera",
    });
  });
});

describe("SupabaseFiscalOperationProcessingStore", () => {
  it("llama a la RPC de transicion con input controlado", async () => {
    const client = new FakeRpcClient();
    client.queue({ data: rpcRow(), error: null });
    const store = new SupabaseFiscalOperationProcessingStore(client);

    const result = await store.markFiscalOperationProcessing({
      userId: "user-a",
      operationId: "operation-1",
      markedAt: new Date(NOW),
    });

    expect(result.status).toBe("processing");
    expect(client.calls).toEqual([
      {
        functionName: "mark_fiscal_operation_processing",
        args: {
          p_user_id: "user-a",
          p_operation_id: "operation-1",
          p_marked_at: NOW,
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
    const store = new SupabaseFiscalOperationProcessingStore(client);

    await expect(
      store.markFiscalOperationProcessing({
        userId: "user-a",
        operationId: "operation-1",
      }),
    ).rejects.toMatchObject({
      name: "FiscalOperationProcessingStoreError",
      operation: "mark_fiscal_operation_processing",
      causeCode: "42501",
    });
  });

  it("no llama tablas finales ni endpoints AEAT desde el adapter", async () => {
    const client = new FakeRpcClient();
    client.queue({ data: rpcRow(), error: null });
    const store = new SupabaseFiscalOperationProcessingStore(client);

    await store.markFiscalOperationProcessing({
      userId: "user-a",
      operationId: "operation-1",
    });

    const serialized = JSON.stringify(client.calls);
    expect(client.calls).toHaveLength(1);
    expect(client.calls[0]?.functionName).toBe(
      "mark_fiscal_operation_processing",
    );
    expect(serialized).not.toContain("fiscal_records");
    expect(serialized).not.toContain("fiscal_chain_state");
    expect(serialized).not.toContain("fiscal_transport_attempts");
    expect(serialized).not.toContain("xml");
    expect(serialized).not.toContain("AEAT");
  });
});
