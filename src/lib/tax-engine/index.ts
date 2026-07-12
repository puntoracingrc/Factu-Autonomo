export { evaluateExpense } from "./engine";
export { matchExpenseRule, isRuleEffective } from "./matcher";
export { normalizeComparableText, normalizeConcept } from "./normalizers";
export type { NormalizedConcept } from "./normalizers";
export { createRuleRegistry, EXPENSE_RULES } from "./rule-registry";
export {
  assertEvaluationResult,
  parseEvaluationRequest,
  type EvaluationRequestPayload,
} from "./schemas";
export { OFFICIAL_SOURCES } from "./sources";
export type * from "./types";
