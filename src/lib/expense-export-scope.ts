import {
  isExpenseBusinessRelated,
  isExpenseFiscalDeductible,
} from "./expenses";
import type { Expense } from "./types";

export type ExpenseExportScope = "deductible" | "business" | "all";

export const EXPENSE_EXPORT_SCOPE_OPTIONS: ReadonlyArray<{
  value: ExpenseExportScope;
  label: string;
}> = [
  { value: "deductible", label: "Solo empresa y deducibles" },
  { value: "business", label: "Todos los gastos de empresa" },
  { value: "all", label: "Todos los gastos" },
];

export function filterExpensesForExport(
  expenses: Expense[],
  scope: ExpenseExportScope,
): Expense[] {
  if (scope === "all") return [...expenses];
  if (scope === "business") {
    return expenses.filter(isExpenseBusinessRelated);
  }
  return expenses.filter(isExpenseFiscalDeductible);
}

export function expenseExportScopeLabel(scope: ExpenseExportScope): string {
  return (
    EXPENSE_EXPORT_SCOPE_OPTIONS.find((option) => option.value === scope)
      ?.label ?? EXPENSE_EXPORT_SCOPE_OPTIONS[0].label
  );
}
