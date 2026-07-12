import type {
  CalculationTraceStep,
  ConditionalQuestion,
  EvaluationDecision,
  TaxOutcome,
} from "../types";

export function zeroOutcome(
  taxType: TaxOutcome["taxType"],
  explanation: string,
): TaxOutcome {
  return {
    taxType,
    eligibility: "NONE",
    theoreticalPercentage: 0,
    deductibleAmountCents: 0,
    appliedLimit: null,
    explanation,
  };
}

export function needsReviewOutcome(
  taxType: TaxOutcome["taxType"],
  explanation: string,
): TaxOutcome {
  return {
    taxType,
    eligibility: "NEEDS_REVIEW",
    theoreticalPercentage: 0,
    deductibleAmountCents: 0,
    appliedLimit: null,
    explanation,
  };
}

export function unresolvedDecision(options: {
  status: "NEEDS_INPUT" | "NEEDS_REVIEW";
  questions?: readonly ConditionalQuestion[];
  missingInformation: readonly string[];
  warnings?: readonly string[];
  trace?: readonly CalculationTraceStep[];
  directTax?: TaxOutcome | null;
  indirectTax?: TaxOutcome | null;
  risk?: EvaluationDecision["risk"];
  evidenceRequired?: readonly string[];
  practicalAdvice?: readonly string[];
}): EvaluationDecision {
  return {
    status: options.status,
    risk: options.risk ?? "UNDETERMINED",
    directTax: options.directTax ?? null,
    indirectTax: options.indirectTax ?? null,
    requiredQuestions: options.questions ?? [],
    missingInformation: options.missingInformation,
    evidenceRequired: options.evidenceRequired ?? [],
    practicalAdvice: options.practicalAdvice ?? [],
    warnings: options.warnings ?? [],
    calculationTrace: options.trace ?? [],
    requiresHumanReview: true,
  };
}
