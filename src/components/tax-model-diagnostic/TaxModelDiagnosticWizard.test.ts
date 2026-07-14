import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("tax model diagnostic UI contract", () => {
  const wizard = source("./TaxModelDiagnosticWizard.tsx");
  const questions = source("./DiagnosticQuestionField.tsx");
  const documents = source("./DiagnosticDocumentReview.tsx");
  const results = source("./DiagnosticResults.tsx");

  it("exige confirmación humana antes del resultado", () => {
    expect(wizard).toContain("Confirmo que he revisado las respuestas");
    expect(wizard).toContain("disabled={!confirmedTruth}");
    expect(wizard).toContain("evaluateTaxModelDiagnostic");
  });

  it("ofrece no lo sé, ayuda contextual y controles accesibles", () => {
    expect(wizard).toContain("«No lo sé» es una respuesta válida");
    expect(questions).toContain("<fieldset");
    expect(questions).toContain("<legend");
    expect(questions).toContain("Por qué lo preguntamos");
    expect(questions).toContain('type="radio"');
  });

  it("procesa documentos localmente sin aplicar propuestas automáticamente", () => {
    expect(documents).toContain("readCensusDocumentText");
    expect(documents).toContain("no se guarda el PDF");
    expect(documents).toContain("He contrastado el documento");
    expect(documents).toContain("userConfirmed: true");
  });

  it("muestra motivo, evidencia, períodos, sujeto, fuentes y siguiente paso", () => {
    for (const copy of [
      "Por qué aparece",
      "Periodicidad y períodos",
      "Evidencia usada",
      "Siguiente paso",
      "Fuentes oficiales y trazabilidad",
      "Sujeto:",
    ]) {
      expect(results).toContain(copy);
    }
  });
});

