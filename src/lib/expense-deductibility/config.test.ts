import { describe, expect, it } from "vitest";
import {
  resolveConsultorFiscalFlag,
  resolveConsultorFiscalModuleAccess,
} from "./config";

describe("consultor fiscal feature flag", () => {
  it("permanece desactivado por defecto en producción", () => {
    expect(
      resolveConsultorFiscalFlag({
        configured: undefined,
        nodeEnv: "production",
      }),
    ).toBe(false);
  });

  it("permite una activación explícita y controlada en producción", () => {
    expect(
      resolveConsultorFiscalFlag({
        configured: "true",
        nodeEnv: "production",
      }),
    ).toBe(true);
  });

  it("está disponible por defecto en desarrollo y pruebas", () => {
    expect(
      resolveConsultorFiscalFlag({
        configured: undefined,
        nodeEnv: "development",
      }),
    ).toBe(true);
    expect(
      resolveConsultorFiscalFlag({ configured: undefined, nodeEnv: "test" }),
    ).toBe(true);
  });

  it("respeta una desactivación explícita fuera de producción", () => {
    expect(
      resolveConsultorFiscalFlag({
        configured: "false",
        nodeEnv: "development",
      }),
    ).toBe(false);
  });

  it("mantiene separadas la activación y el derecho comercial", () => {
    expect(
      resolveConsultorFiscalModuleAccess({
        configured: "true",
        nodeEnv: "production",
        activated: false,
        entitlementSource: "standalone_purchase",
      }),
    ).toMatchObject({ usable: false, reason: "MODULE_INACTIVE" });

    expect(
      resolveConsultorFiscalModuleAccess({
        configured: "true",
        nodeEnv: "production",
        activated: true,
        entitlementSource: "none",
      }),
    ).toMatchObject({ usable: false, reason: "ENTITLEMENT_REQUIRED" });
  });

  it("conserva una concesión Beta temporal sin asignarla a un plan", () => {
    expect(
      resolveConsultorFiscalModuleAccess({
        configured: "true",
        nodeEnv: "production",
      }),
    ).toMatchObject({
      usable: true,
      entitlementSource: "beta_access",
      reason: "AVAILABLE",
    });
  });
});
