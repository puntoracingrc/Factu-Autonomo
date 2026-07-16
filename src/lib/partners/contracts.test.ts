import { describe, expect, it } from "vitest";
import {
  calculatePartnerCommissionCents,
  isPayingPartnerSubscription,
  isValidIban,
  maskPartnerIban,
  normalizePartnerEmail,
  validatePartnerPayoutInput,
} from "./contracts";

describe("partner contracts", () => {
  it("normaliza emails y rechaza valores ambiguos", () => {
    expect(normalizePartnerEmail(" GESTOR@Example.COM ")).toBe(
      "gestor@example.com",
    );
    expect(normalizePartnerEmail("sin-arroba")).toBeNull();
    expect(normalizePartnerEmail(null)).toBeNull();
  });

  it("valida IBAN con mod 97 y solo devuelve una versión enmascarada", () => {
    expect(isValidIban("ES91 2100 0418 4502 0005 1332")).toBe(true);
    expect(isValidIban("ES91 2100 0418 4502 0005 1333")).toBe(false);
    expect(maskPartnerIban("ES91 2100 0418 4502 0005 1332")).toBe(
      "ES91 •••• •••• •••• 1332",
    );
  });

  it("exige titular e IBAN juntos", () => {
    expect(validatePartnerPayoutInput({ holderName: "", iban: "" })).toMatchObject({
      ok: false,
      field: "holderName",
    });
    expect(
      validatePartnerPayoutInput({
        holderName: "Gestoría Ejemplo",
        iban: "ES91 2100 0418 4502 0005 1332",
      }),
    ).toEqual({
      ok: true,
      holderName: "Gestoría Ejemplo",
      iban: "ES9121000418450200051332",
    });
  });

  it("calcula el 10% en céntimos sin flotantes", () => {
    expect(calculatePartnerCommissionCents(599)).toBe(59);
    expect(calculatePartnerCommissionCents(1499)).toBe(149);
    expect(() => calculatePartnerCommissionCents(1.5)).toThrow();
  });

  it("solo considera de pago planes activos y no vencidos", () => {
    const now = new Date("2026-07-17T00:00:00.000Z");
    expect(
      isPayingPartnerSubscription(
        { plan: "pro", status: "active", currentPeriodEnd: "2026-08-01T00:00:00Z" },
        now,
      ),
    ).toBe(true);
    expect(
      isPayingPartnerSubscription(
        { plan: "pro_plus", status: "past_due" },
        now,
      ),
    ).toBe(false);
    expect(
      isPayingPartnerSubscription(
        { plan: "pro", status: "trialing" },
        now,
      ),
    ).toBe(false);
    expect(
      isPayingPartnerSubscription(
        { plan: "pro", status: "active", currentPeriodEnd: "2026-07-01T00:00:00Z" },
        now,
      ),
    ).toBe(false);
  });
});
