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
    expect(hacienda).toContain("readCensusDocumentPages");
    expect(hacienda).toContain("recognizeAndClassifyAeatScreenshotFiles");
    expect(hacienda).toContain("extractFiscalDocumentText");
    expect(hacienda).toContain('data-drop-zone="AEAT_FILES"');
    expect(hacienda).toContain(
      'accept="application/pdf,image/png,image/jpeg,image/webp',
    );
    expect(hacienda).toContain("Arrastra aquí todos tus PDF y capturas");
    expect(hacienda).toContain(
      "const nextFiles = mergeFiles(files, Array.from(list))",
    );
    expect(hacienda).not.toContain("void analyzeFiles(nextFiles)");
    expect(hacienda).toContain("No empezaremos hasta que pulses analizar.");
    expect(hacienda).toContain("onClick={() => void analyzeFiles(files)}");
    expect(hacienda).toContain("Quitar todos");
    expect(hacienda).toContain("Cómo encontrar la información en Hacienda");
    expect(hacienda).toContain("Área personal");
    expect(hacienda).toContain("Mis datos censales");
    expect(hacienda).toContain("no necesitas");
    expect(hacienda).toContain("identificar cada archivo");
    expect(hacienda).toContain("Los archivos no se envían ni se guardan");
    expect(hacienda).toContain('data-info-card="recognized-fiscal-documents"');
    expect(hacienda).toContain("¿Qué modelos y documentos reconoce el lector?");
    expect(hacienda).toContain("30 modelos fiscales");
    expect(hacienda).toContain("9 documentos sin número de modelo");
    expect(hacienda).toContain("Capturas de Hacienda compatibles");
    expect(hacienda).toContain(
      "detalle de una actividad o número de referencia",
    );
    expect(hacienda).toContain("Solo se rellenan preguntas cuando su interior");
    expect(hacienda).toContain("Confirmo que los archivos contienen los datos");
    expect(hacienda).toContain(
      "Los datos que confirmes se sumarán a los que ya",
    );
    expect(hacienda).toContain('extractionMethod: "OCR_LOCAL"');
    expect(hacienda).toContain("needsHybridPdfOcr");
    expect(hacienda).toContain("forceLocalOcr: true");
    expect(hacienda).toContain("mergeNativeText: true");
    expect(hacienda).toContain("extractionProposals");
    expect(hacienda).toContain("accent-emerald-600");
    expect(hacienda).toContain("fiscal-document-");
    expect(hacienda).not.toContain("sourceLocation: `${fileName}");
    expect(hacienda).not.toContain("reconcileCensusIdentity");
  });

  it("keeps document answers editable and distinguishes them in green", () => {
    expect(questions).toContain("documentValidated");
    expect(questions).toContain("bg-emerald-600");
    expect(questions).toContain("puedes cambiarlo");
    expect(wizard).toContain('item.type !== "USER_ANSWER"');
    expect(wizard).toContain("item.field !== field");
  });

  it("al cambiar de bloque desplaza y enfoca la primera pregunta", () => {
    expect(wizard).toContain("firstQuestionRef.current?.scrollIntoView");
    expect(wizard).toContain('behavior: "smooth"');
    expect(wizard).toContain('block: "start"');
    expect(wizard).toContain(
      "firstQuestionRef.current?.focus({ preventScroll: true })",
    );
    expect(wizard).not.toContain(
      'window.scrollTo({ top: 0, behavior: "smooth" });\n  }\n\n  function generateResult',
    );
  });

  it("mantiene la foto publicada hasta que se generan resultados nuevos", () => {
    expect(wizard).toContain("setResult(storedSession.lastResult ?? null)");
    expect(wizard).toContain(
      "const publishedAssessment = buildTaxObligationsAssessment(nextResult)",
    );
    expect(wizard).toContain("publishedAssessment,");
    expect(wizard).not.toContain("lastResult: undefined");
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
