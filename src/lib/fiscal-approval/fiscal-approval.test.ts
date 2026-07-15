import { describe, expect, it } from "vitest";

import type {
  FiscalReviewRegistry,
  FiscalRuleReviewDecision,
  FiscalSourceSnapshotRegistry,
  FiscalSourceVerificationStatus,
} from "@/lib/fiscal-source-review/contracts";
import { computeSourceRegistryHash } from "@/lib/fiscal-source-review/core";
import type { TaxRule } from "@/lib/tax-model-diagnostic/contracts";
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
  buildFiscalApprovalIssueRegistry,
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

function syntheticRule(material: FiscalApprovalHashInput): TaxRule {
  return {
    ...TAX_RULES[0],
    ruleId: material.ruleId,
    modelNumber: material.model,
    fiscalYear: material.fiscalYear,
    territory: material.territory,
    conditions: material.conditions,
    exclusions: material.exceptions,
    officialSourceIds: material.materialSources.map(
      (source) => source.sourceId,
    ),
    fiscalMetadata: {
      ...TAX_RULES[0].fiscalMetadata,
      review: {
        ...TAX_RULES[0].fiscalMetadata.review,
        issueIds: ["synthetic.issue"],
      },
    },
  } as TaxRule;
}

function syntheticSourceRegistry(
  material: FiscalApprovalHashInput,
  verificationOverride?: "PENDING_FISCAL_REVIEW" | "STALE",
): FiscalSourceSnapshotRegistry {
  const sources = material.materialSources.map((source) => ({
    sourceId: source.sourceId,
    authority: "AEAT" as const,
    title: `Synthetic source ${source.sourceId}`,
    officialLocator: `https://example.invalid/${source.sourceId}`,
    finalOfficialLocator: `https://example.invalid/${source.sourceId}`,
    retrievedAt: "2026-07-15T00:00:00.000Z",
    declaredOfficialUpdatedAt: null,
    materialValidity: {
      status: verificationOverride ? ("UNVERIFIED" as const) : ("VERIFIED" as const),
      effectiveFrom: source.effectiveFrom,
      effectiveTo: source.effectiveTo,
      basis: verificationOverride
        ? ("PENDING_FISCAL_REVIEW" as const)
        : ("SIGNED_FISCAL_REVIEW" as const),
    },
    contentHash: source.contentHash as `sha256:${string}`,
    normalizedContentHash:
      source.normalizedContentHash as `sha256:${string}`,
    previousSnapshotHash: null,
    changeDetected: false,
    changeSummary: {
      status: "INITIAL_CAPTURE" as const,
      nature: "INITIAL" as const,
      requiresFiscalReview: false,
      changedFields: [],
    },
    contentLength: 1,
    contentType: "text/html",
    captureScope: "LOCATOR_FRAGMENT" as const,
    snapshotPath: `test-only/${source.sourceId}`,
    materialScope: source.materialScope,
    affectedRuleIds: [material.ruleId],
    verificationStatus:
      (verificationOverride ??
        "VERIFIED_BY_TWO_FISCAL_REVIEWERS") as FiscalSourceVerificationStatus,
    technicalHashStatus: "VALID" as const,
  }));
  const unsigned = {
    contractVersion: "fiscal-source-registry.v2" as const,
    generatedAt: "2026-07-15T00:00:00.000Z",
    sourceCount: sources.length,
    sources,
  };
  return {
    ...unsigned,
    registryHash: computeSourceRegistryHash(unsigned),
  };
}

function reviewDecision(
  material: FiscalApprovalHashInput,
  role: "PRIMARY_FISCAL_REVIEWER" | "SECOND_FISCAL_REVIEWER",
  reviewerId: string,
  overrides: Partial<FiscalRuleReviewDecision> = {},
): FiscalRuleReviewDecision {
  return {
    decisionId: `synthetic.${role}`,
    ruleId: material.ruleId,
    reviewerId,
    reviewerRole: role,
    reviewerTrust: {
      status: "SERVER_VERIFIED",
      subjectType: "FISCAL_PROFESSIONAL",
      identityProvider: "test-only-fiscal-identity",
      verifiedAt: "2026-07-15T00:00:00.000Z",
      verificationReference: `test-only-trust:${reviewerId}`,
    },
    decision: "APPROVE",
    reviewedRuleHash: computeFiscalApprovalRuleHash(material),
    reviewedSourceHashes: material.materialSources.map((source) => ({
      sourceId: source.sourceId,
      contentHash: source.contentHash as `sha256:${string}`,
      normalizedContentHash:
        source.normalizedContentHash as `sha256:${string}`,
    })),
    findings: [],
    incidentIds: ["synthetic.issue"],
    signatureReference: `test-only-signature:${role}`,
    recordedAt: "2026-07-15T00:00:00.000Z",
    origin: "HUMAN_FISCAL_PROFESSIONAL",
    revocation: {
      status: "ACTIVE",
      revokedAt: null,
      reason: null,
      revocationReference: null,
    },
    ...overrides,
  };
}

function approvalFixture(
  material: FiscalApprovalHashInput = MATERIAL_INPUT,
  options: {
    sameReviewer?: boolean;
    sourceVerification?: "PENDING_FISCAL_REVIEW" | "STALE";
    secondRevoked?: boolean;
    registryComplete?: boolean;
  } = {},
) {
  const snapshot = buildFiscalRuleMaterialSnapshot(material);
  const primary = reviewDecision(
    material,
    "PRIMARY_FISCAL_REVIEWER",
    "primary-test-only",
  );
  const second = reviewDecision(
    material,
    "SECOND_FISCAL_REVIEWER",
    options.sameReviewer ? "primary-test-only" : "second-test-only",
    options.secondRevoked
      ? {
          revocation: {
            status: "REVOKED",
            revokedAt: "2026-07-15T00:30:00.000Z",
            reason: "test-only revocation",
            revocationReference: "test-only-revocation:second",
          },
        }
      : {},
  );
  const reviewRegistry: FiscalReviewRegistry = {
    contractVersion: "fiscal-review-registry.v2",
    generatedAt: "2026-07-15T00:30:00.000Z",
    decisions: [primary, second],
  };
  return {
    snapshot,
    rule: syntheticRule(material),
    sourceRegistry: syntheticSourceRegistry(
      material,
      options.sourceVerification,
    ),
    reviewRegistry,
    issueRegistry: buildFiscalApprovalIssueRegistry({
      ruleId: material.ruleId,
      fiscalHash: snapshot.fiscalHash,
      registryComplete: options.registryComplete ?? true,
      issues: [
        {
          issueId: "synthetic.issue",
          status: "VERIFIED",
          evidenceReferences: ["test-only-issue-evidence"],
          verifiedBy: "test-only-issue-verifier",
        },
      ],
    }),
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
    const fixture = approvalFixture();
    const sameReviewer = approvalFixture(MATERIAL_INPUT, {
      sameReviewer: true,
    });
    const snapshot = fixture.snapshot;
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
        rule: sameReviewer.rule,
        sourceRegistry: sameReviewer.sourceRegistry,
        reviewRegistry: sameReviewer.reviewRegistry,
        issueRegistry: sameReviewer.issueRegistry,
        occurredAt: "2026-07-15T01:00:00.000Z",
        eventId: "synthetic.approval",
      }),
    ).toThrow("DUAL_FISCAL_REVIEW_INVALID_REVIEW");

    const approved = approveFiscalRuleProjection({
      projection: inReview,
      snapshot,
      rule: fixture.rule,
      sourceRegistry: fixture.sourceRegistry,
      reviewRegistry: fixture.reviewRegistry,
      issueRegistry: fixture.issueRegistry,
      occurredAt: "2026-07-15T01:00:00.000Z",
      eventId: "synthetic.approval",
    });
    expect(approved).toMatchObject({
      reviewStatus: "APPROVED",
      resolutionStatus: "RESOLVED",
      invalidatedAt: null,
    });
  });

  it("re-evaluates current fiscal decisions, source trust and the canonical issue registry at approval time", () => {
    const valid = approvalFixture();
    const inReview = startFiscalRuleReview({
      projection: emptyFiscalApprovalProjection(valid.snapshot.ruleId),
      snapshot: valid.snapshot,
      occurredAt: "2026-07-15T00:00:00.000Z",
      eventId: "synthetic.revalidation-start",
    });
    const pendingSource = approvalFixture(MATERIAL_INPUT, {
      sourceVerification: "PENDING_FISCAL_REVIEW",
    });
    expect(() =>
      approveFiscalRuleProjection({
        projection: inReview,
        snapshot: valid.snapshot,
        rule: pendingSource.rule,
        sourceRegistry: pendingSource.sourceRegistry,
        reviewRegistry: pendingSource.reviewRegistry,
        issueRegistry: pendingSource.issueRegistry,
        occurredAt: "2026-07-15T01:00:00.000Z",
        eventId: "synthetic.pending-source-approval",
      }),
    ).toThrow("SOURCE_SNAPSHOT_NOT_VERIFIED");

    const revokedReview = approvalFixture(MATERIAL_INPUT, {
      secondRevoked: true,
    });
    expect(() =>
      approveFiscalRuleProjection({
        projection: inReview,
        snapshot: valid.snapshot,
        rule: revokedReview.rule,
        sourceRegistry: revokedReview.sourceRegistry,
        reviewRegistry: revokedReview.reviewRegistry,
        issueRegistry: revokedReview.issueRegistry,
        occurredAt: "2026-07-15T01:00:00.000Z",
        eventId: "synthetic.revoked-review-approval",
      }),
    ).toThrow("DUAL_FISCAL_REVIEW_WAITING_SECOND_REVIEW");

    const incompleteIssues = approvalFixture(MATERIAL_INPUT, {
      registryComplete: false,
    });
    expect(() =>
      approveFiscalRuleProjection({
        projection: inReview,
        snapshot: valid.snapshot,
        rule: incompleteIssues.rule,
        sourceRegistry: incompleteIssues.sourceRegistry,
        reviewRegistry: incompleteIssues.reviewRegistry,
        issueRegistry: incompleteIssues.issueRegistry,
        occurredAt: "2026-07-15T01:00:00.000Z",
        eventId: "synthetic.incomplete-issues-approval",
      }),
    ).toThrow("ISSUE_REGISTRY_INCOMPLETE");

    const emptyButSelfDeclaredComplete = buildFiscalApprovalIssueRegistry({
      ruleId: valid.snapshot.ruleId,
      fiscalHash: valid.snapshot.fiscalHash,
      registryComplete: true,
      issues: [],
    });
    expect(() =>
      approveFiscalRuleProjection({
        projection: inReview,
        snapshot: valid.snapshot,
        rule: valid.rule,
        sourceRegistry: valid.sourceRegistry,
        reviewRegistry: valid.reviewRegistry,
        issueRegistry: emptyButSelfDeclaredComplete,
        occurredAt: "2026-07-15T01:00:00.000Z",
        eventId: "synthetic.empty-issues-approval",
      }),
    ).toThrow("ISSUE_REGISTRY_CANONICAL_SET_MISMATCH");

    expect(() =>
      approveFiscalRuleProjection({
        projection: inReview,
        snapshot: valid.snapshot,
        rule: valid.rule,
        sourceRegistry: valid.sourceRegistry,
        reviewRegistry: valid.reviewRegistry,
        issueRegistry: {
          ...valid.issueRegistry,
          issues: [],
        },
        occurredAt: "2026-07-15T01:00:00.000Z",
        eventId: "synthetic.tampered-issues-approval",
      }),
    ).toThrow("ISSUE_REGISTRY_HASH_MISMATCH");
  });

  it("requires review start to bind the matching rule and a recomputed material hash", () => {
    const snapshot = buildFiscalRuleMaterialSnapshot(MATERIAL_INPUT);
    expect(() =>
      startFiscalRuleReview({
        projection: emptyFiscalApprovalProjection("synthetic.other.rule"),
        snapshot,
        occurredAt: "2026-07-15T00:00:00.000Z",
        eventId: "synthetic.mismatched-start",
      }),
    ).toThrow("FISCAL_APPROVAL_RULE_ID_MISMATCH");
    expect(() =>
      startFiscalRuleReview({
        projection: emptyFiscalApprovalProjection(snapshot.ruleId),
        snapshot: {
          ...snapshot,
          fiscalHash: `fiscal-approval-rule-v1:${"f".repeat(64)}`,
        },
        occurredAt: "2026-07-15T00:00:00.000Z",
        eventId: "synthetic.tampered-start",
      }),
    ).toThrow("FISCAL_SNAPSHOT_HASH_MISMATCH");
    const sourceLess = buildFiscalRuleMaterialSnapshot({
      ...MATERIAL_INPUT,
      materialSources: [],
    });
    expect(() =>
      startFiscalRuleReview({
        projection: emptyFiscalApprovalProjection(sourceLess.ruleId),
        snapshot: sourceLess,
        occurredAt: "2026-07-15T00:00:00.000Z",
        eventId: "synthetic.source-less-start",
      }),
    ).toThrow("FISCAL_MATERIAL_SOURCES_REQUIRED");
  });

  it("blocks approval when fiscal material changes after review start until invalidated", () => {
    const reviewed = buildFiscalRuleMaterialSnapshot(MATERIAL_INPUT);
    const changedMaterial: FiscalApprovalHashInput = {
      ...MATERIAL_INPUT,
      conditions: [...MATERIAL_INPUT.conditions, "changed-after-review-start"],
    };
    const changed = buildFiscalRuleMaterialSnapshot(changedMaterial);
    const changedFixture = approvalFixture(changedMaterial);
    const inReview = startFiscalRuleReview({
      projection: emptyFiscalApprovalProjection(reviewed.ruleId),
      snapshot: reviewed,
      occurredAt: "2026-07-15T00:00:00.000Z",
      eventId: "synthetic.review-start-before-change",
    });

    expect(() =>
      approveFiscalRuleProjection({
        projection: inReview,
        snapshot: changed,
        rule: changedFixture.rule,
        sourceRegistry: changedFixture.sourceRegistry,
        reviewRegistry: changedFixture.reviewRegistry,
        issueRegistry: changedFixture.issueRegistry,
        occurredAt: "2026-07-15T01:00:00.000Z",
        eventId: "synthetic.approval-after-change",
      }),
    ).toThrow("FISCAL_APPROVAL_REVIEW_SNAPSHOT_MISMATCH");

    const invalidated = invalidateFiscalApproval({
      projection: inReview,
      previous: reviewed,
      current: changed,
      rule: changedFixture.rule,
      sourceRegistry: changedFixture.sourceRegistry,
      currentReviewRegistry: changedFixture.reviewRegistry,
      occurredAt: "2026-07-15T01:30:00.000Z",
      eventId: "synthetic.invalidate-after-change",
    });
    expect(invalidated).toMatchObject({
      reviewStatus: "PENDING_FISCAL_REVIEW",
      resolutionStatus: "OPEN",
      reviewedFiscalHash: null,
    });
  });

  it("invalidates approvals, signatures, resolution and exclusions on material drift without deleting history", () => {
    const fixture = approvalFixture();
    const previous = fixture.snapshot;
    const currentMaterial: FiscalApprovalHashInput = {
      ...MATERIAL_INPUT,
      conditions: [...MATERIAL_INPUT.conditions, "new-condition"],
      exceptions: [...MATERIAL_INPUT.exceptions, "new-exception"],
      materialSources: [
        { ...MATERIAL_INPUT.materialSources[0], contentHash: `sha256:${"4".repeat(64)}` },
      ],
      materialTestHash: `sha256:${"5".repeat(64)}`,
    };
    const currentFixture = approvalFixture(currentMaterial);
    const current = currentFixture.snapshot;
    const inReview = startFiscalRuleReview({
      projection: emptyFiscalApprovalProjection(previous.ruleId),
      snapshot: previous,
      occurredAt: "2026-07-15T00:00:00.000Z",
      eventId: "synthetic.review-start",
    });
    const approved = approveFiscalRuleProjection({
      projection: inReview,
      snapshot: previous,
      rule: fixture.rule,
      sourceRegistry: fixture.sourceRegistry,
      reviewRegistry: fixture.reviewRegistry,
      issueRegistry: fixture.issueRegistry,
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
      rule: currentFixture.rule,
      sourceRegistry: currentFixture.sourceRegistry,
      currentReviewRegistry: currentFixture.reviewRegistry,
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

  it("invalidates source trust downgrades and review revocation even when material hashes stay equal", () => {
    const fixture = approvalFixture();
    const inReview = startFiscalRuleReview({
      projection: emptyFiscalApprovalProjection(fixture.snapshot.ruleId),
      snapshot: fixture.snapshot,
      occurredAt: "2026-07-15T00:00:00.000Z",
      eventId: "synthetic.trust-review-start",
    });
    const approved = approveFiscalRuleProjection({
      projection: inReview,
      snapshot: fixture.snapshot,
      rule: fixture.rule,
      sourceRegistry: fixture.sourceRegistry,
      reviewRegistry: fixture.reviewRegistry,
      issueRegistry: fixture.issueRegistry,
      occurredAt: "2026-07-15T01:00:00.000Z",
      eventId: "synthetic.trust-approval",
    });
    const downgraded = buildFiscalRuleMaterialSnapshot({
      ...MATERIAL_INPUT,
      materialSources: MATERIAL_INPUT.materialSources.map((source) => ({
        ...source,
        verificationStatus: "STALE",
        materialValidityStatus: "STALE",
        materialValidityBasis: "PENDING_FISCAL_REVIEW",
      })),
    });
    expect(downgraded.fiscalHash).toBe(fixture.snapshot.fiscalHash);
    expect(
      detectFiscalApprovalInvalidation(fixture.snapshot, downgraded),
    ).toEqual(
      expect.arrayContaining([
        "SOURCE_VERIFICATION_DOWNGRADED",
        "MATERIAL_VALIDITY_DOWNGRADED",
      ]),
    );
    const sourceInvalidated = invalidateFiscalApproval({
      projection: approved,
      previous: fixture.snapshot,
      current: downgraded,
      rule: fixture.rule,
      sourceRegistry: fixture.sourceRegistry,
      currentReviewRegistry: fixture.reviewRegistry,
      occurredAt: "2026-07-15T02:00:00.000Z",
      eventId: "synthetic.source-downgrade",
    });
    expect(sourceInvalidated.invalidationReasons).toEqual(
      expect.arrayContaining([
        "SOURCE_VERIFICATION_DOWNGRADED",
        "MATERIAL_VALIDITY_DOWNGRADED",
      ]),
    );

    const reviewInvalidated = invalidateFiscalApproval({
      projection: approved,
      previous: fixture.snapshot,
      current: fixture.snapshot,
      rule: fixture.rule,
      sourceRegistry: fixture.sourceRegistry,
      currentReviewRegistry: approvalFixture(MATERIAL_INPUT, {
        secondRevoked: true,
      }).reviewRegistry,
      occurredAt: "2026-07-15T02:00:00.000Z",
      eventId: "synthetic.review-revocation",
    });
    expect(reviewInvalidated.invalidationReasons).toContain(
      "FISCAL_REVIEW_REVOKED",
    );
    expect(reviewInvalidated.reviewStatus).toBe("PENDING_FISCAL_REVIEW");
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
      applicationStatus: "PLAN_ONLY",
      runtimeFlagProvider: "NOT_CONFIGURED",
      deployRequirement: "PROVIDER_DEPENDENT",
      auditEvent: {
        fallbackAllModels: "ENABLED",
        preservesAssessmentHistory: true,
        preservesApprovalAudit: true,
      },
    });
  });
});
