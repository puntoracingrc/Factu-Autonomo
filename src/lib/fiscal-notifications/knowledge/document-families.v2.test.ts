import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1 } from "./document-families.v1";
import {
  FISCAL_NOTIFICATION_CAUSAL_RELATION_IDS_V2,
  FISCAL_NOTIFICATION_CAUSAL_RELATIONS_V2,
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2,
  FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V2,
  FISCAL_NOTIFICATION_PROHIBITED_INFERENCE_IDS_V2,
  resolveFiscalNotificationDocumentFamilyV2,
} from "./document-families.v2";
import { resolveFiscalNotificationOfficialSourceV2 } from "./official-sources.v2";

const EXPECTED_P0_IDS = [
  "payment.receipt",
  "payment.failed_or_reversed",
  "collection.deferral_request_receipt",
  "collection.deferral_substantiation_requirement",
  "collection.deferral_inadmissibility_or_archival",
  "collection.deferral_breach",
  "collection.offset_resolution",
  "collection.extinction_or_balance_notice",
  "assessment.procedure_start",
  "assessment.no_adjustment_resolution",
  "compliance.individual_information_requirement",
  "collection.late_filing_surcharge",
  "review.suspension_request",
  "review.suspension_decision",
  "review.resolution",
  "seizure.wages_or_pensions",
  "seizure.securities_or_financial_assets",
  "seizure.cash_or_refund",
  "seizure.tpv_receipts",
  "seizure.business_income_or_rents",
  "seizure.third_party_response",
  "seizure.third_party_payment",
  "refund.request_or_recognition",
  "refund.withholding_or_offset",
  "inspection.communication",
  "inspection.diligence",
  "inspection.act_agreement",
  "inspection.act_conformity",
  "inspection.act_disagreement",
  "inspection.assessment",
  "liability.proposal",
  "liability.final_resolution",
  "collection.external_debt",
  "irpf.spouse_refund_suspension",
] as const;

const EXPECTED_P1_IDS = [
  "registry.census_requirement",
  "registry.census_proposal",
  "registry.tax_domicile_resolution",
  "registry.nif_revocation",
  "registry.nif_rehabilitation",
  "assessment.value_check",
  "review.material_error",
  "review.revocation",
  "review.nullity",
  "review.lesivity",
  "review.third_party_claim",
  "review.guarantee_cost_reimbursement",
] as const;

describe("fiscal notification document family catalog v2", () => {
  it("preserves all 41 v1 families and adds the closed P0/P1 inventory", () => {
    expect(FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2).toHaveLength(87);
    expect(FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V2).toHaveLength(87);
    expect(new Set(FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V2).size).toBe(87);
    expect(FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.slice(0, 41).map(
      (family) => family.id,
    )).toEqual(FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.map(
      (family) => family.id,
    ));
    expect(FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.filter(
      (family) => family.knowledgePriority === "P0",
    ).map((family) => family.id)).toEqual(EXPECTED_P0_IDS);
    expect(FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.filter(
      (family) => family.knowledgePriority === "P1",
    ).map((family) => family.id)).toEqual(EXPECTED_P1_IDS);
  });

  it("keeps every new family fixtureless, handlerless and review-only", () => {
    const added = FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.filter(
      (family) => family.knowledgePriority !== "V1_BASELINE",
    );
    expect(added).toHaveLength(46);
    for (const family of added) {
      expect(family).toMatchObject({
        evidenceOrigin: "OFFICIAL_SOURCE_ONLY_VERIFIED_URL",
        recognitionStatus: "OFFICIAL_ONLY_PENDING_FIXTURE",
        fixtureStatus: "PENDING_SYNTHETIC_FIXTURE",
        templateVariantStatus: "NOT_REGISTERED",
        recognition: null,
        knowledgeUsage: "CONTEXT_ONLY",
        printedDocumentPolicy: "EXTRACT_EXACTLY_THEN_REQUIRE_REVIEW",
        officialContextPolicy: "INTERPRET_ONLY_NEVER_OVERRIDE_DOCUMENT",
        legalReviewStatus: "LEGAL_REVIEW_PENDING",
        operationalPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
        requiresHumanReview: true,
        permitsDebtCreation: false,
        permitsDeadlineCreation: false,
        permitsPaymentAction: false,
        permitsAccountingAction: false,
        permitsAutomaticRelationConfirmation: false,
      });
      expect(family.sourceIds.length).toBeGreaterThan(0);
      expect(Object.isFrozen(family)).toBe(true);
      expect(Object.isFrozen(family.sourceIds)).toBe(true);
    }
  });

  it("links only registered context sources and never grants activation", () => {
    for (const family of FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2) {
      expect(new Set(family.sourceIds).size).toBe(family.sourceIds.length);
      for (const sourceId of family.sourceIds) {
        expect(resolveFiscalNotificationOfficialSourceV2(sourceId)).toMatchObject({
          id: sourceId,
          usagePolicy: "CONTEXT_ONLY",
          permitsLegalRuleActivation: false,
          permitsTemplateActivation: false,
        });
      }
    }
  });

  it("assigns the exact AEAT procedure source to each high-risk family", () => {
    const expectedMappings = {
      "compliance.individual_information_requirement":
        "aeat.compliance.individual_information",
      "review.suspension_request": "aeat.collection.suspension",
      "review.suspension_decision": "aeat.collection.suspension",
      "registry.tax_domicile_resolution": "aeat.census.tax_domicile",
      "registry.nif_revocation": "aeat.census.nif_revocation",
      "registry.nif_rehabilitation": "aeat.census.nif_rehabilitation",
      "collection.interest_assessment": "aeat.assessment.interest",
      "seizure.bank_account": "aeat.seizure.bank_accounts",
      "seizure.wages_or_pensions": "aeat.seizure.wages",
      "seizure.securities_or_financial_assets": "aeat.seizure.securities",
      "seizure.commercial_credits": "aeat.seizure.credits",
      "payment.receipt": "aeat.payment.nrc_receipt",
    } as const;

    for (const [familyId, sourceId] of Object.entries(expectedMappings)) {
      expect(resolveFiscalNotificationDocumentFamilyV2(familyId)?.sourceIds)
        .toContain(sourceId);
    }
  });

  it("models causal links only as suggestions requiring explicit evidence", () => {
    expect(FISCAL_NOTIFICATION_CAUSAL_RELATIONS_V2.map(
      (relation) => relation.id,
    )).toEqual(FISCAL_NOTIFICATION_CAUSAL_RELATION_IDS_V2);
    expect(new Set(FISCAL_NOTIFICATION_CAUSAL_RELATION_IDS_V2).size).toBe(
      FISCAL_NOTIFICATION_CAUSAL_RELATION_IDS_V2.length,
    );
    for (const relation of FISCAL_NOTIFICATION_CAUSAL_RELATIONS_V2) {
      expect(relation).toMatchObject({
        status: "SUGGESTED_ONLY",
        matchPolicy: "EXPLICIT_REFERENCE_OR_HUMAN_CONFIRMATION_REQUIRED",
        autoConfirm: false,
      });
      expect(relation.fromFamilyIds.length).toBeGreaterThan(0);
      expect(relation.toFamilyIds.length).toBeGreaterThan(0);
      for (const familyId of [
        ...relation.fromFamilyIds,
        ...relation.toFamilyIds,
      ]) {
        expect(resolveFiscalNotificationDocumentFamilyV2(familyId)).not.toBeNull();
      }
      expect(Object.isFrozen(relation)).toBe(true);
      expect(Object.isFrozen(relation.fromFamilyIds)).toBe(true);
      expect(Object.isFrozen(relation.toFamilyIds)).toBe(true);
    }
  });

  it("never treats a payment form as proof that payment occurred", () => {
    const paymentForm = resolveFiscalNotificationDocumentFamilyV2(
      "payment.payment_form",
    );
    const paymentReceipt = resolveFiscalNotificationDocumentFamilyV2(
      "payment.receipt",
    );
    const failedPayment = resolveFiscalNotificationDocumentFamilyV2(
      "payment.failed_or_reversed",
    );
    expect(paymentForm).toMatchObject({ category: "PAYMENT_INSTRUMENT" });
    expect(paymentReceipt).toMatchObject({ category: "PAYMENT_EVIDENCE" });
    expect(failedPayment).toMatchObject({ category: "PAYMENT_EVIDENCE" });
    expect(paymentForm?.id).not.toBe(paymentReceipt?.id);
    expect(paymentReceipt?.permitsPaymentAction).toBe(false);
    expect(paymentReceipt?.sourceIds).toContain("aeat.payment.nrc_receipt");
    expect(paymentForm?.sourceIds).not.toContain("aeat.payment.nrc_receipt");
    expect(FISCAL_NOTIFICATION_PROHIBITED_INFERENCE_IDS_V2).toContain(
      "PAYMENT_FORM_IS_PAYMENT_RECEIPT",
    );
    expect(FISCAL_NOTIFICATION_PROHIBITED_INFERENCE_IDS_V2).toContain(
      "SAME_AMOUNT_CONFIRMS_PAYMENT",
    );
  });

  it("is immutable and resolves exact IDs without coercion", () => {
    expect(Object.isFrozen(FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2)).toBe(true);
    expect(Object.isFrozen(FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V2)).toBe(true);
    expect(Object.isFrozen(FISCAL_NOTIFICATION_CAUSAL_RELATIONS_V2)).toBe(true);
    expect(Object.isFrozen(FISCAL_NOTIFICATION_PROHIBITED_INFERENCE_IDS_V2))
      .toBe(true);
    expect(Reflect.set(
      resolveFiscalNotificationDocumentFamilyV2("payment.receipt") ?? {},
      "permitsPaymentAction",
      true,
    )).toBe(false);
    for (const invalid of [
      " payment.receipt",
      "PAYMENT.RECEIPT",
      "payment.\u0000receipt",
      "payment.unknown",
      "x".repeat(1_000_000),
      "__proto__",
      1,
      null,
      {},
    ]) {
      expect(resolveFiscalNotificationDocumentFamilyV2(invalid)).toBeNull();
    }
  });

  it("contains no runtime network, AI, persistence, PII or materializer", () => {
    const source = readFileSync(
      new URL("./document-families.v2.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|Date\.now|new Date|Math\.random|ownerScope|documentId|taxId|\bCSV\b|\bIBAN\b|create.*(?:Debt|Deadline|Payment|Entry)|prepareAccountingDraft|reportInstallmentPayment/iu,
    );
  });
});
