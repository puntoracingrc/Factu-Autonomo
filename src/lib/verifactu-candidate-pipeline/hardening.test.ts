import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import { VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS } from "../verifactu-synthetic-fixtures/fixtures";
import { buildSyntheticCandidateHash } from "./candidate-hash";
import { buildSyntheticCandidateInputFromDescriptor } from "./candidate-input";
import { canonicalizeSyntheticCandidateInput } from "./canonicalize";
import { runSyntheticCandidateXmlPipeline } from "./pipeline";
import type {
  CandidateCanonicalMaterial,
  CandidateHashArtifact,
  SyntheticCandidateRecordInput,
} from "./types";
import { buildSyntheticXmlCandidateArtifact } from "./xml-candidate";

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

function descriptorFor(id: string) {
  const descriptor = VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS.find(
    (entry) => entry.id === id,
  );
  expect(descriptor).toBeDefined();
  return descriptor;
}

function candidateParts(id = "SYNTHETIC_ONLY_ALTA_BASIC_001"): {
  input: SyntheticCandidateRecordInput;
  canonical: CandidateCanonicalMaterial;
  hash: CandidateHashArtifact;
} {
  const input = buildSyntheticCandidateInputFromDescriptor(descriptorFor(id));
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
  return { input: input.input, canonical: canonical.material, hash: hash.hash };
}

function buildArtifact(id?: string) {
  const parts = candidateParts(id);
  const result = buildSyntheticXmlCandidateArtifact(
    parts.input,
    parts.canonical,
    parts.hash,
  );
  expect(result.status).toBe("built");
  if (result.status !== "built") throw new Error("Missing artifact");
  return { ...parts, artifact: result.artifact };
}

describe("synthetic candidate pipeline hardening", () => {
  it("mantiene determinismo independiente de locale", () => {
    const before = Intl.DateTimeFormat().resolvedOptions().locale;
    const first = runSyntheticCandidateXmlPipeline(
      descriptorFor("SYNTHETIC_ONLY_ALTA_BASIC_001"),
    );
    const after = Intl.DateTimeFormat("de-DE").resolvedOptions().locale;
    const second = runSyntheticCandidateXmlPipeline(
      descriptorFor("SYNTHETIC_ONLY_ALTA_BASIC_001"),
    );

    expect(before).toBeTruthy();
    expect(after).toBe("de-DE");
    expect(first.status).toBe("accepted");
    expect(second.status).toBe("accepted");
    if (first.status !== "accepted" || second.status !== "accepted") return;
    expect(first.hash.digest).toBe(second.hash.digest);
    expect(first.xmlCandidate.digest).toBe(second.xmlCandidate.digest);
  });

  it("mantiene determinismo independiente de timezone del proceso", () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = "Pacific/Honolulu";
    const first = runSyntheticCandidateXmlPipeline(
      descriptorFor("SYNTHETIC_ONLY_CHAIN_FIRST_001"),
    );
    process.env.TZ = "Europe/Madrid";
    const second = runSyntheticCandidateXmlPipeline(
      descriptorFor("SYNTHETIC_ONLY_CHAIN_FIRST_001"),
    );
    if (previousTimezone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previousTimezone;
    }

    expect(first.status).toBe("accepted");
    expect(second.status).toBe("accepted");
    if (first.status !== "accepted" || second.status !== "accepted") return;
    expect(first.hash.digest).toBe(second.hash.digest);
    expect(first.xmlCandidate.digest).toBe(second.xmlCandidate.digest);
  });

  it("rechaza de forma estable saltos de linea internos LF y CRLF", () => {
    const { input } = candidateParts();
    const lf = canonicalizeSyntheticCandidateInput({
      ...input,
      invoiceReference: "SYNTHETIC_ONLY_DOC\nBROKEN",
    });
    const crlf = canonicalizeSyntheticCandidateInput({
      ...input,
      invoiceReference: "SYNTHETIC_ONLY_DOC\r\nBROKEN",
    });

    expect(lf.status).toBe("rejected");
    expect(crlf.status).toBe("rejected");
    if (lf.status === "rejected" && crlf.status === "rejected") {
      expect(lf.errors[0].code).toBe(crlf.errors[0].code);
      expect(lf.errors[0].path).toBe(crlf.errors[0].path);
    }
  });

  it("escapa unicode y caracteres XML escapables sin exponer XML en JSON", () => {
    const { input, canonical, hash } = candidateParts();
    const enrichedInput: SyntheticCandidateRecordInput = {
      ...input,
      operationReference: "SYNTHETIC_ONLY_OPERATION_UNICODE_áéí_amp",
    };
    const result = buildSyntheticXmlCandidateArtifact(
      enrichedInput,
      { ...canonical, descriptorId: enrichedInput.descriptorId },
      hash,
    );

    expect(result.status).toBe("built");
    if (result.status !== "built") return;
    expect(result.artifact.getXmlForLocalValidation()).toContain("áéí");
    expect(JSON.stringify(result.artifact)).not.toContain(
      "<FactuAutonomoSyntheticFiscalCandidate",
    );
  });

  it("rechaza caracteres de control XML en campos candidatos", () => {
    const { input } = candidateParts();
    const result = canonicalizeSyntheticCandidateInput({
      ...input,
      invoiceReference: "SYNTHETIC_ONLY_DOC_\u0001",
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.code)).toContain(
        "unsafe_candidate_value",
      );
    }
  });

  it("no copia campos inesperados del descriptor hacia la entrada candidata", () => {
    const descriptor = {
      ...descriptorFor("SYNTHETIC_ONLY_ALTA_BASIC_001"),
      metadata: {
        extraSafeField: "SYNTHETIC_ONLY_SHOULD_NOT_BE_COPIED",
      },
    };
    const result = buildSyntheticCandidateInputFromDescriptor(descriptor);

    expect(result.status).toBe("built");
    if (result.status !== "built") return;
    expect(JSON.stringify(result.input)).not.toContain("SHOULD_NOT_BE_COPIED");
  });

  it("la mutacion de la entrada original no altera un artefacto ya creado", () => {
    const { input, canonical, hash } = candidateParts();
    const result = buildSyntheticXmlCandidateArtifact(input, canonical, hash);
    expect(result.status).toBe("built");
    if (result.status !== "built") return;
    const before = result.artifact.getXmlForLocalValidation();
    (input as { invoiceReference: string }).invoiceReference =
      "SYNTHETIC_ONLY_MUTATED_AFTER_BUILD";

    expect(result.artifact.getXmlForLocalValidation()).toBe(before);
    expect(result.artifact.getXmlForLocalValidation()).not.toContain(
      "MUTATED_AFTER_BUILD",
    );
  });

  it("toString, toJSON e inspeccion Node no exponen XML", () => {
    const { artifact } = buildArtifact();

    expect(String(artifact)).toContain("redacted");
    expect(String(artifact)).not.toContain("<FactuAutonomoSyntheticFiscalCandidate");
    expect(JSON.stringify(artifact)).not.toContain(
      "<FactuAutonomoSyntheticFiscalCandidate",
    );
    expect(inspect(artifact)).toContain("redacted");
    expect(inspect(artifact)).not.toContain(
      "<FactuAutonomoSyntheticFiscalCandidate",
    );
  });

  it("los errores no contienen material canonico completo ni XML", () => {
    const { input } = candidateParts();
    const result = canonicalizeSyntheticCandidateInput({
      ...input,
      descriptorId: "BROKEN_DESCRIPTOR",
    });

    expect(result.status).toBe("rejected");
    expect(JSON.stringify(result)).not.toContain("canonicalText");
    expect(JSON.stringify(result)).not.toContain(
      "<FactuAutonomoSyntheticFiscalCandidate",
    );
  });

  it("no devuelve rutas ni marcadores de disco, red, Supabase o UI", () => {
    const result = runSyntheticCandidateXmlPipeline(
      descriptorFor("SYNTHETIC_ONLY_CANCEL_BASIC_001"),
    );
    const serialized = JSON.stringify(result).toLowerCase();

    expect(serialized).not.toContain("filepath");
    expect(serialized).not.toContain(["fetch", "("].join(""));
    expect(serialized).not.toContain("supabase");
    expect(serialized).not.toContain("react");
    expect(serialized).not.toContain("document.");
  });

  it("mantiene los cuatro positivos aceptados", () => {
    for (const id of POSITIVE_IDS) {
      const result = runSyntheticCandidateXmlPipeline(descriptorFor(id));
      expect(result.status, id).toBe("accepted");
    }
  });

  it("mantiene los cuatro negativos rechazados", () => {
    for (const id of NEGATIVE_IDS) {
      const result = runSyntheticCandidateXmlPipeline(descriptorFor(id));
      expect(result.status, id).toBe("rejected");
    }
  });
});
