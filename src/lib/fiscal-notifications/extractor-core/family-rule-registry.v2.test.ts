import { describe, expect, it } from "vitest";
import {
  AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1,
  AEAT_DOCUMENT_PROFILES_V1,
} from "../knowledge/aeat-document-knowledge.v1";
import { FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3 } from "../knowledge/document-families.v3";
import { BASE_EXTRACTOR_IDS_V1 } from "./extractor-contract.v1";
import {
  FISCAL_NOTIFICATION_FAMILY_RULES_V2,
  resolveFamilyRuleV2,
} from "./family-rule-registry.v2";

const TAX_ID_PATTERN =
  /(?:^|[^A-Z0-9])(?:\d{8}[\s._-]?[A-Z]|[XYZ][\s._-]?\d{7}[\s._-]?[A-Z]|[ABCDEFGHJNPQRSUVW][\s._-]?\d{7}[\s._-]?[0-9A-J])(?=$|[^A-Z0-9])/iu;
const IBAN_PATTERN = /(?:^|[^A-Z0-9])ES(?:[\s._-]?\d){22}(?=$|[^A-Z0-9])/iu;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
const SHORT_OFFICIAL_TITLE_VARIANTS = new Set(["notificación electrónica"]);

describe("family rule registry v2", () => {
  it("registers exactly one literal rule for every one of the 87 families", () => {
    expect(FISCAL_NOTIFICATION_FAMILY_RULES_V2).toHaveLength(87);
    expect(
      new Set(
        FISCAL_NOTIFICATION_FAMILY_RULES_V2.map(({ familyId }) => familyId),
      ).size,
    ).toBe(87);
    expect(
      [
        ...FISCAL_NOTIFICATION_FAMILY_RULES_V2.map(({ familyId }) => familyId),
      ].sort(),
    ).toEqual([...FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3].sort());
    expect(
      new Set(FISCAL_NOTIFICATION_FAMILY_RULES_V2.map(({ ruleId }) => ruleId))
        .size,
    ).toBe(87);
  });

  it("uses all 16 base extractors and never promotes a family automatically", () => {
    expect(
      [
        ...new Set(
          FISCAL_NOTIFICATION_FAMILY_RULES_V2.map(
            ({ extractorId }) => extractorId,
          ),
        ),
      ].sort(),
    ).toEqual([...BASE_EXTRACTOR_IDS_V1].sort());
    expect(
      FISCAL_NOTIFICATION_FAMILY_RULES_V2.every(
        (rule) =>
          rule.classificationPolicy === "REVIEW_REQUIRED_ONLY" &&
          rule.permitsAutomaticFamilyConfirmation === false,
      ),
    ).toBe(true);
  });

  it("keeps the exact canonical title and only bounded closed title anchors", () => {
    const titleByFamily = new Map(
      AEAT_DOCUMENT_PROFILES_V1.map(
        (profile) => [profile.id, profile.nameEs] as const,
      ),
    );
    const normalizedTitleOwners = new Map<string, string>();
    for (const rule of FISCAL_NOTIFICATION_FAMILY_RULES_V2) {
      expect(rule.canonicalTitle).toBe(titleByFamily.get(rule.familyId));
      expect(rule.canonicalTitle.length).toBeGreaterThan(0);
      const titleLiterals = rule.titleAnchors.flatMap(
        ({ literals }) => literals,
      );
      expect(titleLiterals).toContain(rule.canonicalTitle);
      expect(
        titleLiterals.filter((literal) => literal !== rule.canonicalTitle)
          .length,
      ).toBeGreaterThan(0);
      expect(
        titleLiterals
          .filter((literal) => literal !== rule.canonicalTitle)
          .every(
            (literal) =>
              literal.split(/\s+/u).length >= 3 ||
              SHORT_OFFICIAL_TITLE_VARIANTS.has(literal),
          ),
      ).toBe(true);
      expect(titleLiterals.every((literal) => literal.length > 0)).toBe(true);
      expect(
        titleLiterals.some((literal) => /^https?:\/\//u.test(literal)),
      ).toBe(false);
      for (const literal of titleLiterals) {
        const normalized = literal
          .normalize("NFKD")
          .replace(/\p{M}/gu, "")
          .toLocaleLowerCase("es-ES");
        expect(normalizedTitleOwners.get(normalized) ?? rule.familyId).toBe(
          rule.familyId,
        );
        normalizedTitleOwners.set(normalized, rule.familyId);
      }
    }

    expect(
      resolveFamilyRuleV2("collection.enforcement_order")?.titleAnchors[0]
        ?.literals,
    ).toContain("notificación de providencia de apremio");
    expect(
      resolveFamilyRuleV2("registry.tax_registration_resolution")
        ?.titleAnchors[0]?.literals,
    ).toContain(
      "acuerdo de alta en el registro de operadores intracomunitarios",
    );
  });

  it("references only the 50 registered official source ids", () => {
    const validSources = new Set(AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1);
    const expectedByFamily = new Map(
      AEAT_DOCUMENT_PROFILES_V1.map(
        (profile) => [profile.id, profile.officialSourceIds] as const,
      ),
    );
    for (const rule of FISCAL_NOTIFICATION_FAMILY_RULES_V2) {
      expect(rule.sourceIds.length).toBeGreaterThan(0);
      expect(
        rule.sourceIds.every((sourceId) => validSources.has(sourceId)),
      ).toBe(true);
      expect(new Set(rule.sourceIds).size).toBe(rule.sourceIds.length);
      expect(rule.sourceIds).toEqual(expectedByFamily.get(rule.familyId));
    }
  });

  it("blocks TGSS and foral territory on every family", () => {
    for (const rule of FISCAL_NOTIFICATION_FAMILY_RULES_V2) {
      const conflicts = new Set(
        rule.conflicts.map(({ conflictId }) => conflictId),
      );
      expect(conflicts).toContain("CONFLICTING_AUTHORITY_TGSS");
      expect(conflicts).toContain("CONFLICTING_TERRITORY_FORAL");
      expect(rule.allowedAuthorities.length).toBeGreaterThan(0);
    }
    expect(
      resolveFamilyRuleV2(
        "identity.clave_registration_receipt",
      )?.allowedAuthorities.map(({ authorityId }) => authorityId),
    ).toEqual(["GOBIERNO_DE_ESPANA_CLAVE"]);
    expect(
      resolveFamilyRuleV2("notification.dehu_envelope")?.allowedAuthorities.map(
        ({ authorityId }) => authorityId,
      ),
    ).toEqual(["AEAT_COMMON_TERRITORY", "DEHU_GENERAL_STATE"]);
  });

  it("contains no personal tax id, IBAN or email-shaped literal", () => {
    const serialized = JSON.stringify(FISCAL_NOTIFICATION_FAMILY_RULES_V2);
    expect(serialized).not.toMatch(TAX_ID_PATTERN);
    expect(serialized).not.toMatch(IBAN_PATTERN);
    expect(serialized).not.toMatch(EMAIL_PATTERN);
  });

  it("is deeply immutable and resolves only exact bounded ids", () => {
    const enforcement = resolveFamilyRuleV2("collection.enforcement_order");
    expect(enforcement).not.toBeNull();
    expect(Object.isFrozen(FISCAL_NOTIFICATION_FAMILY_RULES_V2)).toBe(true);
    expect(Object.isFrozen(enforcement)).toBe(true);
    expect(Object.isFrozen(enforcement?.titleAnchors)).toBe(true);
    expect(Object.isFrozen(enforcement?.titleAnchors[0]?.literals)).toBe(true);
    expect(Object.isFrozen(enforcement?.allowedAuthorities[0]?.anchors)).toBe(
      true,
    );
    expect(Object.isFrozen(enforcement?.conflicts)).toBe(true);
    expect(Object.isFrozen(enforcement?.sourceIds)).toBe(true);
    expect(() => {
      (enforcement!.titleAnchors[0]!.literals as string[])[0] = "Alterado";
    }).toThrow();
    expect(
      resolveFamilyRuleV2("collection.enforcement_order")?.canonicalTitle,
    ).toBe("Providencia de apremio");
    expect(resolveFamilyRuleV2(" collection.enforcement_order")).toBeNull();
    expect(
      resolveFamilyRuleV2("collection.enforcement_order\u0000"),
    ).toBeNull();
    expect(resolveFamilyRuleV2("unknown.family")).toBeNull();
    expect(resolveFamilyRuleV2(null)).toBeNull();
  });
});
