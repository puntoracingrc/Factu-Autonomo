import type {
  FiscalEnvironment,
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
  FiscalOperationType,
} from "./types";
import type { ServerDocumentRecord } from "@/lib/server-documents/types";

export type FiscalOperationTransactionRejectionReason =
  | "missing_expected_document_version"
  | "document_not_found"
  | "document_version_conflict"
  | "document_not_eligible"
  | "snapshot_hash_missing"
  | "issuer_nif_missing"
  | "numserie_missing"
  | "issue_date_missing"
  | "unsupported_operation"
  | "invalid_environment"
  | "operation_race"
  | "identity_race";

export interface FiscalOperationTransactionInput {
  userId: string;
  serverDocumentId: string;
  operationType: FiscalOperationType | string;
  environment: FiscalEnvironment | string;
  expectedDocumentVersion?: number;
  idempotencyKey?: string;
  requestedBy: string;
  requestedAt?: Date | string;
}

export interface FiscalOperationTransactionPlan {
  userId: string;
  serverDocumentId: string;
  operationType: FiscalOperationType;
  environment: FiscalEnvironment;
  expectedDocumentVersion: number;
  idempotencyKey: string;
  requestedBy: string;
  requestedAt?: Date | string;
}

export type FiscalOperationTransactionResult =
  | {
      status: "created";
      operation: FiscalOperationRecord;
      invoiceIdentity: FiscalInvoiceIdentityRecord;
      atomicity: "simulated_local";
    }
  | {
      status: "existing";
      operation: FiscalOperationRecord;
      invoiceIdentity?: FiscalInvoiceIdentityRecord | null;
      atomicity: "simulated_local";
    }
  | {
      status: "rejected";
      reason: FiscalOperationTransactionRejectionReason;
      message: string;
    }
  | {
      status: "conflict";
      reason: FiscalOperationTransactionRejectionReason;
      message: string;
    };

export interface FiscalOperationTransactionStore {
  withFiscalOperationTransaction<T>(
    callback: (transaction: FiscalOperationTransactionScope) => Promise<T>,
  ): Promise<T>;
}

export interface FiscalOperationTransactionScope {
  findServerDocumentForFiscalOperation(
    userId: string,
    serverDocumentId: string,
  ): Promise<ServerDocumentRecord | null>;
  findOperationByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<FiscalOperationRecord | null>;
  findInvoiceIdentity(
    userId: string,
    environment: FiscalEnvironment,
    issuerNif: string,
    numserie: string,
    fechaExpedicion: string,
  ): Promise<FiscalInvoiceIdentityRecord | null>;
  createInvoiceIdentity(
    identity: Omit<FiscalInvoiceIdentityRecord, "id" | "createdAt">,
  ): Promise<FiscalInvoiceIdentityRecord>;
  createFiscalOperation(
    operation: Omit<
      FiscalOperationRecord,
      "id" | "createdAt" | "updatedAt"
    >,
  ): Promise<FiscalOperationRecord>;
}

export interface FiscalOperationTransactionOptions {
  now?: () => string;
}
