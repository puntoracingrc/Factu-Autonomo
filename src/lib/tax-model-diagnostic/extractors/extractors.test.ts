import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_QUESTIONS } from "../questions";
import { classifyFiscalDocumentText } from "./classifier";
import {
  MODEL_190_KEY_DICTIONARY,
  MODEL_190_KEY_DICTIONARY_VERSION,
} from "./codebooks";
import { extractFiscalDocumentText } from "./pipeline";
import {
  reconcileExtractedFacts,
  reconcileFiscalDocumentResults,
} from "./reconciliation";
import { FISCAL_DOCUMENT_EXTRACTOR_REGISTRY } from "./registry";
import { MAXIMUM_PRIORITY_DEEP_MODEL_CODES } from "./priority-models";
import {
  REMAINING_DEEP_DOCUMENT_TYPES,
  REMAINING_DEEP_MODEL_CODES,
} from "./remaining-models";
import { createExtractedFact } from "./normalization";

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
        expect(
          questionIds.has(questionId),
          `${definition.extractorId}:${questionId}`,
        ).toBe(true);
      }
    }
  });

  it("keeps 349 operations separate from current ROI registration", () => {
    const definition = FISCAL_DOCUMENT_EXTRACTOR_REGISTRY.find(
      (item) => item.model === "349",
    );
    expect(definition?.questionMappings).not.toContain("I_ROI");
  });

  it("enables deep extraction for every maximum-priority numbered model", () => {
    for (const code of MAXIMUM_PRIORITY_DEEP_MODEL_CODES) {
      expect(
        FISCAL_DOCUMENT_EXTRACTOR_REGISTRY.find((item) => item.model === code),
        code,
      ).toMatchObject({ implementationStatus: "DEEP_SUPPORTED" });
    }
  });

  it("enables deep extraction for every registered document type", () => {
    expect(
      FISCAL_DOCUMENT_EXTRACTOR_REGISTRY.filter(
        (item) => item.implementationStatus !== "DEEP_SUPPORTED",
      ),
    ).toEqual([]);
    expect(REMAINING_DEEP_MODEL_CODES).toHaveLength(16);
    expect(REMAINING_DEEP_DOCUMENT_TYPES).toHaveLength(2);
  });
});

describe("closed deterministic classification", () => {
  it("classifies an official form title when OCR misses the NIF label", () => {
    expect(
      classifyFiscalDocumentText(`
        Modelo 303 de autoliquidación del Impuesto sobre el Valor Añadido
        Impuesto sobre el Valor Añadido
        Autoliquidación
      `),
    ).toMatchObject({
      status: "RESOLVED",
      documentType: "MODEL_303",
      model: "303",
    });
  });

  it("distinguishes the printed 115 from unrelated numeric boxes", () => {
    expect(
      classifyFiscalDocumentText(`
        Impuesto sobre la Renta de las Personas Físicas
        Modelo Delegación código 100 referencia 115
        Declaración-documento de ingreso
        Retenciones e ingresos a cuenta
        Número de perceptores
        Base de las retenciones e ingresos a cuenta
      `),
    ).toMatchObject({ documentType: "MODEL_115", model: "115" });
  });

  it("does not classify a bare model-number mention", () => {
    expect(
      classifyFiscalDocumentText("Adjunto información relacionada con el modelo 303"),
    ).toMatchObject({ status: "BLOCKED", documentType: null });
  });

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

  it("prioritizes an explicit tax-status view over its Modelo 130 value", () => {
    expect(
      classifyFiscalDocumentText(`
        Mi situación tributaria
        Impuesto sobre la Renta
        Método Estimación directa simplificada
        Pagos fraccionados Modelo 130
        Impuesto sobre el Valor Añadido
        Régimen General
      `),
    ).toMatchObject({
      documentType: "AEAT_TAX_STATUS_VIEW",
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
  it("reads the card variant of Mis actividades without inventing its section", () => {
    const result = extractFiscalDocumentText(
      input(`
        Agencia Tributaria
        Mis actividades económicas
        Consulta de actividades y locales comunicados en el censo.
        Actividad 1 · ACTIVA
        SERVICIOS DE PROGRAMACION
        Epígrafe IAE: 763 · Inicio: 01/01/2026
        Lugar: Fuera de local determinado
      `),
    );
    expect(result).toMatchObject({
      status: "RESOLVED",
      envelope: {
        detectedDocumentType: "AEAT_ECONOMIC_ACTIVITIES_VIEW",
        isComplete: true,
      },
    });
    expect(result.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          factType: "ACTIVITY.LIST",
          normalizedValue: [
            {
              code: "763",
              description: "SERVICIOS DE PROGRAMACION",
              state: "ACTIVE",
              startDate: "2026-01-01",
            },
          ],
        }),
      ]),
    );
    expect(
      result.questionResolutions.some(
        (item) => item.questionId === "C_ACTIVITY_KINDS",
      ),
    ).toBe(false);
  });

  it("reads explicit IRPF and VAT labels from the compact tax-status view", () => {
    const result = extractFiscalDocumentText(
      input(`
        Agencia Tributaria
        Mi situación tributaria
        Impuesto sobre la Renta
        Método Estimación directa simplificada
        Pagos fraccionados Modelo 130
        Impuesto sobre el Valor Añadido
        Régimen General
        Periodicidad Trimestral
        Registros y opciones
        ROI No REDEME No SII No
      `),
    );
    expect(result).toMatchObject({
      status: "RESOLVED",
      envelope: {
        detectedDocumentType: "AEAT_TAX_STATUS_VIEW",
        isComplete: true,
      },
    });
    expect(
      result.questionResolutions.find(
        (item) => item.questionId === "D_INCOME_TAX_REGIME",
      ),
    ).toMatchObject({
      proposedAnswer: "DIRECT_SIMPLIFIED",
      confirmationRequired: true,
    });
    expect(
      result.questionResolutions.find(
        (item) => item.questionId === "E_VAT_REGIMES",
      ),
    ).toMatchObject({ proposedAnswer: ["GENERAL"] });
  });

  it("reads explicit model codes from the structured obligations table", () => {
    const result = extractFiscalDocumentText(
      input(`
        Agencia Tributaria
        Mis obligaciones tributarias
        Modelo Descripción Periodicidad Estado Alta Baja
        303 Autoliquidación IVA Trimestral ACTIVA 01/01/2025 —
        111 Retenciones trabajo/profesionales Trimestral ACTIVA 01/02/2026 —
        115 Retenciones arrendamientos Trimestral ACTIVA 01/02/2026 —
      `),
    );
    expect(result).toMatchObject({
      status: "RESOLVED",
      envelope: {
        detectedDocumentType: "AEAT_OBLIGATIONS_VIEW",
        isComplete: true,
      },
    });
    expect(
      result.facts.find(
        (fact) => fact.factType === "CENSUS.PERIODIC_OBLIGATIONS",
      )?.normalizedValue,
    ).toEqual(["111", "115", "303"]);
  });

  it("keeps a structured but unmapped obligation visible as an incomplete list", () => {
    const result = extractFiscalDocumentText(
      input(`
        Mis obligaciones tributarias
        Modelo Descripción Periodicidad Estado Alta Baja
        130 Pago fraccionado IRPF Trimestral ACTIVA 01/01/2026 —
        349 Operaciones intracomunitarias Variable
        ACTIVA 01/03/2026 —
      `),
    );
    expect(result.envelope).toMatchObject({
      detectedDocumentType: "AEAT_OBLIGATIONS_VIEW",
      isComplete: false,
    });
    expect(result.status).toBe("MANUAL_REVIEW");
    expect(result.warnings.join(" ")).toContain("fila en alta");
    expect(
      result.questionResolutions.some(
        (item) => item.questionId === "N_CENSUS_REVIEWED",
      ),
    ).toBe(false);
  });


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
    expect(result.status).toBe("MANUAL_REVIEW");
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
    expect(
      result.facts.every((fact) => fact.status === "HISTORICAL_ONLY"),
    ).toBe(true);
    expect(
      result.questionResolutions.every(
        (item) => item.confirmationRequired && !item.canSkipQuestion,
      ),
    ).toBe(true);
  });

  it("proposes explicit fields from a filled 036 draft without claiming filing", () => {
    const result = extractFiscalDocumentText(
      input(`
        Modelo 036
        Declaración censal
        NIF 12345678Z
        Tipo de contribuyente: persona física
        Estimación directa simplificada
        Régimen general de IVA
      `),
    );
    expect(result.status).toBe("MANUAL_REVIEW");
    expect(result.envelope).toMatchObject({
      documentKind: "DRAFT",
      filingStatus: "DRAFT",
      isComplete: false,
    });
    expect(result.facts.map((fact) => fact.factType)).toEqual(
      expect.arrayContaining([
        "SUBJECT.TAXPAYER_TYPE",
        "IRPF.METHOD",
        "VAT.REGIMES",
      ]),
    );
    expect(
      result.questionResolutions.every(
        (item) => item.confirmationRequired && !item.canSkipQuestion,
      ),
    ).toBe(true);
  });

  it("never proposes census facts from a blank 036 template", () => {
    const result = extractFiscalDocumentText(
      input(`
        Modelo 036
        Declaración censal
        Tipo de contribuyente
        Estimación directa simplificada
        Régimen general de IVA
      `),
    );
    expect(result).toMatchObject({
      status: "MANUAL_REVIEW",
      envelope: { documentKind: "DRAFT", filingStatus: "DRAFT" },
      facts: [],
      questionResolutions: [],
    });
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

  it("deeply reads a submitted 303 without inventing an absent reverse charge", () => {
    const result = extractFiscalDocumentText(
      input(`
        Modelo 303
        NIF 12345678Z
        Impuesto sobre el Valor Añadido
        Autoliquidación
        Régimen general X
        Ejercicio 2025
        Periodo 4T
        Fecha de presentación 30/01/2026
      `),
    );
    expect(result).toMatchObject({
      status: "RESOLVED",
      envelope: {
        detectedModel: "303",
        fiscalYear: 2025,
        period: "4T",
      },
    });
    expect(result.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ factType: "FILING.MODEL" }),
        expect.objectContaining({ factType: "VAT.FILING_303" }),
        expect.objectContaining({
          factType: "VAT.REGIMES",
          normalizedValue: ["GENERAL"],
        }),
      ]),
    );
    expect(
      result.questionResolutions.some(
        (item) => item.questionId === "E_REVERSE_CHARGE",
      ),
    ).toBe(false);
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

describe("maximum-priority model extractors", () => {
  const submitted = (
    code: string,
    structuralText: string,
    body = "",
    period = "",
    fiscalYear = 2026,
  ) =>
    input(`
      Modelo ${code}
      NIF 12345678Z
      ${structuralText}
      Ejercicio ${fiscalYear}
      ${period ? `Periodo ${period}` : ""}
      ${body}
      Fecha de presentación 14/07/2026
      Justificante ${code}1234567890
    `);

  it.each([
    [
      "130",
      "Pago fraccionado Estimación directa",
      "",
      "IRPF.PAYMENT_130",
      "2T",
    ],
    [
      "131",
      "Pago fraccionado Estimación objetiva",
      "",
      "IRPF.PAYMENT_131",
      "2T",
    ],
    [
      "115",
      "Retenciones e ingresos a cuenta Arrendamiento de inmuebles urbanos",
      "Casilla 01: 1",
      "WITHHOLDING.RENT",
      "2T",
    ],
    [
      "180",
      "Resumen anual Arrendamiento de inmuebles urbanos",
      "Casilla 01: 1",
      "WITHHOLDING.RENT",
      "",
    ],
    [
      "369",
      "Impuesto sobre el Valor Añadido OSS Régimen de la Unión",
      "",
      "ECOMMERCE.OSS_IOSS_OPERATIONS",
      "2T",
    ],
    [
      "390",
      "Impuesto sobre el Valor Añadido Resumen anual Régimen general X",
      "",
      "VAT.ANNUAL_SUMMARY",
      "",
    ],
  ])(
    "extracts an auditable filing fact from model %s",
    (code, structure, body, expectedFact, period) => {
      const result = extractFiscalDocumentText(
        submitted(code, structure, body, period),
      );
      expect(result.status).toBe("RESOLVED");
      expect(result.facts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            factType: expectedFact,
            temporalScope: period ? "SPECIFIC_PERIOD" : "TARGET_FISCAL_YEAR",
            filingVerified: false,
            userConfirmed: false,
            status: "PREFILLED_NEEDS_CONFIRMATION",
          }),
        ]),
      );
    },
  );

  it("does not infer a rent from an unreadable zero/blank 115 liquidation", () => {
    const result = extractFiscalDocumentText(
      submitted(
        "115",
        "Retenciones e ingresos a cuenta Arrendamiento de inmuebles urbanos",
        "Casilla 01: 0 Casilla 02: 0,00 Casilla 03: 0,00",
        "2T",
      ),
    );
    expect(
      result.facts.some((fact) => fact.factType === "WITHHOLDING.RENT"),
    ).toBe(false);
    expect(
      result.questionResolutions.some(
        (item) => item.questionId === "G_RENTS_PREMISES",
      ),
    ).toBe(false);
  });

  it("versions the 190 key semantics and identifies only key A as employees", () => {
    expect(MODEL_190_KEY_DICTIONARY_VERSION).toBe(
      "aeat-model-190-keys.2025.v1",
    );
    expect(
      MODEL_190_KEY_DICTIONARY.filter((entry) => entry.employeeIndicator).map(
        (entry) => entry.key,
      ),
    ).toEqual(["A"]);
    expect(
      MODEL_190_KEY_DICTIONARY.find((entry) => entry.key === "G"),
    ).toMatchObject({ professionalIndicator: true });
  });

  it("maps model 131 to objective estimation only for its explicit period", () => {
    const result = extractFiscalDocumentText(
      submitted("131", "Pago fraccionado Estimación objetiva", "", "1T"),
    );
    expect(
      result.questionResolutions.find(
        (item) => item.questionId === "D_INCOME_TAX_REGIME",
      ),
    ).toMatchObject({
      proposedAnswer: "OBJECTIVE_ESTIMATION",
      temporalScope: "SPECIFIC_PERIOD",
      confirmationRequired: true,
      canSkipQuestion: false,
    });
  });

  it("reads exact positive 111 boxes without calling work recipients employees or all economic recipients professionals", () => {
    const result = extractFiscalDocumentText(
      submitted(
        "111",
        "Retenciones e ingresos a cuenta Rendimientos del trabajo Actividades económicas",
        "Casilla 01: 2 Casilla 07: 3 Casilla 13: 1",
        "2T",
      ),
    );
    expect(result.facts.map((fact) => fact.factType)).toEqual(
      expect.arrayContaining([
        "WITHHOLDING.WORK_RECIPIENTS",
        "WITHHOLDING.ECONOMIC_ACTIVITY_RECIPIENTS",
        "WITHHOLDING.OTHER_IRPF_RECIPIENTS",
      ]),
    );
    expect(
      result.facts.some(
        (fact) => fact.factType === "WITHHOLDING.PROFESSIONAL_RECIPIENTS",
      ),
    ).toBe(false);
    expect(result.questionResolutions.map((item) => item.questionId)).toEqual(
      expect.arrayContaining(["F_OTHER_WITHHOLDING"]),
    );
    expect(
      result.questionResolutions.some(
        (item) => item.questionId === "F_EMPLOYEES",
      ),
    ).toBe(false);
    expect(
      result.questionResolutions.some(
        (item) => item.questionId === "F_PROFESSIONALS",
      ),
    ).toBe(false);
  });

  it("uses explicit annual 190 keys to separate work, professionals and other income", () => {
    const result = extractFiscalDocumentText(
      submitted(
        "190",
        "Resumen anual Rendimientos del trabajo y Actividades económicas",
        "Clave de percepción: A Clave de percepción: G Clave de percepción: H",
        "",
        2025,
      ),
    );
    expect(result.questionResolutions.map((item) => item.questionId)).toEqual(
      expect.arrayContaining([
        "F_EMPLOYEES",
        "F_PROFESSIONALS",
        "F_OTHER_WITHHOLDING",
      ]),
    );
  });

  it("maps a positive reverse-charge box in model 303 but never a zero box", () => {
    const positive = extractFiscalDocumentText(
      submitted(
        "303",
        "Impuesto sobre el Valor Añadido Autoliquidación Régimen general X",
        "Casilla 12: 250,00 Operaciones con inversión del sujeto pasivo",
        "2T",
      ),
    );
    const zero = extractFiscalDocumentText(
      submitted(
        "303",
        "Impuesto sobre el Valor Añadido Autoliquidación Régimen general X",
        "Casilla 12: 0,00 Operaciones con inversión del sujeto pasivo 0,00",
        "2T",
      ),
    );
    expect(
      positive.questionResolutions.find(
        (item) => item.questionId === "E_REVERSE_CHARGE",
      ),
    ).toMatchObject({ proposedAnswer: "YES", confirmationRequired: true });
    expect(
      zero.questionResolutions.some(
        (item) => item.questionId === "E_REVERSE_CHARGE",
      ),
    ).toBe(false);
  });

  it("maps explicit positive EU operations from a 303 without implying ROI", () => {
    const result = extractFiscalDocumentText(
      submitted(
        "303",
        "Impuesto sobre el Valor Añadido Autoliquidación",
        "Casilla 10: 500,00 Adquisiciones intracomunitarias de bienes",
        "2T",
      ),
    );
    expect(
      result.questionResolutions.find(
        (item) => item.questionId === "I_EU_GOODS_PURCHASES",
      ),
    ).toMatchObject({ proposedAnswer: "YES", confirmationRequired: true });
    expect(
      result.questionResolutions.some((item) => item.questionId === "I_ROI"),
    ).toBe(false);
  });

  it("does not treat empty VAT section headings as applied regimes", () => {
    const result = extractFiscalDocumentText(
      submitted(
        "303",
        "Impuesto sobre el Valor Añadido Autoliquidación",
        "Régimen general Régimen simplificado Recargo de equivalencia Casilla 01: 0,00",
        "2T",
      ),
    );
    expect(result.facts.some((fact) => fact.factType === "VAT.REGIMES")).toBe(
      false,
    );
    expect(
      result.questionResolutions.some(
        (item) => item.questionId === "E_VAT_REGIMES",
      ),
    ).toBe(false);
  });

  it("maps only exact 349 keys and never proposes ROI", () => {
    const result = extractFiscalDocumentText(
      submitted(
        "349",
        "Operaciones intracomunitarias Declaración recapitulativa",
        "Clave de operación: E Clave de operación: I",
        "2T",
      ),
    );
    expect(result.questionResolutions.map((item) => item.questionId)).toEqual(
      expect.arrayContaining(["I_EU_GOODS_SALES", "I_EU_SERVICES_PURCHASES"]),
    );
    expect(
      result.questionResolutions.some((item) => item.questionId === "I_ROI"),
    ).toBe(false);
  });

  it("uses a submitted 369 for consumer operations but not current OSS registration", () => {
    const result = extractFiscalDocumentText(
      submitted(
        "369",
        "Impuesto sobre el Valor Añadido OSS Régimen de la Unión",
        "Estado miembro de consumo Francia",
        "2T",
      ),
    );
    expect(
      result.questionResolutions.find(
        (item) => item.questionId === "J_EU_CONSUMERS",
      ),
    ).toMatchObject({ proposedAnswer: "YES" });
    expect(
      result.questionResolutions.some((item) => item.questionId === "J_OSS"),
    ).toBe(false);
  });

  it("maps a filed 035 registration but never turns a later deregistration into No", () => {
    const base = `
      Modelo 035 NIF 12345678Z
      Registro censal de los regímenes especiales OSS
      Régimen de la Unión
      CSV: ABCDEFGH1234
    `;
    const registration = extractFiscalDocumentText(
      input(
        `${base} Causa de presentación Alta en el régimen X Fecha de efecto 01/07/2026`,
      ),
    );
    const deregistration = extractFiscalDocumentText(
      input(
        `${base} Causa de presentación Baja en el régimen X Fecha de baja 30/09/2026`,
      ),
    );
    expect(
      registration.questionResolutions.find(
        (item) => item.questionId === "J_OSS",
      ),
    ).toMatchObject({ proposedAnswer: "YES", confirmationRequired: true });
    expect(
      deregistration.questionResolutions.some(
        (item) => item.questionId === "J_OSS",
      ),
    ).toBe(false);
  });

  it("requires explicit activity or positive rents before model 184 answers the threshold question", () => {
    const baseStructure =
      "Entidades en régimen de atribución de rentas Declaración informativa anual";
    const noActivity = extractFiscalDocumentText(
      submitted("184", baseStructure),
    );
    const activity = extractFiscalDocumentText(
      submitted("184", baseStructure, "Actividad económica: Sí"),
    );
    expect(
      noActivity.questionResolutions.some(
        (item) => item.questionId === "L_ATTRIBUTION_THRESHOLD",
      ),
    ).toBe(false);
    expect(
      activity.questionResolutions.find(
        (item) => item.questionId === "L_ATTRIBUTION_THRESHOLD",
      ),
    ).toMatchObject({ proposedAnswer: "YES" });
  });

  it("keeps a recognized draft fail-closed with no facts or proposals", () => {
    const result = extractFiscalDocumentText(
      input(`
        Modelo 115
        NIF 12345678Z
        Retenciones e ingresos a cuenta
        Arrendamiento de inmuebles urbanos
        Ejercicio 2026
        Periodo 2T
      `),
    );
    expect(result).toMatchObject({
      status: "MANUAL_REVIEW",
      envelope: { documentKind: "DRAFT", filingStatus: "DRAFT" },
      facts: [],
      questionResolutions: [],
    });
  });

  it("does not use a filed 390 to answer that the taxpayer was not exempt", () => {
    const result = extractFiscalDocumentText(
      submitted(
        "390",
        "Impuesto sobre el Valor Añadido Resumen anual Régimen general X",
      ),
    );
    expect(
      result.questionResolutions.some(
        (item) => item.questionId === "E_390_EXEMPT",
      ),
    ).toBe(false);
  });
});

describe("secondary, special and certificate extractors", () => {
  const submitted = (
    code: string,
    structuralText: string,
    body = "",
    period = "",
    fiscalYear = 2026,
  ) =>
    input(`
      Modelo ${code}
      NIF 12345678Z
      ${structuralText}
      Ejercicio ${fiscalYear}
      ${period ? `Periodo ${period}` : ""}
      ${body}
      Fecha de presentación 14/07/2026
      Justificante ${code}9876543210
    `);

  it.each([
    [
      "100",
      "Impuesto sobre la Renta de las Personas Físicas Declaración",
      "",
      "PERSONAL.IRPF_RETURN",
      "",
    ],
    [
      "123",
      "Retenciones e ingresos a cuenta Capital mobiliario",
      "Casilla 01: 1",
      "WITHHOLDING.CAPITAL",
      "2T",
    ],
    [
      "151",
      "Régimen especial Personas desplazadas",
      "",
      "PERSONAL.SPECIAL_ARTICLE_93",
      "",
    ],
    [
      "193",
      "Resumen anual Capital mobiliario",
      "Clave de percepción: B",
      "WITHHOLDING.CAPITAL",
      "",
    ],
    [
      "200",
      "Impuesto sobre Sociedades Declaración",
      "",
      "COMPANY.CORPORATE_TAX",
      "",
    ],
    [
      "202",
      "Impuesto sobre Sociedades Pago fraccionado",
      "",
      "COMPANY.INSTALLMENT_PAYMENT",
      "2T",
    ],
    [
      "216",
      "Impuesto sobre la Renta de No Residentes Retenciones e ingresos a cuenta",
      "Casilla 05: 2",
      "WITHHOLDING.NON_RESIDENTS",
      "2T",
    ],
    [
      "296",
      "Impuesto sobre la Renta de No Residentes Resumen anual",
      "Clave de renta: 02",
      "WITHHOLDING.NON_RESIDENTS",
      "",
    ],
    [
      "308",
      "Impuesto sobre el Valor Añadido Solicitud de devolución Recargo de equivalencia",
      "Importe de la devolución solicitada: 250,00",
      "VAT.SPECIAL_REFUND",
      "",
    ],
    [
      "309",
      "Impuesto sobre el Valor Añadido Liquidación no periódica",
      "Operaciones con inversión del sujeto pasivo: 300,00",
      "VAT.REVERSE_CHARGE",
      "2T",
    ],
    [
      "341",
      "Reintegro de compensaciones Agricultura",
      "Casilla 01: 120,00",
      "VAT.SPECIAL_REFUND",
      "",
    ],
    [
      "347",
      "Operaciones con terceras personas Declaración anual",
      "Importe anual de las operaciones: 4000,00",
      "THIRD_PARTIES.MODEL_347_CANDIDATE",
      "",
    ],
    [
      "714",
      "Impuesto sobre el Patrimonio Declaración",
      "",
      "PERSONAL.WEALTH_TAX",
      "",
    ],
    [
      "720",
      "Bienes y derechos situados en el extranjero Declaración informativa",
      "Clave tipo de bien: C",
      "PERSONAL.FOREIGN_ASSETS",
      "",
    ],
    [
      "721",
      "Monedas virtuales situadas en el extranjero Declaración informativa",
      "Denominación de la moneda virtual: BTC",
      "PERSONAL.FOREIGN_CRYPTO",
      "",
    ],
  ])(
    "extracts only an explicit positive fact from model %s",
    (code, structure, body, expectedFact, period) => {
      const result = extractFiscalDocumentText(
        submitted(code, structure, body, period),
      );
      expect(result.status).toBe("RESOLVED");
      expect(result.facts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            factType: expectedFact,
            filingVerified: false,
            userConfirmed: false,
            status: "PREFILLED_NEEDS_CONFIRMATION",
          }),
        ]),
      );
      expect(
        result.questionResolutions.every(
          (item) => item.confirmationRequired && !item.canSkipQuestion,
        ),
      ).toBe(true);
    },
  );

  it("reads an explicit dated 840 event but not a bare form heading", () => {
    const positive = extractFiscalDocumentText(
      submitted(
        "840",
        "Impuesto sobre Actividades Económicas Alta X",
        "Epígrafe: 501.1 Fecha de alta: 01/07/2026",
      ),
    );
    const bare = extractFiscalDocumentText(
      submitted("840", "Impuesto sobre Actividades Económicas Alta"),
    );
    expect(
      positive.questionResolutions.find(
        (item) => item.questionId === "N_CHANGES",
      ),
    ).toMatchObject({ proposedAnswer: "YES" });
    expect(bare.facts.some((fact) => fact.factType === "IAE.EVENT")).toBe(
      false,
    );
  });

  it("does not infer positive facts from zero-valued 123, 216, 308 or 347 forms", () => {
    const cases = [
      submitted(
        "123",
        "Retenciones e ingresos a cuenta Capital mobiliario",
        "Casilla 01: 0",
        "2T",
      ),
      submitted(
        "216",
        "Impuesto sobre la Renta de No Residentes Retenciones e ingresos a cuenta",
        "Casilla 05: 0",
        "2T",
      ),
      submitted(
        "308",
        "Impuesto sobre el Valor Añadido Solicitud de devolución Recargo de equivalencia",
        "Importe de la devolución solicitada: 0,00",
      ),
      submitted(
        "347",
        "Operaciones con terceras personas Declaración anual",
        "Importe anual de las operaciones: 0,00",
      ),
    ];
    for (const document of cases) {
      const result = extractFiscalDocumentText(document);
      expect(result.facts.map((fact) => fact.factType)).toEqual([
        "FILING.MODEL",
      ]);
      expect(result.questionResolutions).toEqual([]);
    }
  });

  it("reads current positive certificates without requiring a matching NIF", () => {
    const roi = extractFiscalDocumentText(
      input(`
        Certificado tributario
        Operadores intracomunitarios
        Consta inscrito en el Registro de Operadores Intracomunitarios
        Fecha de expedición 14/07/2026
      `),
    );
    const landlord = extractFiscalDocumentText(
      input(`
        Certificado tributario
        Arrendador de inmueble
        Acredita la exoneración de la obligación de retener
        Fecha de expedición 14/07/2026
      `),
    );
    expect(roi.envelope.taxpayerNifMasked).toBeNull();
    expect(
      roi.questionResolutions.find((item) => item.questionId === "I_ROI"),
    ).toMatchObject({ proposedAnswer: "YES", confirmationRequired: true });
    expect(
      landlord.questionResolutions.find(
        (item) => item.questionId === "G_LANDLORD_EXEMPTION",
      ),
    ).toMatchObject({ proposedAnswer: "YES", confirmationRequired: true });
  });

  it("keeps certificate wording without a positive assertion fail-closed", () => {
    const result = extractFiscalDocumentText(
      input(`
        Certificado tributario
        Operadores intracomunitarios
        Información relativa al Registro de Operadores Intracomunitarios
      `),
    );
    expect(result.status).toBe("MANUAL_REVIEW");
    expect(result.facts).toEqual([]);
    expect(result.questionResolutions).toEqual([]);
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
    expect(
      reconciled.find((fact) => fact.factId === older.factId)?.supersededBy,
    ).toBe(newer.factId);
    expect(reconciled).toHaveLength(2);
  });

  it("compares periodic and annual declarations without treating missing evidence as No", () => {
    const periodic = extractFiscalDocumentText(
      input(`
        Modelo 115 NIF 12345678Z
        Retenciones e ingresos a cuenta Arrendamiento de inmuebles urbanos
        Ejercicio 2025 Periodo 4T Casilla 01: 1
        Fecha de presentación 20/01/2026
      `),
    );
    const annual = extractFiscalDocumentText({
      ...input(`
        Modelo 180 NIF 12345678Z
        Resumen anual Arrendamiento de inmuebles urbanos
        Ejercicio 2025 Casilla 01: 1
        Fecha de presentación 31/01/2026
      `),
      documentId: "synthetic-document-2",
    });
    expect(reconcileFiscalDocumentResults([periodic, annual])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reconciliationId: "115-vs-180",
          state: "CONSISTENT_POSITIVE",
          severity: "INFORMATION",
        }),
      ]),
    );

    const annualWithoutPositiveRent = extractFiscalDocumentText({
      ...input(`
        Modelo 180 NIF 12345678Z
        Resumen anual Arrendamiento de inmuebles urbanos
        Ejercicio 2025 Casilla 01: 0
        Fecha de presentación 31/01/2026
      `),
      documentId: "synthetic-document-3",
    });
    expect(
      reconcileFiscalDocumentResults([periodic, annualWithoutPositiveRent]),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reconciliationId: "115-vs-180",
          state: "PARTIAL_EVIDENCE",
          severity: "SOFT_RECONCILIATION",
          explanation: expect.stringContaining("no equivale a No"),
        }),
      ]),
    );
  });
});
