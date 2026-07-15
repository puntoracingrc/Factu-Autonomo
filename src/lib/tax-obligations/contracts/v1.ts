export const TAX_OBLIGATIONS_CONTRACT_VERSION = "1.0.0" as const;
export const TAX_OBLIGATIONS_CATALOG_VERSION =
  "es-tax-models.2026-07.v1" as const;

export const TAX_OBLIGATIONS_STORAGE_LOCATION =
  "AppData.profile.taxModelDiagnostic.publishedAssessment" as const;

export const TAX_OBLIGATION_MODEL_CODES = [
  "035",
  "036",
  "100",
  "111",
  "115",
  "123",
  "130",
  "131",
  "180",
  "184",
  "190",
  "193",
  "200",
  "202",
  "216",
  "296",
  "303",
  "308",
  "309",
  "341",
  "347",
  "349",
  "369",
  "390",
  "714",
  "720",
  "721",
] as const;

export type TaxObligationModelCode =
  (typeof TAX_OBLIGATION_MODEL_CODES)[number];

export type TaxObligationStatus =
  | "REQUIRED"
  | "NOT_APPLICABLE"
  | "REVIEW_REQUIRED"
  | "UNKNOWN";

export type TaxObligationDecisionBasis =
  | "CONFIRMED_FACTS"
  | "INCOMPLETE_PROFILE"
  | "CONFLICTING_EVIDENCE"
  | "UNSUPPORTED_TERRITORY"
  | "PROVISIONAL_RULES";

export type TaxObligationDecisionState =
  | "CONFIRMED"
  | "PROVISIONAL"
  | "INSUFFICIENT_DATA"
  | "CONFLICTING_EVIDENCE";

export type TaxObligationProfileState =
  | "COMPLETE"
  | "INCOMPLETE"
  | "CONFLICTED";

export type TaxObligationsResolutionState =
  | "RESOLVED"
  | "MANUAL_REVIEW"
  | "BLOCKED";

export type TaxObligationsRuleReviewState =
  | "PENDING_FISCAL_REVIEW"
  | "APPROVED";

export interface TaxObligationEvidenceV1 {
  kind: "QUESTIONNAIRE" | "CENSUS" | "RECONCILIATION";
  summary: string;
}

export interface TaxObligationAssessmentItemV1 {
  modelCode: TaxObligationModelCode;
  status: TaxObligationStatus;
  decisionState: TaxObligationDecisionState;
  decisionBasis: TaxObligationDecisionBasis;
  evidenceSufficient: boolean;
  reason: string;
  evidence: TaxObligationEvidenceV1[];
  missingInformation: string[];
  conflicts: string[];
}

export interface TaxObligationsAssessmentV1 {
  contractVersion: typeof TAX_OBLIGATIONS_CONTRACT_VERSION;
  catalogVersion: typeof TAX_OBLIGATIONS_CATALOG_VERSION;
  ruleSetVersion: string;
  ruleReviewState: TaxObligationsRuleReviewState;
  resolutionState: TaxObligationsResolutionState;
  traceability: {
    engineVersion: string;
    sourceSchemaVersion: number;
  };
  generatedAt: string;
  fiscalYear: number;
  territory: string;
  profile: {
    state: TaxObligationProfileState;
    missingInformation: string[];
    conflicts: string[];
  };
  obligations: TaxObligationAssessmentItemV1[];
}

const STATUS_SET = new Set<TaxObligationStatus>([
  "REQUIRED",
  "NOT_APPLICABLE",
  "REVIEW_REQUIRED",
  "UNKNOWN",
]);
const DECISION_STATE_SET = new Set<TaxObligationDecisionState>([
  "CONFIRMED",
  "PROVISIONAL",
  "INSUFFICIENT_DATA",
  "CONFLICTING_EVIDENCE",
]);
const DECISION_BASIS_SET = new Set<TaxObligationDecisionBasis>([
  "CONFIRMED_FACTS",
  "INCOMPLETE_PROFILE",
  "CONFLICTING_EVIDENCE",
  "UNSUPPORTED_TERRITORY",
  "PROVISIONAL_RULES",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown, maxItems = 100): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => typeof item === "string" && item.length <= 1_000)
  );
}

/** Strict persistence boundary for the public, versioned assessment snapshot. */
export function isTaxObligationsAssessmentV1(
  value: unknown,
): value is TaxObligationsAssessmentV1 {
  if (
    !isRecord(value) ||
    value.contractVersion !== TAX_OBLIGATIONS_CONTRACT_VERSION ||
    value.catalogVersion !== TAX_OBLIGATIONS_CATALOG_VERSION ||
    typeof value.ruleSetVersion !== "string" ||
    value.ruleSetVersion.length > 200 ||
    (value.ruleReviewState !== "PENDING_FISCAL_REVIEW" &&
      value.ruleReviewState !== "APPROVED") ||
    (value.resolutionState !== "RESOLVED" &&
      value.resolutionState !== "MANUAL_REVIEW" &&
      value.resolutionState !== "BLOCKED") ||
    typeof value.generatedAt !== "string" ||
    !Number.isFinite(Date.parse(value.generatedAt)) ||
    (value.fiscalYear !== 2025 && value.fiscalYear !== 2026) ||
    typeof value.territory !== "string" ||
    !isRecord(value.traceability) ||
    typeof value.traceability.engineVersion !== "string" ||
    value.traceability.engineVersion.length > 200 ||
    value.traceability.sourceSchemaVersion !== 1 ||
    !isRecord(value.profile) ||
    (value.profile.state !== "COMPLETE" &&
      value.profile.state !== "INCOMPLETE" &&
      value.profile.state !== "CONFLICTED") ||
    !isStringArray(value.profile.missingInformation) ||
    !isStringArray(value.profile.conflicts) ||
    !Array.isArray(value.obligations) ||
    value.obligations.length > TAX_OBLIGATION_MODEL_CODES.length
  ) {
    return false;
  }

  const seenCodes = new Set<TaxObligationModelCode>();
  for (const obligation of value.obligations) {
    if (
      !isRecord(obligation) ||
      typeof obligation.modelCode !== "string" ||
      normalizeTaxObligationModelCode(obligation.modelCode) !==
        obligation.modelCode ||
      seenCodes.has(obligation.modelCode as TaxObligationModelCode) ||
      !STATUS_SET.has(obligation.status as TaxObligationStatus) ||
      !DECISION_STATE_SET.has(
        obligation.decisionState as TaxObligationDecisionState,
      ) ||
      !DECISION_BASIS_SET.has(
        obligation.decisionBasis as TaxObligationDecisionBasis,
      ) ||
      typeof obligation.evidenceSufficient !== "boolean" ||
      typeof obligation.reason !== "string" ||
      obligation.reason.length > 2_000 ||
      !isStringArray(obligation.missingInformation) ||
      !isStringArray(obligation.conflicts) ||
      !Array.isArray(obligation.evidence) ||
      obligation.evidence.length > 100 ||
      !obligation.evidence.every(
        (item) =>
          isRecord(item) &&
          (item.kind === "QUESTIONNAIRE" ||
            item.kind === "CENSUS" ||
            item.kind === "RECONCILIATION") &&
          typeof item.summary === "string" &&
          item.summary.length <= 1_000,
      )
    ) {
      return false;
    }
    seenCodes.add(obligation.modelCode as TaxObligationModelCode);
  }
  return true;
}

const MODEL_CODE_SET = new Set<string>(TAX_OBLIGATION_MODEL_CODES);

/**
 * Normalizes only canonical, single-model codes. It deliberately rejects free
 * text, combined codes and unknown values so consumers never guess obligations.
 */
export function normalizeTaxObligationModelCode(
  value: unknown,
): TaxObligationModelCode | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().padStart(3, "0");
  return MODEL_CODE_SET.has(normalized)
    ? (normalized as TaxObligationModelCode)
    : null;
}
