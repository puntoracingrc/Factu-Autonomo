import { describe, expect, it } from "vitest";
import { FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3 } from "../knowledge/document-families.v3";
import { BASE_EXTRACTOR_IDS_V1 } from "./extractor-contract.v1";
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

  it("marks only executable review-only adapters complete, never by taxonomy alone", () => {
    expect(resolveFamilyExtractorBindingV1("collection.enforcement_order")?.implementationStatus).toBe("EXTRACTOR_IMPLEMENTED_REVIEW_ONLY");
    expect(resolveFamilyExtractorBindingV1("collection.deferral_grant")?.implementationStatus).toBe("EXTRACTOR_IMPLEMENTED_REVIEW_ONLY");
    expect(resolveFamilyExtractorBindingV1("collection.offset_requested")?.implementationStatus).toBe("EXTRACTOR_IMPLEMENTED_REVIEW_ONLY");
    expect(resolveFamilyExtractorBindingV1("collection.offset_ex_officio")?.implementationStatus).toBe("EXTRACTOR_IMPLEMENTED_REVIEW_ONLY");
    expect(resolveFamilyExtractorBindingV1("compliance.formal_filing_requirement")?.implementationStatus).toBe("EXTRACTOR_IMPLEMENTED_REVIEW_ONLY");
    expect(resolveFamilyExtractorBindingV1("assessment.allegations_and_proposal")?.implementationStatus).toBe("EXTRACTOR_IMPLEMENTED_REVIEW_ONLY");
    expect(resolveFamilyExtractorBindingV1("assessment.final_provisional_assessment")?.implementationStatus).toBe("EXTRACTOR_IMPLEMENTED_REVIEW_ONLY");
    expect(resolveFamilyExtractorBindingV1("sanction.resolution")?.implementationStatus).toBe("CONTRACT_ONLY");
  });
});
