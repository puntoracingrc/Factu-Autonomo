import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_QUESTIONS } from "../questions";
import { classifyFiscalDocumentText } from "./classifier";
import { extractFiscalDocumentText } from "./pipeline";
import { reconcileExtractedFacts } from "./reconciliation";
import { FISCAL_DOCUMENT_EXTRACTOR_REGISTRY } from "./registry";
import {
  createExtractedFact,
} from "./normalization";

function input(text: string, fileName = "documento.pdf") {
  return {
    documentId: "synthetic-document-1",
    fileName,
    text,
    extractionMethod: "PDF_NATIVE_TEXT" as const,
    totalPages: 1,
    detectedPages: [1],
  };
}

describe("fiscal document extractor registry", () => {
  it("reserves exactly 30 numbered models and 9 unnumbered documents", () => {
    expect(FISCAL_DOCUMENT_EXTRACTOR_REGISTRY).toHaveLength(39);
    expect(
      FISCAL_DOCUMENT_EXTRACTOR_REGISTRY.filter((item) => item.model),
    ).toHaveLength(30);
    expect(
      FISCAL_DOCUMENT_EXTRACTOR_REGISTRY.filter((item) => !item.model),
    ).toHaveLength(9);
    expect(
      new Set(
        FISCAL_DOCUMENT_EXTRACTOR_REGISTRY.flatMap(
          (item) => item.documentTypes,
        ),
      ).size,
    ).toBe(39);
  });

  it("maps capabilities only to canonical questionnaire ids", () => {
    const questionIds = new Set(
      DIAGNOSTIC_QUESTIONS.map((question) => question.questionId),
    );
    for (const definition of FISCAL_DOCUMENT_EXTRACTOR_REGISTRY) {
      for (const questionId of definition.questionMappings) {
        expect(questionIds.has(questionId), `${definition.extractorId}:${questionId}`).toBe(true);
      }
    }
  });

  it("keeps 349 operations separate from current ROI registration", () => {
    const definition = FISCAL_DOCUMENT_EXTRACTOR_REGISTRY.find(
      (item) => item.model === "349",
    );
    expect(definition?.questionMappings).not.toContain("I_ROI");
  });
});

describe("closed deterministic classification", () => {
  it("prioritizes an AEAT activity view over the auxiliary Modelo 036 label", () => {
    const classification = classifyFiscalDocumentText(`
      Detalle de un Número de Referencia en un Ejercicio
      Impuesto sobre Actividades Económicas
      Datos identificativos (Modelo 036)
      Sección: Empresarial
      Grupo/Epígrafe: 501.1 Construcción completa, reparación y conservación
      Estado: Actividad en alta
    `);
    expect(classification).toMatchObject({
      status: "RESOLVED",
      documentType: "AEAT_ECONOMIC_ACTIVITIES_VIEW",
      model: null,
    });
  });

  it("rejects foral documents instead of processing them as AEAT", () => {
    expect(
      classifyFiscalDocumentText(`
        Hacienda Foral de Bizkaia
        Modelo 303
        NIF 12345678Z
        Impuesto sobre el Valor Añadido Autoliquidación
      `),
    ).toMatchObject({ status: "BLOCKED", authority: "FORAL" });
  });
});

describe("first extraction block", () => {
  it("extracts traceable current activities and keeps partial screenshots open", () => {
    const result = extractFiscalDocumentText(
      input(`
        Detalle de un Número de Referencia en un Ejercicio
        Impuesto sobre Actividades Económicas
        Sección: Empresarial
        Descripción de la actividad Construcción completa, reparación y conservación
        Grupo/Epígrafe: 501.1 Construcción completa, reparación y conservación
        Estado: Actividad en alta
        Fecha de inicio de la actividad 08-03-2024
      `),
    );
    expect(result.status).toBe("RESOLVED");
    expect(result.envelope).toMatchObject({
      detectedDocumentType: "AEAT_ECONOMIC_ACTIVITIES_VIEW",
      isComplete: false,
    });
    expect(result.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          factType: "ACTIVITY.NATURE",
          sourceLabel: "Sección de la actividad",
          temporalScope: "CURRENT_AS_OF_DATE",
          status: "PREFILLED_NEEDS_CONFIRMATION",
        }),
      ]),
    );
    expect(
      result.questionResolutions.find(
        (item) => item.questionId === "C_ACTIVITY_KINDS",
      ),
    ).toMatchObject({
      proposedAnswer: ["BUSINESS"],
      confirmationRequired: true,
      canSkipQuestion: false,
    });
  });

  it("extracts an explicit current obligation list without inventing absent models", () => {
    const result = extractFiscalDocumentText(
      input(`
        Obligaciones tributarias
        NIF / NIE 12345678Z
        Descripción de la obligación Periodicidad F. Alta Efec. Estado
        IRPF-1SS. RETARREND.INMUEBLES URBANOS TRIMESTRAL 25/07/2024 ALTA
        IRPF PAGO FRACCIONADO (PROF.-EMPRES.) TRIMESTRAL 01/02/2020 ALTA
        IMP. SOBRE EL VALOR AÑADIDO. TRIMESTRAL 01/02/2020 ALTA
      `),
    );
    expect(result.envelope.isComplete).toBe(true);
    expect(
      result.facts.find(
        (fact) => fact.factType === "CENSUS.PERIODIC_OBLIGATIONS",
      )?.normalizedValue,
    ).toEqual(["115", "130", "303"]);
    expect(
      result.questionResolutions.find(
        (item) => item.questionId === "G_RENTS_PREMISES",
      ),
    ).toMatchObject({ proposedAnswer: "YES", confirmationRequired: true });
    expect(
      result.questionResolutions.some(
        (item) => item.questionId === "E_390_EXEMPT",
      ),
    ).toBe(false);
  });

  it("keeps model 037 facts historical and never silently completes questions", () => {
    const result = extractFiscalDocumentText(
      input(`
        Modelo 037
        Declaración censal simplificada
        NIF 12345678Z
        Tipo de contribuyente: persona física
        Estimación directa simplificada
        Régimen general de IVA
        Fecha de presentación 01/02/2024
        Justificante 1234567890123
      `),
    );
    expect(result.envelope.detectedDocumentType).toBe("MODEL_037");
    expect(result.facts.length).toBeGreaterThan(0);
    expect(result.facts.every((fact) => fact.status === "HISTORICAL_ONLY")).toBe(true);
    expect(
      result.questionResolutions.every(
        (item) => item.confirmationRequired && !item.canSkipQuestion,
      ),
    ).toBe(true);
  });

  it("recognizes the filing wording used by historical 037 receipts", () => {
    const result = extractFiscalDocumentText(
      input(`
        Modelo 037
        Declaración censal simplificada
        Tipo de contribuyente: persona física
        Estimación directa simplificada
        PRESENTACIÓN REALIZADA EL 08/03/2024
      `),
    );
    expect(result.envelope).toMatchObject({
      documentKind: "FILED_DECLARATION_COPY",
      filingStatus: "APPARENTLY_FILED",
      filingDate: "2024-03-08",
    });
  });

  it("recognizes later-block models but returns no invented facts", () => {
    const result = extractFiscalDocumentText(
      input(`
        Modelo 303
        NIF 12345678Z
        Impuesto sobre el Valor Añadido
        Autoliquidación
        Ejercicio 2025
        Periodo 4T
        Fecha de presentación 30/01/2026
      `),
    );
    expect(result).toMatchObject({
      status: "UNSUPPORTED_DOCUMENT",
      envelope: {
        detectedModel: "303",
        fiscalYear: 2025,
        period: "4T",
      },
      facts: [],
      questionResolutions: [],
    });
  });

  it("does not persist or expose the original file name", () => {
    const result = extractFiscalDocumentText(
      input(
        `
          Situación tributaria
          NIF / NIE 12345678Z
          Impuesto sobre el Valor Añadido
          C) Regímenes aplicables
          510 X General 512 Fecha 01/02/2020
        `,
        "12345678Z Nombre completo.pdf",
      ),
    );
    expect(JSON.stringify(result)).not.toContain("Nombre completo.pdf");
    expect(JSON.stringify(result)).not.toContain("12345678Z");
    expect(result.envelope.taxpayerNifMasked).toMatch(/\*/);
  });
});

describe("temporal reconciliation", () => {
  it("keeps an older fact and marks it as superseded by a later current source", () => {
    const older = createExtractedFact({
      documentId: "old",
      index: 0,
      factType: "IRPF.METHOD",
      value: "DIRECT_NORMAL",
      temporalScope: "HISTORICAL",
      effectiveFrom: "2024-01-01",
      extractionMethod: "PDF_NATIVE_TEXT",
      extractionConfidence: 0.9,
      status: "HISTORICAL_ONLY",
    });
    const newer = createExtractedFact({
      documentId: "current",
      index: 0,
      factType: "IRPF.METHOD",
      value: "DIRECT_SIMPLIFIED",
      temporalScope: "CURRENT_AS_OF_DATE",
      effectiveFrom: "2026-07-14",
      extractionMethod: "PDF_NATIVE_TEXT",
      extractionConfidence: 0.9,
      status: "PREFILLED_NEEDS_CONFIRMATION",
    });
    const reconciled = reconcileExtractedFacts([older, newer]);
    expect(reconciled.find((fact) => fact.factId === older.factId)?.supersededBy).toBe(
      newer.factId,
    );
    expect(reconciled).toHaveLength(2);
  });
});
