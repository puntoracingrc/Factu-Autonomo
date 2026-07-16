import { describe, expect, it } from "vitest";
import {
  aggregateTaxDiagnosticInsights,
  initialProductThresholds,
  renderTaxDiagnosticInsightsMarkdown,
} from "./aggregate.mjs";

const at = "2026-07-01T10:00:00.000Z";
const session = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const event = (event_type, n, extra = {}) => ({
  occurred_at: at,
  session_id: session(n),
  event_type,
  properties: {},
  ...extra,
});

describe("tax diagnostic insight aggregation", () => {
  it("uses explicit denominators and synthesizes expired abandonment", () => {
    const report = aggregateTaxDiagnosticInsights([
      event("tax_diagnostic_started", 1),
      event("tax_question_viewed", 1, { question_id: "A_ROLE", question_group: "A" }),
      event("tax_question_answered", 1, { question_id: "A_ROLE", properties: { answerKind: "UNKNOWN" } }),
      event("tax_diagnostic_started", 2),
      event("tax_diagnostic_completed", 2),
      event("tax_evaluation_generated", 2),
      event("tax_models_saved", 2),
      event("tax_calendar_opened", 2),
    ], { generatedAt: "2026-07-03T10:00:00.000Z" });

    expect(report.funnel.completionRate).toEqual({ numerator: 1, denominator: 2, rate: 0.5 });
    expect(report.funnel.abandoned).toBe(1);
    expect(report.questions[0].unknownRate).toEqual({ numerator: 1, denominator: 1, rate: 1 });
    expect(report.questions[0].estimatedDropoffRate).toEqual({ numerator: 1, denominator: 1, rate: 1 });
    expect(report.safeguards.authorizedFiscalExclusion).toBe(false);
  });

  it("does not signal below the configured minimum volume", () => {
    const report = aggregateTaxDiagnosticInsights([
      event("tax_question_viewed", 1, { question_id: "E_REDEME", question_group: "E" }),
      event("tax_question_answered", 1, { question_id: "E_REDEME", properties: { answerKind: "UNKNOWN" } }),
    ]);
    expect(report.signals).toEqual([]);
    expect(report.recommendations).toEqual(["NO_ACTION"]);
  });

  it("supports configurable thresholds without changing fiscal safeguards", () => {
    const thresholds = structuredClone(initialProductThresholds);
    thresholds.questions.unknownRate.minimum = 1;
    const report = aggregateTaxDiagnosticInsights([
      event("tax_question_viewed", 1, { question_id: "E_REDEME", question_group: "E" }),
      event("tax_question_answered", 1, { question_id: "E_REDEME", properties: { answerKind: "UNKNOWN" } }),
    ], { thresholds });
    expect(report.signals[0].signal).toBe("COPY_OR_HELP_REVIEW");
    expect(report.safeguards).toMatchObject({ changesRulesAutomatically: false, approvesFiscalRules: false });
  });

  it("detects a ten-point document regression against the previous period", () => {
    const previous = { documents: [{ key: "MODEL_036|V1|OCR", recognitionRate: { rate: 1 } }] };
    const events = Array.from({ length: 10 }, (_, index) => event("tax_document_classified", index + 1, {
      document_family: "MODEL_036",
      layout_version: "V1",
      extraction_method: "OCR",
      properties: { classificationResult: index < 8 ? "RECOGNIZED" : "UNRECOGNIZED" },
    }));
    const report = aggregateTaxDiagnosticInsights(events, { previous });
    expect(report.regressions).toHaveLength(1);
    expect(report.regressions[0].action).toBe("REGRESSION_TEST_NEEDED");
  });

  it("uses the final field review action for correction metrics", () => {
    const shared = {
      document_family: "MODEL_036",
      extraction_method: "OCR",
      properties: { fieldId: "VAT_REGIME", action: "CONFIRMED", answeredQuestion: true },
    };
    const report = aggregateTaxDiagnosticInsights([
      event("tax_document_classified", 1, {
        document_family: "MODEL_036",
        extraction_method: "OCR",
        properties: { classificationResult: "RECOGNIZED" },
      }),
      event("tax_document_field_reviewed", 1, shared),
      event("tax_document_field_reviewed", 1, {
        ...shared,
        occurred_at: "2026-07-01T10:01:00.000Z",
        properties: { ...shared.properties, action: "CORRECTED" },
      }),
    ]);

    expect(report.documents[0].fieldCorrectionRate).toEqual({
      numerator: 1,
      denominator: 1,
      rate: 1,
    });
    expect(report.documents[0].fieldConfirmationRate.numerator).toBe(0);
    expect(report.documents[0].documentConfirmedFactYield.numerator).toBe(0);
  });

  it("renders a short report with volumes and no identities", () => {
    const report = aggregateTaxDiagnosticInsights([]);
    const markdown = renderTaxDiagnosticInsightsMarkdown(report);
    expect(markdown).toContain("DATA_VOLUME_INSUFFICIENT");
    expect(markdown).toContain("0/0");
    expect(markdown).not.toContain("session_id");
  });
});
