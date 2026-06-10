import type { Document, Expense } from "./types";

export type Quarter = 1 | 2 | 3 | 4;

const QUARTER_NAMES: Record<Quarter, string> = {
  1: "1.er trimestre",
  2: "2.º trimestre",
  3: "3.er trimestre",
  4: "4.º trimestre",
};

export function getQuarterFromDate(date: string): {
  year: number;
  quarter: Quarter;
} {
  const parsed = new Date(date);
  const year = parsed.getFullYear();
  const month = parsed.getMonth() + 1;
  const quarter = (Math.ceil(month / 3) as Quarter);
  return { year, quarter };
}

export function getCurrentQuarter(reference = new Date()): {
  year: number;
  quarter: Quarter;
} {
  const iso = reference.toISOString().split("T")[0];
  return getQuarterFromDate(iso);
}

export function quarterLabel(year: number, quarter: Quarter): string {
  return `${QUARTER_NAMES[quarter]} ${year}`;
}

export function isDateInQuarter(
  date: string,
  year: number,
  quarter: Quarter,
): boolean {
  const value = getQuarterFromDate(date);
  return value.year === year && value.quarter === quarter;
}

export function filterDocumentsByQuarter(
  documents: Document[],
  year: number,
  quarter: Quarter,
): Document[] {
  return documents.filter((doc) => isDateInQuarter(doc.date, year, quarter));
}

export function filterExpensesByQuarter(
  expenses: Expense[],
  year: number,
  quarter: Quarter,
): Expense[] {
  return expenses.filter((expense) =>
    isDateInQuarter(expense.date, year, quarter),
  );
}

export function isDateInYear(date: string, year: number): boolean {
  return getQuarterFromDate(date).year === year;
}

export function filterDocumentsByYear(
  documents: Document[],
  year: number,
): Document[] {
  return documents.filter((doc) => isDateInYear(doc.date, year));
}

export function filterExpensesByYear(
  expenses: Expense[],
  year: number,
): Expense[] {
  return expenses.filter((expense) => isDateInYear(expense.date, year));
}

export function availableSummaryYears(
  documents: Document[],
  expenses: Expense[],
): number[] {
  const years = new Set<number>([getCurrentQuarter().year]);
  for (const doc of documents) {
    years.add(getQuarterFromDate(doc.date).year);
  }
  for (const expense of expenses) {
    years.add(getQuarterFromDate(expense.date).year);
  }
  return [...years].sort((a, b) => b - a);
}

export const ALL_QUARTERS: Quarter[] = [1, 2, 3, 4];
