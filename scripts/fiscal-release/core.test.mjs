import { describe, expect, it } from "vitest";

import {
  buildFiscalReleaseSnapshot,
  renderFiscalReleaseReport,
} from "./core.mjs";

function fixture() {
  const rules = Array.from({ length: 54 }, (_, index) => ({
    ruleId: `rule-${String(index + 1).padStart(2, "0")}`,
    ruleHash: `fiscal-rule-v1:${String(index + 1).padStart(64, "0")}`,
    executableTestsStatus: "PASSING",
    executableTestCount: 10,
    passingTestCount: 10,
    missingCategories: [],
    mutationScore: 100,
    safetyCriticalMutationScore: 100,
  }));
  const approvalRules = rules.map((rule, index) => ({
    ruleId: rule.ruleId,
    approvalFiscalHash: `fiscal-approval-rule-v1:${String(index + 1).padStart(64, "a")}`,
  }));
  return {
    validatedSourceSha: "a".repeat(40),
    inventory: {
      generatedFrom: {
        engineVersion: "engine.v1",
        rulesetIds: ["rules.2025", "rules.2026"],
        technicalFileHash: `sha256:${"b".repeat(64)}`,
        executableSpecHash: `sha256:${"c".repeat(64)}`,
      },
      counts: {
        rules: 54,
        passingExecutableSuites: 54,
        executableTestCases: 540,
        passingExecutableTestCases: 540,
        mutationScore: 100,
        safetyCriticalMutationScore: 100,
      },
      rules,
    },
    sourceRegistry: {
      sourceCount: 29,
      registryHash: `sha256:${"d".repeat(64)}`,
    },
    approvalRegistry: {
      ruleCount: 54,
      rules: approvalRules,
    },
    readiness: {
      status: "PASS",
      flags: {
        fiscal_rules_shadow_mode: false,
        fiscal_rules_approved_results: false,
        fiscal_rules_exclusions: false,
        document_auto_confirmation: false,
      },
      pendingRules: 54,
      openRules: 54,
      verifiedFiscalSources: 0,
      primaryFiscalReviews: 0,
      secondFiscalReviews: 0,
      rulesEligibleForManualApproval: 0,
      approvedRules: 0,
      resolvedRules: 0,
      authorizedExclusions: 0,
      allModelsFallback: "ENABLED",
      fiscalMode: "ORIENTATIVE",
      runtime: {
        shadowMode: "DISABLED",
        exclusions: "BLOCKED",
        documentAutoConfirmation: "BLOCKED",
      },
    },
    corpus: {
      valid: true,
      sourceClassCounts: {
        SYNTHETIC: 389,
        OFFICIAL_GENERATED: 0,
        REAL_ANONYMIZED: 0,
        ENGINEERING_HOLDOUT: 0,
        INDEPENDENT_HOLDOUT: 0,
      },
      engineeringHoldoutAvailable: false,
      independentHoldoutAvailable: false,
      independentHoldoutEvaluated: false,
      familyCount: 39,
      layoutCount: 39,
    },
  };
}

describe("fiscal release report", () => {
  it("renders the honest pre-review state", () => {
    const report = buildFiscalReleaseSnapshot(fixture());
    expect(report.status).toBe("PASS");
    expect(report.rules).toMatchObject({
      total: 54,
      sufficientTechnicalTests: 54,
      approved: 0,
      resolved: 0,
    });
    expect(report.runtime).toMatchObject({
      flagsAllFalse: true,
      authorizedExclusions: 0,
      allModelsFallback: "ENABLED",
      fiscalMode: "ORIENTATIVE",
    });
    const markdown = renderFiscalReleaseReport(report);
    expect(markdown).toContain("Validated source/main SHA");
    expect(markdown).toContain("| Independent holdout | 0 |");
    expect(markdown).toContain("| Authorized exclusions | 0 |");
    expect(markdown).toContain("| Fiscal mode | **ORIENTATIVE** |");
  });

  it.each([
    ["a flag", (input) => {
      input.readiness.flags.fiscal_rules_exclusions = true;
    }, "FISCAL_FLAGS_NOT_ALL_FALSE"],
    ["an exclusion", (input) => {
      input.readiness.authorizedExclusions = 1;
    }, "AUTHORIZED_EXCLUSIONS_PRESENT"],
    ["Todos", (input) => {
      input.readiness.allModelsFallback = "DISABLED";
    }, "ALL_MODELS_FALLBACK_DISABLED"],
    ["technical tests", (input) => {
      input.inventory.rules[0].safetyCriticalMutationScore = 99;
    }, "INSUFFICIENT_TECHNICAL_RULE_TESTS"],
    ["independent holdout execution", (input) => {
      input.corpus.independentHoldoutEvaluated = true;
    }, "INDEPENDENT_HOLDOUT_MUST_NOT_RUN_IN_PUBLIC_RELEASE_REPORT"],
  ])("fails closed if %s drifts", (_label, mutate, expected) => {
    const input = fixture();
    mutate(input);
    expect(buildFiscalReleaseSnapshot(input).errors).toContain(expected);
  });
});
