import { describe, expect, it } from "vitest";
import rawContracts from "./aeat-p0-deep-contracts.v10.json";
import {
  AEAT_P0_ASSERTION_LAYERS_V10,
  AEAT_P0_DEEP_CONTRACTS_V10,
  AEAT_P0_DEEP_PROFILE_IDS_V10,
  AEAT_P0_DEEP_PROFILES_V10,
  AEAT_P0_OFFICIAL_SOURCE_IDS_V10,
  AEAT_P0_OFFICIAL_SOURCES_V10,
  isAeatP0DeepProfileIdV10,
  parseAeatP0DeepContractsV10,
  resolveAeatP0DeepProfileV10,
} from "./p0-deep-contracts.v10";

type MutableRecord = Record<string, unknown>;

function fresh(): MutableRecord {
  return structuredClone(rawContracts) as MutableRecord;
}

function profiles(value: MutableRecord): MutableRecord[] {
  return value.profiles as MutableRecord[];
}

describe("AEAT P0 deep contracts v10", () => {
  it("loads the exact 11-profile, 111-field and 55-test release", () => {
    expect(AEAT_P0_DEEP_CONTRACTS_V10.schemaVersion).toBe(10);
    expect(AEAT_P0_DEEP_PROFILE_IDS_V10).toHaveLength(11);
    expect(AEAT_P0_DEEP_PROFILES_V10).toHaveLength(11);
    expect(AEAT_P0_DEEP_PROFILES_V10.flatMap((profile) => profile.canonicalFields)).toHaveLength(111);
    expect(AEAT_P0_DEEP_PROFILES_V10.flatMap((profile) => profile.requiredTests)).toHaveLength(55);
    expect(AEAT_P0_OFFICIAL_SOURCE_IDS_V10).toHaveLength(12);
    expect(AEAT_P0_ASSERTION_LAYERS_V10).toEqual([
      "PRINTED",
      "NORMALIZED",
      "CALCULATED_FROM_PRINTED_VALUES",
      "LEGAL_RULE_APPLIED",
      "RELATION_INFERRED",
      "CONFIRMED_BY_LATER_DOCUMENT",
      "NOT_PROVEN",
    ]);
  });

  it("keeps every profile review-only with a closed source and action policy", () => {
    for (const profile of AEAT_P0_DEEP_PROFILES_V10) {
      expect(profile.requiresHumanReview, profile.profileId).toBe(true);
      expect(profile.materializationPolicy, profile.profileId).toBe("PROHIBITED_UNTIL_REVIEW");
      expect(profile.permitsDebtCreation, profile.profileId).toBe(false);
      expect(profile.permitsDeadlineCreation, profile.profileId).toBe(false);
      expect(profile.permitsPaymentAction, profile.profileId).toBe(false);
      expect(profile.permitsAccountingAction, profile.profileId).toBe(false);
      expect(profile.officialSourceIds.length, profile.profileId).toBeGreaterThan(0);
      expect(profile.canonicalFields.length, profile.profileId).toBeGreaterThan(0);
      expect(profile.requiredTests.length, profile.profileId).toBeGreaterThanOrEqual(4);
    }
    for (const sourceId of AEAT_P0_OFFICIAL_SOURCE_IDS_V10) {
      const source = AEAT_P0_OFFICIAL_SOURCES_V10[sourceId];
      expect(source.url, sourceId).toMatch(/^https:\/\/(?:sede\.agenciatributaria\.gob\.es|www\.boe\.es)\//u);
      expect(source.lastChecked, sourceId).toBe("2026-07-17");
      expect(source.usagePolicy, sourceId).toBe("VERSIONED_OFFICIAL_CONTEXT_AND_CLOSED_RULES");
      expect(source.profileIds.length, sourceId).toBeGreaterThan(0);
    }
  });

  it("contains the five explicit legal corrections without generic replacements", () => {
    expect(AEAT_P0_DEEP_CONTRACTS_V10.correctionsToPreviousResearch.map((item) => item.correctionId)).toEqual([
      "V10-CORR-001",
      "V10-CORR-002",
      "V10-CORR-003",
      "V10-CORR-004",
      "V10-CORR-005",
    ]);
    expect(AEAT_P0_DEEP_CONTRACTS_V10.correctionsToPreviousResearch[0]?.correctRule).toContain("automáticamente concedida");
    expect(AEAT_P0_DEEP_CONTRACTS_V10.correctionsToPreviousResearch[1]?.correctRule).toContain("propuesta puede omitirse");
    expect(AEAT_P0_DEEP_CONTRACTS_V10.correctionsToPreviousResearch[4]?.correctRule).toContain("disconformidad en diez días");
  });

  it("returns immutable defensive output without mutating the caller", () => {
    const candidate = fresh();
    const before = structuredClone(candidate);
    const parsed = parseAeatP0DeepContractsV10(candidate);
    expect(candidate).toEqual(before);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.profiles)).toBe(true);
    expect(Object.isFrozen(parsed.profiles[0]?.canonicalFields)).toBe(true);
    expect(() => {
      (parsed.profiles as unknown as MutableRecord[])[0]!.titleEs = "changed";
    }).toThrow();
    expect(parseAeatP0DeepContractsV10(fresh()).profiles[0]?.titleEs).not.toBe("changed");
  });

  it("rejects unknown nested keys, duplicate fields and dangling sources", () => {
    const unknown = fresh();
    profiles(unknown)[0]!.hiddenTaxId = "private";
    expect(() => parseAeatP0DeepContractsV10(unknown)).toThrow("AEAT_P0_DEEP_V10_INVALID:profiles[0]");

    const duplicate = fresh();
    const fields = profiles(duplicate)[0]!.canonicalFields as MutableRecord[];
    fields[1]!.id = fields[0]!.id;
    expect(() => parseAeatP0DeepContractsV10(duplicate)).toThrow("AEAT_P0_DEEP_V10_INVALID:profiles[0].canonicalFields");

    const dangling = fresh();
    profiles(dangling)[0]!.officialSourceIds = ["AEAT_UNKNOWN"];
    expect(() => parseAeatP0DeepContractsV10(dangling)).toThrow("AEAT_P0_DEEP_V10_INVALID:profiles[0].officialSourceIds");
  });

  it("rejects personal data without reflecting it in the error", () => {
    for (const privateValue of ["12345678Z", "ES9121000418450200051332", "persona@example.test"]) {
      const candidate = fresh();
      profiles(candidate)[0]!.titleEs = privateValue;
      try {
        parseAeatP0DeepContractsV10(candidate);
        throw new Error("expected rejection");
      } catch (error) {
        expect(String(error)).toContain("AEAT_P0_DEEP_V10_INVALID:privacy");
        expect(String(error)).not.toContain(privateValue);
      }
    }
  });

  it("resolves only exact bounded profile ids", () => {
    expect(resolveAeatP0DeepProfileV10("assessment.rectification_resolution")?.titleEs).toBe("Resolución de rectificación");
    expect(isAeatP0DeepProfileIdV10("certificate.specialized")).toBe(true);
    expect(resolveAeatP0DeepProfileV10(" certificate.specialized")).toBeNull();
    expect(resolveAeatP0DeepProfileV10("certificate.specialized\u0000")).toBeNull();
    expect(resolveAeatP0DeepProfileV10("unknown.profile")).toBeNull();
  });
});
