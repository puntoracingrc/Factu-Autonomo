import { describe, expect, it } from "vitest";
import {
  mapFiscalChainHeadRowToState,
  mapFiscalRecordWithChainRpcRowToResult,
  SupabaseFiscalRecordChainLocalStagingStore,
  type SupabaseFiscalRecordChainLocalStagingClient,
  type SupabaseFiscalRecordChainQueryResult,
} from "./supabase-chain-store";

const NOW = "2026-06-25T14:20:00.000Z";

interface FakeRpcCall {
  functionName: string;
  args: Record<string, unknown>;
}

class FakeFilterBuilder {
  filters: Array<[string, unknown]> = [];

  constructor(
    private readonly result: SupabaseFiscalRecordChainQueryResult<
      Record<string, unknown> | null
    >,
  ) {}

  eq(column: string, value: unknown): FakeFilterBuilder {
    this.filters.push([column, value]);
    return this;
  }

  async maybeSingle(): Promise<
    SupabaseFiscalRecordChainQueryResult<Record<string, unknown> | null>
  > {
    return this.result;
  }

  then<TResult1 = SupabaseFiscalRecordChainQueryResult<Record<string, unknown>[] | null>>(
    resolve?: (
      value: SupabaseFiscalRecordChainQueryResult<
        Record<string, unknown>[] | null
      >,
    ) => TResult1 | PromiseLike<TResult1>,
  ): PromiseLike<TResult1> {
    return Promise.resolve({
      data: this.result.data ? [this.result.data] : null,
      error: this.result.error,
    }).then(resolve);
  }
}

class FakeRpcBuilder {
  constructor(
    private readonly result: SupabaseFiscalRecordChainQueryResult<
      Record<string, unknown> | null
    >,
  ) {}

  async single(): Promise<
    SupabaseFiscalRecordChainQueryResult<Record<string, unknown> | null>
  > {
    return this.result;
  }
}

class FakeClient implements SupabaseFiscalRecordChainLocalStagingClient {
  rpcCalls: FakeRpcCall[] = [];
  filterBuilder: FakeFilterBuilder | null = null;
  private headResult: SupabaseFiscalRecordChainQueryResult<
    Record<string, unknown> | null
  > = {
    data: null,
    error: null,
  };
  private rpcResult: SupabaseFiscalRecordChainQueryResult<
    Record<string, unknown> | null
  > = {
    data: null,
    error: null,
  };

  queueHead(
    result: SupabaseFiscalRecordChainQueryResult<Record<string, unknown> | null>,
  ) {
    this.headResult = result;
  }

  queueRpc(
    result: SupabaseFiscalRecordChainQueryResult<Record<string, unknown> | null>,
  ) {
    this.rpcResult = result;
  }

  from(): { select: () => FakeFilterBuilder } {
    return {
      select: () => {
        this.filterBuilder = new FakeFilterBuilder(this.headResult);
        return this.filterBuilder;
      },
    };
  }

  rpc(functionName: string, args: Record<string, unknown>): FakeRpcBuilder {
    this.rpcCalls.push({ functionName, args });
    return new FakeRpcBuilder(this.rpcResult);
  }
}

function rpcRow(overrides: Record<string, unknown> = {}) {
  return {
    result_status: "created",
    reason: null,
    message: null,
    atomicity: "postgres_rpc",
    record_id: "record-1",
    record_user_id: "user-a",
    record_operation_id: "operation-1",
    record_invoice_identity_id: "identity-1",
    record_server_document_id: "server-doc-1",
    record_environment: "test",
    record_issuer_nif: "B12345678",
    record_numserie: "F-2026-0001",
    record_fecha_expedicion: "2026-06-25",
    record_type_candidate: "alta",
    record_sequence: 1,
    record_previous_record_id: null,
    record_previous_hash: null,
    record_hash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    record_hash_algorithm: "sha256-candidate",
    record_timestamp: NOW,
    record_document_snapshot_hash: "fnv1a32:aaaaaaaa",
    record_pdf_content_hash: null,
    record_schema_version: "phase2b4m-chain-local-staging-v1",
    record_renderer_version: null,
    record_created_at: NOW,
    chain_user_id: "user-a",
    chain_environment: "test",
    chain_issuer_nif: "B12345678",
    chain_last_record_id: "record-1",
    chain_last_hash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    chain_record_count: 1,
    chain_updated_at: NOW,
    ...overrides,
  };
}

describe("mapFiscalChainHeadRowToState", () => {
  it("mapea cabecera de cadena", () => {
    expect(
      mapFiscalChainHeadRowToState({
        user_id: "user-a",
        environment: "test",
        issuer_nif: "B12345678",
        last_record_id: "record-1",
        last_hash: "hash-1",
        record_count: 1,
        updated_at: NOW,
      }),
    ).toEqual({
      userId: "user-a",
      environment: "test",
      issuerNif: "B12345678",
      lastRecordId: "record-1",
      lastHash: "hash-1",
      recordCount: 1,
      updatedAt: NOW,
    });
  });
});

describe("mapFiscalRecordWithChainRpcRowToResult", () => {
  it("mapea created con record y chain sin XML", () => {
    const result = mapFiscalRecordWithChainRpcRowToResult(rpcRow());

    expect(result.status).toBe("created");
    if (result.status !== "created") throw new Error("Expected created");
    expect(result.record.recordSequence).toBe(1);
    expect(result.chain.lastRecordId).toBe(result.record.id);
    expect(result.chain.lastHash).toBe(result.record.recordHash);
    expect(JSON.stringify(result)).not.toContain("xml");
    expect(JSON.stringify(result)).not.toContain("AEAT");
  });

  it("mapea existing", () => {
    const result = mapFiscalRecordWithChainRpcRowToResult(
      rpcRow({ result_status: "existing" }),
    );

    expect(result.status).toBe("existing");
  });

  it("mapea rechazo controlado", () => {
    expect(
      mapFiscalRecordWithChainRpcRowToResult({
        result_status: "rejected",
        reason: "operation_not_processing",
        message: "No processing",
      }),
    ).toEqual({
      status: "rejected",
      reason: "operation_not_processing",
      message: "No processing",
    });
  });

  it("mapea conflicto controlado", () => {
    expect(
      mapFiscalRecordWithChainRpcRowToResult({
        result_status: "conflict",
        reason: "record_chain_head_changed",
        message: "Cabecera cambiada",
      }),
    ).toEqual({
      status: "conflict",
      reason: "record_chain_head_changed",
      message: "Cabecera cambiada",
    });
  });
});

describe("SupabaseFiscalRecordChainLocalStagingStore", () => {
  it("consulta chain head por usuario, entorno y emisor", async () => {
    const client = new FakeClient();
    client.queueHead({
      data: {
        user_id: "user-a",
        environment: "test",
        issuer_nif: "B12345678",
        last_record_id: "record-1",
        last_hash: "hash-1",
        record_count: 1,
        updated_at: NOW,
      },
      error: null,
    });
    const store = new SupabaseFiscalRecordChainLocalStagingStore(client);

    const head = await store.findFiscalChainHead({
      userId: "user-a",
      environment: "test",
      issuerNif: "B12345678",
    });

    expect(head?.lastRecordId).toBe("record-1");
    expect(client.filterBuilder?.filters).toEqual([
      ["user_id", "user-a"],
      ["environment", "test"],
      ["issuer_nif", "B12345678"],
    ]);
  });

  it("llama a la RPC atomica con cabecera esperada", async () => {
    const client = new FakeClient();
    client.queueRpc({ data: rpcRow(), error: null });
    const store = new SupabaseFiscalRecordChainLocalStagingStore(client);

    const result = await store.createFiscalRecordWithChainLocalStaging({
      userId: "user-a",
      operationId: "operation-1",
      expectedPreviousRecordId: null,
      expectedPreviousHash: null,
      recordHash:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      hashAlgorithm: "sha256-candidate",
      recordTimestamp: NOW,
      schemaVersion: "phase2b4m-chain-local-staging-v1",
      rendererVersion: "phase2b4m-test",
    });

    expect(result.status).toBe("created");
    expect(client.rpcCalls).toEqual([
      {
        functionName: "create_fiscal_record_with_chain_local_staging",
        args: {
          p_user_id: "user-a",
          p_operation_id: "operation-1",
          p_expected_previous_record_id: null,
          p_expected_previous_hash: null,
          p_record_hash:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          p_hash_algorithm: "sha256-candidate",
          p_record_timestamp: NOW,
          p_schema_version: "phase2b4m-chain-local-staging-v1",
          p_renderer_version: "phase2b4m-test",
        },
      },
    ]);
    expect(JSON.stringify(client.rpcCalls)).not.toContain("xml");
    expect(JSON.stringify(client.rpcCalls)).not.toContain("AEAT");
  });

  it("convierte errores DB en errores tipados", async () => {
    const client = new FakeClient();
    client.queueRpc({
      data: null,
      error: { code: "42501", message: "permission denied" },
    });
    const store = new SupabaseFiscalRecordChainLocalStagingStore(client);

    await expect(
      store.createFiscalRecordWithChainLocalStaging({
        userId: "user-a",
        operationId: "operation-1",
        expectedPreviousRecordId: null,
        expectedPreviousHash: null,
        recordHash:
          "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        hashAlgorithm: "sha256-candidate",
        recordTimestamp: NOW,
        schemaVersion: "phase2b4m-chain-local-staging-v1",
      }),
    ).rejects.toMatchObject({
      name: "FiscalRecordChainLocalStagingStoreError",
      operation: "create_fiscal_record_with_chain_local_staging",
      causeCode: "42501",
    });
  });
});
