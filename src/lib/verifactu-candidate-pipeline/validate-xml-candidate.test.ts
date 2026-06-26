import { describe, expect, it } from "vitest";
import { VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS } from "../verifactu-synthetic-fixtures/fixtures";
import { buildSyntheticCandidateHash } from "./candidate-hash";
import { buildSyntheticCandidateInputFromDescriptor } from "./candidate-input";
import { canonicalizeSyntheticCandidateInput } from "./canonicalize";
import type {
  CandidateCanonicalMaterial,
  CandidateHashArtifact,
  SyntheticCandidateRecordInput,
  SyntheticXmlCandidateArtifact,
} from "./types";
import { validateSyntheticXmlCandidate } from "./validate-xml-candidate";
import { buildSyntheticXmlCandidateArtifact } from "./xml-candidate";

function validationParts(id = "SYNTHETIC_ONLY_ALTA_BASIC_001"): {
  input: SyntheticCandidateRecordInput;
  canonical: CandidateCanonicalMaterial;
  hash: CandidateHashArtifact;
  artifact: SyntheticXmlCandidateArtifact;
} {
  const descriptor = VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS.find(
    (entry) => entry.id === id,
  );
  expect(descriptor).toBeDefined();
  const input = buildSyntheticCandidateInputFromDescriptor(descriptor);
  expect(input.status).toBe("built");
  if (input.status !== "built") throw new Error(`Missing input for ${id}`);
  const canonical = canonicalizeSyntheticCandidateInput(input.input);
  expect(canonical.status).toBe("canonicalized");
  if (canonical.status !== "canonicalized") {
    throw new Error(`Missing canonical material for ${id}`);
  }
  const hash = buildSyntheticCandidateHash(canonical.material);
  expect(hash.status).toBe("hashed");
  if (hash.status !== "hashed") throw new Error(`Missing hash for ${id}`);
  const artifact = buildSyntheticXmlCandidateArtifact(
    input.input,
    canonical.material,
    hash.hash,
  );
  expect(artifact.status).toBe("built");
  if (artifact.status !== "built") throw new Error(`Missing artifact for ${id}`);
  return {
    input: input.input,
    canonical: canonical.material,
    hash: hash.hash,
    artifact: artifact.artifact,
  };
}

function fakeArtifact(
  artifact: SyntheticXmlCandidateArtifact,
  xml: string,
  overrides: Partial<SyntheticXmlCandidateArtifact> = {},
): SyntheticXmlCandidateArtifact {
  return {
    ...artifact,
    ...overrides,
    getXmlForLocalValidation: () => xml,
    toJSON: () => artifact.toJSON(),
  };
}

describe("validateSyntheticXmlCandidate", () => {
  it("acepta un candidato XML sintetico local coherente", () => {
    const parts = validationParts();
    const result = validateSyntheticXmlCandidate(parts.artifact, parts);

    expect(result.status).toBe("accepted");
    if (result.status === "accepted") {
      expect(result.safeSummary).toMatchObject({
        descriptorId: "SYNTHETIC_ONLY_ALTA_BASIC_001",
        finality: "candidate_not_aeat",
        transportable: false,
      });
    }
  });

  it("rechaza un digest manipulado", () => {
    const parts = validationParts();
    const artifact = fakeArtifact(
      parts.artifact,
      parts.artifact.getXmlForLocalValidation(),
      { digest: "sha256-candidate-v1:0".padEnd(84, "0") },
    );
    const result = validateSyntheticXmlCandidate(artifact, parts);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.code)).toContain(
        "digest_mismatch",
      );
    }
  });

  it("rechaza una huella candidata que no coincide con el contexto", () => {
    const parts = validationParts();
    const other = validationParts("SYNTHETIC_ONLY_CHAIN_FIRST_001");
    const result = validateSyntheticXmlCandidate(parts.artifact, {
      input: parts.input,
      canonical: parts.canonical,
      hash: other.hash,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.code)).toContain(
        "candidate_hash_mismatch",
      );
    }
  });

  it("rechaza una referencia previa candidata eliminada", () => {
    const parts = validationParts("SYNTHETIC_ONLY_CHAIN_SECOND_001");
    const xml = parts.artifact
      .getXmlForLocalValidation()
      .replace("SYNTHETIC_ONLY_PREVIOUS_HASH_CHAIN_FIRST_001", "");
    const artifact = fakeArtifact(parts.artifact, xml);

    const result = validateSyntheticXmlCandidate(artifact, parts);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.code)).toContain(
        "previous_hash_mismatch",
      );
    }
  });

  it("rechaza XML sin namespace interno", () => {
    const parts = validationParts();
    const xml = parts.artifact
      .getXmlForLocalValidation()
      .replace('xmlns="urn:factura-autonomo:synthetic:fiscal-candidate:v1"', "");
    const artifact = fakeArtifact(parts.artifact, xml);

    const result = validateSyntheticXmlCandidate(artifact, parts);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.path)).toContain("namespace");
    }
  });

  it("rechaza XML marcado como transportable true", () => {
    const parts = validationParts();
    const xml = parts.artifact
      .getXmlForLocalValidation()
      .replace('transportable="false"', ["transport", "able=\"true\""].join(""));
    const artifact = fakeArtifact(parts.artifact, xml);

    const result = validateSyntheticXmlCandidate(artifact, parts);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.code)).toContain(
        "blocked_material_detected",
      );
    }
  });

  it("rechaza XML con firma tecnica", () => {
    const parts = validationParts();
    const xml = parts.artifact
      .getXmlForLocalValidation()
      .replace(
        "</FactuAutonomoSyntheticFiscalCandidate>",
        `${["<", "Signature"].join("")}></${"Signature"}></FactuAutonomoSyntheticFiscalCandidate>`,
      );
    const artifact = fakeArtifact(parts.artifact, xml);

    const result = validateSyntheticXmlCandidate(artifact, parts);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.code)).toContain(
        "blocked_material_detected",
      );
    }
  });

  it("no devuelve el XML completo dentro de errores", () => {
    const parts = validationParts();
    const artifact = fakeArtifact(parts.artifact, "broken");
    const result = validateSyntheticXmlCandidate(artifact, parts);

    expect(result.status).toBe("rejected");
    expect(JSON.stringify(result)).not.toContain(
      "<FactuAutonomoSyntheticFiscalCandidate",
    );
  });
});
