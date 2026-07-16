import { describe, expect, it } from "vitest";
import { FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3 } from "../knowledge/document-families.v3";
import { BASE_EXTRACTOR_IDS_V1 } from "./extractor-contract.v1";
import { FISCAL_NOTIFICATION_FAMILY_RULES_V2 } from "./family-rule-registry.v2";
import {
  FISCAL_NOTIFICATION_FAMILY_EXTRACTOR_BINDINGS_V1,
  resolveFamilyExtractorBindingV1,
} from "./family-extractor-registry.v1";

describe("family to reusable extractor registry v1", () => {
  it("maps all 87 catalog families exactly once", () => {
    expect(FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3).toHaveLength(87);
    expect(FISCAL_NOTIFICATION_FAMILY_EXTRACTOR_BINDINGS_V1).toHaveLength(87);
    expect(new Set(FISCAL_NOTIFICATION_FAMILY_EXTRACTOR_BINDINGS_V1.map((entry) => entry.familyId)).size).toBe(87);
    expect(FISCAL_NOTIFICATION_FAMILY_EXTRACTOR_BINDINGS_V1.map((entry) => entry.familyId)).toEqual(
      FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3,
    );
  });

  it("uses every one of the 16 reusable engines", () => {
    expect(new Set(FISCAL_NOTIFICATION_FAMILY_EXTRACTOR_BINDINGS_V1.map((entry) => entry.extractorId))).toEqual(
      new Set(BASE_EXTRACTOR_IDS_V1),
    );
  });

  it.each([
    ["notification.dehu_envelope", "notification-envelope"],
    ["compliance.formal_filing_requirement", "requirement"],
    ["compliance.document_request", "requirement"],
    ["assessment.final_provisional_assessment", "assessment"],
    ["collection.deferral_grant", "deferral"],
    ["collection.offset_ex_officio", "compensation"],
    ["collection.enforcement_order", "payment-order"],
    ["payment.payment_form", "payment-order"],
    ["payment.receipt", "payment-evidence"],
    ["seizure.real_estate", "seizure"],
    ["review.resolution", "appeal-and-review"],
  ] as const)("maps %s to %s", (familyId, extractorId) => {
    expect(resolveFamilyExtractorBindingV1(familyId)).toMatchObject({
      familyId,
      extractorId,
      extractorVersion: "1.0.0",
    });
  });

  it("marks all 87 rule-backed profile extractors review-only without confirming a family", () => {
    expect(FISCAL_NOTIFICATION_FAMILY_RULES_V2).toHaveLength(87);
    expect(
      FISCAL_NOTIFICATION_FAMILY_EXTRACTOR_BINDINGS_V1.every(
        (binding) =>
          binding.implementationStatus ===
            "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY" &&
          binding.classificationRuleIds.includes(
            `family-rule.${binding.familyId}.v2`,
          ),
      ),
    ).toBe(true);
    expect(
      resolveFamilyExtractorBindingV1("sanction.resolution"),
    ).toMatchObject({
      implementationStatus: "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY",
      classificationRuleIds: [
        "family-rule.sanction.resolution.v2",
        "classification.segment-main-act-only.v1",
      ],
    });
  });
});
