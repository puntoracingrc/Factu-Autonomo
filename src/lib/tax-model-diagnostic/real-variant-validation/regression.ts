import type {
  FiscalDocumentType,
  TemporalScope,
} from "../extractors/contracts";

function confusionGroup(
  ...families: FiscalDocumentType[]
): readonly FiscalDocumentType[] {
  return Object.freeze(families);
}

export const CLASSIFICATION_CONFUSION_GROUPS: readonly (readonly FiscalDocumentType[])[] =
  Object.freeze([
    confusionGroup("MODEL_035", "MODEL_036"),
    confusionGroup("MODEL_111", "MODEL_115"),
    confusionGroup("MODEL_123", "MODEL_130", "MODEL_131"),
    confusionGroup("MODEL_180", "MODEL_190", "MODEL_193", "MODEL_296"),
    confusionGroup("MODEL_200", "MODEL_202"),
    confusionGroup(
      "MODEL_303",
      "MODEL_308",
      "MODEL_309",
      "MODEL_369",
      "MODEL_390",
    ),
    confusionGroup("MODEL_347", "MODEL_349"),
    confusionGroup("MODEL_714", "MODEL_720", "MODEL_721"),
    confusionGroup("CURRENT_CENSUS_CERTIFICATE", "AEAT_TAX_STATUS_VIEW"),
    confusionGroup("TGSS_CURRENT_STATUS_REPORT", "TGSS_EMPLOYMENT_HISTORY"),
    confusionGroup("ROI_CERTIFICATE", "MODEL_349"),
    confusionGroup(
      "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE",
      "MODEL_115",
      "MODEL_180",
    ),
  ]);

export const GLOBAL_FORBIDDEN_INFERENCES = Object.freeze([
  "ABSENT_DOCUMENT_MEANS_NO",
  "HISTORICAL_DOCUMENT_MEANS_CURRENT_STATE",
  "PRIOR_FILING_MEANS_FUTURE_OBLIGATION",
  "PROFESSION_MEANS_VAT_EXEMPTION",
  "MODEL_111_MEANS_EMPLOYEES",
  "MODEL_349_MEANS_CURRENT_ROI",
  "ROI_CERTIFICATE_MEANS_INTRACOMMUNITY_OPERATIONS",
  "MODEL_303_MEANS_MODEL_390_OBLIGATION",
  "MODEL_309_MEANS_PERIODIC_MODEL_303",
  "MODEL_200_BELONGS_TO_PHYSICAL_PERSON",
  "PARTIAL_CAPTURE_PROVES_ABSENCE",
  "DRAFT_MEANS_FILED",
  "ZERO_RESULT_MEANS_NO_OBLIGATION",
  "GREEN_CORPUS_MEANS_APPROVED_RULESET",
]);

export interface ClassificationRegressionResult {
  accepted: boolean;
  status: "EXACT_MATCH" | "CONFUSION_FALSE_POSITIVE" | "UNSUPPORTED_DOCUMENT";
}

export function evaluateClassificationRegression(
  expected: FiscalDocumentType | null,
  actual: FiscalDocumentType | null,
): ClassificationRegressionResult {
  if (expected === null) {
    return Object.freeze({
      accepted: actual === null,
      status:
        actual === null ? "UNSUPPORTED_DOCUMENT" : "CONFUSION_FALSE_POSITIVE",
    });
  }
  return Object.freeze({
    accepted: expected === actual,
    status: expected === actual ? "EXACT_MATCH" : "CONFUSION_FALSE_POSITIVE",
  });
}

export function findForbiddenInferenceViolations(
  forbidden: readonly string[],
  produced: readonly string[],
): readonly string[] {
  const forbiddenSet = new Set(forbidden);
  return Object.freeze(
    [...new Set(produced.filter((code) => forbiddenSet.has(code)))].sort(),
  );
}

export interface QuestionSkipSafetyInput {
  critical: boolean;
  extractionConfidence: number;
  completeDocument: boolean;
  layoutKnown: boolean;
  ocrAmbiguous: boolean;
  canSkipQuestion: boolean;
}

export function isQuestionSkipSafe(input: QuestionSkipSafetyInput): boolean {
  if (!input.canSkipQuestion) return true;
  return (
    input.completeDocument &&
    input.layoutKnown &&
    !input.ocrAmbiguous &&
    (!input.critical || input.extractionConfidence === 1)
  );
}

export function temporalEvidenceNeedsConfirmation(
  evidenceScope: TemporalScope,
  requestedScope: "CURRENT" | "FUTURE" | "SAME_PERIOD",
): boolean {
  if (requestedScope === "SAME_PERIOD") return false;
  if (requestedScope === "FUTURE") return true;
  return evidenceScope !== "CURRENT_AS_OF_DATE";
}

export function technicalValidationPreservesRuleReviewState(
  before: "PENDING_FISCAL_REVIEW" | "APPROVED",
  after: "PENDING_FISCAL_REVIEW" | "APPROVED",
): boolean {
  return before === after;
}
