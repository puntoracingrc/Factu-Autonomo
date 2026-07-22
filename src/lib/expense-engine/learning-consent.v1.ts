import { EXPENSE_ENGINE_PRIVACY_POLICY_VERSION } from "./contracts";

export const EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1 =
  "expense-engine-learning-consent.v1" as const;
export const EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1 =
  "expense-learning-notice.v1" as const;
export const EXPENSE_LEARNING_CONSENT_PURPOSE_V1 =
  "IMPROVE_LOCAL_EXPENSE_READER" as const;
export const EXPENSE_LEARNING_CONSENT_DECISION_MAX_BODY_BYTES_V1 = 512;

export interface ExpenseLearningConsentDecisionV1 {
  readonly schemaVersion: typeof EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1;
  readonly noticeVersion: typeof EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1;
  readonly purpose: typeof EXPENSE_LEARNING_CONSENT_PURPOSE_V1;
  readonly privacyPolicyVersion: typeof EXPENSE_ENGINE_PRIVACY_POLICY_VERSION;
  readonly granted: boolean;
}

const DECISION_KEYS = [
  "schemaVersion",
  "noticeVersion",
  "purpose",
  "privacyPolicyVersion",
  "granted",
] as const;

export function isExpenseLearningConsentDecisionBodySizeAllowedV1(
  byteLength: unknown,
): boolean {
  return (
    Number.isSafeInteger(byteLength) &&
    Number(byteLength) >= 0 &&
    Number(byteLength) <= EXPENSE_LEARNING_CONSENT_DECISION_MAX_BODY_BYTES_V1
  );
}

export function normalizeExpenseLearningConsentDecisionV1(
  value: unknown,
): ExpenseLearningConsentDecisionV1 | null {
  const input = strictRecord(value, DECISION_KEYS);
  if (
    !input ||
    input.schemaVersion !== EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1 ||
    input.noticeVersion !== EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1 ||
    input.purpose !== EXPENSE_LEARNING_CONSENT_PURPOSE_V1 ||
    input.privacyPolicyVersion !== EXPENSE_ENGINE_PRIVACY_POLICY_VERSION ||
    typeof input.granted !== "boolean"
  ) {
    return null;
  }

  return Object.freeze({
    schemaVersion: EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1,
    noticeVersion: EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1,
    purpose: EXPENSE_LEARNING_CONSENT_PURPOSE_V1,
    privacyPolicyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    granted: input.granted,
  });
}

function strictRecord(
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;

  const keys = Reflect.ownKeys(value);
  if (
    keys.some((key) => typeof key !== "string" || !allowedKeys.includes(key))
  ) {
    return null;
  }

  const output: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) return null;
    output[String(key)] = descriptor.value;
  }
  return output;
}
