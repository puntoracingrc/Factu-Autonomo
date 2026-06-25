import type { FiscalOperationRecord } from "./types";

export type FiscalOperationProcessingRejectionReason =
  | "operation_not_found"
  | "operation_status_incompatible"
  | "operation_processing_race";

export type FiscalOperationProcessingAtomicity = "postgres_rpc";

export interface FiscalOperationProcessingInput {
  userId: string;
  operationId: string;
  markedAt?: Date | string;
}

export type FiscalOperationProcessingResult =
  | {
      status: "processing";
      operation: FiscalOperationRecord;
      atomicity: FiscalOperationProcessingAtomicity;
    }
  | {
      status: "existing_processing";
      operation: FiscalOperationRecord;
      atomicity: FiscalOperationProcessingAtomicity;
    }
  | {
      status: "rejected";
      reason: FiscalOperationProcessingRejectionReason;
      message: string;
      operation?: FiscalOperationRecord | null;
    }
  | {
      status: "conflict";
      reason: FiscalOperationProcessingRejectionReason;
      message: string;
    };
