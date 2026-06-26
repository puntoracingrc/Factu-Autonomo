import type { SyntheticCandidatePipelineErrorCode } from "./errors";
import type { SyntheticFixtureKind } from "../verifactu-synthetic-fixtures/types";

export const SYNTHETIC_CANDIDATE_CANONICAL_VERSION =
  "phase2b6d-candidate-canonical-v1";

export const SYNTHETIC_CANDIDATE_HASH_ALGORITHM = "sha256-candidate-v1";

export const SYNTHETIC_XML_CANDIDATE_SCHEMA_VERSION = "phase2b6f-v1";

export const SYNTHETIC_CANDIDATE_XML_NAMESPACE =
  "urn:factura-autonomo:synthetic:fiscal-candidate:v1";

export type SyntheticCandidatePipelinePhase =
  | "input"
  | "canonicalization"
  | "hash"
  | "xml_candidate"
  | "local_validation"
  | "pipeline";

export type SyntheticCandidatePipelineFinality = "candidate_not_aeat";

export type SyntheticCandidateExpectedOutcome =
  | "accepted_candidate"
  | "rejected_candidate";

export type SyntheticCandidateRejectionReason =
  | "invalid_nif_candidate"
  | "invalid_date_candidate"
  | "missing_series_number_candidate"
  | "candidate_hash_mismatch";

export interface SyntheticCandidatePipelineError {
  readonly code: SyntheticCandidatePipelineErrorCode;
  readonly message: string;
  readonly phase: SyntheticCandidatePipelinePhase;
  readonly descriptorId?: string;
  readonly kind?: SyntheticFixtureKind;
  readonly path?: string;
}

export interface SyntheticCandidateRecordInput {
  readonly descriptorId: string;
  readonly kind: SyntheticFixtureKind;
  readonly syntheticOnly: true;
  readonly sourcePhase: string;
  readonly issuerReference: string;
  readonly invoiceReference: string;
  readonly issueDateCandidate: string;
  readonly operationReference: string;
  readonly recordSequenceCandidate: number;
  readonly previousCandidateHash: string | null;
  readonly amountMinorCandidate: number;
  readonly currencyCandidate: string;
  readonly expectedOutcome: SyntheticCandidateExpectedOutcome;
  readonly expectedRejectionReason?: SyntheticCandidateRejectionReason;
}

export type CandidateInputBuildResult =
  | {
      readonly status: "built";
      readonly input: SyntheticCandidateRecordInput;
      readonly errors: [];
    }
  | {
      readonly status: "rejected";
      readonly errors: readonly SyntheticCandidatePipelineError[];
    };

export interface CandidateCanonicalField {
  readonly name: string;
  readonly value: string;
}

export interface CandidateCanonicalMaterial {
  readonly version: typeof SYNTHETIC_CANDIDATE_CANONICAL_VERSION;
  readonly finality: SyntheticCandidatePipelineFinality;
  readonly syntheticOnly: true;
  readonly descriptorId: string;
  readonly kind: SyntheticFixtureKind;
  readonly fields: readonly CandidateCanonicalField[];
  readonly canonicalText: string;
  readonly byteLength: number;
}

export interface CandidateCanonicalSafeSummary {
  readonly version: typeof SYNTHETIC_CANDIDATE_CANONICAL_VERSION;
  readonly finality: SyntheticCandidatePipelineFinality;
  readonly syntheticOnly: true;
  readonly descriptorId: string;
  readonly kind: SyntheticFixtureKind;
  readonly fieldCount: number;
  readonly byteLength: number;
}

export type CandidateCanonicalizationResult =
  | {
      readonly status: "canonicalized";
      readonly material: CandidateCanonicalMaterial;
      readonly safeSummary: CandidateCanonicalSafeSummary;
      readonly errors: [];
    }
  | {
      readonly status: "rejected";
      readonly errors: readonly SyntheticCandidatePipelineError[];
    };

export interface CandidateHashArtifact {
  readonly algorithm: typeof SYNTHETIC_CANDIDATE_HASH_ALGORITHM;
  readonly digest: string;
  readonly hex: string;
  readonly byteLength: number;
  readonly descriptorId: string;
  readonly kind: SyntheticFixtureKind;
  readonly finality: SyntheticCandidatePipelineFinality;
  readonly officialFingerprint: false;
  readonly canonicalVersion: typeof SYNTHETIC_CANDIDATE_CANONICAL_VERSION;
}

export type CandidateHashSafeSummary = Omit<CandidateHashArtifact, "hex">;

export type CandidateHashBuildResult =
  | {
      readonly status: "hashed";
      readonly hash: CandidateHashArtifact;
      readonly safeSummary: CandidateHashSafeSummary;
      readonly errors: [];
    }
  | {
      readonly status: "rejected";
      readonly errors: readonly SyntheticCandidatePipelineError[];
    };

export interface SyntheticXmlCandidateSafeSummary {
  readonly schemaVersionCandidate: typeof SYNTHETIC_XML_CANDIDATE_SCHEMA_VERSION;
  readonly namespace: typeof SYNTHETIC_CANDIDATE_XML_NAMESPACE;
  readonly descriptorId: string;
  readonly kind: SyntheticFixtureKind;
  readonly finality: SyntheticCandidatePipelineFinality;
  readonly syntheticOnly: true;
  readonly transportable: false;
  readonly digest: string;
  readonly byteLength: number;
  readonly candidateHashDigest: string;
}

export interface SyntheticXmlCandidateArtifact {
  readonly schemaVersionCandidate: typeof SYNTHETIC_XML_CANDIDATE_SCHEMA_VERSION;
  readonly namespace: typeof SYNTHETIC_CANDIDATE_XML_NAMESPACE;
  readonly descriptorId: string;
  readonly kind: SyntheticFixtureKind;
  readonly finality: SyntheticCandidatePipelineFinality;
  readonly syntheticOnly: true;
  readonly transportable: false;
  readonly digest: string;
  readonly byteLength: number;
  readonly candidateHashDigest: string;
  getXmlForLocalValidation(): string;
  toJSON(): SyntheticXmlCandidateSafeSummary;
}

export type SyntheticXmlCandidateBuildResult =
  | {
      readonly status: "built";
      readonly artifact: SyntheticXmlCandidateArtifact;
      readonly safeSummary: SyntheticXmlCandidateSafeSummary;
      readonly errors: [];
    }
  | {
      readonly status: "rejected";
      readonly errors: readonly SyntheticCandidatePipelineError[];
    };

export type SyntheticXmlCandidateValidationResult =
  | {
      readonly status: "accepted";
      readonly safeSummary: SyntheticXmlCandidateSafeSummary;
      readonly errors: [];
    }
  | {
      readonly status: "rejected";
      readonly safeSummary?: SyntheticXmlCandidateSafeSummary;
      readonly errors: readonly SyntheticCandidatePipelineError[];
    };

export type SyntheticCandidatePipelineResult =
  | {
      readonly status: "accepted";
      readonly descriptorId: string;
      readonly kind: SyntheticFixtureKind;
      readonly finality: SyntheticCandidatePipelineFinality;
      readonly syntheticOnly: true;
      readonly transportable: false;
      readonly canonical: CandidateCanonicalSafeSummary;
      readonly hash: CandidateHashSafeSummary;
      readonly xmlCandidate: SyntheticXmlCandidateSafeSummary;
      readonly localValidation: SyntheticXmlCandidateValidationResult;
      readonly errors: [];
    }
  | {
      readonly status: "rejected";
      readonly descriptorId?: string;
      readonly kind?: SyntheticFixtureKind;
      readonly finality: SyntheticCandidatePipelineFinality;
      readonly syntheticOnly: true;
      readonly transportable: false;
      readonly rejectionReason?: SyntheticCandidateRejectionReason;
      readonly canonical?: CandidateCanonicalSafeSummary;
      readonly hash?: CandidateHashSafeSummary;
      readonly errors: readonly SyntheticCandidatePipelineError[];
    };
