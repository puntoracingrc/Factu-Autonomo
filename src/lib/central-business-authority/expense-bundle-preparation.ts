import {
  fixedExpenseBundleIds,
  prepareFixedExpenseBundle,
  type FixedExpenseBundleValue,
} from "@/lib/app-data-durability";
import type { RecurringExpenseDraft } from "@/lib/recurring-expenses";
import {
  buildScannedExpenseDurableTransition,
  type ScannedExpenseDurableValue,
} from "@/lib/scanned-expense-durability";
import type { AppData, Expense, Supplier } from "@/lib/types";

import type { CentralExpenseBundlePreparation } from "./expense-bundle-canary";
import type { CentralBusinessJson } from "./mutation-command";

type DurableExpense = Omit<Expense, "id" | "createdAt"> | Expense;

function jsonValue(value: unknown): CentralBusinessJson {
  return JSON.parse(JSON.stringify(value)) as CentralBusinessJson;
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function prepareCentralScannedExpenseBundle(input: {
  data: AppData;
  expense: DurableExpense;
  operationId: string;
  now: string;
  supplier?: Omit<Supplier, "id" | "createdAt">;
}): CentralExpenseBundlePreparation<ScannedExpenseDurableValue> {
  try {
    const transition = buildScannedExpenseDurableTransition(input);
    return {
      ok: true,
      transition,
      mutations: [
        ...(input.supplier && transition.value.supplier
          ? [
              {
                entityType: "supplier" as const,
                entityId: transition.value.supplier.id,
                expectation: "create" as const,
                payload: jsonValue(transition.value.supplier),
              },
            ]
          : []),
        {
          entityType: "expense",
          entityId: transition.value.expense.id,
          expectation: "id" in input.expense ? "known" : "create",
          payload: jsonValue(transition.value.expense),
        },
      ],
    };
  } catch {
    return {
      ok: false,
      error: "No se pudo preparar de forma inequívoca el gasto escaneado.",
    };
  }
}

export function prepareCentralFixedExpenseBundle(input: {
  data: AppData;
  expense: DurableExpense;
  recurringExpense: RecurringExpenseDraft;
  operationId: string;
  now: string;
  supplier?: Omit<Supplier, "id" | "createdAt">;
}): CentralExpenseBundlePreparation<FixedExpenseBundleValue> {
  const prepared = prepareFixedExpenseBundle(
    input.data,
    {
      expense: input.expense,
      recurringExpense: input.recurringExpense,
      supplier: input.supplier,
      ids: fixedExpenseBundleIds(input.operationId),
    },
    { now: input.now, referenceDate: input.now.slice(0, 10) },
  );
  if (prepared.status === "blocked") {
    return {
      ok: false,
      error: "No se pudo preparar de forma inequívoca el gasto fijo.",
    };
  }
  const transition =
    prepared.status === "ready"
      ? prepared.transition
      : { data: input.data, value: prepared.value };
  const previousExpenses = new Map(
    input.data.expenses.map((expense) => [expense.id, expense]),
  );
  const changedExpenses = transition.data.expenses.filter(
    (expense) =>
      !previousExpenses.has(expense.id) ||
      !jsonEqual(previousExpenses.get(expense.id), expense),
  );
  return {
    ok: true,
    transition,
    mutations: [
      ...(input.supplier && transition.value.supplier
        ? [
            {
              entityType: "supplier" as const,
              entityId: transition.value.supplier.id,
              expectation: "create" as const,
              payload: jsonValue(transition.value.supplier),
            },
          ]
        : []),
      ...changedExpenses.map((expense) => ({
        entityType: "expense" as const,
        entityId: expense.id,
        expectation: previousExpenses.has(expense.id)
          ? ("known" as const)
          : ("create" as const),
        payload: jsonValue(expense),
      })),
      {
        entityType: "recurring_expense",
        entityId: transition.value.recurringExpense.id,
        expectation: "create",
        payload: jsonValue(transition.value.recurringExpense),
      },
    ],
  };
}
