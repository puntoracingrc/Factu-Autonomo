import { explicitExpenseWorkAllocations } from "./expense-work-allocations";
import type { Expense } from "./types";

interface ExpenseWorkIndex {
  byWorkDocumentId: Map<string, IndexedExpense[]>;
}

interface IndexedExpense {
  expense: Expense;
  position: number;
}

const expenseWorkIndexCache = new WeakMap<Expense[], ExpenseWorkIndex>();

function buildExpenseWorkIndex(expenses: Expense[]): ExpenseWorkIndex {
  const byWorkDocumentId = new Map<string, IndexedExpense[]>();

  expenses.forEach((expense, position) => {
    const explicitAllocations = explicitExpenseWorkAllocations(expense);
    const workDocumentIds =
      explicitAllocations.length > 0
        ? explicitAllocations.map((allocation) => allocation.workDocumentId)
        : expense.workDocumentId
          ? [expense.workDocumentId]
          : [];

    for (const workDocumentId of new Set(workDocumentIds)) {
      const linkedExpenses = byWorkDocumentId.get(workDocumentId) ?? [];
      linkedExpenses.push({ expense, position });
      byWorkDocumentId.set(workDocumentId, linkedExpenses);
    }
  });

  return { byWorkDocumentId };
}

function getExpenseWorkIndex(expenses: Expense[]): ExpenseWorkIndex {
  const cached = expenseWorkIndexCache.get(expenses);
  if (cached) return cached;

  const index = buildExpenseWorkIndex(expenses);
  expenseWorkIndexCache.set(expenses, index);
  return index;
}

export function expensesLinkedToWorkDocumentIds(
  expenses: Expense[],
  workDocumentIds: Iterable<string>,
): Expense[] {
  if (expenses.length === 0) return [];

  const index = getExpenseWorkIndex(expenses);
  const linkedExpenses = new Map<number, Expense>();
  for (const workDocumentId of new Set(workDocumentIds)) {
    for (const entry of index.byWorkDocumentId.get(workDocumentId) ?? []) {
      linkedExpenses.set(entry.position, entry.expense);
    }
  }

  return [...linkedExpenses.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, expense]) => expense);
}
