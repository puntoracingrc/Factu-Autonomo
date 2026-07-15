import type {
  TaxObligationAssessmentItemV1,
  TaxObligationModelCode,
  TaxObligationsAssessmentV1,
} from "../contracts";

export const TAX_MODEL_RECOMMENDATIONS_CONTRACT_VERSION = "1.0.0" as const;

export const TAX_MODEL_RECOMMENDATION_DISCLAIMER =
  "Esta selección es orientativa y se basa en la información que has proporcionado. Pueden existir excepciones o circunstancias no contempladas. Puedes consultar el catálogo completo y modificar tu selección." as const;

export type TaxModelRecommendationStatus =
  | "LIKELY_REQUIRED"
  | "POSSIBLY_REQUIRED"
  | "UNLIKELY_REQUIRED"
  | "NEEDS_INFORMATION"
  | "MANUALLY_SELECTED";

export const TAX_MODEL_RECOMMENDATION_LABELS: Readonly<
  Record<TaxModelRecommendationStatus, string>
> = Object.freeze({
  LIKELY_REQUIRED: "Probablemente necesario",
  POSSIBLY_REQUIRED: "Podría ser necesario",
  UNLIKELY_REQUIRED: "Probablemente no necesario",
  NEEDS_INFORMATION: "Falta información",
  MANUALLY_SELECTED: "Añadido por ti",
});

export interface TaxModelRecommendationItemV1 {
  modelCode: TaxObligationModelCode;
  recommendationStatus: TaxModelRecommendationStatus;
  /** Preserves the deterministic engine result when the user adds a model. */
  engineRecommendationStatus: Exclude<
    TaxModelRecommendationStatus,
    "MANUALLY_SELECTED"
  >;
  manuallySelected: boolean;
  reason: string;
  evidence: readonly TaxObligationAssessmentItemV1["evidence"][number][];
  missingInformation: readonly string[];
  conflicts: readonly string[];
  possibleExceptions: readonly string[];
}

export interface TaxModelRecommendationsV1 {
  contractVersion: typeof TAX_MODEL_RECOMMENDATIONS_CONTRACT_VERSION;
  sourceContractVersion: TaxObligationsAssessmentV1["contractVersion"];
  catalogVersion: TaxObligationsAssessmentV1["catalogVersion"];
  ruleSetVersion: string;
  generatedAt: string;
  fiscalYear: number;
  territory: string;
  ruleReviewState: TaxObligationsAssessmentV1["ruleReviewState"];
  resolutionState: TaxObligationsAssessmentV1["resolutionState"];
  authorizedFiscalExclusion: boolean;
  recommendations: readonly TaxModelRecommendationItemV1[];
}

function engineRecommendationStatus(
  obligation: TaxObligationAssessmentItemV1,
): TaxModelRecommendationItemV1["engineRecommendationStatus"] {
  switch (obligation.status) {
    case "REQUIRED":
      return "LIKELY_REQUIRED";
    case "NOT_APPLICABLE":
      return obligation.conflicts.length > 0
        ? "POSSIBLY_REQUIRED"
        : !obligation.evidenceSufficient ||
            obligation.missingInformation.length > 0
          ? "NEEDS_INFORMATION"
          : "UNLIKELY_REQUIRED";
    case "REVIEW_REQUIRED":
      return "POSSIBLY_REQUIRED";
    case "UNKNOWN":
      return obligation.conflicts.length > 0
        ? "POSSIBLY_REQUIRED"
        : obligation.missingInformation.length > 0 ||
            obligation.decisionState === "INSUFFICIENT_DATA"
          ? "NEEDS_INFORMATION"
          : "POSSIBLY_REQUIRED";
  }
}

/**
 * Public, server-safe projection for orientative product experiences.
 *
 * It deliberately does not consult fiscal approval state when recommending.
 * Approval remains an independent gate used only by exclusion authorization.
 */
export function buildTaxModelRecommendationsV1({
  assessment,
  manualModelCodes = [],
}: {
  assessment: TaxObligationsAssessmentV1;
  manualModelCodes?: readonly string[];
}): TaxModelRecommendationsV1 {
  const manual = new Set(manualModelCodes);
  const recommendations = assessment.obligations.map((obligation) => {
    const underlying = engineRecommendationStatus(obligation);
    const manuallySelected = manual.has(obligation.modelCode);
    return Object.freeze({
      modelCode: obligation.modelCode,
      recommendationStatus: manuallySelected
        ? "MANUALLY_SELECTED"
        : underlying,
      engineRecommendationStatus: underlying,
      manuallySelected,
      reason: obligation.reason,
      evidence: Object.freeze(
        obligation.evidence.map((item) => Object.freeze({ ...item })),
      ),
      missingInformation: Object.freeze([...obligation.missingInformation]),
      conflicts: Object.freeze([...obligation.conflicts]),
      possibleExceptions: Object.freeze([
        ...(obligation.possibleExceptions ?? []),
      ]),
    }) satisfies TaxModelRecommendationItemV1;
  });

  return Object.freeze({
    contractVersion: TAX_MODEL_RECOMMENDATIONS_CONTRACT_VERSION,
    sourceContractVersion: assessment.contractVersion,
    catalogVersion: assessment.catalogVersion,
    ruleSetVersion: assessment.ruleSetVersion,
    generatedAt: assessment.generatedAt,
    fiscalYear: assessment.fiscalYear,
    territory: assessment.territory,
    ruleReviewState: assessment.ruleReviewState,
    resolutionState: assessment.resolutionState,
    // Recommendation never authorizes exclusion. Consumers must consult the
    // independent fiscal gate immediately before any future hiding action.
    authorizedFiscalExclusion: false,
    recommendations: Object.freeze(recommendations),
  });
}
