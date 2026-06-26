import { describe, expect, it } from "vitest";
import { VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS } from "../verifactu-synthetic-fixtures/fixtures";
import type { SyntheticFixtureDescriptor } from "../verifactu-synthetic-fixtures/types";
import { mapSyntheticCandidateToOfficialAlignedModel } from "./map-candidate-record";

const POSITIVE_IDS = [
  "SYNTHETIC_ONLY_ALTA_BASIC_001",
  "SYNTHETIC_ONLY_CHAIN_FIRST_001",
  "SYNTHETIC_ONLY_CHAIN_SECOND_001",
  "SYNTHETIC_ONLY_CANCEL_BASIC_001",
] as const;

const NEGATIVE_IDS = [
  "SYNTHETIC_ONLY_ALTA_INVALID_NIF_001",
  "SYNTHETIC_ONLY_ALTA_INVALID_DATE_001",
  "SYNTHETIC_ONLY_ALTA_MISSING_SERIES_NUMBER_001",
  "SYNTHETIC_ONLY_ALTA_HASH_MISMATCH_001",
] as const;

function descriptorFor(id: string): SyntheticFixtureDescriptor {
  const descriptor = VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS.find(
    (entry) => entry.id === id,
  );
  if (!descriptor) throw new Error(`Missing descriptor ${id}`);
  return descriptor;
}

describe("mapSyntheticCandidateToOfficialAlignedModel", () => {
  it("rechaza los positivos en la puerta oficial sin crear modelo alineado", () => {
    for (const id of POSITIVE_IDS) {
      const result = mapSyntheticCandidateToOfficialAlignedModel(descriptorFor(id));

      expect(result.status, id).toBe("rejected");
      if (result.status !== "rejected") continue;
      expect(result.syntheticOnly).toBe(true);
      expect(result.finality).toBe("candidate_not_aeat");
      expect(result.transportable).toBe(false);
      expect(result.errors.map((error) => error.code)).toContain(
        "official_artifact_gate_blocked",
      );
      expect(JSON.stringify(result)).not.toContain("fieldValues");
    }
  });

  it("rechaza escenarios negativos antes de mapping oficial", () => {
    for (const id of NEGATIVE_IDS) {
      const result = mapSyntheticCandidateToOfficialAlignedModel(descriptorFor(id));

      expect(result.status, id).toBe("rejected");
      if (result.status !== "rejected") continue;
      expect(result.errors[0]).toMatchObject({
        code: "descriptor_negative_not_mappable",
      });
    }
  });

  it("explica mappings pendientes y bloqueados sin exponer material XML", () => {
    const result = mapSyntheticCandidateToOfficialAlignedModel(
      descriptorFor("SYNTHETIC_ONLY_ALTA_BASIC_001"),
    );

    expect(result.status).toBe("rejected");
    const serialized = JSON.stringify(result);
    expect(serialized).toContain("mapping_pending");
    expect(serialized).toContain("mapping_blocked");
    expect(serialized).toContain("synthetic_value_not_official_example");
    expect(serialized).not.toContain("<RegFactuSistemaFacturacion");
    expect(serialized).not.toContain("<RegistroAlta");
  });

  it("no acepta descriptores fuera del conjunto controlado", () => {
    const result = mapSyntheticCandidateToOfficialAlignedModel({
      ...descriptorFor("SYNTHETIC_ONLY_ALTA_BASIC_001"),
      id: "SYNTHETIC_ONLY_UNKNOWN_OFFICIAL_MAPPING",
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors[0]).toMatchObject({
        code: "candidate_input_rejected",
      });
    }
  });
});
