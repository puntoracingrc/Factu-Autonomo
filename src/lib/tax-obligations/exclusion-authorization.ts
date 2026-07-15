import {
  getTaxRule,
  taxRuleSetAuthorizationMetadata,
} from "@/lib/tax-model-diagnostic/rules";
import {
  DEFAULT_FISCAL_FEATURE_FLAGS,
  type FiscalFeatureFlags,
} from "@/lib/fiscal-approval/contracts";

import type { TaxObligationsAssessmentV1 } from "./contracts";
import { authorizeRuleExclusion } from "./rule-exclusion-authorization";

/**
 * Single public gate for consumers that can hide or exclude obligations.
 * Technical validation of OCR, fixtures, CI or deployments never changes it.
 */
export function isTaxObligationExclusionAuthorized(
  assessment:
    | (Pick<
        TaxObligationsAssessmentV1,
        "ruleReviewState" | "resolutionState"
      > &
        Partial<
          Pick<
            TaxObligationsAssessmentV1,
            | "fiscalYear"
            | "territory"
            | "generatedAt"
            | "obligations"
          >
        >)
    | null
    | undefined,
  flags: FiscalFeatureFlags = DEFAULT_FISCAL_FEATURE_FLAGS,
): boolean {
  if (
    !flags.fiscal_rules_approved_results ||
    !flags.fiscal_rules_exclusions ||
    assessment?.ruleReviewState !== "APPROVED" ||
    assessment.resolutionState !== "RESOLVED" ||
    (assessment.fiscalYear !== 2025 && assessment.fiscalYear !== 2026) ||
    assessment.territory !== "ES_COMMON" ||
    typeof assessment.generatedAt !== "string" ||
    !Array.isArray(assessment.obligations)
  ) {
    return false;
  }

  const fiscalYear = assessment.fiscalYear as 2025 | 2026;

  const trustedRuleset = taxRuleSetAuthorizationMetadata(fiscalYear);
  if (
    trustedRuleset.reviewStatus !== "APPROVED" ||
    trustedRuleset.resolutionStatus !== "RESOLVED"
  ) {
    return false;
  }

  const proposed = assessment.obligations.filter(
    (obligation) => obligation.status === "NOT_APPLICABLE",
  );
  if (proposed.length === 0) return false;

  return proposed.every((obligation) => {
    const stored = obligation.exclusionAuthorization;
    if (
      !stored?.authorized ||
      stored.blockingReasons.length > 0 ||
      stored.exclusionId === null
    ) {
      return false;
    }
    const rule = getTaxRule(fiscalYear, obligation.modelCode);
    const candidate = rule.fiscalMetadata.exclusionCandidates.find(
      (entry) => entry.exclusionId === stored.exclusionId,
    );
    if (
      !candidate ||
      stored.ruleId !== rule.ruleId ||
      stored.rulesetId !== rule.fiscalMetadata.rulesetId ||
      stored.ruleHash !== rule.fiscalMetadata.ruleHash
    ) {
      return false;
    }
    const review = rule.fiscalMetadata.review;
    const approvalEvidence =
      review.approvalEvidenceId &&
      review.approvedRuleHash &&
      review.approvalEvidenceOrigin
        ? {
            evidenceId: review.approvalEvidenceId,
            ruleHash: review.approvedRuleHash,
            verified: review.approvalEvidenceVerified,
            origin: review.approvalEvidenceOrigin,
          }
        : null;

    // The first closure phase deliberately has no trusted issue registry.
    // Absence is not evidence of zero incidents, so re-evaluation remains
    // denied until a signed/verified registry is integrated in a later phase.
    return authorizeRuleExclusion({
      ruleset: trustedRuleset,
      rule,
      exclusionCandidate: candidate,
      targetFiscalYear: fiscalYear,
      targetTerritory: "ES_COMMON",
      ruleHash: rule.fiscalMetadata.ruleHash,
      approvalEvidence,
      issues: [],
      issueRegistryComplete: false,
      facts: {
        hasUnknownRequiredFacts:
          obligation.missingInformation.length > 0,
        hasContradictoryFacts: obligation.conflicts.length > 0,
      },
      internalOverrideRequested:
        assessment.ruleReviewState !== trustedRuleset.reviewStatus,
      evaluatedAt: assessment.generatedAt!,
    }).authorized;
  });
}
