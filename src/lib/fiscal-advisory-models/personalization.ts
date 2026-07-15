import type { TaxModelDiagnosticSession } from "@/lib/tax-model-diagnostic/contracts";
import {
  buildTaxModelRecommendationsV1,
  isTaxObligationExclusionAuthorized,
  selectStoredTaxObligationsAssessment,
  type TaxModelRecommendationItemV1,
} from "@/lib/tax-obligations";
import { normalizeFiscalAdvisoryModelPreferencesV1 } from "./preferences";

export type FiscalModelPersonalizationFallbackReasonV1 =
  | "INVALID_CATALOG"
  | "NO_PUBLISHED_ASSESSMENT"
  | "RULES_PENDING_REVIEW"
  | "ASSESSMENT_NOT_RESOLVED"
  | "PROFILE_NOT_COMPLETE"
  | "UNSUPPORTED_TERRITORY";

export type FiscalModelPersonalizationV1 = Readonly<{
  status: "ALL_ONLY" | "ORIENTATIVE" | "PERSONALIZED";
  fallbackReason: FiscalModelPersonalizationFallbackReasonV1 | null;
  allModelCodes: readonly string[];
  visibleModelCodes: readonly string[];
  assessmentModelCodes: readonly string[];
  reviewModelCodes: readonly string[];
  unlikelyModelCodes: readonly string[];
  manualModelCodes: readonly string[];
  recommendations: readonly TaxModelRecommendationItemV1[];
}>;

function frozenResult(
  value: Omit<FiscalModelPersonalizationV1, "allModelCodes" | "visibleModelCodes" | "assessmentModelCodes" | "reviewModelCodes" | "unlikelyModelCodes" | "manualModelCodes" | "recommendations"> & {
    allModelCodes: string[];
    visibleModelCodes: string[];
    assessmentModelCodes: string[];
    reviewModelCodes: string[];
    unlikelyModelCodes: string[];
    manualModelCodes: string[];
    recommendations: TaxModelRecommendationItemV1[];
  },
): FiscalModelPersonalizationV1 {
  return Object.freeze({
    ...value,
    allModelCodes: Object.freeze([...value.allModelCodes]),
    visibleModelCodes: Object.freeze([...value.visibleModelCodes]),
    assessmentModelCodes: Object.freeze([...value.assessmentModelCodes]),
    reviewModelCodes: Object.freeze([...value.reviewModelCodes]),
    unlikelyModelCodes: Object.freeze([...value.unlikelyModelCodes]),
    manualModelCodes: Object.freeze([...value.manualModelCodes]),
    recommendations: Object.freeze([...value.recommendations]),
  });
}

export function buildFiscalModelPersonalizationV1({
  session,
  preferences,
  availableModelCodes,
}: {
  session: TaxModelDiagnosticSession | null | undefined;
  preferences: unknown;
  availableModelCodes: readonly string[];
}): FiscalModelPersonalizationV1 {
  const allModelCodes = [...availableModelCodes];
  const uniqueCodes = new Set(allModelCodes);
  const invalidCatalog =
    allModelCodes.length === 0 ||
    allModelCodes.length > 300 ||
    uniqueCodes.size !== allModelCodes.length ||
    allModelCodes.some(
      (code) => typeof code !== "string" || code.length < 2 || code.length > 3,
    );
  const normalizedPreferences = normalizeFiscalAdvisoryModelPreferencesV1(
    preferences,
  );
  const manualModelCodes = (normalizedPreferences?.manualModelCodes ?? []).filter(
    (code) => uniqueCodes.has(code),
  );
  const assessment = selectStoredTaxObligationsAssessment(session);

  const allOnly = (
    fallbackReason: FiscalModelPersonalizationFallbackReasonV1,
  ) =>
    frozenResult({
      status: "ALL_ONLY",
      fallbackReason,
      allModelCodes,
      visibleModelCodes: allModelCodes,
      assessmentModelCodes: [],
      reviewModelCodes: [],
      unlikelyModelCodes: [],
      manualModelCodes,
      recommendations: [],
    });

  if (invalidCatalog) return allOnly("INVALID_CATALOG");
  if (!assessment) return allOnly("NO_PUBLISHED_ASSESSMENT");
  if (
    assessment.territory !== "ES_COMMON" ||
    assessment.resolutionState === "BLOCKED"
  ) {
    return allOnly("UNSUPPORTED_TERRITORY");
  }
  const exclusionAuthorized = isTaxObligationExclusionAuthorized(assessment);
  const recommendationSnapshot = buildTaxModelRecommendationsV1({
    assessment,
    manualModelCodes,
  });
  const assessmentCodes = new Set<string>();
  const reviewCodes = new Set<string>();
  const unlikelyCodes = new Set<string>();
  const recommendations = recommendationSnapshot.recommendations.filter(
    (item) => uniqueCodes.has(item.modelCode),
  );
  for (const recommendation of recommendations) {
    const status = recommendation.engineRecommendationStatus;
    if (status === "UNLIKELY_REQUIRED") {
      unlikelyCodes.add(recommendation.modelCode);
      continue;
    }
    assessmentCodes.add(recommendation.modelCode);
    if (
      status === "POSSIBLY_REQUIRED" ||
      status === "NEEDS_INFORMATION"
    ) {
      reviewCodes.add(recommendation.modelCode);
    }
  }

  const visibleCodes = new Set([...assessmentCodes, ...manualModelCodes]);
  const inCatalogOrder = (codes: Set<string>) =>
    allModelCodes.filter((code) => codes.has(code));
  return frozenResult({
    status: exclusionAuthorized ? "PERSONALIZED" : "ORIENTATIVE",
    fallbackReason:
      assessment.profile.state !== "COMPLETE"
        ? "PROFILE_NOT_COMPLETE"
        : assessment.ruleReviewState !== "APPROVED"
          ? "RULES_PENDING_REVIEW"
          : assessment.resolutionState !== "RESOLVED"
            ? "ASSESSMENT_NOT_RESOLVED"
            : null,
    allModelCodes,
    visibleModelCodes: inCatalogOrder(visibleCodes),
    assessmentModelCodes: inCatalogOrder(assessmentCodes),
    reviewModelCodes: inCatalogOrder(reviewCodes),
    unlikelyModelCodes: inCatalogOrder(unlikelyCodes),
    manualModelCodes: allModelCodes.filter((code) =>
      manualModelCodes.includes(code),
    ),
    recommendations,
  });
}
