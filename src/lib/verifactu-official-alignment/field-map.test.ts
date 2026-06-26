import { describe, expect, it } from "vitest";
import {
  OFFICIAL_FIELD_MAPPINGS,
  officialMappingsForRecordKind,
} from "./field-map";

describe("OFFICIAL_FIELD_MAPPINGS", () => {
  it("contiene mappings para alta y anulacion sin rellenar estructura inventada", () => {
    expect(officialMappingsForRecordKind("registro_alta").length).toBeGreaterThan(0);
    expect(
      officialMappingsForRecordKind("registro_anulacion").length,
    ).toBeGreaterThan(0);
    expect(
      OFFICIAL_FIELD_MAPPINGS.every((mapping) =>
        mapping.officialPath.startsWith("Registro"),
      ),
    ).toBe(false);
  });

  it("usa solo estados permitidos y no marca todo como verificado", () => {
    const statuses = new Set<string>(
      OFFICIAL_FIELD_MAPPINGS.map((mapping) => mapping.mappingStatus),
    );

    expect([...statuses].sort()).toEqual([
      "blocked",
      "not_applicable",
      "pending",
    ]);
    expect(statuses.has("verified")).toBe(false);
  });

  it("documenta fuente, requiredness y transformacion por campo", () => {
    for (const mapping of OFFICIAL_FIELD_MAPPINGS) {
      expect(mapping.artifactId, mapping.officialPath).toMatch(/^AEAT_VERIFACTU_/);
      expect(["required", "optional", "conditional"]).toContain(
        mapping.requiredness,
      );
      expect(mapping.transformation, mapping.officialPath).toBeTruthy();
      expect(mapping.evidenceReference, mapping.officialPath).toBeTruthy();
    }
  });

  it("mantiene candidate_not_aeat y syntheticOnly fuera del XML oficial", () => {
    const wrapperMapping = OFFICIAL_FIELD_MAPPINGS.find(
      (mapping) => mapping.internalPath === "syntheticOnly",
    );

    expect(wrapperMapping).toMatchObject({
      officialPath: "TypeScriptWrapper.syntheticOnly",
      mappingStatus: "not_applicable",
      transformation: "wrapper_only_not_xml",
    });
  });
});
