import { describe, expect, it } from "vitest";
import {
  mapFiscalEvidenceIntegrityChainRow,
  mapFiscalEvidenceIntegrityEvidenceRow,
  mapFiscalEvidenceIntegrityRecordRow,
  SupabaseFiscalEvidenceIntegrityStore,
  type SupabaseFiscalEvidenceIntegrityClient,
  type SupabaseFiscalEvidenceIntegrityQueryResult,
} from "./supabase-store";

const NOW = "2026-06-25T16:20:00.000Z";
const HASH =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PREVIOUS_HASH =
  "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const XML_DIGEST =
  "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

interface FakeQuery {
  table: string;
  columns?: string;
  filters: Array<{ column: string; value: unknown }>;
  orderBy: Array<{ column: string; ascending?: boolean }>;
}

class FakeBuilder {
  readonly query: FakeQuery;

  constructor(
    table: string,
    columns: string | undefined,
    private readonly result: SupabaseFiscalEvidenceIntegrityQueryResult<
      Record<string, unknown>[] | Record<string, unknown> | null
    >,
  ) {
    this.query = { table, columns, filters: [], orderBy: [] };
  }

  eq(column: string, value: unknown): FakeBuilder {
    this.query.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): FakeBuilder {
    this.query.orderBy.push({ column, ascending: options?.ascending });
    return this;
  }

  async maybeSingle(): Promise<
    SupabaseFiscalEvidenceIntegrityQueryResult<Record<string, unknown> | null>
  > {
    return {
      data: Array.isArray(this.result.data)
        ? (this.result.data[0] ?? null)
        : this.result.data,
      error: this.result.error,
    };
  }

  then<TResult1 = SupabaseFiscalEvidenceIntegrityQueryResult<
    Record<string, unknown>[] | null
  >, TResult2 = never>(
    onfulfilled?:
      | ((
          value: SupabaseFiscalEvidenceIntegrityQueryResult<
            Record<string, unknown>[] | null
          >,
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const value = {
      data: Array.isArray(this.result.data) ? this.result.data : [],
      error: this.result.error,
    };
    return Promise.resolve(value).then(onfulfilled, onrejected);
  }
}

class FakeClient implements SupabaseFiscalEvidenceIntegrityClient {
  builders: FakeBuilder[] = [];
  results = new Map<
    string,
    SupabaseFiscalEvidenceIntegrityQueryResult<
      Record<string, unknown>[] | Record<string, unknown> | null
    >
  >();

  queue(
    table: string,
    result: SupabaseFiscalEvidenceIntegrityQueryResult<
      Record<string, unknown>[] | Record<string, unknown> | null
    >,
  ) {
    this.results.set(table, result);
  }

  from(table: string) {
    return {
      select: (columns?: string) => {
        const builder = new FakeBuilder(
          table,
          columns,
          this.results.get(table) ?? { data: null, error: null },
        );
        this.builders.push(builder);
        return builder;
      },
    };
  }
}

function evidenceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "evidence-row-1",
    user_id: "user-a",
    environment: "test",
    record_id: "record-1",
    operation_id: "operation-1",
    record_sequence: 2,
    record_hash: HASH,
    previous_hash: PREVIOUS_HASH,
    payload_candidate_id: "payload-1",
    payload_validation_status: "valid",
    xml_candidate_digest: XML_DIGEST,
    evidence_finality: "internal_dry_run_evidence",
    transportable: false,
    created_at: NOW,
    metadata_safe: {
      phase: "PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1",
      includesFullXml: false,
      includesDocumentMaterial: false,
      signed: false,
      aeatReady: false,
    },
    ...overrides,
  };
}

describe("SupabaseFiscalEvidenceIntegrityStore mapping", () => {
  it("mapea evidencia sin XML completo ni snapshots", () => {
    const mapped = mapFiscalEvidenceIntegrityEvidenceRow(evidenceRow());

    expect(mapped).toMatchObject({
      id: "evidence-row-1",
      userId: "user-a",
      recordId: "record-1",
      operationId: "operation-1",
      transportable: false,
    });
    const serialized = JSON.stringify(mapped);
    expect(serialized).not.toContain("<FiscalPayloadCandidate");
    expect(serialized).not.toContain("document_snapshot");
    expect(serialized).not.toContain("service_role");
  });

  it("mapea fiscal_records y fiscal_chain_state minimos", () => {
    expect(
      mapFiscalEvidenceIntegrityRecordRow({
        id: "record-1",
        user_id: "user-a",
        operation_id: "operation-1",
        environment: "test",
        issuer_nif: "B12345678",
        record_sequence: "2",
        record_hash: HASH,
        previous_hash: PREVIOUS_HASH,
      }),
    ).toMatchObject({ id: "record-1", recordSequence: 2 });

    expect(
      mapFiscalEvidenceIntegrityChainRow({
        user_id: "user-a",
        environment: "test",
        issuer_nif: "B12345678",
        last_record_id: "record-1",
        last_hash: HASH,
        record_count: "2",
        updated_at: NOW,
      }),
    ).toMatchObject({ lastRecordId: "record-1", recordCount: 2 });
  });
});

describe("SupabaseFiscalEvidenceIntegrityStore", () => {
  it("lee evidencia con filtros seguros y sin escrituras", async () => {
    const client = new FakeClient();
    client.queue("fiscal_evidence_packets", {
      data: [evidenceRow()],
      error: null,
    });
    const store = new SupabaseFiscalEvidenceIntegrityStore(client);

    const rows = await store.findEvidencePackets({
      userId: "user-a",
      environment: "test",
      recordId: "record-1",
      operationId: "operation-1",
    });

    expect(rows).toHaveLength(1);
    expect(client.builders[0].query).toMatchObject({
      table: "fiscal_evidence_packets",
      filters: [
        { column: "user_id", value: "user-a" },
        { column: "record_id", value: "record-1" },
        { column: "operation_id", value: "operation-1" },
        { column: "environment", value: "test" },
      ],
      orderBy: [{ column: "record_sequence", ascending: true }],
    });
  });

  it("lee fiscal_records y fiscal_chain_state por claves minimas", async () => {
    const client = new FakeClient();
    client.queue("fiscal_records", {
      data: {
        id: "record-1",
        user_id: "user-a",
        operation_id: "operation-1",
        environment: "test",
        issuer_nif: "B12345678",
        record_sequence: 2,
        record_hash: HASH,
        previous_hash: PREVIOUS_HASH,
      },
      error: null,
    });
    client.queue("fiscal_chain_state", {
      data: {
        user_id: "user-a",
        environment: "test",
        issuer_nif: "B12345678",
        last_record_id: "record-1",
        last_hash: HASH,
        record_count: 2,
        updated_at: NOW,
      },
      error: null,
    });
    const store = new SupabaseFiscalEvidenceIntegrityStore(client);

    await expect(
      store.findFiscalRecord({ userId: "user-a", recordId: "record-1" }),
    ).resolves.toMatchObject({ id: "record-1" });
    await expect(
      store.findFiscalChainState({
        userId: "user-a",
        environment: "test",
        issuerNif: "B12345678",
      }),
    ).resolves.toMatchObject({ issuerNif: "B12345678" });

    expect(client.builders.map((builder) => builder.query.table)).toEqual([
      "fiscal_records",
      "fiscal_chain_state",
    ]);
  });
});
