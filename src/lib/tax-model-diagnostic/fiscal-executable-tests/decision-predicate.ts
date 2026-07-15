import type {
  FiscalTerritory,
  TaxModelNumber,
  TaxRule,
} from "../contracts";
import type {
  FiscalMutationOperator,
  FiscalPredicateConditionMode,
  FiscalPredicateSubject,
} from "./specs";

export type FiscalPredicateFact = "TRUE" | "FALSE" | "UNKNOWN";

export type FiscalPredicateDecision =
  | "CANDIDATE"
  | "NOT_APPLICABLE"
  | "UNKNOWN"
  | "CONTRADICTION"
  | "BLOCKED";

export interface FiscalDecisionPredicateDefinition {
  ruleId: string;
  modelNumber: TaxModelNumber;
  fiscalYear: 2025 | 2026;
  territory: "ES_COMMON";
  conditionCount: number;
  conditionMode: FiscalPredicateConditionMode;
  hasException: boolean;
  thresholdExceptionAt: number | null;
  expectedSubject: FiscalPredicateSubject;
}

export interface FiscalDecisionPredicateFacts {
  fiscalYear: 2025 | 2026;
  territory: FiscalTerritory;
  modelNumber: TaxModelNumber;
  subject: Exclude<FiscalPredicateSubject, "ANY">;
  conditions: readonly FiscalPredicateFact[];
  exceptionApplies: FiscalPredicateFact;
  hasContradiction: boolean;
  thresholdValue: number | null;
  historicalEvidenceOnly: boolean;
  prohibitedInferenceEvidence: boolean;
}

export function buildFiscalDecisionPredicateDefinition(
  rule: TaxRule,
  thresholdExceptionAt: number | null,
  conditionMode: FiscalPredicateConditionMode,
  expectedSubject: FiscalPredicateSubject,
): FiscalDecisionPredicateDefinition {
  if (rule.conditions.length === 0) {
    throw new Error(`RULE_WITHOUT_CONDITIONS:${rule.ruleId}`);
  }
  return {
    ruleId: rule.ruleId,
    modelNumber: rule.modelNumber,
    fiscalYear: rule.fiscalYear,
    territory: rule.territory,
    conditionCount: rule.conditions.length,
    conditionMode,
    hasException: rule.exclusions.length > 0,
    thresholdExceptionAt,
    expectedSubject,
  };
}

function normalizeConditions(
  definition: FiscalDecisionPredicateDefinition,
  facts: FiscalDecisionPredicateFacts,
  mutation: FiscalMutationOperator | null,
): readonly FiscalPredicateFact[] {
  if (facts.conditions.length !== definition.conditionCount) {
    throw new Error(
      `CONDITION_COUNT_MISMATCH:${definition.ruleId}:${facts.conditions.length}`,
    );
  }
  const conditions = [...facts.conditions];
  if (mutation === "CONDITION_INVERTED") {
    conditions[0] =
      conditions[0] === "TRUE"
        ? "FALSE"
        : conditions[0] === "FALSE"
          ? "TRUE"
          : "UNKNOWN";
  }
  if (mutation === "REQUIRED_CONDITION_REMOVED") conditions.shift();
  return conditions;
}

function anotherModel(modelNumber: TaxModelNumber): TaxModelNumber {
  return modelNumber === "035" ? "036" : "035";
}

/**
 * Predicado ejecutable del expediente fiscal. Recibe hechos ya normalizados y
 * aplica únicamente la estructura material declarada por TaxRule: vigencia,
 * territorio, todas sus condiciones y sus excepciones. Los mutantes alteran
 * esa lógica antes de decidir; nunca posprocesan el resultado observado.
 */
export function evaluateFiscalDecisionPredicate(
  definition: FiscalDecisionPredicateDefinition,
  facts: FiscalDecisionPredicateFacts,
  mutation: FiscalMutationOperator | null = null,
): FiscalPredicateDecision {
  const expectedModel =
    mutation === "CROSS_MODEL_RULE"
      ? anotherModel(definition.modelNumber)
      : definition.modelNumber;
  if (facts.modelNumber !== expectedModel) return "BLOCKED";
  const expectedFiscalYear =
    mutation === "FISCAL_YEAR_CHANGED"
      ? definition.fiscalYear === 2025
        ? 2026
        : 2025
      : definition.fiscalYear;
  if (facts.fiscalYear !== expectedFiscalYear) return "BLOCKED";
  if (
    mutation !== "TERRITORY_CHANGED" &&
    facts.territory !== definition.territory
  ) {
    return "BLOCKED";
  }
  if (facts.historicalEvidenceOnly && mutation !== "HISTORICAL_TO_CURRENT") {
    return "BLOCKED";
  }
  const expectedSubject =
    mutation === "SUBJECT_SWAPPED"
      ? definition.expectedSubject === "PERSON"
        ? "ENTITY"
        : definition.expectedSubject === "ENTITY"
          ? "PERSON"
          : "ANY"
      : definition.expectedSubject;
  if (expectedSubject !== "ANY" && facts.subject !== expectedSubject) {
    return "NOT_APPLICABLE";
  }
  if (facts.hasContradiction && mutation !== "CONTRADICTION_IGNORED") {
    return "CONTRADICTION";
  }

  const conditions = normalizeConditions(definition, facts, mutation);
  if (conditions.includes("UNKNOWN")) {
    if (mutation === "UNKNOWN_TO_FALSE") return "NOT_APPLICABLE";
    if (mutation !== "UNKNOWN_TO_TRUE") return "UNKNOWN";
  }
  const conditionMode =
    mutation === "AND_TO_OR"
      ? "ANY"
      : mutation === "OR_TO_AND"
        ? "ALL"
        : definition.conditionMode;
  const conditionsSatisfied =
    conditionMode === "ANY"
      ? conditions.some((condition) => condition === "TRUE")
      : conditions.every(
          (condition) =>
            condition === "TRUE" ||
            (mutation === "UNKNOWN_TO_TRUE" && condition === "UNKNOWN"),
        );
  if (!conditionsSatisfied) return "NOT_APPLICABLE";

  if (
    definition.hasException &&
    facts.exceptionApplies === "UNKNOWN"
  ) {
    if (mutation === "UNKNOWN_TO_FALSE") return "CANDIDATE";
    if (mutation === "UNKNOWN_TO_TRUE") return "NOT_APPLICABLE";
    return "UNKNOWN";
  }
  if (
    definition.hasException &&
    facts.exceptionApplies === "TRUE" &&
    mutation !== "EXCEPTION_REMOVED"
  ) {
    return "NOT_APPLICABLE";
  }

  if (
    definition.thresholdExceptionAt !== null &&
    facts.thresholdValue !== null
  ) {
    const threshold =
      mutation === "THRESHOLD_CHANGED"
        ? definition.thresholdExceptionAt + 1
        : definition.thresholdExceptionAt;
    if (facts.thresholdValue >= threshold) return "NOT_APPLICABLE";
  }

  // La presencia de una pista adyacente nunca satisface una condición fiscal.
  // Este campo existe para que el caso de inferencia prohibida sea explícito.
  void facts.prohibitedInferenceEvidence;
  return "CANDIDATE";
}
