import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FISCAL_NOTIFICATION_CAUSAL_RELATIONS_V2,
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2,
  FISCAL_NOTIFICATION_PROHIBITED_INFERENCE_IDS_V2,
} from "./document-families.v2";
import {
  FISCAL_NOTIFICATION_FAMILY_COVERAGE_V2,
  FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_SUMMARY_V2,
  resolveFiscalNotificationFamilyCoverageV2,
} from "./coverage.v2";
import { FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2 } from "./official-sources.v2";

describe("fiscal notification knowledge coverage v2", () => {
  it("publishes an honest incomplete snapshot with zero active rules or actions", () => {
    expect(FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_SUMMARY_V2).toMatchObject({
      familyCount: 87,
      v1BaselineFamilyCount: 41,
      p0FamilyCount: 34,
      p1FamilyCount: 12,
      sourceCount: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2.length,
      urlVerifiedSourceCount: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2.length,
      contentHashVerifiedSourceCount: 0,
      legallyReviewedSourceCount: 0,
      candidateHandlerCount: 2,
      explicitFactExtractorCount: 1,
      syntheticTestCaseCount: 2,
      registeredTemplateVariantCount: 0,
      activeLegalRuleCount: 0,
      activeOperationalActionCount: 0,
      automaticRelationConfirmationCount: 0,
      suggestedCausalRelationCount: FISCAL_NOTIFICATION_CAUSAL_RELATIONS_V2.length,
      prohibitedInferenceCount:
        FISCAL_NOTIFICATION_PROHIBITED_INFERENCE_IDS_V2.length,
      partialReviewOnlyFamilyCount: 2,
      missingFamilyCount: 85,
      completeFamilyCount: 0,
      paymentFormIsPaymentReceipt: false,
      officialContextMayOverridePrintedDocument: false,
      overallStatus: "REVIEW_ONLY_INCOMPLETE",
      requiresDocumentEvidence: true,
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    expect(
      FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_SUMMARY_V2.aeatSourceCount +
      FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_SUMMARY_V2.boeSourceCount,
    ).toBe(FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2.length);
    expect(Object.isFrozen(FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_SUMMARY_V2))
      .toBe(true);
  });

  it("covers every family exactly once and preserves fail-closed blockers", () => {
    expect(FISCAL_NOTIFICATION_FAMILY_COVERAGE_V2).toHaveLength(87);
    expect(FISCAL_NOTIFICATION_FAMILY_COVERAGE_V2.map(
      (entry) => entry.familyId,
    )).toEqual(FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.map(
      (entry) => entry.id,
    ));
    expect(new Set(FISCAL_NOTIFICATION_FAMILY_COVERAGE_V2.map(
      (entry) => entry.familyId,
    )).size).toBe(87);
    for (const entry of FISCAL_NOTIFICATION_FAMILY_COVERAGE_V2) {
      expect(entry.legalRuleActive).toBe(false);
      expect(entry.operationalActionActive).toBe(false);
      expect(entry.automaticRelationConfirmationActive).toBe(false);
      expect(entry.templateVariantRegistered).toBe(false);
      expect(entry.blockers).toEqual(expect.arrayContaining([
        "OFFICIAL_CONTEXT_ONLY_NOT_A_RULE",
        "SOURCE_CONTENT_HASH_MISSING",
        "TEMPLATE_VARIANT_NOT_REGISTERED",
        "LEGAL_REVIEW_PENDING",
        "OPERATIONAL_ACTIVATION_PROHIBITED",
      ]));
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.blockers)).toBe(true);
    }
    expect(Object.isFrozen(FISCAL_NOTIFICATION_FAMILY_COVERAGE_V2)).toBe(true);
  });

  it("marks every P0/P1 family missing until a synthetic fixture and handler exist", () => {
    for (const family of FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.filter(
      (entry) => entry.knowledgePriority !== "V1_BASELINE",
    )) {
      expect(resolveFiscalNotificationFamilyCoverageV2(family.id)).toMatchObject({
        status: "MISSING",
        candidateHandlerImplemented: false,
        explicitFactExtractorImplemented: false,
        syntheticTestCaseAvailable: false,
        legalRuleActive: false,
        operationalActionActive: false,
        blockers: expect.arrayContaining([
          "SYNTHETIC_FIXTURE_MISSING",
          "CANDIDATE_HANDLER_MISSING",
          "EXPLICIT_FACT_EXTRACTOR_MISSING",
        ]),
      });
    }
  });

  it("does not let payment evidence or official context materialize payment", () => {
    expect(resolveFiscalNotificationFamilyCoverageV2("payment.payment_form"))
      .toMatchObject({ legalRuleActive: false, operationalActionActive: false });
    expect(resolveFiscalNotificationFamilyCoverageV2("payment.receipt"))
      .toMatchObject({
        status: "MISSING",
        legalRuleActive: false,
        operationalActionActive: false,
        automaticRelationConfirmationActive: false,
      });
    expect(resolveFiscalNotificationFamilyCoverageV2(
      "payment.failed_or_reversed",
    )).toMatchObject({ status: "MISSING", operationalActionActive: false });
  });

  it("resolves exact IDs only and contains no runtime operational machinery", () => {
    for (const invalid of [
      " payment.receipt",
      "PAYMENT.RECEIPT",
      "payment.\u0000receipt",
      "unknown",
      "x".repeat(1_000_000),
      1,
      null,
      {},
    ]) {
      expect(resolveFiscalNotificationFamilyCoverageV2(invalid)).toBeNull();
    }
    const source = readFileSync(
      new URL("./coverage.v2.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|Date\.now|new Date|Math\.random|ownerScope|documentId|taxId|\bNIF\b|\bCSV\b|\bIBAN\b|create.*(?:Debt|Deadline|Payment|Entry)|prepareAccountingDraft|reportInstallmentPayment/iu,
    );
  });
});
