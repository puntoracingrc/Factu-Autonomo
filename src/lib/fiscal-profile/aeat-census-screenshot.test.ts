import { describe, expect, it } from "vitest";
import { parseAeatCensusScreenshotText } from "./aeat-census-screenshot";

describe("AEAT census screenshot parser", () => {
  it("separates active activities from historical rows", () => {
    const parsed = parseAeatCensusScreenshotText(
      `
        Relación de Actividades
        Censo de Actividades y Locales
        Titular: 12345678Z PERSONA DE PRUEBA
        Sección Epígrafe Denominación Estado F.Inicio F.Baja
        Empresarial 501.1 Construcción completa, reparación y conservación Alta 01-02-2020
        Empresarial 501.3 Albañilería y pequeños trabajos construcción Baja 15-03-2011 31-12-2015
      `,
      "ACTIVITIES",
    );

    expect(parsed).toMatchObject({
      status: "RESOLVED",
      isComplete: true,
      activityKinds: ["BUSINESS"],
    });
    expect(parsed.activities).toEqual([
      expect.objectContaining({ code: "501.1", state: "ACTIVE", startDate: "2020-02-01" }),
      expect.objectContaining({ code: "501.3", state: "INACTIVE", endDate: "2015-12-31" }),
    ]);
    expect(parsed.warnings.join(" ")).toMatch(/histórico/i);
  });

  it("reads only checked tax-status codes and keeps a partial page incomplete", () => {
    const parsed = parseAeatCensusScreenshotText(
      `
        Situación tributaria
        NIF / NIE 12345678Z Estado Sit. Trib. Activo
        Impuesto sobre el Valor Añadido
        C) Regímenes aplicables
        510 X General 512 Fecha 01/02/2020
      `,
      "TAX_STATUS",
    );

    expect(parsed.vatRegimes).toEqual(["GENERAL"]);
    expect(parsed.incomeTaxRegime).toBe("UNKNOWN");
    expect(parsed.status).toBe("RESOLVED");
    expect(parsed.isComplete).toBe(false);
  });

  it("combines IRPF and VAT evidence without guessing from unmarked rows", () => {
    const parsed = parseAeatCensusScreenshotText(
      `
        Situación tributaria
        NIF / NIE 12345678Z
        Impuesto sobre la Renta de las Personas Físicas
        Estimación objetiva 604 605 606
        Estimación directa normal 608 610 611
        simplificada 609 X 610 611
        Impuesto sobre el Valor Añadido
        C) Regímenes aplicables
        510 X General 512
      `,
      "TAX_STATUS",
    );

    expect(parsed).toMatchObject({
      status: "RESOLVED",
      isComplete: true,
      incomeTaxRegime: "DIRECT_SIMPLIFIED",
      vatRegimes: ["GENERAL"],
    });
  });

  it("maps exact active obligation rows only to bounded canonical codes", () => {
    const parsed = parseAeatCensusScreenshotText(
      `
        Obligaciones tributarias
        NIF / NIE 12345678Z
        Descripción de la obligación Periodicidad F. Alta Efec. Estado
        IRPF-1SS. RETARREND.INMUEBLES URBANOS TRIMESTRAL 25/07/2024 ALTA
        IRPF PAGO FRACCIONADO (PROF.-EMPRES.) TRIMESTRAL 01/02/2020 ALTA
        IMP. SOBRE EL VALOR AÑADIDO. TRIMESTRAL 01/02/2020 ALTA
      `,
      "OBLIGATIONS",
    );

    expect(parsed).toMatchObject({
      status: "RESOLVED",
      isComplete: true,
      activeTaxModels: ["115", "130", "303"],
    });
    expect(parsed.activeTaxModels).not.toContain("180");
    expect(parsed.activeTaxModels).not.toContain("390");
  });

  it("fails closed when an active obligation row is unknown", () => {
    const parsed = parseAeatCensusScreenshotText(
      `
        Obligaciones tributarias
        Descripción de la obligación Periodicidad Estado
        OBLIGACIÓN NO CLASIFICADA TRIMESTRAL ALTA
        IMP. SOBRE EL VALOR AÑADIDO. TRIMESTRAL ALTA
      `,
      "OBLIGATIONS",
    );

    expect(parsed.status).toBe("REVIEW_REQUIRED");
    expect(parsed.activeTaxModels).toEqual(["303"]);
  });

  it("blocks a screenshot placed in the wrong guided slot", () => {
    const parsed = parseAeatCensusScreenshotText(
      `Relación de Actividades\nCenso de Actividades y Locales`,
      "OBLIGATIONS",
    );
    expect(parsed.status).toBe("BLOCKED");
    expect(parsed.detectedKind).toBe("ACTIVITIES");
  });
});
