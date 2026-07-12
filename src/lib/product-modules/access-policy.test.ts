import { describe, expect, it } from "vitest";
import { resolveProductModuleAccess } from "./access-policy";

describe("product module access policy", () => {
  it("separa el apagado global de cualquier derecho o activación", () => {
    expect(
      resolveProductModuleAccess({
        releaseEnabled: false,
        activated: true,
        entitlementSource: "standalone_purchase",
      }),
    ).toMatchObject({
      discoverable: false,
      usable: false,
      reason: "RELEASE_DISABLED",
    });
  });

  it("no confunde que el módulo esté activo con tener derecho comercial", () => {
    expect(
      resolveProductModuleAccess({
        releaseEnabled: true,
        activated: true,
        entitlementSource: "none",
      }),
    ).toMatchObject({
      discoverable: true,
      usable: false,
      reason: "ENTITLEMENT_REQUIRED",
    });
  });

  it("permite desactivar un módulo aunque exista derecho de acceso", () => {
    expect(
      resolveProductModuleAccess({
        releaseEnabled: true,
        activated: false,
        entitlementSource: "plan_inclusion",
      }),
    ).toMatchObject({
      discoverable: true,
      usable: false,
      reason: "MODULE_INACTIVE",
    });
  });

  it.each(["beta_access", "standalone_purchase", "plan_inclusion"] as const)(
    "admite la fuente de derecho %s",
    (entitlementSource) => {
      expect(
        resolveProductModuleAccess({
          releaseEnabled: true,
          activated: true,
          entitlementSource,
        }),
      ).toEqual({
        discoverable: true,
        usable: true,
        reason: "AVAILABLE",
        entitlementSource,
      });
    },
  );
});
