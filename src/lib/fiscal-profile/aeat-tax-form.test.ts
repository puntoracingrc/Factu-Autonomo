import { describe, expect, it } from "vitest";
import { parseAeatTaxFormText } from "./aeat-tax-form";

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
  });
});
