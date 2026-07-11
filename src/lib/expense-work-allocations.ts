import { roundMoney } from "./calculations";
import type { Expense, ExpenseWorkAllocation } from "./types";

function normalizeLineIds(lineIds: string[] | undefined): string[] | undefined {
  if (!lineIds) return undefined;
  const normalized = [...new Set(lineIds.filter(Boolean))];
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeExplicitAllocations(
  expense: Pick<Expense, "workAllocations">,
): ExpenseWorkAllocation[] {
  const byDocument = new Map<string, ExpenseWorkAllocation>();
  for (const allocation of expense.workAllocations ?? []) {
    if (!allocation?.workDocumentId || !Number.isFinite(allocation.amount)) {
      continue;
    }
    byDocument.set(allocation.workDocumentId, {
      ...allocation,
      amount: roundMoney(allocation.amount),
      includedLineIds: normalizeLineIds(allocation.includedLineIds),
      allocatedAt: allocation.allocatedAt || allocation.updatedAt || "",
    });
  }
  return [...byDocument.values()];
}

export function explicitExpenseWorkAllocations(
  expense: Pick<Expense, "workAllocations">,
): ExpenseWorkAllocation[] {
  return normalizeExplicitAllocations(expense);
}

export function expenseAllocatedAmountForWorkIds(
  expense: Pick<Expense, "workDocumentId" | "workAllocations">,
  workDocumentIds: Iterable<string>,
  fullAmount: number,
): number {
  const ids = new Set(workDocumentIds);
  const explicit = normalizeExplicitAllocations(expense);
  if (explicit.length > 0) {
    return roundMoney(
      explicit.reduce(
        (total, allocation) =>
          total + (ids.has(allocation.workDocumentId) ? allocation.amount : 0),
        0,
      ),
    );
  }
  return expense.workDocumentId && ids.has(expense.workDocumentId)
    ? roundMoney(fullAmount)
    : 0;
}

export function expenseTotalAllocatedAmount(
  expense: Pick<Expense, "workDocumentId" | "workAllocations">,
  fullAmount: number,
): number {
  const explicit = normalizeExplicitAllocations(expense);
  if (explicit.length > 0) {
    return roundMoney(
      explicit.reduce((total, allocation) => total + allocation.amount, 0),
    );
  }
  return expense.workDocumentId ? roundMoney(fullAmount) : 0;
}

export function expenseAllocatedLineIds(
  expense: Pick<Expense, "workAllocations">,
  excludedWorkDocumentIds: Iterable<string> = [],
): Set<string> {
  const excludedIds = new Set(excludedWorkDocumentIds);
  return new Set(
    normalizeExplicitAllocations(expense).flatMap((allocation) =>
      excludedIds.has(allocation.workDocumentId)
        ? []
        : allocation.includedLineIds ?? [],
    ),
  );
}

export function expenseIncludedLineIdsForWork(
  expense: Pick<Expense, "workAllocations">,
  workDocumentIds: Iterable<string>,
): string[] {
  const ids = new Set(workDocumentIds);
  return [
    ...new Set(
      normalizeExplicitAllocations(expense).flatMap((allocation) =>
        ids.has(allocation.workDocumentId)
          ? allocation.includedLineIds ?? []
          : [],
      ),
    ),
  ];
}

export function upsertExpenseWorkAllocation(
  expense: Expense,
  input: {
    workDocumentId: string;
    amount: number;
    fullAmount: number;
    includedLineIds?: string[];
    now?: string;
  },
): Expense {
  if (!input.workDocumentId) return expense;
  const now = input.now ?? new Date().toISOString();
  const fullAmount = roundMoney(input.fullAmount);
  const fullMagnitude = Math.abs(fullAmount);
  const fullSign = fullAmount < 0 ? -1 : 1;
  const explicit = normalizeExplicitAllocations(expense);
  const allocations =
    explicit.length > 0
      ? explicit
      : expense.workDocumentId
        ? [
            {
              workDocumentId: expense.workDocumentId,
              amount: fullAmount,
              allocatedAt: now,
            },
          ]
        : [];
  const previous = allocations.find(
    (allocation) => allocation.workDocumentId === input.workDocumentId,
  );
  const allocatedElsewhereMagnitude = allocations.reduce(
    (total, allocation) =>
      total +
      (allocation.workDocumentId === input.workDocumentId
        ? 0
        : Math.abs(allocation.amount)),
    0,
  );
  const availableMagnitude = Math.max(
    0,
    roundMoney(fullMagnitude - allocatedElsewhereMagnitude),
  );
  const amount = roundMoney(
    fullSign * Math.min(Math.abs(roundMoney(input.amount)), availableMagnitude),
  );
  const nextAllocation: ExpenseWorkAllocation = {
    workDocumentId: input.workDocumentId,
    amount,
    includedLineIds: normalizeLineIds(input.includedLineIds),
    allocatedAt: previous?.allocatedAt || now,
    updatedAt: now,
  };
  const nextAllocations = [
    ...allocations.filter(
      (allocation) => allocation.workDocumentId !== input.workDocumentId,
    ),
    nextAllocation,
  ].filter((allocation) => allocation.amount !== 0);

  return {
    ...expense,
    workDocumentId: nextAllocations[0]?.workDocumentId,
    workAllocations: nextAllocations.length > 0 ? nextAllocations : undefined,
    workAllocationClosed: false,
  };
}

export function removeExpenseWorkAllocations(
  expense: Expense,
  workDocumentIds: Iterable<string>,
): Expense {
  const ids = new Set(workDocumentIds);
  const explicit = normalizeExplicitAllocations(expense);
  if (explicit.length === 0) {
    if (!expense.workDocumentId || !ids.has(expense.workDocumentId)) return expense;
    return {
      ...expense,
      workDocumentId: undefined,
      workAllocations: undefined,
      workAllocationClosed: false,
    };
  }
  const nextAllocations = explicit.filter(
    (allocation) => !ids.has(allocation.workDocumentId),
  );
  return {
    ...expense,
    workDocumentId: nextAllocations[0]?.workDocumentId,
    workAllocations: nextAllocations.length > 0 ? nextAllocations : undefined,
    workAllocationClosed: false,
  };
}
