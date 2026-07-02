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
    expect(result.postalCode).toBe("08013");
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
