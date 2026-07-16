import { describe, expect, it } from "vitest";
import {
  relateRealCorpusDocumentsV2,
  type RealCorpusRelationDocumentV2,
} from "./real-corpus-relations.v2";

function item(
  overrides: Partial<RealCorpusRelationDocumentV2>,
): RealCorpusRelationDocumentV2 {
  return {
    ownerScope: "user:synthetic-relations",
    documentId: "document:source",
    familyId: "refund.payment_communication",
    officialReferences: {},
    taxConcept: null,
    fiscalYear: null,
    documentStage: null,
    ...overrides,
  };
}

describe("real corpus relations V2", () => {
  it("confirms the payment/compensation closure only with both exact references", () => {
    const payment = item({
      documentId: "document:payment",
      officialReferences: {
        AGREEMENT_ID: "SYNAGREEMENT001X",
        REFUND_REFERENCE: "SYNREFUND001X",
      },
    });
    const offset = item({
      documentId: "document:offset",
      familyId: "collection.offset_requested",
      officialReferences: {
        AGREEMENT_ID: "SYNAGREEMENT001X",
        REFUND_REFERENCE: "SYNREFUND001X",
      },
    });
    expect(relateRealCorpusDocumentsV2(payment, offset)).toEqual([
      expect.objectContaining({
        relationType: "REFUND_PAYMENT_COMPLETES_COMPENSATION",
        status: "SYSTEM_CONFIRMED_EXACT",
        exactReference: "SYNAGREEMENT001X",
      }),
    ]);
    expect(
      relateRealCorpusDocumentsV2(
        payment,
        item({
          ...offset,
          officialReferences: {
            AGREEMENT_ID: "SYNAGREEMENT001X",
            REFUND_REFERENCE: "DIFFERENTREF001X",
          },
        }),
      ),
    ).toEqual([]);
  });

  it.each([
    [
      "EFFECTIVE_NOTIFICATION",
      "Este certificado acredita que el acto identificado quedó notificado por comparecencia en la fecha impresa. No sustituye el acto ni explica su contenido.",
    ],
    [
      "PUBLICATION_ONLY",
      "Este documento acredita la publicación de la citación, pero no permite afirmar la fecha efectiva de notificación.",
    ],
    [
      "PREPUBLICATION",
      "Esta comunicación anuncia una futura publicación. Todavía no acredita que el acto haya quedado notificado.",
    ],
  ] as const)(
    "uses the closed notification-evidence phrase for %s",
    (stage, phrase) => {
      const evidence = item({
        documentId: `document:evidence:${stage}`,
        familyId: "notification.publication_or_appearance",
        officialReferences: { UNDERLYING_ACT_REFERENCE: "SYNACT001X" },
        documentStage: stage,
      });
      const act = item({
        documentId: "document:act",
        familyId: "seizure.bank_account",
        officialReferences: { DOCUMENT_REFERENCE: "SYNACT001X" },
      });
      expect(relateRealCorpusDocumentsV2(evidence, act)).toEqual([
        expect.objectContaining({
          relationType: "NOTIFICATION_EVIDENCE_FOR",
          status: "SYSTEM_CONFIRMED_EXACT",
          phrase,
        }),
      ]);
    },
  );

  it("never confirms by same amount, taxpayer, tax or year and blocks cross-owner relations", () => {
    const left = item({
      documentId: "document:left",
      familyId: "assessment.allegations_and_proposal",
      taxConcept: "IVA",
      fiscalYear: "2025",
    });
    const right = item({
      documentId: "document:right",
      familyId: "assessment.final_provisional_assessment",
      taxConcept: "IVA",
      fiscalYear: "2025",
    });
    expect(relateRealCorpusDocumentsV2(left, right)).toEqual([
      expect.objectContaining({
        relationType: "SAME_TAX_YEAR_CONTEXT",
        status: "SUGGESTED",
        exactReference: null,
      }),
    ]);
    expect(
      relateRealCorpusDocumentsV2(left, {
        ...right,
        ownerScope: "user:another-owner",
      }),
    ).toEqual([]);
  });

  it("keeps annual tax-data reports as context only", () => {
    const left = item({
      documentId: "document:2013",
      familyId: "information.tax_data_report",
      fiscalYear: "2013",
    });
    const right = item({
      documentId: "document:2014",
      familyId: "information.tax_data_report",
      fiscalYear: "2014",
    });
    expect(relateRealCorpusDocumentsV2(left, right)).toEqual([
      expect.objectContaining({
        relationType: "ANNUAL_REPORT_SERIES",
        status: "CONTEXT_ONLY",
      }),
    ]);
  });
});
