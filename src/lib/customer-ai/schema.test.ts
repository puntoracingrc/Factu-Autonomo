import { describe, expect, it } from "vitest";
import { normalizeCustomerTextExtractPayload } from "./schema";

describe("customer text extract schema", () => {
  it("normaliza una empresa extraida desde texto libre", () => {
    const result = normalizeCustomerTextExtractPayload({
      customer: {
        firstName: " FERRER NEUROCIENCIAS ",
        lastName: " S.L. ",
        nif: "B 60896362",
        streetType: "Calle",
        address: "Doctor Carulla número 19 Bajos Primera",
        postalCode: "08017 - Barcelona",
        city: "Barcelona",
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.customer).toMatchObject({
      firstName: "FERRER NEUROCIENCIAS",
      lastName: "S.L.",
      nif: "B60896362",
      streetType: "calle",
      postalCode: "08017",
      city: "Barcelona",
    });
  });

  it("rechaza respuestas sin nombre suficiente", () => {
    expect(
      normalizeCustomerTextExtractPayload({
        customer: { firstName: "A", lastName: "" },
      }),
    ).toBeNull();
  });
});
