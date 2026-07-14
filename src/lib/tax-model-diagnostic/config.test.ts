import { describe, expect, it } from "vitest";

import { resolveTaxModelDiagnosticFlag } from "./config";

describe("tax model diagnostic release flag", () => {
  it("queda cerrado por defecto en producción", () => {
    expect(
      resolveTaxModelDiagnosticFlag({
        configured: undefined,
        nodeEnv: "production",
      }),
    ).toBe(false);
  });

  it("queda abierto por defecto solo fuera de producción", () => {
    expect(
      resolveTaxModelDiagnosticFlag({
        configured: undefined,
        nodeEnv: "development",
      }),
    ).toBe(true);
  });

  it("solo acepta la activación explícita exacta", () => {
    expect(
      resolveTaxModelDiagnosticFlag({
        configured: "true",
        nodeEnv: "production",
      }),
    ).toBe(true);
    expect(
      resolveTaxModelDiagnosticFlag({
        configured: "TRUE",
        nodeEnv: "development",
      }),
    ).toBe(false);
  });
});

