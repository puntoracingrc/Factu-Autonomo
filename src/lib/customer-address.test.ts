import { describe, expect, it } from "vitest";
import {
  clientAddressToFormFields,
  formatStreetLine,
  normalizeCustomerStreetFields,
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
    });
  });
});
