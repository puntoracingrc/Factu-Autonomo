import { describe, expect, it } from "vitest";
import {
  evaluateAeatP0CalendarDeadlineV10,
  evaluateExtensionRequestV10,
  evaluateRectifyingReturnRouteV10,
  reconcileExtensionDecisionV10,
} from "./p0-deadline-engine.v10";

const evaluatedAt = "2026-07-17T10:00:00Z";
const evidenceIds = ["evidence-p0-v10"] as const;

describe("AEAT P0 deadline engine v10", () => {
  it("applies the article 91 automatic half-extension only with complete eligibility", () => {
    const eligible = evaluateExtensionRequestV10({
      filingDateTime: "2026-07-10T09:00:00Z",
      originalDeadline: "2026-07-20",
      originalTermDays: 10,
      motivated: true,
      noThirdPartyPrejudice: true,
      isFirstRequest: true,
      evaluatedAt,
      evidenceIds,
    });
    expect(eligible).toMatchObject({
      ruleId: "EXTENSION_AUTOMATIC_EFFECT",
      state: "AUTO_GRANTED_BY_RULE",
      triggerDate: "2026-07-10",
      calculatedDate: "2026-07-25",
      requiresHumanReview: true,
      autoActionBlocked: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    expect(eligible.deterministicTrace).toContain("half_term_days:5");
    expect(eligible.source.sourceId).toBe("BOE_RD1065_ART91");

    for (const override of [
      { filingDateTime: "2026-07-17T00:00:00Z" },
      { motivated: false },
      { noThirdPartyPrejudice: false },
      { isFirstRequest: false },
    ]) {
      expect(evaluateExtensionRequestV10({
        filingDateTime: "2026-07-10T09:00:00Z",
        originalDeadline: "2026-07-20",
        originalTermDays: 10,
        motivated: true,
        noThirdPartyPrejudice: true,
        isFirstRequest: true,
        evaluatedAt,
        evidenceIds,
        ...override,
      }).state).toBe("INELIGIBLE");
    }
  });

  it("returns pending data instead of treating absence as a refusal", () => {
    const pending = evaluateExtensionRequestV10({
      filingDateTime: null,
      originalDeadline: null,
      originalTermDays: null,
      motivated: null,
      noThirdPartyPrejudice: null,
      isFirstRequest: null,
      evaluatedAt,
      evidenceIds,
    });
    expect(pending.state).toBe("INFORMATION_PENDING");
    expect(pending.assertionLayers).toContain("NOT_PROVEN");
    expect(pending.calculatedDate).toBeNull();

    const eligibleWithoutDuration = evaluateExtensionRequestV10({
      filingDateTime: "2026-07-10",
      originalDeadline: "2026-07-20",
      originalTermDays: null,
      motivated: true,
      noThirdPartyPrejudice: true,
      isFirstRequest: true,
      evaluatedAt,
      evidenceIds,
    });
    expect(eligibleWithoutDuration.state).toBe("ELIGIBLE_FOR_AUTOMATIC_HALF_EXTENSION");
    expect(eligibleWithoutDuration.calculatedDate).toBeNull();
  });

  it("reconciles express grants and only accepts a timely express denial", () => {
    const automatic = evaluateExtensionRequestV10({
      filingDateTime: "2026-07-10",
      originalDeadline: "2026-07-20",
      originalTermDays: 10,
      motivated: true,
      noThirdPartyPrejudice: true,
      isFirstRequest: true,
      evaluatedAt,
      evidenceIds,
    });
    const granted = reconcileExtensionDecisionV10({
      previous: automatic,
      decisionResult: "GRANTED_SHORTER",
      decisionNotifiedAt: "2026-07-15",
      explicitNewDeadline: "2026-07-23",
      evaluatedAt: "2026-07-18T10:00:00Z",
      evidenceIds: ["decision-grant"],
    });
    expect(granted).toMatchObject({ state: "EXPRESS_GRANTED", calculatedDate: "2026-07-23" });
    expect(granted.stateHistory).toHaveLength(2);

    const timelyDenial = reconcileExtensionDecisionV10({
      previous: automatic,
      decisionResult: "DENIED",
      decisionNotifiedAt: "2026-07-20T10:00:00Z",
      explicitNewDeadline: null,
      evaluatedAt: "2026-07-20T11:00:00Z",
      evidenceIds: ["decision-denial"],
    });
    expect(timelyDenial).toMatchObject({ state: "EXPRESS_DENIED", calculatedDate: null });

    const lateDenial = reconcileExtensionDecisionV10({
      previous: automatic,
      decisionResult: "DENIED",
      decisionNotifiedAt: "2026-07-21T00:00:00Z",
      explicitNewDeadline: null,
      evaluatedAt: "2026-07-21T01:00:00Z",
      evidenceIds: ["decision-late"],
    });
    expect(lateDenial).toMatchObject({ state: "REVIEW_REQUIRED", calculatedDate: "2026-07-25" });
  });

  it("does not crash or reverse state when an earlier evaluation lacked the original deadline", () => {
    const pending = evaluateExtensionRequestV10({
      filingDateTime: null,
      originalDeadline: null,
      originalTermDays: null,
      motivated: null,
      noThirdPartyPrejudice: null,
      isFirstRequest: null,
      evaluatedAt,
      evidenceIds,
    });
    const reconciled = reconcileExtensionDecisionV10({
      previous: pending,
      decisionResult: "DENIED",
      decisionNotifiedAt: "2026-07-19",
      explicitNewDeadline: null,
      evaluatedAt: "2026-07-19T12:00:00Z",
      evidenceIds: ["decision-without-origin"],
    });
    expect(reconciled.state).toBe("REVIEW_REQUIRED");
    expect(reconciled.deterministicTrace).toContain("original_deadline:not_carried");
  });

  it("calculates rectification, execution and certificate dates from explicit triggers", () => {
    const cases = [
      ["RECTIFICATION_MAX_RESOLUTION", "2026-01-31", "2026-07-31"],
      ["RECTIFICATION_PROPOSAL_ALLEGATIONS", "2026-07-01", "2026-07-16"],
      ["RECTIFICATION_RESOLUTION_APPEAL", "2026-07-31", "2026-08-31"],
      ["REVIEW_EXECUTION_ISSUE", "2026-07-31", "2026-08-31"],
      ["CERTIFICATE_DISAGREEMENT", "2026-07-01", "2026-07-11"],
      ["CERTIFICATE_REISSUE", "2026-07-01", "2026-07-11"],
    ] as const;
    for (const [ruleId, triggerDate, expected] of cases) {
      const result = evaluateAeatP0CalendarDeadlineV10({ ruleId, triggerDate, evaluatedAt, evidenceIds });
      expect(result.state, ruleId).toBe("CALCULATED_REVIEW_REQUIRED");
      expect(result.calculatedDate, ruleId).toBe(expected);
      expect(result.autoActionBlocked, ruleId).toBe(true);
    }
    expect(evaluateAeatP0CalendarDeadlineV10({
      ruleId: "RECTIFICATION_PROPOSAL_ALLEGATIONS",
      triggerDate: null,
      evaluatedAt,
      evidenceIds,
    }).state).toBe("INFORMATION_PENDING");
  });

  it("uses the 303 temporal gate and preserves every traditional-route exception", () => {
    const route = (fiscalYear: number, taxPeriod: string, traditionalRouteException = false) => evaluateRectifyingReturnRouteV10({
      model: "303",
      fiscalYear,
      taxPeriod,
      rectifyingFlag: true,
      originalReceiptAvailable: true,
      reasonCount: 1,
      traditionalRouteException,
      evaluatedAt,
      evidenceIds,
    }).state;
    expect(route(2024, "09")).toBe("RECTIFYING_ROUTE_ALLOWED");
    expect(route(2024, "3T")).toBe("RECTIFYING_ROUTE_ALLOWED");
    expect(route(2024, "08")).toBe("TRADITIONAL_ROUTE_REQUIRED");
    expect(route(2024, "2T")).toBe("TRADITIONAL_ROUTE_REQUIRED");
    expect(route(2025, "01", true)).toBe("TRADITIONAL_ROUTE_REQUIRED");
    expect(evaluateRectifyingReturnRouteV10({
      model: null,
      fiscalYear: null,
      taxPeriod: null,
      rectifyingFlag: null,
      originalReceiptAvailable: null,
      reasonCount: null,
      traditionalRouteException: null,
      evaluatedAt,
      evidenceIds,
    }).state).toBe("INFORMATION_PENDING");
  });

  it("keeps certificate validity conditional on scope and changed circumstances", () => {
    expect(evaluateAeatP0CalendarDeadlineV10({
      ruleId: "CERTIFICATE_GENERAL_VALIDITY",
      triggerDate: "2026-07-17",
      periodicObligation: true,
      specificValidityDate: null,
      changedCircumstances: false,
      evaluatedAt,
      evidenceIds,
    })).toMatchObject({
      state: "CERTIFICATE_WITHIN_GENERAL_VALIDITY_REVIEW_REQUIRED",
      calculatedDate: "2027-07-17",
    });
    expect(evaluateAeatP0CalendarDeadlineV10({
      ruleId: "CERTIFICATE_GENERAL_VALIDITY",
      triggerDate: "2026-07-17",
      periodicObligation: false,
      specificValidityDate: null,
      changedCircumstances: false,
      evaluatedAt,
      evidenceIds,
    }).calculatedDate).toBe("2026-10-17");
    expect(evaluateAeatP0CalendarDeadlineV10({
      ruleId: "CERTIFICATE_GENERAL_VALIDITY",
      triggerDate: "2026-07-17",
      periodicObligation: true,
      specificValidityDate: null,
      changedCircumstances: true,
      evaluatedAt,
      evidenceIds,
    }).state).toBe("REVIEW_REQUIRED");

    const expired = evaluateAeatP0CalendarDeadlineV10({
      ruleId: "CERTIFICATE_GENERAL_VALIDITY",
      triggerDate: "2025-01-15",
      periodicObligation: false,
      specificValidityDate: null,
      changedCircumstances: false,
      evaluatedAt,
      evidenceIds,
    });
    expect(expired).toMatchObject({
      state: "CERTIFICATE_EXPIRED_REVIEW_REQUIRED",
      calculatedDate: "2025-04-15",
    });
    expect(expired.deterministicTrace).toContain("certificate_expired:true");

    expect(evaluateAeatP0CalendarDeadlineV10({
      ruleId: "CERTIFICATE_GENERAL_VALIDITY",
      triggerDate: "2025-01-15",
      periodicObligation: null,
      specificValidityDate: "2027-01-15",
      changedCircumstances: true,
      evaluatedAt,
      evidenceIds,
    }).state).toBe("REVIEW_REQUIRED");
  });

  it("is deterministic and rejects implicit current time or duplicate evidence", () => {
    const input = {
      ruleId: "CERTIFICATE_DISAGREEMENT" as const,
      triggerDate: "2026-07-01",
      evaluatedAt,
      evidenceIds,
    };
    expect(evaluateAeatP0CalendarDeadlineV10(input)).toEqual(evaluateAeatP0CalendarDeadlineV10(input));
    expect(() => evaluateAeatP0CalendarDeadlineV10({ ...input, evaluatedAt: "now" })).toThrow("AEAT_P0_DEADLINE_V10_INVALID:evaluatedAt");
    expect(() => evaluateAeatP0CalendarDeadlineV10({ ...input, evidenceIds: ["same", "same"] })).toThrow("AEAT_P0_DEADLINE_V10_INVALID:evidenceIds");
  });
});
