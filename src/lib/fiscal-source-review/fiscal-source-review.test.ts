import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import approvalRegistryJson from "../../../docs/fiscal/approval/fiscal-approval-registry.v1.json";
import inventoryJson from "../../../docs/fiscal/rule-inventory.json";
import reviewRegistryJson from "../../../docs/fiscal/sources/review-decisions.v2.json";
import sourceRegistryJson from "../../../docs/fiscal/sources/source-snapshot-registry.v2.json";
import { TAX_RULES } from "../tax-model-diagnostic/rules";
import type {
  FiscalReviewRegistry,
  FiscalRuleReviewDecision,
  FiscalSourceSnapshot,
  FiscalSourceSnapshotRegistry,
} from "./contracts";
import {
  computeNormalizedContentHash,
  computeSourceRegistryHash,
  diffFiscalSourceRegistries,
  validateFiscalSourceState,
} from "./core";
import {
  buildCompactFiscalReviewView,
  evaluateDualFiscalReview,
} from "./review";

const sourceRegistry =
  sourceRegistryJson as unknown as FiscalSourceSnapshotRegistry;
const emptyReviews = reviewRegistryJson as FiscalReviewRegistry;
const inventoryBase = inventoryJson as {
  rules: Array<{
    ruleId: string;
    ruleHash: string;
    reviewStatus: string;
    resolutionStatus: string;
    exclusionAuthorized: boolean;
    sourceIds: string[];
  }>;
};
const approvalHashByRule = new Map(
  (
    approvalRegistryJson as {
      rules: Array<{ ruleId: string; approvalFiscalHash: string }>;
    }
  ).rules.map((rule) => [rule.ruleId, rule.approvalFiscalHash]),
);
const inventory = {
  ...inventoryBase,
  rules: inventoryBase.rules.map((rule) => ({
    ...rule,
    approvalFiscalHash:
      approvalHashByRule.get(rule.ruleId) ?? "MISSING_APPROVAL_FISCAL_HASH",
  })),
};

function approvalHashForRule(rule = TAX_RULES[0]): string {
  const hash = approvalHashByRule.get(rule.ruleId);
  if (!hash) throw new Error(`MISSING_APPROVAL_FISCAL_HASH:${rule.ruleId}`);
  return hash;
}

function decision(
  rule = TAX_RULES[0],
  overrides: Partial<FiscalRuleReviewDecision> = {},
): FiscalRuleReviewDecision {
  const sourceById = new Map(
    sourceRegistry.sources.map((source) => [source.sourceId, source]),
  );
  return {
    decisionId: `${rule.ruleId}.primary.v1`,
    ruleId: rule.ruleId,
    reviewerId: "fiscal-professional-1",
    reviewerRole: "PRIMARY_FISCAL_REVIEWER",
    reviewerTrust: {
      status: "SERVER_VERIFIED",
      subjectType: "FISCAL_PROFESSIONAL",
      identityProvider: "server-fiscal-identity",
      verifiedAt: "2026-07-15T11:55:00Z",
      verificationReference: "server-trust://fiscal-professional-1/v1",
    },
    decision: "APPROVE",
    reviewedRuleHash: approvalHashForRule(rule),
    reviewedSourceHashes: rule.officialSourceIds.map((sourceId) => ({
      sourceId,
      contentHash:
        sourceById.get(sourceId)?.contentHash ?? "sha256:missing",
      normalizedContentHash:
        sourceById.get(sourceId)?.normalizedContentHash ?? "sha256:missing",
    })),
    findings: [],
    incidentIds: [],
    signatureReference: "signed-review://primary/reference-1",
    recordedAt: "2026-07-15T12:00:00Z",
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

function registryWith(sources: readonly FiscalSourceSnapshot[]) {
  const unsigned = {
    contractVersion: sourceRegistry.contractVersion,
    generatedAt: "2026-07-16",
    sourceCount: sources.length,
    sources,
  };
  return {
    ...unsigned,
    registryHash: computeSourceRegistryHash(unsigned),
  } satisfies FiscalSourceSnapshotRegistry;
}

function validationContext() {
  return {
    rootDirectory: process.cwd(),
    expectedSourceIds: sourceRegistry.sources.map((source) => source.sourceId),
    expectedRuleSourceIds: new Map(
      inventory.rules.map((rule) => [rule.ruleId, rule.sourceIds]),
    ),
    expectedRuleStates: inventory.rules,
  };
}

describe("versioned official fiscal source snapshots", () => {
  it("registers every current source with raw and normalized hashes, history and pending validity", () => {
    expect(sourceRegistry.contractVersion).toBe("fiscal-source-registry.v2");
    expect(sourceRegistry.sourceCount).toBe(29);
    expect(sourceRegistry.sources).toHaveLength(29);
    expect(
      sourceRegistry.sources.every(
        (source) =>
          source.contentHash.startsWith("sha256:") &&
          source.normalizedContentHash.startsWith("sha256:") &&
          source.previousSnapshotHash === null &&
          source.changeDetected === false &&
          source.changeSummary.status === "INITIAL_CAPTURE" &&
          source.changeSummary.nature === "INITIAL" &&
          source.changeSummary.requiresFiscalReview === false &&
          source.technicalHashStatus === "VALID" &&
          (source.captureScope === "FULL_DOCUMENT" ||
            source.captureScope === "LOCATOR_FRAGMENT") &&
          source.verificationStatus === "PENDING_FISCAL_REVIEW" &&
          source.materialValidity.status === "UNVERIFIED" &&
          source.materialValidity.basis === "PENDING_FISCAL_REVIEW",
      ),
    ).toBe(true);

    for (const source of sourceRegistry.sources) {
      const bytes = readFileSync(source.snapshotPath);
      expect(bytes.byteLength).toBe(source.contentLength);
      expect(computeNormalizedContentHash(bytes, source.contentType)).toBe(
        source.normalizedContentHash,
      );
    }
  });

  it("validates hashes, source-rule links and all fail-closed fiscal states", () => {
    expect(
      validateFiscalSourceState(
        sourceRegistry,
        emptyReviews,
        validationContext(),
      ),
    ).toEqual([]);
    expect(inventory.rules).toHaveLength(54);
    expect(
      inventory.rules.every(
        (rule) =>
          rule.reviewStatus === "PENDING_FISCAL_REVIEW" &&
          rule.resolutionStatus === "OPEN" &&
          rule.exclusionAuthorized === false,
      ),
    ).toBe(true);
    expect(emptyReviews.decisions).toEqual([]);
  });

  it("rejects inconsistent snapshot history instead of treating it as reviewed", () => {
    const current = sourceRegistry.sources[0];
    const malformed = registryWith(
      sourceRegistry.sources.map((source) =>
        source.sourceId === current.sourceId
          ? {
              ...source,
              previousSnapshotHash: current.contentHash,
              changeDetected: false,
              changeSummary: {
                status: "INITIAL_CAPTURE" as const,
                nature: "INITIAL" as const,
                requiresFiscalReview: false,
                changedFields: [],
              },
            }
          : source,
      ),
    );
    expect(
      validateFiscalSourceState(
        malformed,
        emptyReviews,
        validationContext(),
      ),
    ).toContain(`${current.sourceId}:INCONSISTENT_CHANGE_HISTORY`);
  });

  it("distinguishes new, modified and removed sources but always requires fiscal review", () => {
    const [removed, modified] = sourceRegistry.sources;
    const candidate = registryWith([
      ...sourceRegistry.sources.slice(1).map((source) =>
        source.sourceId === modified.sourceId
          ? { ...source, contentHash: "sha256:changed" as const }
          : source,
      ),
      {
        ...removed,
        sourceId: "aeat.new-official-source",
        affectedRuleIds: [TAX_RULES[0].ruleId],
      },
    ]);
    const report = diffFiscalSourceRegistries(
      sourceRegistry,
      candidate,
      emptyReviews,
    );
    expect(report.status).toBe("CHANGED_REQUIRES_FISCAL_REVIEW");
    expect(new Set(report.changes.map((change) => change.changeType))).toEqual(
      new Set(["NEW", "MODIFIED", "REMOVED"]),
    );
    expect(
      report.changes.every(
        (change) =>
          change.reviewRequirement === "REQUIRES_FISCAL_REVIEW" &&
          change.changeSummary.toLowerCase().includes("requiere revisión fiscal"),
      ),
    ).toBe(true);
    expect(report.automaticallyIrrelevantChanges).toEqual([]);
  });

  it("classifies normalized-equal byte drift as technical without declaring it irrelevant", () => {
    const source = sourceRegistry.sources[0];
    const report = diffFiscalSourceRegistries(
      sourceRegistry,
      registryWith(
        sourceRegistry.sources.map((candidate) =>
          candidate.sourceId === source.sourceId
            ? { ...candidate, contentHash: "sha256:technical" as const }
            : candidate,
        ),
      ),
      emptyReviews,
    );
    expect(report.changes[0].changeNature).toBe("TECHNICAL");
    expect(report.changes[0].reviewRequirement).toBe(
      "REQUIRES_FISCAL_REVIEW",
    );
    expect(report.automaticallyIrrelevantChanges).toEqual([]);
  });

  it("classifies declared material drift and indeterminate normalized drift separately", () => {
    const source = sourceRegistry.sources[0];
    const material = diffFiscalSourceRegistries(
      sourceRegistry,
      registryWith(
        sourceRegistry.sources.map((candidate) =>
          candidate.sourceId === source.sourceId
            ? { ...candidate, materialScope: `${candidate.materialScope} changed` }
            : candidate,
        ),
      ),
      emptyReviews,
    );
    const indeterminate = diffFiscalSourceRegistries(
      sourceRegistry,
      registryWith(
        sourceRegistry.sources.map((candidate) =>
          candidate.sourceId === source.sourceId
            ? {
                ...candidate,
                contentHash: "sha256:raw-changed" as const,
                normalizedContentHash: "sha256:normalized-changed" as const,
              }
            : candidate,
        ),
      ),
      emptyReviews,
    );
    expect(material.changes[0].changeNature).toBe("MATERIAL");
    expect(indeterminate.changes[0].changeNature).toBe("INDETERMINATE");
  });

  it("identifies active decisions to revoke and approvals to invalidate after source drift", () => {
    const rule = TAX_RULES[0];
    const currentDecision = decision(rule);
    const sourceId = rule.officialSourceIds[0];
    const report = diffFiscalSourceRegistries(
      sourceRegistry,
      registryWith(
        sourceRegistry.sources.map((source) =>
          source.sourceId === sourceId
            ? {
                ...source,
                normalizedContentHash: "sha256:changed" as const,
              }
            : source,
        ),
      ),
      {
        contractVersion: "fiscal-review-registry.v2",
        generatedAt: "2026-07-15",
        decisions: [currentDecision],
      },
    );
    expect(report.decisionIdsToRevoke).toEqual([
      currentDecision.decisionId,
    ]);
    expect(report.ruleApprovalsToInvalidate).toEqual([rule.ruleId]);
    expect(
      evaluateDualFiscalReview(
        rule,
        registryWith(
          sourceRegistry.sources.map((source) =>
            source.sourceId === sourceId
              ? {
                  ...source,
                  normalizedContentHash: "sha256:changed" as const,
                }
              : source,
          ),
        ),
        {
          contractVersion: "fiscal-review-registry.v2",
          generatedAt: "2026-07-15",
          decisions: [currentDecision],
        },
        approvalHashForRule(rule),
      ).state,
    ).toBe("STALE_REVIEW");
  });
});

describe("fail-closed double fiscal review", () => {
  it("can evaluate the source-linked approval hash instead of the pending technical hash", () => {
    const rule = TAX_RULES[0];
    const approvalHash = `fiscal-approval-rule-v1:${"a".repeat(64)}`;
    const current = decision(rule, { reviewedRuleHash: approvalHash });
    expect(
      evaluateDualFiscalReview(
        rule,
        sourceRegistry,
        {
          contractVersion: "fiscal-review-registry.v2",
          generatedAt: "2026-07-15",
          decisions: [current],
        },
        approvalHash,
      ).state,
    ).toBe("WAITING_SECOND_REVIEW");
  });

  it("never treats one approval decision as rule approval", () => {
    const rule = TAX_RULES[0];
    const result = evaluateDualFiscalReview(
      rule,
      sourceRegistry,
      {
        contractVersion: "fiscal-review-registry.v2",
        generatedAt: "2026-07-15",
        decisions: [decision(rule)],
      },
      approvalHashForRule(rule),
    );
    expect(result.state).toBe("WAITING_SECOND_REVIEW");
    expect(result.changesRuleReviewStatus).toBe(false);
    expect(rule.fiscalMetadata.review.reviewStatus).toBe(
      "PENDING_FISCAL_REVIEW",
    );
  });

  it("rejects the same person in both active reviewer roles", () => {
    const rule = TAX_RULES[0];
    const primary = decision(rule);
    const second = decision(rule, {
      decisionId: `${rule.ruleId}.second.v1`,
      reviewerRole: "SECOND_FISCAL_REVIEWER",
      signatureReference: "signed-review://second/reference-2",
    });
    const result = evaluateDualFiscalReview(
      rule,
      sourceRegistry,
      {
        contractVersion: "fiscal-review-registry.v2",
        generatedAt: "2026-07-15",
        decisions: [primary, second],
      },
      approvalHashForRule(rule),
    );
    expect(result.state).toBe("INVALID_REVIEW");
    expect(result.blockingReasons).toContain("SAME_REVIEWER_FOR_BOTH_ROLES");
  });

  it("invalidates stale rule, raw source and normalized source hashes", () => {
    const rule = TAX_RULES[0];
    const stale = decision(rule, {
      reviewedRuleHash: "fiscal-rule-v1:stale",
      reviewedSourceHashes: decision(rule).reviewedSourceHashes.map(
        (source, index) =>
          index === 0
            ? {
                ...source,
                contentHash: "sha256:stale",
                normalizedContentHash: "sha256:stale-normalized",
              }
            : source,
      ),
    });
    const result = evaluateDualFiscalReview(
      rule,
      sourceRegistry,
      {
        contractVersion: "fiscal-review-registry.v2",
        generatedAt: "2026-07-15",
        decisions: [stale],
      },
      approvalHashForRule(rule),
    );
    expect(result.state).toBe("STALE_REVIEW");
    expect(result.blockingReasons.join(" ")).toContain("STALE_RULE_HASH");
    expect(result.blockingReasons.join(" ")).toContain(
      "STALE_SOURCE_CONTENT_HASH",
    );
    expect(result.blockingReasons.join(" ")).toContain(
      "STALE_SOURCE_NORMALIZED_HASH",
    );
  });

  it("requires server-verified fiscal identity and blocks technical, user or Codex substitutes", () => {
    for (const origin of [
      "CODEX_AUTOMATIC_REVIEW",
      "TECHNICAL_REVIEW",
      "USER_CONFIRMATION",
    ]) {
      const malformed = {
        ...decision(),
        decisionId: `malformed.${origin}`,
        origin,
        reviewerTrust: {
          ...decision().reviewerTrust,
          status: "UNVERIFIED",
        },
      } as unknown as FiscalRuleReviewDecision;
      const errors = validateFiscalSourceState(
        sourceRegistry,
        {
          contractVersion: "fiscal-review-registry.v2",
          generatedAt: "2026-07-15",
          decisions: [malformed],
        },
        validationContext(),
      );
      expect(errors).toContain(
        `${malformed.decisionId}:AUTOMATED_OR_NON_FISCAL_REVIEW_FORBIDDEN`,
      );
      expect(errors).toContain(
        `${malformed.decisionId}:SERVER_VERIFIED_REVIEWER_IDENTITY_REQUIRED`,
      );
    }
  });

  it("records a server-verified technical decision without substituting either fiscal reviewer", () => {
    const rule = TAX_RULES[0];
    const technical = decision(rule, {
      decisionId: `${rule.ruleId}.technical.v1`,
      reviewerId: "technical-reviewer-1",
      reviewerRole: "TECHNICAL_REVIEWER",
      reviewerTrust: {
        status: "SERVER_VERIFIED",
        subjectType: "TECHNICAL_REVIEWER",
        identityProvider: "server-technical-identity",
        verifiedAt: "2026-07-15T10:00:00Z",
        verificationReference: "server-trust://technical-reviewer-1/v1",
      },
      origin: "HUMAN_TECHNICAL_REVIEWER",
      signatureReference: "signed-review://technical/reference-1",
    });
    const technicalOnly: FiscalReviewRegistry = {
      contractVersion: "fiscal-review-registry.v2",
      generatedAt: "2026-07-15",
      decisions: [technical],
    };
    const initial = evaluateDualFiscalReview(
      rule,
      sourceRegistry,
      technicalOnly,
      approvalHashForRule(rule),
    );
    const withPrimary = evaluateDualFiscalReview(
      rule,
      sourceRegistry,
      {
        ...technicalOnly,
        decisions: [technical, decision(rule)],
      },
      approvalHashForRule(rule),
    );
    const view = buildCompactFiscalReviewView(
      rule,
      sourceRegistry,
      technicalOnly,
      approvalHashForRule(rule),
    );
    expect(initial.state).toBe("WAITING_PRIMARY_REVIEW");
    expect(initial.validDecisionIds).toEqual([technical.decisionId]);
    expect(withPrimary.state).toBe("WAITING_SECOND_REVIEW");
    expect(view.decisions).toContainEqual(
      expect.objectContaining({
        decisionId: technical.decisionId,
        reviewerRole: "TECHNICAL_REVIEWER",
        decision: "APPROVE",
      }),
    );
    expect(
      validateFiscalSourceState(
        sourceRegistry,
        technicalOnly,
        validationContext(),
      ),
    ).toEqual([]);
    expect(initial.state).not.toBe("ELIGIBLE_FOR_MANUAL_APPROVAL");
    expect(withPrimary.state).not.toBe("ELIGIBLE_FOR_MANUAL_APPROVAL");
  });

  it("ignores revoked decisions and records them separately", () => {
    const rule = TAX_RULES[0];
    const revoked = decision(rule, {
      revocation: {
        status: "REVOKED",
        revokedAt: "2026-07-16T09:00:00Z",
        reason: "La fuente oficial ha cambiado",
        revocationReference: "server-revocation://decision/1",
      },
    });
    const result = evaluateDualFiscalReview(
      rule,
      sourceRegistry,
      {
        contractVersion: "fiscal-review-registry.v2",
        generatedAt: "2026-07-16",
        decisions: [revoked],
      },
      approvalHashForRule(rule),
    );
    expect(result.state).toBe("WAITING_PRIMARY_REVIEW");
    expect(result.validDecisionIds).toEqual([]);
    expect(result.revokedDecisionIds).toEqual([revoked.decisionId]);
  });

  it("requires two distinct current decisions and still only becomes manually eligible", () => {
    const rule = TAX_RULES[0];
    const primary = decision(rule);
    const second = decision(rule, {
      decisionId: `${rule.ruleId}.second.v1`,
      reviewerId: "fiscal-professional-2",
      reviewerRole: "SECOND_FISCAL_REVIEWER",
      reviewerTrust: {
        status: "SERVER_VERIFIED",
        subjectType: "FISCAL_PROFESSIONAL",
        identityProvider: "server-fiscal-identity",
        verifiedAt: "2026-07-15T12:05:00Z",
        verificationReference: "server-trust://fiscal-professional-2/v1",
      },
      signatureReference: "signed-review://second/reference-2",
    });
    const reviews: FiscalReviewRegistry = {
      contractVersion: "fiscal-review-registry.v2",
      generatedAt: "2026-07-15",
      decisions: [primary, second],
    };
    const result = evaluateDualFiscalReview(
      rule,
      sourceRegistry,
      reviews,
      approvalHashForRule(rule),
    );
    const view = buildCompactFiscalReviewView(
      rule,
      sourceRegistry,
      reviews,
      approvalHashForRule(rule),
    );
    expect(result.state).toBe("ELIGIBLE_FOR_MANUAL_APPROVAL");
    expect(result.changesRuleReviewStatus).toBe(false);
    expect(view.automaticApproval).toBe(false);
    expect(view.availableActions).toEqual([
      "APPROVE",
      "REJECT",
      "REQUEST_CHANGES",
      "REVOKE_DECISION",
    ]);
    expect(view.conditions).toEqual(rule.conditions);
    expect(view.exceptions).toEqual(rule.exclusions);
    expect(view.sources).toHaveLength(rule.officialSourceIds.length);
    expect(view.decisions).toHaveLength(2);
    expect(view.hashes.sourceContentHashes).toHaveLength(
      rule.officialSourceIds.length,
    );
    expect(view.hashes.sourceNormalizedHashes).toHaveLength(
      rule.officialSourceIds.length,
    );
  });
});
