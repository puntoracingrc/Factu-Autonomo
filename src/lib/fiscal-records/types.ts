import type {
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
  FiscalOperationType,
} from "@/lib/fiscal-operations/types";
import type { FiscalRecordMaterialCandidate } from "@/lib/fiscal-record-material/types";
import type { FiscalRecordErrorReason } from "./errors";

export type FiscalRecordType = "alta" | "anulacion";

export type FiscalRecordSchemaVersion =
  "phase2b4j-record-candidate-v1";

export interface FiscalRecordBuildInput {
  operation: Pick<
    FiscalOperationRecord,
    | "id"
    | "status"
    | "serverDocumentId"
    | "operationType"
    | "environment"
    | "documentSnapshotHash"
  >;
  invoiceIdentity: FiscalInvoiceIdentityRecord | null;
  material: FiscalRecordMaterialCandidate;
  recordTimestampCandidate?: Date | string;
}

export interface FiscalRecordHashInputCandidate {
  readonly marker: "PHASE2B4J_RECORD_HASH_INPUT_CANDIDATE";
  readonly operationId: string;
  readonly invoiceIdentityId: string;
  readonly serverDocumentId: string;
  readonly operationType: FiscalOperationType;
  readonly recordTypeCandidate: FiscalRecordType;
  readonly environment: "test" | "production";
  readonly issuerNif: string;
  readonly numserie: string;
  readonly fechaExpedicion: string;
  readonly documentSnapshotHash: string;
  readonly pdfContentHash: string | null;
  readonly recordTimestampCandidate: string;
  readonly schemaVersionCandidate: FiscalRecordSchemaVersion;
}

export interface FiscalRecordCandidate {
  readonly candidate: true;
  readonly finality: "candidate_not_aeat";
  readonly operationId: string;
  readonly invoiceIdentityId: string;
  readonly serverDocumentId: string;
  readonly operationType: FiscalOperationType;
  readonly recordTypeCandidate: FiscalRecordType;
  readonly environment: "test" | "production";
  readonly issuerNif: string;
  readonly numserie: string;
  readonly fechaExpedicion: string;
  readonly documentSnapshotHash: string;
  readonly pdfContentHash: string | null;
  readonly schemaVersionCandidate: FiscalRecordSchemaVersion;
  readonly recordTimestampCandidate: string;
  readonly hashInputCandidate: string;
}

export type FiscalRecordBuildResult =
  | {
      status: "built";
      record: FiscalRecordCandidate;
    }
  | {
      status: "rejected";
      reason: FiscalRecordErrorReason;
      message: string;
    };
