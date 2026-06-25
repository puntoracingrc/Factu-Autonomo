import { describe, expect, it } from "vitest";
import {
  SupabaseFiscalEvidenceOperationalSummaryStore,
  type SupabaseFiscalEvidenceOperationalSummaryClient,
  type SupabaseFiscalEvidenceOperationalSummaryQueryResult,
} from "./supabase-store";

const NOW = "2026-06-25T18:30:00.000Z";
const HASH =
  "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const XML_DIGEST =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

interface FakeQuery {
  table: string;
  columns?: string;
  options?: { count?: "exact"; head?: boolean };
  filters: Array<{ column: string; value: unknown }>;
  orderBy: Array<{ column: string; ascending?: boolean }>;
}

class FakeBuilder {
  readonly query: FakeQuery;

  constructor(
    table: string,
    columns: string | undefined,
    options: { count?: "exact"; head?: boolean } | undefined,
    private readonly result: SupabaseFiscalEvidenceOperationalSummaryQueryResult<
      Record<string, unknown>[] | null
    >,
  ) {
    this.query = { table, columns, options, filters: [], orderBy: [] };
  }

  eq(column: string, value: unknown): FakeBuilder {
    this.query.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): FakeBuilder {
    this.query.orderBy.push({ column, ascending: options?.ascending });
    return this;
  }

  then<TResult1 = SupabaseFiscalEvidenceOperationalSummaryQueryResult<
    Record<string, unknown>[] | null
  >, TResult2 = never>(
    onfulfilled?:
      | ((
          value: SupabaseFiscalEvidenceOperationalSummaryQueryResult<
            Record<string, unknown>[] | null
          >,
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

class FakeClient implements SupabaseFiscalEvidenceOperationalSummaryClient {
  builders: FakeBuilder[] = [];
  results = new Map<
    string,
    SupabaseFiscalEvidenceOperationalSummaryQueryResult<
      Record<string, unknown>[] | null
    >
  >();

  queue(
    table: string,
    result: SupabaseFiscalEvidenceOperationalSummaryQueryResult<
      Record<string, unknown>[] | null
    >,
  ) {
    this.results.set(table, result);
  }

  from(table: string) {
    return {
      select: (
        columns?: string,
        options?: { count?: "exact"; head?: boolean },
      ) => {
        const builder = new FakeBuilder(
          table,
          columns,
          options,
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
    record_sequence: 1,
    record_hash: HASH,
    previous_hash: null,
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

describe("SupabaseFiscalEvidenceOperationalSummaryStore", () => {
  it("lee fiscal_evidence_packets por user_id y environment", async () => {
    const client = new FakeClient();
    client.queue("fiscal_evidence_packets", {
      data: [evidenceRow()],
      error: null,
    });
    const store = new SupabaseFiscalEvidenceOperationalSummaryStore(client);

    const rows = await store.findEvidencePackets({
      userId: "user-a",
      environment: "test",
    });

    expect(rows).toHaveLength(1);
    expect(client.builders[0].query).toMatchObject({
      table: "fiscal_evidence_packets",
      filters: [
        { column: "user_id", value: "user-a" },
        { column: "environment", value: "test" },
      ],
      orderBy: [{ column: "record_sequence", ascending: true }],
    });
    const serialized = JSON.stringify(rows);
    expect(serialized).not.toContain("<FiscalPayloadCandidate");
    expect(serialized).not.toContain("service_role");
  });

  it("cuenta fiscal_transport_attempts solo como lectura", async () => {
    const client = new FakeClient();
    client.queue("fiscal_transport_attempts", {
      data: null,
      error: null,
      count: 0,
    });
    const store = new SupabaseFiscalEvidenceOperationalSummaryStore(client);

    await expect(
      store.countFiscalTransportAttempts({
        userId: "user-a",
        environment: "test",
      }),
    ).resolves.toBe(0);

    expect(client.builders[0].query).toEqual({
      table: "fiscal_transport_attempts",
      columns: "id",
      options: { count: "exact", head: true },
      filters: [
        { column: "user_id", value: "user-a" },
        { column: "environment", value: "test" },
      ],
      orderBy: [],
    });
  });

  it("convierte errores de lectura en error tipado", async () => {
    const client = new FakeClient();
    client.queue("fiscal_evidence_packets", {
      data: null,
      error: { code: "42501", message: "permission denied" },
    });
    const store = new SupabaseFiscalEvidenceOperationalSummaryStore(client);

    await expect(
      store.findEvidencePackets({ userId: "user-a", environment: "test" }),
    ).rejects.toMatchObject({
      name: "SupabaseFiscalEvidenceOperationalSummaryStoreError",
      operation: "find_fiscal_evidence_packets_for_summary",
      causeCode: "42501",
    });
  });
});
