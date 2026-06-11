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
