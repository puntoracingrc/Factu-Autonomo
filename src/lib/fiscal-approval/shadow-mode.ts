import type { TaxObligationsAssessmentV1 } from "@/lib/tax-obligations/contracts";
import type { ExclusionAuthorizationResult } from "@/lib/tax-obligations/rule-exclusion-authorization";
import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";

import type { FiscalFeatureFlags } from "./contracts";

export interface FiscalShadowComparison {
  status: "DISABLED" | "NO_APPROVED_RULESET" | "COMPARED";
  orientativeRuleSetVersion: string;
  approvedRuleSetVersion: string | null;
  orientativeModelCount: number;
  approvedModelCount: number;
  modelsAddedCount: number;
  potentiallyExcludedCount: number;
  changedDecisionCount: number;
  blockingReasonCount: number;
  evaluatedRuleHashCount: number;
  evaluatedRuleHashesDigest: string | null;
  userInterfaceMutated: false;
  calendarMutated: false;
  storedAssessmentMutated: false;
}

export interface FiscalShadowAggregateLog {
  eventType: "FISCAL_RULES_SHADOW_COMPARISON";
  status: FiscalShadowComparison["status"];
  orientativeRuleSetVersion: string;
  approvedRuleSetVersion: string | null;
  orientativeModelCount: number;
  approvedModelCount: number;
  modelsAddedCount: number;
  potentiallyExcludedCount: number;
  changedDecisionCount: number;
  blockingReasonCount: number;
  evaluatedRuleHashCount: number;
  evaluatedRuleHashesDigest: string | null;
  containsPersonalData: false;
}

function emptyComparison(
  status: "DISABLED" | "NO_APPROVED_RULESET",
  orientative: TaxObligationsAssessmentV1,
): FiscalShadowComparison {
  return Object.freeze({
    status,
    orientativeRuleSetVersion: orientative.ruleSetVersion,
    approvedRuleSetVersion: null,
    orientativeModelCount: orientative.obligations.length,
    approvedModelCount: 0,
    modelsAddedCount: 0,
    potentiallyExcludedCount: 0,
    changedDecisionCount: 0,
    blockingReasonCount: 0,
    evaluatedRuleHashCount: 0,
    evaluatedRuleHashesDigest: null,
    userInterfaceMutated: false,
    calendarMutated: false,
    storedAssessmentMutated: false,
  });
}

/**
 * Pure comparison. Approved exclusions only count when the canonical
 * individual authorization result says authorized; the comparison has no
 * storage, UI or Calendar dependency.
 */
export function compareFiscalShadowResults(input: {
  flags: FiscalFeatureFlags;
  orientative: TaxObligationsAssessmentV1;
  approved: TaxObligationsAssessmentV1 | null;
  exclusionAuthorizations: readonly ExclusionAuthorizationResult[];
}): FiscalShadowComparison {
  if (!input.flags.fiscal_rules_shadow_mode) {
    return emptyComparison("DISABLED", input.orientative);
  }
  if (
    !input.approved ||
    input.approved.ruleReviewState !== "APPROVED" ||
    input.approved.resolutionState !== "RESOLVED"
  ) {
    return emptyComparison("NO_APPROVED_RULESET", input.orientative);
  }

  const orientativeByModel = new Map(
    input.orientative.obligations.map((obligation) => [
      obligation.modelCode,
      obligation,
    ]),
  );
  const approvedByModel = new Map(
    input.approved.obligations.map((obligation) => [
      obligation.modelCode,
      obligation,
    ]),
  );
  const authorizationByRule = new Map(
    input.exclusionAuthorizations.map((authorization) => [
      authorization.ruleId,
      authorization,
    ]),
  );
  let potentiallyExcludedCount = 0;
  let blockingReasonCount = 0;
  let evaluatedRuleHashCount = 0;
  for (const obligation of input.approved.obligations) {
    if (obligation.status !== "NOT_APPLICABLE") continue;
    const ruleId = obligation.exclusionAuthorization?.ruleId;
    const authorization = ruleId ? authorizationByRule.get(ruleId) : undefined;
    if (authorization) evaluatedRuleHashCount += 1;
    if (authorization?.authorized) {
      potentiallyExcludedCount += 1;
    } else {
      blockingReasonCount += Math.max(
        1,
        authorization?.blockingReasons.length ?? 0,
      );
    }
  }
  const modelsAddedCount = [...approvedByModel.keys()].filter(
    (model) => !orientativeByModel.has(model),
  ).length;
  const changedDecisionCount = [...approvedByModel.entries()].filter(
    ([model, approved]) =>
      orientativeByModel.get(model)?.status !== approved.status,
  ).length;
  const evaluatedRuleHashes = input.exclusionAuthorizations
    .map((authorization) => authorization.evaluatedRuleHash)
    .sort();

  return Object.freeze({
    status: "COMPARED",
    orientativeRuleSetVersion: input.orientative.ruleSetVersion,
    approvedRuleSetVersion: input.approved.ruleSetVersion,
    orientativeModelCount: input.orientative.obligations.length,
    approvedModelCount: input.approved.obligations.length,
    modelsAddedCount,
    potentiallyExcludedCount,
    changedDecisionCount,
    blockingReasonCount,
    evaluatedRuleHashCount,
    evaluatedRuleHashesDigest:
      evaluatedRuleHashes.length === 0
        ? null
        : `sha256:${sha256Hex(JSON.stringify(evaluatedRuleHashes))}`,
    userInterfaceMutated: false,
    calendarMutated: false,
    storedAssessmentMutated: false,
  });
}

export function buildFiscalShadowAggregateLog(
  comparison: FiscalShadowComparison,
): FiscalShadowAggregateLog {
  return Object.freeze({
    eventType: "FISCAL_RULES_SHADOW_COMPARISON",
    status: comparison.status,
    orientativeRuleSetVersion: comparison.orientativeRuleSetVersion,
    approvedRuleSetVersion: comparison.approvedRuleSetVersion,
    orientativeModelCount: comparison.orientativeModelCount,
    approvedModelCount: comparison.approvedModelCount,
    modelsAddedCount: comparison.modelsAddedCount,
    potentiallyExcludedCount: comparison.potentiallyExcludedCount,
    changedDecisionCount: comparison.changedDecisionCount,
    blockingReasonCount: comparison.blockingReasonCount,
    evaluatedRuleHashCount: comparison.evaluatedRuleHashCount,
    evaluatedRuleHashesDigest: comparison.evaluatedRuleHashesDigest,
    containsPersonalData: false,
  });
}
