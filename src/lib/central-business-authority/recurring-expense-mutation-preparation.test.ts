import { describe, expect, it } from "vitest";

import type { RecurringExpenseDraft } from "@/lib/recurring-expenses";
import { EMPTY_DATA, type AppData, type RecurringExpense } from "@/lib/types";

import {
  prepareCentralRecurringExpenseCreate,
  prepareCentralRecurringExpenseDelete,
  prepareCentralRecurringExpenseEnabled,
} from "./recurring-expense-mutation-preparation";

const now = "2026-07-30T10:00:00.000Z";
const operationId = "recurring-test-0001";
const draft: RecurringExpenseDraft = {
  supplierName: "Proveedor sintético",
  description: "Cuota recurrente sintética",
  amount: 10,
  ivaPercent: 21,
  deductibility: "deductible",
  category: "Otros",
  paymentMethod: "Domiciliación",
  frequency: "monthly",
  dueTiming: { kind: "day_of_month", day: 1 },
  duration: { kind: "indefinite" },
  startDate: "2026-07-01",
  enabled: true,
};

function data(
  input: {
    recurringExpenses?: RecurringExpense[];
  } = {},
): AppData {
  return {
    ...EMPTY_DATA,
    expenses: [],
    recurringExpenses: input.recurringExpenses ?? [],
  };
}

describe("central recurring expense mutation preparation", () => {
  it("prepares the rule and generated occurrences in one deterministic batch", () => {
    const result = prepareCentralRecurringExpenseCreate({
      data: data(),
      item: draft,
      operationId,
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transition.value.id).toBe(`recurring-${operationId}`);
    expect(result.transition.data.expenses).toEqual([
      expect.objectContaining({
        id: `recurring-occurrence-${operationId}-2026-07-01`,
        recurringExpenseId: `recurring-${operationId}`,
      }),
    ]);
    expect(result.mutations).toEqual([
      expect.objectContaining({
        entityType: "recurring_expense",
        expectation: "create",
      }),
      expect.objectContaining({
        entityType: "expense",
        expectation: "create",
      }),
    ]);
  });

  it("reactivates the rule and creates its missing occurrence atomically", () => {
    const recurringExpense: RecurringExpense = {
      ...draft,
      id: "recurring-existing",
      enabled: false,
      createdAt: "2026-07-01T08:00:00.000Z",
      updatedAt: "2026-07-01T08:00:00.000Z",
    };
    const result = prepareCentralRecurringExpenseEnabled({
      data: data({ recurringExpenses: [recurringExpense] }),
      recurringExpenseId: recurringExpense.id,
      enabled: true,
      operationId,
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mutations).toEqual([
      expect.objectContaining({
        entityType: "recurring_expense",
        expectation: "known",
      }),
      expect.objectContaining({
        entityType: "expense",
        expectation: "create",
      }),
    ]);
  });

  it("represents deletion as an explicit central tombstone", () => {
    const recurringExpense: RecurringExpense = {
      ...draft,
      id: "recurring-existing",
      createdAt: "2026-07-01T08:00:00.000Z",
      updatedAt: "2026-07-01T08:00:00.000Z",
    };
    const result = prepareCentralRecurringExpenseDelete({
      data: data({ recurringExpenses: [recurringExpense] }),
      recurringExpenseId: recurringExpense.id,
    });

    expect(result).toMatchObject({
      ok: true,
      transition: { value: recurringExpense.id },
      mutations: [
        {
          entityType: "recurring_expense",
          entityId: recurringExpense.id,
          expectation: "known",
          operationKind: "delete",
          payload: null,
        },
      ],
    });
  });
});
