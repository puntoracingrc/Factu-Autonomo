import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V1,
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1,
  resolveFiscalNotificationDocumentFamilyV1,
} from "./document-families.v1";
import { resolveFiscalNotificationOfficialSourceV1 } from "./official-sources.v1";

const EXPECTED_FAMILY_SOURCE_MAPPINGS = {
  "certificate.tax_compliance": ["aeat.certificate.compliance"],
  "compliance.document_request": ["aeat.assessment.irpf", "aeat.assessment.vat"],
  "assessment.allegations_and_proposal": [
    "aeat.assessment.irpf",
    "aeat.assessment.vat",
  ],
  "assessment.final_provisional_assessment": [
    "aeat.assessment.irpf",
    "aeat.assessment.vat",
  ],
  "sanction.initiation_and_hearing": ["aeat.sanction.general"],
  "sanction.resolution": ["aeat.sanction.general"],
  "collection.deferral_grant": ["aeat.collection.deferral"],
  "collection.deferral_modification": ["aeat.collection.deferral"],
  "collection.deferral_denial": ["aeat.collection.deferral"],
  "collection.enforcement_order": ["aeat.collection.enforcement"],
  "collection.offset_requested": ["aeat.collection.offset.requested"],
  "collection.offset_ex_officio": ["aeat.collection.offset.exofficio"],
  "review.recurso_reposicion": ["aeat.review.reconsideration"],
  "review.economic_administrative_claim": [
    "aeat.review.economic_administrative",
  ],
  "liability.solidary": ["aeat.liability.solidary"],
  "liability.subsidiary": ["aeat.liability.subsidiary"],
  "liability.successors": ["aeat.liability.successors"],
  "inspection.procedure": ["aeat.inspection.general"],
  "refund.undue_payment": ["aeat.refund.undue"],
  "collection.precautionary_measure": ["aeat.collection.precautionary"],
  "collection.asset_sale": ["aeat.collection.auction"],
} as const;

describe("fiscal notification document family catalog v1", () => {
  it("registers the exact 41-family seed without activating any family", () => {
    expect(FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1).toHaveLength(41);
    expect(FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.map((entry) => entry.id))
      .toEqual(FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V1);
    expect(
      new Set(FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.map((entry) => entry.id))
        .size,
    ).toBe(41);
    expect(
      FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.filter(
        (entry) =>
          entry.evidenceOrigin === "ANONYMIZED_PRIVATE_CORPUS_OBSERVATION",
      ),
    ).toHaveLength(31);
    expect(
      FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.filter(
        (entry) =>
          entry.evidenceOrigin !== "ANONYMIZED_PRIVATE_CORPUS_OBSERVATION",
      ),
    ).toHaveLength(10);
    for (const entry of FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1) {
      expect(entry).toMatchObject({
        templateVariantStatus: "NOT_REGISTERED",
        legalReviewStatus: "LEGAL_REVIEW_PENDING",
        operationalPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
        permitsDebtCreation: false,
        permitsDeadlineCreation: false,
        permitsPaymentAction: false,
        permitsAccountingAction: false,
      });
      expect("createsDebt" in entry).toBe(false);
      expect("defaultAction" in entry).toBe(false);
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.sourceIds)).toBe(true);
    }
    expect(Object.isFrozen(FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1)).toBe(true);
  });

  it("marks only the two existing candidate handlers as implemented review-only", () => {
    const implemented = FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.filter(
      (entry) =>
        entry.recognitionStatus === "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY",
    );
    expect(implemented.map((entry) => entry.id).sort()).toEqual([
      "collection.deferral_grant",
      "collection.enforcement_order",
    ]);
    expect(resolveFiscalNotificationDocumentFamilyV1("collection.enforcement_order"))
      .toMatchObject({
        recognition: {
          candidateHandlerId: "aeat-enforcement-order-candidate",
          candidateHandlerVersion: "1.0.0",
          outputPolicy: "CANDIDATE_ONLY_REVIEW_REQUIRED",
          explicitFactExtractor: {
            id: "aeat-enforcement-money-facts",
            version: "1.0.0",
          },
        },
      });
    expect(resolveFiscalNotificationDocumentFamilyV1("collection.deferral_grant"))
      .toMatchObject({
        recognition: {
          candidateHandlerId: "aeat-deferral-grant-candidate",
          candidateHandlerVersion: "1.0.0",
          explicitFactExtractor: null,
        },
      });
    expect(
      FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.filter(
        (entry) => entry.recognition !== null,
      ),
    ).toHaveLength(2);
    const enforcement = resolveFiscalNotificationDocumentFamilyV1(
      "collection.enforcement_order",
    );
    expect(Object.isFrozen(enforcement?.recognition)).toBe(true);
    expect(Object.isFrozen(enforcement?.recognition?.explicitFactExtractor))
      .toBe(true);
    expect(
      Reflect.set(
        enforcement?.recognition ?? {},
        "candidateHandlerId",
        "PRIVATE_MUTATION",
      ),
    ).toBe(false);
    expect(resolveFiscalNotificationDocumentFamilyV1(
      "collection.enforcement_order",
    )?.recognition?.candidateHandlerId).toBe(
      "aeat-enforcement-order-candidate",
    );
  });

  it("links only registered official context sources", () => {
    let linked = 0;
    const actualMappings: Record<string, readonly string[]> = {};
    for (const entry of FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1) {
      expect(new Set(entry.sourceIds).size).toBe(entry.sourceIds.length);
      if (entry.sourceIds.length > 0) {
        actualMappings[entry.id] = entry.sourceIds;
      }
      for (const sourceId of entry.sourceIds) {
        linked += 1;
        expect(resolveFiscalNotificationOfficialSourceV1(sourceId)).toMatchObject({
          id: sourceId,
          usagePolicy: "PROCEDURE_CONTEXT_ONLY",
          permitsLegalRuleActivation: false,
          permitsTemplateActivation: false,
        });
      }
    }
    expect(linked).toBeGreaterThan(0);
    expect(actualMappings).toEqual(EXPECTED_FAMILY_SOURCE_MAPPINGS);
    expect(resolveFiscalNotificationDocumentFamilyV1(
      "notification.dehu_envelope",
    )).toMatchObject({
      evidenceOrigin: "OFFICIAL_SOURCE_REPORTED_PENDING_REGISTRATION",
      sourceIds: [],
      recognitionStatus: "OFFICIAL_SOURCE_PENDING_REGISTRATION",
    });
    for (const familyId of [
      "compliance.formal_filing_requirement",
      "sanction.loss_of_reduction",
      "collection.interest_assessment",
    ]) {
      expect(resolveFiscalNotificationDocumentFamilyV1(familyId)).toMatchObject({
        sourceIds: [],
      });
    }
  });

  it("resolves exact IDs without coercion and keeps unknown families absent", () => {
    expect(resolveFiscalNotificationDocumentFamilyV1("seizure.release"))
      .toMatchObject({ id: "seizure.release" });
    for (const invalid of [
      " seizure.release",
      "SEIZURE.RELEASE",
      "collection.unknown",
      "collection.\u0000unknown",
      "x".repeat(1_000_000),
      "__proto__",
      1,
      null,
      {},
    ]) {
      expect(resolveFiscalNotificationDocumentFamilyV1(invalid)).toBeNull();
    }
  });

  it("contains no network, AI, persistence, clock, PII or operational engine", () => {
    const source = readFileSync(
      new URL("./document-families.v1.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|Date\.now|new Date|Math\.random|ownerScope|documentId|taxId|NIF|CSV|IBAN|prepareAccountingDraft|reportInstallmentPayment/iu,
    );
  });
});
