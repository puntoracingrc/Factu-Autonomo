import { describe, expect, it } from "vitest";
import {
  normalizeTaxProductEvent,
  TAX_PRODUCT_EVENT_CONTRACT_VERSION,
  type TaxProductEventType,
} from "./contracts";

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  occurredAt: "2026-07-16T12:00:00.000Z",
  sessionId: "22222222-2222-4222-8222-222222222222",
};

const samples: Record<TaxProductEventType, Record<string, unknown>> = {
  tax_diagnostic_started: { engineVersion: "engine.v1", rulesetVersion: "rules.v1", fiscalYear: 2026, properties: { entryPoint: "DIRECT" } },
  tax_question_viewed: { questionId: "A_ROLE", questionGroup: "A", properties: { position: 0 } },
  tax_question_answered: { questionId: "A_ROLE", questionGroup: "A", properties: { answerKind: "UNKNOWN", answerSource: "USER", wasChanged: false } },
  tax_question_changed: { questionId: "A_ROLE", questionGroup: "A", properties: { previousAnswerKind: "UNKNOWN", newAnswerKind: "YES", changeOrigin: "USER" } },
  tax_diagnostic_completed: { engineVersion: "engine.v1", rulesetVersion: "rules.v1", properties: { questionCountShown: 20, unknownCount: 1, contradictionCount: 0, documentCount: 0, durationBucket: "2_TO_5M" } },
  tax_diagnostic_abandoned: { questionId: "E_REDEME", questionGroup: "E", properties: { questionsAnswered: 11, unknownCount: 2, durationBucket: "5_TO_15M" } },
  tax_document_scan_started: { properties: { inputType: "SCREENSHOT", pageCountBucket: "ONE", documentCount: 1 } },
  tax_document_classified: { documentFamily: "MODEL_036", extractionMethod: "OCR", confidenceBucket: "HIGH", properties: { classificationResult: "RECOGNIZED", prefilledQuestionCount: 2, extractedFactCount: 3 } },
  tax_document_field_reviewed: { questionId: "E_VAT", documentFamily: "MODEL_036", extractionMethod: "OCR", confidenceBucket: "HIGH", properties: { fieldId: "vatRegimes", action: "CONFIRMED", answeredQuestion: true } },
  tax_document_scan_failed: { properties: { failureCode: "READ_FAILED", extractionStage: "READ", inputType: "PDF", pageCountBucket: "UNKNOWN" } },
  tax_evaluation_generated: { engineVersion: "engine.v1", rulesetVersion: "rules.v1", fiscalYear: 2026, properties: { likelyRequiredCount: 2, possiblyRequiredCount: 3, unlikelyRequiredCount: 10, needsInformationCount: 2, manuallySelectedCount: 1, contradictionCount: 0, documentBackedFactCount: 2 } },
  tax_model_recommendation_viewed: { page: "DIAGNOSTIC", modelNumber: "303", recommendationStatus: "LIKELY_REQUIRED", properties: { reasonExpanded: false, sourcePage: "DIAGNOSTIC" } },
  tax_model_manual_added: { page: "MODELS", modelNumber: "303", properties: { previousRecommendationStatus: "UNLIKELY_REQUIRED", sourcePage: "MODELS" } },
  tax_model_manual_removed: { page: "MODELS", modelNumber: "303", properties: { previousRecommendationStatus: "MANUALLY_SELECTED", sourcePage: "MODELS" } },
  tax_models_saved: { engineVersion: "engine.v1", rulesetVersion: "rules.v1", properties: { recommendedCount: 5, manuallyAddedCount: 1, manuallyRemovedCount: 0 } },
  tax_models_catalog_opened: { page: "MODELS", properties: {} },
  tax_calendar_opened: { page: "CALENDAR", properties: { scope: "ALL" } },
  tax_calendar_event_opened: { page: "CALENDAR", properties: { sourcePage: "CALENDAR" } },
  tax_calendar_filters_used: { page: "CALENDAR", properties: { categoryCount: 3, dateRangeBucket: "32_TO_92_DAYS" } },
  tax_calendar_model_opened: { page: "CALENDAR", modelNumber: "303", properties: { sourcePage: "CALENDAR" } },
};

describe("tax product event contract", () => {
  it.each(Object.entries(samples))("accepts the closed %s schema", (_eventType, sample) => {
    expect(normalizeTaxProductEvent({ ...base, ...sample, eventType: _eventType })).not.toBeNull();
  });
  it("accepts a closed, non-sensitive question event", () => {
    expect(
      normalizeTaxProductEvent({
        ...base,
        eventType: "tax_question_answered",
        page: "DIAGNOSTIC",
        questionId: "E_REDEME",
        questionGroup: "E",
        riskTag: "VAT_PERIODICITY",
        properties: {
          answerKind: "YES",
          answerSource: "USER",
          wasChanged: false,
        },
      }),
    ).toMatchObject({ contractVersion: TAX_PRODUCT_EVENT_CONTRACT_VERSION });
  });

  it("accepts a categorical extractor field without its value", () => {
    expect(
      normalizeTaxProductEvent({
        ...base,
        eventType: "tax_document_field_reviewed",
        documentFamily: "MODEL_036",
        extractionMethod: "NATIVE",
        confidenceBucket: "HIGH",
        properties: {
          fieldId: "VAT_REGIME",
          action: "CONFIRMED",
          answeredQuestion: true,
        },
      }),
    ).not.toBeNull();
  });

  it.each([
    ["unknown property", { extra: true }],
    ["raw fiscal text", { rawText: "texto censal" }],
    ["file name", { fileName: "modelo-036.pdf" }],
  ])("rejects %s", (_label, unsafeProperty) => {
    expect(
      normalizeTaxProductEvent({
        ...base,
        eventType: "tax_models_catalog_opened",
        page: "MODELS",
        properties: unsafeProperty,
      }),
    ).toBeNull();
  });

  it("rejects identifiers that contain a Spanish tax identifier", () => {
    expect(
      normalizeTaxProductEvent({
        ...base,
        eventType: "tax_document_classified",
        documentFamily: "12345678Z",
        extractionMethod: "NATIVE",
        confidenceBucket: "HIGH",
        properties: { classificationResult: "RECOGNIZED" },
      }),
    ).toBeNull();
  });

  it("rejects an incompatible contract version", () => {
    expect(
      normalizeTaxProductEvent({
        ...base,
        contractVersion: "2.0.0",
        eventType: "tax_models_catalog_opened",
        page: "MODELS",
        properties: {},
      }),
    ).toBeNull();
  });
});
