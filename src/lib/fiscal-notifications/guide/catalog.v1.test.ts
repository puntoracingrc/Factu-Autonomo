import { describe, expect, it } from "vitest";
import {
  FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1,
  resolveFiscalNotificationGuideSelectionV1,
} from "@/lib/fiscal-notifications/guide/catalog.v1";
import { FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2 } from "@/lib/fiscal-notifications/knowledge/document-families.v2";

describe("fiscal notification guide catalog v1", () => {
  it("projects every v2 family without activating rules or operations", () => {
    expect(FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1).toHaveLength(87);
    expect(
      FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1.map((entry) => entry.familyId),
    ).toEqual(FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.map((family) => family.id));

    for (const entry of FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1) {
      expect(entry.schemaVersion).toBe(1);
      expect(entry.legalReviewStatus).toBe("LEGAL_REVIEW_PENDING");
      expect(entry.requiresHumanReview).toBe(true);
      expect(entry.printedDocumentPolicy).toBe(
        "EXTRACT_EXACTLY_THEN_REQUIRE_REVIEW",
      );
      expect(entry.officialContextPolicy).toBe(
        "INTERPRET_ONLY_NEVER_OVERRIDE_DOCUMENT",
      );
      expect(entry.coverage.legalRuleActive).toBe(false);
      expect(entry.coverage.operationalActionActive).toBe(false);
      expect(entry.coverage.automaticRelationConfirmationActive).toBe(false);
      expect(entry.permitsDebtCreation).toBe(false);
      expect(entry.permitsDeadlineCreation).toBe(false);
      expect(entry.permitsPaymentAction).toBe(false);
      expect(entry.permitsAccountingAction).toBe(false);
      expect(entry.permitsAutomaticRelationConfirmation).toBe(false);
      expect(entry.documentChecks.length).toBeGreaterThan(0);
      expect(entry.prohibitions).toHaveLength(10);
    }
  });

  it("keeps carta de pago separate from evidence that a payment occurred", () => {
    const paymentForm = resolveFiscalNotificationGuideSelectionV1(
      "payment.payment_form",
    );
    const paymentReceipt = resolveFiscalNotificationGuideSelectionV1(
      "payment.receipt",
    );
    expect(paymentForm.status).toBe("SELECTED");
    expect(paymentReceipt.status).toBe("SELECTED");
    if (
      paymentForm.status !== "SELECTED" ||
      paymentReceipt.status !== "SELECTED"
    ) {
      throw new Error("Expected distinct guide entries");
    }

    expect(paymentForm.entry.familyId).not.toBe(paymentReceipt.entry.familyId);
    expect(paymentForm.entry.category).toBe("PAYMENT_INSTRUMENT");
    expect(paymentReceipt.entry.category).toBe("PAYMENT_EVIDENCE");
    expect(
      paymentForm.entry.prohibitions.find(
        (item) => item.id === "PAYMENT_FORM_IS_PAYMENT_RECEIPT",
      )?.label,
    ).toContain("no acredita");
    expect(
      paymentForm.entry.possibleNext.some(
        (related) => related.familyId === "payment.receipt",
      ),
    ).toBe(true);
    expect(
      paymentForm.entry.possibleNext.every(
        (related) => related.status === "SUGGESTED_ONLY" && !related.autoConfirm,
      ),
    ).toBe(true);
  });

  it("derives only suggested before/after context from v2 causal relations", () => {
    const enforcement = resolveFiscalNotificationGuideSelectionV1(
      "collection.enforcement_order",
    );
    expect(enforcement.status).toBe("SELECTED");
    if (enforcement.status !== "SELECTED") {
      throw new Error("Expected enforcement guide entry");
    }

    expect(
      enforcement.entry.possiblePrevious.map((entry) => entry.familyId),
    ).toEqual(
      expect.arrayContaining([
        "collection.deferral_breach",
        "assessment.final_provisional_assessment",
        "inspection.assessment",
        "payment.failed_or_reversed",
      ]),
    );
    expect(
      enforcement.entry.possibleNext.map((entry) => entry.familyId),
    ).toContain("seizure.bank_account");
    for (const related of [
      ...enforcement.entry.possiblePrevious,
      ...enforcement.entry.possibleNext,
    ]) {
      expect(related.matchPolicy).toBe(
        "EXPLICIT_REFERENCE_OR_HUMAN_CONFIRMATION_REQUIRED",
      );
      expect(related.autoConfirm).toBe(false);
    }
  });

  it("resolves query selections exactly and fails closed for malformed or unknown values", () => {
    expect(resolveFiscalNotificationGuideSelectionV1(undefined)).toEqual({
      status: "INDEX",
      entry: null,
    });
    expect(
      resolveFiscalNotificationGuideSelectionV1(
        "compliance.formal_filing_requirement",
      ),
    ).toMatchObject({
      status: "SELECTED",
      entry: { familyId: "compliance.formal_filing_requirement" },
    });

    for (const value of [
      "unknown.family",
      " compliance.formal_filing_requirement",
      "compliance.formal_filing_requirement ",
      "compliance.formal_filing_requirement\n",
      ["compliance.formal_filing_requirement"],
      1,
      "x".repeat(161),
    ]) {
      const result = resolveFiscalNotificationGuideSelectionV1(value);
      expect(result).toEqual({ status: "UNKNOWN_OR_INVALID", entry: null });
      expect(Object.isFrozen(result)).toBe(true);
    }
  });

  it("publishes defensive immutable guide projections", () => {
    const first = FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1[0];
    expect(Object.isFrozen(FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.aliases)).toBe(true);
    expect(Object.isFrozen(first.sources)).toBe(true);
    expect(Object.isFrozen(first.coverage)).toBe(true);
    expect(Object.isFrozen(first.coverage.blockers)).toBe(true);
    expect(Object.isFrozen(first.possiblePrevious)).toBe(true);
    expect(Object.isFrozen(first.possibleNext)).toBe(true);
    expect(Object.isFrozen(first.prohibitions)).toBe(true);
  });
});
