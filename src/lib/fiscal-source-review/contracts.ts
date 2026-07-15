import type {
  FiscalReviewerRole,
  FiscalSourceStatus,
} from "@/lib/tax-model-diagnostic/contracts";

export const FISCAL_SOURCE_REGISTRY_VERSION =
  "fiscal-source-registry.v1" as const;
export const FISCAL_REVIEW_REGISTRY_VERSION =
  "fiscal-review-registry.v1" as const;

export type FiscalSourceRegistryVersion =
  typeof FISCAL_SOURCE_REGISTRY_VERSION;
export type FiscalReviewRegistryVersion =
  typeof FISCAL_REVIEW_REGISTRY_VERSION;

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

export interface FiscalSourceSnapshotRecord {
  sourceId: string;
  authority: "AEAT" | "BOE" | "SEGURIDAD_SOCIAL" | "EU";
  title: string;
  officialLocator: string;
  finalOfficialLocator: string;
  retrievedAt: string;
  declaredOfficialUpdatedAt: string | null;
  materialValidity: FiscalSourceMaterialValidity;
  snapshotHash: `sha256:${string}`;
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
  registryHash: `sha256:${string}`;
  sourceCount: number;
  sources: readonly FiscalSourceSnapshotRecord[];
}

export type FiscalReviewDecision =
  | "APPROVE"
  | "REJECT"
  | "REQUEST_CHANGES";

export interface FiscalReviewFinding {
  findingId: string;
  severity: "INFO" | "WARNING" | "BLOCKING";
  summary: string;
}

export interface FiscalRuleReviewRecord {
  reviewId: string;
  ruleId: string;
  reviewerId: string;
  reviewerRole: Extract<
    FiscalReviewerRole,
    "PRIMARY_FISCAL_REVIEWER" | "SECOND_FISCAL_REVIEWER"
  >;
  decision: FiscalReviewDecision;
  reviewedRuleHash: string;
  reviewedSourceHashes: readonly {
    sourceId: string;
    snapshotHash: `sha256:${string}`;
  }[];
  findings: readonly FiscalReviewFinding[];
  incidentIds: readonly string[];
  signatureReference: string;
  recordedAt: string;
  origin: "HUMAN_SIGNED_FISCAL_REVIEW";
}

export interface FiscalReviewRegistry {
  contractVersion: FiscalReviewRegistryVersion;
  generatedAt: string;
  records: readonly FiscalRuleReviewRecord[];
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
  validReviewIds: readonly string[];
  invalidReviewIds: readonly string[];
  blockingReasons: readonly string[];
  changesRuleReviewStatus: false;
  sourceStatus: FiscalSourceStatus;
}

export interface FiscalSourceDiffEntry {
  sourceId: string;
  changeType: "NEW" | "MODIFIED" | "REMOVED";
  changedFields: readonly string[];
  affectedRuleIds: readonly string[];
}

export interface FiscalSourceDiffReport {
  contractVersion: "fiscal-source-diff.v1";
  baselineRegistryHash: string;
  candidateRegistryHash: string;
  status: "CLEAN" | "CHANGED";
  changes: readonly FiscalSourceDiffEntry[];
  affectedRuleIds: readonly string[];
  reviewIdsToInvalidate: readonly string[];
  ruleApprovalsToInvalidate: readonly string[];
}

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
    materialScope: string;
    snapshotHash: string;
    verificationStatus: FiscalSourceVerificationStatus;
  }[];
  incidents: readonly string[];
  hashes: {
    ruleHash: string;
    sourceHashes: readonly string[];
  };
  reviewState: FiscalDualReviewState;
  availableDecisions: readonly FiscalReviewDecision[];
  automaticApproval: false;
}
