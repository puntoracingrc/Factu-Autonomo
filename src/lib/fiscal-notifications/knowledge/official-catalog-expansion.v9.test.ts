import { describe, expect, it } from "vitest";
import rawCatalog from "./aeat-official-catalog-expansion.v9.json";
import {
  AEAT_OFFICIAL_CATALOG_EXPANSION_V9,
  AEAT_OFFICIAL_CATALOG_PROFILE_IDS_V9,
  AEAT_OFFICIAL_CATALOG_PROFILES_V9,
  isAeatOfficialCatalogProfileIdV9,
  parseAeatOfficialCatalogExpansionV9,
  resolveAeatOfficialCatalogProfileV9,
} from "./official-catalog-expansion.v9";
import { FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3 } from "./document-families.v3";

type MutableRecord = Record<string, unknown>;

function fresh(): MutableRecord {
  return structuredClone(rawCatalog) as MutableRecord;
}

function profiles(root: MutableRecord): MutableRecord[] {
  return root.proposedProfiles as MutableRecord[];
}

describe("AEAT official catalog expansion v9", () => {
  it("loads exactly 35 additive profiles without altering the existing 87", () => {
    expect(AEAT_OFFICIAL_CATALOG_EXPANSION_V9.meta.currentProfileCount).toBe(87);
    expect(AEAT_OFFICIAL_CATALOG_PROFILES_V9).toHaveLength(35);
    expect(AEAT_OFFICIAL_CATALOG_PROFILE_IDS_V9).toHaveLength(35);
    expect(new Set(AEAT_OFFICIAL_CATALOG_PROFILE_IDS_V9).size).toBe(35);
    expect(
      AEAT_OFFICIAL_CATALOG_PROFILE_IDS_V9.filter((id) =>
        FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3.includes(
          id as (typeof FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3)[number],
        ),
      ),
    ).toEqual([]);
    expect(AEAT_OFFICIAL_CATALOG_PROFILES_V9.filter((item) => item.priority === "P0")).toHaveLength(10);
    expect(AEAT_OFFICIAL_CATALOG_PROFILES_V9.filter((item) => item.priority === "P1")).toHaveLength(21);
    expect(AEAT_OFFICIAL_CATALOG_PROFILES_V9.filter((item) => item.priority === "P2")).toHaveLength(4);
  });

  it("keeps every new profile review-only and exposes typed fields and official sources", () => {
    for (const profile of AEAT_OFFICIAL_CATALOG_PROFILES_V9) {
      expect(profile.recognitionMaturity).toBe("OFFICIAL_ONLY");
      expect(profile.strongSignaturePolicy).toBe("PROHIBITED_UNTIL_REAL_SAMPLE");
      expect(profile.requiresHumanReview).toBe(true);
      expect(profile.materializationPolicy).toBe("PROHIBITED");
      expect(profile.permitsDebtCreation).toBe(false);
      expect(profile.permitsDeadlineCreation).toBe(false);
      expect(profile.permitsPaymentAction).toBe(false);
      expect(profile.permitsAccountingAction).toBe(false);
      expect(profile.mustExtract.references.length).toBeGreaterThan(0);
      expect(profile.mustExtract.dates.length).toBeGreaterThan(0);
      expect(profile.mustExtract.facts.length).toBeGreaterThan(0);
      expect(profile.officialSourceIds.length).toBeGreaterThan(0);
      expect(profile.notProvenByThisDocument.length).toBeGreaterThan(0);
    }
  });

  it("keeps all optional P2 modules behind an explicit sector gate", () => {
    const sectorProfiles = AEAT_OFFICIAL_CATALOG_PROFILES_V9.filter((item) => item.priority === "P2");
    expect(sectorProfiles.map((item) => item.sectorGate).sort()).toEqual([
      "CUSTOMS",
      "INSOLVENCY",
      "PAYMENT_IN_KIND",
      "VERIFACTU_TECHNICAL",
    ]);
    expect(AEAT_OFFICIAL_CATALOG_PROFILES_V9.filter((item) => item.priority !== "P2").every((item) => item.sectorGate === null)).toBe(true);
  });

  it("resolves only exact bounded profile ids", () => {
    expect(resolveAeatOfficialCatalogProfileV9("evidence.submission_receipt")?.nameEs).toBe(
      "Justificante de presentación o contestación electrónica",
    );
    expect(isAeatOfficialCatalogProfileIdV9("review.execution_resolution")).toBe(true);
    expect(resolveAeatOfficialCatalogProfileV9(" evidence.submission_receipt")).toBeNull();
    expect(resolveAeatOfficialCatalogProfileV9("evidence.submission_receipt\u0000")).toBeNull();
    expect(resolveAeatOfficialCatalogProfileV9("unknown.profile")).toBeNull();
  });

  it("returns a defensive immutable copy and does not mutate input", () => {
    const input = fresh();
    const before = structuredClone(input);
    const parsed = parseAeatOfficialCatalogExpansionV9(input);
    expect(input).toEqual(before);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.profiles)).toBe(true);
    expect(Object.isFrozen(parsed.profiles[0]?.mustExtract)).toBe(true);
    expect(() => {
      (parsed.profiles as unknown as MutableRecord[])[0]!.nameEs = "changed";
    }).toThrow();
    expect(parseAeatOfficialCatalogExpansionV9(fresh()).profiles[0]?.nameEs).not.toBe("changed");
  });

  it("rejects unknown keys, duplicate ids and dangling official sources", () => {
    const unknown = fresh();
    profiles(unknown)[0]!.taxId = "hidden";
    expect(() => parseAeatOfficialCatalogExpansionV9(unknown)).toThrow(
      "AEAT_OFFICIAL_CATALOG_V9_INVALID:proposedProfiles[0].taxId",
    );

    const duplicate = fresh();
    profiles(duplicate)[1]!.id = profiles(duplicate)[0]!.id;
    expect(() => parseAeatOfficialCatalogExpansionV9(duplicate)).toThrow(
      "AEAT_OFFICIAL_CATALOG_V9_INVALID:proposedProfiles[1].id",
    );

    const dangling = fresh();
    profiles(dangling)[0]!.officialSourceIds = ["AEAT_UNKNOWN"];
    expect(() => parseAeatOfficialCatalogExpansionV9(dangling)).toThrow(
      "AEAT_OFFICIAL_CATALOG_V9_INVALID:proposedProfiles[0].officialSourceIds[0]",
    );
  });

  it("rejects direct personal identifiers without copying them into errors", () => {
    for (const privateValue of [
      "12345678Z",
      "ES9121000418450200051332",
      "persona@example.test",
    ]) {
      const candidate = fresh();
      profiles(candidate)[0]!.notes = privateValue;
      try {
        parseAeatOfficialCatalogExpansionV9(candidate);
        throw new Error("expected rejection");
      } catch (error) {
        expect(String(error)).toContain("AEAT_OFFICIAL_CATALOG_V9_INVALID:privacy");
        expect(String(error)).not.toContain(privateValue);
      }
    }
  });

  it("rejects accessors without invoking them", () => {
    const candidate = fresh();
    let reads = 0;
    Object.defineProperty(candidate, "hidden", {
      enumerable: true,
      get() {
        reads += 1;
        return "private";
      },
    });
    expect(() => parseAeatOfficialCatalogExpansionV9(candidate)).toThrow(
      "AEAT_OFFICIAL_CATALOG_V9_INVALID:graph.hidden",
    );
    expect(reads).toBe(0);
  });
});
