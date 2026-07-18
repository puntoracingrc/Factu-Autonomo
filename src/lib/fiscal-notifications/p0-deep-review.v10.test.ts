import { describe, expect, it } from "vitest";

import type { AeatP0DeepExtractorOutcomeV10 } from "./extractor-core/p0-deep-extractor.v10";
import { projectAeatP0DeepReviewV10 } from "./p0-deep-review.v10";

function multiPartOutcome(): AeatP0DeepExtractorOutcomeV10 {
  return Object.freeze({
    schemaVersion: 10,
    extractorVersion: "10.0.0",
    status: "REVIEW_REQUIRED",
    familyId: "evidence.submission_receipt",
    title: "Justificante de presentación, contestación o aportación documental",
    extractorId: "informative-communication",
    matchedStrongSetIndexes: Object.freeze([0]),
    matchedPageNumbers: Object.freeze([2, 14]),
    fields: Object.freeze([
      Object.freeze({
        fieldId: "p0-v10:FILING_DATE:1",
        fieldCode: "FILING_DATE",
        kind: "DATE",
        assertionLayer: "PRINTED",
        displayValue: "18/07/2026",
        normalizedValue: "2026-07-18",
        amountCents: null,
        currency: null,
        fingerprintSha256: null,
        sourcePageNumbers: Object.freeze([1]),
        sourceLabel: "Fecha de presentación",
        reviewStatus: "REVIEW_REQUIRED",
        persistencePolicy: "PERSIST_STRUCTURED",
      }),
    ]),
    missingRequiredFieldIds: Object.freeze([]),
    issues: Object.freeze([]),
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    confirmsFamily: false,
    confirmsObligation: false,
    confirmsDebt: false,
    confirmsPayment: false,
    confirmsDeadline: false,
    permitsAccountingAction: false,
  });
}

describe("P0 deep review v10", () => {
  it("includes field evidence pages outside the title anchors in the document range", () => {
    const review = projectAeatP0DeepReviewV10(multiPartOutcome());

    expect(review.documents).toHaveLength(1);
    expect(review.documents[0]).toMatchObject({
      pageFrom: 1,
      pageTo: 14,
    });
    expect(review.documents[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldId: "p0-v10:FILING_DATE:1",
          sourcePageNumbers: [1],
        }),
      ]),
    );
  });
});
