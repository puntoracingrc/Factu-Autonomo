import { describe, expect, it } from "vitest";
import {
  resolvePricingPromotion,
  type AdminAccessState,
} from "./pricing-promotion";
import type { PlanId } from "./plans";

function promotion(
  plan: PlanId,
  options: {
    hasUser?: boolean;
    billingLoading?: boolean;
    adminAccess?: AdminAccessState;
  } = {},
) {
  return resolvePricingPromotion({
    plan,
    hasUser: options.hasUser ?? true,
    billingLoading: options.billingLoading ?? false,
    adminAccess: options.adminAccess ?? "member",
  });
}

describe("promoción contextual de precios", () => {
  it("mantiene la invitación de alta para visitantes y cuentas Gratis", () => {
    expect(promotion("free", { hasUser: false })).toBe("free");
    expect(promotion("pro", { hasUser: false })).toBe("free");
    expect(promotion("free")).toBe("free");
  });

  it("ofrece únicamente Pro+ a miembros Pro", () => {
    expect(promotion("pro")).toBe("pro_plus");
  });

  it.each<PlanId>(["trial", "pro_plus"])(
    "no muestra promoción para el plan %s",
    (plan) => {
      expect(promotion(plan)).toBeNull();
    },
  );

  it.each<AdminAccessState>(["checking", "admin", "unavailable"])(
    "oculta la promoción si el acceso administrativo está %s",
    (adminAccess) => {
      expect(promotion("pro", { adminAccess })).toBeNull();
      expect(promotion("free", { adminAccess })).toBeNull();
    },
  );

  it("no muestra promociones mientras se resuelve la suscripción", () => {
    expect(promotion("free", { billingLoading: true })).toBeNull();
    expect(promotion("pro", { billingLoading: true })).toBeNull();
  });
});
