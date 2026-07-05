import { supplierFilterKey as expenseSupplierFilterKey } from "@/lib/expense-filters";
import { formatTimelineMonthLabel, timelineMonthKey } from "@/lib/timeline";
import type { Expense } from "@/lib/types";
import type { RentabilidadRealExpenseLinkCandidate } from "./types";

export interface ExpenseLinkCandidateListFilters {
  hiddenCandidateIds?: readonly string[];
  query?: string;
  supplierFilterKey?: string | null;
}

export interface ExpenseLinkCandidateMonthGroup {
  key: string;
  label: string;
  candidates: RentabilidadRealExpenseLinkCandidate[];
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function expenseSearchText(expense: Expense): string {
  const lineText = (expense.purchaseLines ?? [])
    .flatMap((line) => [line.description, line.supplierReference ?? ""])
    .join(" ");

  return [
    expense.supplierName,
    expense.description,
    expense.category,
    expense.purchaseDocument?.invoiceNumber ?? "",
    lineText,
  ].join(" ");
}

function candidateMatchesSearch(
  candidate: RentabilidadRealExpenseLinkCandidate,
  query: string,
): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return normalizeSearchText(expenseSearchText(candidate.expense)).includes(
    normalizedQuery,
  );
}

export function sortExpenseLinkCandidatesByDateDesc(
  candidates: readonly RentabilidadRealExpenseLinkCandidate[],
): RentabilidadRealExpenseLinkCandidate[] {
  return [...candidates].sort(
    (a, b) =>
      b.expense.date.localeCompare(a.expense.date) ||
      b.score - a.score ||
      a.expense.supplierName.localeCompare(b.expense.supplierName, "es"),
  );
}

export function filterAndSortExpenseLinkCandidates(
  candidates: readonly RentabilidadRealExpenseLinkCandidate[],
  filters: ExpenseLinkCandidateListFilters = {},
): RentabilidadRealExpenseLinkCandidate[] {
  const hiddenIds = new Set(filters.hiddenCandidateIds ?? []);
  return sortExpenseLinkCandidatesByDateDesc(
    candidates.filter((candidate) => {
      if (hiddenIds.has(candidate.expense.id)) return false;
      if (
        filters.supplierFilterKey &&
        expenseSupplierFilterKey(candidate.expense) !== filters.supplierFilterKey
      ) {
        return false;
      }
      return candidateMatchesSearch(candidate, filters.query ?? "");
    }),
  );
}

export function groupExpenseLinkCandidatesByMonth(
  candidates: readonly RentabilidadRealExpenseLinkCandidate[],
): ExpenseLinkCandidateMonthGroup[] {
  const groups = new Map<string, ExpenseLinkCandidateMonthGroup>();

  for (const candidate of candidates) {
    const key = timelineMonthKey(candidate.expense.date);
    const existing = groups.get(key);
    if (existing) {
      existing.candidates.push(candidate);
    } else {
      groups.set(key, {
        key,
        label: formatTimelineMonthLabel(candidate.expense.date),
        candidates: [candidate],
      });
    }
  }

  return [...groups.values()];
}
