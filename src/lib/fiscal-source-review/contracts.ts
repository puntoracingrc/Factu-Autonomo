import type {
  FiscalReviewerRole,
  FiscalSourceStatus,
} from "@/lib/tax-model-diagnostic/contracts";

export const FISCAL_SOURCE_REGISTRY_VERSION =
  "fiscal-source-registry.v2" as const;
export const FISCAL_REVIEW_REGISTRY_VERSION =
  "fiscal-review-registry.v2" as const;

export type FiscalSourceRegistryVersion =
  typeof FISCAL_SOURCE_REGISTRY_VERSION;
export type FiscalReviewRegistryVersion =
  typeof FISCAL_REVIEW_REGISTRY_VERSION;
export type Sha256Hash = `sha256:${string}`;

export type FiscalSourceVerificationStatus =
  | "PENDING_FISCAL_REVIEW"
  | "VERIFIED_BY_TWO_FISCAL_REVIEWERS"
  | "STALE"
  | "SUPERSEDED"
  | "UNAVAILABLE";

export interface FiscalSourceMaterialValidity {
  status: "UNVERIFIED" | "VERIFIED" | "STALE";
  effectiveFrom: string | null;
  effectiveTo: string | null;
  basis: "PENDING_FISCAL_REVIEW" | "SIGNED_FISCAL_REVIEW";
}

export type FiscalSourceChangeNature =
  | "INITIAL"
  | "NONE"
  | "MATERIAL"
  | "TECHNICAL"
  | "INDETERMINATE";

export interface FiscalSourceChangeSummary {
  status: "INITIAL_CAPTURE" | "UNCHANGED" | "CHANGED";
  nature: FiscalSourceChangeNature;
  requiresFiscalReview: boolean;
  changedFields: readonly string[];
}

export interface FiscalSourceSnapshot {
  sourceId: string;
  authority: "AEAT" | "BOE" | "SEGURIDAD_SOCIAL" | "EU";
  title: string;
  officialLocator: string;
  finalOfficialLocator: string;
  retrievedAt: string;
  declaredOfficialUpdatedAt: string | null;
  materialValidity: FiscalSourceMaterialValidity;
  contentHash: Sha256Hash;
  normalizedContentHash: Sha256Hash;
  previousSnapshotHash: Sha256Hash | null;
  changeDetected: boolean;
  changeSummary: FiscalSourceChangeSummary;
  contentLength: number;
  contentType: string;
  captureScope: "FULL_DOCUMENT" | "LOCATOR_FRAGMENT";
  snapshotPath: string;
  materialScope: string;
  affectedRuleIds: readonly string[];
  verificationStatus: FiscalSourceVerificationStatus;
  technicalHashStatus: "VALID";
}

export interface FiscalSourceSnapshotRegistry {
  contractVersion: FiscalSourceRegistryVersion;
  generatedAt: string;
  registryHash: Sha256Hash;
  sourceCount: number;
  sources: readonly FiscalSourceSnapshot[];
}

export type FiscalReviewDecisionValue =
  | "APPROVE"
  | "REJECT"
  | "REQUEST_CHANGES";

export interface FiscalReviewFinding {
  findingId: string;
  severity: "INFO" | "WARNING" | "BLOCKING";
  summary: string;
}

export interface FiscalReviewerServerTrust {
  status: "SERVER_VERIFIED" | "UNVERIFIED" | "REVOKED";
  subjectType: "FISCAL_PROFESSIONAL";
  identityProvider: string;
  verifiedAt: string | null;
  verificationReference: string | null;
}

export type FiscalReviewRevocation =
  | {
      status: "ACTIVE";
      revokedAt: null;
      reason: null;
      revocationReference: null;
    }
  | {
      status: "REVOKED";
      revokedAt: string;
      reason: string;
      revocationReference: string;
    };

export interface FiscalRuleReviewDecision {
  decisionId: string;
  ruleId: string;
  reviewerId: string;
  reviewerRole: Extract<
    FiscalReviewerRole,
    "PRIMARY_FISCAL_REVIEWER" | "SECOND_FISCAL_REVIEWER"
  >;
  reviewerTrust: FiscalReviewerServerTrust;
  decision: FiscalReviewDecisionValue;
  reviewedRuleHash: string;
  reviewedSourceHashes: readonly {
    sourceId: string;
    contentHash: Sha256Hash;
    normalizedContentHash: Sha256Hash;
  }[];
  findings: readonly FiscalReviewFinding[];
  incidentIds: readonly string[];
  signatureReference: string;
  recordedAt: string;
  origin: "HUMAN_FISCAL_PROFESSIONAL";
  revocation: FiscalReviewRevocation;
}

export interface FiscalReviewRegistry {
  contractVersion: FiscalReviewRegistryVersion;
  generatedAt: string;
  decisions: readonly FiscalRuleReviewDecision[];
}

export type FiscalDualReviewState =
  | "WAITING_PRIMARY_REVIEW"
  | "WAITING_SECOND_REVIEW"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | "STALE_REVIEW"
  | "INVALID_REVIEW"
  | "ELIGIBLE_FOR_MANUAL_APPROVAL";

export interface FiscalDualReviewEvaluation {
  ruleId: string;
  state: FiscalDualReviewState;
  validDecisionIds: readonly string[];
  invalidDecisionIds: readonly string[];
  revokedDecisionIds: readonly string[];
  blockingReasons: readonly string[];
  changesRuleReviewStatus: false;
  sourceStatus: FiscalSourceStatus;
}

export interface FiscalSourceDiffEntry {
  sourceId: string;
  changeType: "NEW" | "MODIFIED" | "REMOVED";
  changeNature: Exclude<FiscalSourceChangeNature, "INITIAL" | "NONE">;
  reviewRequirement: "REQUIRES_FISCAL_REVIEW";
  changeSummary: string;
  changedFields: readonly string[];
  affectedRuleIds: readonly string[];
}

export interface FiscalSourceDiffReport {
  contractVersion: "fiscal-source-diff.v2";
  baselineRegistryHash: string;
  candidateRegistryHash: string;
  status: "CLEAN" | "CHANGED_REQUIRES_FISCAL_REVIEW";
  changes: readonly FiscalSourceDiffEntry[];
  affectedRuleIds: readonly string[];
  decisionIdsToRevoke: readonly string[];
  ruleApprovalsToInvalidate: readonly string[];
  automaticallyIrrelevantChanges: readonly [];
}

export type FiscalReviewAction =
  | FiscalReviewDecisionValue
  | "REVOKE_DECISION";

export interface CompactFiscalReviewView {
  ruleId: string;
  model: string;
  fiscalYear: number;
  conditions: readonly string[];
  exceptions: readonly string[];
  testIds: readonly string[];
  sources: readonly {
    sourceId: string;
    title: string;
    officialLocator: string;
    materialScope: string;
    affectedRuleIds: readonly string[];
    materialValidity: FiscalSourceMaterialValidity;
    contentHash: string;
    normalizedContentHash: string;
    previousSnapshotHash: string | null;
    changeDetected: boolean;
    changeSummary: FiscalSourceChangeSummary;
    verificationStatus: FiscalSourceVerificationStatus;
  }[];
  decisions: readonly {
    decisionId: string;
    reviewerId: string;
    reviewerRole: FiscalRuleReviewDecision["reviewerRole"];
    decision: FiscalReviewDecisionValue;
    trustStatus: FiscalReviewerServerTrust["status"];
    revocationStatus: FiscalReviewRevocation["status"];
    reviewedRuleHash: string;
    recordedAt: string;
  }[];
  incidents: readonly string[];
  hashes: {
    ruleHash: string;
    sourceContentHashes: readonly string[];
    sourceNormalizedHashes: readonly string[];
  };
  reviewState: FiscalDualReviewState;
  availableActions: readonly FiscalReviewAction[];
  automaticApproval: false;
}
