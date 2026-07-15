import { describe, expect, it } from "vitest";

import {
  approvalFiscalHash,
  buildFiscalApprovalHashRegistry,
  buildFiscalReadiness,
  buildFiscalReviewBundle,
  buildFiscalRuntimeState,
  canonicalizeApprovalRule,
  DEFAULT_FISCAL_FEATURE_FLAGS,
  FISCAL_FEATURE_FLAG_NAMES,
  loadFiscalApprovalState,
  validateFiscalRollbackInfrastructure,
  validateFiscalShadowInfrastructure,
  validateReviewBundle,
} from "./core.mjs";

describe("fiscal approval CLI core", () => {
  it("keeps exactly four runtime flags off", () => {
    expect(FISCAL_FEATURE_FLAG_NAMES).toEqual([
      "fiscal_rules_shadow_mode",
      "fiscal_rules_approved_results",
      "fiscal_rules_exclusions",
      "document_auto_confirmation",
    ]);
    expect(DEFAULT_FISCAL_FEATURE_FLAGS).toEqual({
      fiscal_rules_shadow_mode: false,
      fiscal_rules_approved_results: false,
      fiscal_rules_exclusions: false,
      document_auto_confirmation: false,
    });
    expect(buildFiscalRuntimeState(loadFiscalApprovalState())).toMatchObject({
      fiscalMode: "ORIENTATIVE",
      allModelsFallback: "ENABLED",
      shadowMode: "DISABLED",
      exclusions: "BLOCKED",
      documentAutoConfirmation: "BLOCKED",
    });
  });

  it("canonicalizes material collections deterministically", () => {
    const input = {
      ruleId: "synthetic.test",
      model: "303",
      fiscalYear: 2026,
      territory: "ES_COMMON",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      conditions: ["b", "a"],
      factIds: ["b", "a"],
      decision: "test",
      exceptions: ["b", "a"],
      exclusionIds: ["b", "a"],
      materialSources: [
        {
          sourceId: "b",
          contentHash: "raw-b",
          normalizedContentHash: "normalized-b",
          effectiveFrom: null,
          effectiveTo: null,
          materialScope: "b",
          verificationStatus: "PENDING_FISCAL_REVIEW",
          materialValidityStatus: "UNVERIFIED",
          materialValidityBasis: "PENDING_FISCAL_REVIEW",
        },
        {
          sourceId: "a",
          contentHash: "raw-a",
          normalizedContentHash: "normalized-a",
          effectiveFrom: null,
          effectiveTo: null,
          materialScope: "a",
          verificationStatus: "PENDING_FISCAL_REVIEW",
          materialValidityStatus: "UNVERIFIED",
          materialValidityBasis: "PENDING_FISCAL_REVIEW",
        },
      ],
      materialTestHash: "test-hash",
    };
    expect(
      approvalFiscalHash({
        ...input,
        conditions: [...input.conditions].reverse(),
        materialSources: [...input.materialSources].reverse(),
      }),
    ).toBe(approvalFiscalHash(input));
    expect(canonicalizeApprovalRule(input)).not.toContain("timestamp");
    expect(canonicalizeApprovalRule(input)).not.toContain("comment");
  });

  it("reports the honest pre-professional readiness state", () => {
    const state = loadFiscalApprovalState();
    const registry = buildFiscalApprovalHashRegistry(state);
    expect(registry).toMatchObject({
      ruleCount: 54,
      materialSourceReferenceCount: 72,
      missingMaterialSourceHashCount: 0,
      approvedRuleCount: 0,
      authorizedExclusionCount: 0,
    });
    const report = buildFiscalReadiness(state);
    expect(report).toMatchObject({
      status: "PASS",
      rules: 54,
      pendingRules: 54,
      openRules: 54,
      executableSuites: 54,
      sourceSnapshots: 29,
      verifiedFiscalSources: 0,
      primaryFiscalReviews: 0,
      secondFiscalReviews: 0,
      rulesEligibleForManualApproval: 0,
      approvedRules: 0,
      resolvedRules: 0,
      openIssues: 54,
      authorizedExclusions: 0,
      allModelsFallback: "ENABLED",
      fiscalMode: "ORIENTATIVE",
      errors: [],
    });
  });

  it("builds the priority batch for both years without approvals", () => {
    const bundle = buildFiscalReviewBundle(
      loadFiscalApprovalState(),
      "COMMON_AUTONOMOUS_V1",
    );
    expect(validateReviewBundle(bundle)).toEqual([]);
    expect(bundle).toMatchObject({
      status: "PREPARED_NOT_APPROVED",
      modelCount: 12,
      ruleCount: 24,
      approvalCount: 0,
      authorizedExclusionCount: 0,
    });
    expect(
      bundle.rules
        .filter((rule) => rule.model === "036")
        .every((rule) => rule.modelRole === "CENSUS_ACTION"),
    ).toBe(true);
    expect(new Set(bundle.rules.map((rule) => rule.fiscalYear))).toEqual(
      new Set([2025, 2026]),
    );
    expect(
      bundle.rules.every(
        (rule) =>
          rule.differencesAgainstOtherYear.fiscalReviewConclusion ===
            "NOT_ASSESSED" &&
          [
            "NO_YEAR_SPECIFIC_DIFFERENCE_CODED",
            "CODED_DIFFERENCES_FOUND",
          ].includes(rule.differencesAgainstOtherYear.status),
      ),
    ).toBe(true);
  });

  it("changes approval hashes when a linked B snapshot hash changes", () => {
    const state = loadFiscalApprovalState();
    const before = buildFiscalApprovalHashRegistry(state);
    const changedSource = state.sources.sources[0];
    const changedState = {
      ...state,
      sources: {
        ...state.sources,
        sources: state.sources.sources.map((source) =>
          source.sourceId === changedSource.sourceId
            ? { ...source, contentHash: `sha256:${"f".repeat(64)}` }
            : source,
        ),
      },
    };
    const after = buildFiscalApprovalHashRegistry(changedState);
    const affectedRuleIds = new Set(changedSource.affectedRuleIds);
    for (const previous of before.rules) {
      const current = after.rules.find((rule) => rule.ruleId === previous.ruleId);
      expect(current).toBeDefined();
      if (affectedRuleIds.has(previous.ruleId)) {
        expect(current.approvalFiscalHash).not.toBe(previous.approvalFiscalHash);
      } else {
        expect(current.approvalFiscalHash).toBe(previous.approvalFiscalHash);
      }
    }
  });

  it("validates shadow and rollback with all exclusions blocked", () => {
    const state = loadFiscalApprovalState();
    expect(validateFiscalShadowInfrastructure(state)).toEqual([]);
    expect(validateFiscalRollbackInfrastructure(state)).toEqual([]);
  });
});
