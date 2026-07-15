import type {
  FiscalIssueStatus,
  FiscalResolutionStatus,
  FiscalReviewStatus,
} from "@/lib/tax-model-diagnostic/contracts";

export const FISCAL_APPROVAL_CONTRACT_VERSION =
  "fiscal-approval.v1" as const;

export const FISCAL_FEATURE_FLAG_NAMES = [
  "fiscal_rules_shadow_mode",
  "fiscal_rules_approved_results",
  "fiscal_rules_exclusions",
  "document_auto_confirmation",
] as const;

export type FiscalFeatureFlagName =
  (typeof FISCAL_FEATURE_FLAG_NAMES)[number];

export type FiscalFeatureFlags = Readonly<
  Record<FiscalFeatureFlagName, boolean>
>;

export const DEFAULT_FISCAL_FEATURE_FLAGS: FiscalFeatureFlags = Object.freeze({
  fiscal_rules_shadow_mode: false,
  fiscal_rules_approved_results: false,
  fiscal_rules_exclusions: false,
  document_auto_confirmation: false,
});

export type FiscalApprovalInvalidationReason =
  | "FISCAL_HASH_CHANGED"
  | "CONDITION_CHANGED"
  | "EXCEPTION_CHANGED"
  | "SOURCE_SET_CHANGED"
  | "SOURCE_HASH_CHANGED"
  | "FISCAL_YEAR_CHANGED"
  | "TERRITORY_CHANGED"
  | "MATERIAL_TEST_CHANGED";

export interface FiscalMaterialSourceReference {
  sourceId: string;
  contentHash: string;
  normalizedContentHash: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  materialScope: string;
  verificationStatus:
    | "PENDING_FISCAL_REVIEW"
    | "VERIFIED_BY_TWO_FISCAL_REVIEWERS"
    | "STALE"
    | "SUPERSEDED"
    | "UNAVAILABLE";
  materialValidityStatus: "UNVERIFIED" | "VERIFIED" | "STALE";
  materialValidityBasis:
    | "PENDING_FISCAL_REVIEW"
    | "SIGNED_FISCAL_REVIEW";
}

export interface FiscalRuleMaterialSnapshot {
  ruleId: string;
  model: string;
  fiscalYear: number;
  territory: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  conditions: readonly string[];
  factIds: readonly string[];
  decision: string;
  exceptions: readonly string[];
  exclusionIds: readonly string[];
  materialSources: readonly FiscalMaterialSourceReference[];
  materialTestHash: string;
  fiscalHash: string;
}

export interface FiscalApprovalSignatureEvidence {
  decisionId: string;
  reviewerId: string;
  reviewerRole:
    | "PRIMARY_FISCAL_REVIEWER"
    | "SECOND_FISCAL_REVIEWER";
  reviewedRuleHash: string;
  reviewedSourceHashes: readonly FiscalMaterialSourceReference[];
  signatureReference: string;
  evidenceReferences: readonly string[];
  signedAt: string;
  revokedAt: string | null;
  revocationReason: string | null;
}

export interface FiscalRuleApprovalProjection {
  contractVersion: typeof FISCAL_APPROVAL_CONTRACT_VERSION;
  ruleId: string;
  reviewStatus: FiscalReviewStatus;
  resolutionStatus: FiscalResolutionStatus;
  reviewedFiscalHash: string | null;
  primaryDecisionId: string | null;
  secondDecisionId: string | null;
  signatures: readonly FiscalApprovalSignatureEvidence[];
  evidenceReferences: readonly string[];
  authorizedExclusionIds: readonly string[];
  invalidatedAt: string | null;
  invalidationReasons: readonly FiscalApprovalInvalidationReason[];
  history: readonly FiscalApprovalHistoryEntry[];
}

export interface FiscalApprovalHistoryEntry {
  eventId: string;
  eventType:
    | "REVIEW_STARTED"
    | "RULE_APPROVED"
    | "RULE_REJECTED"
    | "APPROVAL_INVALIDATED"
    | "REVIEW_REVOKED";
  occurredAt: string;
  previousReviewStatus: FiscalReviewStatus;
  nextReviewStatus: FiscalReviewStatus;
  previousResolutionStatus: FiscalResolutionStatus;
  nextResolutionStatus: FiscalResolutionStatus;
  fiscalHash: string;
  reasonCodes: readonly string[];
  decisionIds: readonly string[];
}

export interface FiscalIssueTransition {
  issueId: string;
  previousStatus: FiscalIssueStatus;
  nextStatus: FiscalIssueStatus;
  occurredAt: string;
  evidenceReferences: readonly string[];
  verifiedBy: string | null;
}

export interface FiscalRollbackAuditEvent {
  eventType: "FISCAL_FLAGS_ROLLBACK";
  occurredAt: string;
  reasonCode: string;
  disabledFlags: readonly FiscalFeatureFlagName[];
  fallbackAllModels: "ENABLED";
  preservesAssessmentHistory: true;
  preservesApprovalAudit: true;
}

export interface FiscalRollbackResult {
  flags: FiscalFeatureFlags;
  effectiveMode: "ORIENTATIVE";
  exclusionsEnabled: false;
  allModelsAvailable: true;
  auditEvent: FiscalRollbackAuditEvent;
}

export interface FiscalRuntimeApprovalState {
  reviewStatus: FiscalReviewStatus;
  resolutionStatus: FiscalResolutionStatus;
}

export interface FiscalRuntimeState {
  flags: FiscalFeatureFlags;
  fiscalMode: "ORIENTATIVE" | "APPROVED_RESULTS";
  allModelsFallback: "ENABLED";
  shadowMode: "DISABLED" | "ENABLED_NON_MUTATING";
  exclusions: "BLOCKED" | "INDIVIDUAL_AUTHORIZATION_REQUIRED";
  documentAutoConfirmation: "BLOCKED" | "INDIVIDUAL_GUARDS_REQUIRED";
}
