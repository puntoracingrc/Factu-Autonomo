import { describe, expect, it } from "vitest";
import {
  mapFiscalRecordHeadRowToCandidate,
  mapFiscalRecordLocalStagingRpcRowToResult,
  SupabaseFiscalRecordLocalStagingStore,
  type SupabaseFiscalRecordLocalStagingClient,
  type SupabaseFiscalRecordQueryResult,
} from "./supabase-store";

const NOW = "2026-06-25T13:40:00.000Z";

interface FakeRpcCall {
  functionName: string;
  args: Record<string, unknown>;
}

class FakeFilterBuilder {
  filters: Array<[string, unknown]> = [];
  orders: Array<[string, { ascending?: boolean } | undefined]> = [];
  limits: number[] = [];

  constructor(
    private readonly result: SupabaseFiscalRecordQueryResult<
      Record<string, unknown> | null
    >,
  ) {}

  eq(column: string, value: unknown): FakeFilterBuilder {
    this.filters.push([column, value]);
    return this;
  }

  order(
    column: string,
    options?: { ascending?: boolean },
  ): FakeFilterBuilder {
    this.orders.push([column, options]);
    return this;
  }

  limit(count: number): FakeFilterBuilder {
    this.limits.push(count);
    return this;
  }

  async maybeSingle(): Promise<
    SupabaseFiscalRecordQueryResult<Record<string, unknown> | null>
  > {
    return this.result;
  }

  then<TResult1 = SupabaseFiscalRecordQueryResult<Record<string, unknown>[] | null>>(
    resolve?: (
      value: SupabaseFiscalRecordQueryResult<Record<string, unknown>[] | null>,
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
    private readonly result: SupabaseFiscalRecordQueryResult<
      Record<string, unknown> | null
    >,
  ) {}

  async single(): Promise<
    SupabaseFiscalRecordQueryResult<Record<string, unknown> | null>
  > {
    return this.result;
  }
}

class FakeClient implements SupabaseFiscalRecordLocalStagingClient {
  rpcCalls: FakeRpcCall[] = [];
  filterBuilder: FakeFilterBuilder | null = null;
  private headResult: SupabaseFiscalRecordQueryResult<Record<string, unknown> | null> = {
    data: null,
    error: null,
  };
  private rpcResult: SupabaseFiscalRecordQueryResult<Record<string, unknown> | null> = {
    data: null,
    error: null,
  };

  queueHead(
    result: SupabaseFiscalRecordQueryResult<Record<string, unknown> | null>,
  ) {
    this.headResult = result;
  }

  queueRpc(
    result: SupabaseFiscalRecordQueryResult<Record<string, unknown> | null>,
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
      "candidate_not_final:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    record_hash_algorithm: "sha256-candidate",
    record_timestamp: NOW,
    record_document_snapshot_hash: "fnv1a32:aaaaaaaa",
    record_pdf_content_hash: null,
    record_schema_version: "phase2b4l-local-staging-v1",
    record_renderer_version: null,
    record_created_at: NOW,
    ...overrides,
  };
}

describe("mapFiscalRecordHeadRowToCandidate", () => {
  it("mapea cabecera previa segura", () => {
    expect(
      mapFiscalRecordHeadRowToCandidate({
        id: "record-previous",
        record_hash: "sha256:previous",
        record_sequence: 7,
      }),
    ).toEqual({
      id: "record-previous",
      recordHash: "sha256:previous",
      recordSequence: 7,
    });
  });
});

describe("mapFiscalRecordLocalStagingRpcRowToResult", () => {
  it("mapea created sin devolver xml_payload", () => {
    const result = mapFiscalRecordLocalStagingRpcRowToResult(rpcRow());

    expect(result.status).toBe("created");
    if (result.status !== "created") throw new Error("Expected created");
    expect(result.atomicity).toBe("postgres_rpc");
    expect(result.record).toMatchObject({
      id: "record-1",
      operationId: "operation-1",
      invoiceIdentityId: "identity-1",
      recordTypeCandidate: "alta",
      hashAlgorithm: "sha256-candidate",
    });
    expect(JSON.stringify(result)).not.toContain("xml_payload");
    expect(JSON.stringify(result)).not.toContain("PHASE2B4L_NO_AEAT_XML_CANDIDATE");
  });

  it("mapea existing", () => {
    const result = mapFiscalRecordLocalStagingRpcRowToResult(
      rpcRow({ result_status: "existing" }),
    );

    expect(result.status).toBe("existing");
  });

  it("mapea rechazo controlado", () => {
    expect(
      mapFiscalRecordLocalStagingRpcRowToResult({
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
      mapFiscalRecordLocalStagingRpcRowToResult({
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

describe("SupabaseFiscalRecordLocalStagingStore", () => {
  it("consulta la cabecera previa por usuario, entorno y emisor", async () => {
    const client = new FakeClient();
    client.queueHead({
      data: {
        id: "record-previous",
        record_hash: "sha256:previous",
        record_sequence: 4,
      },
      error: null,
    });
    const store = new SupabaseFiscalRecordLocalStagingStore(client);

    const head = await store.findLatestFiscalRecordHead({
      userId: "user-a",
      environment: "test",
      issuerNif: "B12345678",
    });

    expect(head?.id).toBe("record-previous");
    expect(client.filterBuilder?.filters).toEqual([
      ["user_id", "user-a"],
      ["environment", "test"],
      ["issuer_nif", "B12345678"],
    ]);
    expect(client.filterBuilder?.orders).toEqual([
      ["record_sequence", { ascending: false }],
    ]);
    expect(client.filterBuilder?.limits).toEqual([1]);
  });

  it("llama a la RPC local/staging sin payload XML", async () => {
    const client = new FakeClient();
    client.queueRpc({ data: rpcRow(), error: null });
    const store = new SupabaseFiscalRecordLocalStagingStore(client);

    const result = await store.createFiscalRecordLocalStaging({
      userId: "user-a",
      operationId: "operation-1",
      expectedPreviousRecordId: null,
      expectedPreviousHash: null,
      recordHash:
        "candidate_not_final:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      hashAlgorithm: "sha256-candidate",
      recordTimestamp: NOW,
      schemaVersion: "phase2b4l-local-staging-v1",
      rendererVersion: "test-renderer",
    });

    expect(result.status).toBe("created");
    expect(client.rpcCalls).toEqual([
      {
        functionName: "create_fiscal_record_local_staging",
        args: {
          p_user_id: "user-a",
          p_operation_id: "operation-1",
          p_expected_previous_record_id: null,
          p_expected_previous_hash: null,
          p_record_hash:
            "candidate_not_final:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          p_hash_algorithm: "sha256-candidate",
          p_record_timestamp: NOW,
          p_schema_version: "phase2b4l-local-staging-v1",
          p_renderer_version: "test-renderer",
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
    const store = new SupabaseFiscalRecordLocalStagingStore(client);

    await expect(
      store.createFiscalRecordLocalStaging({
        userId: "user-a",
        operationId: "operation-1",
        expectedPreviousRecordId: null,
        expectedPreviousHash: null,
        recordHash: "candidate_not_final:sha256:a",
        hashAlgorithm: "sha256-candidate",
        recordTimestamp: NOW,
        schemaVersion: "phase2b4l-local-staging-v1",
      }),
    ).rejects.toMatchObject({
      name: "FiscalRecordLocalStagingStoreError",
      operation: "create_fiscal_record_local_staging",
      causeCode: "42501",
    });
  });
});
