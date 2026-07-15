import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import inventoryJson from "../../../docs/fiscal/rule-inventory.json";
import reviewRegistryJson from "../../../docs/fiscal/sources/review-records.v1.json";
import sourceRegistryJson from "../../../docs/fiscal/sources/source-snapshot-registry.v1.json";
import { TAX_RULES } from "../tax-model-diagnostic/rules";
import type {
  FiscalReviewRegistry,
  FiscalRuleReviewRecord,
  FiscalSourceSnapshotRegistry,
} from "./contracts";
import {
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
const inventory = inventoryJson as {
  rules: Array<{
    ruleId: string;
    ruleHash: string;
    reviewStatus: string;
    resolutionStatus: string;
    exclusionAuthorized: boolean;
    sourceIds: string[];
  }>;
};

function review(
  rule = TAX_RULES[0],
  overrides: Partial<FiscalRuleReviewRecord> = {},
): FiscalRuleReviewRecord {
  const sourceById = new Map(
    sourceRegistry.sources.map((source) => [source.sourceId, source]),
  );
  return {
    reviewId: `${rule.ruleId}.primary.v1`,
    ruleId: rule.ruleId,
    reviewerId: "fiscal-professional-1",
    reviewerRole: "PRIMARY_FISCAL_REVIEWER",
    decision: "APPROVE",
    reviewedRuleHash: rule.fiscalMetadata.ruleHash,
    reviewedSourceHashes: rule.officialSourceIds.map((sourceId) => ({
      sourceId,
      snapshotHash: sourceById.get(sourceId)?.snapshotHash ?? "sha256:missing",
    })),
    findings: [],
    incidentIds: [],
    signatureReference: "signed-review://primary/reference-1",
    recordedAt: "2026-07-15T12:00:00Z",
    origin: "HUMAN_SIGNED_FISCAL_REVIEW",
    ...overrides,
  };
}

describe("versioned official fiscal source snapshots", () => {
  it("registers every current source with immutable bytes and pending validity", () => {
    expect(sourceRegistry.contractVersion).toBe("fiscal-source-registry.v1");
    expect(sourceRegistry.sourceCount).toBe(29);
    expect(sourceRegistry.sources).toHaveLength(29);
    expect(
      sourceRegistry.sources.every(
        (source) =>
          source.snapshotHash.startsWith("sha256:") &&
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
    }
  });

  it("validates hashes, source-rule links and all fail-closed fiscal states", () => {
    const ruleSourceIds = new Map(
      inventory.rules.map((rule) => [rule.ruleId, rule.sourceIds]),
    );
    expect(
      validateFiscalSourceState(sourceRegistry, emptyReviews, {
        rootDirectory: process.cwd(),
        expectedSourceIds: sourceRegistry.sources.map(
          (source) => source.sourceId,
        ),
        expectedRuleSourceIds: ruleSourceIds,
        expectedRuleStates: inventory.rules,
      }),
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
  });

  it("detects added, modified and removed sources and names impacted rules", () => {
    const [removed, modified] = sourceRegistry.sources;
    const candidateWithoutHash = {
      contractVersion: sourceRegistry.contractVersion,
      generatedAt: "2026-07-16",
      sourceCount: sourceRegistry.sourceCount,
      sources: [
        ...sourceRegistry.sources.slice(1).map((source) =>
          source.sourceId === modified.sourceId
            ? { ...source, snapshotHash: "sha256:changed" as const }
            : source,
        ),
        {
          ...removed,
          sourceId: "aeat.new-official-source",
          affectedRuleIds: [TAX_RULES[0].ruleId],
        },
      ],
    };
    const candidate: FiscalSourceSnapshotRegistry = {
      ...candidateWithoutHash,
      registryHash: computeSourceRegistryHash(candidateWithoutHash),
    };
    const report = diffFiscalSourceRegistries(
      sourceRegistry,
      candidate,
      emptyReviews,
    );
    expect(report.status).toBe("CHANGED");
    expect(report.changes.map((change) => change.changeType)).toEqual([
      "REMOVED",
      "MODIFIED",
      "NEW",
    ]);
    expect(report.affectedRuleIds.length).toBeGreaterThan(0);
  });

  it("marks signed recommendations for invalidation after source drift", () => {
    const rule = TAX_RULES[0];
    const record = review(rule);
    const sourceId = rule.officialSourceIds[0];
    const candidateWithoutHash = {
      contractVersion: sourceRegistry.contractVersion,
      generatedAt: "2026-07-16",
      sourceCount: sourceRegistry.sourceCount,
      sources: sourceRegistry.sources.map((source) =>
        source.sourceId === sourceId
          ? { ...source, snapshotHash: "sha256:changed" as const }
          : source,
      ),
    };
    const report = diffFiscalSourceRegistries(
      sourceRegistry,
      {
        ...candidateWithoutHash,
        registryHash: computeSourceRegistryHash(candidateWithoutHash),
      },
      {
        contractVersion: "fiscal-review-registry.v1",
        generatedAt: "2026-07-15",
        records: [record],
      },
    );
    expect(report.reviewIdsToInvalidate).toEqual([record.reviewId]);
    expect(report.ruleApprovalsToInvalidate).toEqual([rule.ruleId]);
  });
});

describe("fail-closed double fiscal review", () => {
  it("never treats one approval recommendation as rule approval", () => {
    const rule = TAX_RULES[0];
    const result = evaluateDualFiscalReview(rule, sourceRegistry, {
      contractVersion: "fiscal-review-registry.v1",
      generatedAt: "2026-07-15",
      records: [review(rule)],
    });
    expect(result.state).toBe("WAITING_SECOND_REVIEW");
    expect(result.changesRuleReviewStatus).toBe(false);
    expect(rule.fiscalMetadata.review.reviewStatus).toBe(
      "PENDING_FISCAL_REVIEW",
    );
  });

  it("rejects the same person in both reviewer roles", () => {
    const rule = TAX_RULES[0];
    const primary = review(rule);
    const second = review(rule, {
      reviewId: `${rule.ruleId}.second.v1`,
      reviewerRole: "SECOND_FISCAL_REVIEWER",
      signatureReference: "signed-review://second/reference-2",
    });
    const result = evaluateDualFiscalReview(rule, sourceRegistry, {
      contractVersion: "fiscal-review-registry.v1",
      generatedAt: "2026-07-15",
      records: [primary, second],
    });
    expect(result.state).toBe("INVALID_REVIEW");
    expect(result.blockingReasons).toContain("SAME_REVIEWER_FOR_BOTH_ROLES");
  });

  it("rejects duplicate reviewer roles and approval recommendations with blockers", () => {
    const rule = TAX_RULES[0];
    const first = review(rule);
    const duplicate = review(rule, {
      reviewId: `${rule.ruleId}.primary.v2`,
      reviewerId: "fiscal-professional-2",
      findings: [
        {
          findingId: "finding.blocking",
          severity: "BLOCKING",
          summary: "Excepción fiscal sin resolver",
        },
      ],
      signatureReference: "signed-review://primary/reference-2",
    });
    const result = evaluateDualFiscalReview(rule, sourceRegistry, {
      contractVersion: "fiscal-review-registry.v1",
      generatedAt: "2026-07-15",
      records: [first, duplicate],
    });
    expect(result.state).toBe("INVALID_REVIEW");
    expect(result.blockingReasons.join(" ")).toContain(
      "APPROVE_WITH_BLOCKING_FINDINGS",
    );
  });

  it("invalidates stale rule and source hashes", () => {
    const rule = TAX_RULES[0];
    const stale = review(rule, {
      reviewedRuleHash: "fiscal-rule-v1:stale",
      reviewedSourceHashes: review(rule).reviewedSourceHashes.map(
        (source, index) =>
          index === 0 ? { ...source, snapshotHash: "sha256:stale" } : source,
      ),
    });
    const result = evaluateDualFiscalReview(rule, sourceRegistry, {
      contractVersion: "fiscal-review-registry.v1",
      generatedAt: "2026-07-15",
      records: [stale],
    });
    expect(result.state).toBe("STALE_REVIEW");
    expect(result.blockingReasons.join(" ")).toContain("STALE_RULE_HASH");
    expect(result.blockingReasons.join(" ")).toContain("STALE_SOURCE_HASH");
  });

  it("requires distinct signed human reviews and still only becomes manually eligible", () => {
    const rule = TAX_RULES[0];
    const primary = review(rule);
    const second = review(rule, {
      reviewId: `${rule.ruleId}.second.v1`,
      reviewerId: "fiscal-professional-2",
      reviewerRole: "SECOND_FISCAL_REVIEWER",
      signatureReference: "signed-review://second/reference-2",
    });
    const reviews: FiscalReviewRegistry = {
      contractVersion: "fiscal-review-registry.v1",
      generatedAt: "2026-07-15",
      records: [primary, second],
    };
    const result = evaluateDualFiscalReview(rule, sourceRegistry, reviews);
    const view = buildCompactFiscalReviewView(
      rule,
      sourceRegistry,
      reviews,
    );
    expect(result.state).toBe("ELIGIBLE_FOR_MANUAL_APPROVAL");
    expect(result.changesRuleReviewStatus).toBe(false);
    expect(view.automaticApproval).toBe(false);
    expect(view.availableDecisions).toEqual([
      "APPROVE",
      "REJECT",
      "REQUEST_CHANGES",
    ]);
    expect(view.conditions).toEqual(rule.conditions);
    expect(view.exceptions).toEqual(rule.exclusions);
    expect(view.sources).toHaveLength(rule.officialSourceIds.length);
  });

  it("blocks records that claim an automated origin", () => {
    const malformed = {
      ...review(),
      origin: "CODEX_AUTOMATIC_REVIEW",
    } as unknown as FiscalRuleReviewRecord;
    const ruleSourceIds = new Map(
      inventory.rules.map((rule) => [rule.ruleId, rule.sourceIds]),
    );
    expect(
      validateFiscalSourceState(
        sourceRegistry,
        {
          contractVersion: "fiscal-review-registry.v1",
          generatedAt: "2026-07-15",
          records: [malformed],
        },
        {
          rootDirectory: process.cwd(),
          expectedSourceIds: sourceRegistry.sources.map(
            (source) => source.sourceId,
          ),
          expectedRuleSourceIds: ruleSourceIds,
          expectedRuleStates: inventory.rules,
        },
      ),
    ).toContain(`${malformed.reviewId}:AUTOMATED_REVIEW_FORBIDDEN`);
  });
});
