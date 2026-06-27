import { roundMoney } from "./calculations";
import type { Expense } from "./types";

export interface ExpenseTotals {
  base: number;
  iva: number;
  total: number;
  ivaPercent: number;
}

export function normalizeExpenseAmount(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function normalizeExpenseIvaPercent(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function expenseTotalsFromBase(
  amount: number,
  ivaPercent: number,
  vatExempt = false,
): ExpenseTotals {
  const base = normalizeExpenseAmount(amount);
  const rate = vatExempt ? 0 : normalizeExpenseIvaPercent(ivaPercent);
  const iva = roundMoney(base * (rate / 100));
  return {
    base,
    iva,
    total: roundMoney(base + iva),
    ivaPercent: rate,
  };
}

export function expenseTotals(
  expense: Pick<Expense, "amount" | "ivaPercent">,
  vatExempt = false,
): ExpenseTotals {
  return expenseTotalsFromBase(expense.amount, expense.ivaPercent, vatExempt);
}
