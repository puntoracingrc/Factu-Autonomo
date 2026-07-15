import type {
  FiscalApprovalEvidence,
  FiscalExclusionCandidate,
  FiscalIssueReference,
  FiscalRulesetAuthorizationMetadata,
  FiscalTerritory,
  TaxRule,
} from "@/lib/tax-model-diagnostic/contracts";

export const EXCLUSION_AUTHORIZATION_BLOCKING_REASONS = [
  "GLOBAL_RULESET_NOT_APPROVED",
  "GLOBAL_RULESET_NOT_RESOLVED",
  "RULE_NOT_APPROVED",
  "RULE_NOT_RESOLVED",
  "EXCLUSION_NOT_APPROVED",
  "EXCLUSION_NOT_RESOLVED",
  "TESTS_NOT_PASSING",
  "SOURCE_NOT_VERIFIED",
  "SOURCE_SNAPSHOT_HASH_MISSING",
  "SOURCE_STALE",
  "EFFECTIVE_DATE_NOT_CONFIRMED",
  "FISCAL_YEAR_MISMATCH",
  "TERRITORY_MISMATCH",
  "PRIMARY_REVIEWER_MISSING",
  "SECOND_REVIEWER_MISSING",
  "APPROVED_RULE_HASH_MISSING",
  "APPROVED_RULE_HASH_MISMATCH",
  "APPROVAL_EVIDENCE_MISSING",
  "APPROVAL_EVIDENCE_NOT_VERIFIED",
  "OPEN_FISCAL_ISSUES",
  "UNKNOWN_FACTS",
  "CONTRADICTORY_FACTS",
  "EXCLUSION_EFFECT_NOT_EXECUTABLE",
  "INTERNAL_OVERRIDE_NOT_AUTHORIZED",
] as const;

export type ExclusionAuthorizationBlockingReason =
  (typeof EXCLUSION_AUTHORIZATION_BLOCKING_REASONS)[number];

export interface RuleExclusionFactState {
  hasUnknownRequiredFacts: boolean;
  hasContradictoryFacts: boolean;
}

export interface AuthorizeRuleExclusionInput {
  ruleset: FiscalRulesetAuthorizationMetadata;
  rule: TaxRule;
  exclusionCandidate: FiscalExclusionCandidate;
  targetFiscalYear: number;
  targetTerritory: FiscalTerritory;
  ruleHash: string;
  approvalEvidence: FiscalApprovalEvidence | null;
  issues: readonly FiscalIssueReference[];
  issueRegistryComplete: boolean;
  facts: RuleExclusionFactState;
  internalOverrideRequested: boolean;
  evaluatedAt: string;
}

export interface ExclusionAuthorizationResult {
  authorized: boolean;
  ruleId: string;
  exclusionId: string;
  model: string;
  blockingReasons: readonly ExclusionAuthorizationBlockingReason[];
  warnings: readonly string[];
  evaluatedAt: string;
  evaluatedRuleHash: string;
  approvedRuleHash: string | null;
  evidenceIds: readonly string[];
}

const OPEN_ISSUE_STATES = new Set([
  "OPEN",
  "IN_PROGRESS",
  "READY_FOR_VERIFICATION",
  "REOPENED",
]);

const STALE_SOURCE_STATES = new Set([
  "STALE",
  "SUPERSEDED",
  "UNAVAILABLE",
]);

function isIsoDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/u.test(value));
}

function coversFiscalYear(
  effectiveFrom: string | null,
  effectiveTo: string | null,
  fiscalYear: number,
): boolean {
  if (!isIsoDate(effectiveFrom)) return false;
  const firstDay = `${fiscalYear}-01-01`;
  const lastDay = `${fiscalYear}-12-31`;
  return effectiveFrom <= firstDay &&
    (effectiveTo === null || (isIsoDate(effectiveTo) && effectiveTo >= lastDay));
}

function hasReviewerRole(
  reviewer: TaxRule["fiscalMetadata"]["review"][
    | "primaryFiscalReviewer"
    | "secondFiscalReviewer"
  ],
  expectedRole:
    | "PRIMARY_FISCAL_REVIEWER"
    | "SECOND_FISCAL_REVIEWER",
): boolean {
  return Boolean(
    reviewer &&
      reviewer.role === expectedRole &&
      reviewer.reviewerId.length > 0 &&
      reviewer.identityProvider.length > 0 &&
      reviewer.verificationId.length > 0,
  );
}

/**
 * Puerta fiscal individual. La hora se recibe como dato para conservar pureza
 * y reproducibilidad: esta función no consulta reloj, red, almacenamiento ni
 * estado global.
 */
export function authorizeRuleExclusion(
  input: AuthorizeRuleExclusionInput,
): ExclusionAuthorizationResult {
  const reasons: ExclusionAuthorizationBlockingReason[] = [];
  const add = (reason: ExclusionAuthorizationBlockingReason) => {
    if (!reasons.includes(reason)) reasons.push(reason);
  };
  const metadata = input.rule.fiscalMetadata;
  const review = metadata.review;

  if (
    input.ruleset.reviewStatus !== "APPROVED" ||
    input.ruleset.rulesetId !== metadata.rulesetId
  ) {
    add("GLOBAL_RULESET_NOT_APPROVED");
  }
  if (input.ruleset.resolutionStatus !== "RESOLVED") {
    add("GLOBAL_RULESET_NOT_RESOLVED");
  }
  if (review.reviewStatus !== "APPROVED") add("RULE_NOT_APPROVED");
  if (review.resolutionStatus !== "RESOLVED") add("RULE_NOT_RESOLVED");
  if (input.exclusionCandidate.reviewStatus !== "APPROVED") {
    add("EXCLUSION_NOT_APPROVED");
  }
  if (input.exclusionCandidate.resolutionStatus !== "RESOLVED") {
    add("EXCLUSION_NOT_RESOLVED");
  }
  if (review.testsStatus !== "PASSING") add("TESTS_NOT_PASSING");

  const requiredSources = input.exclusionCandidate.sourceIds;
  const snapshots = metadata.sourceSnapshots.filter((snapshot) =>
    requiredSources.includes(snapshot.sourceId),
  );
  if (
    review.sourceStatus !== "VERIFIED" ||
    requiredSources.length === 0 ||
    snapshots.length !== requiredSources.length ||
    snapshots.some((snapshot) => snapshot.status !== "VERIFIED")
  ) {
    add("SOURCE_NOT_VERIFIED");
  }
  if (
    snapshots.length !== requiredSources.length ||
    snapshots.some((snapshot) => !snapshot.snapshotHash)
  ) {
    add("SOURCE_SNAPSHOT_HASH_MISSING");
  }
  if (
    STALE_SOURCE_STATES.has(review.sourceStatus) ||
    snapshots.some((snapshot) => STALE_SOURCE_STATES.has(snapshot.status))
  ) {
    add("SOURCE_STALE");
  }
  if (
    !coversFiscalYear(
      metadata.effectiveFrom,
      metadata.effectiveTo,
      input.targetFiscalYear,
    ) ||
    snapshots.some(
      (snapshot) =>
        !coversFiscalYear(
          snapshot.effectiveFrom,
          snapshot.effectiveTo,
          input.targetFiscalYear,
        ),
    )
  ) {
    add("EFFECTIVE_DATE_NOT_CONFIRMED");
  }
  if (
    metadata.fiscalYear !== input.targetFiscalYear ||
    input.rule.fiscalYear !== input.targetFiscalYear
  ) {
    add("FISCAL_YEAR_MISMATCH");
  }
  if (
    metadata.territory !== input.targetTerritory ||
    input.rule.territory !== input.targetTerritory
  ) {
    add("TERRITORY_MISMATCH");
  }
  if (
    !hasReviewerRole(
      review.primaryFiscalReviewer,
      "PRIMARY_FISCAL_REVIEWER",
    )
  ) {
    add("PRIMARY_REVIEWER_MISSING");
  }
  if (
    !hasReviewerRole(
      review.secondFiscalReviewer,
      "SECOND_FISCAL_REVIEWER",
    )
  ) {
    add("SECOND_REVIEWER_MISSING");
  }
  if (!review.approvedRuleHash) add("APPROVED_RULE_HASH_MISSING");
  if (
    review.approvedRuleHash !== input.ruleHash ||
    metadata.ruleHash !== input.ruleHash
  ) {
    add("APPROVED_RULE_HASH_MISMATCH");
  }
  if (!input.approvalEvidence || !review.approvalEvidenceId) {
    add("APPROVAL_EVIDENCE_MISSING");
  }
  if (
    !input.approvalEvidence?.verified ||
    review.approvalEvidenceVerified !== true ||
    input.approvalEvidence?.evidenceId !== review.approvalEvidenceId ||
    input.approvalEvidence?.ruleHash !== input.ruleHash
  ) {
    add("APPROVAL_EVIDENCE_NOT_VERIFIED");
  }
  if (
    input.internalOverrideRequested ||
    input.approvalEvidence?.origin === "INTERNAL_OVERRIDE" ||
    review.approvalEvidenceOrigin !== "SIGNED_FISCAL_ARTIFACT"
  ) {
    add("INTERNAL_OVERRIDE_NOT_AUTHORIZED");
  }

  const issueById = new Map(input.issues.map((issue) => [issue.issueId, issue]));
  if (
    !input.issueRegistryComplete ||
    review.issueIds.some(
      (issueId) => issueById.get(issueId)?.status !== "VERIFIED",
    ) ||
    input.issues.some((issue) => OPEN_ISSUE_STATES.has(issue.status))
  ) {
    add("OPEN_FISCAL_ISSUES");
  }
  if (input.facts.hasUnknownRequiredFacts) add("UNKNOWN_FACTS");
  if (input.facts.hasContradictoryFacts) add("CONTRADICTORY_FACTS");

  const registeredCandidate = metadata.exclusionCandidates.find(
    (candidate) =>
      candidate.exclusionId === input.exclusionCandidate.exclusionId,
  );
  if (
    input.exclusionCandidate.effectType !== "EXCLUDE_MODEL" ||
    input.exclusionCandidate.model !== metadata.model ||
    registeredCandidate?.effectType !== "EXCLUDE_MODEL"
  ) {
    add("EXCLUSION_EFFECT_NOT_EXECUTABLE");
  }

  const evidenceIds = [
    ...(input.approvalEvidence?.verified
      ? [input.approvalEvidence.evidenceId]
      : []),
    ...input.issues
      .filter((issue) => issue.status === "VERIFIED")
      .map((issue) => issue.issueId),
  ];

  return Object.freeze({
    authorized: reasons.length === 0,
    ruleId: input.rule.ruleId,
    exclusionId: input.exclusionCandidate.exclusionId,
    model: input.exclusionCandidate.model,
    blockingReasons: Object.freeze(reasons),
    warnings: Object.freeze([]),
    evaluatedAt: input.evaluatedAt,
    evaluatedRuleHash: input.ruleHash,
    approvedRuleHash: review.approvedRuleHash,
    evidenceIds: Object.freeze([...new Set(evidenceIds)].sort()),
  });
}

