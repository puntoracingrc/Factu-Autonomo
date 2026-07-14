import { describe, expect, it } from "vitest";
import { parseAeatTaxFormText } from "@/lib/fiscal-profile/aeat-tax-form";
import { parseSupportingDocumentText } from "@/lib/fiscal-profile/supporting-document";
import { DIAGNOSTIC_QUESTIONS } from "./questions";
import {
  AEAT_DOCUMENT_QUESTION_CAPABILITIES,
  FISCAL_DOCUMENT_QUESTION_CATALOG_VERSION,
  mapCensusObligationsToQuestions,
  mapSubmittedTaxFormToQuestions,
  mapSupportingDocumentToQuestions,
} from "./aeat-document-questions";

describe("closed AEAT document to diagnostic-question map", () => {
  it("only references questions that exist in the diagnostic", () => {
    const knownQuestions = new Set(
      DIAGNOSTIC_QUESTIONS.map((question) => question.questionId),
    );
    for (const capability of Object.values(
      AEAT_DOCUMENT_QUESTION_CAPABILITIES,
    )) {
      for (const questionId of capability.questionIds) {
        expect(knownQuestions.has(questionId), questionId).toBe(true);
      }
    }
    expect(Object.keys(AEAT_DOCUMENT_QUESTION_CAPABILITIES)).toHaveLength(39);
    expect(FISCAL_DOCUMENT_QUESTION_CATALOG_VERSION).toBe(
      "fiscal-document-question-catalog.2026-07.v1",
    );
  });

  it("maps a submitted 115 to the two rental answers it demonstrates", () => {
    const candidate = parseAeatTaxFormText(`
      Modelo 115 NIF 12345678Z Ejercicio 2026 Período 2T
      Retenciones e ingresos a cuenta por arrendamiento de inmuebles urbanos
      Número de justificante 1151234567890
    `);

    expect(mapSubmittedTaxFormToQuestions(candidate)).toMatchObject([
      {
        field: "rentsBusinessPremises",
        questionId: "G_RENTS_PREMISES",
        value: "YES",
      },
      {
        field: "rentSubjectToWithholding",
        questionId: "G_RENT_WITHHOLDING",
        value: "YES",
      },
    ]);
  });

  it("does not answer questions from a blank form or a recognized ambiguous form", () => {
    const blank115 = parseAeatTaxFormText(`
      Modelo 115 NIF Ejercicio 2026 Período 2T
      Retenciones e ingresos a cuenta por arrendamiento de inmuebles urbanos
    `);
    const submitted130 = parseAeatTaxFormText(`
      Modelo 130 NIF 12345678Z Ejercicio 2026 Período 2T
      Pago fraccionado de actividades en estimación directa
      Número de justificante 1301234567890
    `);

    expect(mapSubmittedTaxFormToQuestions(blank115)).toEqual([]);
    expect(mapSubmittedTaxFormToQuestions(submitted130)).toEqual([]);
  });

  it("uses the same exact mapping for a 115 listed in Mis obligaciones", () => {
    expect(
      mapCensusObligationsToQuestions(["115", "130", "303"]),
    ).toMatchObject([
      { field: "rentsBusinessPremises", value: "YES" },
      { field: "rentSubjectToWithholding", value: "YES" },
    ]);
  });

  it("maps exact 349 record keys to their corresponding questions", () => {
    const candidate = parseAeatTaxFormText(`
      Modelo 349 NIF 12345678Z Ejercicio 2026 Período 2T
      Operaciones intracomunitarias · Declaración recapitulativa
      Clave de operación E
      Clave de operación S
      Número de justificante 3491234567890
    `);
    expect(mapSubmittedTaxFormToQuestions(candidate)).toMatchObject([
      { field: "euGoodsSales", value: "YES" },
      { field: "euServicesSales", value: "YES" },
      { field: "roiRegistered", value: "YES" },
    ]);
  });

  it("maps only explicit positive facts from supporting documents", () => {
    const candidate = parseSupportingDocumentText(`
      Seguridad Social
      Informe de situación actual del trabajador
      Régimen especial de trabajadores por cuenta propia o autónomos
      Situación actual: Alta
    `);
    expect(mapSupportingDocumentToQuestions(candidate)).toMatchObject([
      { field: "retaDuringYear", questionId: "B_RETA", value: "YES" },
    ]);
  });
});
