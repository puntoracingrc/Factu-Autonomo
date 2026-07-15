import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  FISCAL_EXECUTABLE_RULE_SUITES,
  mutationScoreForSuite,
} from "./fiscal-executable-tests/harness";
import { DIAGNOSTIC_QUESTIONS } from "./questions";
import { TAX_RULES } from "./rules";

interface InventoryDocument {
  generatedFrom: {
    technicalFileHash: string;
    executableSpecHash: string;
  };
  counts: {
    rules: number;
    approvedRules: number;
    resolvedRules: number;
    passingExecutableSuites: number;
    executableTestCases: number;
    passingExecutableTestCases: number;
    mutationScore: number;
    verifiedSourceSnapshots: number;
    approvedFiscalHashes: number;
    rulesWithTwoReviewers: number;
    authorizedExclusions: number;
  };
  rules: Array<{
    ruleId: string;
    ruleHash: string;
    reviewStatus: string;
    resolutionStatus: string;
    testsStatus: string;
    executableTestsStatus: string;
    executableTestCount: number;
    passingTestCount: number;
    categoriesCovered: string[];
    missingCategories: string[];
    applicableMutationCount: number;
    killedMutationCount: number;
    mutationScore: number;
    exclusionAuthorized: boolean;
  }>;
}

interface IssueDocument {
  counts: { total: number; open: number; verified: number };
  issues: Array<{
    ruleId: string;
    status: string;
    findings: string[];
  }>;
}

const inventory = JSON.parse(
  readFileSync(
    new URL("../../../docs/fiscal/rule-inventory.json", import.meta.url),
    "utf8",
  ),
) as InventoryDocument;
const issues = JSON.parse(
  readFileSync(
    new URL("../../../docs/fiscal/issues.json", import.meta.url),
    "utf8",
  ),
) as IssueDocument;

describe("generated fiscal closure inventory", () => {
  it("matches every current rule and its canonical fiscal hash", () => {
    const technicalHash = `sha256:${createHash("sha256")
      .update(readFileSync(new URL("./rules.ts", import.meta.url)))
      .digest("hex")}`;
    const executableSpecHash = `sha256:${createHash("sha256")
      .update(
        readFileSync(
          new URL(
            "./fiscal-executable-tests/specs.ts",
            import.meta.url,
          ),
        ),
      )
      .digest("hex")}`;
    expect(inventory.generatedFrom.technicalFileHash).toBe(technicalHash);
    expect(inventory.generatedFrom.executableSpecHash).toBe(executableSpecHash);
    expect(inventory.counts).toEqual({
      rules: 54,
      approvedRules: 0,
      resolvedRules: 0,
      passingExecutableSuites: 54,
      executableTestCases: 432,
      passingExecutableTestCases: 432,
      mutationScore: 100,
      verifiedSourceSnapshots: 0,
      approvedFiscalHashes: 0,
      rulesWithTwoReviewers: 0,
      authorizedExclusions: 0,
    });
    expect(inventory.rules).toHaveLength(TAX_RULES.length);
    for (const rule of TAX_RULES) {
      const suite = FISCAL_EXECUTABLE_RULE_SUITES.find(
        (candidate) => candidate.ruleId === rule.ruleId,
      );
      expect(suite).toBeDefined();
      const mutation = mutationScoreForSuite(suite!);
      expect(
        inventory.rules.find((entry) => entry.ruleId === rule.ruleId),
      ).toMatchObject({
        ruleHash: rule.fiscalMetadata.ruleHash,
        reviewStatus: "PENDING_FISCAL_REVIEW",
        resolutionStatus: "OPEN",
        testsStatus: "NOT_IMPLEMENTED",
        executableTestsStatus: "PASSING",
        executableTestCount: 8,
        passingTestCount: 8,
        categoriesCovered: [
          "POSITIVE",
          "NEGATIVE",
          "EXCEPTION",
          "UNKNOWN",
          "CONTRADICTION",
          "TEMPORALITY",
          "TERRITORY",
          "PROHIBITED_INFERENCE",
        ],
        missingCategories: [],
        applicableMutationCount: mutation.total,
        killedMutationCount: mutation.killed,
        mutationScore: 100,
        exclusionAuthorized: false,
      });
    }
  });

  it("registers one open aggregate issue and one unsigned packet per rule", () => {
    expect(issues.counts).toEqual({ total: 54, open: 54, verified: 0 });
    expect(issues.issues).toHaveLength(54);
    expect(
      issues.issues.every(
        (issue) =>
          issue.status === "OPEN" &&
          !issue.findings.includes("MISSING_EXECUTABLE_TEST_SUITE") &&
          issue.findings.includes("MISSING_QUESTION_FACT_RULE_MAPPING"),
      ),
    ).toBe(true);

    const packets = readdirSync(
      new URL("../../../docs/fiscal/review/rules", import.meta.url),
    ).filter((fileName) => fileName.endsWith(".md"));
    expect(packets).toHaveLength(54);
  });

  it("covers all 45 questions without pretending unresolved mappings", () => {
    const matrix = readFileSync(
      new URL("../../../docs/fiscal/question-rule-matrix.csv", import.meta.url),
      "utf8",
    );
    expect(DIAGNOSTIC_QUESTIONS).toHaveLength(45);
    for (const question of DIAGNOSTIC_QUESTIONS) {
      expect(matrix).toContain(question.questionId);
    }
    expect(matrix).toContain("UNMAPPED");
  });

  it("fails CI when generated artifacts drift from source", () => {
    const output = execFileSync(
      process.execPath,
      ["scripts/generate-fiscal-rule-inventory.mjs", "--check"],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    expect(output).toContain("Inventory drift: CLEAN");
    expect(output).toContain("Authorized exclusions: 0");
    expect(output).toContain("Rules with passing executable test suites: 54");
    expect(output).toContain("Passing executable test cases: 432");
    expect(output).toContain("Fiscal mutation score: 100%");
    expect(output).toContain('Fallback "Todos": ENABLED');
  });
});
