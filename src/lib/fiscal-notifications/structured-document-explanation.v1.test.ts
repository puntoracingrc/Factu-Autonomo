import { describe, expect, it } from "vitest";
import type { AdministrativeDocumentType } from "./types";
import { explainFiscalNotificationDocumentV1 } from "./structured-document-explanation.v1";

const DOCUMENT_TYPES: readonly AdministrativeDocumentType[] = [
  "AEAT_ENFORCEMENT_ORDER",
  "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
  "AEAT_INSTALLMENT_OR_DEFERRAL_DENIAL",
  "AEAT_OFFSET_AGREEMENT",
  "AEAT_PAYMENT_FORM",
  "AEAT_INFORMATION_REQUEST",
  "AEAT_ASSESSMENT_PROPOSAL",
  "AEAT_ASSESSMENT",
  "AEAT_SANCTION_PROPOSAL",
  "AEAT_SANCTION_DECISION",
  "AEAT_SEIZURE_ORDER",
  "TGSS_DEBT_NOTICE",
  "TGSS_ENFORCEMENT_NOTICE",
  "MUNICIPAL_FINE",
  "MUNICIPAL_TAX_NOTICE",
  "REGIONAL_AUTHORITY_NOTICE",
  "GENERIC_ADMINISTRATIVE_NOTICE",
  "UNKNOWN",
];

describe("structured document explanation v1", () => {
  it("covers every current document type with a local deterministic profile", () => {
    for (const documentType of DOCUMENT_TYPES) {
      const result = explainFiscalNotificationDocumentV1({
        documentType,
        documentSubtype: null,
        documentDate: null,
        receiptDate: null,
        facts: [],
        money: [],
      });

      expect(result.whatItIs.length).toBeGreaterThan(20);
      expect(result.whyReceived.length).toBeGreaterThan(20);
      expect(result.nextStep.title.length).toBeGreaterThan(5);
      expect(result.networkPolicy).toBe("NO_NETWORK");
      expect(result.documentFactsPolicy).toBe("DOCUMENT_IS_PRIMARY");
      expect(result.materializationPolicy).toBe("PROHIBITED_UNTIL_REVIEW");
      expect(Object.isFrozen(result)).toBe(true);
    }
  });

  it("explains an accepted requested offset from printed facts without a raw dump", () => {
    const input = {
      documentType: "AEAT_OFFSET_AGREEMENT" as const,
      documentSubtype: "REQUESTED",
      documentDate: "2014-07-30",
      receiptDate: null,
      facts: [
        { label: "Fecha de solicitud impresa", value: "26-02-2014" },
        {
          label: "Efecto indicado en el documento",
          value: "Deuda totalmente extinguida en período voluntario",
        },
        {
          label: "Efecto indicado en el documento",
          value: "Deuda totalmente extinguida en período voluntario",
        },
      ],
      money: [
        money("CREDIT_TOTAL", 163_295, "DOCUMENT_REFERENCE"),
        money("OFFSET_APPLIED", 64_575, "DOCUMENT_REFERENCE"),
        money("TOTAL_BEFORE_OFFSET", 32_290, "LIQUIDATION_KEY"),
        money("TOTAL_BEFORE_OFFSET", 32_285, "LIQUIDATION_KEY"),
        money("REMAINING_AFTER_OFFSET", 0, "LIQUIDATION_KEY"),
        money("REMAINING_AFTER_OFFSET", 0, "LIQUIDATION_KEY"),
        money("OFFSET_APPLIED", 32_290, "LIQUIDATION_KEY"),
        money("OFFSET_APPLIED", 32_285, "LIQUIDATION_KEY"),
      ],
    };
    const before = structuredClone(input);

    const result = explainFiscalNotificationDocumentV1(input);

    expect(input).toEqual(before);
    expect(result).toMatchObject({
      ruleId: "aeat.offset-agreement.explanation",
      status: "EXPLAINED",
      result: expect.stringContaining("2 deudas incluidas quedan totalmente extinguidas"),
      nextStep: { status: "NO_PAYMENT_SHOWN" },
      deadline: { status: "MISSING_RECEIPT_DATE" },
      networkPolicy: "NO_NETWORK",
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    expect(result.keyFacts).toEqual(
      expect.arrayContaining([
        {
          label: "Crédito no consumido",
          value: "987,20 €",
          basis: "CALCULATED_FROM_PRINTED_VALUES",
        },
        { label: "Pendiente en esas deudas", value: "0,00 €", basis: "PRINTED" },
      ]),
    );
    expect(result.officialSources.map((source) => source.authority)).toEqual(
      expect.arrayContaining(["AEAT", "BOE"]),
    );
    expect(JSON.stringify(result)).not.toContain("rawText");
  });

  it("does not claim extinction when a debt remains or the effect text is missing", () => {
    const partial = explainFiscalNotificationDocumentV1({
      documentType: "AEAT_OFFSET_AGREEMENT",
      documentSubtype: "EX_OFFICIO",
      documentDate: "2026-01-10",
      receiptDate: "2026-01-12",
      facts: [],
      money: [
        money("CREDIT_TOTAL", 100_000, "DOCUMENT_REFERENCE"),
        money("OFFSET_APPLIED", 75_000, "DOCUMENT_REFERENCE"),
        money("TOTAL_BEFORE_OFFSET", 90_000, "LIQUIDATION_KEY"),
        money("REMAINING_AFTER_OFFSET", 15_000, "LIQUIDATION_KEY"),
      ],
    });

    expect(partial.result).toContain("150,00 € pendientes");
    expect(partial.result).not.toContain("totalmente extinguida");
    expect(partial.nextStep.status).toBe("PAYMENT_OR_RESPONSE_MAY_BE_REQUIRED");
    expect(partial.deadline.status).toBe("RECEIPT_DATE_AVAILABLE");
  });
});

function money(
  kind: Parameters<typeof explainFiscalNotificationDocumentV1>[0]["money"][number]["kind"],
  amountCents: number,
  sourceReferenceType: Parameters<typeof explainFiscalNotificationDocumentV1>[0]["money"][number]["sourceReferenceType"],
) {
  return Object.freeze({
    kind,
    amountCents,
    currency: "EUR" as const,
    sourceReferenceType,
  });
}
