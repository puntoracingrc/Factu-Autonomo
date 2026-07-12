import type { AnswerValue, ConditionalQuestion, ExpenseAnswers } from "./types";

export function mergeAnswers(
  embedded: ExpenseAnswers | undefined,
  previous: ExpenseAnswers,
): ExpenseAnswers {
  return { ...(embedded ?? {}), ...previous };
}

export function hasAnswer(answers: ExpenseAnswers, id: string): boolean {
  const value = answers[id];
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined;
}

export function stringAnswer(
  answers: ExpenseAnswers,
  id: string,
): string | undefined {
  const value = answers[id];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function booleanAnswer(
  answers: ExpenseAnswers,
  id: string,
): boolean | undefined {
  const value = answers[id];
  return typeof value === "boolean" ? value : undefined;
}

export function numberAnswer(
  answers: ExpenseAnswers,
  id: string,
): number | undefined {
  const value = answers[id];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function pendingQuestions(
  questions: readonly ConditionalQuestion[],
  answers: ExpenseAnswers,
): ConditionalQuestion[] {
  return questions.filter(
    (question) => question.required && !hasAnswer(answers, question.id),
  );
}

export function withAnswer(
  answers: ExpenseAnswers,
  id: string,
  value: AnswerValue,
): ExpenseAnswers {
  return { ...answers, [id]: value };
}
