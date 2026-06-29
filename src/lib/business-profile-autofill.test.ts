import { describe, expect, it } from "vitest";
import {
  applyBusinessProfileAutofillSuggestion,
  buildBusinessProfileAutofillSuggestion,
  completeBusinessProfileFromIssuerSnapshots,
  completeBusinessProfileIvaFromDocuments,
  fillMissingBusinessProfileFields,
} from "./business-profile-autofill";
import { DEFAULT_PROFILE, type Document } from "./types";

const baseDocument: Document = {
  id: "doc-1",
  type: "factura",
  number: "F-1",
  date: "2026-06-01",
  client: { name: "Cliente" },
  items: [
    {
      id: "line-1",
      description: "Trabajo",
      quantity: 1,
      unitPrice: 100,
      ivaPercent: 10,
    },
  ],
  status: "pagado",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("business profile autofill", () => {
  it("rellena solo campos vacios del perfil", () => {
    const profile = fillMissingBusinessProfileFields(
      { ...DEFAULT_PROFILE, name: "Nombre manual" },
      {
        name: "Nombre importado",
        nif: "b12345678",
        address: "Calle Mayor 1",
      },
    );

    expect(profile.name).toBe("Nombre manual");
    expect(profile.nif).toBe("B12345678");
    expect(profile.address).toBe("Calle Mayor 1");
  });

  it("recupera datos de emisor congelados en documentos importados", () => {
    const profile = completeBusinessProfileFromIssuerSnapshots(DEFAULT_PROFILE, [
      {
        ...baseDocument,
        issuer: {
          name: "Persianas Almar",
          nif: "B12345678",
          address: "Calle Taller 1",
          city: "Barcelona",
          postalCode: "08001",
          email: "info@example.test",
          capturedAt: "2026-06-01T00:00:00.000Z",
        },
      },
    ]);

    expect(profile).toMatchObject({
      name: "Persianas Almar",
      nif: "B12345678",
      address: "Calle Taller 1",
      city: "Barcelona",
      postalCode: "08001",
      email: "info@example.test",
    });
  });

  it("añade tipos de IVA importados y puede elegir el mas usado", () => {
    const profile = completeBusinessProfileIvaFromDocuments(
      DEFAULT_PROFILE,
      [
        baseDocument,
        {
          ...baseDocument,
          id: "doc-2",
          items: [{ ...baseDocument.items[0], id: "line-2", ivaPercent: 10 }],
        },
        {
          ...baseDocument,
          id: "doc-3",
          items: [{ ...baseDocument.items[0], id: "line-3", ivaPercent: 5 }],
        },
      ],
      { preferMostUsedDefault: true },
    );

    expect(profile.iva.rates).toContain(5);
    expect(profile.iva.defaultRate).toBe(10);
  });

  it("crea una sugerencia aplicable sin pisar campos ya rellenos", () => {
    const current = { ...DEFAULT_PROFILE, name: "Nombre manual" };
    const detected = completeBusinessProfileIvaFromDocuments(
      {
        ...DEFAULT_PROFILE,
        name: "Nombre detectado",
        nif: "B12345678",
        address: "Calle Detectada 1",
      },
      [{ ...baseDocument, items: [{ ...baseDocument.items[0], ivaPercent: 5 }] }],
    );
    const suggestion = buildBusinessProfileAutofillSuggestion(current, detected);
    const applied = applyBusinessProfileAutofillSuggestion(current, suggestion);

    expect(suggestion.emptyFieldCount).toBe(2);
    expect(suggestion.differentCurrentValueCount).toBe(1);
    expect(applied.name).toBe("Nombre manual");
    expect(applied.nif).toBe("B12345678");
    expect(applied.address).toBe("Calle Detectada 1");
    expect(applied.iva.rates).toContain(5);
  });
});
