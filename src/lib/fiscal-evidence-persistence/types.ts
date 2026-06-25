import type { FiscalEvidencePacket } from "@/lib/fiscal-evidence-packet";
import type { FiscalPayloadCandidate } from "@/lib/fiscal-payload-candidate";
import type { FiscalPayloadValidationResult } from "@/lib/fiscal-payload-validation";
import type {
  FiscalChainHeadState,
  FiscalRecordWithChainLocalStagingRecord,
} from "@/lib/fiscal-records";

export const FISCAL_EVIDENCE_PERSISTENCE_PHASE_MARKER =
  "PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1";

export type FiscalEvidencePersistenceRejectionReason =
  | "record_not_found"
  | "payload_candidate_missing"
  | "payload_validation_not_valid"
  | "payload_packet_mismatch"
  | "record_packet_mismatch"
  | "xml_candidate_digest_invalid"
  | "evidence_finality_invalid"
  | "transportable_not_allowed"
  | "metadata_unsafe";

export type FiscalEvidencePersistenceConflictReason =
  | "chain_state_missing"
  | "chain_state_inconsistent";

export interface FiscalEvidencePersistenceRecord {
  readonly id: string;
  readonly userId: string;
  readonly environment: "test" | "production";
  readonly recordId: string;
  readonly operationId: string;
  readonly recordSequence: number;
  readonly recordHash: string;
  readonly previousHash: string | null;
  readonly payloadCandidateId: string;
  readonly payloadValidationStatus: "valid";
  readonly xmlCandidateDigest: string | null;
  readonly evidenceFinality: "internal_dry_run_evidence";
  readonly transportable: false;
  readonly createdAt: string;
  readonly metadataSafe: FiscalEvidenceSafeMetadata;
}

export interface FiscalEvidenceSafeMetadata {
  readonly phase: typeof FISCAL_EVIDENCE_PERSISTENCE_PHASE_MARKER;
  readonly evidencePacketPhase: FiscalEvidencePacket["safeMetadata"]["phase"];
  readonly source: "local_staging_internal_evidence";
  readonly includesFullXml: false;
  readonly includesDocumentMaterial: false;
  readonly signed: false;
  readonly aeatReady: false;
  readonly payloadXmlMarkerPresent: boolean;
}

export interface FiscalEvidencePersistenceInput {
  readonly record: FiscalRecordWithChainLocalStagingRecord;
  readonly chain: FiscalChainHeadState;
  readonly payload: FiscalPayloadCandidate;
  readonly validation: FiscalPayloadValidationResult;
  readonly packet: FiscalEvidencePacket;
  readonly createdAt?: Date | string;
}

export interface FiscalEvidencePersistenceCreateInput {
  readonly userId: string;
  readonly recordId: string;
  readonly payloadCandidateId: string;
  readonly payloadValidationStatus: "valid";
  readonly xmlCandidateDigest: string | null;
  readonly evidenceFinality: "internal_dry_run_evidence";
  readonly transportable: false;
  readonly metadataSafe: FiscalEvidenceSafeMetadata;
  readonly createdAt: string;
}

export type FiscalEvidencePersistenceStoreResult =
  | {
      readonly status: "created" | "existing";
      readonly evidence: FiscalEvidencePersistenceRecord;
      readonly atomicity: "postgres_rpc";
    }
  | {
      readonly status: "rejected";
      readonly reason: FiscalEvidencePersistenceRejectionReason;
      readonly message: string;
    }
  | {
      readonly status: "conflict";
      readonly reason: FiscalEvidencePersistenceConflictReason;
      readonly message: string;
    };

export type FiscalEvidencePersistenceRepositoryResult =
  FiscalEvidencePersistenceStoreResult;

export interface FiscalEvidencePersistenceStore {
  createFiscalEvidencePacketLocalStaging(
    input: FiscalEvidencePersistenceCreateInput,
  ): Promise<FiscalEvidencePersistenceStoreResult>;
}
