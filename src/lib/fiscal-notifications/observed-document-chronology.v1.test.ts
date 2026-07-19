import { describe, expect, it } from "vitest";
import type { BoundedDocumentInput } from "./input-contract";
import {
  appendObservedDocumentChronologyV1,
  extractObservedDocumentChronologyV1,
} from "./observed-document-chronology.v1";
import { resolveFamilyRuleV2 } from "./extractor-core/family-rule-registry.v2";
import { parseFiscalNotificationVerticalSliceReviewV1 } from "./vertical-slice-review.v1";

function input(lines: readonly string[]): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-chronology",
    documentId: "document:synthetic-chronology",
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text: lines.join("\n"), isBlank: false }),
    ]),
  });
}

function review() {
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: "1.0.0",
    status: "REVIEW_REQUIRED",
    documents: [
      {
        reviewDocumentId: "review:synthetic-chronology",
        extractorId: "informative-communication",
        familyId: "information.regulatory_change",
        title: resolveFamilyRuleV2("information.regulatory_change")!
          .canonicalTitle,
        subtitle: "Datos observados en el documento",
        pageFrom: 1,
        pageTo: 1,
        confidence: 1,
        fields: [
          {
            fieldId: "reference:synthetic",
            semantic: "REFERENCE",
            canonicalType: "ACT_ID",
            label: "Referencia",
            displayValue: "SYN-ACT-001",
            normalizedValue: "SYN-ACT-001",
            amountCents: null,
            currency: null,
            sourcePageNumbers: [1],
            sourceLabel: "Referencia",
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
}

describe("observed document chronology v1", () => {
  it("extracts only the date adjacent to an electronic-signature marker", () => {
    const document = input([
      "La norma histórica se publicó el 01-01-2020.",
      "Documento firmado electrónicamente",
      "Fecha de firma: 19 de julio de 2026.",
    ]);

    expect(extractObservedDocumentChronologyV1(document)).toEqual([
      {
        canonicalType: "SIGNING_DATE",
        valueIso: "2026-07-19",
        pageNumber: 1,
      },
    ]);
  });

  it("does not infer chronology without a signing marker", () => {
    expect(
      extractObservedDocumentChronologyV1(
        input(["La norma histórica se publicó el 01-01-2020."]),
      ),
    ).toEqual([]);
  });

  it("does not type an unrelated nearby date as a signing date", () => {
    expect(
      extractObservedDocumentChronologyV1(
        input([
          "Fecha de registro: 18-07-2026",
          "Documento firmado electrónicamente",
          "Referencia normativa de 19-07-2026",
        ]),
      ),
    ).toEqual([]);
  });

  it("does not type generic adjacent 'en fecha' events as a signing date", () => {
    expect(
      extractObservedDocumentChronologyV1(
        input([
          "En fecha 17-07-2026 se registró la solicitud.",
          "Documento firmado electrónicamente",
          "En fecha 19-07-2026 se notificó la resolución.",
        ]),
      ),
    ).toEqual([]);
  });

  it("adds the observed signing date with page provenance", () => {
    const document = input([
      "Documento firmado electrónicamente el 19-07-2026",
    ]);
    const result = appendObservedDocumentChronologyV1(review(), document);

    expect(result.documents[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          semantic: "DATE",
          canonicalType: "SIGNING_DATE",
          normalizedValue: "2026-07-19",
          sourcePageNumbers: [1],
        }),
      ]),
    );
  });
});
