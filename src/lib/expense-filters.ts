import {
  filterExpensesByQuarter,
  filterExpensesByYear,
  getCurrentQuarter,
  quarterLabel,
  type Quarter,
} from "./periods";
import { expenseAmount } from "./vat-regime";
import type { Expense } from "./types";

export type ExpensePeriodKind = "month" | "quarter" | "year";

export const EXPENSE_CHART_COLORS = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#ca8a04",
  "#64748b",
] as const;

export interface SupplierSpendSlice {
  key: string;
  label: string;
  amount: number;
  percent: number;
  color: string;
}

export function isDateInMonth(
  date: string,
  year: number,
  month: number,
): boolean {
  const parsed = new Date(date);
  return parsed.getFullYear() === year && parsed.getMonth() + 1 === month;
}

export function filterExpensesByMonth(
  expenses: Expense[],
  year: number,
  month: number,
): Expense[] {
  return expenses.filter((expense) =>
    isDateInMonth(expense.date, year, month),
  );
}

export function filterExpensesByPeriod(
  expenses: Expense[],
  kind: ExpensePeriodKind,
  year: number,
  month: number,
  quarter: Quarter,
): Expense[] {
  switch (kind) {
    case "month":
      return filterExpensesByMonth(expenses, year, month);
    case "quarter":
      return filterExpensesByQuarter(expenses, year, quarter);
    case "year":
      return filterExpensesByYear(expenses, year);
  }
}

export function supplierFilterKey(expense: Expense): string {
  if (expense.supplierId) return `id:${expense.supplierId}`;
  return `name:${expense.supplierName.trim().toLowerCase()}`;
}

export function supplierLabelFromKey(
  key: string,
  expenses: Expense[],
): string {
  if (key.startsWith("id:")) {
    const id = key.slice(3);
    const match = expenses.find((e) => e.supplierId === id);
    return match?.supplierName ?? "Proveedor";
  }
  if (key.startsWith("name:")) {
    const match = expenses.find(
      (e) => supplierFilterKey(e) === key,
    );
    return match?.supplierName ?? key.slice(5);
  }
  return key;
}

export function matchesSupplierFilter(
  expense: Expense,
  filterKey: string | null,
  slices: SupplierSpendSlice[] = [],
): boolean {
  if (!filterKey) return true;
  if (filterKey === "__otros__") {
    const mainKeys = slices
      .filter((slice) => slice.key !== "__otros__")
      .map((slice) => slice.key);
    return !mainKeys.includes(supplierFilterKey(expense));
  }
  return supplierFilterKey(expense) === filterKey;
}

export function uniqueSupplierOptions(
  expenses: Expense[],
): Array<{ key: string; label: string }> {
  const map = new Map<string, string>();
  for (const expense of expenses) {
    const key = supplierFilterKey(expense);
    if (!map.has(key)) map.set(key, expense.supplierName);
  }
  return [...map.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function aggregateExpensesBySupplier(
  expenses: Expense[],
  vatExempt: boolean,
  maxSlices = 8,
): SupplierSpendSlice[] {
  if (expenses.length === 0) return [];

  const totals = new Map<string, { label: string; amount: number }>();

  for (const expense of expenses) {
    const key = supplierFilterKey(expense);
    const amount = expenseAmount(expense, vatExempt);
    const current = totals.get(key);
    if (current) {
      current.amount += amount;
    } else {
      totals.set(key, { label: expense.supplierName, amount });
    }
  }

  const sorted = [...totals.entries()].sort((a, b) => b[1].amount - a[1].amount);
  const grandTotal = sorted.reduce((sum, [, value]) => sum + value.amount, 0);
  if (grandTotal <= 0) return [];

  const limit = Math.max(2, maxSlices);
  const main = sorted.slice(0, limit - 1);
  const rest = sorted.slice(limit - 1);

  const slices: SupplierSpendSlice[] = main.map(([key, value], index) => ({
    key,
    label: value.label,
    amount: value.amount,
    percent: (value.amount / grandTotal) * 100,
    color: EXPENSE_CHART_COLORS[index % EXPENSE_CHART_COLORS.length],
  }));

  if (rest.length > 0) {
    const otrosAmount = rest.reduce((sum, [, value]) => sum + value.amount, 0);
    slices.push({
      key: "__otros__",
      label: "Otros",
      amount: otrosAmount,
      percent: (otrosAmount / grandTotal) * 100,
      color: EXPENSE_CHART_COLORS[slices.length % EXPENSE_CHART_COLORS.length],
    });
  }

  return slices;
}

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export function formatExpensePeriodLabel(
  kind: ExpensePeriodKind,
  year: number,
  month: number,
  quarter: Quarter,
): string {
  switch (kind) {
    case "month":
      return `${MONTH_NAMES[month - 1]} ${year}`;
    case "quarter":
      return quarterLabel(year, quarter);
    case "year":
      return `Año ${year}`;
  }
}

export function expenseExportFilenameStem(
  kind: ExpensePeriodKind,
  year: number,
  month: number,
  quarter: Quarter,
): string {
  switch (kind) {
    case "month":
      return `gastos-${MONTH_NAMES[month - 1].toLowerCase()}-${year}`;
    case "quarter":
      return `gastos-T${quarter}-${year}`;
    case "year":
      return `gastos-${year}`;
  }
}

export function getDefaultExpensePeriod(reference = new Date()): {
  kind: ExpensePeriodKind;
  year: number;
  month: number;
  quarter: Quarter;
} {
  const { year, quarter } = getCurrentQuarter(reference);
  return {
    kind: "year",
    year,
    month: reference.getMonth() + 1,
    quarter,
  };
}
