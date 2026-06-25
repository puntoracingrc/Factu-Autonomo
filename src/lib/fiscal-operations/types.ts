import type { ServerDocumentRecord } from "@/lib/server-documents/types";

export type FiscalOperationType =
  | "alta_inicial"
  | "alta_subsanacion"
  | "anulacion";

export type FiscalEnvironment = "test" | "production";

export type FiscalOperationStatus =
  | "requested"
  | "processing"
  | "completed"
  | "failed_retryable"
  | "failed_final";

export type FiscalOperationErrorReason =
  | "document_not_eligible"
  | "snapshot_hash_missing"
  | "issuer_nif_missing"
  | "numserie_missing"
  | "issue_date_missing"
  | "expected_document_version_missing"
  | "unsupported_operation"
  | "invalid_environment";

export interface FiscalInvoiceIdentity {
  environment: FiscalEnvironment;
  issuerNif: string;
  numserie: string;
  fechaExpedicion: string;
}

export interface FiscalOperationDraft {
  userId: string;
  serverDocumentId: string;
  operationType: FiscalOperationType;
  environment: FiscalEnvironment;
  invoiceIdentity: FiscalInvoiceIdentity;
  idempotencyKey: string;
  requestedBy: string;
  requestedAt: string;
  expectedDocumentVersion: number;
  documentSnapshotHash: string;
  status: "requested";
  authority: "server_document";
}

export type FiscalOperationDecision =
  | {
      status: "accepted";
      operation: FiscalOperationDraft;
    }
  | {
      status: "rejected";
      reason: FiscalOperationErrorReason;
      message: string;
    };

export interface FiscalOperationBuildInput {
  serverDocument: ServerDocumentRecord;
  operationType: FiscalOperationType | string;
  environment: FiscalEnvironment | string;
  expectedDocumentVersion?: number;
  requestedBy: string;
  requestedAt?: Date | string;
}
