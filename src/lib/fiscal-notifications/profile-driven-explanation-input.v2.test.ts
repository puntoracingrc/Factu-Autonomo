import { describe, expect, it } from "vitest";
import { explainFiscalNotificationDocumentV2 } from "./structured-document-explanation.v2";
import { projectProfileDrivenExplanationInputV2 } from "./profile-driven-explanation-input.v2";
import type { FiscalNotificationVerticalSliceReviewDocumentV1 } from "./vertical-slice-review.v1";

function document(): FiscalNotificationVerticalSliceReviewDocumentV1 {
  return {
    reviewDocumentId: "review-document:profile:collection.interest_assessment",
    extractorId: "payment-order",
    familyId: "collection.interest_assessment",
    title: "Liquidación independiente de intereses de demora",
    subtitle: "Título, autoridad y estructura coinciden",
    pageFrom: 1,
    pageTo: 2,
    confidence: 1,
    fields: [
      {
        fieldId: "profile:recognition:document-type:0",
        semantic: "DETAIL",
        canonicalType: "FACT_OR_GROUND",
        label: "Reconocimiento documental",
        displayValue: "Título y autoridad coinciden",
        normalizedValue: "EXACT_TITLE_AND_AUTHORITY",
        amountCents: null,
        currency: null,
        sourcePageNumbers: [1],
        sourceLabel: "Título del documento",
        confidence: 1,
        reviewStatus: "REVIEW_REQUIRED",
      },
      {
        fieldId: "profile:date:EFFECTIVE_NOTIFICATION_DATE:0",
        semantic: "DATE",
        canonicalType: "EFFECTIVE_NOTIFICATION_DATE",
        label: "Fecha efectiva de notificación",
        displayValue: "16/07/2026",
        normalizedValue: "2026-07-16",
        amountCents: null,
        currency: null,
        sourcePageNumbers: [1],
        sourceLabel: "Fecha efectiva de notificación",
        confidence: 1,
        reviewStatus: "REVIEW_REQUIRED",
      },
      {
        fieldId: "profile:money:LATE_PAYMENT_INTEREST:1",
        semantic: "MONEY",
        canonicalType: "LATE_INTEREST",
        label: "Intereses de demora",
        displayValue: "29,91 €",
        normalizedValue: "2991",
        amountCents: 2_991,
        currency: "EUR",
        sourcePageNumbers: [2],
        sourceLabel: "Intereses de demora",
        confidence: 1,
        reviewStatus: "REVIEW_REQUIRED",
      },
      {
        fieldId: "profile:reference:CSV:2",
        semantic: "REFERENCE",
        canonicalType: "CSV",
        label: "Código seguro de verificación",
        displayValue: "Huella protegida 0123456789ab…",
        normalizedValue: "0".repeat(64),
        amountCents: null,
        currency: null,
        sourcePageNumbers: [2],
        sourceLabel: "Código seguro de verificación",
        confidence: 1,
        reviewStatus: "REVIEW_REQUIRED",
      },
    ],
    warnings: [],
    requiresHumanReview: true,
  };
}

describe("profile-driven explanation input v2", () => {
  it("feeds safe structured fields into the explanation without exposing sensitive references", () => {
    const input = projectProfileDrivenExplanationInputV2(document());
    expect(input).toMatchObject({
      familyId: "collection.interest_assessment",
      dates: [{ dateType: "EFFECTIVE_NOTIFICATION_DATE", value: "2026-07-16" }],
      money: [{ moneyType: "LATE_PAYMENT_INTEREST", amountCents: 2_991 }],
      references: [],
      printedEffects: [{ effectCode: "INTEREST_ASSESSED" }],
    });
    const explanation = explainFiscalNotificationDocumentV2(input!);
    expect(
      explanation.sections
        .find((section) => section.id === "RESULT")
        ?.assertions.some((assertion) => assertion.code === "PRINTED_EFFECT_INTEREST_ASSESSED"),
    ).toBe(true);
    expect(explanation.deadlineTriggerAvailable).toBe(true);
    expect(explanation.missingProfileFields.dates).not.toContain(
      "EFFECTIVE_NOTIFICATION_DATE",
    );
    expect(JSON.stringify(input)).not.toContain("Huella protegida");
    expect(JSON.stringify(input)).not.toContain("0".repeat(64));
  });

  it("does not project legacy fields or unknown families", () => {
    const source = document();
    const legacy = {
      ...source,
      fields: source.fields.map((field) =>
        field.fieldId.startsWith("profile:date:")
          ? { ...field, fieldId: "legacy:date" }
          : field,
      ),
    };
    expect(projectProfileDrivenExplanationInputV2(legacy)?.dates).toEqual([]);
    expect(
      projectProfileDrivenExplanationInputV2({
        ...legacy,
        familyId: "legacy.unknown" as typeof legacy.familyId,
      }),
    ).toBeNull();
  });

  it("projects compatible variable effects, deduplicates them and keeps conflicts ambiguous", () => {
    const source = document();
    const variableDocument: FiscalNotificationVerticalSliceReviewDocumentV1 = {
      ...source,
      reviewDocumentId: "review-document:profile:review.suspension_decision",
      familyId: "review.suspension_decision",
      title: "Acuerdo sobre la suspensión solicitada",
      fields: [
        source.fields[0]!,
        {
          ...source.fields[0]!,
          fieldId: "profile:effect:SUSPENSION_GRANTED:0",
          label: "Resultado del documento",
          sourceLabel: "Resultado del documento",
          displayValue: "Resultado identificado en el documento",
          normalizedValue: "EFFECT:SUSPENSION_GRANTED",
        },
        {
          ...source.fields[0]!,
          fieldId: "profile:effect:SUSPENSION_GRANTED:1",
          label: "Resultado del documento",
          sourceLabel: "Resultado del documento",
          displayValue: "Resultado identificado en el documento",
          normalizedValue: "EFFECT:SUSPENSION_GRANTED",
        },
        {
          ...source.fields[0]!,
          fieldId: "profile:effect:SUSPENSION_DENIED:2",
          label: "Resultado del documento",
          sourceLabel: "Resultado del documento",
          displayValue: "Resultado identificado en el documento",
          normalizedValue: "EFFECT:SUSPENSION_DENIED",
        },
        {
          ...source.fields[0]!,
          fieldId: "profile:effect:OFFSET_TOTAL:3",
          normalizedValue: "EFFECT:OFFSET_TOTAL",
        },
      ],
    };

    const input = projectProfileDrivenExplanationInputV2(variableDocument);
    expect((input?.printedEffects ?? []).map(({ effectCode }) => effectCode)).toEqual([
      "SUSPENSION_GRANTED",
      "SUSPENSION_DENIED",
    ]);
    const explanation = explainFiscalNotificationDocumentV2(input!);
    expect(explanation.ambiguities).toEqual(["CONFLICTING_EFFECT_CODES"]);
    expect(
      explanation.sections
        .find((section) => section.id === "RESULT")
        ?.assertions.some((assertion) =>
          assertion.code.startsWith("PRINTED_EFFECT_"),
        ),
    ).toBe(false);
  });

  it("deduplicates an explicit controlled field that repeats an intrinsic exact-title effect", () => {
    const source = document();
    const duplicated: FiscalNotificationVerticalSliceReviewDocumentV1 = {
      ...source,
      fields: [
        ...source.fields,
        {
          ...source.fields[0]!,
          fieldId: "profile:effect:INTEREST_ASSESSED:0",
          normalizedValue: "EFFECT:INTEREST_ASSESSED",
        },
      ],
    };
    expect(
      projectProfileDrivenExplanationInputV2(duplicated)?.printedEffects,
    ).toHaveLength(1);
  });
});
