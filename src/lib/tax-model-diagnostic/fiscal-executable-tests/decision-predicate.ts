import type { FiscalTerritory, TaxRule } from "../contracts";
import type { FiscalMutationOperator } from "./specs";

export type FiscalPredicateFact = "TRUE" | "FALSE" | "UNKNOWN";

export type FiscalPredicateDecision =
  | "CANDIDATE"
  | "NOT_APPLICABLE"
  | "UNKNOWN"
  | "CONTRADICTION"
  | "BLOCKED";

export interface FiscalDecisionPredicateDefinition {
  ruleId: string;
  fiscalYear: 2025 | 2026;
  territory: "ES_COMMON";
  conditionCount: number;
  hasException: boolean;
  thresholdExceptionAt: number | null;
}

export interface FiscalDecisionPredicateFacts {
  fiscalYear: 2025 | 2026;
  territory: FiscalTerritory;
  conditions: readonly FiscalPredicateFact[];
  exceptionApplies: FiscalPredicateFact;
  hasContradiction: boolean;
  thresholdValue: number | null;
  prohibitedInferenceEvidence: boolean;
}

export function buildFiscalDecisionPredicateDefinition(
  rule: TaxRule,
  thresholdExceptionAt: number | null,
): FiscalDecisionPredicateDefinition {
  if (rule.conditions.length === 0) {
    throw new Error(`RULE_WITHOUT_CONDITIONS:${rule.ruleId}`);
  }
  return {
    ruleId: rule.ruleId,
    fiscalYear: rule.fiscalYear,
    territory: rule.territory,
    conditionCount: rule.conditions.length,
    hasException: rule.exclusions.length > 0,
    thresholdExceptionAt,
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
  return conditions;
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
  if (facts.hasContradiction && mutation !== "CONTRADICTION_IGNORED") {
    return "CONTRADICTION";
  }

  const conditions = normalizeConditions(definition, facts, mutation);
  if (conditions.includes("UNKNOWN")) {
    if (mutation !== "UNKNOWN_TO_FALSE") return "UNKNOWN";
    return "NOT_APPLICABLE";
  }
  const conditionsSatisfied =
    mutation === "AND_TO_OR"
      ? conditions.some((condition) => condition === "TRUE")
      : conditions.every((condition) => condition === "TRUE");
  if (!conditionsSatisfied) return "NOT_APPLICABLE";

  if (
    definition.hasException &&
    facts.exceptionApplies === "UNKNOWN"
  ) {
    return mutation === "UNKNOWN_TO_FALSE" ? "CANDIDATE" : "UNKNOWN";
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
