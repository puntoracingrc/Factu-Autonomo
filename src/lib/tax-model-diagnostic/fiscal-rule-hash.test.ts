import { describe, expect, it } from "vitest";

import { computeFiscalRuleHash } from "./fiscal-rule-hash";
import { TAX_RULES } from "./rules";

function hashInput(rule: (typeof TAX_RULES)[number]) {
  return {
    ruleId: rule.ruleId,
    model: rule.modelNumber,
    fiscalYear: rule.fiscalYear,
    territory: rule.territory,
    effectiveFrom: rule.effectiveFrom,
    effectiveTo: rule.effectiveTo,
    conditions: rule.conditions,
    factIds: rule.fiscalMetadata.factIds,
    result: rule.result,
    exclusions: rule.exclusions,
    exclusionCandidates: rule.fiscalMetadata.exclusionCandidates,
    sourceSnapshots: rule.fiscalMetadata.sourceSnapshots,
  } as const;
}

describe("canonical fiscal rule hash", () => {
  it("coincide con el hash registrado de cada regla real", () => {
    for (const rule of TAX_RULES) {
      expect(computeFiscalRuleHash(hashInput(rule))).toBe(
        rule.fiscalMetadata.ruleHash,
      );
    }
  });

  it("es estable ante el orden de colecciones sin significado fiscal", () => {
    const rule = TAX_RULES.find((candidate) => candidate.modelNumber === "303");
    if (!rule) throw new Error("MISSING_303_RULE");
    const input = hashInput(rule);

    expect(
      computeFiscalRuleHash({
        ...input,
        conditions: [...input.conditions].reverse(),
        exclusions: [...input.exclusions].reverse(),
        exclusionCandidates: [...input.exclusionCandidates].reverse(),
        sourceSnapshots: [...input.sourceSnapshots].reverse(),
      }),
    ).toBe(computeFiscalRuleHash(input));
  });

  it("cambia cuando cambia material fiscal de la decisión", () => {
    const rule = TAX_RULES[0];
    const input = hashInput(rule);

    expect(
      computeFiscalRuleHash({
        ...input,
        conditions: [...input.conditions, "Condición fiscal material nueva"],
      }),
    ).not.toBe(computeFiscalRuleHash(input));
  });
});
