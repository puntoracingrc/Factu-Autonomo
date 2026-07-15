import type { TaxModelDiagnosticSession } from "@/lib/tax-model-diagnostic/contracts";
import { selectStoredTaxObligationsAssessment } from "@/lib/tax-obligations";
import { normalizeFiscalAdvisoryModelPreferencesV1 } from "./preferences";

export type FiscalModelPersonalizationFallbackReasonV1 =
  | "INVALID_CATALOG"
  | "NO_PUBLISHED_ASSESSMENT"
  | "RULES_PENDING_REVIEW"
  | "ASSESSMENT_NOT_RESOLVED"
  | "PROFILE_NOT_COMPLETE";

export type FiscalModelPersonalizationV1 = Readonly<{
  status: "ALL_ONLY" | "PERSONALIZED";
  fallbackReason: FiscalModelPersonalizationFallbackReasonV1 | null;
  allModelCodes: readonly string[];
  visibleModelCodes: readonly string[];
  assessmentModelCodes: readonly string[];
  reviewModelCodes: readonly string[];
  manualModelCodes: readonly string[];
}>;

function frozenResult(
  value: Omit<FiscalModelPersonalizationV1, "allModelCodes" | "visibleModelCodes" | "assessmentModelCodes" | "reviewModelCodes" | "manualModelCodes"> & {
    allModelCodes: string[];
    visibleModelCodes: string[];
    assessmentModelCodes: string[];
    reviewModelCodes: string[];
    manualModelCodes: string[];
  },
): FiscalModelPersonalizationV1 {
  return Object.freeze({
    ...value,
    allModelCodes: Object.freeze([...value.allModelCodes]),
    visibleModelCodes: Object.freeze([...value.visibleModelCodes]),
    assessmentModelCodes: Object.freeze([...value.assessmentModelCodes]),
    reviewModelCodes: Object.freeze([...value.reviewModelCodes]),
    manualModelCodes: Object.freeze([...value.manualModelCodes]),
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
      manualModelCodes,
    });

  if (invalidCatalog) return allOnly("INVALID_CATALOG");
  if (!assessment) return allOnly("NO_PUBLISHED_ASSESSMENT");
  if (assessment.ruleReviewState !== "APPROVED") {
    return allOnly("RULES_PENDING_REVIEW");
  }
  if (assessment.resolutionState !== "RESOLVED") {
    return allOnly("ASSESSMENT_NOT_RESOLVED");
  }
  if (assessment.profile.state !== "COMPLETE") {
    return allOnly("PROFILE_NOT_COMPLETE");
  }

  const assessmentCodes = new Set<string>();
  const reviewCodes = new Set<string>();
  for (const obligation of assessment.obligations) {
    if (!uniqueCodes.has(obligation.modelCode)) continue;
    if (obligation.status === "REQUIRED") {
      assessmentCodes.add(obligation.modelCode);
      continue;
    }
    if (
      obligation.status === "REVIEW_REQUIRED" ||
      obligation.status === "UNKNOWN" ||
      (obligation.status === "NOT_APPLICABLE" &&
        !obligation.evidenceSufficient)
    ) {
      assessmentCodes.add(obligation.modelCode);
      reviewCodes.add(obligation.modelCode);
    }
  }

  const visibleCodes = new Set([...assessmentCodes, ...manualModelCodes]);
  const inCatalogOrder = (codes: Set<string>) =>
    allModelCodes.filter((code) => codes.has(code));
  return frozenResult({
    status: "PERSONALIZED",
    fallbackReason: null,
    allModelCodes,
    visibleModelCodes: inCatalogOrder(visibleCodes),
    assessmentModelCodes: inCatalogOrder(assessmentCodes),
    reviewModelCodes: inCatalogOrder(reviewCodes),
    manualModelCodes: allModelCodes.filter((code) =>
      manualModelCodes.includes(code),
    ),
  });
}
