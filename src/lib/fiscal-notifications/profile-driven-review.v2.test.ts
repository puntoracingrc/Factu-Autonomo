import { describe, expect, it } from "vitest";
import {
  resolveProfileFieldAdapterV2,
  type ProfileFieldCandidateV2,
  type ProfileFieldEvidenceV2,
} from "./extractor-core/profile-field-adapter.v2";
import { extractProfileDrivenFamilyV2 } from "./extractor-core/profile-driven-extractor.v2";
import { projectProfileDrivenExplanationInputV2 } from "./profile-driven-explanation-input.v2";
import { explainFiscalNotificationDocumentV2 } from "./structured-document-explanation.v2";
import {
  createEmptyFiscalNotificationVerticalSliceReviewV1,
  parseFiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";
import {
  mergeProfileDrivenReviewV2,
  projectProfileDrivenReviewV2,
} from "./profile-driven-review.v2";

function evidence(index: number): ProfileFieldEvidenceV2 {
  return Object.freeze({
    evidenceId: `evidence-profile-review-${index}`,
    pageNumber: 1,
    evidenceBasis: "EXPLICIT_DOCUMENT_FIELD",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    confidence: 1,
  });
}

function exactOutcome() {
  const adapter = resolveProfileFieldAdapterV2("collection.enforcement_order")!;
  const candidates: ProfileFieldCandidateV2[] = [
    {
      candidateId: "reference-1",
      candidateStatus: "EXACT",
      evidence: evidence(1),
      kind: "REFERENCE",
      fieldCode: "LIQUIDATION_KEY",
      normalizedValue: "REF/X20/26/001",
      sensitiveReference: null,
    },
    {
      candidateId: "date-1",
      candidateStatus: "EXACT",
      evidence: evidence(2),
      kind: "DATE",
      fieldCode: "ISSUE_DATE",
      valueIso: "2026-07-16",
    },
    {
      candidateId: "money-1",
      candidateStatus: "EXACT",
      evidence: evidence(3),
      kind: "MONEY",
      fieldCode: "OUTSTANDING_PRINCIPAL",
      amountCents: 14_955,
      currency: "EUR",
    },
    {
      candidateId: "fact-1",
      candidateStatus: "EXACT",
      evidence: evidence(4),
      kind: "FACT",
      fieldCode: "APPEAL_INFORMATION",
      observed: true,
    },
  ];
  return adapter.adapt({
    ownerScope: "user:test",
    documentId: "document:synthetic",
    selection: {
      selectionStatus: "SELECTED",
      familyId: "collection.enforcement_order",
      basis: "SYSTEM_EXACT",
    },
    candidates,
  });
}

describe("profile-driven review v2", () => {
  it("projects safe structured fields into the durable review contract", () => {
    const review = projectProfileDrivenReviewV2({
      outcome: exactOutcome(),
      extractorId: "payment-order",
      canonicalTitle: "Providencia de apremio",
      titlePageNumbers: [1],
      pageCount: 2,
    });

    expect(review).toMatchObject({
      status: "REVIEW_REQUIRED",
      requiresHumanReview: true,
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
      documents: [
        {
          familyId: "collection.enforcement_order",
          extractorId: "payment-order",
          title: "Providencia de apremio",
        },
      ],
    });
    expect(review.documents[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          semantic: "DATE",
          canonicalType: "ISSUE_DATE",
          normalizedValue: "2026-07-16",
        }),
        expect.objectContaining({
          semantic: "MONEY",
          canonicalType: "PRINCIPAL",
          amountCents: 14_955,
          currency: "EUR",
        }),
      ]),
    );
    expect(() => parseFiscalNotificationVerticalSliceReviewV1(review)).not.toThrow();
  });

  it("projects variable printed outcomes as controlled review fields", () => {
    const adapter = resolveProfileFieldAdapterV2(
      "review.suspension_decision",
    )!;
    const outcome = Object.freeze({
      ...adapter.adapt({
        ownerScope: "user:test",
        documentId: "document:synthetic-suspension-decision",
        selection: {
          selectionStatus: "SELECTED",
          familyId: "review.suspension_decision",
          basis: "SYSTEM_EXACT",
        },
        candidates: [],
      }),
      printedEffects: Object.freeze([
        Object.freeze({
          effectCode: "SUSPENSION_GRANTED" as const,
          pageNumbers: Object.freeze([1]),
          detectionBasis: "CLOSED_PRINTED_PHRASE" as const,
        }),
      ]),
    });

    const review = projectProfileDrivenReviewV2({
      outcome,
      extractorId: "appeal-and-review",
      canonicalTitle: "Acuerdo sobre la suspensión solicitada",
      titlePageNumbers: [1],
      pageCount: 1,
    });

    expect(review.documents[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldId: "profile:recognition:document-type:0",
          normalizedValue: "EXACT_TITLE_AND_AUTHORITY",
        }),
        expect.objectContaining({
          fieldId: "profile:effect:SUSPENSION_GRANTED:0",
          normalizedValue: "EFFECT:SUSPENSION_GRANTED",
          displayValue: "Detectado en el documento",
          reviewStatus: "REVIEW_REQUIRED",
        }),
      ]),
    );
    expect(JSON.stringify(review)).not.toContain("Suspensión concedida");
    expect(() => parseFiscalNotificationVerticalSliceReviewV1(review)).not.toThrow();
  });

  it("carries a closed printed effect from ephemeral text to the deterministic explanation", async () => {
    const outcome = await extractProfileDrivenFamilyV2({
      document: Object.freeze({
        ownerScope: "user:synthetic-variable-effect-e2e",
        documentId: "document:synthetic-variable-effect-e2e",
        pages: Object.freeze([
          Object.freeze({
            pageNumber: 1,
            text: [
              "Agencia Estatal de Administración Tributaria",
              "Acuerdo sobre la suspensión solicitada",
              "Suspensión concedida",
            ].join("\n"),
            isBlank: false,
          }),
        ]),
      }),
    });
    expect(outcome.adaptedFields).not.toBeNull();
    const review = projectProfileDrivenReviewV2({
      outcome: outcome.adaptedFields!,
      extractorId: "appeal-and-review",
      canonicalTitle: "Acuerdo sobre la suspensión solicitada",
      titlePageNumbers: [1],
      pageCount: 1,
    });
    const explanationInput = projectProfileDrivenExplanationInputV2(
      review.documents[0]!,
    );
    const explanation = explainFiscalNotificationDocumentV2(
      explanationInput!,
    );

    expect(explanationInput?.printedEffects).toEqual([
      expect.objectContaining({ effectCode: "SUSPENSION_GRANTED" }),
    ]);
    expect(explanation.ambiguities).toEqual([]);
    expect(
      explanation.sections
        .find((section) => section.id === "RESULT")
        ?.assertions.some(
          (assertion) =>
            assertion.code === "PRINTED_EFFECT_SUSPENSION_GRANTED",
        ),
    ).toBe(true);
    expect(JSON.stringify(review)).not.toContain("Suspensión concedida");
  });

  it("stays empty without an exact system selection", () => {
    const outcome = {
      ...exactOutcome(),
      familyId: null,
      selectionBasis: null,
    } as const;
    const review = projectProfileDrivenReviewV2({
      outcome,
      extractorId: "payment-order",
      canonicalTitle: "Providencia de apremio",
      titlePageNumbers: [1],
      pageCount: 1,
    });
    expect(review).toMatchObject({
      status: "INFORMATION_PENDING",
      documents: [],
    });
  });

  it("preserves interest period date identities without turning them into document chronology", () => {
    const adapter = resolveProfileFieldAdapterV2(
      "collection.interest_assessment",
    )!;
    const outcome = adapter.adapt({
      ownerScope: "user:test",
      documentId: "document:synthetic-interest-dates",
      selection: {
        selectionStatus: "SELECTED",
        familyId: "collection.interest_assessment",
        basis: "SYSTEM_EXACT",
      },
      candidates: [
        {
          candidateId: "interest-start-date",
          candidateStatus: "EXACT",
          evidence: evidence(20),
          kind: "DATE",
          fieldCode: "INTEREST_START_DATE",
          valueIso: "2025-01-01",
        },
        {
          candidateId: "interest-end-date",
          candidateStatus: "EXACT",
          evidence: evidence(21),
          kind: "DATE",
          fieldCode: "INTEREST_END_DATE",
          valueIso: "2025-12-31",
        },
      ],
    });

    const review = projectProfileDrivenReviewV2({
      outcome,
      extractorId: "payment-order",
      canonicalTitle: "Liquidación de intereses de demora",
      titlePageNumbers: [1],
      pageCount: 1,
    });

    expect(outcome.chronology).toEqual({
      schemaVersion: 2,
      chronologyDate: null,
      chronologyDateBasis: null,
    });
    expect(
      review.documents[0]?.fields
        .filter((field) => field.semantic === "DATE")
        .map((field) => ({
          fieldId: field.fieldId,
          normalizedValue: field.normalizedValue,
        })),
    ).toEqual([
      {
        fieldId: "profile:date:INTEREST_START_DATE:0",
        normalizedValue: "2025-01-01",
      },
      {
        fieldId: "profile:date:INTEREST_END_DATE:1",
        normalizedValue: "2025-12-31",
      },
    ]);
    expect(() => parseFiscalNotificationVerticalSliceReviewV1(review)).not.toThrow();
  });

  it("merges a recognized profile into the existing review without mutating it", () => {
    const legacy = createEmptyFiscalNotificationVerticalSliceReviewV1();
    const before = structuredClone(legacy);
    const profile = projectProfileDrivenReviewV2({
      outcome: exactOutcome(),
      extractorId: "payment-order",
      canonicalTitle: "Providencia de apremio",
      titlePageNumbers: [1],
      pageCount: 1,
    });
    const merged = mergeProfileDrivenReviewV2(legacy, profile);
    expect(legacy).toEqual(before);
    expect(merged.documents).toHaveLength(1);
    expect(Object.isFrozen(merged.documents[0]?.fields)).toBe(true);
  });

  it("reconciles a broad legacy family that already uses the same extractor", () => {
    const legacy = parseFiscalNotificationVerticalSliceReviewV1({
      schemaVersion: 1,
      reviewVersion: "1.0.0",
      status: "REVIEW_REQUIRED",
      documents: [
        {
          reviewDocumentId: "legacy-payment-order",
          extractorId: "payment-order",
          familyId: "collection.enforcement_order",
          title: "Documento de recaudación",
          subtitle: "Clasificación histórica amplia",
          pageFrom: 1,
          pageTo: 2,
          confidence: 1,
          fields: [
            {
              fieldId: "legacy:money:total",
              semantic: "MONEY",
              canonicalType: "TOTAL_CLAIMED",
              label: "Total",
              displayValue: "149,55 €",
              normalizedValue: "14955",
              amountCents: 14_955,
              currency: "EUR",
              sourcePageNumbers: [2],
              sourceLabel: "Total",
              confidence: 1,
              reviewStatus: "REVIEW_REQUIRED",
            },
          ],
          warnings: [],
          requiresHumanReview: true,
        },
      ],
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
    const interestAdapter = resolveProfileFieldAdapterV2(
      "collection.interest_assessment",
    )!;
    const profile = projectProfileDrivenReviewV2({
      outcome: interestAdapter.adapt({
        ownerScope: "user:test",
        documentId: "document:synthetic-interest",
        selection: {
          selectionStatus: "SELECTED",
          familyId: "collection.interest_assessment",
          basis: "SYSTEM_EXACT",
        },
        candidates: [
          {
            candidateId: "interest-money-1",
            candidateStatus: "EXACT",
            evidence: evidence(5),
            kind: "MONEY",
            fieldCode: "LATE_PAYMENT_INTEREST",
            amountCents: 2_991,
            currency: "EUR",
          },
        ],
      }),
      extractorId: "payment-order",
      canonicalTitle: "Liquidación de intereses de demora",
      titlePageNumbers: [1],
      pageCount: 2,
    });

    const merged = mergeProfileDrivenReviewV2(legacy, profile);

    expect(merged.documents).toHaveLength(1);
    expect(merged.documents[0]).toMatchObject({
      reviewDocumentId: "review-document:profile:collection.interest_assessment",
      extractorId: "payment-order",
      familyId: "collection.interest_assessment",
      title: "Liquidación de intereses de demora",
      pageFrom: 1,
      pageTo: 2,
    });
    expect(merged.documents[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldId: "legacy:money:total" }),
        expect.objectContaining({
          fieldId: "profile:money:LATE_PAYMENT_INTEREST:0",
        }),
      ]),
    );
    expect(() => parseFiscalNotificationVerticalSliceReviewV1(merged)).not.toThrow();
  });
});
