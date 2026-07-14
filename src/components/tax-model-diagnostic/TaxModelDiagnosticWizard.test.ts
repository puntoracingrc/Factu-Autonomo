import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("tax model diagnostic UI contract", () => {
  const wizard = source("./TaxModelDiagnosticWizard.tsx");
  const questions = source("./DiagnosticQuestionField.tsx");
  const hacienda = source("./DiagnosticHaciendaReview.tsx");
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
    expect(questions).toContain(
      "const checked = completed && value === optionValue",
    );
    expect(questions).toContain(
      "const checked = completed && value === option.value",
    );
  });

  it("unifica PDF y capturas, los clasifica localmente y exige confirmación", () => {
    expect(wizard).toContain("DiagnosticHaciendaReview");
    expect(wizard).not.toContain("DiagnosticDocumentReview");
    expect(wizard).not.toContain("DiagnosticScreenshotReview");
    expect(hacienda).toContain("Sube lo que tengas de Hacienda");
    expect(hacienda).toContain("Puedes mezclar PDF y capturas sin ordenarlos");
    expect(hacienda).toContain("readCensusDocumentText");
    expect(hacienda).toContain("recognizeAndClassifyAeatScreenshotFiles");
    expect(hacienda).toContain("parseAeatTaxFormText");
    expect(hacienda).toContain('data-drop-zone="AEAT_FILES"');
    expect(hacienda).toContain(
      'accept="application/pdf,image/png,image/jpeg,image/webp',
    );
    expect(hacienda).toContain("Arrastra aquí todos tus PDF y capturas");
    expect(hacienda).toContain("Cómo encontrar la información en Hacienda");
    expect(hacienda).toContain("Área personal");
    expect(hacienda).toContain("Mis datos censales");
    expect(hacienda).toContain("no necesitas");
    expect(hacienda).toContain("identificar cada archivo");
    expect(hacienda).toContain("Los archivos no se envían ni se guardan");
    expect(hacienda).toContain("Confirmo que los archivos contienen los datos");
    expect(hacienda).toContain('extractionMethod: "OCR_LOCAL"');
    expect(hacienda).toContain("mapSubmittedTaxFormToQuestions");
    expect(hacienda).toContain("mapCensusObligationsToQuestions");
    expect(hacienda).not.toContain("reconcileCensusIdentity");
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
