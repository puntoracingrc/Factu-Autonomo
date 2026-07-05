import { describe, expect, it } from "vitest";
import { getRentabilidadRealProductById } from "./catalog";
import {
  canActivateRentabilidadRealProduct,
  getProPlusIncludedRentabilidadRealProductIds,
  getRentabilidadRealAccessStatusForProduct,
  getRentabilidadRealRuntimeEnvironment,
  resolveRentabilidadRealBillingAccess,
  shouldUseRentabilidadRealProPlusFallback,
} from "./access-policy";
import type { RentabilidadRealUserAccessContext } from "./types";

const proPlusContext = {
  planKey: "pro_plus",
  isProPlus: true,
  activeProductIds: [],
  activeCapabilityKeys: [],
} satisfies RentabilidadRealUserAccessContext;

const proContext = {
  planKey: "pro",
  isProPlus: false,
  activeProductIds: [],
  activeCapabilityKeys: [],
} satisfies RentabilidadRealUserAccessContext;

describe("rentabilidad real access policy", () => {
  it("incluye en Pro+ los productos de autónomos persona física hasta nivel 4", () => {
    expect(getProPlusIncludedRentabilidadRealProductIds()).toEqual([
      "RR_BASE",
      "RR_TRADES_JOBS",
      "RR_HOURS_PROJECTS",
      "RR_FIXED_COSTS_PRO",
      "RR_ASSETS_LIGHT",
      "RR_PRICE_SIMULATOR",
      "RR_ADVISOR_REVIEW",
    ]);
  });

  it("no incluye productos coming soon en Pro+", () => {
    expect(getProPlusIncludedRentabilidadRealProductIds()).not.toContain(
      "RR_STOCK_COMMERCE",
    );
    expect(getProPlusIncludedRentabilidadRealProductIds()).not.toContain(
      "RR_MODULES_SPECIAL_REGIMES",
    );
    expect(getProPlusIncludedRentabilidadRealProductIds()).not.toContain(
      "RR_SIMPLE_SL",
    );
    expect(getProPlusIncludedRentabilidadRealProductIds()).not.toContain(
      "RR_SL_EMPLOYEES_PARTNERS",
    );
    expect(getProPlusIncludedRentabilidadRealProductIds()).not.toContain(
      "RR_ADVANCED_COMPANY",
    );
  });

  it("permite activar RR_ASSETS_LIGHT a un usuario Pro+", () => {
    expect(
      canActivateRentabilidadRealProduct("RR_ASSETS_LIGHT", proPlusContext),
    ).toMatchObject({
      accessStatus: "included_in_pro_plus",
      canActivate: true,
    });
  });

  it("bloquea RR_ASSETS_LIGHT para un usuario no Pro+ con requires_pro_plus", () => {
    expect(canActivateRentabilidadRealProduct("RR_ASSETS_LIGHT", proContext))
      .toMatchObject({
        accessStatus: "requires_pro_plus",
        canActivate: false,
      });
  });

  it("incluye RR_ADVISOR_REVIEW en Pro+ y permite activarlo", () => {
    const product = getRentabilidadRealProductById("RR_ADVISOR_REVIEW");

    expect(product).toBeDefined();
    expect(
      getRentabilidadRealAccessStatusForProduct(product!, proPlusContext),
    ).toBe("included_in_pro_plus");
    expect(
      canActivateRentabilidadRealProduct("RR_ADVISOR_REVIEW", proPlusContext),
    ).toMatchObject({
      accessStatus: "included_in_pro_plus",
      canActivate: true,
    });
  });

  it("bloquea RR_ADVISOR_REVIEW para un usuario no Pro+ con requires_pro_plus", () => {
    expect(canActivateRentabilidadRealProduct("RR_ADVISOR_REVIEW", proContext))
      .toMatchObject({
        accessStatus: "requires_pro_plus",
        canActivate: false,
      });
  });

  it("marca coming soon como no activable", () => {
    const product = getRentabilidadRealProductById("RR_STOCK_COMMERCE");

    expect(product).toBeDefined();
    expect(
      getRentabilidadRealAccessStatusForProduct(product!, proPlusContext),
    ).toBe("coming_soon");
    expect(
      canActivateRentabilidadRealProduct("RR_STOCK_COMMERCE", proPlusContext),
    ).toMatchObject({
      accessStatus: "coming_soon",
      canActivate: false,
    });
  });

  it("no abre el fallback Pro+ en producción si billing está desactivado", () => {
    expect(
      resolveRentabilidadRealBillingAccess({
        billingEnabled: false,
        planKey: "pro",
        env: { NODE_ENV: "production", VERCEL_ENV: "production" },
      }),
    ).toMatchObject({
      planKey: "pro",
      isProPlus: false,
      localProPlusFallback: false,
      runtimeEnvironment: "production",
    });
  });

  it("permite fallback Pro+ en desarrollo aunque exista VERCEL_ENV local", () => {
    expect(
      getRentabilidadRealRuntimeEnvironment({
        NODE_ENV: "development",
        VERCEL_ENV: "production",
      }),
    ).toBe("development");

    expect(
      resolveRentabilidadRealBillingAccess({
        billingEnabled: false,
        planKey: "pro",
        env: { NODE_ENV: "development", VERCEL_ENV: "production" },
      }),
    ).toMatchObject({
      planKey: "pro_plus",
      isProPlus: true,
      localProPlusFallback: true,
      runtimeEnvironment: "development",
    });
  });

  it("permite fallback Pro+ en preview con billing desactivado", () => {
    expect(
      shouldUseRentabilidadRealProPlusFallback({
        billingEnabled: false,
        env: { NODE_ENV: "production", VERCEL_ENV: "preview" },
      }),
    ).toBe(true);

    expect(
      resolveRentabilidadRealBillingAccess({
        billingEnabled: false,
        planKey: "free",
        env: { NODE_ENV: "production", VERCEL_ENV: "preview" },
      }),
    ).toMatchObject({
      planKey: "pro_plus",
      isProPlus: true,
      localProPlusFallback: true,
      runtimeEnvironment: "preview",
    });
  });

  it("detecta preview desde NEXT_PUBLIC_VERCEL_ENV en el cliente", () => {
    expect(
      resolveRentabilidadRealBillingAccess({
        billingEnabled: false,
        planKey: "pro",
        env: {
          NODE_ENV: "production",
          NEXT_PUBLIC_VERCEL_ENV: "preview",
          VERCEL_ENV: "production",
        },
      }),
    ).toMatchObject({
      planKey: "pro_plus",
      isProPlus: true,
      localProPlusFallback: true,
      runtimeEnvironment: "preview",
    });
  });

  it("detecta preview desde un deployment vercel.app no productivo", () => {
    expect(
      resolveRentabilidadRealBillingAccess({
        billingEnabled: false,
        planKey: "pro",
        env: { NODE_ENV: "production" },
        hostname:
          "factu-autonomo-eyur6xsr4-persianas-almar-web-s-projects.vercel.app",
      }),
    ).toMatchObject({
      planKey: "pro_plus",
      isProPlus: true,
      localProPlusFallback: true,
      runtimeEnvironment: "preview",
    });
  });

  it("no abre fallback Pro+ en dominios productivos conocidos", () => {
    expect(
      resolveRentabilidadRealBillingAccess({
        billingEnabled: false,
        planKey: "pro",
        env: { NODE_ENV: "production" },
        hostname: "facturacion-autonomos.app",
      }),
    ).toMatchObject({
      planKey: "pro",
      isProPlus: false,
      localProPlusFallback: false,
      runtimeEnvironment: "production",
    });

    expect(
      resolveRentabilidadRealBillingAccess({
        billingEnabled: false,
        planKey: "pro",
        env: { NODE_ENV: "production" },
        hostname: "factu-autonomo.vercel.app",
      }),
    ).toMatchObject({
      planKey: "pro",
      isProPlus: false,
      localProPlusFallback: false,
      runtimeEnvironment: "production",
    });
  });

  it("mantiene Pro+ real cuando billing está activo", () => {
    expect(
      resolveRentabilidadRealBillingAccess({
        billingEnabled: true,
        planKey: "pro_plus",
        env: { NODE_ENV: "production", VERCEL_ENV: "production" },
      }),
    ).toMatchObject({
      planKey: "pro_plus",
      isProPlus: true,
      localProPlusFallback: false,
      runtimeEnvironment: "production",
    });
  });
});
