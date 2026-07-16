import { roundMoney } from "./calculations";
import { buildProductBusinessSummary } from "./product-business-summary";
import type { AppData, Document, Expense } from "./types";

export type ProductPeriodKind =
  | "all"
  | "month"
  | "months"
  | "quarter"
  | "year";

export interface ProductPeriodSelection {
  kind: ProductPeriodKind;
  year: number;
  month: number;
  endMonth?: number;
  quarter: 1 | 2 | 3 | 4;
}

export interface ProductPeriodSummary {
  selection: ProductPeriodSelection;
  label: string;
  invoicesCount: number;
  quotesCount: number;
  expensesCount: number;
  totalBilledIssued: number;
  totalCollectedLocal: number;
  totalPendingCollection: number;
  totalExpenses: number;
  salesIvaEstimated: number;
  expenseIvaEstimated: number;
  balanceEstimated: number;
  cashBalanceEstimated: number;
  business: ReturnType<typeof buildProductBusinessSummary>;
}

export const PRODUCT_MONTH_NAMES = [
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

export const PRODUCT_QUARTERS = [1, 2, 3, 4] as const;

function dateParts(date: string): { year: number; month: number } {
  const [rawYear, rawMonth] = date.split("-");
  const year = Number(rawYear);
  const month = Number(rawMonth);
  if (Number.isInteger(year) && Number.isInteger(month)) {
    return { year, month };
  }
  const parsed = new Date(date);
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
  };
}

export function quarterFromMonth(month: number): 1 | 2 | 3 | 4 {
  if (month <= 3) return 1;
  if (month <= 6) return 2;
  if (month <= 9) return 3;
  return 4;
}

export function getDefaultProductPeriod(
  reference = new Date(),
): ProductPeriodSelection {
  const year = reference.getFullYear();
  const month = reference.getMonth() + 1;
  return {
    kind: "year",
    year,
    month,
    endMonth: month,
    quarter: quarterFromMonth(month),
  };
}

export function productPeriodMonthRange(
  selection: Pick<ProductPeriodSelection, "month" | "endMonth">,
): { startMonth: number; endMonth: number } {
  const startMonth = Math.min(12, Math.max(1, selection.month));
  const requestedEndMonth = selection.endMonth ?? startMonth;
  const endMonth = Math.min(
    12,
    Math.max(startMonth, Math.min(requestedEndMonth, startMonth + 2)),
  );
  return { startMonth, endMonth };
}

export function formatProductPeriodLabel(
  selection: ProductPeriodSelection,
): string {
  switch (selection.kind) {
    case "all":
      return "Todos los periodos";
    case "month":
      return `${PRODUCT_MONTH_NAMES[selection.month - 1]} ${selection.year}`;
    case "months": {
      const { startMonth, endMonth } = productPeriodMonthRange(selection);
      const start = PRODUCT_MONTH_NAMES[startMonth - 1];
      const end = PRODUCT_MONTH_NAMES[endMonth - 1];
      return startMonth === endMonth
        ? `${start} ${selection.year}`
        : `${start}-${end} ${selection.year}`;
    }
    case "quarter":
      return `${selection.quarter}.º trimestre ${selection.year}`;
    case "year":
      return `Año ${selection.year}`;
  }
}

export function isDateInProductPeriod(
  date: string,
  selection: ProductPeriodSelection,
): boolean {
  if (selection.kind === "all") return true;
  const parts = dateParts(date);
  if (parts.year !== selection.year) return false;
  if (selection.kind === "year") return true;
  if (selection.kind === "month") return parts.month === selection.month;
  if (selection.kind === "months") {
    const { startMonth, endMonth } = productPeriodMonthRange(selection);
    return parts.month >= startMonth && parts.month <= endMonth;
  }
  return quarterFromMonth(parts.month) === selection.quarter;
}

export function filterDocumentsByProductPeriod(
  documents: Document[],
  selection: ProductPeriodSelection,
): Document[] {
  return documents.filter((document) =>
    isDateInProductPeriod(document.date, selection),
  );
}

export function filterExpensesByProductPeriod(
  expenses: Expense[],
  selection: ProductPeriodSelection,
): Expense[] {
  return expenses.filter((expense) =>
    isDateInProductPeriod(expense.date, selection),
  );
}

export function availableProductPeriodYears(
  documents: Document[],
  expenses: Expense[],
  reference = new Date(),
): number[] {
  const years = new Set<number>([reference.getFullYear()]);
  for (const document of documents) {
    years.add(dateParts(document.date).year);
  }
  for (const expense of expenses) {
    years.add(dateParts(expense.date).year);
  }
  return [...years]
    .filter((year) => Number.isInteger(year))
    .sort((a, b) => b - a);
}

function money(value: number): number {
  return Number.isFinite(value) ? roundMoney(value) : 0;
}

export function buildProductPeriodSummary(
  data: AppData,
  selection: ProductPeriodSelection,
): ProductPeriodSummary {
  const documents = filterDocumentsByProductPeriod(data.documents, selection);
  const expenses = filterExpensesByProductPeriod(data.expenses, selection);
  const business = buildProductBusinessSummary({
    ...data,
    documents,
    expenses,
  });

  return {
    selection,
    label: formatProductPeriodLabel(selection),
    invoicesCount: documents.filter((document) => document.type === "factura")
      .length,
    quotesCount: documents.filter((document) => document.type === "presupuesto")
      .length,
    expensesCount: expenses.length,
    totalBilledIssued: money(business.totalBilledIssued),
    totalCollectedLocal: money(business.totalCollectedLocal),
    totalPendingCollection: money(business.totalPendingCollection),
    totalExpenses: money(business.totalExpenses),
    salesIvaEstimated: money(business.salesIvaEstimated),
    expenseIvaEstimated: money(business.expenseIvaEstimated),
    balanceEstimated: money(business.balanceEstimated),
    cashBalanceEstimated: money(business.cashBalanceEstimated),
    business,
  };
}
