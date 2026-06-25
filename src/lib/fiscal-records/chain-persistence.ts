import { buildFiscalChainLinkCandidate } from "@/lib/fiscal-chain";
import { buildFiscalRecordMaterialDryRun } from "@/lib/fiscal-record-material";
import { buildFiscalRecordCandidate } from "./record-builder";
import type { FiscalChainLinkCandidate } from "@/lib/fiscal-chain";
import type {
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
} from "@/lib/fiscal-operations/types";
import type { FiscalRecordMaterialCandidate } from "@/lib/fiscal-record-material/types";
import type { ServerDocumentRecord } from "@/lib/server-documents/types";
import type { FiscalRecordCandidate, FiscalRecordType } from "./types";

assertServerOnlyModule();

export const FISCAL_RECORD_CHAIN_LOCAL_STAGING_SCHEMA_VERSION =
  "phase2b4m-chain-local-staging-v1";

export type FiscalRecordChainPersistenceRejectionReason =
  | "operation_not_found"
  | "operation_not_processing"
  | "invoice_identity_missing"
  | "identity_or_snapshot_missing"
  | "record_hash_invalid"
  | "unsupported_hash_algorithm"
  | "unsupported_schema_version"
  | "unsupported_operation_type";

export type FiscalRecordChainPersistenceConflictReason =
  | "record_chain_head_changed"
  | "existing_record_without_chain"
  | "chain_state_unavailable";

export interface FiscalChainHeadState {
  readonly userId: string;
  readonly environment: "test" | "production";
  readonly issuerNif: string;
  readonly lastRecordId: string | null;
  readonly lastHash: string | null;
  readonly recordCount: number;
  readonly updatedAt: string;
}

export interface FiscalRecordWithChainLocalStagingRecord {
  readonly id: string;
  readonly userId: string;
  readonly operationId: string;
  readonly invoiceIdentityId: string;
  readonly serverDocumentId: string;
  readonly environment: "test" | "production";
  readonly issuerNif: string;
  readonly numserie: string;
  readonly fechaExpedicion: string;
  readonly recordTypeCandidate: FiscalRecordType;
  readonly recordSequence: number;
  readonly previousRecordId: string | null;
  readonly previousHash: string | null;
  readonly recordHash: string;
  readonly hashAlgorithm: "sha256-candidate";
  readonly recordTimestamp: string;
  readonly documentSnapshotHash: string;
  readonly pdfContentHash: string | null;
  readonly schemaVersion: "phase2b4m-chain-local-staging-v1";
  readonly rendererVersion: string | null;
  readonly createdAt: string;
}

export interface FiscalRecordWithChainCreateInput {
  readonly userId: string;
  readonly operationId: string;
  readonly expectedPreviousRecordId: string | null;
  readonly expectedPreviousHash: string | null;
  readonly recordHash: string;
  readonly hashAlgorithm: "sha256-candidate";
  readonly recordTimestamp: string;
  readonly schemaVersion: "phase2b4m-chain-local-staging-v1";
  readonly rendererVersion?: string | null;
}

export type FiscalRecordWithChainStoreResult =
  | {
      status: "created" | "existing";
      record: FiscalRecordWithChainLocalStagingRecord;
      chain: FiscalChainHeadState;
      atomicity: "postgres_rpc";
    }
  | {
      status: "rejected";
      reason: FiscalRecordChainPersistenceRejectionReason;
      message: string;
    }
  | {
      status: "conflict";
      reason: FiscalRecordChainPersistenceConflictReason;
      message: string;
    };

export interface FiscalRecordWithChainRepositoryStore {
  findFiscalChainHead(input: {
    userId: string;
    environment: "test" | "production";
    issuerNif: string;
  }): Promise<FiscalChainHeadState | null>;
  createFiscalRecordWithChainLocalStaging(
    input: FiscalRecordWithChainCreateInput,
  ): Promise<FiscalRecordWithChainStoreResult>;
}

export interface FiscalRecordWithChainRepositoryInput {
  readonly operation: FiscalOperationRecord;
  readonly invoiceIdentity: FiscalInvoiceIdentityRecord | null;
  readonly serverDocument?: Pick<
    ServerDocumentRecord,
    "id" | "snapshotHash" | "pdfContentHash"
  > | null;
  readonly recordTimestamp?: Date | string;
  readonly rendererVersion?: string | null;
}

export type FiscalRecordWithChainRepositoryResult =
  | {
      status: "created" | "existing";
      record: FiscalRecordWithChainLocalStagingRecord;
      chain: FiscalChainHeadState;
      material: FiscalRecordMaterialCandidate;
      recordCandidate: FiscalRecordCandidate;
      chainLinkCandidate: FiscalChainLinkCandidate;
      atomicity: "postgres_rpc";
      attempts: number;
    }
  | {
      status: "rejected";
      reason: FiscalRecordChainPersistenceRejectionReason;
      message: string;
      attempts: number;
    }
  | {
      status: "conflict";
      reason: FiscalRecordChainPersistenceConflictReason;
      message: string;
      attempts: number;
    };

export interface FiscalRecordWithChainRepositoryOptions {
  readonly maxChainRetries?: number;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El repositorio atomico de registros fiscales solo puede cargarse en servidor.",
    );
  }
}

function isoDateTime(value: Date | string | undefined): string {
  if (!value) return new Date().toISOString();
  return typeof value === "string" ? value : value.toISOString();
}

export function normalizeCandidateTechnicalHashForPersistence(
  value: string,
): string {
  return value.replace(/^candidate_not_final:/, "");
}

export class FiscalRecordWithChainLocalStagingRepository {
  private readonly maxChainRetries: number;

  constructor(
    private readonly store: FiscalRecordWithChainRepositoryStore,
    options: FiscalRecordWithChainRepositoryOptions = {},
  ) {
    this.maxChainRetries = options.maxChainRetries ?? 3;
  }

  async persistFiscalRecordWithChainLocalStaging(
    input: FiscalRecordWithChainRepositoryInput,
  ): Promise<FiscalRecordWithChainRepositoryResult> {
    const recordTimestamp = isoDateTime(input.recordTimestamp);
    const material = buildFiscalRecordMaterialDryRun({
      operation: input.operation,
      invoiceIdentity: input.invoiceIdentity,
      serverDocument: input.serverDocument ?? null,
      createdAt: recordTimestamp,
    });
    const recordCandidate = buildFiscalRecordCandidate({
      operation: input.operation,
      invoiceIdentity: input.invoiceIdentity,
      material,
      recordTimestampCandidate: recordTimestamp,
    });

    for (let attempt = 1; attempt <= this.maxChainRetries; attempt += 1) {
      const head = await this.store.findFiscalChainHead({
        userId: input.operation.userId,
        environment: input.operation.environment,
        issuerNif: recordCandidate.issuerNif,
      });
      const previousRecordId = head?.lastRecordId ?? null;
      const previousHash = head?.lastHash ?? null;
      const chainLinkCandidate = buildFiscalChainLinkCandidate({
        record: recordCandidate,
        previousRecordId,
        previousHash,
      });
      const persistableRecordHash = normalizeCandidateTechnicalHashForPersistence(
        chainLinkCandidate.technicalHashCandidate,
      );
      const result = await this.store.createFiscalRecordWithChainLocalStaging({
        userId: input.operation.userId,
        operationId: input.operation.id,
        expectedPreviousRecordId: previousRecordId,
        expectedPreviousHash: previousHash,
        recordHash: persistableRecordHash,
        hashAlgorithm: chainLinkCandidate.hashAlgorithmCandidate,
        recordTimestamp,
        schemaVersion: FISCAL_RECORD_CHAIN_LOCAL_STAGING_SCHEMA_VERSION,
        rendererVersion: input.rendererVersion ?? null,
      });

      if (
        result.status === "conflict" &&
        result.reason === "record_chain_head_changed" &&
        attempt < this.maxChainRetries
      ) {
        continue;
      }

      if (result.status === "rejected" || result.status === "conflict") {
        return {
          ...result,
          attempts: attempt,
        };
      }

      return {
        status: result.status,
        record: result.record,
        chain: result.chain,
        material,
        recordCandidate,
        chainLinkCandidate,
        atomicity: result.atomicity,
        attempts: attempt,
      };
    }

    return {
      status: "conflict",
      reason: "record_chain_head_changed",
      message: "La cabecera local de cadena cambio demasiadas veces.",
      attempts: this.maxChainRetries,
    };
  }
}
