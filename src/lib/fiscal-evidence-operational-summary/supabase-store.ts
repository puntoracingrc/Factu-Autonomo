import { mapFiscalEvidenceIntegrityEvidenceRow } from "@/lib/fiscal-evidence-integrity";
import type { FiscalEvidenceIntegrityEvidenceRecord } from "@/lib/fiscal-evidence-integrity";
import type {
  FiscalEvidenceOperationalSummaryEnvironment,
  FiscalEvidenceOperationalSummaryStore,
} from "./types";

assertServerOnlyModule();

export interface SupabaseFiscalEvidenceOperationalSummaryStoreErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface SupabaseFiscalEvidenceOperationalSummaryQueryResult<T> {
  data: T;
  error: SupabaseFiscalEvidenceOperationalSummaryStoreErrorLike | null;
  count?: number | null;
}

export interface SupabaseFiscalEvidenceOperationalSummaryFilterBuilder<T>
  extends PromiseLike<
    SupabaseFiscalEvidenceOperationalSummaryQueryResult<T[] | null>
  > {
  eq(
    column: string,
    value: unknown,
  ): SupabaseFiscalEvidenceOperationalSummaryFilterBuilder<T>;
  order(
    column: string,
    options?: { ascending?: boolean },
  ): SupabaseFiscalEvidenceOperationalSummaryFilterBuilder<T>;
}

export interface SupabaseFiscalEvidenceOperationalSummaryClient {
  from(table: string): {
    select(
      columns?: string,
      options?: { count?: "exact"; head?: boolean },
    ): SupabaseFiscalEvidenceOperationalSummaryFilterBuilder<
      Record<string, unknown>
    >;
  };
}

export class SupabaseFiscalEvidenceOperationalSummaryStoreError extends Error {
  readonly operation: string;
  readonly causeCode?: string;

  constructor(
    operation: string,
    error: SupabaseFiscalEvidenceOperationalSummaryStoreErrorLike,
  ) {
    super(error.message ?? `Error de base de datos en ${operation}.`);
    this.name = "SupabaseFiscalEvidenceOperationalSummaryStoreError";
    this.operation = operation;
    this.causeCode = error.code;
  }
}

const EVIDENCE_COLUMNS = [
  "id",
  "user_id",
  "environment",
  "record_id",
  "operation_id",
  "record_sequence",
  "record_hash",
  "previous_hash",
  "payload_candidate_id",
  "payload_validation_status",
  "xml_candidate_digest",
  "evidence_finality",
  "transportable",
  "created_at",
  "metadata_safe",
].join(", ");

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adapter Supabase de resumen operacional fiscal solo puede cargarse en servidor.",
    );
  }
}

function assertNoError(
  operation: string,
  error: SupabaseFiscalEvidenceOperationalSummaryStoreErrorLike | null,
): asserts error is null {
  if (error) {
    throw new SupabaseFiscalEvidenceOperationalSummaryStoreError(
      operation,
      error,
    );
  }
}

export class SupabaseFiscalEvidenceOperationalSummaryStore
  implements FiscalEvidenceOperationalSummaryStore
{
  constructor(
    private readonly client: SupabaseFiscalEvidenceOperationalSummaryClient,
  ) {}

  async findEvidencePackets(input: {
    readonly userId: string;
    readonly environment: FiscalEvidenceOperationalSummaryEnvironment;
  }): Promise<readonly FiscalEvidenceIntegrityEvidenceRecord[]> {
    const { data, error } = await this.client
      .from("fiscal_evidence_packets")
      .select(EVIDENCE_COLUMNS)
      .eq("user_id", input.userId)
      .eq("environment", input.environment)
      .order("record_sequence", { ascending: true });
    assertNoError("find_fiscal_evidence_packets_for_summary", error);
    return (data ?? []).map(mapFiscalEvidenceIntegrityEvidenceRow);
  }

  async countFiscalTransportAttempts(input: {
    readonly userId: string;
    readonly environment: FiscalEvidenceOperationalSummaryEnvironment;
  }): Promise<number> {
    const { count, error } = await this.client
      .from("fiscal_transport_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.userId)
      .eq("environment", input.environment);
    assertNoError("count_fiscal_transport_attempts_for_summary", error);
    return count ?? 0;
  }
}
