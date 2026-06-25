import type {
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
  FiscalOperationType,
} from "@/lib/fiscal-operations/types";
import type { ServerDocumentRecord } from "@/lib/server-documents/types";

export type FiscalRecordTypeCandidate = FiscalOperationType;

export interface FiscalRecordMaterialDryRunInput {
  operation: FiscalOperationRecord;
  invoiceIdentity: FiscalInvoiceIdentityRecord | null;
  serverDocument?: Pick<
    ServerDocumentRecord,
    "id" | "snapshotHash" | "pdfContentHash"
  > | null;
  createdAt?: Date | string;
}

export interface FiscalRecordMaterialHashInputCandidate {
  readonly marker: "PHASE2B4G_DRY_RUN_CANDIDATE";
  readonly operationId: string;
  readonly invoiceIdentityId: string;
  readonly serverDocumentId: string;
  readonly operationType: FiscalOperationType;
  readonly recordTypeCandidate: FiscalRecordTypeCandidate;
  readonly environment: "test" | "production";
  readonly issuerNif: string;
  readonly numserie: string;
  readonly fechaExpedicion: string;
  readonly documentSnapshotHash: string;
  readonly pdfContentHash: string | null;
  readonly schemaVersionCandidate: string;
}

export interface FiscalRecordMaterialCandidate {
  readonly dryRun: true;
  readonly finality: "preliminary_not_aeat";
  readonly operationId: string;
  readonly invoiceIdentityId: string;
  readonly serverDocumentId: string;
  readonly operationType: FiscalOperationType;
  readonly recordTypeCandidate: FiscalRecordTypeCandidate;
  readonly issuerNif: string;
  readonly numserie: string;
  readonly fechaExpedicion: string;
  readonly documentSnapshotHash: string;
  readonly pdfContentHash: string | null;
  readonly schemaVersionCandidate: string;
  readonly hashInputCandidate: string;
  readonly createdAtCandidate: string;
}
