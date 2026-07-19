import { describe, expect, it } from "vitest";
import { analyzeFiscalNotificationDocumentInput } from "./document-input-analysis";
import type { BoundedDocumentInput } from "./input-contract";

function input(text: string): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-p0-pipeline",
    documentId: "document-p0-pipeline-synthetic",
    pages: Object.freeze([Object.freeze({ pageNumber: 1, text, isBlank: false })]),
  });
}

describe("AEAT P0 deep pipeline v10", () => {
  it("prefers the deep submission-receipt review over the basic v9 title profile", async () => {
    const rawMarker = "RAW-P0-PIPELINE-CONTENT-MUST-DISAPPEAR";
    const result = await analyzeFiscalNotificationDocumentInput(input([
      "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA",
      "Justificante de presentación, contestación o aportación documental",
      "JUSTIFICANTE",
      "PRESENTACIÓN",
      "REGISTRO",
      "Número de entrada de registro: REG-SYNTHETIC-001",
      "Fecha de presentación: 17/07/2026",
      "Presentado: Presentado",
      "Código Seguro de Verificación: CSV-SYNTHETIC-PIPELINE-001",
      rawMarker,
    ].join("\n")));

    const deepDocuments = result.verticalSliceReview.documents.filter(
      (document) => document.familyId === "evidence.submission_receipt",
    );
    expect(deepDocuments).toHaveLength(1);
    expect(deepDocuments[0]).toMatchObject({
      extractorId: "informative-communication",
      title: "Justificante de presentación, contestación o aportación documental",
      subtitle: "Datos estructurados listos para revisar",
      requiresHumanReview: true,
    });
    expect(deepDocuments[0]?.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ canonicalType: "FILING_RECEIPT_ID", normalizedValue: "REG-SYNTHETIC-001" }),
      expect.objectContaining({ canonicalType: "ACTION_DATE", normalizedValue: "2026-07-17" }),
      expect.objectContaining({ label: "Resultado de la presentación", normalizedValue: "Presentación realizada" }),
      expect.objectContaining({ displayValue: "CSV protegido", normalizedValue: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u) }),
    ]));
    expect(result.verticalSliceReview.retainedSourceContent).toBe("NONE");
    expect(result.verticalSliceReview.materializationPolicy).toBe("PROHIBITED_UNTIL_HUMAN_REVIEW");
    expect(JSON.stringify(result)).not.toContain(rawMarker);
    expect(JSON.stringify(result)).not.toContain("CSV-SYNTHETIC-PIPELINE-001");
    expect(JSON.stringify(result)).not.toMatch(/P0_V10|SUBMITTED/u);
  });

  it("keeps a recognized but incomplete resolution visible for human completion", async () => {
    const result = await analyzeFiscalNotificationDocumentInput(input([
      "AGENCIA TRIBUTARIA",
      "Resolución de rectificación",
      "RESOLUCIÓN",
      "RECTIFICACIÓN DE AUTOLIQUIDACIÓN",
      "Resolución: ACT-SYNTHETIC-001",
    ].join("\n")));
    const document = result.verticalSliceReview.documents.find(
      (item) => item.familyId === "assessment.rectification_resolution",
    );
    expect(document).toBeDefined();
    expect(document?.subtitle).toBe("Revisa los datos detectados y completa los que falten");
    expect(document?.warnings).toEqual([]);
    expect(JSON.stringify(document)).not.toContain("P0_V10_MISSING_");
  });
});
