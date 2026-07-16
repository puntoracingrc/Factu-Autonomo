import { describe, expect, it } from "vitest";
import {
  FAMILY_RULE_CONTRACT_VERSION_V2,
  defineFamilyRecognitionRuleV2,
} from "./family-rule-contract.v2";

function inputFixture() {
  return {
    familyId: "collection.enforcement_order" as const,
    extractorId: "payment-order" as const,
    ruleId: "family-rule.collection.enforcement_order.v2" as const,
    canonicalTitle: "Providencia de apremio",
    titleAnchors: [
      {
        anchorId: "FAMILY_TITLE_COLLECTION_ENFORCEMENT_ORDER",
        matchMode: "LINE_PREFIX" as const,
        literals: [
          "Providencia de apremio",
          "Notificación de providencia de apremio",
        ],
      },
    ],
    requiredAnchors: [],
    allowedAuthorities: [
      {
        authorityId: "AEAT_COMMON_TERRITORY" as const,
        anchors: [
          {
            anchorId: "AEAT_AUTHORITY_LABEL",
            matchMode: "HEADER_TOKEN_SEQUENCE" as const,
            literals: ["agencia estatal de administración tributaria"],
          },
        ],
      },
    ],
    conflicts: [
      {
        conflictId: "CONFLICTING_AUTHORITY_TGSS" as const,
        matchMode: "HEADER_TOKEN_SEQUENCE" as const,
        literals: ["tesorería general de la seguridad social"],
      },
      {
        conflictId: "CONFLICTING_TERRITORY_FORAL" as const,
        matchMode: "HEADER_TOKEN_SEQUENCE" as const,
        literals: ["hacienda foral"],
      },
    ],
    sourceIds: ["DOC_PRIMARY", "AEAT_ENFORCEMENT", "LGT", "RGR"] as const,
  };
}

describe("family rule contract v2", () => {
  it("snapshots a strict review-only rule without mutating its input", () => {
    const input = inputFixture();
    const before = structuredClone(input);
    const rule = defineFamilyRecognitionRuleV2(input);

    expect(input).toEqual(before);
    expect(rule).toMatchObject({
      ruleVersion: FAMILY_RULE_CONTRACT_VERSION_V2,
      classificationPolicy: "REVIEW_REQUIRED_ONLY",
      permitsAutomaticFamilyConfirmation: false,
    });
    expect(Object.isFrozen(rule)).toBe(true);
    expect(Object.isFrozen(rule.titleAnchors)).toBe(true);
    expect(Object.isFrozen(rule.titleAnchors[0])).toBe(true);
    expect(Object.isFrozen(rule.titleAnchors[0]?.literals)).toBe(true);
    expect(Object.isFrozen(rule.allowedAuthorities[0]?.anchors)).toBe(true);
    expect(Object.isFrozen(rule.conflicts[0]?.literals)).toBe(true);
    expect(Object.isFrozen(rule.sourceIds)).toBe(true);

    input.titleAnchors[0]!.literals[0] = "Alterado";
    input.conflicts[0]!.literals[0] = "Alterado";
    expect(rule.canonicalTitle).toBe("Providencia de apremio");
    expect(rule.titleAnchors[0]?.literals[0]).toBe("Providencia de apremio");
    expect(rule.conflicts[0]?.literals[0]).toBe(
      "tesorería general de la seguridad social",
    );
  });

  it("does not let one returned rule contaminate a later definition", () => {
    const first = defineFamilyRecognitionRuleV2(inputFixture());
    expect(() => {
      (first.titleAnchors[0]!.literals as string[])[0] = "Alterado";
    }).toThrow();

    const second = defineFamilyRecognitionRuleV2(inputFixture());
    expect(second.titleAnchors[0]?.literals[0]).toBe("Providencia de apremio");
  });

  it("fails closed on unknown keys and accessors without invoking them", () => {
    const unknown = { ...inputFixture(), taxpayerName: "dato" };
    expect(() =>
      defineFamilyRecognitionRuleV2(
        unknown as unknown as Parameters<
          typeof defineFamilyRecognitionRuleV2
        >[0],
      ),
    ).toThrow("INVALID_FAMILY_RULE_V2:rule");

    const accessor = inputFixture();
    let invoked = false;
    Object.defineProperty(accessor, "canonicalTitle", {
      enumerable: true,
      configurable: true,
      get() {
        invoked = true;
        return "Providencia de apremio";
      },
    });
    expect(() => defineFamilyRecognitionRuleV2(accessor)).toThrow(
      "INVALID_FAMILY_RULE_V2:rule",
    );
    expect(invoked).toBe(false);
  });

  it("rejects PII-like literals, dangling sources and invalid closed enums", () => {
    const pii = inputFixture();
    pii.canonicalTitle = "Documento 12345678Z";
    pii.titleAnchors[0]!.literals[0] = "Documento 12345678Z";
    expect(() => defineFamilyRecognitionRuleV2(pii)).toThrow(
      "INVALID_FAMILY_RULE_V2:canonicalTitle",
    );

    const source = inputFixture();
    source.sourceIds = ["DOC_PRIMARY", "UNKNOWN_SOURCE"] as never;
    expect(() => defineFamilyRecognitionRuleV2(source)).toThrow(
      "INVALID_FAMILY_RULE_V2:sourceIds",
    );

    const matchMode = inputFixture();
    matchMode.titleAnchors[0]!.matchMode = "FUZZY" as never;
    expect(() => defineFamilyRecognitionRuleV2(matchMode)).toThrow(
      "INVALID_FAMILY_RULE_V2:titleAnchors[0].matchMode",
    );
  });
});
