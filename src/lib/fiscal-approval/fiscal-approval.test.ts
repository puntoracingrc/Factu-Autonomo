import { describe, expect, it } from "vitest";

import { TAX_RULES } from "@/lib/tax-model-diagnostic/rules";
import type { TaxObligationsAssessmentV1 } from "@/lib/tax-obligations/contracts";

import {
  buildFiscalRuleMaterialSnapshot,
  computeFiscalApprovalRuleHash,
} from "./canonical-hash";
import type {
  FiscalApprovalHashInput,
} from "./canonical-hash";
import {
  DEFAULT_FISCAL_FEATURE_FLAGS,
  FISCAL_FEATURE_FLAG_NAMES,
  type FiscalApprovalSignatureEvidence,
  type FiscalFeatureFlags,
} from "./contracts";
import { authorizeDocumentAutoConfirmation } from "./document-auto-confirmation";
import {
  authorizeFlaggedFiscalExclusion,
  buildFiscalRuntimeState,
  fiscalFlagsAreDefaultOff,
  resolveFiscalFeatureFlags,
} from "./feature-flags";
import {
  approveFiscalRuleProjection,
  detectFiscalApprovalInvalidation,
  emptyFiscalApprovalProjection,
  invalidateFiscalApproval,
  startFiscalRuleReview,
  transitionFiscalIssueStatus,
  transitionFiscalRuleReviewStatus,
} from "./lifecycle";
import { rollbackFiscalRuntime } from "./rollback";
import {
  buildFiscalShadowAggregateLog,
  compareFiscalShadowResults,
} from "./shadow-mode";

const MATERIAL_INPUT: FiscalApprovalHashInput = {
  ruleId: "synthetic.test.rule",
  model: "303",
  fiscalYear: 2026,
  territory: "ES_COMMON",
  effectiveFrom: "2026-01-01",
  effectiveTo: "2026-12-31",
  conditions: ["condition-b", "condition-a"],
  factIds: ["fact-b", "fact-a"],
  decision: "synthetic-test-decision",
  exceptions: ["exception-b", "exception-a"],
  exclusionIds: ["synthetic.test.exclusion"],
  materialSources: [
    {
      sourceId: "synthetic.test.source",
      contentHash: `sha256:${"1".repeat(64)}`,
      normalizedContentHash: `sha256:${"2".repeat(64)}`,
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      materialScope: "synthetic unit test only",
      verificationStatus: "VERIFIED_BY_TWO_FISCAL_REVIEWERS",
      materialValidityStatus: "VERIFIED",
      materialValidityBasis: "SIGNED_FISCAL_REVIEW",
    },
  ],
  materialTestHash: `sha256:${"3".repeat(64)}`,
};

function signature(
  role: "PRIMARY_FISCAL_REVIEWER" | "SECOND_FISCAL_REVIEWER",
  reviewerId: string,
): FiscalApprovalSignatureEvidence {
  return {
    decisionId: `synthetic.${role}`,
    reviewerId,
    reviewerRole: role,
    reviewedRuleHash: computeFiscalApprovalRuleHash(MATERIAL_INPUT),
    reviewedSourceHashes: MATERIAL_INPUT.materialSources,
    signatureReference: `test-only-signature:${role}`,
    evidenceReferences: [`test-only-evidence:${role}`],
    signedAt: "2026-07-15T00:00:00.000Z",
    revokedAt: null,
    revocationReason: null,
  };
}

function assessment(
  review: "PENDING_FISCAL_REVIEW" | "APPROVED",
  resolution: "MANUAL_REVIEW" | "RESOLVED",
): TaxObligationsAssessmentV1 {
  return {
    contractVersion: "1.0.0",
    catalogVersion: "es-tax-models.2026-07.v1",
    ruleSetVersion: "synthetic-shadow-test.v1",
    ruleReviewState: review,
    resolutionState: resolution,
    traceability: {
      engineVersion: "synthetic-test",
      sourceSchemaVersion: 1,
    },
    generatedAt: "2026-07-15T00:00:00.000Z",
    fiscalYear: 2026,
    territory: "ES_COMMON",
    profile: { state: "COMPLETE", missingInformation: [], conflicts: [] },
    obligations: [
      {
        modelCode: "303",
        status: review === "APPROVED" ? "NOT_APPLICABLE" : "REVIEW_REQUIRED",
        decisionState: review === "APPROVED" ? "CONFIRMED" : "PROVISIONAL",
        decisionBasis:
          review === "APPROVED" ? "CONFIRMED_FACTS" : "PROVISIONAL_RULES",
        evidenceSufficient: review === "APPROVED",
        reason: "Synthetic shadow test only",
        evidence: [],
        missingInformation: [],
        conflicts: [],
        exclusionAuthorization: {
          proposed: true,
          authorized: false,
          blockingReasons: ["SYNTHETIC_TEST"],
          ruleId: "synthetic.test.rule",
          exclusionId: null,
          candidateExclusionIds: ["synthetic.test.exclusion"],
          rulesetId: "synthetic-shadow-test.v1",
          ruleHash: computeFiscalApprovalRuleHash(MATERIAL_INPUT),
        },
      },
    ],
  };
}

describe("fiscal approval canonical hash and lifecycle", () => {
  it("hashes all fiscal material but ignores collection order", () => {
    expect(
      computeFiscalApprovalRuleHash({
        ...MATERIAL_INPUT,
        conditions: [...MATERIAL_INPUT.conditions].reverse(),
        factIds: [...MATERIAL_INPUT.factIds].reverse(),
        exceptions: [...MATERIAL_INPUT.exceptions].reverse(),
      }),
    ).toBe(computeFiscalApprovalRuleHash(MATERIAL_INPUT));

    expect(
      computeFiscalApprovalRuleHash({
        ...MATERIAL_INPUT,
        decision: "changed-material-decision",
      }),
    ).not.toBe(computeFiscalApprovalRuleHash(MATERIAL_INPUT));
  });

  it("enforces the exact rule and incident transition chains", () => {
    expect(
      transitionFiscalRuleReviewStatus("PENDING_FISCAL_REVIEW", "IN_REVIEW"),
    ).toBe("IN_REVIEW");
    expect(transitionFiscalRuleReviewStatus("IN_REVIEW", "APPROVED")).toBe(
      "APPROVED",
    );
    expect(() =>
      transitionFiscalRuleReviewStatus("PENDING_FISCAL_REVIEW", "APPROVED"),
    ).toThrow("INVALID_FISCAL_RULE_TRANSITION");

    expect(
      transitionFiscalIssueStatus({
        issueId: "synthetic.issue",
        current: "OPEN",
        next: "IN_PROGRESS",
        occurredAt: "2026-07-15T00:00:00.000Z",
      }).nextStatus,
    ).toBe("IN_PROGRESS");
    expect(() =>
      transitionFiscalIssueStatus({
        issueId: "synthetic.issue",
        current: "OPEN",
        next: "VERIFIED",
        occurredAt: "2026-07-15T00:00:00.000Z",
      }),
    ).toThrow("INVALID_FISCAL_ISSUE_TRANSITION");
    expect(() =>
      transitionFiscalIssueStatus({
        issueId: "synthetic.issue",
        current: "IN_PROGRESS",
        next: "READY_FOR_VERIFICATION",
        occurredAt: "2026-07-15T00:00:00.000Z",
      }),
    ).toThrow("FISCAL_ISSUE_EVIDENCE_REQUIRED");
    expect(() =>
      transitionFiscalIssueStatus({
        issueId: "synthetic.issue",
        current: "READY_FOR_VERIFICATION",
        next: "VERIFIED",
        occurredAt: "2026-07-15T00:00:00.000Z",
        evidenceReferences: ["test-only-evidence"],
      }),
    ).toThrow("FISCAL_ISSUE_VERIFICATION_REQUIRED");
  });

  it("requires two distinct, current, evidenced signatures before synthetic approval", () => {
    const snapshot = buildFiscalRuleMaterialSnapshot(MATERIAL_INPUT);
    const inReview = startFiscalRuleReview({
      projection: emptyFiscalApprovalProjection(snapshot.ruleId),
      snapshot,
      occurredAt: "2026-07-15T00:00:00.000Z",
      eventId: "synthetic.review-start",
    });
    expect(() =>
      approveFiscalRuleProjection({
        projection: inReview,
        snapshot,
        signatures: [
          signature("PRIMARY_FISCAL_REVIEWER", "same-reviewer"),
          signature("SECOND_FISCAL_REVIEWER", "same-reviewer"),
        ],
        requiredIssueIds: ["synthetic.issue"],
        verifiedIssueIds: ["synthetic.issue"],
        evidenceReferences: ["test-only-approval-evidence"],
        occurredAt: "2026-07-15T01:00:00.000Z",
        eventId: "synthetic.approval",
      }),
    ).toThrow("DISTINCT_FISCAL_REVIEWERS_REQUIRED");

    const approved = approveFiscalRuleProjection({
      projection: inReview,
      snapshot,
      signatures: [
        signature("PRIMARY_FISCAL_REVIEWER", "primary-test-only"),
        signature("SECOND_FISCAL_REVIEWER", "second-test-only"),
      ],
      requiredIssueIds: ["synthetic.issue"],
      verifiedIssueIds: ["synthetic.issue"],
      evidenceReferences: ["test-only-approval-evidence"],
      occurredAt: "2026-07-15T01:00:00.000Z",
      eventId: "synthetic.approval",
    });
    expect(approved).toMatchObject({
      reviewStatus: "APPROVED",
      resolutionStatus: "RESOLVED",
      invalidatedAt: null,
    });
  });

  it("invalidates approvals, signatures, resolution and exclusions on material drift without deleting history", () => {
    const previous = buildFiscalRuleMaterialSnapshot(MATERIAL_INPUT);
    const current = buildFiscalRuleMaterialSnapshot({
      ...MATERIAL_INPUT,
      conditions: [...MATERIAL_INPUT.conditions, "new-condition"],
      exceptions: [...MATERIAL_INPUT.exceptions, "new-exception"],
      materialSources: [
        { ...MATERIAL_INPUT.materialSources[0], contentHash: `sha256:${"4".repeat(64)}` },
      ],
      materialTestHash: `sha256:${"5".repeat(64)}`,
    });
    const inReview = startFiscalRuleReview({
      projection: emptyFiscalApprovalProjection(previous.ruleId),
      snapshot: previous,
      occurredAt: "2026-07-15T00:00:00.000Z",
      eventId: "synthetic.review-start",
    });
    const approved = approveFiscalRuleProjection({
      projection: inReview,
      snapshot: previous,
      signatures: [
        signature("PRIMARY_FISCAL_REVIEWER", "primary-test-only"),
        signature("SECOND_FISCAL_REVIEWER", "second-test-only"),
      ],
      requiredIssueIds: ["synthetic.issue"],
      verifiedIssueIds: ["synthetic.issue"],
      evidenceReferences: ["test-only-approval-evidence"],
      occurredAt: "2026-07-15T01:00:00.000Z",
      eventId: "synthetic.approval",
    });
    const withExclusion = {
      ...approved,
      authorizedExclusionIds: ["synthetic.test.exclusion"],
    };
    const invalidated = invalidateFiscalApproval({
      projection: withExclusion,
      previous,
      current,
      occurredAt: "2026-07-15T02:00:00.000Z",
      eventId: "synthetic.invalidation",
    });
    expect(detectFiscalApprovalInvalidation(previous, current)).toEqual(
      expect.arrayContaining([
        "FISCAL_HASH_CHANGED",
        "CONDITION_CHANGED",
        "EXCEPTION_CHANGED",
        "SOURCE_HASH_CHANGED",
        "MATERIAL_TEST_CHANGED",
      ]),
    );
    expect(invalidated).toMatchObject({
      reviewStatus: "PENDING_FISCAL_REVIEW",
      resolutionStatus: "OPEN",
      reviewedFiscalHash: null,
      authorizedExclusionIds: [],
    });
    expect(invalidated.signatures.every((entry) => entry.revokedAt !== null)).toBe(
      true,
    );
    expect(invalidated.history.map((entry) => entry.eventType)).toEqual([
      "REVIEW_STARTED",
      "RULE_APPROVED",
      "APPROVAL_INVALIDATED",
    ]);
  });

  it.each([
    ["source set", { materialSources: [] }, "SOURCE_SET_CHANGED"],
    ["year", { fiscalYear: 2025 }, "FISCAL_YEAR_CHANGED"],
    ["territory", { territory: "ES_CANARY" }, "TERRITORY_CHANGED"],
    [
      "material test",
      { materialTestHash: `sha256:${"9".repeat(64)}` },
      "MATERIAL_TEST_CHANGED",
    ],
  ])("detects %s drift", (_label, changes, expectedReason) => {
    const previous = buildFiscalRuleMaterialSnapshot(MATERIAL_INPUT);
    const current = buildFiscalRuleMaterialSnapshot({
      ...MATERIAL_INPUT,
      ...changes,
    });
    expect(detectFiscalApprovalInvalidation(previous, current)).toContain(
      expectedReason,
    );
  });
});

describe("fiscal flags, shadow, document confirmation and rollback", () => {
  it("defines exactly four flags and defaults every one to false", () => {
    expect(FISCAL_FEATURE_FLAG_NAMES).toEqual([
      "fiscal_rules_shadow_mode",
      "fiscal_rules_approved_results",
      "fiscal_rules_exclusions",
      "document_auto_confirmation",
    ]);
    expect(Object.keys(DEFAULT_FISCAL_FEATURE_FLAGS).sort()).toEqual(
      [...FISCAL_FEATURE_FLAG_NAMES].sort(),
    );
    expect(fiscalFlagsAreDefaultOff(resolveFiscalFeatureFlags())).toBe(true);
    expect(
      buildFiscalRuntimeState({
        approval: {
          reviewStatus: "PENDING_FISCAL_REVIEW",
          resolutionStatus: "OPEN",
        },
      }),
    ).toMatchObject({
      fiscalMode: "ORIENTATIVE",
      allModelsFallback: "ENABLED",
      shadowMode: "DISABLED",
      exclusions: "BLOCKED",
      documentAutoConfirmation: "BLOCKED",
    });
  });

  it("never lets enabled flags bypass authorizeRuleExclusion", () => {
    const rule = TAX_RULES[0];
    const candidate = rule.fiscalMetadata.exclusionCandidates[0];
    const flags = resolveFiscalFeatureFlags({
      fiscal_rules_approved_results: true,
      fiscal_rules_exclusions: true,
    });
    const result = authorizeFlaggedFiscalExclusion({
      flags,
      authorizationInput: {
        ruleset: {
          rulesetId: rule.version,
          reviewStatus: "PENDING_FISCAL_REVIEW",
          resolutionStatus: "OPEN",
        },
        rule,
        exclusionCandidate: candidate,
        targetFiscalYear: rule.fiscalYear,
        targetTerritory: rule.territory,
        ruleHash: rule.fiscalMetadata.ruleHash,
        approvalEvidence: null,
        issues: [],
        issueRegistryComplete: false,
        facts: {
          hasUnknownRequiredFacts: false,
          hasContradictoryFacts: false,
        },
        internalOverrideRequested: false,
        evaluatedAt: "2026-07-15T00:00:00.000Z",
      },
    });
    expect(result.authorized).toBe(false);
    expect(result.individualAuthorization?.blockingReasons).toContain(
      "RULE_NOT_APPROVED",
    );
  });

  it("keeps shadow output aggregate, non-mutating and unable to count unauthorized exclusions", () => {
    const orientative = assessment("PENDING_FISCAL_REVIEW", "MANUAL_REVIEW");
    const approved = assessment("APPROVED", "RESOLVED");
    const before = JSON.stringify({ orientative, approved });
    const flags: FiscalFeatureFlags = {
      ...DEFAULT_FISCAL_FEATURE_FLAGS,
      fiscal_rules_shadow_mode: true,
    };
    const comparison = compareFiscalShadowResults({
      flags,
      orientative,
      approved,
      exclusionAuthorizations: [],
    });
    expect(comparison).toMatchObject({
      status: "COMPARED",
      potentiallyExcludedCount: 0,
      blockingReasonCount: 1,
      userInterfaceMutated: false,
      calendarMutated: false,
      storedAssessmentMutated: false,
    });
    expect(JSON.stringify({ orientative, approved })).toBe(before);
    const log = buildFiscalShadowAggregateLog(comparison);
    expect(log.containsPersonalData).toBe(false);
    expect(JSON.stringify(log)).not.toContain("reason");
    expect(JSON.stringify(log)).not.toContain("evidence");
  });

  it("keeps document auto-confirmation fail-closed through every required gate", () => {
    const safeInput = {
      flags: DEFAULT_FISCAL_FEATURE_FLAGS,
      layoutValidated: true,
      fiscalYearCompatible: true,
      explicitField: true,
      confidence: 0.99,
      minimumConfidence: 0.95,
      documentComplete: true,
      hasContradiction: false,
      trustPolicyApproved: true,
    };
    expect(authorizeDocumentAutoConfirmation(safeInput)).toEqual({
      authorized: false,
      blockingReasons: ["DOCUMENT_AUTO_CONFIRMATION_FLAG_DISABLED"],
    });
    expect(
      authorizeDocumentAutoConfirmation({
        ...safeInput,
        flags: {
          ...DEFAULT_FISCAL_FEATURE_FLAGS,
          document_auto_confirmation: true,
        },
        layoutValidated: false,
        fiscalYearCompatible: false,
        explicitField: false,
        confidence: 0.5,
        documentComplete: false,
        hasContradiction: true,
        trustPolicyApproved: false,
      }).authorized,
    ).toBe(false);
  });

  it("rolls all runtime flags back without touching history or the Todos fallback", () => {
    const result = rollbackFiscalRuntime({
      currentFlags: {
        fiscal_rules_shadow_mode: true,
        fiscal_rules_approved_results: true,
        fiscal_rules_exclusions: true,
        document_auto_confirmation: true,
      },
      occurredAt: "2026-07-15T00:00:00.000Z",
      reasonCode: "TEST_ROLLBACK",
    });
    expect(fiscalFlagsAreDefaultOff(result.flags)).toBe(true);
    expect(result).toMatchObject({
      effectiveMode: "ORIENTATIVE",
      exclusionsEnabled: false,
      allModelsAvailable: true,
      auditEvent: {
        fallbackAllModels: "ENABLED",
        preservesAssessmentHistory: true,
        preservesApprovalAudit: true,
      },
    });
  });
});
