import { describe, expect, it } from "vitest";
import { type BoundedDocumentInput, FiscalNotificationInputError } from "../input-contract";
import { createDocumentSegmentV1, type DocumentSegmentTypeV1, type DocumentSegmentV1 } from "./document-segment.v1";
import { ASSESSMENT_EXTRACTOR_RELEASE_V1, extractAssessmentV1 } from "./assessment-extractor.v1";

const OWNER_SCOPE = "user:synthetic-assessment";
const DOCUMENT_ID = "document:synthetic-assessment";

const PROPOSAL_PAGE = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "NOTIFICACIÓN DEL TRÁMITE DE ALEGACIONES Y",
  "PROPUESTA DE LIQUIDACIÓN PROVISIONAL",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "Número de expediente: EXP-SYN-001",
  "Concepto tributario: Impuesto sobre el Valor Añadido",
  "Modelo: 303",
  "Ejercicio: 2025",
  "Periodo: 4T",
  "N.I.F.: 12345678Z",
  "Nombre y apellidos / Razón social: PERSONA SINTÉTICA",
  "Motivo de la propuesta: Diferencia explícitamente indicada en el documento",
  "Importe declarado: 800,00 euros",
  "Importe considerado: 1.000,00 euros",
  "Base propuesta: 1.000,00 euros",
  "Cuota propuesta: 210,00 euros",
  "Resultado a ingresar: 210,00 euros",
  "Fecha de emisión: 05/02/2026",
  "Fecha de notificación: 07/02/2026",
  "Plazo de alegaciones: Diez días hábiles desde el día siguiente a la notificación",
  "Clave de liquidación: LQ-SYN-001",
  "Requerimiento anterior: REQ-SYN-001",
  "HECHOS Y FUNDAMENTOS DE DERECHO",
  "- Se consigna un hecho sintético explícito",
  "Código Seguro de Verificación (CSV): CSV-SYN-001",
].join("\n");

const FINAL_PAGE = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "NOTIFICACIÓN DE RESOLUCIÓN CON LIQUIDACIÓN PROVISIONAL",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "Número de expediente: EXP-SYN-001",
  "Concepto tributario: Impuesto sobre el Valor Añadido",
  "Modelo: 303",
  "Ejercicio: 2025",
  "Periodo: 4T",
  "N.I.F.: 12345678Z",
  "Nombre y apellidos / Razón social: PERSONA SINTÉTICA",
  "Motivo de la liquidación: Regularización sintética explícita",
  "Base liquidada: 1.000,00 euros",
  "Cuota liquidada: 210,00 euros",
  "Intereses de demora: 4,20 euros",
  "Recargo: 10,00 euros",
  "Resultado de la liquidación: 224,20 euros",
  "Fecha de emisión: 12/03/2026",
  "Fecha de notificación: 14/03/2026",
  "Plazo de pago: 30/04/2026",
  "Clave de liquidación: LQ-SYN-001",
  "Clave de deuda: DEBT-SYN-001",
  "HECHOS Y FUNDAMENTOS DE DERECHO QUE MOTIVAN LA RESOLUCIÓN",
  "- Se mantiene el hecho sintético tras las alegaciones",
  "RECURSOS Y RECLAMACIONES",
  "- Recurso de reposición en los términos impresos en la resolución",
  "Código Seguro de Verificación (CSV): CSV-SYN-002",
].join("\n");

function document(...pagesOrSignal: readonly (string | AbortSignal)[]): BoundedDocumentInput {
  const signal = pagesOrSignal.at(-1) instanceof AbortSignal
    ? pagesOrSignal.at(-1) as AbortSignal
    : undefined;
  const pageTexts = pagesOrSignal.filter((item): item is string => typeof item === "string");
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId: DOCUMENT_ID,
    pages: Object.freeze(pageTexts.map((text, index) => Object.freeze({
      pageNumber: index + 1,
      text,
      isBlank: text.trim().length === 0,
    }))),
    ...(signal ? { signal } : {}),
  });
}

function segment(
  type: DocumentSegmentTypeV1,
  pageFrom: number,
  pageTo = pageFrom,
  suffix = String(pageFrom),
  detectedAuthority: "AEAT" | "UNKNOWN" = "AEAT",
): DocumentSegmentV1 {
  return createDocumentSegmentV1({
    segmentId: `segment:${suffix}`,
    documentId: DOCUMENT_ID,
    segmentType: type,
    pageFrom,
    pageTo,
    detectedTitle: type === "MAIN_ADMINISTRATIVE_ACT" ? "Liquidación sintética" : "Contenido auxiliar sintético",
    detectedAuthority,
    classificationConfidence: 1,
    extractionStatus: "EXTRACTED_REVIEW_REQUIRED",
    contentHash: `sha256:${suffix.padEnd(64, "a").slice(0, 64)}`,
    canGenerateAdministrativeFacts: ["MAIN_ADMINISTRATIVE_ACT", "DEBT_LIST", "PAYMENT_DOCUMENT"].includes(type),
  });
}

describe("assessment extractor v1", () => {
  it("extracts a proposal as an allegations stage without creating a debt claim", () => {
    const output = extractAssessmentV1({
      document: document(PROPOSAL_PAGE),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output.status).toBe("REVIEW_REQUIRED");
    expect(output.familyCandidates).toEqual([
      expect.objectContaining({ familyId: "assessment.allegations_and_proposal", confidence: 1 }),
    ]);
    expect(output.assessmentFacts).toMatchObject({
      stage: "ALLEGATIONS_AND_PROVISIONAL_ASSESSMENT_PROPOSAL",
      expediente: { printedValue: "EXP-SYN-001" },
      taxConcept: { printedValue: "Impuesto sobre el Valor Añadido" },
      model: { printedValue: "303" },
      fiscalYear: { printedValue: "2025" },
      period: { printedValue: "4T" },
      reason: { printedValue: "Diferencia explícitamente indicada en el documento" },
      rawAllegationDeadline: { printedValue: "Diez días hábiles desde el día siguiente a la notificación" },
      liquidationKey: { printedValue: "LQ-SYN-001" },
      priorRequirementReference: { printedValue: "REQ-SYN-001" },
    });
    expect(output.assessmentFacts.moneyFacts.map((fact) => [fact.role, fact.amountCents])).toEqual([
      ["DECLARED_AMOUNT", 80_000],
      ["CONSIDERED_AMOUNT", 100_000],
      ["PROPOSED_BASE", 100_000],
      ["TAX_QUOTA", 21_000],
      ["RESULT", 21_000],
    ]);
    expect(output.entities.map((item) => item.entityKind)).toEqual([
      "ADMINISTRATIVE_ACT", "TAX_PROCEDURE", "PARTY",
    ]);
    expect(output.entities).not.toContainEqual(expect.objectContaining({ entityKind: "DEBT_CLAIM" }));
    expect(output.proceduralDates).toContainEqual(expect.objectContaining({
      dateType: "RESPONSE_DEADLINE",
      rawDeadlineText: "Diez días hábiles desde el día siguiente a la notificación",
      parsedDate: null,
      legallyComputed: false,
    }));
    expect(output).toMatchObject({
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
      permitsAutomaticFamilyConfirmation: false,
    });
  });

  it("extracts a final provisional assessment and an explicit review-only debt claim", () => {
    const output = extractAssessmentV1({
      document: document(FINAL_PAGE),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output.familyCandidates[0]).toMatchObject({
      familyId: "assessment.final_provisional_assessment",
      confidence: 1,
    });
    expect(output.assessmentFacts.stage).toBe("FINAL_PROVISIONAL_ASSESSMENT");
    expect(output.assessmentFacts.moneyFacts.map((fact) => [fact.role, fact.amountCents])).toEqual([
      ["LIQUIDATED_BASE", 100_000],
      ["TAX_QUOTA", 21_000],
      ["LATE_INTEREST", 420],
      ["SURCHARGE", 1_000],
      ["RESULT", 22_420],
    ]);
    expect(output.monetaryComponents.map((item) => [item.componentType, item.amountCents])).toEqual([
      ["OTHER", 100_000],
      ["TAX_QUOTA", 21_000],
      ["LATE_INTEREST", 420],
      ["SURCHARGE", 1_000],
      ["TOTAL_CLAIMED", 22_420],
    ]);
    expect(output.entities).toContainEqual(expect.objectContaining({
      entityKind: "DEBT_CLAIM",
      creationBasis: "EXPLICITLY_PRINTED_DEBT",
    }));
    expect(output.references.map((item) => [item.referenceType, item.rawValue])).toEqual([
      ["EXPEDIENTE_ID", "EXP-SYN-001"],
      ["MODEL", "303"],
      ["FISCAL_YEAR", "2025"],
      ["TAX_PERIOD", "4T"],
      ["NIF", "12345678Z"],
      ["LIQUIDATION_KEY", "LQ-SYN-001"],
      ["DEBT_KEY", "DEBT-SYN-001"],
      ["CSV", "CSV-SYN-002"],
    ]);
    expect(output.proceduralDates).toEqual([
      expect.objectContaining({ dateType: "ISSUE_DATE", parsedDate: "2026-03-12" }),
      expect.objectContaining({ dateType: "EFFECTIVE_NOTIFICATION_DATE", parsedDate: "2026-03-14" }),
      expect.objectContaining({ dateType: "VOLUNTARY_PAYMENT_DEADLINE", parsedDate: "2026-04-30" }),
    ]);
    expect(output.assessmentFacts.printedAppealInformation).toEqual([
      expect.objectContaining({ printedValue: "Recurso de reposición en los términos impresos en la resolución" }),
    ]);
  });

  it("recognizes the exact official narrative used to print a payable result", () => {
    const page = FINAL_PAGE.replace(
      "Resultado de la liquidación: 224,20 euros",
      "Como consecuencia de la liquidación provisional realizada por la Administración resulta una cuota a pagar de 224,20 euros.",
    );
    const output = extractAssessmentV1({
      document: document(page),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output.assessmentFacts.moneyFacts).toContainEqual(expect.objectContaining({
      role: "RESULT",
      amountCents: 22_420,
    }));
    expect(output.entities).toContainEqual(expect.objectContaining({ entityKind: "DEBT_CLAIM" }));
  });

  it("keeps a negative result visible but does not represent it as a debt claim", () => {
    const output = extractAssessmentV1({
      document: document(FINAL_PAGE
        .replace("Cuota liquidada: 210,00 euros\n", "")
        .replace("Intereses de demora: 4,20 euros\n", "")
        .replace("Recargo: 10,00 euros\n", "")
        .replace("224,20 euros", "-50,00 euros")),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output.assessmentFacts.moneyFacts).toContainEqual(expect.objectContaining({
      role: "RESULT",
      amountCents: 5_000,
      sign: "NEGATIVE",
    }));
    expect(output.entities).not.toContainEqual(expect.objectContaining({ entityKind: "DEBT_CLAIM" }));
  });

  it("fails closed on conflicting printed amounts instead of selecting one", () => {
    const output = extractAssessmentV1({
      document: document(FINAL_PAGE.replace(
        "Cuota liquidada: 210,00 euros",
        "Cuota liquidada: 210,00 euros\nCuota liquidada: 211,00 euros",
      )),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output.assessmentFacts.moneyFacts).not.toContainEqual(expect.objectContaining({ role: "TAX_QUOTA" }));
    expect(output.warnings).toContain("CONFLICTING_PRINTED_AMOUNT_TAX_QUOTA");
  });

  it("retains invalid printed data as pending rather than coercing it", () => {
    const output = extractAssessmentV1({
      document: document(FINAL_PAGE
        .replace("Cuota liquidada: 210,00 euros", "Cuota liquidada: doscientos diez euros")
        .replace("12/03/2026", "31/02/2026")),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output.assessmentFacts.moneyFacts).not.toContainEqual(expect.objectContaining({ role: "TAX_QUOTA" }));
    expect(output.warnings).toEqual(expect.arrayContaining([
      "INVALID_PRINTED_AMOUNT_TAX_QUOTA",
      "INVALID_PRINTED_ISSUE_DATE",
    ]));
    expect(output.proceduralDates).toContainEqual(expect.objectContaining({
      dateType: "ISSUE_DATE",
      rawText: "31/02/2026",
      parsedDate: null,
    }));
  });

  it("blocks mixed stages and incompatible authorities", () => {
    const mixed = extractAssessmentV1({
      document: document(`${PROPOSAL_PAGE}\nNOTIFICACIÓN DE RESOLUCIÓN CON LIQUIDACIÓN PROVISIONAL`),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });
    const regional = extractAssessmentV1({
      document: document(PROPOSAL_PAGE.replace("Agencia Tributaria", "Agencia Tributaria Canaria")),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(mixed).toMatchObject({ status: "BLOCKED", warnings: ["CONFLICTING_ASSESSMENT_STAGE"] });
    expect(regional).toMatchObject({ status: "BLOCKED", warnings: ["CONFLICTING_AUTHORITY_OR_TERRITORY"] });
    expect(mixed.entities).toEqual([]);
    expect(regional.entities).toEqual([]);
  });

  it("blocks a guide that quotes an exact title", () => {
    const output = extractAssessmentV1({
      document: document(`Guía de ejemplo\n${PROPOSAL_PAGE}`),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output).toMatchObject({ status: "BLOCKED", warnings: ["CONFLICTING_NON_DOCUMENT_GUIDE"] });
    expect(output.entities).toEqual([]);
    expect(output.assessmentFacts.stage).toBeNull();
  });

  it("returns UNKNOWN with no facts for an unrelated document", () => {
    const output = extractAssessmentV1({
      document: document("Agencia Tributaria\nsede.agenciatributaria.gob.es\nComunicación informativa sintética"),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output.status).toBe("UNKNOWN");
    expect(output.familyCandidates).toEqual([]);
    expect(output.entities).toEqual([]);
    expect(output.assessmentFacts.stage).toBeNull();
  });

  it("uses high-confidence AEAT segment evidence when the logo domain is not extractable as text", () => {
    const withoutDomain = PROPOSAL_PAGE.replace("sede.agenciatributaria.gob.es\n", "");
    const recognized = extractAssessmentV1({
      document: document(withoutDomain),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });
    const unsupported = extractAssessmentV1({
      document: document(withoutDomain),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1, 1, "b", "UNKNOWN")],
    });

    expect(recognized.familyCandidates[0]?.familyId).toBe("assessment.allegations_and_proposal");
    expect(unsupported.status).toBe("UNKNOWN");
    expect(unsupported.entities).toEqual([]);
  });

  it("does not promote values printed only in generic instructions", () => {
    const main = PROPOSAL_PAGE
      .replace("Cuota propuesta: 210,00 euros\n", "")
      .replace("Resultado a ingresar: 210,00 euros\n", "");
    const output = extractAssessmentV1({
      document: document(main, "Cuota propuesta: 999,99 euros\nResultado: 999,99 euros"),
      segments: [
        segment("MAIN_ADMINISTRATIVE_ACT", 1),
        segment("GENERIC_INSTRUCTIONS", 2),
      ],
    });

    expect(output.assessmentFacts.moneyFacts).not.toContainEqual(expect.objectContaining({ role: "TAX_QUOTA" }));
    expect(output.assessmentFacts.moneyFacts).not.toContainEqual(expect.objectContaining({ role: "RESULT" }));
  });

  it("recognizes an incomplete exact title without inventing absent fields", () => {
    const output = extractAssessmentV1({
      document: document([
        "Agencia Tributaria",
        "sede.agenciatributaria.gob.es",
        "NOTIFICACIÓN DEL TRÁMITE DE ALEGACIONES Y",
        "PROPUESTA DE LIQUIDACIÓN PROVISIONAL",
      ].join("\n")),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output.status).toBe("REVIEW_REQUIRED");
    expect(output.familyCandidates[0]?.familyId).toBe("assessment.allegations_and_proposal");
    expect(output.assessmentFacts.moneyFacts).toEqual([]);
    expect(output.assessmentFacts.rawAllegationDeadline).toBeNull();
    expect(output.warnings).toContain("MISSING_EXPLICIT_ALLEGATION_DEADLINE");
  });

  it("rejects unknown keys and observes cancellation", () => {
    const valid = {
      document: document(PROPOSAL_PAGE),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    };
    expect(() => extractAssessmentV1({ ...valid, hiddenPii: "forbidden" } as never)).toThrowError(
      expect.objectContaining<Partial<FiscalNotificationInputError>>({ code: "INVALID_INPUT", path: "assessmentInput.$shape" }),
    );
    const controller = new AbortController();
    controller.abort();
    expect(() => extractAssessmentV1({
      document: document(PROPOSAL_PAGE, controller.signal),
      segments: valid.segments,
    })).toThrowError(expect.objectContaining<Partial<FiscalNotificationInputError>>({ code: "ABORTED" }));
  });

  it("is deterministic, non-mutating and returns defensive immutable outputs", () => {
    const input = Object.freeze({
      document: document(FINAL_PAGE),
      segments: Object.freeze([segment("MAIN_ADMINISTRATIVE_ACT", 1)]),
    });
    const before = JSON.stringify(input);
    const first = extractAssessmentV1(input);
    const second = extractAssessmentV1(input);

    expect(first).toEqual(second);
    expect(JSON.stringify(input)).toBe(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.assessmentFacts)).toBe(true);
    expect(Object.isFrozen(first.assessmentFacts.moneyFacts)).toBe(true);
    expect(() => (first.assessmentFacts.moneyFacts as unknown as unknown[]).push({})).toThrow();
  });

  it("publishes versioned official sources without using them as document facts", () => {
    expect(ASSESSMENT_EXTRACTOR_RELEASE_V1).toMatchObject({
      version: "1.0.0",
      sourcePriority: "DOCUMENT_LITERAL_CONTROLS_FACTS",
      deadlinePolicy: "NO_COMPUTED_DEADLINE",
      proposalPolicy: "PROPOSAL_NEVER_CREATES_DEBT_CLAIM",
      actionPolicy: "NO_DEBT_PAYMENT_DEADLINE_OR_ACCOUNTING_ACTION",
    });
    expect(ASSESSMENT_EXTRACTOR_RELEASE_V1.officialInterpretationSources).toEqual([
      expect.objectContaining({ sourceId: "aeat.procedure.G214", url: expect.stringContaining("agenciatributaria.gob.es") }),
      expect.objectContaining({ sourceId: "boe.lgt.articles.132-133", url: expect.stringContaining("BOE-A-2003-23186") }),
      expect.objectContaining({ sourceId: "boe.rgat.procedure", url: expect.stringContaining("BOE-A-2007-15984") }),
    ]);
  });
});
