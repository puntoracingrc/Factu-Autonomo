import { describe, expect, it } from "vitest";
import {
  AEAT_P0_RELATION_RULES_V10,
  reconcileAeatP0RelationsV10,
  type AeatP0RelationDocumentV10,
  type AeatP0RelationRuleV10,
} from "./p0-relations.v10";

const hash = (seed: string) => seed.padEnd(64, seed.at(-1) ?? "a").slice(0, 64).replace(/[^a-f0-9]/gu, "a");

function targetFamily(rule: AeatP0RelationRuleV10): string {
  if (Array.isArray(rule.target)) return rule.target[0]!;
  if (rule.target === "REQUIREMENT_OR_PROPOSAL") return "assessment.rectification_requirement";
  if (rule.target === "ACT_WITH_DEADLINE") return "assessment.rectification_requirement";
  return "filing.return_receipt";
}

function exactPair(rule: AeatP0RelationRuleV10, ownerScope = "owner-p0-relations"): readonly [AeatP0RelationDocumentV10, AeatP0RelationDocumentV10] {
  const exactFingerprints = Object.fromEntries(rule.exactGroups.map((group, index) => [group[0]!, hash(String(index + 1))]));
  return [
    {
      documentId: `source-${rule.ruleId.toLocaleLowerCase("en-US")}`,
      ownerScope,
      familyId: rule.sourceProfiles[0]!,
      exactFingerprints,
      contextFingerprints: {},
    },
    {
      documentId: `target-${rule.ruleId.toLocaleLowerCase("en-US")}`,
      ownerScope,
      familyId: targetFamily(rule),
      exactFingerprints: { ...exactFingerprints },
      contextFingerprints: {},
    },
  ];
}

describe("AEAT P0 relation engine v10", () => {
  it("supports all nine relation contracts with exact owner-scoped evidence", () => {
    expect(AEAT_P0_RELATION_RULES_V10).toHaveLength(9);
    for (const rule of AEAT_P0_RELATION_RULES_V10) {
      const relation = reconcileAeatP0RelationsV10(exactPair(rule)).find((item) => item.ruleId === rule.ruleId);
      expect(relation, rule.ruleId).toMatchObject({
        ruleId: rule.ruleId,
        status: "SYSTEM_CONFIRMED_EXACT",
        explanation: rule.exactPhrase,
        forbiddenInference: rule.forbidden,
        assertionLayer: "CONFIRMED_BY_LATER_DOCUMENT",
        requiresHumanReview: true,
        autoMaterialization: false,
      });
      expect(relation?.matchingFieldIds.length, rule.ruleId).toBe(rule.exactGroups.length);
    }
  });

  it("only suggests a relation from contextual fingerprints", () => {
    const rule = AEAT_P0_RELATION_RULES_V10.find((item) => item.ruleId === "RESOLVES_RECTIFICATION")!;
    const context = { MODEL: hash("a"), TAX_PERIOD: hash("b"), RESULT: hash("c") };
    const relation = reconcileAeatP0RelationsV10([
      { documentId: "resolution", ownerScope: "owner-a", familyId: rule.sourceProfiles[0]!, exactFingerprints: {}, contextFingerprints: context },
      { documentId: "request", ownerScope: "owner-a", familyId: targetFamily(rule), exactFingerprints: {}, contextFingerprints: { ...context } },
    ]).find((item) => item.ruleId === rule.ruleId);
    expect(relation).toMatchObject({
      status: "SUGGESTED",
      explanation: rule.suggestedPhrase,
      assertionLayer: "RELATION_INFERRED",
      autoMaterialization: false,
    });
  });

  it("never crosses owners even when all fingerprints are identical", () => {
    const rule = AEAT_P0_RELATION_RULES_V10[0]!;
    const [source, target] = exactPair(rule);
    expect(reconcileAeatP0RelationsV10([
      source,
      { ...target, ownerScope: "different-owner" },
    ])).toEqual([]);
  });

  it("keeps direct rectification request-to-resolution valid without requiring a proposal", () => {
    const rule = AEAT_P0_RELATION_RULES_V10.find((item) => item.ruleId === "RESOLVES_RECTIFICATION")!;
    const [source, target] = exactPair(rule);
    expect(target.familyId).toBe("assessment.rectification_request");
    expect(reconcileAeatP0RelationsV10([source, target]).some((item) => item.ruleId === "RESOLVES_RECTIFICATION")).toBe(true);
  });

  it("does not confuse a favorable resolution with refund payment or review resolution with execution", () => {
    const refundRule = AEAT_P0_RELATION_RULES_V10.find((item) => item.ruleId === "PRECEDES_REFUND_PAYMENT")!;
    const [resolution] = exactPair(refundRule);
    expect(reconcileAeatP0RelationsV10([resolution])).toEqual([]);

    const executionRule = AEAT_P0_RELATION_RULES_V10.find((item) => item.ruleId === "EXECUTES_REVIEW_RESOLUTION")!;
    const [execution] = exactPair(executionRule);
    expect(reconcileAeatP0RelationsV10([execution])).toEqual([]);
  });

  it("rejects raw references and duplicate owner/document identities", () => {
    const invalid = {
      documentId: "document-a",
      ownerScope: "owner-a",
      familyId: "certificate.specialized",
      exactFingerprints: { CERTIFICATE_ID: "RAW-REFERENCE" },
      contextFingerprints: {},
    };
    expect(() => reconcileAeatP0RelationsV10([invalid])).toThrow("AEAT_P0_RELATION_V10_INVALID:exactFingerprints");

    const valid = { ...invalid, exactFingerprints: { CERTIFICATE_ID: hash("d") } };
    expect(() => reconcileAeatP0RelationsV10([valid, { ...valid }])).toThrow("AEAT_P0_RELATION_V10_DUPLICATE");
  });

  it("does not mutate inputs and returns immutable deterministic relations", () => {
    const pair = exactPair(AEAT_P0_RELATION_RULES_V10[8]!);
    const before = structuredClone(pair);
    const first = reconcileAeatP0RelationsV10(pair);
    const second = reconcileAeatP0RelationsV10(pair);
    expect(first).toEqual(second);
    expect(pair).toEqual(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0]!)).toBe(true);
  });
});
