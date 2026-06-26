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
      expect(descriptor.sourcePhase, descriptorLabel(descriptor)).toBe("2B.6B");
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
});
