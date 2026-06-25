import type {
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
  FiscalOperationType,
} from "@/lib/fiscal-operations/types";
import type {
  FiscalOperationProcessingInput,
  FiscalOperationProcessingResult,
} from "@/lib/fiscal-operations/processing-types";
import type {
  FiscalOperationTransactionInput,
  FiscalOperationTransactionResult,
  FiscalOperationTransactionRejectionReason,
} from "@/lib/fiscal-operations/transaction-types";
import type {
  FiscalOperationProcessingRejectionReason,
} from "@/lib/fiscal-operations/processing-types";
import type { ServerDocumentRecord } from "@/lib/server-documents/types";

export type FiscalOperationDryRunPipelineStatus =
  | "material_built"
  | "rejected"
  | "conflict";

export type FiscalOperationDryRunPipelineReservationStatus =
  | "reserved"
  | "existing";

export type FiscalOperationDryRunPipelineRejectionReason =
  | FiscalOperationTransactionRejectionReason
  | FiscalOperationProcessingRejectionReason
  | "material_document_not_found"
  | "material_identity_not_found"
  | "material_build_failed";

export type FiscalOperationDryRunPipelineConflictReason =
  | FiscalOperationTransactionRejectionReason
  | "operation_processing_race";

export interface FiscalOperationDryRunPipelineInput
  extends FiscalOperationTransactionInput {
  processingAt?: Date | string;
  materialCreatedAt?: Date | string;
}

export interface FiscalOperationDryRunReservationStore {
  reserveFiscalOperation(
    input: FiscalOperationTransactionInput,
  ): Promise<FiscalOperationTransactionResult>;
}

export interface FiscalOperationDryRunProcessingStore {
  markFiscalOperationProcessing(
    input: FiscalOperationProcessingInput,
  ): Promise<FiscalOperationProcessingResult>;
}

export interface FiscalOperationDryRunLookupStore {
  findServerDocumentForFiscalOperation(
    userId: string,
    serverDocumentId: string,
  ): Promise<
    Pick<
      ServerDocumentRecord,
      | "id"
      | "userId"
      | "snapshotHash"
      | "pdfContentHash"
      | "issuerNif"
      | "numserie"
      | "issueDate"
    > | null
  >;
  findInvoiceIdentityForMaterial(
    input: FiscalOperationDryRunMaterialLookupInput,
  ): Promise<FiscalInvoiceIdentityRecord | null>;
}

export interface FiscalOperationDryRunMaterialLookupInput {
  operation: FiscalOperationRecord;
  serverDocument: Pick<
    ServerDocumentRecord,
    "userId" | "issuerNif" | "numserie" | "issueDate"
  >;
}

export interface FiscalOperationDryRunPipelineDependencies {
  reservationStore: FiscalOperationDryRunReservationStore;
  processingStore: FiscalOperationDryRunProcessingStore;
  lookupStore: FiscalOperationDryRunLookupStore;
}

export interface FiscalOperationDryRunPlan {
  userId: string;
  serverDocumentId: string;
  operationType: FiscalOperationType;
  environment: "test" | "production";
  expectedDocumentVersion: number;
  requestedBy: string;
  dryRun: true;
}

export interface FiscalOperationDryRunMaterialSummary {
  operationId: string;
  invoiceIdentityId: string;
  serverDocumentId: string;
  operationType: FiscalOperationType;
  dryRun: true;
  finality: "preliminary_not_aeat";
  schemaVersionCandidate: string;
  documentSnapshotHashPresent: boolean;
  pdfContentHashPresent: boolean;
  hashInputCandidateLength: number;
}

export type FiscalOperationDryRunPipelineResult =
  | {
      status: "material_built";
      reservation: FiscalOperationDryRunPipelineReservationStatus;
      processing: "processing" | "existing_processing";
      operationId: string;
      invoiceIdentityId: string;
      serverDocumentId: string;
      operationType: FiscalOperationType;
      dryRun: true;
      material: FiscalOperationDryRunMaterialSummary;
    }
  | {
      status: "rejected";
      reason: FiscalOperationDryRunPipelineRejectionReason;
      message: string;
      operationId?: string;
      serverDocumentId?: string;
      dryRun: true;
    }
  | {
      status: "conflict";
      reason: FiscalOperationDryRunPipelineConflictReason;
      message: string;
      dryRun: true;
    };
