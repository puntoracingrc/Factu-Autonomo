import { describe, expect, it } from "vitest";
import {
  enrichCustomerPostalCode,
  lookupPostalCodeFromAddress,
} from "./geocoding";

describe("customer geocoding", () => {
  it("rellena codigo postal cuando Google devuelve una coincidencia espanola", async () => {
    const postalCode = await lookupPostalCodeFromAddress(
      {
        streetType: "calle",
        address: "Doctor Carulla 19",
        city: "Barcelona",
      },
      {
        apiKey: "test-key",
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              status: "OK",
              results: [
                {
                  address_components: [
                    { long_name: "08017", short_name: "08017", types: ["postal_code"] },
                    { long_name: "Barcelona", short_name: "Barcelona", types: ["locality"] },
                    { long_name: "España", short_name: "ES", types: ["country"] },
                  ],
                },
              ],
            }),
          ),
      },
    );

    expect(postalCode).toBe("08017");
  });

  it("no rellena codigo postal si falta ciudad", async () => {
    const postalCode = await lookupPostalCodeFromAddress(
      { streetType: "calle", address: "Mayor 1" },
      {
        apiKey: "test-key",
        fetchImpl: async () => {
          throw new Error("No deberia llamar al servicio");
        },
      },
    );

    expect(postalCode).toBeNull();
  });

  it("anade aviso cuando enriquece el payload", async () => {
    const originalFetch = globalThis.fetch;
    const originalGoogleMapsKey = process.env.GOOGLE_MAPS_API_KEY;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          status: "OK",
          results: [
            {
              address_components: [
                { long_name: "08017", short_name: "08017", types: ["postal_code"] },
                { long_name: "Barcelona", short_name: "Barcelona", types: ["locality"] },
                { long_name: "España", short_name: "ES", types: ["country"] },
              ],
            },
          ],
        }),
      );
    process.env.GOOGLE_MAPS_API_KEY = "test-key";

    try {
      const payload = await enrichCustomerPostalCode({
        customer: {
          customerType: "company",
          firstName: "FERRER NEUROCIENCIAS",
          lastName: "",
          address: "Doctor Carulla 19",
          city: "Barcelona",
          streetType: "calle",
        },
        confidence: 0.9,
        warnings: [],
      });

      expect(payload.customer.postalCode).toBe("08017");
      expect(payload.warnings.join(" ")).toContain("Código postal localizado");
    } finally {
      globalThis.fetch = originalFetch;
      if (originalGoogleMapsKey) {
        process.env.GOOGLE_MAPS_API_KEY = originalGoogleMapsKey;
      } else {
        delete process.env.GOOGLE_MAPS_API_KEY;
      }
    }
  });
});
