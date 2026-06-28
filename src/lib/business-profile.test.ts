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
      name: "  Mi Negocio  ",
      nif: " b12345678 ",
      address: "  Calle Mayor 1 ",
      postalCode: " 28001 ",
      city: " Madrid ",
      phone: " 600 000 000 ",
      email: " HOLA@NEGOCIO.ES ",
      iban: " ",
      quoteValidityDays: 999,
    });

    expect(normalized).toMatchObject({
      name: "Mi Negocio",
      nif: "B12345678",
      address: "Calle Mayor 1",
      postalCode: "28001",
      city: "Madrid",
      phone: "600 000 000",
      email: "hola@negocio.es",
      iban: undefined,
      quoteValidityDays: 365,
    });
  });

  it("avisa de datos necesarios para documentos completos", () => {
    const labels = businessProfileMissingDocumentLabels(DEFAULT_PROFILE);

    expect(labels).toEqual([
      "nombre fiscal o razón social",
      "NIF/CIF",
      "dirección fiscal",
      "código postal",
      "ciudad",
    ]);
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
    expect(businessProfileNotices(profile)).toEqual([]);
    expect(livePdfIssuerWarning(profile)).toBeNull();
  });

  it("valida email y teléfono solo con comprobación básica", () => {
    expect(isBasicBusinessEmail("hola@negocio.es")).toBe(true);
    expect(isBasicBusinessEmail("no-es-email")).toBe(false);
    expect(isBasicBusinessPhone("+34 600 000 000")).toBe(true);
    expect(isBasicBusinessPhone("telefono")).toBe(false);
  });

  it("mantiene copy prudente para QR y NIF", () => {
    const missing = businessProfileQrNotice(DEFAULT_PROFILE);
    const ready = businessProfileQrNotice({
      ...DEFAULT_PROFILE,
      nif: "B12345678",
    });
    const copy = [
      missing,
      ready,
      ...businessProfileNotices({
        ...DEFAULT_PROFILE,
        nif: "abc",
      }).map((notice) => notice.message),
    ].join("\n");

    expect(missing).toContain("NIF/CIF del emisor");
    expect(ready).toContain("QR disponible");
    expect(copy).toContain("no lo valida con AEAT");
    expect(copy).not.toContain("NIF validado");
    expect(copy).not.toContain("QR oficial AEAT");
    expect(copy).not.toContain("VeriFactu productivo");
  });
});
