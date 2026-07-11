import { describe, expect, it } from "vitest";
import {
  clientAddressToFormFields,
  formatAddressBlock,
  formatAddressExtra,
  normalizeResidenceType,
  formatStreetLine,
  normalizeCustomerStreetFields,
  RESIDENCE_TYPES,
  splitLegacyStreetAddress,
} from "./customer-address";
import type { Customer } from "./types";

describe("splitLegacyStreetAddress", () => {
  it("separa Calle y abreviaturas", () => {
    expect(splitLegacyStreetAddress("Calle Mayor 1")).toEqual({
      streetType: "calle",
      streetLine: "Mayor 1",
    });
    expect(splitLegacyStreetAddress("C/ Valencia 546")).toEqual({
      streetType: "calle",
      streetLine: "Valencia 546",
    });
    expect(splitLegacyStreetAddress("Avda. Diagonal 100")).toEqual({
      streetType: "avenida",
      streetLine: "Diagonal 100",
    });
    expect(splitLegacyStreetAddress("Carrer de València, 546")).toEqual({
      streetType: "calle",
      streetLine: "València, 546",
    });
    expect(splitLegacyStreetAddress("Avinguda de la Diagonal, 100")).toEqual({
      streetType: "avenida",
      streetLine: "Diagonal, 100",
    });
    expect(splitLegacyStreetAddress("Rúa do Hórreo 12")).toEqual({
      streetType: "calle",
      streetLine: "Hórreo 12",
    });
    expect(splitLegacyStreetAddress("Ercilla Kalea 14")).toEqual({
      streetType: "calle",
      streetLine: "Ercilla 14",
    });
    expect(splitLegacyStreetAddress("Nafarroa Etorbidea 2")).toEqual({
      streetType: "avenida",
      streetLine: "Nafarroa 2",
    });
    expect(splitLegacyStreetAddress("Camiño da Igrexa 3")).toEqual({
      streetType: "camino",
      streetLine: "Igrexa 3",
    });
    expect(splitLegacyStreetAddress("Passeig de Gràcia, 22")).toEqual({
      streetType: "paseo",
      streetLine: "Gràcia, 22",
    });
    expect(splitLegacyStreetAddress("Praza de Galicia 1")).toEqual({
      streetType: "plaza",
      streetLine: "Galicia 1",
    });
    expect(splitLegacyStreetAddress("Platja de la Barceloneta 1")).toEqual({
      streetType: "playa",
      streetLine: "Barceloneta 1",
    });
    expect(splitLegacyStreetAddress("Karrika Nagusia 3")).toEqual({
      streetType: "calle",
      streetLine: "Nagusia 3",
    });
    expect(splitLegacyStreetAddress("Gernikako Arbola Hiribidea 8")).toEqual({
      streetType: "avenida",
      streetLine: "Gernikako Arbola 8",
    });
    expect(splitLegacyStreetAddress("GI-2132 Errepidea 4")).toEqual({
      streetType: "carretera",
      streetLine: "GI-2132 4",
    });
    expect(splitLegacyStreetAddress("Enparantza Zaharra 1")).toEqual({
      streetType: "plaza",
      streetLine: "Zaharra 1",
    });
  });

  it("deja sin tipo si no reconoce prefijo", () => {
    expect(splitLegacyStreetAddress("VALENCIA 546 7/1")).toEqual({
      streetLine: "VALENCIA 546 7/1",
    });
  });
});

describe("formatStreetLine", () => {
  it("añade abreviatura solo cuando hay tipo", () => {
    expect(formatStreetLine("calle", "Mayor 1")).toBe("C/ Mayor 1");
    expect(formatStreetLine("", "Mayor 1")).toBe("Mayor 1");
  });
});

describe("formatAddressBlock", () => {
  it("normaliza tipos habituales de inmueble", () => {
    expect(RESIDENCE_TYPES.map((type) => type.id)).toEqual(
      expect.arrayContaining(["", "flat", "house", "local", "shop", "warehouse"]),
    );
    expect(normalizeResidenceType("nave")).toBe("warehouse");
    expect(normalizeResidenceType("tienda")).toBe("shop");
    expect(normalizeResidenceType("local comercial")).toBe("local");
    expect(normalizeResidenceType("")).toBe("");
  });

  it("incluye piso y puerta en pisos", () => {
    expect(
      formatAddressBlock({
        streetType: "calle",
        address: "Nena Casas 52",
        residenceType: "flat",
        addressExtra: "2º 2ª",
        postalCode: "08017",
        city: "Barcelona",
      }),
    ).toBe("C/ Nena Casas 52, 2º 2ª, 08017 Barcelona");
  });

  it("omite piso y puerta cuando es casa", () => {
    expect(
      formatAddressBlock({
        streetType: "calle",
        address: "Nena Casas 52",
        residenceType: "house",
        addressExtra: "2º 2ª",
        postalCode: "08017",
        city: "Barcelona",
      }),
    ).toBe("C/ Nena Casas 52, 08017 Barcelona");
  });

  it("permite detalle interior en locales y oficinas", () => {
    expect(formatAddressExtra("local", "Local 3")).toBe("Local 3");
    expect(formatAddressExtra("office", "Despacho B")).toBe("Despacho B");
    expect(formatAddressExtra("chalet", "Puerta 1")).toBe("");
  });
});

describe("normalizeCustomerStreetFields", () => {
  it("migra direcciones legacy al cargar", () => {
    const customer: Customer = {
      id: "1",
      firstName: "Ana",
      lastName: "García",
      name: "Ana García",
      address: "Calle Mayor 1",
      createdAt: "",
      updatedAt: "",
    };

    expect(normalizeCustomerStreetFields(customer)).toEqual({
      ...customer,
      streetType: "calle",
      address: "Mayor 1",
    });
  });
});

describe("clientAddressToFormFields", () => {
  it("extrae tipo y vía de clientes con streetType", () => {
    expect(
      clientAddressToFormFields({
        streetType: "calle",
        address: "C/ Mayor 1, 28001 Madrid",
      }),
    ).toEqual({
      streetType: "calle",
      streetLine: "Mayor 1",
      addressExtra: "",
      residenceType: "",
      city: "Madrid",
      postalCode: "28001",
    });
  });

  it("recupera el piso congelado en un documento", () => {
    expect(
      clientAddressToFormFields({
        streetType: "calle",
        address: "C/ Mayor 1, 2º 2ª, 28001 Madrid",
        residenceType: "flat",
        addressExtra: "2º 2ª",
      }),
    ).toEqual({
      streetType: "calle",
      streetLine: "Mayor 1",
      addressExtra: "2º 2ª",
      residenceType: "flat",
      city: "Madrid",
      postalCode: "28001",
    });
  });

  it("prioriza CP y ciudad estructurados y elimina el bloque legacy de la vía", () => {
    expect(
      clientAddressToFormFields({
        streetType: "calle",
        address: "C/ Mayor 1, 2º 2ª, 99999 Ciudad antigua",
        residenceType: "flat",
        addressExtra: "2º 2ª",
        postalCode: "28001",
        city: "Madrid",
      }),
    ).toEqual({
      streetType: "calle",
      streetLine: "Mayor 1",
      addressExtra: "2º 2ª",
      residenceType: "flat",
      city: "Madrid",
      postalCode: "28001",
    });
  });

  it("recupera ciudades legacy de varias palabras sin duplicarlas al reconstruir", () => {
    const fields = clientAddressToFormFields({
      address: "Calle Mayor 1, 35001 Las Palmas de Gran Canaria",
    });

    expect(fields).toEqual({
      streetType: "calle",
      streetLine: "Mayor 1",
      addressExtra: "",
      residenceType: "",
      city: "Las Palmas de Gran Canaria",
      postalCode: "35001",
    });
    expect(
      formatAddressBlock({
        streetType: fields.streetType,
        address: fields.streetLine,
        addressExtra: fields.addressExtra,
        residenceType: fields.residenceType,
        city: fields.city,
        postalCode: fields.postalCode,
      }),
    ).toBe("C/ Mayor 1, 35001 Las Palmas de Gran Canaria");
  });

  it("no interpreta una ciudad estructurada sin CP como complemento de dirección", () => {
    const fields = clientAddressToFormFields({
      streetType: "calle",
      address: "C/ Mayor 1, Madrid",
      city: "Madrid",
    });

    expect(fields).toEqual({
      streetType: "calle",
      streetLine: "Mayor 1",
      addressExtra: "",
      residenceType: "",
      city: "Madrid",
      postalCode: "",
    });
    expect(
      formatAddressBlock({
        streetType: fields.streetType,
        address: fields.streetLine,
        addressExtra: fields.addressExtra,
        residenceType: fields.residenceType,
        city: fields.city,
        postalCode: fields.postalCode,
      }),
    ).toBe("C/ Mayor 1, Madrid");
  });

  it("conserva complemento y ciudad compuesta sin CP durante el roundtrip", () => {
    const originalAddress =
      "C/ Mayor 1, 2º 2ª, Las Palmas de Gran Canaria";
    const fields = clientAddressToFormFields({
      address: originalAddress,
      residenceType: "flat",
      city: "Las Palmas de Gran Canaria",
    });

    expect(fields).toEqual({
      streetType: "calle",
      streetLine: "Mayor 1",
      addressExtra: "2º 2ª",
      residenceType: "flat",
      city: "Las Palmas de Gran Canaria",
      postalCode: "",
    });
    expect(
      formatAddressBlock({
        streetType: fields.streetType,
        address: fields.streetLine,
        addressExtra: fields.addressExtra,
        residenceType: fields.residenceType,
        city: fields.city,
        postalCode: fields.postalCode,
      }),
    ).toBe(originalAddress);
  });
});
