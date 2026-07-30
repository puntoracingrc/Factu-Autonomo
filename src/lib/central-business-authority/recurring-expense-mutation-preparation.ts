import type { AppDataTransition } from "@/lib/app-data-durability";
import {
  applyRecurringExpenseChangeToData,
  deleteRecurringExpenseFromData,
  syncRecurringExpenses,
  type RecurringExpenseChangeApplyResult,
  type RecurringExpenseDraft,
} from "@/lib/recurring-expenses";
import type { AppData, Expense, RecurringExpense } from "@/lib/types";

import type {
  CentralExpenseBundlePreparation,
  CentralExpenseBundlePreparedMutation,
} from "./expense-bundle-canary";
import type { CentralBusinessJson } from "./mutation-command";

const OPERATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/u;

function jsonValue(value: unknown): CentralBusinessJson {
  return JSON.parse(JSON.stringify(value)) as CentralBusinessJson;
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function entityMutations<T extends Expense | RecurringExpense>(
  entityType: "expense" | "recurring_expense",
  before: T[],
  after: T[],
): CentralExpenseBundlePreparedMutation[] {
  const previous = new Map(before.map((entry) => [entry.id, entry]));
  const next = new Map(after.map((entry) => [entry.id, entry]));
  return [
    ...after
      .filter(
        (entry) =>
          !previous.has(entry.id) || !jsonEqual(previous.get(entry.id), entry),
      )
      .map((entry) => ({
        entityType,
        entityId: entry.id,
        expectation: previous.has(entry.id)
          ? ("known" as const)
          : ("create" as const),
        payload: jsonValue(entry),
      })),
    ...before
      .filter((entry) => !next.has(entry.id))
      .map((entry) => ({
        entityType,
        entityId: entry.id,
        expectation: "known" as const,
        operationKind: "delete" as const,
        payload: null,
      })),
  ];
}

function preparation<T>(
  before: AppData,
  transition: AppDataTransition<T>,
): CentralExpenseBundlePreparation<T> {
  const mutations = [
    ...entityMutations(
      "recurring_expense",
      before.recurringExpenses,
      transition.data.recurringExpenses,
    ),
    ...entityMutations("expense", before.expenses, transition.data.expenses),
  ];
  if (mutations.length === 0) {
    return {
      ok: false,
      error: "La regla recurrente no contiene ningún cambio que guardar.",
    };
  }
  return { ok: true, transition, mutations };
}

function identity(operationId: string) {
  if (!OPERATION_ID_PATTERN.test(operationId)) {
    throw new Error("INVALID_RECURRING_OPERATION_ID");
  }
  return {
    recurringId: `recurring-${operationId}`,
    splitRecurringId: `recurring-split-${operationId}`,
    expenseId: (_template: RecurringExpense, date: string) =>
      `recurring-occurrence-${operationId}-${date}`,
  };
}

function uniqueById<T extends { id: string }>(entries: T[]): boolean {
  return new Set(entries.map((entry) => entry.id)).size === entries.length;
}

function preparedDataIsUnambiguous(before: AppData, after: AppData): boolean {
  if (
    !uniqueById(before.recurringExpenses) ||
    !uniqueById(before.expenses) ||
    !uniqueById(after.recurringExpenses) ||
    !uniqueById(after.expenses)
  ) {
    return false;
  }
  const previousExpenseIds = new Set(before.expenses.map((entry) => entry.id));
  const newExpenses = after.expenses.filter(
    (entry) => !before.expenses.some((previous) => previous.id === entry.id),
  );
  return newExpenses.every((entry) => !previousExpenseIds.has(entry.id));
}

export function prepareCentralRecurringExpenseCreate(input: {
  data: AppData;
  item: RecurringExpenseDraft;
  operationId: string;
  now: string;
}): CentralExpenseBundlePreparation<RecurringExpense> {
  try {
    const ids = identity(input.operationId);
    if (
      input.data.recurringExpenses.some((entry) => entry.id === ids.recurringId)
    ) {
      return {
        ok: false,
        error: "La regla recurrente ya existe o su identidad no es segura.",
      };
    }
    const recurringExpense: RecurringExpense = {
      ...input.item,
      id: ids.recurringId,
      createdAt: input.now,
      updatedAt: input.now,
    };
    const data = syncRecurringExpenses(
      {
        ...input.data,
        recurringExpenses: [...input.data.recurringExpenses, recurringExpense],
      },
      input.now.slice(0, 10),
      { createExpenseId: ids.expenseId, createdAt: input.now },
    );
    if (!preparedDataIsUnambiguous(input.data, data)) {
      return {
        ok: false,
        error: "La regla recurrente genera identidades ambiguas.",
      };
    }
    return preparation(input.data, { data, value: recurringExpense });
  } catch {
    return {
      ok: false,
      error: "No se pudo preparar de forma inequívoca la regla recurrente.",
    };
  }
}

export function prepareCentralRecurringExpenseEnabled(input: {
  data: AppData;
  recurringExpenseId: string;
  enabled: boolean;
  operationId: string;
  now: string;
}): CentralExpenseBundlePreparation<RecurringExpense> {
  try {
    const matches = input.data.recurringExpenses.filter(
      (entry) => entry.id === input.recurringExpenseId,
    );
    if (matches.length !== 1) {
      return {
        ok: false,
        error: "La regla recurrente ya no existe o está duplicada.",
      };
    }
    const ids = identity(input.operationId);
    const updated = {
      ...matches[0],
      enabled: input.enabled,
      updatedAt: input.now,
    };
    const data = syncRecurringExpenses(
      {
        ...input.data,
        recurringExpenses: input.data.recurringExpenses.map((entry) =>
          entry.id === updated.id ? updated : entry,
        ),
      },
      input.now.slice(0, 10),
      { createExpenseId: ids.expenseId, createdAt: input.now },
    );
    if (!preparedDataIsUnambiguous(input.data, data)) {
      return {
        ok: false,
        error: "La activación genera identidades ambiguas.",
      };
    }
    return preparation(input.data, { data, value: updated });
  } catch {
    return {
      ok: false,
      error: "No se pudo preparar el estado de la regla recurrente.",
    };
  }
}

export function prepareCentralRecurringExpenseChange(input: {
  data: AppData;
  recurringExpenseId: string;
  item: RecurringExpenseDraft;
  effectiveDate: string;
  precondition: string;
  referenceDate: string;
  operationId: string;
  now: string;
}): CentralExpenseBundlePreparation<
  Extract<RecurringExpenseChangeApplyResult, { status: "applied" }>
> {
  try {
    const ids = identity(input.operationId);
    const applied = applyRecurringExpenseChangeToData(
      input.data,
      input.recurringExpenseId,
      input.item,
      input.effectiveDate,
      {
        now: input.now,
        newId: () => ids.splitRecurringId,
        referenceDate: input.referenceDate,
        expectedPrecondition: input.precondition,
        createExpenseId: ids.expenseId,
      },
    );
    if (applied.status !== "applied") {
      return {
        ok: false,
        error:
          applied.reason === "stale_preview"
            ? "Los datos cambiaron después de la vista previa."
            : "El cambio requiere una nueva revisión manual.",
      };
    }
    if (!preparedDataIsUnambiguous(input.data, applied.data)) {
      return {
        ok: false,
        error: "El cambio recurrente genera identidades ambiguas.",
      };
    }
    return preparation(input.data, { data: applied.data, value: applied });
  } catch {
    return {
      ok: false,
      error: "No se pudo preparar el cambio de la regla recurrente.",
    };
  }
}

export function prepareCentralRecurringExpenseDelete(input: {
  data: AppData;
  recurringExpenseId: string;
}): CentralExpenseBundlePreparation<string> {
  const matches = input.data.recurringExpenses.filter(
    (entry) => entry.id === input.recurringExpenseId,
  );
  if (matches.length !== 1) {
    return {
      ok: false,
      error: "La regla recurrente ya no existe o está duplicada.",
    };
  }
  return preparation(input.data, {
    data: deleteRecurringExpenseFromData(input.data, input.recurringExpenseId),
    value: input.recurringExpenseId,
  });
}
