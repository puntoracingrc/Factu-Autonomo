export const FISCAL_EVIDENCE_INTEGRITY_PHASE_MARKER =
  "PHASE2B4T_FISCAL_EVIDENCE_READ_INTEGRITY_V1";

export const FISCAL_EVIDENCE_PERSISTENCE_PHASE_MARKER =
  "PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1";

export type FiscalEvidenceIntegrityEnvironment = "test" | "production";

export type FiscalEvidenceIntegrityStatus =
  | "valid"
  | "missing_record"
  | "missing_chain"
  | "mismatch"
  | "unsafe_metadata"
  | "rejected";

export type FiscalEvidenceIntegrityRejectionReason =
  | "user_id_missing"
  | "evidence_not_found"
  | "payload_validation_status_invalid"
  | "transportable_not_false"
  | "evidence_finality_invalid"
  | "xml_candidate_digest_missing"
  | "xml_candidate_digest_invalid";

export type FiscalEvidenceIntegrityUnsafeReason =
  | "metadata_not_object"
  | "metadata_sensitive_marker"
  | "metadata_phase_invalid"
  | "metadata_flags_invalid";

export type FiscalEvidenceIntegrityMismatchField =
  | "user_id"
  | "environment"
  | "record_id"
  | "operation_id"
  | "record_sequence"
  | "record_hash"
  | "previous_hash"
  | "issuer_nif"
  | "chain_record_count"
  | "chain_last_record_id"
  | "chain_last_hash";

export interface FiscalEvidenceIntegrityReadInput {
  readonly userId: string;
  readonly recordId?: string;
  readonly operationId?: string;
  readonly environment?: FiscalEvidenceIntegrityEnvironment;
}

export interface FiscalEvidenceIntegrityEvidenceRecord {
  readonly id: string;
  readonly userId: string;
  readonly environment: FiscalEvidenceIntegrityEnvironment;
  readonly recordId: string;
  readonly operationId: string;
  readonly recordSequence: number;
  readonly recordHash: string;
  readonly previousHash: string | null;
  readonly payloadCandidateId: string;
  readonly payloadValidationStatus: string;
  readonly xmlCandidateDigest: string | null;
  readonly evidenceFinality: string;
  readonly transportable: boolean;
  readonly createdAt: string;
  readonly metadataSafe: unknown;
}

export interface FiscalEvidenceIntegrityFiscalRecord {
  readonly id: string;
  readonly userId: string;
  readonly operationId: string;
  readonly environment: FiscalEvidenceIntegrityEnvironment;
  readonly issuerNif: string;
  readonly recordSequence: number;
  readonly recordHash: string;
  readonly previousHash: string | null;
}

export interface FiscalEvidenceIntegrityChainState {
  readonly userId: string;
  readonly environment: FiscalEvidenceIntegrityEnvironment;
  readonly issuerNif: string;
  readonly lastRecordId: string | null;
  readonly lastHash: string | null;
  readonly recordCount: number;
  readonly updatedAt: string;
}

export interface FiscalEvidenceIntegrityStore {
  findEvidencePackets(
    input: FiscalEvidenceIntegrityReadInput,
  ): Promise<readonly FiscalEvidenceIntegrityEvidenceRecord[]>;
  findFiscalRecord(input: {
    readonly userId: string;
    readonly recordId: string;
  }): Promise<FiscalEvidenceIntegrityFiscalRecord | null>;
  findFiscalChainState(input: {
    readonly userId: string;
    readonly environment: FiscalEvidenceIntegrityEnvironment;
    readonly issuerNif: string;
  }): Promise<FiscalEvidenceIntegrityChainState | null>;
}

export interface FiscalEvidenceIntegrityMetadataSummary {
  readonly phase: typeof FISCAL_EVIDENCE_PERSISTENCE_PHASE_MARKER;
  readonly evidencePacketPhase:
    | "PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1"
    | null;
  readonly source: "local_staging_internal_evidence" | null;
  readonly includesFullXml: false;
  readonly includesDocumentMaterial: false;
  readonly signed: false;
  readonly aeatReady: false;
  readonly payloadXmlMarkerPresent: boolean | null;
}

export interface FiscalEvidenceIntegrityEvidenceSummary {
  readonly id: string;
  readonly userId: string;
  readonly environment: FiscalEvidenceIntegrityEnvironment;
  readonly recordId: string;
  readonly operationId: string;
  readonly recordSequence: number;
  readonly recordHash: string;
  readonly previousHash: string | null;
  readonly payloadCandidateId: string;
  readonly payloadValidationStatus: string;
  readonly xmlCandidateDigest: string | null;
  readonly evidenceFinality: string;
  readonly transportable: boolean;
  readonly createdAt: string;
  readonly metadata?: FiscalEvidenceIntegrityMetadataSummary;
}

export interface FiscalEvidenceIntegrityCheck {
  readonly name: string;
  readonly ok: boolean;
}

export interface FiscalEvidenceIntegrityMismatch {
  readonly field: FiscalEvidenceIntegrityMismatchField;
  readonly source: "fiscal_records" | "fiscal_chain_state";
  readonly evidenceValue: string | number | null;
  readonly referenceValue: string | number | null;
}

export interface FiscalEvidenceIntegrityValidResult {
  readonly phase: typeof FISCAL_EVIDENCE_INTEGRITY_PHASE_MARKER;
  readonly status: "valid";
  readonly evidence: FiscalEvidenceIntegrityEvidenceSummary;
  readonly checks: readonly FiscalEvidenceIntegrityCheck[];
}

export interface FiscalEvidenceIntegrityMissingRecordResult {
  readonly phase: typeof FISCAL_EVIDENCE_INTEGRITY_PHASE_MARKER;
  readonly status: "missing_record";
  readonly evidence: FiscalEvidenceIntegrityEvidenceSummary;
  readonly checks: readonly FiscalEvidenceIntegrityCheck[];
}

export interface FiscalEvidenceIntegrityMissingChainResult {
  readonly phase: typeof FISCAL_EVIDENCE_INTEGRITY_PHASE_MARKER;
  readonly status: "missing_chain";
  readonly evidence: FiscalEvidenceIntegrityEvidenceSummary;
  readonly checks: readonly FiscalEvidenceIntegrityCheck[];
}

export interface FiscalEvidenceIntegrityMismatchResult {
  readonly phase: typeof FISCAL_EVIDENCE_INTEGRITY_PHASE_MARKER;
  readonly status: "mismatch";
  readonly evidence: FiscalEvidenceIntegrityEvidenceSummary;
  readonly mismatches: readonly FiscalEvidenceIntegrityMismatch[];
  readonly checks: readonly FiscalEvidenceIntegrityCheck[];
}

export interface FiscalEvidenceIntegrityUnsafeMetadataResult {
  readonly phase: typeof FISCAL_EVIDENCE_INTEGRITY_PHASE_MARKER;
  readonly status: "unsafe_metadata";
  readonly evidence: FiscalEvidenceIntegrityEvidenceSummary;
  readonly reasons: readonly FiscalEvidenceIntegrityUnsafeReason[];
  readonly checks: readonly FiscalEvidenceIntegrityCheck[];
}

export interface FiscalEvidenceIntegrityRejectedResult {
  readonly phase: typeof FISCAL_EVIDENCE_INTEGRITY_PHASE_MARKER;
  readonly status: "rejected";
  readonly reason: FiscalEvidenceIntegrityRejectionReason;
  readonly message: string;
  readonly evidence?: FiscalEvidenceIntegrityEvidenceSummary;
  readonly checks: readonly FiscalEvidenceIntegrityCheck[];
}

export type FiscalEvidenceIntegrityResult =
  | FiscalEvidenceIntegrityValidResult
  | FiscalEvidenceIntegrityMissingRecordResult
  | FiscalEvidenceIntegrityMissingChainResult
  | FiscalEvidenceIntegrityMismatchResult
  | FiscalEvidenceIntegrityUnsafeMetadataResult
  | FiscalEvidenceIntegrityRejectedResult;
