import { describe, expect, it } from "vitest";
import {
  isLocalCustomerParseSufficient,
  parseCustomerTextLocally,
} from "./local-parser";

describe("parseCustomerTextLocally", () => {
  it("extrae persona, NIF, contacto y direccion sin IA", () => {
    const result = parseCustomerTextLocally(`
      Laura Pruebas Garcia
      NIF 00000000T
      laura.pruebas@example.test
      +34 600 111 222
      C/ Mayor 12, 3B
      28013 Madrid
    `);

    expect(result?.customer).toMatchObject({
      customerType: "person",
      firstName: "Laura",
      lastName: "Pruebas Garcia",
      nif: "00000000T",
      email: "laura.pruebas@example.test",
      phone: "+34600111222",
      streetType: "calle",
      address: "Mayor 12",
      addressExtra: "3B",
      residenceType: "flat",
      city: "Madrid",
      postalCode: "28013",
    });
    expect(isLocalCustomerParseSufficient(result)).toBe(true);
  });

  it("normaliza alias locales obvios como barna o bcn", () => {
    const result = parseCustomerTextLocally(`
      Cliente: Taller Demo SL
      CIF B12345678
      Direccion: Calle Industria 8, Local 2
      CP: 08001 Barna
    `);

    expect(result?.customer).toMatchObject({
      customerType: "company",
      firstName: "Taller Demo SL",
      lastName: "",
      nif: "B12345678",
      streetType: "calle",
      address: "Industria 8",
      addressExtra: "Local 2",
      residenceType: "local",
      city: "Barcelona",
      postalCode: "08001",
    });
  });

  it("solo infiere el tipo de inmueble cuando aparece expresamente", () => {
    const result = parseCustomerTextLocally(`
      Cliente: Local Horizonte SL
      CIF B12345678
      Direccion: Calle Local 8
      CP: 28013 Madrid
    `);

    expect(result?.customer).toMatchObject({
      firstName: "Local Horizonte SL",
      address: "Local 8",
      addressExtra: null,
      residenceType: "",
    });
  });

  it("devuelve confianza baja y avisos cuando faltan datos clave", () => {
    const result = parseCustomerTextLocally("Teresa\ntelefono 600111222");

    expect(result?.customer).toMatchObject({
      customerType: "person",
      firstName: "Teresa",
      lastName: "",
      phone: "600111222",
    });
    expect(result?.confidence).toBeLessThan(0.7);
    expect(result?.warnings).toContain("No se han detectado apellidos.");
    expect(result?.warnings).toContain("No se ha detectado NIF/CIF.");
  });

  it("falla cerrado si no hay nombre o razon social clara", () => {
    expect(
      parseCustomerTextLocally("NIF 00000000T\ntelefono 600111222\n28013 Madrid"),
    ).toBeNull();
  });
});
