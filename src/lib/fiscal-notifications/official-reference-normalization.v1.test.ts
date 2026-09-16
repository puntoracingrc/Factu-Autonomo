import { describe, expect, it } from "vitest";
import {
  normalizeOfficialReference,
  normalizeOfficialReferenceValue,
} from "./official-reference-normalization.v1";

describe("official reference normalization v1", () => {
  it.each([
    "Nº LIQUIDACIÓN",
    "N.º LIQUIDACIÓN",
    "NÚMERO LIQUIDACIÓN",
    "NUMERO DE LIQUIDACION",
    "CLAVE DE LIQUIDACIÓN",
  ])("normalizes official liquidation label variant %s", (label) => {
    expect(normalizeOfficialReference(label, "A 999-990/001.000:1001")).toEqual(
      {
        canonicalType: "LIQUIDATION_KEY",
        normalizedValue: "A9999900010001001",
        originalLabel: label,
      },
    );
  });

  it("rejects private identifiers and banking references as debt keys", () => {
    expect(normalizeOfficialReference("Nº LIQUIDACIÓN", "12345678Z")).toBeNull();
    expect(
      normalizeOfficialReference(
        "Clave de liquidación",
        "ES0012345678901234567890",
      ),
    ).toBeNull();
    expect(
      normalizeOfficialReference(
        "Clave de liquidación",
        "123456789012345678901234567890",
      ),
    ).toBeNull();
  });

  it("does not duplicate payment-form references as debt identities", () => {
    expect(
      normalizeOfficialReference("Referencia de carta pago", "A9999900010001001"),
    ).toEqual(
      expect.objectContaining({
        canonicalType: "PAYMENT_FORM_REFERENCE",
        normalizedValue: "A9999900010001001",
      }),
    );
    expect(
      normalizeOfficialReferenceValue("LIQUIDATION_KEY", "A9999900010001001"),
    ).toBe("A9999900010001001");
  });
});
