import { describe, expect, it } from "vitest";
import { EXPENSE_ENGINE_PRIVACY_POLICY_VERSION } from "./contracts";
import {
  EXPENSE_LEARNING_CONSENT_DECISION_MAX_BODY_BYTES_V1,
  EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1,
  EXPENSE_LEARNING_CONSENT_PURPOSE_V1,
  EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1,
  isExpenseLearningConsentDecisionBodySizeAllowedV1,
  normalizeExpenseLearningConsentDecisionV1,
} from "./learning-consent.v1";

function validDecision() {
  return {
    schemaVersion: EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1,
    noticeVersion: EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1,
    purpose: EXPENSE_LEARNING_CONSENT_PURPOSE_V1,
    privacyPolicyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    granted: true,
  };
}

describe("expense learning consent v1", () => {
  it("acepta solo una decision afirmativa o negativa con versiones cerradas", () => {
    const granted = normalizeExpenseLearningConsentDecisionV1(validDecision());
    const withdrawn = normalizeExpenseLearningConsentDecisionV1({
      ...validDecision(),
      granted: false,
    });

    expect(granted).toEqual(validDecision());
    expect(withdrawn?.granted).toBe(false);
    expect(Object.isFrozen(granted)).toBe(true);
  });

  it("rechaza versiones, finalidades y claves no previstas", () => {
    for (const mutation of [
      { schemaVersion: "expense-engine-learning-consent.v2" },
      { noticeVersion: "custom-notice" },
      { purpose: "TRAIN_EXTERNAL_PROVIDER" },
      { privacyPolicyVersion: "custom-policy" },
      { userId: "user-synthetic" },
      { acceptedAt: "2026-07-21T10:00:00.000Z" },
    ]) {
      expect(
        normalizeExpenseLearningConsentDecisionV1({
          ...validDecision(),
          ...mutation,
        }),
      ).toBeNull();
    }
  });

  it("rechaza getters, arrays y prototipos no planos", () => {
    const withGetter = validDecision() as Record<string, unknown>;
    Object.defineProperty(withGetter, "granted", {
      enumerable: true,
      get: () => true,
    });

    expect(normalizeExpenseLearningConsentDecisionV1(withGetter)).toBeNull();
    expect(normalizeExpenseLearningConsentDecisionV1([])).toBeNull();
    expect(
      normalizeExpenseLearningConsentDecisionV1(
        Object.assign(Object.create({ inherited: true }), validDecision()),
      ),
    ).toBeNull();
  });

  it("publica un limite estricto para el futuro body", () => {
    expect(
      isExpenseLearningConsentDecisionBodySizeAllowedV1(
        EXPENSE_LEARNING_CONSENT_DECISION_MAX_BODY_BYTES_V1,
      ),
    ).toBe(true);
    expect(
      isExpenseLearningConsentDecisionBodySizeAllowedV1(
        EXPENSE_LEARNING_CONSENT_DECISION_MAX_BODY_BYTES_V1 + 1,
      ),
    ).toBe(false);
    expect(isExpenseLearningConsentDecisionBodySizeAllowedV1(1.5)).toBe(false);
  });
});
