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

  it("projects supported observed fields independently of the extractor prefix", () => {
    const source = document();
    const specialized: FiscalNotificationVerticalSliceReviewDocumentV1 = {
      ...source,
      reviewDocumentId: "review-document:specialized:seizure.bank_account",
      extractorId: "seizure",
      familyId: "seizure.bank_account",
      title: "Diligencia de embargo de cuenta bancaria",
      fields: [
        {
          ...source.fields[3]!,
          fieldId: "reference:1:EXPEDIENTE_ID",
          canonicalType: "EXPEDIENTE_ID",
          label: "Número de expediente",
          sourceLabel: "Número de expediente",
          displayValue: "EXP-SYNTH-001",
          normalizedValue: "EXP-SYNTH-001",
        },
        {
          ...source.fields[1]!,
          fieldId: "date:seizure:issue-date",
          canonicalType: "ISSUE_DATE",
          label: "Fecha de emisión",
          sourceLabel: "Fecha de emisión",
          displayValue: "03/03/2026",
          normalizedValue: "2026-03-03",
        },
        {
          ...source.fields[1]!,
          fieldId: "date:seizure:response-deadline",
          canonicalType: "RESPONSE_DEADLINE",
          label: "Plazo de contestación",
          sourceLabel: "Plazo de contestación",
          displayValue: "12/03/2026",
          normalizedValue: "2026-03-12",
        },
        {
          ...source.fields[2]!,
          fieldId: "seizure-money:1:EXECUTIVE_SURCHARGE",
          semantic: "MONEY",
          canonicalType: "EXECUTIVE_SURCHARGE",
          label: "Recargo ejecutivo",
          sourceLabel: "Recargo ejecutivo",
          displayValue: "20,00 €",
          normalizedValue: null,
          amountCents: 2_000,
          currency: "EUR",
        },
        {
          ...source.fields[0]!,
          fieldId: "detail:SEIZURE_INSTRUCTIONS:1",
          semantic: "DETAIL",
          canonicalType: "SEIZURE_INSTRUCTIONS",
          label: "Instrucciones",
          sourceLabel: "Instrucciones",
          displayValue: "Consta en el documento",
          normalizedValue: "SEIZURE_INSTRUCTIONS",
        },
        {
          ...source.fields[0]!,
          fieldId: "detail:SEIZURE_INSTRUCTIONS:2",
          semantic: "DETAIL",
          canonicalType: "SEIZURE_INSTRUCTIONS",
          label: "Instrucciones",
          sourceLabel: "Instrucciones",
          displayValue: "Consta de nuevo en el documento",
          normalizedValue: "SEIZURE_INSTRUCTIONS",
          sourcePageNumbers: [2],
        },
      ],
    };

    const input = projectProfileDrivenExplanationInputV2(specialized);
    expect(input).toMatchObject({
      references: [
        { referenceType: "EXPEDIENTE_ID", value: "EXP-SYNTH-001" },
      ],
      dates: [
        { dateType: "ISSUE_DATE", value: "2026-03-03" },
        { dateType: "RESPONSE_DEADLINE", value: "2026-03-12" },
      ],
      money: [
        { moneyType: "EXECUTIVE_SURCHARGE_PRINTED", amountCents: 2_000 },
      ],
      factCodes: [{ factCode: "SEIZURE_INSTRUCTIONS" }],
    });
    const keyData = explainFiscalNotificationDocumentV2(input!).sections.find(
      (section) => section.id === "KEY_DATA",
    );
    expect(keyData?.assertions.map(({ code }) => code)).not.toContain(
      "KEY_DATA_PENDING",
    );
    expect(JSON.stringify(keyData)).not.toMatch(
      /reference:1:|date:seizure:|seizure-money:|detail:|EXACT_|INTEGER:|BOOLEAN:|EXPLANATION:/u,
    );
  });

  it("does not project unsupported fields or unknown families", () => {
    const source = document();
    const unsupported: FiscalNotificationVerticalSliceReviewDocumentV1 = {
      ...source,
      fields: source.fields.map((field) =>
        field.fieldId.startsWith("profile:date:")
          ? {
              ...field,
              fieldId: "legacy:date",
              canonicalType: "PAYMENT_FORM_DATE",
            }
          : field,
      ),
    };
    expect(projectProfileDrivenExplanationInputV2(unsupported)?.dates).toEqual(
      [],
    );
    expect(
      projectProfileDrivenExplanationInputV2({
        ...unsupported,
        familyId: "legacy.unknown" as typeof unsupported.familyId,
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
