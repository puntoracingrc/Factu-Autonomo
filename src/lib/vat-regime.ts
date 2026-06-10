import {
  documentTotals,
  expenseTotal,
  lineSubtotal,
} from "./calculations";
import type { BusinessProfile, Document, Expense, LineItem } from "./types";

export function isVatExempt(
  profile: Pick<BusinessProfile, "vatExempt">,
): boolean {
  return Boolean(profile.vatExempt);
}

export function normalizeVatExempt(value?: boolean): boolean {
  return Boolean(value);
}

export function zeroIvaItems(items: LineItem[]): LineItem[] {
  return items.map((item) => ({ ...item, ivaPercent: 0 }));
}

export function documentAmounts(
  doc: Pick<Document, "items">,
  vatExempt: boolean,
): { subtotal: number; iva: number; total: number } {
  if (!vatExempt) return documentTotals(doc);
  const subtotal = doc.items.reduce(
    (sum, item) => sum + lineSubtotal(item),
    0,
  );
  return { subtotal, iva: 0, total: subtotal };
}

export function expenseAmount(expense: Expense, vatExempt: boolean): number {
  return vatExempt ? expense.amount : expenseTotal(expense);
}

export function collectedSalesTotal(
  documents: Document[],
  vatExempt: boolean,
  isCollected: (doc: Document) => boolean,
): number {
  return documents
    .filter(isCollected)
    .reduce((sum, doc) => sum + documentAmounts(doc, vatExempt).total, 0);
}

export function totalExpensesAmount(
  expenses: Expense[],
  vatExempt: boolean,
): number {
  return expenses.reduce(
    (sum, expense) => sum + expenseAmount(expense, vatExempt),
    0,
  );
}
