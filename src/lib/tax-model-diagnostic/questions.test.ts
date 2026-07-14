import { describe, expect, it } from "vitest";

import { TAX_MODEL_NUMBERS } from "./profile";
import { DIAGNOSTIC_QUESTIONS, QUESTION_SECTIONS } from "./questions";

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
});

