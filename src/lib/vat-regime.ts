import { documentTotals, expenseTotal } from "./calculations";
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
  doc: Pick<Document, "items"> &
    Partial<
      Pick<
        Document,
        | "documentSnapshot"
        | "snapshotIntegrityRequired"
        | "snapshotIntegrity"
      >
    >,
  vatExempt: boolean,
): { subtotal: number; iva: number; total: number } {
  if (doc.snapshotIntegrity?.status === "blocked") {
    return { subtotal: 0, iva: 0, total: 0 };
  }
  const frozen = doc.documentSnapshot?.taxSummary;
  if (
    doc.snapshotIntegrityRequired &&
    doc.documentSnapshot?.documentType !== "presupuesto" &&
    frozen
  ) {
    return {
      subtotal: frozen.subtotal,
      iva: frozen.iva,
      total: frozen.total,
    };
  }
  return documentTotals(doc, vatExempt);
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
