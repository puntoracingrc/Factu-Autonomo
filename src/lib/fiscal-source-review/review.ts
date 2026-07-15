import type { TaxRule } from "@/lib/tax-model-diagnostic/contracts";

import type {
  CompactFiscalReviewView,
  FiscalDualReviewEvaluation,
  FiscalReviewRegistry,
  FiscalRuleReviewDecision,
  FiscalSourceSnapshotRegistry,
} from "./contracts";
import { sourceRecordMap } from "./core";

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function currentDecisionErrors(
  decision: FiscalRuleReviewDecision,
  rule: TaxRule,
  sourceRegistry: FiscalSourceSnapshotRegistry,
  expectedRuleHash: string,
): string[] {
  const errors: string[] = [];
  const trust = decision.reviewerTrust;
  const technical = decision.reviewerRole === "TECHNICAL_REVIEWER";
  const expectedOrigin = technical
    ? "HUMAN_TECHNICAL_REVIEWER"
    : "HUMAN_FISCAL_PROFESSIONAL";
  const expectedSubject = technical
    ? "TECHNICAL_REVIEWER"
    : "FISCAL_PROFESSIONAL";
  if (
    decision.origin !== "HUMAN_FISCAL_PROFESSIONAL" &&
    decision.origin !== "HUMAN_TECHNICAL_REVIEWER"
  ) {
    errors.push("AUTOMATED_OR_NON_FISCAL_REVIEW_FORBIDDEN");
  }
  if (decision.origin !== expectedOrigin) {
    errors.push("REVIEWER_IDENTITY_ROLE_MISMATCH");
  }
  if (
    !trust ||
    trust.status !== "SERVER_VERIFIED" ||
    trust.subjectType !== expectedSubject ||
    !trust.identityProvider.trim() ||
    !trust.verifiedAt ||
    !trust.verificationReference?.trim()
  ) {
    errors.push("SERVER_VERIFIED_REVIEWER_IDENTITY_REQUIRED");
  }
  if (!decision.signatureReference.trim()) {
    errors.push("MISSING_SIGNATURE_REFERENCE");
  }
  if (
    decision.decision === "APPROVE" &&
    decision.findings.some((finding) => finding.severity === "BLOCKING")
  ) {
    errors.push("APPROVE_WITH_BLOCKING_FINDINGS");
  }
  if (decision.reviewedRuleHash !== expectedRuleHash) {
    errors.push("STALE_RULE_HASH");
  }
  const sourceById = sourceRecordMap(sourceRegistry);
  const expectedSourceIds = [...rule.officialSourceIds].sort(compareText);
  const reviewedSourceIds = decision.reviewedSourceHashes
    .map((source) => source.sourceId)
    .sort(compareText);
  if (JSON.stringify(expectedSourceIds) !== JSON.stringify(reviewedSourceIds)) {
    errors.push("INCOMPLETE_SOURCE_SET");
  }
  for (const source of decision.reviewedSourceHashes) {
    const current = sourceById.get(source.sourceId);
    if (current?.contentHash !== source.contentHash) {
      errors.push(`STALE_SOURCE_CONTENT_HASH:${source.sourceId}`);
    }
    if (current?.normalizedContentHash !== source.normalizedContentHash) {
      errors.push(`STALE_SOURCE_NORMALIZED_HASH:${source.sourceId}`);
    }
  }
  return errors;
}

export function evaluateDualFiscalReview(
  rule: TaxRule,
  sourceRegistry: FiscalSourceSnapshotRegistry,
  reviewRegistry: FiscalReviewRegistry,
  expectedRuleHash: string = rule.fiscalMetadata.ruleHash,
): FiscalDualReviewEvaluation {
  const ruleDecisions = reviewRegistry.decisions.filter(
    (decision) => decision.ruleId === rule.ruleId,
  );
  const revoked = ruleDecisions.filter(
    (decision) => decision.revocation.status === "REVOKED",
  );
  const active = ruleDecisions.filter(
    (decision) => decision.revocation.status === "ACTIVE",
  );
  const invalid = active.filter(
    (decision) =>
      currentDecisionErrors(decision, rule, sourceRegistry, expectedRuleHash)
        .length > 0,
  );
  const valid = active.filter(
    (decision) =>
      currentDecisionErrors(decision, rule, sourceRegistry, expectedRuleHash)
        .length === 0,
  );
  const blockingReasons = invalid.flatMap((decision) =>
    currentDecisionErrors(decision, rule, sourceRegistry, expectedRuleHash).map(
      (error) => `${decision.decisionId}:${error}`,
    ),
  );
  const primaryDecisions = valid.filter(
    (decision) => decision.reviewerRole === "PRIMARY_FISCAL_REVIEWER",
  );
  const secondDecisions = valid.filter(
    (decision) => decision.reviewerRole === "SECOND_FISCAL_REVIEWER",
  );
  const primary = primaryDecisions[0];
  const second = secondDecisions[0];
  const hasStaleReview = blockingReasons.some(
    (reason) =>
      reason.includes(":STALE_RULE_HASH") ||
      reason.includes(":STALE_SOURCE_CONTENT_HASH:") ||
      reason.includes(":STALE_SOURCE_NORMALIZED_HASH:"),
  );

  let state: FiscalDualReviewEvaluation["state"];
  if (invalid.length > 0) {
    state = hasStaleReview ? "STALE_REVIEW" : "INVALID_REVIEW";
  } else if (primaryDecisions.length > 1 || secondDecisions.length > 1) {
    state = "INVALID_REVIEW";
    if (primaryDecisions.length > 1) {
      blockingReasons.push("MULTIPLE_PRIMARY_REVIEWS");
    }
    if (secondDecisions.length > 1) {
      blockingReasons.push("MULTIPLE_SECOND_REVIEWS");
    }
  } else if (!primary) {
    state = "WAITING_PRIMARY_REVIEW";
  } else if (!second) {
    state = "WAITING_SECOND_REVIEW";
  } else if (primary.reviewerId === second.reviewerId) {
    state = "INVALID_REVIEW";
    blockingReasons.push("SAME_REVIEWER_FOR_BOTH_ROLES");
  } else if (
    primary.decision === "REJECT" ||
    second.decision === "REJECT"
  ) {
    state = "REJECTED";
  } else if (
    primary.decision === "REQUEST_CHANGES" ||
    second.decision === "REQUEST_CHANGES"
  ) {
    state = "CHANGES_REQUESTED";
  } else {
    state = "ELIGIBLE_FOR_MANUAL_APPROVAL";
  }

  return {
    ruleId: rule.ruleId,
    state,
    validDecisionIds: valid
      .map((decision) => decision.decisionId)
      .sort(compareText),
    invalidDecisionIds: invalid
      .map((decision) => decision.decisionId)
      .sort(compareText),
    revokedDecisionIds: revoked
      .map((decision) => decision.decisionId)
      .sort(compareText),
    blockingReasons: [...new Set(blockingReasons)].sort(compareText),
    changesRuleReviewStatus: false,
    sourceStatus: "UNVERIFIED",
  };
}

export function buildCompactFiscalReviewView(
  rule: TaxRule,
  sourceRegistry: FiscalSourceSnapshotRegistry,
  reviewRegistry: FiscalReviewRegistry,
  expectedRuleHash: string = rule.fiscalMetadata.ruleHash,
): CompactFiscalReviewView {
  const sourceById = sourceRecordMap(sourceRegistry);
  const evaluation = evaluateDualFiscalReview(
    rule,
    sourceRegistry,
    reviewRegistry,
    expectedRuleHash,
  );
  const ruleDecisions = reviewRegistry.decisions.filter(
    (decision) => decision.ruleId === rule.ruleId,
  );
  const incidents = ruleDecisions.flatMap((decision) => decision.incidentIds);

  return {
    ruleId: rule.ruleId,
    model: rule.modelNumber,
    fiscalYear: rule.fiscalYear,
    conditions: rule.conditions,
    exceptions: rule.exclusions,
    testIds: rule.tests,
    sources: rule.officialSourceIds.map((sourceId) => {
      const source = sourceById.get(sourceId);
      if (!source) throw new Error(`MISSING_SOURCE_SNAPSHOT:${sourceId}`);
      return {
        sourceId,
        title: source.title,
        officialLocator: source.officialLocator,
        materialScope: source.materialScope,
        affectedRuleIds: source.affectedRuleIds,
        materialValidity: source.materialValidity,
        contentHash: source.contentHash,
        normalizedContentHash: source.normalizedContentHash,
        previousSnapshotHash: source.previousSnapshotHash,
        changeDetected: source.changeDetected,
        changeSummary: source.changeSummary,
        verificationStatus: source.verificationStatus,
      };
    }),
    decisions: ruleDecisions.map((decision) => ({
      decisionId: decision.decisionId,
      reviewerId: decision.reviewerId,
      reviewerRole: decision.reviewerRole,
      decision: decision.decision,
      trustStatus: decision.reviewerTrust.status,
      revocationStatus: decision.revocation.status,
      reviewedRuleHash: decision.reviewedRuleHash,
      recordedAt: decision.recordedAt,
    })),
    incidents: [...new Set(incidents)].sort(compareText),
    hashes: {
      ruleHash: expectedRuleHash,
      sourceContentHashes: rule.officialSourceIds.map(
        (sourceId) => sourceById.get(sourceId)?.contentHash ?? "MISSING",
      ),
      sourceNormalizedHashes: rule.officialSourceIds.map(
        (sourceId) =>
          sourceById.get(sourceId)?.normalizedContentHash ?? "MISSING",
      ),
    },
    reviewState: evaluation.state,
    availableActions: [
      "APPROVE",
      "REJECT",
      "REQUEST_CHANGES",
      "REVOKE_DECISION",
    ],
    automaticApproval: false,
  };
}
