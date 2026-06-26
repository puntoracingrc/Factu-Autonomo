import { describe, expect, it } from "vitest";
import { VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS } from "../verifactu-synthetic-fixtures/fixtures";
import { buildSyntheticCandidateHash } from "./candidate-hash";
import { buildSyntheticCandidateInputFromDescriptor } from "./candidate-input";
import { canonicalizeSyntheticCandidateInput } from "./canonicalize";
import type { CandidateCanonicalMaterial } from "./types";

function materialFor(id: string): CandidateCanonicalMaterial {
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
  return canonical.material;
}

describe("buildSyntheticCandidateHash", () => {
  it("calcula una huella candidata determinista", () => {
    const material = materialFor("SYNTHETIC_ONLY_ALTA_BASIC_001");
    const first = buildSyntheticCandidateHash(material);
    const second = buildSyntheticCandidateHash(material);

    expect(first.status).toBe("hashed");
    expect(second.status).toBe("hashed");
    if (first.status !== "hashed" || second.status !== "hashed") return;
    expect(first.hash.digest).toBe(second.hash.digest);
  });

  it("usa sha256-candidate-v1 y no se declara huella oficial", () => {
    const result = buildSyntheticCandidateHash(
      materialFor("SYNTHETIC_ONLY_CHAIN_FIRST_001"),
    );

    expect(result.status).toBe("hashed");
    if (result.status !== "hashed") return;
    expect(result.hash.algorithm).toBe("sha256-candidate-v1");
    expect(result.hash.digest).toMatch(/^sha256-candidate-v1:[a-f0-9]{64}$/);
    expect(result.hash.hex).toHaveLength(64);
    expect(result.hash.officialFingerprint).toBe(false);
  });

  it("cambia cuando cambia el material canonico", () => {
    const base = materialFor("SYNTHETIC_ONLY_CHAIN_SECOND_001");
    const changed: CandidateCanonicalMaterial = {
      ...base,
      canonicalText: base.canonicalText.replace(
        "SYNTHETIC_ONLY_PREVIOUS_HASH_CHAIN_FIRST_001",
        "SYNTHETIC_ONLY_PREVIOUS_HASH_OTHER",
      ),
    };
    const normalizedChanged = {
      ...changed,
      byteLength: Buffer.byteLength(changed.canonicalText, "utf8"),
    };

    const baseHash = buildSyntheticCandidateHash(base);
    const changedHash = buildSyntheticCandidateHash(normalizedChanged);

    expect(baseHash.status).toBe("hashed");
    expect(changedHash.status).toBe("hashed");
    if (baseHash.status !== "hashed" || changedHash.status !== "hashed") return;
    expect(baseHash.hash.digest).not.toBe(changedHash.hash.digest);
  });

  it("propaga descriptor y tipo al resumen seguro", () => {
    const result = buildSyntheticCandidateHash(
      materialFor("SYNTHETIC_ONLY_CANCEL_BASIC_001"),
    );

    expect(result.status).toBe("hashed");
    if (result.status !== "hashed") return;
    expect(result.safeSummary).toMatchObject({
      descriptorId: "SYNTHETIC_ONLY_CANCEL_BASIC_001",
      kind: "cancel_basic",
      finality: "candidate_not_aeat",
      officialFingerprint: false,
    });
  });

  it("no expone hex plano en el resumen seguro", () => {
    const result = buildSyntheticCandidateHash(
      materialFor("SYNTHETIC_ONLY_ALTA_BASIC_001"),
    );

    expect(result.status).toBe("hashed");
    if (result.status !== "hashed") return;
    expect(JSON.stringify(result.safeSummary)).not.toContain('"hex"');
  });

  it("rechaza material ausente", () => {
    const result = buildSyntheticCandidateHash(null);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors[0]).toMatchObject({
        code: "canonical_material_invalid",
      });
    }
  });

  it("rechaza versiones canonicas inesperadas", () => {
    const material = {
      ...materialFor("SYNTHETIC_ONLY_ALTA_BASIC_001"),
      version: "other-version",
    };

    const result = buildSyntheticCandidateHash(material);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.path)).toContain("version");
    }
  });

  it("rechaza finalidades distintas de candidate_not_aeat", () => {
    const material = {
      ...materialFor("SYNTHETIC_ONLY_ALTA_BASIC_001"),
      finality: "other",
    };

    const result = buildSyntheticCandidateHash(material);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.path)).toContain("finality");
    }
  });

  it("rechaza longitudes de material canonico inconsistentes", () => {
    const material = {
      ...materialFor("SYNTHETIC_ONLY_ALTA_BASIC_001"),
      byteLength: 1,
    };

    const result = buildSyntheticCandidateHash(material);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.path)).toContain("byteLength");
    }
  });

  it("rechaza material sin marcador sintetico", () => {
    const material = {
      ...materialFor("SYNTHETIC_ONLY_ALTA_BASIC_001"),
      syntheticOnly: false,
    };

    const result = buildSyntheticCandidateHash(material);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.code)).toContain(
        "synthetic_marker_missing",
      );
    }
  });
});
