import { assertEvaluationResult, normalizeConcept } from "@/lib/tax-engine";
import type { Expense } from "@/lib/types";
import type {
  EvaluationResult,
  ExpenseAnswers,
  ExpenseInput,
  TaxContext,
  TaxOutcome,
} from "@/lib/tax-engine";

export type EvaluationUserDecision = "PENDING" | "CONFIRMED" | "REJECTED";

export interface EvaluationActorContext {
  userId: string;
}

export interface EvaluationSnapshot {
  schemaVersion: "1";
  evaluationId: string;
  normalizedInput: Omit<ExpenseInput, "answers" | "extractedText"> & {
    originalConcept: string;
    normalizedConcept: string;
    conceptTokens: readonly string[];
  };
  context: TaxContext;
  answers: ExpenseAnswers;
  result: EvaluationResult;
  matchedRuleId: string | null;
  matchedRuleVersion: string | null;
  evaluatedAt: string;
  officialSources: EvaluationResult["officialSources"];
  calculationTrace: EvaluationResult["calculationTrace"];
  userId: string;
  sourceExpenseId?: Expense["id"];
  userDecision: EvaluationUserDecision;
  userDecisionAt: string | null;
}

function safeTaxOutcome(outcome: TaxOutcome | null): TaxOutcome | null {
  if (!outcome) return null;
  return {
    taxType: outcome.taxType,
    eligibility: outcome.eligibility,
    theoreticalPercentage: outcome.theoreticalPercentage,
    ...(outcome.amountStatus ? { amountStatus: outcome.amountStatus } : {}),
    deductibleAmountCents: outcome.deductibleAmountCents,
    appliedLimit: outcome.appliedLimit
      ? {
          code: outcome.appliedLimit.code,
          label: outcome.appliedLimit.label,
          limitAmountCents: outcome.appliedLimit.limitAmountCents,
          ...(outcome.appliedLimit.consumedAmountCents === undefined
            ? {}
            : {
                consumedAmountCents:
                  outcome.appliedLimit.consumedAmountCents,
              }),
          ...(outcome.appliedLimit.remainingBeforeExpenseCents === undefined
            ? {}
            : {
                remainingBeforeExpenseCents:
                  outcome.appliedLimit.remainingBeforeExpenseCents,
              }),
          excessAmountCents: outcome.appliedLimit.excessAmountCents,
        }
      : null,
    explanation: outcome.explanation,
  };
}

function safeEvaluationResult(
  result: EvaluationResult,
  input: ExpenseInput,
): EvaluationResult {
  const validated = assertEvaluationResult(result, input);
  return {
    evaluationId: validated.evaluationId,
    evaluatedAt: validated.evaluatedAt,
    status: validated.status,
    risk: validated.risk,
    directTax: safeTaxOutcome(validated.directTax),
    indirectTax: safeTaxOutcome(validated.indirectTax),
    requiredQuestions: validated.requiredQuestions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      type: question.type,
      required: question.required,
      ...(question.helpText === undefined
        ? {}
        : { helpText: question.helpText }),
      ...(question.options === undefined
        ? {}
        : {
            options: question.options.map((option) => ({
              value: option.value,
              label: option.label,
            })),
          }),
    })),
    missingInformation: [...validated.missingInformation],
    evidenceRequired: [...validated.evidenceRequired],
    practicalAdvice: [...validated.practicalAdvice],
    warnings: [...validated.warnings],
    calculationTrace: validated.calculationTrace.map((step) => ({
      code: step.code,
      label: step.label,
      detail: step.detail,
      ...(step.amountCents === undefined
        ? {}
        : { amountCents: step.amountCents }),
      ...(step.percentage === undefined
        ? {}
        : { percentage: step.percentage }),
    })),
    requiresHumanReview: validated.requiresHumanReview,
    matchedRuleId: validated.matchedRuleId,
    matchedRuleVersion: validated.matchedRuleVersion,
    matchedBy: validated.matchedBy,
    matchScore: validated.matchScore,
    matchReason: validated.matchReason,
    officialSources: validated.officialSources.map((source) => ({
      id: source.id,
      authority: source.authority,
      sourceType: source.sourceType,
      title: source.title,
      legalReference: source.legalReference,
      officialUrl: source.officialUrl,
      retrievedAt: source.retrievedAt,
      effectiveFrom: source.effectiveFrom,
      ...(source.effectiveTo === undefined
        ? {}
        : { effectiveTo: source.effectiveTo }),
      notes: source.notes,
      verificationStatus: source.verificationStatus,
    })),
    ...(validated.evaluationOrigin === undefined
      ? {}
      : { evaluationOrigin: validated.evaluationOrigin }),
    ...(validated.aiFallback
      ? {
          aiFallback: {
            status: validated.aiFallback.status,
            trigger: validated.aiFallback.trigger,
            promptVersion: validated.aiFallback.promptVersion,
            modelId: validated.aiFallback.modelId,
            suppliedSourceIds: [...validated.aiFallback.suppliedSourceIds],
            citedSourceIds: [...validated.aiFallback.citedSourceIds],
            sourceVerificationStatus:
              validated.aiFallback.sourceVerificationStatus,
            validatorErrorCodes: [
              ...validated.aiFallback.validatorErrorCodes,
            ],
            durationMs: validated.aiFallback.durationMs,
            ...(validated.aiFallback.providerAttempts === undefined
              ? {}
              : { providerAttempts: validated.aiFallback.providerAttempts }),
            ...(validated.aiFallback.inputTokens === undefined
              ? {}
              : { inputTokens: validated.aiFallback.inputTokens }),
            ...(validated.aiFallback.outputTokens === undefined
              ? {}
              : { outputTokens: validated.aiFallback.outputTokens }),
            ...(validated.aiFallback.totalTokens === undefined
              ? {}
              : { totalTokens: validated.aiFallback.totalTokens }),
            confidenceBand: validated.aiFallback.confidenceBand,
            humanReviewRequired: true as const,
            ...(validated.aiFallback.proposalSummary === undefined
              ? {}
              : { proposalSummary: validated.aiFallback.proposalSummary }),
            ...(validated.aiFallback.classification === undefined
              ? {}
              : { classification: validated.aiFallback.classification }),
            ...(validated.aiFallback.missingLegalContext === undefined
              ? {}
              : {
                  missingLegalContext: [
                    ...validated.aiFallback.missingLegalContext,
                  ],
                }),
            ...(validated.aiFallback.taxProposals === undefined
              ? {}
              : {
                  taxProposals: validated.aiFallback.taxProposals.map(
                    (proposal) => ({
                      taxType: proposal.taxType,
                      proposedPercentage: proposal.proposedPercentage,
                      proposedDeductibleAmountCents:
                        proposal.proposedDeductibleAmountCents,
                      explanation: proposal.explanation,
                    }),
                  ),
                }),
          },
        }
      : {}),
  };
}

export function createEvaluationSnapshot(options: {
  input: ExpenseInput;
  context: TaxContext;
  answers: ExpenseAnswers;
  result: EvaluationResult;
  actor: EvaluationActorContext;
  sourceExpenseId?: Expense["id"];
  userDecision?: EvaluationUserDecision;
  userDecisionAt?: string | null;
}): EvaluationSnapshot {
  if (
    !options.actor.userId.trim() ||
    options.actor.userId.length > 160
  ) {
    throw new Error("La identidad del snapshot no es válida.");
  }
  if (
    options.sourceExpenseId !== undefined &&
    (!options.sourceExpenseId.trim() || options.sourceExpenseId.length > 160)
  ) {
    throw new Error("El gasto de origen del snapshot no es válido.");
  }
  const safeInput = { ...options.input };
  delete safeInput.answers;
  delete safeInput.extractedText;
  const normalized = normalizeConcept(options.input.concept);
  const userDecision = options.userDecision ?? "PENDING";
  const userDecisionAt = options.userDecisionAt ?? null;
  if (
    (userDecision === "PENDING" && userDecisionAt !== null) ||
    (userDecision !== "PENDING" &&
      (!userDecisionAt || !Number.isFinite(Date.parse(userDecisionAt))))
  ) {
    throw new Error("La fecha de decisión del snapshot no es coherente.");
  }
  const effectiveAnswers = {
    ...(options.input.answers ?? {}),
    ...options.answers,
  };
  const snapshotResult = safeEvaluationResult(options.result, options.input);
  const cloned = JSON.parse(
    JSON.stringify({
      safeInput,
      context: options.context,
      effectiveAnswers,
      result: snapshotResult,
    }),
  ) as {
    safeInput: typeof safeInput;
    context: TaxContext;
    effectiveAnswers: ExpenseAnswers;
    result: EvaluationResult;
  };
  return {
    schemaVersion: "1",
    evaluationId: options.result.evaluationId,
    normalizedInput: {
      ...cloned.safeInput,
      concept: normalized.original,
      originalConcept: normalized.original,
      normalizedConcept: normalized.comparable,
      conceptTokens: normalized.tokens,
    },
    context: cloned.context,
    answers: cloned.effectiveAnswers,
    result: cloned.result,
    matchedRuleId: cloned.result.matchedRuleId,
    matchedRuleVersion: cloned.result.matchedRuleVersion,
    evaluatedAt: cloned.result.evaluatedAt,
    officialSources: JSON.parse(JSON.stringify(cloned.result.officialSources)),
    calculationTrace: JSON.parse(JSON.stringify(cloned.result.calculationTrace)),
    userId: options.actor.userId,
    ...(options.sourceExpenseId
      ? { sourceExpenseId: options.sourceExpenseId }
      : {}),
    userDecision,
    userDecisionAt,
  };
}
