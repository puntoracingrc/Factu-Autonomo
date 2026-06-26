import { describe, expect, it } from "vitest";
import { VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS } from "../verifactu-synthetic-fixtures/fixtures";
import { runSyntheticCandidateXmlPipeline } from "./pipeline";

const POSITIVE_IDS = [
  "SYNTHETIC_ONLY_ALTA_BASIC_001",
  "SYNTHETIC_ONLY_CHAIN_FIRST_001",
  "SYNTHETIC_ONLY_CHAIN_SECOND_001",
  "SYNTHETIC_ONLY_CANCEL_BASIC_001",
] as const;

const NEGATIVE_REASONS = new Map([
  ["SYNTHETIC_ONLY_ALTA_INVALID_NIF_001", "invalid_nif_candidate"],
  ["SYNTHETIC_ONLY_ALTA_INVALID_DATE_001", "invalid_date_candidate"],
  [
    "SYNTHETIC_ONLY_ALTA_MISSING_SERIES_NUMBER_001",
    "missing_series_number_candidate",
  ],
  ["SYNTHETIC_ONLY_ALTA_HASH_MISMATCH_001", "candidate_hash_mismatch"],
]);

function descriptorFor(id: string) {
  const descriptor = VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS.find(
    (entry) => entry.id === id,
  );
  expect(descriptor).toBeDefined();
  return descriptor;
}

describe("runSyntheticCandidateXmlPipeline", () => {
  it("acepta los cuatro escenarios positivos controlados", () => {
    for (const id of POSITIVE_IDS) {
      const result = runSyntheticCandidateXmlPipeline(descriptorFor(id));

      expect(result.status, id).toBe("accepted");
      if (result.status !== "accepted") continue;
      expect(result.descriptorId).toBe(id);
      expect(result.finality).toBe("candidate_not_aeat");
      expect(result.syntheticOnly).toBe(true);
      expect(result.transportable).toBe(false);
      expect(result.localValidation.status).toBe("accepted");
    }
  });

  it("rechaza los cuatro escenarios negativos con razones controladas", () => {
    for (const [id, reason] of NEGATIVE_REASONS) {
      const result = runSyntheticCandidateXmlPipeline(descriptorFor(id));

      expect(result.status, id).toBe("rejected");
      if (result.status !== "rejected") continue;
      expect(result.descriptorId).toBe(id);
      expect(result.rejectionReason).toBe(reason);
      expect(JSON.stringify(result)).not.toContain("xmlCandidate");
    }
  });

  it("no serializa XML para escenarios negativos", () => {
    const result = runSyntheticCandidateXmlPipeline(
      descriptorFor("SYNTHETIC_ONLY_ALTA_INVALID_NIF_001"),
    );

    expect(result.status).toBe("rejected");
    expect(JSON.stringify(result)).not.toContain(
      "<FactuAutonomoSyntheticFiscalCandidate",
    );
    expect(JSON.stringify(result)).not.toContain("IssuerReference");
  });

  it("rechaza descriptores desconocidos sin tocar producto", () => {
    const descriptor = {
      ...descriptorFor("SYNTHETIC_ONLY_ALTA_BASIC_001"),
      id: "SYNTHETIC_ONLY_UNKNOWN_PIPELINE_001",
    };

    const result = runSyntheticCandidateXmlPipeline(descriptor);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors[0]).toMatchObject({ code: "descriptor_unknown" });
      expect(result.transportable).toBe(false);
    }
  });

  it("produce resultados deterministas para el mismo descriptor", () => {
    const descriptor = descriptorFor("SYNTHETIC_ONLY_ALTA_BASIC_001");
    const first = runSyntheticCandidateXmlPipeline(descriptor);
    const second = runSyntheticCandidateXmlPipeline(descriptor);

    expect(first.status).toBe("accepted");
    expect(second.status).toBe("accepted");
    if (first.status !== "accepted" || second.status !== "accepted") return;
    expect(first.hash.digest).toBe(second.hash.digest);
    expect(first.xmlCandidate.digest).toBe(second.xmlCandidate.digest);
  });

  it("devuelve solo resumen seguro del XML candidato", () => {
    const result = runSyntheticCandidateXmlPipeline(
      descriptorFor("SYNTHETIC_ONLY_CHAIN_FIRST_001"),
    );

    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") return;
    expect(result.xmlCandidate).toMatchObject({
      schemaVersionCandidate: "phase2b6f-v1",
      transportable: false,
      finality: "candidate_not_aeat",
    });
    expect(JSON.stringify(result.xmlCandidate)).not.toContain(
      "<FactuAutonomoSyntheticFiscalCandidate",
    );
  });

  it("mantiene todos los resultados como synthetic_only y candidate_not_aeat", () => {
    for (const descriptor of VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS) {
      const result = runSyntheticCandidateXmlPipeline(descriptor);

      expect(result.finality, descriptor.id).toBe("candidate_not_aeat");
      expect(result.syntheticOnly, descriptor.id).toBe(true);
      expect(result.transportable, descriptor.id).toBe(false);
    }
  });

  it("no devuelve marcadores de red, base de datos o envio", () => {
    const result = runSyntheticCandidateXmlPipeline(
      descriptorFor("SYNTHETIC_ONLY_ALTA_BASIC_001"),
    );
    const serialized = JSON.stringify(result).toLowerCase();

    expect(serialized).not.toContain(["fetch", "("].join(""));
    expect(serialized).not.toContain("supabase");
    expect(serialized).not.toContain(["fiscal", "_transport", "_attempts"].join(""));
  });
});
