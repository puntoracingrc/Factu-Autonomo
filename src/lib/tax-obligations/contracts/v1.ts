export const TAX_OBLIGATIONS_CONTRACT_VERSION = "1.0.0-draft.1" as const;
export const TAX_OBLIGATIONS_CATALOG_VERSION =
  "es-tax-models.2026-07.v1" as const;

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
