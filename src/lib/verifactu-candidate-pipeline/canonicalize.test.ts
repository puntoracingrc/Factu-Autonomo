import { describe, expect, it } from "vitest";
import { VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS } from "../verifactu-synthetic-fixtures/fixtures";
import { buildSyntheticCandidateInputFromDescriptor } from "./candidate-input";
import { canonicalizeSyntheticCandidateInput } from "./canonicalize";
import type { SyntheticCandidateRecordInput } from "./types";

function inputFor(id: string): SyntheticCandidateRecordInput {
  const descriptor = VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS.find(
    (entry) => entry.id === id,
  );
  expect(descriptor).toBeDefined();
  const result = buildSyntheticCandidateInputFromDescriptor(descriptor);
  expect(result.status).toBe("built");
  if (result.status !== "built") {
    throw new Error(`Missing synthetic input for ${id}`);
  }
  return result.input;
}

function canonicalFor(id: string, overrides = {}) {
  return canonicalizeSyntheticCandidateInput({
    ...inputFor(id),
    ...overrides,
  });
}

describe("buildSyntheticCandidateInputFromDescriptor", () => {
  it("construye entrada candidata para los ocho descriptores controlados", () => {
    for (const descriptor of VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS) {
      const result = buildSyntheticCandidateInputFromDescriptor(descriptor);
      expect(result.status, descriptor.id).toBe("built");
      if (result.status !== "built") continue;
      expect(result.input.descriptorId).toBe(descriptor.id);
      expect(result.input.syntheticOnly).toBe(true);
    }
  });

  it("rechaza un descriptor sintetico valido pero no registrado en la fase", () => {
    const descriptor = {
      ...VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS[0],
      id: "SYNTHETIC_ONLY_NOT_REGISTERED_001",
    };

    const result = buildSyntheticCandidateInputFromDescriptor(descriptor);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors[0]).toMatchObject({ code: "descriptor_unknown" });
    }
  });

  it("rechaza descriptores que no pasan los guardrails previos", () => {
    const descriptor = {
      ...VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS[0],
      id: "NOT_SYNTHETIC",
    };

    const result = buildSyntheticCandidateInputFromDescriptor(descriptor);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors[0]).toMatchObject({
        code: "descriptor_policy_rejected",
      });
    }
  });
});

describe("canonicalizeSyntheticCandidateInput", () => {
  it("canonicaliza de forma determinista un alta sintetica positiva", () => {
    const first = canonicalFor("SYNTHETIC_ONLY_ALTA_BASIC_001");
    const second = canonicalFor("SYNTHETIC_ONLY_ALTA_BASIC_001");

    expect(first.status).toBe("canonicalized");
    expect(second.status).toBe("canonicalized");
    if (first.status !== "canonicalized" || second.status !== "canonicalized") {
      return;
    }
    expect(first.material.canonicalText).toBe(second.material.canonicalText);
    expect(first.material.finality).toBe("candidate_not_aeat");
    expect(first.material.syntheticOnly).toBe(true);
  });

  it("usa un orden estable de campos canonicos", () => {
    const result = canonicalFor("SYNTHETIC_ONLY_CHAIN_FIRST_001");

    expect(result.status).toBe("canonicalized");
    if (result.status !== "canonicalized") return;
    expect(result.material.fields.map((field) => field.name)).toEqual([
      "version",
      "finality",
      "syntheticOnly",
      "descriptorId",
      "kind",
      "sourcePhase",
      "issuerReference",
      "invoiceReference",
      "issueDateCandidate",
      "operationReference",
      "recordSequenceCandidate",
      "previousCandidateHash",
      "amountMinorCandidate",
      "currencyCandidate",
      "expectedOutcome",
      "expectedRejectionReason",
    ]);
  });

  it("marca version y longitud sin incluir XML", () => {
    const result = canonicalFor("SYNTHETIC_ONLY_CHAIN_SECOND_001");

    expect(result.status).toBe("canonicalized");
    if (result.status !== "canonicalized") return;
    expect(result.material.version).toBe("phase2b6d-candidate-canonical-v1");
    expect(result.material.byteLength).toBe(
      Buffer.byteLength(result.material.canonicalText, "utf8"),
    );
    expect(result.material.canonicalText).not.toContain("<");
    expect(result.material.canonicalText).not.toContain(">");
  });

  it("devuelve un resumen seguro sin texto canonico completo", () => {
    const result = canonicalFor("SYNTHETIC_ONLY_CANCEL_BASIC_001");

    expect(result.status).toBe("canonicalized");
    if (result.status !== "canonicalized") return;
    expect(result.safeSummary).toMatchObject({
      descriptorId: "SYNTHETIC_ONLY_CANCEL_BASIC_001",
      finality: "candidate_not_aeat",
      syntheticOnly: true,
    });
    expect(JSON.stringify(result.safeSummary)).not.toContain("canonicalText");
  });

  it("canonicaliza tambien escenarios negativos sin serializarlos", () => {
    const result = canonicalFor("SYNTHETIC_ONLY_ALTA_INVALID_NIF_001");

    expect(result.status).toBe("canonicalized");
    if (result.status !== "canonicalized") return;
    expect(result.material.canonicalText).toContain(
      "expectedOutcome=rejected_candidate",
    );
    expect(result.material.canonicalText).toContain(
      "expectedRejectionReason=invalid_nif_candidate",
    );
  });

  it("rechaza entradas ausentes", () => {
    const result = canonicalizeSyntheticCandidateInput(null);

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors[0]).toMatchObject({ code: "input_missing" });
    }
  });

  it("rechaza entradas sin marcador syntheticOnly", () => {
    const result = canonicalFor("SYNTHETIC_ONLY_ALTA_BASIC_001", {
      syntheticOnly: false,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.code)).toContain(
        "synthetic_marker_missing",
      );
    }
  });

  it("rechaza identificadores no sinteticos", () => {
    const result = canonicalFor("SYNTHETIC_ONLY_ALTA_BASIC_001", {
      descriptorId: "ALTA_BASIC_001",
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.code)).toContain(
        "identifier_not_synthetic",
      );
    }
  });

  it("rechaza referencias de emisor no sinteticas", () => {
    const result = canonicalFor("SYNTHETIC_ONLY_ALTA_BASIC_001", {
      issuerReference: "ISSUER_BLUE_STUDIO",
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.path)).toContain(
        "issuerReference",
      );
    }
  });

  it("rechaza tipos no soportados", () => {
    const result = canonicalFor("SYNTHETIC_ONLY_ALTA_BASIC_001", {
      kind: "not_supported",
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.code)).toContain(
        "unsupported_kind",
      );
    }
  });

  it("rechaza fechas candidatas que no son ISO ni marcador sintetico", () => {
    const result = canonicalFor("SYNTHETIC_ONLY_ALTA_BASIC_001", {
      issueDateCandidate: "15/01/2026",
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.path)).toContain(
        "issueDateCandidate",
      );
    }
  });

  it("rechaza divisas no normalizadas", () => {
    const result = canonicalFor("SYNTHETIC_ONLY_ALTA_BASIC_001", {
      currencyCandidate: "eur",
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.path)).toContain(
        "currencyCandidate",
      );
    }
  });

  it("rechaza secuencias menores que uno", () => {
    const result = canonicalFor("SYNTHETIC_ONLY_ALTA_BASIC_001", {
      recordSequenceCandidate: 0,
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.path)).toContain(
        "recordSequenceCandidate",
      );
    }
  });

  it("un cambio de huella previa cambia el material canonico", () => {
    const original = canonicalFor("SYNTHETIC_ONLY_CHAIN_SECOND_001");
    const changed = canonicalFor("SYNTHETIC_ONLY_CHAIN_SECOND_001", {
      previousCandidateHash: "SYNTHETIC_ONLY_PREVIOUS_HASH_OTHER",
    });

    expect(original.status).toBe("canonicalized");
    expect(changed.status).toBe("canonicalized");
    if (original.status !== "canonicalized" || changed.status !== "canonicalized") {
      return;
    }
    expect(original.material.canonicalText).not.toBe(
      changed.material.canonicalText,
    );
  });

  it("rechaza saltos de linea o marcas angulares en valores candidatos", () => {
    const result = canonicalFor("SYNTHETIC_ONLY_ALTA_BASIC_001", {
      invoiceReference: "SYNTHETIC_ONLY_DOC\nBROKEN",
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.errors.map((error) => error.code)).toContain(
        "unsafe_candidate_value",
      );
    }
  });
});
