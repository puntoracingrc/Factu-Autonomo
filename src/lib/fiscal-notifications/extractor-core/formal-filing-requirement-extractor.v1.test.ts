import { describe, expect, it } from "vitest";
import { type BoundedDocumentInput, FiscalNotificationInputError } from "../input-contract";
import { createDocumentSegmentV1, type DocumentSegmentTypeV1, type DocumentSegmentV1 } from "./document-segment.v1";
import {
  FORMAL_FILING_REQUIREMENT_EXTRACTOR_RELEASE_V1,
  extractFormalFilingRequirementV1,
} from "./formal-filing-requirement-extractor.v1";

const OWNER_SCOPE = "user:synthetic-formal-requirement";
const DOCUMENT_ID = "document:synthetic-formal-requirement";

const COMPLETE_REQUIREMENT = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "REQUERIMIENTO DE PRESENTACIÓN DE DECLARACIONES O AUTOLIQUIDACIONES",
  "IDENTIFICACIÓN DEL DOCUMENTO",
  "Número de requerimiento: REQ-SYN-001",
  "Expediente: EXP-SYN-001",
  "N.I.F.: 12345678Z",
  "Nombre y apellidos / Razón social: PERSONA SINTÉTICA",
  "Fecha de emisión: 05/02/2026",
  "Fecha de notificación: 07/02/2026",
  "Motivo del requerimiento: Falta de presentación detectada",
  "Declaraciones o autoliquidaciones no presentadas",
  "MODELO EJERCICIO PERIODO",
  "303 2025 4T",
  "130 2025 4T",
  "Plazo para atender el requerimiento: Diez días hábiles desde el día siguiente a la notificación",
  "Canal de respuesta: Sede electrónica de la AEAT",
  "Documentación a aportar",
  "- Declaración o autoliquidación omitida",
  "Consecuencias del incumplimiento",
  "- Podrá continuar el procedimiento según se indica en el documento",
  "Código Seguro de Verificación (CSV): CSV-SYN-001",
].join("\n");

function document(
  ...pagesOrSignal: readonly (string | AbortSignal)[]
): BoundedDocumentInput {
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
): DocumentSegmentV1 {
  return createDocumentSegmentV1({
    segmentId: `segment:${suffix}`,
    documentId: DOCUMENT_ID,
    segmentType: type,
    pageFrom,
    pageTo,
    detectedTitle: type === "MAIN_ADMINISTRATIVE_ACT" ? "Requerimiento formal sintético" : "Contenido auxiliar sintético",
    detectedAuthority: "AEAT",
    classificationConfidence: 1,
    extractionStatus: "EXTRACTED_REVIEW_REQUIRED",
    contentHash: `sha256:${suffix.padEnd(64, "a").slice(0, 64)}`,
    canGenerateAdministrativeFacts: ["MAIN_ADMINISTRATIVE_ACT", "DEBT_LIST", "PAYMENT_DOCUMENT"].includes(type),
  });
}

describe("formal filing requirement extractor v1", () => {
  it("extracts only the fields printed in a complete formal filing requirement", () => {
    const output = extractFormalFilingRequirementV1({
      document: document(COMPLETE_REQUIREMENT),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output.status).toBe("REVIEW_REQUIRED");
    expect(output.familyCandidates).toEqual([
      expect.objectContaining({ familyId: "compliance.formal_filing_requirement", confidence: 1 }),
    ]);
    expect(output.requirementFacts).toMatchObject({
      requirementNumber: { printedValue: "REQ-SYN-001" },
      expediente: { printedValue: "EXP-SYN-001" },
      taxId: { printedValue: "12345678Z" },
      recipient: { printedValue: "PERSONA SINTÉTICA" },
      reason: { printedValue: "Falta de presentación detectada" },
      rawDeadlineText: { printedValue: "Diez días hábiles desde el día siguiente a la notificación" },
      responseChannel: { printedValue: "Sede electrónica de la AEAT" },
      csv: { printedValue: "CSV-SYN-001" },
    });
    expect(output.requirementFacts.obligations).toEqual([
      expect.objectContaining({ model: "303", fiscalYear: "2025", period: "4T", sourcePage: 1 }),
      expect.objectContaining({ model: "130", fiscalYear: "2025", period: "4T", sourcePage: 1 }),
    ]);
    expect(output.requirementFacts.documentationRequired).toEqual([
      expect.objectContaining({ printedValue: "Declaración o autoliquidación omitida" }),
    ]);
    expect(output.requirementFacts.explicitConsequences).toEqual([
      expect.objectContaining({ printedValue: "Podrá continuar el procedimiento según se indica en el documento" }),
    ]);
    expect(output.references.map((item) => [item.referenceType, item.rawValue])).toEqual([
      ["ACT_ID", "REQ-SYN-001"],
      ["EXPEDIENTE_ID", "EXP-SYN-001"],
      ["NIF", "12345678Z"],
      ["CSV", "CSV-SYN-001"],
      ["MODEL", "303"],
      ["FISCAL_YEAR", "2025"],
      ["TAX_PERIOD", "4T"],
      ["MODEL", "130"],
      ["FISCAL_YEAR", "2025"],
      ["TAX_PERIOD", "4T"],
    ]);
    expect(output.proceduralDates).toEqual([
      expect.objectContaining({ dateType: "ISSUE_DATE", parsedDate: "2026-02-05", explicitlyPrinted: true }),
      expect.objectContaining({ dateType: "EFFECTIVE_NOTIFICATION_DATE", parsedDate: "2026-02-07", explicitlyPrinted: true }),
      expect.objectContaining({
        dateType: "RESPONSE_DEADLINE",
        rawDeadlineText: "Diez días hábiles desde el día siguiente a la notificación",
        parsedDate: null,
        legallyComputed: false,
      }),
    ]);
    expect(output.entities.map((item) => item.entityKind)).toEqual([
      "ADMINISTRATIVE_ACT", "TAX_PROCEDURE", "PARTY",
    ]);
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
    expect(output.monetaryComponents).toEqual([]);
  });

  it("keeps model, year and period as explicit row combinations without a cross-product", () => {
    const output = extractFormalFilingRequirementV1({
      document: document(COMPLETE_REQUIREMENT.replace("130 2025 4T", "111 2024 ANUAL")),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output.requirementFacts.obligations.map(({ model, fiscalYear, period }) => ({ model, fiscalYear, period }))).toEqual([
      { model: "303", fiscalYear: "2025", period: "4T" },
      { model: "111", fiscalYear: "2024", period: "ANUAL" },
    ]);
  });

  it("returns UNKNOWN and no facts for an unrelated document", () => {
    const output = extractFormalFilingRequirementV1({
      document: document("Agencia Tributaria\nsede.agenciatributaria.gob.es\nComunicación informativa sintética"),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output.status).toBe("UNKNOWN");
    expect(output.familyCandidates).toEqual([]);
    expect(output.entities).toEqual([]);
    expect(output.references).toEqual([]);
    expect(output.requirementFacts.obligations).toEqual([]);
  });

  it("blocks a conflicting authority instead of extracting convincing-looking fields", () => {
    const output = extractFormalFilingRequirementV1({
      document: document(COMPLETE_REQUIREMENT.replace("Agencia Tributaria", "Agencia Tributaria Canaria")),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output.status).toBe("BLOCKED");
    expect(output.familyCandidates).toEqual([]);
    expect(output.entities).toEqual([]);
    expect(output.references).toEqual([]);
    expect(output.warnings).toContain("CONFLICTING_AUTHORITY_OR_TERRITORY");
  });

  it("fails closed on conflicting values instead of selecting one", () => {
    const output = extractFormalFilingRequirementV1({
      document: document(COMPLETE_REQUIREMENT.replace(
        "Número de requerimiento: REQ-SYN-001",
        "Número de requerimiento: REQ-SYN-001\nNúmero de requerimiento: REQ-SYN-002",
      )),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output.requirementFacts.requirementNumber).toBeNull();
    expect(output.references).not.toContainEqual(expect.objectContaining({ referenceType: "ACT_ID" }));
    expect(output.warnings).toContain("CONFLICTING_REQUIREMENT_NUMBER");
  });

  it("recognizes an incomplete requirement but never invents missing obligations or a deadline", () => {
    const incomplete = [
      "Agencia Tributaria",
      "sede.agenciatributaria.gob.es",
      "REQUERIMIENTO DE PRESENTACIÓN DE DECLARACIONES O AUTOLIQUIDACIONES",
      "Declaraciones o autoliquidaciones no presentadas",
      "Número de requerimiento: REQ-SYN-INCOMPLETE",
    ].join("\n");
    const output = extractFormalFilingRequirementV1({
      document: document(incomplete),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output.status).toBe("REVIEW_REQUIRED");
    expect(output.requirementFacts.obligations).toEqual([]);
    expect(output.requirementFacts.rawDeadlineText).toBeNull();
    expect(output.proceduralDates).toEqual([]);
    expect(output.warnings).toEqual(expect.arrayContaining([
      "MISSING_EXPLICIT_OBLIGATION_ROWS",
      "MISSING_EXPLICIT_RESPONSE_DEADLINE",
    ]));
  });

  it("retains an invalid printed date as raw evidence without converting it", () => {
    const output = extractFormalFilingRequirementV1({
      document: document(COMPLETE_REQUIREMENT.replace("05/02/2026", "31/02/2026")),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(output.proceduralDates).toContainEqual(expect.objectContaining({
      dateType: "ISSUE_DATE",
      rawText: "31/02/2026",
      parsedDate: null,
    }));
    expect(output.warnings).toContain("INVALID_PRINTED_ISSUE_DATE");
  });

  it("does not promote tempting fields printed only in generic instructions", () => {
    const main = [
      "Agencia Tributaria",
      "sede.agenciatributaria.gob.es",
      "REQUERIMIENTO DE PRESENTACIÓN DE DECLARACIONES O AUTOLIQUIDACIONES",
      "Declaraciones o autoliquidaciones no presentadas",
    ].join("\n");
    const instructions = [
      "Número de requerimiento: FALSE-GENERIC-001",
      "303 2025 4T",
      "Plazo: Cinco días",
    ].join("\n");
    const output = extractFormalFilingRequirementV1({
      document: document(main, instructions),
      segments: [
        segment("MAIN_ADMINISTRATIVE_ACT", 1),
        segment("GENERIC_INSTRUCTIONS", 2),
      ],
    });

    expect(output.requirementFacts.requirementNumber).toBeNull();
    expect(output.requirementFacts.obligations).toEqual([]);
    expect(output.requirementFacts.rawDeadlineText).toBeNull();
    expect(output.references).toEqual([]);
  });

  it("rejects unknown input keys and observes cancellation", () => {
    const valid = {
      document: document(COMPLETE_REQUIREMENT),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    };
    expect(() => extractFormalFilingRequirementV1({ ...valid, hiddenPii: "forbidden" } as never)).toThrowError(
      expect.objectContaining<Partial<FiscalNotificationInputError>>({ code: "INVALID_INPUT", path: "requirementInput.$shape" }),
    );

    const controller = new AbortController();
    controller.abort();
    expect(() => extractFormalFilingRequirementV1({
      document: document(COMPLETE_REQUIREMENT, controller.signal),
      segments: valid.segments,
    })).toThrowError(expect.objectContaining<Partial<FiscalNotificationInputError>>({ code: "ABORTED" }));
  });

  it("is deterministic, leaves inputs unchanged and returns defensive immutable outputs", () => {
    const input = Object.freeze({
      document: document(COMPLETE_REQUIREMENT),
      segments: Object.freeze([segment("MAIN_ADMINISTRATIVE_ACT", 1)]),
    });
    const before = JSON.stringify(input);
    const first = extractFormalFilingRequirementV1(input);
    const second = extractFormalFilingRequirementV1(input);

    expect(first).toEqual(second);
    expect(JSON.stringify(input)).toBe(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.entities)).toBe(true);
    expect(Object.isFrozen(first.requirementFacts)).toBe(true);
    expect(Object.isFrozen(first.requirementFacts.obligations)).toBe(true);
    expect(() => (first.requirementFacts.obligations as unknown as unknown[]).push({})).toThrow();
  });

  it("publishes versioned official interpretation sources without treating them as document facts", () => {
    expect(FORMAL_FILING_REQUIREMENT_EXTRACTOR_RELEASE_V1).toMatchObject({
      version: "1.0.0",
      familyId: "compliance.formal_filing_requirement",
      sourcePriority: "DOCUMENT_LITERAL_CONTROLS_FACTS",
      deadlinePolicy: "NO_COMPUTED_DEADLINE",
      actionPolicy: "NO_DEBT_PAYMENT_DEADLINE_OR_ACCOUNTING_ACTION",
    });
    expect(FORMAL_FILING_REQUIREMENT_EXTRACTOR_RELEASE_V1.officialInterpretationSources).toEqual([
      expect.objectContaining({ sourceId: "aeat.procedure.G223", url: expect.stringContaining("agenciatributaria.gob.es") }),
      expect.objectContaining({ sourceId: "boe.lgt.article.123", url: expect.stringContaining("BOE-A-2003-23186") }),
      expect.objectContaining({ sourceId: "boe.rgat.article.153", url: expect.stringContaining("BOE-A-2007-15984") }),
    ]);
  });
});
