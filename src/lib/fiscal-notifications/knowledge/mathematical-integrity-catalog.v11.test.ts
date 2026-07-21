import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";
import {
  AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11,
  resolveAeatMathematicalIntegrityArchetypeV11,
  resolveAeatMathematicalIntegrityFamilyV11,
} from "./mathematical-integrity-catalog.v11";

type CsvRow = Record<string, string>;

function csv(name: string): CsvRow[] {
  return parse(
    readFileSync(new URL(name, import.meta.url), "utf8"),
    {
      bom: true,
      columns: true,
      skip_empty_lines: true,
    },
  ) as CsvRow[];
}

describe("AEAT mathematical integrity catalog V11", () => {
  it("loads the normative 122-family and 47-archetype contract", () => {
    expect(AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11).toMatchObject({
      schemaVersion: 11,
      meta: {
        version: "11.0.0",
        baseFamilies: 87,
        extensionFamilies: 35,
        totalFamilies: 122,
        archetypeCount: 47,
      },
    });
    expect(AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.families).toHaveLength(122);
    expect(AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.archetypes).toHaveLength(47);
    expect(
      AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.families.filter(
        (family) => family.sourcePack === "V1_BASE_87",
      ),
    ).toHaveLength(87);
    expect(
      AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.families.filter(
        (family) => family.sourcePack === "V9_EXTENSION_35",
      ),
    ).toHaveLength(35);
  });

  it("keeps JSON, family CSV and archetype CSV in exact structural parity", () => {
    const familyRows = csv("./aeat-family-validation-matrix.v11.csv");
    const archetypeRows = csv("./aeat-validation-archetypes.v11.csv");
    expect(familyRows).toHaveLength(122);
    expect(archetypeRows).toHaveLength(47);

    for (const family of AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.families) {
      const row = familyRows.find((candidate) => candidate.family_id === family.id);
      expect(row, family.id).toBeDefined();
      expect(row).toMatchObject({
        family_name: family.nameEs,
        category: family.category,
        source_pack: family.sourcePack,
        archetype_id: family.archetypeId,
        archetype_name: family.archetypeNameEs,
        validation_mode: family.validationMode,
        money_fields: family.moneyFields.join(" | "),
        reference_fields: family.referenceFields.join(" | "),
        date_fields: family.dateFields.join(" | "),
        formulae: family.formulae.join(" || "),
      });
    }

    for (const archetype of AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.archetypes) {
      const row = archetypeRows.find(
        (candidate) => candidate.archetype_id === archetype.id,
      );
      expect(row, archetype.id).toBeDefined();
      expect(row).toMatchObject({
        name_es: archetype.nameEs,
        structure: archetype.structure.join(" | "),
        formulae: archetype.formulae.join(" || "),
        logical_checks: archetype.logicalChecks.join(" || "),
        cross_document_checks: archetype.crossDocumentChecks.join(" || "),
        hard_failures: archetype.hardFailures.join(" || "),
        warnings: archetype.warnings.join(" || "),
        never_infer: archetype.noInference.join(" || "),
      });
      expect(Number(row?.family_count)).toBe(
        AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.families.filter(
          (family) => family.archetypeId === archetype.id,
        ).length,
      );
    }
  });

  it("resolves every family and preserves the acceptance clauses supplied by its source pack", () => {
    for (const family of AEAT_MATHEMATICAL_INTEGRITY_CATALOG_V11.families) {
      expect(resolveAeatMathematicalIntegrityFamilyV11(family.id)).toBe(family);
      expect(resolveAeatMathematicalIntegrityArchetypeV11(family.archetypeId)).not.toBeNull();
      expect(
        family.acceptanceTests.positive.length,
        family.id,
      ).toBe(family.sourcePack === "V1_BASE_87" ? 1 : 0);
      expect(
        family.acceptanceTests.negative.length,
        family.id,
      ).toBe(family.sourcePack === "V1_BASE_87" ? 1 : 0);
    }
  });

  it("contains no direct identity, account or contact data", () => {
    const source = [
      "./aeat-mathematical-validation-master.v11.json",
      "./aeat-family-validation-matrix.v11.csv",
      "./aeat-validation-archetypes.v11.csv",
    ]
      .map((name) => readFileSync(new URL(name, import.meta.url), "utf8"))
      .join("\n");
    expect(source).not.toMatch(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu);
    expect(source).not.toMatch(/\bES\d{22}\b/u);
    expect(source).not.toMatch(
      /\b(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])\b/u,
    );
  });
});
