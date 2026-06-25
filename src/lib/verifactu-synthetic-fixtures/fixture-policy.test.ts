import { describe, expect, it } from "vitest";
import {
  isSyntheticFixtureDescriptorAccepted,
  validateSyntheticFixtureDescriptor,
} from "./fixture-policy";
import type { SyntheticFixtureDescriptor } from "./types";

const JOIN = (...parts: string[]) => parts.join("");

function descriptor(
  overrides: Record<string, unknown> = {},
): SyntheticFixtureDescriptor & Record<string, unknown> {
  return {
    id: "SYNTHETIC_ONLY_ALTA_BASIC_001",
    kind: "alta_basic",
    purpose: "Descriptor interno sintetico para validar guardrails futuros.",
    syntheticOnly: true,
    sourcePhase: "2B.6A",
    expectedFutureValidations: ["shape_policy", "safe_metadata"],
    blockedUntil: "external-review",
    metadata: {
      scenario: "basic",
      fictional: true,
    },
    ...overrides,
  };
}

function expectRejectedCode(input: unknown, code: string) {
  const result = validateSyntheticFixtureDescriptor(input);
  expect(result.status).toBe("rejected");
  if (result.status !== "rejected") return;
  expect(result.errors.map((error) => error.code)).toContain(code);
}

describe("validateSyntheticFixtureDescriptor", () => {
  it("acepta descriptor sintetico valido", () => {
    const result = validateSyntheticFixtureDescriptor(descriptor());

    expect(result).toMatchObject({
      status: "accepted",
      errors: [],
    });
    expect(isSyntheticFixtureDescriptorAccepted(descriptor())).toBe(true);
  });

  it("rechaza id sin prefijo sintetico", () => {
    expectRejectedCode(descriptor({ id: "ALTA_BASIC_001" }), "id_prefix_invalid");
  });

  it("rechaza syntheticOnly false", () => {
    expectRejectedCode(
      descriptor({ syntheticOnly: false }),
      "synthetic_only_invalid",
    );
  });

  it("rechaza kind desconocido", () => {
    expectRejectedCode(descriptor({ kind: "alta_real" }), "kind_invalid");
  });

  it("rechaza purpose vacio", () => {
    expectRejectedCode(descriptor({ purpose: "   " }), "purpose_missing");
  });

  it("rechaza XML completo con declaracion", () => {
    expectRejectedCode(
      descriptor({
        metadata: { payload: JOIN("<", "?xml version=\"1.0\"?><root />") },
      }),
      "xml_material_detected",
    );
  });

  it("rechaza texto con etiqueta de factura", () => {
    expectRejectedCode(
      descriptor({ metadata: { payload: JOIN("<", "Factura>demo</Factura>") } }),
      "xml_material_detected",
    );
  });

  it("rechaza material publico de identidad tecnica", () => {
    expectRejectedCode(
      descriptor({ metadata: { material: JOIN("BEGIN ", "CERTIFICATE") } }),
      "certificate_material_detected",
    );
  });

  it("rechaza material de clave privada", () => {
    expectRejectedCode(
      descriptor({ metadata: { material: JOIN("PRIVATE ", "KEY") } }),
      "certificate_material_detected",
    );
  });

  it("rechaza extension pfx", () => {
    expectRejectedCode(
      descriptor({ metadata: { file: JOIN("sample", ".", "pfx") } }),
      "certificate_material_detected",
    );
  });

  it("rechaza extension p12", () => {
    expectRejectedCode(
      descriptor({ metadata: { file: JOIN("sample", ".", "p12") } }),
      "certificate_material_detected",
    );
  });

  it("rechaza referencia a endpoint tributario externo", () => {
    expectRejectedCode(
      descriptor({
        metadata: {
          endpoint: JOIN("https://sandbox.", "agencia", "tributaria", ".invalid/ws"),
        },
      }),
      "aeat_endpoint_detected",
    );
  });

  it("rechaza transportable true", () => {
    expectRejectedCode(
      descriptor({ metadata: { [JOIN("transport", "able")]: true } }),
      "transport_material_detected",
    );
  });

  it("rechaza metadata de transporte", () => {
    expectRejectedCode(
      descriptor({ metadata: { channel: JOIN("trans", "port") } }),
      "transport_material_detected",
    );
  });

  it("rechaza tabla de intentos de transporte fiscal", () => {
    expectRejectedCode(
      descriptor({
        metadata: { table: JOIN("fiscal", "_transport", "_attempts") },
      }),
      "transport_material_detected",
    );
  });

  it("rechaza service role", () => {
    expectRejectedCode(
      descriptor({ metadata: { role: JOIN("service", "_role") } }),
      "secret_material_detected",
    );
  });

  it("rechaza token y secret", () => {
    expectRejectedCode(
      descriptor({ metadata: { auth: JOIN("api", "_", "token") } }),
      "secret_material_detected",
    );
    expectRejectedCode(
      descriptor({ metadata: { auth: JOIN("shared", "_", "secret") } }),
      "secret_material_detected",
    );
  });

  it("devuelve errores tipados estables", () => {
    const result = validateSyntheticFixtureDescriptor(null);

    expect(result).toMatchObject({
      status: "rejected",
      errors: [
        {
          code: "descriptor_missing",
          riskFlag: "unsafe_metadata",
        },
      ],
    });
  });

  it("no refleja XML completo en los errores", () => {
    const rawXml = JOIN(
      "<",
      "?xml version=\"1.0\"?>",
      JOIN("<", "Factura>demo</Factura>"),
    );
    const result = validateSyntheticFixtureDescriptor(
      descriptor({ metadata: { payload: rawXml } }),
    );

    expect(result.status).toBe("rejected");
    expect(JSON.stringify(result)).not.toContain(rawXml);
  });

  it("no requiere Supabase", () => {
    const result = validateSyntheticFixtureDescriptor(descriptor());

    expect(result.status).toBe("accepted");
    expect(JSON.stringify(result)).not.toContain("@supabase");
  });
});
