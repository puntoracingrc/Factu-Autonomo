import { describe, expect, it } from "vitest";
import {
  billingProfileFromStripeParts,
  formatBillingProfileSummary,
} from "./billing-profile";

describe("billing profile", () => {
  it("normaliza datos de Stripe", () => {
    const profile = billingProfileFromStripeParts({
      name: "  Alberto Ibáñez ",
      email: "cliente@ejemplo.com",
      taxId: " 12345678z ",
      addressLine1: "Calle Mayor 1",
      addressLine2: "2º B",
      city: "Madrid",
      postalCode: "28001",
      country: "es",
    });

    expect(profile.name).toBe("Alberto Ibáñez");
    expect(profile.taxId).toBe("12345678Z");
    expect(profile.addressLine1).toBe("Calle Mayor 1, 2º B");
    expect(profile.country).toBe("ES");
  });

  it("resume el perfil para la UI", () => {
    const summary = formatBillingProfileSummary(
      billingProfileFromStripeParts({
        name: "Mi negocio",
        taxId: "B12345678",
        addressLine1: "Av. Diagonal 1",
        postalCode: "08001",
        city: "Barcelona",
        country: "ES",
      }),
    );

    expect(summary).toContain("Mi negocio");
    expect(summary).toContain("B12345678");
    expect(summary).toContain("Barcelona");
  });
});
