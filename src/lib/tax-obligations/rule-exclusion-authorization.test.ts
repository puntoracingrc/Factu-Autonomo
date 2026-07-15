import { describe, expect, it } from "vitest";

import type { TaxRule } from "@/lib/tax-model-diagnostic/contracts";
import { computeFiscalRuleHash } from "@/lib/tax-model-diagnostic/fiscal-rule-hash";
import { getTaxRule } from "@/lib/tax-model-diagnostic/rules";

import {
  authorizeRuleExclusion,
  type AuthorizeRuleExclusionInput,
  type ExclusionAuthorizationBlockingReason,
} from "./rule-exclusion-authorization";

const EVALUATED_AT = "2026-07-15T15:00:00.000Z";

function reviewer(role: "PRIMARY_FISCAL_REVIEWER" | "SECOND_FISCAL_REVIEWER") {
  return {
    reviewerId: `reviewer:${role.toLowerCase()}`,
    role,
    identityProvider: "synthetic-test-identity",
    verificationId: `verification:${role.toLowerCase()}`,
  } as const;
}

function fullyApprovedSyntheticInput(): AuthorizeRuleExclusionInput {
  const pending = getTaxRule(2026, "303");
  const sourceSnapshots = pending.fiscalMetadata.sourceSnapshots.map(
    (snapshot, index) => ({
      ...snapshot,
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      snapshotHash: `sha256:${String(index + 1).padStart(64, "0")}`,
      status: "VERIFIED" as const,
      verifiedBy: reviewer("PRIMARY_FISCAL_REVIEWER"),
      verifiedAt: EVALUATED_AT,
    }),
  );
  const exclusionCandidates = pending.fiscalMetadata.exclusionCandidates.map(
    (candidate) => ({
      ...candidate,
      effectType: "EXCLUDE_MODEL" as const,
      reviewStatus: "APPROVED" as const,
      resolutionStatus: "RESOLVED" as const,
    }),
  );
  const ruleHash = computeFiscalRuleHash({
    ruleId: pending.ruleId,
    model: pending.modelNumber,
    fiscalYear: pending.fiscalYear,
    territory: pending.territory,
    effectiveFrom: pending.effectiveFrom,
    effectiveTo: pending.effectiveTo,
    conditions: pending.conditions,
    factIds: ["vatRegimes"],
    result: pending.result,
    exclusions: pending.exclusions,
    exclusionCandidates,
    sourceSnapshots,
  });
  const rule: TaxRule = {
    ...pending,
    reviewStatus: "APPROVED",
    reviewedBy: "synthetic-test-review",
    fiscalMetadata: {
      ...pending.fiscalMetadata,
      ruleHash,
      sourceSnapshots,
      exclusionCandidates,
      questionIds: ["E_VAT_REGIMES"],
      factIds: ["vatRegimes"],
      review: {
        ...pending.fiscalMetadata.review,
        reviewStatus: "APPROVED",
        resolutionStatus: "RESOLVED",
        testsStatus: "PASSING",
        sourceStatus: "VERIFIED",
        primaryFiscalReviewer: reviewer("PRIMARY_FISCAL_REVIEWER"),
        secondFiscalReviewer: reviewer("SECOND_FISCAL_REVIEWER"),
        reviewedAt: EVALUATED_AT,
        resolvedAt: EVALUATED_AT,
        approvedAt: EVALUATED_AT,
        approvedRuleHash: ruleHash,
        approvalEvidenceId: "fiscal-approval:synthetic-303",
        approvalEvidenceVerified: true,
        approvalEvidenceOrigin: "SIGNED_FISCAL_ARTIFACT",
      },
    },
  };
  const exclusionCandidate = rule.fiscalMetadata.exclusionCandidates[0];
  if (!exclusionCandidate) throw new Error("SYNTHETIC_EXCLUSION_MISSING");
  return {
    ruleset: {
      rulesetId: rule.version,
      reviewStatus: "APPROVED",
      resolutionStatus: "RESOLVED",
    },
    rule,
    exclusionCandidate,
    targetFiscalYear: 2026,
    targetTerritory: "ES_COMMON",
    ruleHash,
    approvalEvidence: {
      evidenceId: "fiscal-approval:synthetic-303",
      ruleHash,
      verified: true,
      origin: "SIGNED_FISCAL_ARTIFACT",
    },
    issues: rule.fiscalMetadata.review.issueIds.map((issueId) => ({
      issueId,
      status: "VERIFIED",
    })),
    issueRegistryComplete: true,
    facts: {
      hasUnknownRequiredFacts: false,
      hasContradictoryFacts: false,
    },
    internalOverrideRequested: false,
    evaluatedAt: EVALUATED_AT,
  };
}

function cloneApprovedInput(): AuthorizeRuleExclusionInput {
  return structuredClone(fullyApprovedSyntheticInput());
}

function expectBlocked(
  input: AuthorizeRuleExclusionInput,
  reason: ExclusionAuthorizationBlockingReason,
) {
  const result = authorizeRuleExclusion(input);
  expect(result.authorized).toBe(false);
  expect(result.blockingReasons).toContain(reason);
}

describe("individual fiscal rule exclusion gate", () => {
  it("authorizes only a completely approved synthetic rule", () => {
    const result = authorizeRuleExclusion(fullyApprovedSyntheticInput());

    expect(result).toMatchObject({
      authorized: true,
      ruleId: "es-common.2026.model-303",
      model: "303",
      blockingReasons: [],
      evaluatedAt: EVALUATED_AT,
    });
    expect(result.evidenceIds).toEqual([
      "fiscal-approval:synthetic-303",
      "fiscal-closure.es-common.2026.model-303",
    ]);
  });

  it.each([
    [
      "PENDING_FISCAL_REVIEW",
      "OPEN",
      "PENDING_FISCAL_REVIEW",
      "OPEN",
      "NOT_IMPLEMENTED",
      "GLOBAL_RULESET_NOT_APPROVED",
    ],
    [
      "APPROVED",
      "RESOLVED",
      "PENDING_FISCAL_REVIEW",
      "OPEN",
      "NOT_IMPLEMENTED",
      "RULE_NOT_APPROVED",
    ],
    [
      "PENDING_FISCAL_REVIEW",
      "OPEN",
      "APPROVED",
      "RESOLVED",
      "PASSING",
      "GLOBAL_RULESET_NOT_APPROVED",
    ],
    [
      "APPROVED",
      "OPEN",
      "APPROVED",
      "RESOLVED",
      "PASSING",
      "GLOBAL_RULESET_NOT_RESOLVED",
    ],
    [
      "APPROVED",
      "RESOLVED",
      "APPROVED",
      "OPEN",
      "PASSING",
      "RULE_NOT_RESOLVED",
    ],
    [
      "APPROVED",
      "RESOLVED",
      "APPROVED",
      "RESOLVED",
      "FAILING",
      "TESTS_NOT_PASSING",
    ],
  ] as const)(
    "fails closed for ruleset=%s/%s rule=%s/%s tests=%s",
    (
      globalReview,
      globalResolution,
      ruleReview,
      ruleResolution,
      testsStatus,
      expectedReason,
    ) => {
      const input = cloneApprovedInput();
      input.ruleset.reviewStatus = globalReview;
      input.ruleset.resolutionStatus = globalResolution;
      input.rule.fiscalMetadata.review.reviewStatus = ruleReview;
      input.rule.fiscalMetadata.review.resolutionStatus = ruleResolution;
      input.rule.fiscalMetadata.review.testsStatus = testsStatus;
      expectBlocked(input, expectedReason);
    },
  );

  it("blocks NOT_IMPLEMENTED tests", () => {
    const input = cloneApprovedInput();
    input.rule.fiscalMetadata.review.testsStatus = "NOT_IMPLEMENTED";
    expectBlocked(input, "TESTS_NOT_PASSING");
  });

  it("blocks missing source snapshot hashes", () => {
    const input = cloneApprovedInput();
    input.rule.fiscalMetadata.sourceSnapshots[0]!.snapshotHash = null;
    expectBlocked(input, "SOURCE_SNAPSHOT_HASH_MISSING");
  });

  it("blocks stale sources", () => {
    const input = cloneApprovedInput();
    input.rule.fiscalMetadata.sourceSnapshots[0]!.status = "STALE";
    expectBlocked(input, "SOURCE_STALE");
  });

  it("blocks an incorrect fiscal year", () => {
    const input = cloneApprovedInput();
    input.targetFiscalYear = 2025;
    expectBlocked(input, "FISCAL_YEAR_MISMATCH");
  });

  it("blocks an incorrect territory", () => {
    const input = cloneApprovedInput();
    input.targetTerritory = "ES_CANARY";
    expectBlocked(input, "TERRITORY_MISMATCH");
  });

  it("blocks a missing primary reviewer", () => {
    const input = cloneApprovedInput();
    input.rule.fiscalMetadata.review.primaryFiscalReviewer = null;
    expectBlocked(input, "PRIMARY_REVIEWER_MISSING");
  });

  it("blocks a missing second reviewer", () => {
    const input = cloneApprovedInput();
    input.rule.fiscalMetadata.review.secondFiscalReviewer = null;
    expectBlocked(input, "SECOND_REVIEWER_MISSING");
  });

  it("blocks a missing approved fiscal hash", () => {
    const input = cloneApprovedInput();
    input.rule.fiscalMetadata.review.approvedRuleHash = null;
    expectBlocked(input, "APPROVED_RULE_HASH_MISSING");
  });

  it("blocks a fiscal hash mismatch", () => {
    const input = cloneApprovedInput();
    input.ruleHash = "fiscal-rule-v1:different";
    expectBlocked(input, "APPROVED_RULE_HASH_MISMATCH");
  });

  it("blocks missing approval evidence", () => {
    const input = cloneApprovedInput();
    input.approvalEvidence = null;
    expectBlocked(input, "APPROVAL_EVIDENCE_MISSING");
  });

  it("blocks unverified approval evidence", () => {
    const input = cloneApprovedInput();
    input.approvalEvidence!.verified = false;
    expectBlocked(input, "APPROVAL_EVIDENCE_NOT_VERIFIED");
  });

  it.each(["OPEN", "REOPENED"] as const)(
    "blocks a %s fiscal issue",
    (status) => {
      const input = cloneApprovedInput();
      input.issues[0]!.status = status;
      expectBlocked(input, "OPEN_FISCAL_ISSUES");
    },
  );

  it("does not treat an absent issue registry as proof of no issues", () => {
    const input = cloneApprovedInput();
    input.issueRegistryComplete = false;
    input.issues = [];
    expectBlocked(input, "OPEN_FISCAL_ISSUES");
  });

  it("blocks unknown required facts", () => {
    const input = cloneApprovedInput();
    input.facts.hasUnknownRequiredFacts = true;
    expectBlocked(input, "UNKNOWN_FACTS");
  });

  it("blocks contradictory facts", () => {
    const input = cloneApprovedInput();
    input.facts.hasContradictoryFacts = true;
    expectBlocked(input, "CONTRADICTORY_FACTS");
  });

  it("blocks a textual advisory exclusion", () => {
    const input = cloneApprovedInput();
    input.exclusionCandidate.effectType = "ADVISORY_EXCLUSION_CANDIDATE";
    expectBlocked(input, "EXCLUSION_EFFECT_NOT_EXECUTABLE");
  });

  it("blocks an internal override even when it says APPROVED", () => {
    const input = cloneApprovedInput();
    input.internalOverrideRequested = true;
    input.approvalEvidence!.origin = "INTERNAL_OVERRIDE";
    expectBlocked(input, "INTERNAL_OVERRIDE_NOT_AUTHORIZED");
  });

  it("blocks a rule from another territory", () => {
    const input = cloneApprovedInput();
    input.rule.fiscalMetadata.territory = "ES_COMMON";
    input.targetTerritory = "ES_NAVARRA";
    expectBlocked(input, "TERRITORY_MISMATCH");
  });

  it("blocks a rule outside its effective dates", () => {
    const input = cloneApprovedInput();
    input.rule.fiscalMetadata.effectiveFrom = "2027-01-01";
    expectBlocked(input, "EFFECTIVE_DATE_NOT_CONFIRMED");
  });
});
