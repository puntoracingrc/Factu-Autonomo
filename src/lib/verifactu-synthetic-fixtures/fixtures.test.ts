import { describe, expect, it } from "vitest";
import { validateSyntheticFixtureDescriptor } from "./fixture-policy";
import { VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS } from "./fixtures";

const JOIN = (...parts: string[]) => parts.join("");
const FORBIDDEN_TERMS = [
  JOIN("<", "?xml"),
  JOIN("<", "Registro"),
  JOIN("<", "Factura"),
  JOIN("agencia", "tributaria"),
  JOIN("service", "_role"),
  JOIN("api", "_", "token"),
  JOIN("shared", "_", "secret"),
  JOIN("transport", "able", ": true"),
  JOIN("fiscal", "_transport", "_attempts"),
  "cliente real",
  "factura real",
] as const;

const WAVE_2_IDS = [
  "SYNTHETIC_ONLY_ALTA_INVALID_NIF_001",
  "SYNTHETIC_ONLY_ALTA_INVALID_DATE_001",
  "SYNTHETIC_ONLY_ALTA_MISSING_SERIES_NUMBER_001",
  "SYNTHETIC_ONLY_ALTA_HASH_MISMATCH_001",
] as const;

function descriptorLabel(descriptor: { readonly id: string }) {
  return descriptor.id;
}

describe("VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS", () => {
  it("todos los descriptores son aceptados por los guardrails 2B.6A", () => {
    for (const descriptor of VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS) {
      const result = validateSyntheticFixtureDescriptor(descriptor);
      expect(result, descriptorLabel(descriptor)).toMatchObject({
        status: "accepted",
        errors: [],
      });
    }
  });

  it("todos los IDs son unicos y sinteticos", () => {
    const ids = VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS.map(
      (descriptor) => descriptor.id,
    );

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith("SYNTHETIC_ONLY_")).toBe(true);
    }
  });

  it("todos los descriptores declaran syntheticOnly true y sourcePhase permitido", () => {
    for (const descriptor of VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS) {
      expect(descriptor.syntheticOnly, descriptorLabel(descriptor)).toBe(true);
      expect(["2B.6B", "2B.6C"], descriptorLabel(descriptor)).toContain(
        descriptor.sourcePhase,
      );
    }
  });

  it("todos los descriptores de Oleada 2 son aceptados por los guardrails 2B.6A", () => {
    const descriptorsById = new Map(
      VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS.map((descriptor) => [
        descriptor.id,
        descriptor,
      ]),
    );

    for (const id of WAVE_2_IDS) {
      const descriptor = descriptorsById.get(id);
      expect(descriptor, id).toBeDefined();
      if (!descriptor) continue;
      expect(descriptor.sourcePhase, id).toBe("2B.6C");
      expect(validateSyntheticFixtureDescriptor(descriptor), id).toMatchObject({
        status: "accepted",
        errors: [],
      });
    }
  });

  it("no contiene material bloqueado ni datos reales", () => {
    for (const descriptor of VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS) {
      const serialized = JSON.stringify(descriptor).toLowerCase();
      for (const term of FORBIDDEN_TERMS) {
        expect(serialized, descriptorLabel(descriptor)).not.toContain(
          term.toLowerCase(),
        );
      }
    }
  });

  it("los errores de coleccion identifican descriptor sin imprimir contenido sensible", () => {
    const brokenDescriptor = {
      ...VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS[0],
      id: "BROKEN_ALTA_BASIC_001",
    };
    const result = validateSyntheticFixtureDescriptor(brokenDescriptor);

    expect(result.status).toBe("rejected");
    expect(brokenDescriptor.id).toBe("BROKEN_ALTA_BASIC_001");
    expect(JSON.stringify(result)).not.toContain("amountCents");
    expect(JSON.stringify(result)).not.toContain("customerRef");
  });

  it("los descriptores negativos son casos ficticios seguros", () => {
    const wave2Descriptors = VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS.filter(
      (descriptor) => WAVE_2_IDS.includes(descriptor.id as (typeof WAVE_2_IDS)[number]),
    );

    expect(wave2Descriptors).toHaveLength(WAVE_2_IDS.length);
    for (const descriptor of wave2Descriptors) {
      const serialized = JSON.stringify(descriptor).toLowerCase();
      expect(serialized, descriptorLabel(descriptor)).toContain(
        "synthetic_only",
      );
      expect(serialized, descriptorLabel(descriptor)).toContain("fictici");
      expect(serialized, descriptorLabel(descriptor)).not.toContain("datos reales");
    }
  });
});
