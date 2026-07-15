import { describe, expect, it } from "vitest";

import { TAX_MODEL_NUMBERS } from "./profile";
import { createEmptyTaxpayerProfile } from "./profile";
import {
  DIAGNOSTIC_QUESTIONS,
  isQuestionApplicable,
  QUESTION_SECTIONS,
} from "./questions";

describe("diagnostic question tree", () => {
  it("mantiene las catorce secciones A-N y preguntas únicas", () => {
    expect(QUESTION_SECTIONS.map((section) => section.sectionId)).toEqual(
      "ABCDEFGHIJKLMN".split(""),
    );
    expect(new Set(DIAGNOSTIC_QUESTIONS.map((question) => question.questionId)).size)
      .toBe(DIAGNOSTIC_QUESTIONS.length);
  });

  it("explica cada pregunta y cubre todos los modelos", () => {
    const affected = new Set(
      DIAGNOSTIC_QUESTIONS.flatMap((question) => question.affectedModels),
    );
    for (const question of DIAGNOSTIC_QUESTIONS) {
      expect(question.explanation.length).toBeGreaterThan(10);
      expect(question.why.length).toBeGreaterThan(10);
      expect(question.example.length).toBeGreaterThan(10);
      expect(question.supportingDocument.length).toBeGreaterThan(10);
    }
    for (const model of TAX_MODEL_NUMBERS) expect(affected.has(model)).toBe(true);
  });

  it("pregunta de forma explícita si la actividad sigue activa y solo pide fecha al cesar", () => {
    const activeQuestion = DIAGNOSTIC_QUESTIONS.find(
      (question) => question.questionId === "B_ACTIVITY_ACTIVE",
    );
    const endDateQuestion = DIAGNOSTIC_QUESTIONS.find(
      (question) => question.questionId === "B_END_DATE",
    );
    expect(activeQuestion?.options).toEqual([
      { value: "YES", label: "Sí, sigue activa" },
      { value: "NO", label: "No, ya cesó" },
    ]);
    expect(activeQuestion?.options?.some((option) => option.value === "UNKNOWN"))
      .toBe(false);
    expect(endDateQuestion?.required).toBe(true);

    const profile = createEmptyTaxpayerProfile();
    expect(isQuestionApplicable(endDateQuestion!, profile)).toBe(false);
    profile.activityStillActive = "NO";
    expect(isQuestionApplicable(endDateQuestion!, profile)).toBe(true);
  });

  it("explica RETA como el alta de autónomos en la Seguridad Social", () => {
    const reta = DIAGNOSTIC_QUESTIONS.find(
      (question) => question.questionId === "B_RETA",
    );
    expect(reta?.label).toContain("Seguridad Social (RETA)");
    expect(reta?.explanation).toContain(
      "Régimen Especial de Trabajadores Autónomos",
    );
  });

  it("muestra ejemplos para actividad profesional y empresarial sin ofrecer no lo sé", () => {
    const activity = DIAGNOSTIC_QUESTIONS.find(
      (question) => question.questionId === "C_ACTIVITY_KINDS",
    );
    const professional = activity?.options?.find(
      (option) => option.value === "PROFESSIONAL",
    );
    const business = activity?.options?.find(
      (option) => option.value === "BUSINESS",
    );
    expect(professional?.description).toContain("arquitecto");
    expect(business?.description).toContain("comercio");
    expect(activity?.options?.some((option) => /no lo sé/i.test(option.label)))
      .toBe(false);
  });

  it("explica REDEME y SII sin exigir que el usuario conozca las siglas", () => {
    const redeme = DIAGNOSTIC_QUESTIONS.find(
      (question) => question.questionId === "E_REDEME",
    );
    const sii = DIAGNOSTIC_QUESTIONS.find(
      (question) => question.questionId === "E_SII",
    );
    expect(redeme?.label).toContain("Registro de Devolución Mensual");
    expect(redeme?.explanation).toContain("pedir cada mes");
    expect(sii?.explanation).toContain("Suministro Inmediato de Información");
    expect(sii?.explanation).toContain("No es simplemente hacer facturas");
  });

  it("explica en lenguaje normal la inversión del sujeto pasivo y las devoluciones especiales", () => {
    const reverseCharge = DIAGNOSTIC_QUESTIONS.find(
      (question) => question.questionId === "E_REVERSE_CHARGE",
    );
    const specialRefund = DIAGNOSTIC_QUESTIONS.find(
      (question) => question.questionId === "E_SPECIAL_REFUND",
    );
    expect(reverseCharge?.explanation).toContain("quien compra");
    expect(reverseCharge?.explanation).toContain(
      "inversión del sujeto pasivo",
    );
    expect(specialRefund?.explanation).toContain(
      "no a que un 303 corriente te saliera a devolver",
    );
    expect(specialRefund?.explanation).toContain("modelos 308 o 341");
  });

  it("explica la exoneración del arrendador desde el punto de vista del inquilino", () => {
    const exemption = DIAGNOSTIC_QUESTIONS.find(
      (question) => question.questionId === "G_LANDLORD_EXEMPTION",
    );
    expect(exemption?.label).toContain("propietario que te alquila");
    expect(exemption?.explanation).toContain(
      "El arrendador es la persona o empresa que te cobra el alquiler",
    );
    expect(exemption?.explanation).toContain("modelo 115");
    expect(exemption?.example).toContain("certificado vigente");
  });

  it("explica las tres preguntas de capital y no residentes con ejemplos cotidianos", () => {
    const capital = DIAGNOSTIC_QUESTIONS.find(
      (question) => question.questionId === "H_CAPITAL",
    );
    const nonResident = DIAGNOSTIC_QUESTIONS.find(
      (question) => question.questionId === "H_NON_RESIDENT",
    );
    const confirmed = DIAGNOSTIC_QUESTIONS.find(
      (question) => question.questionId === "H_NON_RESIDENT_CONFIRMED",
    );
    expect(capital?.explanation).toContain("dinero que tú o tu empresa pagaste");
    expect(capital?.example).toContain("prestó dinero al negocio");
    expect(nonResident?.label).toContain("residencia fiscal");
    expect(nonResident?.explanation).toContain(
      "una factura extranjera no significa automáticamente",
    );
    expect(confirmed?.label).toContain("modelos 216 y 296");
    expect(confirmed?.example).toContain("tu asesoría");
  });

  it("explica el bloque 347 como suma anual por tercero y revisión de exclusiones", () => {
    const threshold = DIAGNOSTIC_QUESTIONS.find(
      (question) => question.questionId === "K_THRESHOLD",
    );
    const excluded = DIAGNOSTIC_QUESTIONS.find(
      (question) => question.questionId === "K_ALL_EXCLUDED",
    );
    expect(threshold?.label).toContain("3.005,06 € (IVA incluido)");
    expect(threshold?.explanation).toContain("total acumulado");
    expect(threshold?.example).toContain("Cuatro facturas de 900 €");
    expect(excluded?.explanation).toContain(
      "Responde «Sí» solo si todas las operaciones",
    );
    expect(excluded?.example).toContain("la respuesta global es «No»");
  });

  it("explica cómo reconocer una posible obligación de Patrimonio", () => {
    const wealth = DIAGNOSTIC_QUESTIONS.find(
      (question) => question.questionId === "M_WEALTH",
    );
    expect(wealth?.label).toContain("A 31 de diciembre");
    expect(wealth?.explanation).toContain("no mira lo que facturaste");
    expect(wealth?.explanation).toContain("2.000.000 €");
    expect(wealth?.explanation).toContain("comunidad autónoma");
    expect(wealth?.example).toContain("Para saberlo");
  });
});
