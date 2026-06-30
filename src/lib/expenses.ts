import { roundMoney } from "./calculations";
import type {
  Expense,
  ExpensePurchaseDocument,
  ExpensePurchaseLine,
} from "./types";

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

export function expensePurchaseLineBaseTotal(
  line: Pick<
    ExpensePurchaseLine,
    "quantity" | "unitPrice" | "discountPercent" | "total"
  >,
): number {
  if (Number.isFinite(line.total) && (line.total ?? 0) > 0) {
    return roundMoney(line.total ?? 0);
  }

  const quantity = Number.isFinite(line.quantity) ? line.quantity : 0;
  const unitPrice = Number.isFinite(line.unitPrice) ? line.unitPrice : 0;
  const discountPercent = Number.isFinite(line.discountPercent)
    ? Math.min(Math.max(line.discountPercent ?? 0, 0), 100)
    : 0;

  return roundMoney(quantity * unitPrice * (1 - discountPercent / 100));
}

export function expensePurchaseLinesBaseTotal(
  lines: ExpensePurchaseLine[] = [],
): number {
  return roundMoney(
    lines.reduce((sum, line) => sum + expensePurchaseLineBaseTotal(line), 0),
  );
}

export function sanitizeExpensePurchaseLines(
  lines: ExpensePurchaseLine[] = [],
): ExpensePurchaseLine[] {
  return lines
    .map((line) => ({
      ...line,
      description: line.description.trim(),
      quantity: normalizeExpenseAmount(line.quantity),
      unit: line.unit?.trim() || undefined,
      unitPrice: normalizeExpenseAmount(line.unitPrice),
      discountPercent: Number.isFinite(line.discountPercent)
        ? Math.min(Math.max(line.discountPercent ?? 0, 0), 100)
        : undefined,
      ivaPercent: Number.isFinite(line.ivaPercent)
        ? normalizeExpenseIvaPercent(line.ivaPercent ?? 0)
        : undefined,
      total:
        Number.isFinite(line.total) && (line.total ?? 0) > 0
          ? roundMoney(line.total ?? 0)
          : undefined,
    }))
    .filter(
      (line) =>
        line.description.length > 0 &&
        line.quantity > 0 &&
        (line.unitPrice > 0 || (line.total ?? 0) > 0),
    );
}

export function sanitizeExpensePurchaseDocument(
  document: ExpensePurchaseDocument = {},
): ExpensePurchaseDocument | undefined {
  const sanitized: ExpensePurchaseDocument = {
    invoiceNumber: document.invoiceNumber?.trim() || undefined,
    issueDate: document.issueDate?.trim() || undefined,
    dueDate: document.dueDate?.trim() || undefined,
    supplierNif: document.supplierNif?.trim() || undefined,
    supplierAddress: document.supplierAddress?.trim() || undefined,
    supplierPostalCode: document.supplierPostalCode?.trim() || undefined,
    supplierCity: document.supplierCity?.trim() || undefined,
    paymentTerms: document.paymentTerms?.trim() || undefined,
  };

  return Object.values(sanitized).some(Boolean) ? sanitized : undefined;
}
