import { describe, expect, it } from "vitest";
import {
  businessProfileMissingDocumentLabels,
  businessProfileNotices,
  businessProfileQrNotice,
  isBasicBusinessEmail,
  isBasicBusinessPhone,
  isBusinessProfileReadyForIssuedInvoices,
  livePdfIssuerWarning,
  normalizeBusinessProfileForSave,
} from "./business-profile";
import { DEFAULT_PROFILE } from "./types";

describe("business profile document data", () => {
  it("normaliza datos del emisor al guardar", () => {
    const normalized = normalizeBusinessProfileForSave({
      ...DEFAULT_PROFILE,
      commercialName: "  Marca visible  ",
      name: "  Mi Negocio  ",
      nif: " b12345678 ",
      vatId: " esb12345678 ",
      address: "  Calle Mayor 1 ",
      postalCode: " 28001 ",
      city: " Madrid ",
      province: " Madrid ",
      country: " España ",
      phone: " 600 000 000 ",
      email: " HOLA@NEGOCIO.ES ",
      website: " negocio.es ",
      iban: " ",
      quoteValidityDays: 999,
    });

    expect(normalized).toMatchObject({
      commercialName: "Marca visible",
      name: "Mi Negocio",
      nif: "B12345678",
      vatId: "ESB12345678",
      address: "Calle Mayor 1",
      postalCode: "28001",
      city: "Madrid",
      province: "Madrid",
      country: "España",
      phone: "600 000 000",
      email: "hola@negocio.es",
      website: "https://negocio.es",
      iban: undefined,
      quoteValidityDays: 365,
    });
  });

  it("normaliza el perfil fiscal opcional sin guardar campos ajenos", () => {
    const normalized = normalizeBusinessProfileForSave({
      ...DEFAULT_PROFILE,
      fiscalProfile: {
        schemaVersion: 1,
        setupStatus: "CONFIGURED",
        taxpayerType: "SELF_EMPLOYED_IRPF",
        jurisdiction: "ES_COMMON",
        directTaxRegime: "DIRECT_ESTIMATION_SIMPLIFIED",
        vatRegime: "GENERAL",
        vatDeductionRight: "FULL",
        activities: [{ code: " 763 ", description: " Programación " }],
        source: {
          kind: "MANUAL",
          confirmedAt: "2026-07-12T12:00:00.000Z",
          identityMatch: "NOT_CHECKED",
        },
      },
    });

    expect(normalized.fiscalProfile?.activities).toEqual([
      { code: "763", description: "Programación" },
    ]);
  });

  it("avisa de datos necesarios para documentos completos", () => {
    const labels = businessProfileMissingDocumentLabels(DEFAULT_PROFILE);
    const labelsWithCommercialName = businessProfileMissingDocumentLabels({
      ...DEFAULT_PROFILE,
      commercialName: "Marca visible",
    });

    expect(labels).toEqual([
      "nombre fiscal o razón social",
      "NIF/CIF",
      "dirección fiscal",
      "código postal",
      "ciudad",
    ]);
    expect(labelsWithCommercialName).toContain(
      "nombre fiscal o razón social",
    );
    expect(isBusinessProfileReadyForIssuedInvoices(DEFAULT_PROFILE)).toBe(false);
    expect(livePdfIssuerWarning(DEFAULT_PROFILE)).toContain("Completa los datos");
  });

  it("acepta un perfil completo sin avisos bloqueantes", () => {
    const profile = {
      ...DEFAULT_PROFILE,
      name: "Mi Negocio",
      nif: "B12345678",
      address: "Calle Mayor 1",
      postalCode: "28001",
      city: "Madrid",
      email: "hola@negocio.es",
      phone: "+34 600 000 000",
    };

    expect(isBusinessProfileReadyForIssuedInvoices(profile)).toBe(true);
    expect(
      isBusinessProfileReadyForIssuedInvoices({ ...profile, nif: "SIN NIF" }),
    ).toBe(false);
    expect(livePdfIssuerWarning({ ...profile, nif: "SIN NIF" })).toContain(
      "Completa los datos",
    );
    expect(businessProfileNotices(profile)).toEqual([]);
    expect(livePdfIssuerWarning(profile)).toBeNull();
  });

  it("valida email y teléfono solo con comprobación básica", () => {
    expect(isBasicBusinessEmail("hola@negocio.es")).toBe(true);
    expect(isBasicBusinessEmail("no-es-email")).toBe(false);
    expect(isBasicBusinessPhone("+34 600 000 000")).toBe(true);
    expect(isBasicBusinessPhone("telefono")).toBe(false);
  });

  it("mantiene copy breve para datos de empresa", () => {
    const missing = businessProfileQrNotice(DEFAULT_PROFILE);
    const ready = businessProfileQrNotice({
      ...DEFAULT_PROFILE,
      name: "Mi Negocio",
      nif: "B12345678",
      address: "Calle Mayor 1",
      postalCode: "28001",
      city: "Madrid",
    });
    const copy = [
      missing,
      ready,
      ...businessProfileNotices({
        ...DEFAULT_PROFILE,
        nif: "abc",
      }).map((notice) => notice.message),
    ].join("\n");

    expect(missing).toBe("Rellena estos datos para emitir documentos reales.");
    expect(ready).toBe("Datos listos para emitir documentos reales.");
    expect(copy).toContain("no lo valida con AEAT");
    expect(copy).not.toContain("QR existente");
    expect(copy).not.toContain("QR disponible");
    expect(copy).not.toContain("NIF validado");
    expect(copy).not.toContain("QR oficial AEAT");
    expect(copy).not.toContain("VeriFactu productivo");
  });
});
