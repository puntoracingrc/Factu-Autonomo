import { describe, expect, it } from "vitest";
import { normalizeCustomerTextExtractPayload } from "./schema";

describe("customer text extract schema", () => {
  it("normaliza una empresa extraida desde texto libre", () => {
    const result = normalizeCustomerTextExtractPayload({
      customer: {
        customerType: "company",
        firstName: " FERRER NEUROCIENCIAS S.L. ",
        lastName: " S.L. ",
        contactName: " Ana Ferrer ",
        nif: "B 60896362",
        streetType: "Calle",
        address: "Doctor Carulla número 19",
        addressExtra: "Bajos Primera",
        postalCode: "08017 - Barcelona",
        city: "Barcelona",
      },
      confidence: 0.9,
      warnings: [],
    });

    expect(result?.customer).toMatchObject({
      customerType: "company",
      firstName: "FERRER NEUROCIENCIAS S.L.",
      lastName: "",
      contactName: "Ana Ferrer",
      nif: "B60896362",
      streetType: "calle",
      residenceType: "ground_floor",
      addressExtra: "Bajos Primera",
      postalCode: "08017",
      city: "Barcelona",
    });
  });

  it("acepta inmueble comercial y deja vacío si no se detecta", () => {
    const nave = normalizeCustomerTextExtractPayload({
      customer: {
        customerType: "company",
        firstName: "DOSARTEC OBRAS Y SERVICIOS S.L.",
        residenceType: "nave",
        address: "Andorra 6",
      },
      confidence: 0.8,
      warnings: [],
    });
    const unknown = normalizeCustomerTextExtractPayload({
      customer: {
        customerType: "company",
        firstName: "CLIENTE SIN TIPO S.L.",
        residenceType: "",
        address: "Mayor 1",
      },
      confidence: 0.8,
      warnings: [],
    });

    expect(nave?.customer.residenceType).toBe("warehouse");
    expect(unknown?.customer.residenceType).toBe("");
  });

  it("rechaza respuestas sin nombre suficiente", () => {
    expect(
      normalizeCustomerTextExtractPayload({
        customer: { firstName: "A", lastName: "" },
      }),
    ).toBeNull();
  });

  it("acepta datos parciales sin apellidos y conserva direccion", () => {
    const result = normalizeCustomerTextExtractPayload({
      customer: {
        firstName: "Teresa",
        lastName: "",
        address: "Mandri, 26 2º-2º",
        city: "Barcelona",
        postalCode: "08022",
      },
      confidence: 0.82,
      warnings: [],
    });

    expect(result?.customer).toMatchObject({
      firstName: "Teresa",
      lastName: "",
      address: "Mandri, 26 2º-2º",
      city: "Barcelona",
      postalCode: "08022",
    });
    expect(result?.warnings).toContain(
      "No se han detectado apellidos.",
    );
  });
});
