import { describe, expect, it } from "vitest";

import { buildSafeCompanyCopyProfile } from "./safe-company-copy";

describe("safe company copy profile", () => {
  it("copies reusable presentation settings and resets fiscal identity and accounting", () => {
    const source = {
      commercialName: "ALMAR",
      name: "Persianas Almar, S.L.",
      nif: "B12345678",
      vatId: "ESB12345678",
      address: "Calle anterior 1",
      city: "Madrid",
      postalCode: "28001",
      province: "Madrid",
      country: "Portugal",
      phone: "600000000",
      email: "hola@example.com",
      website: "https://example.com",
      iban: "ES0000000000000000000000",
      logoUrl: "data:image/png;base64,synthetic",
      advisorContact: {
        advisorName: "Gestoría",
        email: "gestoria@example.com",
        phone: "910000000",
      },
      documentPhrases: { phrases: [{ id: "p-1", text: "Gracias" }] },
      documentPaymentMethods: {
        methods: [{ id: "m-1", label: "Transferencia" }],
      },
      documentUnits: { enabledUnitIds: ["ud", "m2"], defaultUnitId: "ud" },
      documentTemplate: { accentColor: "#123456" },
      productFamilyMarkups: {
        rules: [{ id: "r-1", family: "Persianas", percent: 25 }],
      },
      googlePlaces: { enabled: true },
      appPreferences: {
        theme: "dark",
        density: "compact",
        startPage: "clientes",
        reduceMotion: true,
        documentEmailMethod: "mailto",
        documentWhatsAppMethod: "web",
      },
      quoteValidityDays: 45,
      iva: { rates: [7, 19], defaultRate: 19 },
      vatExempt: true,
      fiscalProfile: { legalForm: "company" },
      taxModelDiagnostic: { schemaVersion: 1 },
      fiscalAdvisoryModelPreferences: { schemaVersion: 1 },
      irpfPercent: 7,
      irpfEstimatePolicy: {
        schemaVersion: 1,
        baselinePercent: 15,
        changes: [
          { effectiveAt: "2027-01-01T09:00:00.000Z", percent: 20 },
        ],
      },
      numbering: {
        year: 2026,
        lastSequence: {
          factura: 88,
          factura_rectificativa: 12,
          presupuesto: 42,
          recibo: 31,
        },
      },
      verifactu: { enabled: true, environment: "production" },
    };

    const copied = buildSafeCompanyCopyProfile(source);

    expect(copied).toMatchObject({
      commercialName: "ALMAR",
      phone: "600000000",
      email: "hola@example.com",
      website: "https://example.com",
      logoUrl: "data:image/png;base64,synthetic",
      documentUnits: { enabledUnitIds: ["ud", "m2"] },
      googlePlaces: { enabled: true },
      quoteValidityDays: 45,
    });
    expect(copied).toMatchObject({
      name: "",
      nif: "",
      vatId: "",
      address: "",
      city: "",
      postalCode: "",
      province: "",
      country: "España",
      iva: { rates: [0, 4, 10, 21], defaultRate: 21 },
      vatExempt: false,
      irpfPercent: 20,
      verifactu: { enabled: false, environment: "test" },
    });
    expect(copied?.numbering.lastSequence).toEqual({
      factura: 0,
      factura_rectificativa: 0,
      presupuesto: 0,
      recibo: 0,
    });
    expect(copied).not.toHaveProperty("fiscalProfile");
    expect(copied).not.toHaveProperty("iban");
    expect(copied).not.toHaveProperty("taxModelDiagnostic");
    expect(copied).not.toHaveProperty("fiscalAdvisoryModelPreferences");
    expect(copied).not.toHaveProperty("irpfEstimatePolicy");
  });

  it("returns detached objects and rejects non-object input", () => {
    const source = {
      documentUnits: { enabledUnitIds: ["ud"], defaultUnitId: "ud" },
    };
    const copied = buildSafeCompanyCopyProfile(source);
    copied?.documentUnits?.enabledUnitIds.push("m");

    expect(source.documentUnits.enabledUnitIds).toEqual(["ud"]);
    expect(buildSafeCompanyCopyProfile(null)).toBeNull();
  });
});
