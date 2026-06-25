import type {
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
} from "@/lib/fiscal-operations/types";
import type {
  FiscalChainHeadState,
  FiscalRecordWithChainLocalStagingRecord,
} from "@/lib/fiscal-records/chain-persistence";
import type { FiscalRecordType } from "@/lib/fiscal-records/types";
import type { FiscalPayloadCandidateErrorReason } from "./errors";

export type FiscalPayloadCandidateFormatVersion =
  "phase2b4n-o-payload-candidate-v1";

export type FiscalPayloadCandidateFinality = "candidate_not_aeat";

export interface FiscalPayloadCandidateSafeMetadata {
  readonly source: "local_staging_fiscal_record_chain";
  readonly phase: "PHASE2B4N_O_FISCAL_PAYLOAD_CANDIDATE_LOCAL_ACCEPTANCE_V1";
  readonly aeatReady: false;
  readonly signed: false;
}

export interface FiscalPayloadCandidate {
  readonly payloadCandidateId: string;
  readonly recordId: string;
  readonly operationId: string;
  readonly recordType: FiscalRecordType;
  readonly issuerNif: string;
  readonly numserie: string;
  readonly fechaExpedicion: string;
  readonly recordHash: string;
  readonly previousRecordId: string | null;
  readonly previousHash: string | null;
  readonly recordSequence: number;
  readonly environment: "test" | "production";
  readonly generatedAtCandidate: string;
  readonly formatVersionCandidate: FiscalPayloadCandidateFormatVersion;
  readonly finality: FiscalPayloadCandidateFinality;
  readonly transportable: false;
  readonly candidateXml: string;
  readonly safeMetadata: FiscalPayloadCandidateSafeMetadata;
}

export interface FiscalPayloadCandidateBuildInput {
  readonly record: FiscalRecordWithChainLocalStagingRecord;
  readonly chain: FiscalChainHeadState | null;
  readonly operation: Pick<
    FiscalOperationRecord,
    | "id"
    | "userId"
    | "serverDocumentId"
    | "operationType"
    | "environment"
    | "documentSnapshotHash"
  >;
  readonly invoiceIdentity: FiscalInvoiceIdentityRecord | null;
  readonly generatedAtCandidate?: Date | string;
}

export type FiscalPayloadCandidateBuildResult =
  | {
      status: "built";
      payload: FiscalPayloadCandidate;
    }
  | {
      status: "rejected";
      reason: FiscalPayloadCandidateErrorReason;
      message: string;
    };
