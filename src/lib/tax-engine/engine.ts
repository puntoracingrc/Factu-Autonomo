import { mergeAnswers, stringAnswer } from "./answers";
import { TaxEngineValidationError } from "./errors";
import { matchExpenseRule } from "./matcher";
import { createRuleRegistry, EXPENSE_RULES } from "./rule-registry";
import {
  assertEvaluationResult,
  parseEvaluationRequest,
} from "./schemas";
import type {
  ConditionalQuestion,
  EvaluationDecision,
  EvaluationMetadata,
  EvaluationResult,
  ExpenseAnswers,
  ExpenseInput,
  RuleCategory,
  RuleDefinition,
  TaxContext,
} from "./types";

function baseResult(
  metadata: EvaluationMetadata,
  decision: EvaluationDecision,
  options: Pick<
    EvaluationResult,
    | "matchedRuleId"
    | "matchedRuleVersion"
    | "matchedBy"
    | "matchScore"
    | "matchReason"
    | "officialSources"
  >,
): EvaluationResult {
  return {
    evaluationId: metadata.evaluationId,
    evaluatedAt: metadata.evaluatedAt,
    evaluationOrigin: "LOCAL_RULE",
    ...decision,
    ...options,
  };
}

function unsupportedDecision(reason: string): EvaluationDecision {
  return {
    status: "UNSUPPORTED",
    risk: "UNDETERMINED",
    directTax: null,
    indirectTax: null,
    requiredQuestions: [],
    missingInformation: [reason],
    evidenceRequired: [],
    practicalAdvice: [
      "No apliques una regla de otro territorio o tipo de contribuyente.",
    ],
    warnings: ["No se ha ejecutado ninguna regla fiscal."],
    calculationTrace: [],
    requiresHumanReview: true,
  };
}

function noMatchDecision(): EvaluationDecision {
  return {
    status: "NO_MATCH",
    risk: "UNDETERMINED",
    directTax: null,
    indirectTax: null,
    requiredQuestions: [],
    missingInformation: [],
    evidenceRequired: [],
    practicalAdvice: [
      "Describe el gasto con más precisión o selecciona una categoría compatible.",
    ],
    warnings: ["No se ha inventado una conclusión fiscal para este concepto."],
    calculationTrace: [],
    requiresHumanReview: true,
  };
}

function missingContextDecision(missingInformation: readonly string[]): EvaluationDecision {
  return {
    status: "NEEDS_INPUT",
    risk: "UNDETERMINED",
    directTax: null,
    indirectTax: null,
    requiredQuestions: [],
    missingInformation,
    evidenceRequired: [],
    practicalAdvice: [
      "Completa el contexto fiscal antes de aplicar una regla de deducibilidad.",
    ],
    warnings: ["La ausencia de contexto no se ha convertido en una conclusión negativa."],
    calculationTrace: [],
    requiresHumanReview: true,
  };
}

function amountCalculationPendingDecision(
  decision: EvaluationDecision,
): EvaluationDecision {
  const withoutCalculatedAmount = (
    outcome: EvaluationDecision["directTax"],
  ): EvaluationDecision["directTax"] =>
    outcome
      ? {
          ...outcome,
          amountStatus: "NOT_CALCULATED",
          deductibleAmountCents: 0,
          appliedLimit: null,
        }
      : null;

  return {
    ...decision,
    directTax: withoutCalculatedAmount(decision.directTax),
    indirectTax: withoutCalculatedAmount(decision.indirectTax),
    practicalAdvice: [
      ...decision.practicalAdvice,
      "La orientación cualitativa no necesita base, IVA ni total. Añádelos solo si quieres obtener el cálculo exacto.",
    ],
    warnings: [
      ...decision.warnings,
      "Los importes ausentes no se han convertido en ceros aparentemente válidos.",
    ],
    calculationTrace: decision.calculationTrace.filter(
      (step) => step.amountCents === undefined && step.percentage === undefined,
    ),
    requiresHumanReview: true,
  };
}

function hasAmountIndependentNegativeConclusion(
  input: ExpenseInput,
  answers: ExpenseAnswers,
): boolean {
  return (
    stringAnswer(answers, "meal.purpose") === "PERSONAL" ||
    answers["meal.businessRelated"] === false ||
    answers["meal.hospitalityEstablishment"] === false ||
    (stringAnswer(answers, "meal.purpose") === "SELF_MAINTENANCE" &&
      input.paymentMethod === "CASH") ||
    answers["vehicle.usedInBusiness"] === false ||
    answers["vehicle.expenseLinked"] === false
  );
}

function manualCategoryQuestion(
  categories: readonly RuleCategory[],
): ConditionalQuestion {
  const labels: Record<RuleCategory, string> = {
    MEALS_AND_HOSPITALITY: "Restauración y manutención",
    VEHICLE_RUNNING_COSTS: "Gastos corrientes de vehículo",
  };
  return {
    id: "expense.manualCategory",
    prompt: "Hay varias categorías posibles. ¿Cuál describe mejor el gasto?",
    type: "SINGLE_CHOICE",
    required: true,
    options: [...new Set(categories)].map((category) => ({
      value: category,
      label: labels[category],
    })),
  };
}

function inputWithManualCategory(
  input: ExpenseInput,
  answers: ExpenseAnswers,
): ExpenseInput {
  if (input.manualCategory) return input;
  const answer = stringAnswer(answers, "expense.manualCategory");
  if (
    answer === "MEALS_AND_HOSPITALITY" ||
    answer === "VEHICLE_RUNNING_COSTS"
  ) {
    return { ...input, manualCategory: answer };
  }
  return input;
}

export function evaluateExpense(
  unsafeInput: ExpenseInput,
  unsafeContext: TaxContext,
  unsafePreviousAnswers: ExpenseAnswers,
  metadata: EvaluationMetadata,
  rules: readonly RuleDefinition[] = EXPENSE_RULES,
): EvaluationResult {
  if (
    !metadata.evaluationId.trim() ||
    metadata.evaluationId.length > 160 ||
    !/^\d{4}-\d{2}-\d{2}T/.test(metadata.evaluatedAt) ||
    !Number.isFinite(Date.parse(metadata.evaluatedAt))
  ) {
    throw new TaxEngineValidationError([
      {
        field: "metadata",
        message: "Los metadatos de evaluación no son válidos.",
      },
    ]);
  }
  const parsed = parseEvaluationRequest({
    input: unsafeInput,
    context: unsafeContext,
    previousAnswers: unsafePreviousAnswers,
  });
  const answers = mergeAnswers(parsed.input.answers, parsed.previousAnswers);
  const input = inputWithManualCategory(parsed.input, answers);
  const context = parsed.context;
  const verifiedRules = createRuleRegistry(rules);

  let unsupportedReason: string | null = null;
  if (input.currency !== "EUR") {
    unsupportedReason = "La versión 1 solo calcula importes en EUR.";
  } else if (
    context.jurisdiction !== "UNKNOWN" &&
    context.jurisdiction !== "ES_COMMON"
  ) {
    unsupportedReason =
      "La versión 1 solo implementa el territorio fiscal común de España.";
  } else if (
    context.taxpayerType !== "UNKNOWN" &&
    context.taxpayerType !== "SELF_EMPLOYED_IRPF"
  ) {
    unsupportedReason =
      "La versión 1 no aplica reglas de IRPF de autónomos a sociedades.";
  }
  if (unsupportedReason) {
    return assertEvaluationResult(
      baseResult(metadata, unsupportedDecision(unsupportedReason), {
        matchedRuleId: null,
        matchedRuleVersion: null,
        matchedBy: "NONE",
        matchScore: 0,
        matchReason: "Contexto fiscal fuera del alcance implementado.",
        officialSources: [],
      }),
      input,
    );
  }

  const missingContext: string[] = [];
  if (context.jurisdiction === "UNKNOWN") {
    missingContext.push("Indica el territorio fiscal aplicable.");
  }
  if (context.taxpayerType === "UNKNOWN") {
    missingContext.push("Indica el tipo de contribuyente.");
  }
  if (
    context.taxpayerType === "SELF_EMPLOYED_IRPF" &&
    context.directTaxRegime === "UNKNOWN"
  ) {
    missingContext.push("Indica el régimen del impuesto directo.");
  }
  if (context.vatRegime === "UNKNOWN") {
    missingContext.push("Indica el régimen y derecho general a deducir IVA.");
  }
  if (!context.activityDescription.trim()) {
    missingContext.push("Describe brevemente la actividad económica.");
  }
  if (missingContext.length > 0) {
    return assertEvaluationResult(
      baseResult(metadata, missingContextDecision(missingContext), {
        matchedRuleId: null,
        matchedRuleVersion: null,
        matchedBy: "NONE",
        matchScore: 0,
        matchReason: "Falta contexto fiscal antes de seleccionar una regla.",
        officialSources: [],
      }),
      input,
    );
  }

  const match = matchExpenseRule(input, context, verifiedRules);
  if (match.status === "NO_MATCH") {
    return assertEvaluationResult(
      baseResult(metadata, noMatchDecision(), {
        matchedRuleId: null,
        matchedRuleVersion: null,
        matchedBy: "NONE",
        matchScore: 0,
        matchReason: "Ninguna regla vigente coincide con el concepto.",
        officialSources: [],
      }),
      input,
    );
  }
  if (match.status === "AMBIGUOUS") {
    const categoryQuestion = manualCategoryQuestion(
      match.candidates.map((candidate) => candidate.rule.category),
    );
    return assertEvaluationResult(
      baseResult(
        metadata,
        {
          status: "NEEDS_INPUT",
          risk: "UNDETERMINED",
          directTax: null,
          indirectTax: null,
          requiredQuestions: [categoryQuestion],
          missingInformation: [categoryQuestion.prompt],
          evidenceRequired: [],
          practicalAdvice: [],
          warnings: [
            "Las reglas con puntuaciones similares no se han resuelto automáticamente.",
          ],
          calculationTrace: [],
          requiresHumanReview: true,
        },
        {
          matchedRuleId: null,
          matchedRuleVersion: null,
          matchedBy: "NONE",
          matchScore: match.candidates[0]?.score ?? 0,
          matchReason: match.candidates
            .map((candidate) => `${candidate.rule.id}: ${candidate.reason}`)
            .join(" | "),
          officialSources: [],
        },
      ),
      input,
    );
  }

  const candidate = match.selected!;
  const evaluatedDecision = candidate.rule.evaluator({ input, context, answers });
  const decision =
    input.amountsKnown === false &&
    evaluatedDecision.requiredQuestions.length === 0 &&
    !hasAmountIndependentNegativeConclusion(input, answers)
      ? amountCalculationPendingDecision(evaluatedDecision)
      : evaluatedDecision;
  const pendingLegalReview = candidate.rule.legalReviewStatus === "PENDING_REVIEW";
  const pendingResolvedDecision =
    pendingLegalReview && decision.status === "RESOLVED";
  const result = baseResult(
    metadata,
    {
      ...decision,
      status: pendingResolvedDecision ? "NEEDS_REVIEW" : decision.status,
      warnings: pendingLegalReview
        ? [
            ...decision.warnings,
            "La regla está pendiente de revisión por un asesor fiscal antes de su activación operativa.",
          ]
        : decision.warnings,
      calculationTrace: [
        {
          code: "rule-selected",
          label: "Regla seleccionada",
          detail: `${candidate.rule.id} v${candidate.rule.version}; ${candidate.reason}`,
        },
        ...decision.calculationTrace,
      ],
      requiresHumanReview:
        decision.requiresHumanReview || pendingLegalReview,
    },
    {
      matchedRuleId: candidate.rule.id,
      matchedRuleVersion: candidate.rule.version,
      matchedBy: candidate.matchedBy,
      matchScore: candidate.score,
      matchReason: candidate.reason,
      officialSources: candidate.rule.officialSources,
    },
  );
  return assertEvaluationResult(result, input);
}
