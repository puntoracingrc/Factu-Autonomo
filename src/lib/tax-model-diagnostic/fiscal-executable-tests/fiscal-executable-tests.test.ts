import { describe, expect, it } from "vitest";

import { TAX_RULES } from "../rules";
import {
  FISCAL_EXECUTABLE_RULE_SUITES,
  executeFiscalCase,
  mutationScoreForSuite,
  validateFiscalCaseObservation,
} from "./harness";
import { FISCAL_PROFILE_FACTORY_NAMES } from "./profile-factories";
import {
  FISCAL_EXECUTABLE_CATEGORIES,
  FISCAL_MODEL_EXECUTABLE_SPECS,
} from "./specs";

describe("fiscal executable rule suites", () => {
  it("provides every requested reusable profile factory", () => {
    expect(FISCAL_PROFILE_FACTORY_NAMES).toEqual(
      expect.arrayContaining([
        "PROFESSIONAL",
        "BUSINESS",
        "MODULES",
        "EXEMPT_ACTIVITY",
        "EQUIVALENCE_SURCHARGE",
        "WORKERS",
        "PAID_PROFESSIONALS",
        "RENT",
        "EU_OPERATIONS",
        "OSS_IOSS",
        "COMPANY",
        "ATTRIBUTION_ENTITY",
        "UNKNOWN_FACTS",
        "CONTRADICTORY_FACTS",
      ]),
    );
  });

  it("maps the 27 model families to exactly 54 rule suites", () => {
    expect(FISCAL_MODEL_EXECUTABLE_SPECS).toHaveLength(27);
    expect(FISCAL_EXECUTABLE_RULE_SUITES).toHaveLength(54);
    expect(
      new Set(FISCAL_EXECUTABLE_RULE_SUITES.map((suite) => suite.ruleId)),
    ).toEqual(new Set(TAX_RULES.map((rule) => rule.ruleId)));
  });

  it.each(FISCAL_EXECUTABLE_RULE_SUITES)(
    "$ruleId declares complete typed coverage",
    (suite) => {
      expect(suite.categories).toEqual(FISCAL_EXECUTABLE_CATEGORIES);
      expect(suite.cases).toHaveLength(FISCAL_EXECUTABLE_CATEGORIES.length);
      expect(new Set(suite.cases.map((testCase) => testCase.category))).toEqual(
        new Set(FISCAL_EXECUTABLE_CATEGORIES),
      );

      const byCategory = new Map(
        suite.cases.map((testCase) => [testCase.category, testCase]),
      );
      expect(byCategory.get("EXCEPTION")?.predicateFacts.exceptionApplies).toBe(
        "TRUE",
      );
      expect(byCategory.get("NEGATIVE")?.predicateFacts.exceptionApplies).toBe(
        "FALSE",
      );
      expect(
        byCategory.get("PROHIBITED_INFERENCE")?.predicateFacts
          .prohibitedInferenceEvidence,
      ).toBe(true);
      expect(
        byCategory.get("PROHIBITED_INFERENCE")?.predicateFacts.conditions[0],
      ).toBe("FALSE");
      expect(byCategory.get("CONTRADICTION")?.profile).toMatchObject({
        activityStillActive: "YES",
        activityEndDate: `${suite.fiscalYear}-06-30`,
        censusReviewed: "YES",
      });
      expect(
        byCategory.get("CONTRADICTION")?.profile.censusObligations,
      ).toContain(suite.modelNumber);
      expect(
        byCategory.get("CONTRADICTION")?.predicateFacts.hasContradiction,
      ).toBe(true);
    },
  );

  for (const suite of FISCAL_EXECUTABLE_RULE_SUITES) {
    describe(suite.ruleId, () => {
      const observations = new Map(
        suite.cases.map((testCase) => [
          testCase.category,
          executeFiscalCase(testCase),
        ]),
      );

      it.each(suite.cases)(
        "$category preserves candidates and blocks exclusions",
        (testCase) => {
          const observation = observations.get(testCase.category);
          expect(observation).toBeDefined();
          expect(
            validateFiscalCaseObservation(testCase, observation!),
          ).toEqual([]);
        },
      );

      it("kills every applicable fiscal mutation", () => {
        const mutation = mutationScoreForSuite(suite);
        expect(mutation.total).toBeGreaterThanOrEqual(6);
        expect(mutation.invalidBaselineOperators).toEqual([]);
        expect(mutation.survivedOperators).toEqual([]);
        expect(mutation.killed).toBe(mutation.total);
        expect(mutation.score).toBe(100);
      });
    });
  }
});
