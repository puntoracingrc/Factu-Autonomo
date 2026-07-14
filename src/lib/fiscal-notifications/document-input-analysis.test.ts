import { describe, expect, it } from "vitest";
import { analyzeFiscalNotificationDocumentInput } from "./document-input-analysis";
import type { BoundedDocumentInput } from "./input-contract";

function input(text: string): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-local-ocr",
    documentId: "document:synthetic-local-ocr",
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text, isBlank: text.length === 0 }),
    ]),
  });
}

describe("fiscal notification document input analysis", () => {
  it("recognizes a closed historical AEAT enforcement template deterministically", () => {
    const source = input(
      [
        "AGENCIA TRIBUTARIA",
        "www.agenciatributaria.es",
        "NOTIFICACIÓN DE PROVIDENCIA DE APREMIO",
        "IDENTIFICACIÓN DEL DOCUMENTO",
        "IMPORTE DE LA DEUDA",
      ].join("\n"),
    );

    const first = analyzeFiscalNotificationDocumentInput(source);
    const second = analyzeFiscalNotificationDocumentInput(source);

    expect(first.familyAnalysis).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      candidates: [
        {
          familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
          signalStatus: "COMPLETE_REQUIRED_ANCHORS",
          conflictingAnchorIds: [],
        },
      ],
    });
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(source.pages[0]?.text).toContain("NOTIFICACIÓN");
    expect(JSON.stringify(first)).not.toContain("NOTIFICACIÓN");
  });

  it("returns no family or facts for a blank bounded input", () => {
    expect(analyzeFiscalNotificationDocumentInput(input(""))).toEqual({
      hasText: false,
      pageCount: 1,
      familyAnalysis: null,
      enforcementMoneyFacts: null,
      enforcementExplicitFields: null,
      enforcementPartyFacts: null,
      deferralGrantFacts: null,
      offsetAgreementFacts: null,
    });
  });
});
