import { describe, expect, it } from "vitest";
import { VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS } from "../verifactu-synthetic-fixtures/fixtures";
import { buildSyntheticCandidateHash } from "./candidate-hash";
import { buildSyntheticCandidateInputFromDescriptor } from "./candidate-input";
import { canonicalizeSyntheticCandidateInput } from "./canonicalize";
import type {
  CandidateCanonicalMaterial,
  CandidateHashArtifact,
  SyntheticCandidateRecordInput,
} from "./types";
import { escapeSyntheticXmlText } from "./xml-escape";
import { buildSyntheticXmlCandidateArtifact } from "./xml-candidate";

function candidateParts(id = "SYNTHETIC_ONLY_ALTA_BASIC_001"): {
  input: SyntheticCandidateRecordInput;
  canonical: CandidateCanonicalMaterial;
  hash: CandidateHashArtifact;
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
  if (result.status !== "built") {
    throw new Error(`Missing XML candidate for ${id ?? "default"}`);
  }
  return { ...parts, artifact: result.artifact, safeSummary: result.safeSummary };
}

describe("escapeSyntheticXmlText", () => {
  it("escapa caracteres XML sin crear material oficial", () => {
    expect(escapeSyntheticXmlText("A&B<C>\"'")).toBe(
      "A&amp;B&lt;C&gt;&quot;&apos;",
    );
  });
});

describe("buildSyntheticXmlCandidateArtifact", () => {
  it("construye un XML candidato minimo en memoria", () => {
    const { artifact } = buildArtifact();
    const xml = artifact.getXmlForLocalValidation();

    expect(xml).toContain("<FactuAutonomoSyntheticFiscalCandidate ");
    expect(xml).toContain(
      'xmlns="urn:factura-autonomo:synthetic:fiscal-candidate:v1"',
    );
    expect(xml).toContain('syntheticOnly="true"');
    expect(xml).toContain('finality="candidate_not_aeat"');
    expect(xml).toContain('transportable="false"');
    expect(xml).toContain('schemaVersionCandidate="phase2b6f-v1"');
  });

  it("incluye descriptor, material canonico resumido y huella candidata", () => {
    const { artifact, canonical, hash } = buildArtifact(
      "SYNTHETIC_ONLY_CHAIN_FIRST_001",
    );
    const xml = artifact.getXmlForLocalValidation();

    expect(xml).toContain('id="SYNTHETIC_ONLY_CHAIN_FIRST_001"');
    expect(xml).toContain(`byteLength="${canonical.byteLength}"`);
    expect(xml).toContain(`fieldCount="${canonical.fields.length}"`);
    expect(xml).toContain(hash.digest);
    expect(xml).toContain('officialFingerprint="false"');
  });

  it("incluye la huella previa candidata cuando existe", () => {
    const { artifact } = buildArtifact("SYNTHETIC_ONLY_CHAIN_SECOND_001");

    expect(artifact.getXmlForLocalValidation()).toContain(
      "SYNTHETIC_ONLY_PREVIOUS_HASH_CHAIN_FIRST_001",
    );
  });

  it("calcula digest y longitud desde el XML en memoria", () => {
    const { artifact } = buildArtifact();
    const xml = artifact.getXmlForLocalValidation();

    expect(artifact.digest).toMatch(/^sha256-candidate-v1:[a-f0-9]{64}$/);
    expect(artifact.byteLength).toBe(Buffer.byteLength(xml, "utf8"));
  });

  it("genera digest determinista para el mismo candidato", () => {
    const first = buildArtifact().artifact;
    const second = buildArtifact().artifact;

    expect(first.digest).toBe(second.digest);
  });

  it("mantiene el XML fuera de JSON.stringify", () => {
    const { artifact } = buildArtifact();
    const serialized = JSON.stringify(artifact);

    expect(serialized).toContain("SYNTHETIC_ONLY_ALTA_BASIC_001");
    expect(serialized).not.toContain("<FactuAutonomoSyntheticFiscalCandidate");
    expect(serialized).not.toContain("IssuerReference");
  });

  it("mantiene el XML fuera de toString", () => {
    const { artifact } = buildArtifact();

    expect(String(artifact)).toContain("redacted");
    expect(String(artifact)).not.toContain("<FactuAutonomoSyntheticFiscalCandidate");
  });

  it("expone un resumen seguro con transportable false", () => {
    const { safeSummary } = buildArtifact();

    expect(safeSummary).toMatchObject({
      schemaVersionCandidate: "phase2b6f-v1",
      finality: "candidate_not_aeat",
      syntheticOnly: true,
      transportable: false,
    });
  });

  it("no enumera el XML como propiedad publica", () => {
    const { artifact } = buildArtifact();

    expect(Object.keys(artifact)).not.toContain("xml");
    expect(Object.keys(artifact)).not.toContain("#xml");
  });

  it("no crea declaracion XML ni etiquetas oficiales bloqueadas", () => {
    const { artifact } = buildArtifact();
    const xml = artifact.getXmlForLocalValidation();

    expect(xml).not.toContain(["<", "?xml"].join(""));
    expect(xml).not.toContain(["<", "Registro"].join(""));
    expect(xml).not.toContain(["<", "Factura"].join(""));
  });

  it("no incluye firma, certificados ni destinos externos", () => {
    const { artifact } = buildArtifact();
    const xml = artifact.getXmlForLocalValidation().toLowerCase();

    expect(xml).not.toContain(["<", "signature"].join(""));
    expect(xml).not.toContain("x509certificate");
    expect(xml).not.toContain(["sede.", "aeat"].join(""));
    expect(xml).not.toContain("suministrofacturas");
  });

  it("no declara el candidato como transportable true", () => {
    const { artifact } = buildArtifact();
    const unsafe = ["transport", "able=\"true\""].join("");

    expect(artifact.getXmlForLocalValidation()).not.toContain(unsafe);
  });

  it("rechaza escenarios negativos antes de crear XML candidato", () => {
    const parts = candidateParts("SYNTHETIC_ONLY_ALTA_INVALID_DATE_001");
    const result = buildSyntheticXmlCandidateArtifact(
      parts.input,
      parts.canonical,
      parts.hash,
    );

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.code)).toContain(
        "scenario_rejected",
      );
    }
  });

  it("rechaza material canonico de otro descriptor", () => {
    const parts = candidateParts("SYNTHETIC_ONLY_ALTA_BASIC_001");
    const other = candidateParts("SYNTHETIC_ONLY_CHAIN_FIRST_001");

    const result = buildSyntheticXmlCandidateArtifact(
      parts.input,
      other.canonical,
      parts.hash,
    );

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.code)).toContain(
        "canonical_material_invalid",
      );
    }
  });

  it("rechaza huella candidata de otro descriptor", () => {
    const parts = candidateParts("SYNTHETIC_ONLY_ALTA_BASIC_001");
    const other = candidateParts("SYNTHETIC_ONLY_CHAIN_FIRST_001");

    const result = buildSyntheticXmlCandidateArtifact(
      parts.input,
      parts.canonical,
      other.hash,
    );

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.code)).toContain("hash_invalid");
    }
  });

  it("marca candidateHashDigest igual a la huella candidata", () => {
    const { artifact, hash } = buildArtifact();

    expect(artifact.candidateHashDigest).toBe(hash.digest);
  });

  it("solo permite extraer XML mediante el metodo explicito de validacion local", () => {
    const { artifact } = buildArtifact();

    expect(typeof artifact.getXmlForLocalValidation).toBe("function");
    expect(JSON.stringify(artifact.toJSON())).not.toContain(
      "<FactuAutonomoSyntheticFiscalCandidate",
    );
  });
});
