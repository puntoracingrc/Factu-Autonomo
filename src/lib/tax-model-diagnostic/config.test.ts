import { describe, expect, it } from "vitest";

import { resolveTaxModelDiagnosticFlag } from "./config";

describe("tax model diagnostic release flag", () => {
  it("queda cerrado por defecto en producción", () => {
    expect(
      resolveTaxModelDiagnosticFlag({
        configured: undefined,
        nodeEnv: "production",
        vercelEnv: "production",
      }),
    ).toBe(false);
  });

  it("queda abierto en preview aunque Vercel compile con NODE_ENV de producción", () => {
    expect(
      resolveTaxModelDiagnosticFlag({
        configured: undefined,
        nodeEnv: "production",
        vercelEnv: "preview",
      }),
    ).toBe(true);
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
        vercelEnv: "production",
      }),
    ).toBe(true);
    expect(
      resolveTaxModelDiagnosticFlag({
        configured: "TRUE",
        nodeEnv: "development",
        vercelEnv: "preview",
      }),
    ).toBe(false);
  });

  it("respeta una desactivación explícita también en preview", () => {
    expect(
      resolveTaxModelDiagnosticFlag({
        configured: "false",
        nodeEnv: "production",
        vercelEnv: "preview",
      }),
    ).toBe(false);
  });
});
