import type { Expense } from "./types";

export function expenseEditHref(
  expense: Expense,
  recurringExpenseIds: ReadonlySet<string> = new Set(),
): string {
  if (
    expense.recurringExpenseId &&
    recurringExpenseIds.has(expense.recurringExpenseId)
  ) {
    return `/gastos/fijos?editar=${encodeURIComponent(expense.recurringExpenseId)}`;
  }

  return `/gastos/nuevo?editar=${encodeURIComponent(expense.id)}`;
}
