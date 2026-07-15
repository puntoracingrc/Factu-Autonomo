import type {
  DiagnosticResult,
  ModelResult,
  ModelResultStatus,
} from "@/lib/tax-model-diagnostic/contracts";
import {
  getTaxRule,
  taxRuleSetAuthorizationMetadata,
  taxRuleSetReviewState,
} from "@/lib/tax-model-diagnostic/rules";

import {
  TAX_OBLIGATIONS_CATALOG_VERSION,
  TAX_OBLIGATIONS_CONTRACT_VERSION,
  normalizeTaxObligationModelCode,
  type TaxObligationAssessmentItemV1,
  type TaxObligationDecisionBasis,
  type TaxObligationDecisionState,
  type TaxObligationStatus,
  type TaxObligationsAssessmentV1,
  type TaxObligationsRuleReviewState,
} from "./contracts";
import { authorizeRuleExclusion } from "./rule-exclusion-authorization";

function publicStatus(result: ModelResult): TaxObligationStatus {
  switch (result.status) {
    case "CONFIRMED_BY_CENSUS":
    case "DERIVED":
      return "REQUIRED";
    case "NOT_APPLICABLE":
      return result.evidence.length > 0 &&
        result.missingInformation.length === 0 &&
        result.confidence >= 0.7
        ? "NOT_APPLICABLE"
        : "UNKNOWN";
    case "NEEDS_PROFESSIONAL_REVIEW":
    case "CENSUS_MISMATCH":
    case "TERRITORY_NOT_SUPPORTED":
      return "REVIEW_REQUIRED";
    case "CONDITIONAL":
    case "NEEDS_INFORMATION":
      return "UNKNOWN";
  }
}

function decisionMetadata(
  status: ModelResultStatus,
): {
  decisionState: TaxObligationDecisionState;
  decisionBasis: TaxObligationDecisionBasis;
} {
  switch (status) {
    case "CONFIRMED_BY_CENSUS":
      return {
        decisionState: "CONFIRMED",
        decisionBasis: "CONFIRMED_FACTS",
      };
    case "DERIVED":
    case "NOT_APPLICABLE":
      return {
        decisionState: "PROVISIONAL",
        decisionBasis: "PROVISIONAL_RULES",
      };
    case "CENSUS_MISMATCH":
      return {
        decisionState: "CONFLICTING_EVIDENCE",
        decisionBasis: "CONFLICTING_EVIDENCE",
      };
    case "TERRITORY_NOT_SUPPORTED":
      return {
        decisionState: "INSUFFICIENT_DATA",
        decisionBasis: "UNSUPPORTED_TERRITORY",
      };
    case "CONDITIONAL":
    case "NEEDS_INFORMATION":
      return {
        decisionState: "INSUFFICIENT_DATA",
        decisionBasis: "INCOMPLETE_PROFILE",
      };
    case "NEEDS_PROFESSIONAL_REVIEW":
      return {
        decisionState: "PROVISIONAL",
        decisionBasis: "PROVISIONAL_RULES",
      };
  }
}

function buildItem(
  result: ModelResult,
  context: {
    fiscalYear: 2025 | 2026;
    territory: DiagnosticResult["territory"];
    evaluatedAt: string;
    internalOverrideRequested: boolean;
  },
): TaxObligationAssessmentItemV1 {
  const modelCode = normalizeTaxObligationModelCode(result.modelNumber);
  if (!modelCode) {
    throw new Error(`Código de modelo no canónico: ${result.modelNumber}`);
  }
  const status = publicStatus(result);
  const decision = decisionMetadata(result.status);
  const conflicts = result.censusMismatch ? [result.censusMismatch] : [];
  const rule = getTaxRule(context.fiscalYear, result.modelNumber);
  const candidateEvaluations =
    status === "NOT_APPLICABLE"
      ? rule.fiscalMetadata.exclusionCandidates.map((candidate) =>
          authorizeRuleExclusion({
            ruleset: taxRuleSetAuthorizationMetadata(context.fiscalYear),
            rule,
            exclusionCandidate: candidate,
            targetFiscalYear: context.fiscalYear,
            targetTerritory: context.territory,
            ruleHash: rule.fiscalMetadata.ruleHash,
            approvalEvidence: null,
            issues: rule.fiscalMetadata.review.issueIds.map((issueId) => ({
              issueId,
              status: "OPEN",
            })),
            issueRegistryComplete: true,
            facts: {
              hasUnknownRequiredFacts: result.missingInformation.length > 0,
              hasContradictoryFacts: conflicts.length > 0,
            },
            internalOverrideRequested: context.internalOverrideRequested,
            evaluatedAt: context.evaluatedAt,
          }),
        )
      : [];
  const blockingReasons = [
    ...new Set(
      candidateEvaluations.flatMap((evaluation) =>
        [...evaluation.blockingReasons],
      ),
    ),
  ];
  return {
    modelCode,
    status,
    decisionState:
      status === "UNKNOWN" && result.status === "NOT_APPLICABLE"
        ? "INSUFFICIENT_DATA"
        : decision.decisionState,
    decisionBasis:
      status === "UNKNOWN" && result.status === "NOT_APPLICABLE"
        ? "INCOMPLETE_PROFILE"
        : decision.decisionBasis,
    evidenceSufficient:
      status === "REQUIRED" || status === "NOT_APPLICABLE"
        ? result.evidence.length > 0 && result.missingInformation.length === 0
        : false,
    reason: result.reason,
    evidence: result.evidence.map((summary) => ({
      kind: summary.includes("censal") ? "CENSUS" : "QUESTIONNAIRE",
      summary,
    })),
    missingInformation: [...result.missingInformation],
    conflicts,
    possibleExceptions: [...rule.exclusions],
    ...(status === "NOT_APPLICABLE"
      ? {
          exclusionAuthorization: {
            proposed: true,
            // The engine does not yet map a result branch to one exact
            // exclusion candidate. Until that matrix exists, no candidate can
            // become an executable exclusion even if a synthetic gate passes.
            authorized: false,
            blockingReasons: [
              ...blockingReasons,
              ...(blockingReasons.includes(
                "EXCLUSION_EFFECT_NOT_EXECUTABLE",
              )
                ? []
                : ["EXCLUSION_CANDIDATE_NOT_MAPPED"]),
            ],
            ruleId: rule.ruleId,
            exclusionId: null,
            candidateExclusionIds:
              rule.fiscalMetadata.exclusionCandidates.map(
                (candidate) => candidate.exclusionId,
              ),
            rulesetId: rule.fiscalMetadata.rulesetId,
            ruleHash: rule.fiscalMetadata.ruleHash,
          },
        }
      : {}),
  };
}

export function buildTaxObligationsAssessment(
  result: DiagnosticResult,
  options: {
    ruleReviewState?: TaxObligationsRuleReviewState;
  } = {},
): TaxObligationsAssessmentV1 {
  const conflicts = [...result.discrepancies];
  const profileState =
    conflicts.length > 0
      ? "CONFLICTED"
      : result.missingInformation.length > 0 || result.status === "NEEDS_INFORMATION"
        ? "INCOMPLETE"
        : "COMPLETE";

  const obligations = result.models.map((model) =>
    buildItem(model, {
      fiscalYear: result.fiscalYear,
      territory: result.territory,
      evaluatedAt: result.generatedAt,
      internalOverrideRequested: options.ruleReviewState !== undefined,
    }),
  );
  const ruleReviewState =
    options.ruleReviewState ?? taxRuleSetReviewState(result.fiscalYear);
  const blocked =
    result.status === "TERRITORY_NOT_SUPPORTED" || result.models.length === 0;
  const needsManualReview =
    ruleReviewState !== "APPROVED" ||
    result.status !== "READY" ||
    obligations.some(
      (obligation) =>
        obligation.status === "UNKNOWN" ||
        obligation.status === "REVIEW_REQUIRED" ||
        !obligation.evidenceSufficient,
    );

  return {
    contractVersion: TAX_OBLIGATIONS_CONTRACT_VERSION,
    catalogVersion: TAX_OBLIGATIONS_CATALOG_VERSION,
    ruleSetVersion: result.ruleSetVersion,
    ruleReviewState,
    resolutionState: blocked
      ? "BLOCKED"
      : needsManualReview
        ? "MANUAL_REVIEW"
        : "RESOLVED",
    traceability: {
      engineVersion: result.engineVersion,
      sourceSchemaVersion: result.schemaVersion,
    },
    generatedAt: result.generatedAt,
    fiscalYear: result.fiscalYear,
    territory: result.territory,
    profile: {
      state: profileState,
      missingInformation: [...result.missingInformation],
      conflicts,
    },
    obligations,
  };
}
