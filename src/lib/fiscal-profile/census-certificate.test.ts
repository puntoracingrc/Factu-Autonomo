import { describe, expect, it } from "vitest";
import {
  parseCensusCertificateText,
  reconcileCensusIdentity,
} from "./census-certificate";

describe("census certificate parser", () => {
  it("extracts a reviewable self-employed fiscal profile without storing raw text", () => {
    const parsed = parseCensusCertificateText(`
      AGENCIA TRIBUTARIA
      CERTIFICADO DE SITUACIÓN CENSAL
      NIF del obligado tributario: 12345678Z
      Tipo de persona: Persona física
      Fecha de expedición: 12/07/2026
      Código Seguro de Verificación: ABCD-1234-EFGH-5678
      Territorio común
      Régimen: Estimación directa simplificada
      Régimen general de IVA
      Derecho general a la deducción: 100%
      Epígrafe IAE: 763 - Programadores y analistas de informática
      Epígrafe IAE: 849.9
      Descripción de la actividad: Otros servicios independientes
    `);

    expect(parsed).toMatchObject({
      detectedNif: "12345678Z",
      taxpayerType: "SELF_EMPLOYED_IRPF",
      jurisdiction: "ES_COMMON",
      directTaxRegime: "DIRECT_ESTIMATION_SIMPLIFIED",
      vatRegime: "GENERAL",
      vatDeductionRight: "FULL",
      documentDate: "2026-07-12",
      csv: "ABCD-1234-EFGH-5678",
      documentKind: "AEAT_CENSUS_CERTIFICATE",
    });
    expect(parsed.activities).toEqual([
      {
        code: "763",
        description: "Programadores y analistas de informática",
      },
      { code: "849.9", description: "Otros servicios independientes" },
    ]);
  });

  it("uses the NIF shape only as a visible suggestion and does not invent regimes", () => {
    const parsed = parseCensusCertificateText(`
      MODELO 036
      NIF: B12345678
      Domicilio: Navarra
      Régimen general de IVA
      Actividad económica: Comercio de material de oficina
    `);

    expect(parsed.taxpayerType).toBe("COMPANY_IS");
    expect(parsed.jurisdiction).toBe("UNKNOWN");
    expect(parsed.directTaxRegime).toBe("UNKNOWN");
    expect(parsed.vatRegime).toBe("GENERAL");
    expect(parsed.vatDeductionRight).toBe("UNKNOWN");
    expect(parsed.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("formato del NIF"),
        expect.stringContaining("declaración concreta"),
      ]),
    );
  });

  it("recognizes the historical model 037 without treating it as a current form", () => {
    const parsed = parseCensusCertificateText(`
      AGENCIA TRIBUTARIA
      MODELO 037
      NIF: 12345678Z
      Estimación directa simplificada
      Régimen general de IVA
    `);

    expect(parsed.documentKind).toBe("MODEL_037");
    expect(parsed.warnings.join(" ")).toContain("037 histórico");
  });

  it("keeps missing or ambiguous fiscal data unknown", () => {
    const parsed = parseCensusCertificateText(`
      Documento aportado por el usuario
      Dirección: Calle de Canarias 10
      Observaciones: sin información fiscal estructurada
    `);

    expect(parsed).toMatchObject({
      detectedNif: null,
      taxpayerType: "UNKNOWN",
      jurisdiction: "UNKNOWN",
      directTaxRegime: "UNKNOWN",
      vatRegime: "UNKNOWN",
      vatDeductionRight: "UNKNOWN",
      activities: [],
      documentKind: "UNKNOWN",
    });
  });

  it("no infiere territorio por una dirección ni resuelve actividades mixtas como exentas", () => {
    const parsed = parseCensusCertificateText(`
      CERTIFICADO DE SITUACIÓN CENSAL
      NIF del obligado tributario: 12345678Z
      Dirección: Calle Islas Canarias 10, Melilla
      Régimen general de IVA
      Actividad exenta de IVA
      Actividad económica: Servicios profesionales
    `);

    expect(parsed.jurisdiction).toBe("UNKNOWN");
    expect(parsed.vatRegime).toBe("UNKNOWN");
    expect(parsed.vatDeductionRight).toBe("UNKNOWN");
    expect(parsed.warnings.join(" ")).toMatch(/tratamientos de IVA distintos/i);
  });

  it("tolerates PDF text items that split labels from their values", () => {
    const parsed = parseCensusCertificateText(`
      CERTIFICADO DE SITUACIÓN CENSAL
      NIF del obligado tributario
      12345678Z
      Epígrafe IAE
      763
      Descripción de la actividad: Programación informática
    `);

    expect(parsed.detectedNif).toBe("12345678Z");
    expect(parsed.activities).toEqual([
      { code: "763", description: "Programación informática" },
    ]);
  });
});

describe("census identity reconciliation", () => {
  it("matches normalized national and ES-prefixed identifiers", () => {
    expect(reconcileCensusIdentity("ES 12345678-Z", "12345678Z")).toEqual({
      status: "MATCHED",
      canConfirm: true,
      message: "El NIF del documento coincide con el perfil de la empresa.",
    });
  });

  it("blocks a different NIF", () => {
    expect(reconcileCensusIdentity("12345678Z", "B12345678")).toMatchObject({
      status: "MISMATCH",
      canConfirm: false,
    });
  });

  it("does not pretend to verify identity when either NIF is missing", () => {
    expect(reconcileCensusIdentity("", "12345678Z")).toMatchObject({
      status: "NOT_CHECKED",
      canConfirm: false,
    });
  });
});
