import { describe, expect, it } from "vitest";
import {
  normalizeGooglePlacesSettings,
  parseGooglePlaceAddress,
} from "./google-places";

describe("parseGooglePlaceAddress", () => {
  it("extrae calle, numero, codigo postal y ciudad de Google Places", () => {
    const result = parseGooglePlaceAddress(
      [
        {
          long_name: "Carrer de Valencia",
          short_name: "C/ Valencia",
          types: ["route"],
        },
        {
          long_name: "542",
          short_name: "542",
          types: ["street_number"],
        },
        {
          long_name: "08013",
          short_name: "08013",
          types: ["postal_code"],
        },
        {
          long_name: "Barcelona",
          short_name: "Barcelona",
          types: ["locality"],
        },
        {
          long_name: "Barcelona",
          short_name: "B",
          types: ["administrative_area_level_2"],
        },
        {
          long_name: "España",
          short_name: "ES",
          types: ["country"],
        },
      ],
      "Carrer de Valencia, 542, Barcelona",
    );

    expect(result).toEqual({
      address: "Carrer de Valencia, 542",
      streetType: "calle",
      streetLine: "Valencia, 542",
      postalCode: "08013",
      city: "Barcelona",
      province: "Barcelona",
      country: "España",
      formattedAddress: "Carrer de Valencia, 542, Barcelona",
    });
  });

  it("usa la direccion formateada como apoyo si Google no devuelve route", () => {
    const result = parseGooglePlaceAddress(
      [
        {
          long_name: "08013",
          short_name: "08013",
          types: ["postal_code"],
        },
      ],
      "Carrer de Valencia, 542, 08013 Barcelona",
    );

    expect(result.address).toBe("Carrer de Valencia, 542");
    expect(result.streetType).toBe("calle");
    expect(result.streetLine).toBe("Valencia, 542");
    expect(result.postalCode).toBe("08013");
  });

  it("normaliza variantes catalanas de tipo de via", () => {
    const result = parseGooglePlaceAddress(
      [
        {
          long_name: "Avinguda de la Diagonal",
          short_name: "Av. Diagonal",
          types: ["route"],
        },
        {
          long_name: "100",
          short_name: "100",
          types: ["street_number"],
        },
      ],
      "Avinguda de la Diagonal, 100, Barcelona",
    );

    expect(result.address).toBe("Avinguda de la Diagonal, 100");
    expect(result.streetType).toBe("avenida");
    expect(result.streetLine).toBe("Diagonal, 100");
  });

  it("prepara Carrer de Mallorca para el selector separado", () => {
    const result = parseGooglePlaceAddress(
      [
        {
          long_name: "Carrer de Mallorca",
          short_name: "C/ Mallorca",
          types: ["route"],
        },
        {
          long_name: "548",
          short_name: "548",
          types: ["street_number"],
        },
        {
          long_name: "08013",
          short_name: "08013",
          types: ["postal_code"],
        },
        {
          long_name: "Barcelona",
          short_name: "Barcelona",
          types: ["locality"],
        },
      ],
      "Carrer de Mallorca, 548, Barcelona",
    );

    expect(result.address).toBe("Carrer de Mallorca, 548");
    expect(result.streetType).toBe("calle");
    expect(result.streetLine).toBe("Mallorca, 548");
  });

  it("normaliza variantes gallegas y vascas de tipo de via", () => {
    const rua = parseGooglePlaceAddress(
      [
        {
          long_name: "Rúa do Hórreo",
          short_name: "Rúa do Hórreo",
          types: ["route"],
        },
        {
          long_name: "12",
          short_name: "12",
          types: ["street_number"],
        },
      ],
      "Rúa do Hórreo, 12, Santiago de Compostela",
    );

    expect(rua.address).toBe("Rúa do Hórreo, 12");
    expect(rua.streetType).toBe("calle");
    expect(rua.streetLine).toBe("Hórreo, 12");

    const kalea = parseGooglePlaceAddress(
      [
        {
          long_name: "Ercilla Kalea",
          short_name: "Ercilla Kalea",
          types: ["route"],
        },
        {
          long_name: "14",
          short_name: "14",
          types: ["street_number"],
        },
      ],
      "Ercilla Kalea, 14, Bilbao",
    );

    expect(kalea.address).toBe("Ercilla Kalea, 14");
    expect(kalea.streetType).toBe("calle");
    expect(kalea.streetLine).toBe("Ercilla, 14");
  });
});

describe("normalizeGooglePlacesSettings", () => {
  it("mantiene desactivado el autorrelleno por defecto", () => {
    expect(normalizeGooglePlacesSettings()).toEqual({ enabled: false });
  });

  it("normaliza el flag de activacion", () => {
    expect(normalizeGooglePlacesSettings({ enabled: true })).toEqual({
      enabled: true,
    });
  });
});
