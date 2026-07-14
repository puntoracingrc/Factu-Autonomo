import { describe, expect, it } from "vitest";
import {
  AEAT_SUPPORTED_TAX_FORM_CODES,
  AEAT_TAX_FORM_CATALOG_VERSION,
  AEAT_TAX_FORM_STRUCTURES,
  parseAeatTaxFormText,
} from "./aeat-tax-form";

describe("AEAT submitted tax form parser", () => {
  it.each([
    [
      "115",
      "Retenciones e ingresos a cuenta por arrendamiento de inmuebles urbanos",
    ],
    ["130", "Pago fraccionado de actividades en estimación directa"],
    ["131", "Pago fraccionado de actividades en estimación objetiva"],
    ["303", "Impuesto sobre el Valor Añadido. Autoliquidación"],
  ] as const)(
    "recognizes model %s from its official structural labels",
    (code, label) => {
      const parsed = parseAeatTaxFormText(`
      Agencia Tributaria
      Modelo ${code}
      NIF 12345678Z
      Ejercicio 2026
      Período 2T
      ${label}
      Número de justificante: 1151234567890
    `);

      expect(parsed).toMatchObject({
        modelCode: code,
        status: "RESOLVED",
        isSubmitted: true,
        taxYear: 2026,
        period: "2T",
        receiptNumber: "1151234567890",
      });
      expect(parsed.warnings[0]).toContain("corresponden al período indicado");
    },
  );

  it("does not turn a blank official template into questionnaire answers", () => {
    const parsed = parseAeatTaxFormText(`
      Modelo 115
      NIF
      Ejercicio 2026
      Período 2T
      Retenciones e ingresos a cuenta por arrendamiento de inmuebles urbanos
      Número de justificante
    `);

    expect(parsed).toMatchObject({
      modelCode: "115",
      status: "REVIEW_REQUIRED",
      isSubmitted: false,
    });
    expect(parsed.warnings.join(" ")).toContain("plantilla vacía");
  });

  it("fails closed when a document lacks an exact compatible structure", () => {
    expect(
      parseAeatTaxFormText(
        "Modelo 130 mencionado en unas instrucciones generales",
      ),
    ).toMatchObject({
      modelCode: "UNKNOWN",
      status: "BLOCKED",
      isSubmitted: false,
    });
    expect(
      parseAeatTaxFormText(`
        Modelo 484 NIF 12345678Z Ejercicio 2026
        Documento inventado a modo de ejemplo
        Número de justificante 4841234567890
      `),
    ).toMatchObject({ modelCode: "UNKNOWN", status: "BLOCKED" });
  });

  it("keeps one versioned structural definition for every requested non-census model", () => {
    expect(AEAT_SUPPORTED_TAX_FORM_CODES).toHaveLength(28);
    expect(new Set(AEAT_SUPPORTED_TAX_FORM_CODES).size).toBe(28);
    expect(AEAT_TAX_FORM_STRUCTURES.map((item) => item.code)).toEqual(
      AEAT_SUPPORTED_TAX_FORM_CODES,
    );
    expect(AEAT_TAX_FORM_CATALOG_VERSION).toBe(
      "aeat-tax-form-catalog.2026-07.v1",
    );
    for (const structure of AEAT_TAX_FORM_STRUCTURES) {
      expect(structure.officialProcedureUrl).toMatch(
        /^https:\/\/sede\.agenciatributaria\.gob\.es\//,
      );
      expect(structure.requiredPhrases.length).toBeGreaterThan(0);
      expect(structure.extractableFacts.length).toBeGreaterThan(0);
    }
  });

  it.each(AEAT_TAX_FORM_STRUCTURES)(
    "recognizes $code only when its structural anchors are present",
    (structure) => {
      const text = [
        `Modelo ${structure.code}`,
        "NIF 12345678Z",
        structure.periodicity === "EVENT_DRIVEN" ? "" : "Ejercicio 2026",
        structure.periodicity === "PERIODIC" ? "Período 2T" : "",
        ...structure.requiredPhrases,
        ...("requiredAnyPhraseGroups" in structure
          ? structure.requiredAnyPhraseGroups.map((group) => group[0])
          : []),
        "Número de justificante 1234567890123",
      ].join("\n");
      expect(parseAeatTaxFormText(text)).toMatchObject({
        catalogVersion: AEAT_TAX_FORM_CATALOG_VERSION,
        modelCode: structure.code,
        status: "RESOLVED",
        isSubmitted: true,
      });
    },
  );

  it("extracts exact 349 operation keys without inferring them from free text", () => {
    const parsed = parseAeatTaxFormText(`
      Modelo 349 NIF 12345678Z Ejercicio 2026 Período 2T
      Operaciones intracomunitarias. Declaración recapitulativa
      Clave de operación: E
      Clave de operación: I
      Número de justificante 3491234567890
    `);
    expect(parsed.euOperationKeys).toEqual(["E", "I"]);
  });
});
