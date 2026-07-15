import type { TaxModelDiagnosticSession } from "@/lib/tax-model-diagnostic/contracts";

import {
  isTaxObligationsAssessmentV1,
  type TaxObligationsAssessmentV1,
} from "./contracts";

/**
 * Public, fail-closed read boundary for Calendar and the tax-model catalog.
 * Consumers only read the immutable published snapshot and never import engine
 * rules, rebuild decisions or infer model codes from free text.
 */
export function selectStoredTaxObligationsAssessment(
  session: TaxModelDiagnosticSession | null | undefined,
): TaxObligationsAssessmentV1 | null {
  return isTaxObligationsAssessmentV1(session?.publishedAssessment)
    ? session.publishedAssessment
    : null;
}
