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

export const FISCAL_RECORD_LOCAL_STAGING_SCHEMA_VERSION =
  "phase2b4l-local-staging-v1";

export type FiscalRecordLocalPersistenceRejectionReason =
  | "operation_not_found"
  | "operation_not_processing"
  | "invoice_identity_missing"
  | "issuer_nif_missing"
  | "numserie_missing"
  | "fecha_expedicion_missing"
  | "document_snapshot_hash_missing"
  | "record_hash_missing"
  | "unsupported_hash_algorithm"
  | "unsupported_schema_version"
  | "unsupported_operation_type";

export type FiscalRecordLocalPersistenceConflictReason =
  "record_chain_head_changed";

export interface FiscalRecordHeadCandidate {
  readonly id: string;
  readonly recordHash: string;
  readonly recordSequence: number;
}

export interface FiscalRecordLocalStagingRecord {
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
  readonly schemaVersion: "phase2b4l-local-staging-v1";
  readonly rendererVersion: string | null;
  readonly createdAt: string;
}

export interface FiscalRecordLocalStagingCreateInput {
  readonly userId: string;
  readonly operationId: string;
  readonly expectedPreviousRecordId: string | null;
  readonly expectedPreviousHash: string | null;
  readonly recordHash: string;
  readonly hashAlgorithm: "sha256-candidate";
  readonly recordTimestamp: string;
  readonly schemaVersion: "phase2b4l-local-staging-v1";
  readonly rendererVersion?: string | null;
}

export type FiscalRecordLocalStagingStoreResult =
  | {
      status: "created" | "existing";
      record: FiscalRecordLocalStagingRecord;
      atomicity: "postgres_rpc";
    }
  | {
      status: "rejected";
      reason: FiscalRecordLocalPersistenceRejectionReason;
      message: string;
    }
  | {
      status: "conflict";
      reason: FiscalRecordLocalPersistenceConflictReason;
      message: string;
    };

export interface FiscalRecordLocalStagingRepositoryStore {
  findLatestFiscalRecordHead(input: {
    userId: string;
    environment: "test" | "production";
    issuerNif: string;
  }): Promise<FiscalRecordHeadCandidate | null>;
  createFiscalRecordLocalStaging(
    input: FiscalRecordLocalStagingCreateInput,
  ): Promise<FiscalRecordLocalStagingStoreResult>;
}

export interface FiscalRecordLocalStagingRepositoryInput {
  readonly operation: FiscalOperationRecord;
  readonly invoiceIdentity: FiscalInvoiceIdentityRecord | null;
  readonly serverDocument?: Pick<
    ServerDocumentRecord,
    "id" | "snapshotHash" | "pdfContentHash"
  > | null;
  readonly recordTimestamp?: Date | string;
  readonly rendererVersion?: string | null;
}

export type FiscalRecordLocalStagingRepositoryResult =
  | {
      status: "created" | "existing";
      record: FiscalRecordLocalStagingRecord;
      material: FiscalRecordMaterialCandidate;
      recordCandidate: FiscalRecordCandidate;
      chainLinkCandidate: FiscalChainLinkCandidate;
      atomicity: "postgres_rpc";
    }
  | {
      status: "rejected";
      reason: FiscalRecordLocalPersistenceRejectionReason;
      message: string;
    }
  | {
      status: "conflict";
      reason: FiscalRecordLocalPersistenceConflictReason;
      message: string;
    };

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El repositorio de registros fiscales solo puede cargarse en servidor.",
    );
  }
}

function isoDateTime(value: Date | string | undefined): string {
  if (!value) return new Date().toISOString();
  return typeof value === "string" ? value : value.toISOString();
}

export class FiscalRecordLocalStagingRepository {
  constructor(
    private readonly store: FiscalRecordLocalStagingRepositoryStore,
  ) {}

  async persistFiscalRecordLocalStaging(
    input: FiscalRecordLocalStagingRepositoryInput,
  ): Promise<FiscalRecordLocalStagingRepositoryResult> {
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
    const previous = await this.store.findLatestFiscalRecordHead({
      userId: input.operation.userId,
      environment: input.operation.environment,
      issuerNif: recordCandidate.issuerNif,
    });
    const chainLinkCandidate = buildFiscalChainLinkCandidate({
      record: recordCandidate,
      previousRecordId: previous?.id ?? null,
      previousHash: previous?.recordHash ?? null,
    });
    const result = await this.store.createFiscalRecordLocalStaging({
      userId: input.operation.userId,
      operationId: input.operation.id,
      expectedPreviousRecordId: previous?.id ?? null,
      expectedPreviousHash: previous?.recordHash ?? null,
      recordHash: chainLinkCandidate.technicalHashCandidate,
      hashAlgorithm: chainLinkCandidate.hashAlgorithmCandidate,
      recordTimestamp,
      schemaVersion: FISCAL_RECORD_LOCAL_STAGING_SCHEMA_VERSION,
      rendererVersion: input.rendererVersion ?? null,
    });

    if (result.status === "rejected" || result.status === "conflict") {
      return result;
    }

    return {
      status: result.status,
      record: result.record,
      material,
      recordCandidate,
      chainLinkCandidate,
      atomicity: result.atomicity,
    };
  }
}
