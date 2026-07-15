import type { TaxObligationsAssessmentV1 } from "./contracts";

/**
 * Single public gate for consumers that can hide or exclude obligations.
 * Technical validation of OCR, fixtures, CI or deployments never changes it.
 */
export function isTaxObligationExclusionAuthorized(
  assessment:
    | Pick<TaxObligationsAssessmentV1, "ruleReviewState" | "resolutionState">
    | null
    | undefined,
): boolean {
  return (
    assessment?.ruleReviewState === "APPROVED" &&
    assessment.resolutionState === "RESOLVED"
  );
}
