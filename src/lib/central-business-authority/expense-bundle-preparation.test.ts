import { describe, expect, it } from "vitest";

import { EMPTY_DATA, type AppData, type Expense } from "@/lib/types";

import {
  prepareCentralFixedExpenseBundle,
  prepareCentralScannedExpenseBundle,
} from "./expense-bundle-preparation";

const now = "2026-07-30T10:00:00.000Z";
const expenseDraft = {
  date: "2026-07-30",
  supplierName: "Proveedor sintético",
  description: "Gasto compuesto",
  amount: 24.2,
  ivaPercent: 21,
  category: "Otros",
  paymentMethod: "Tarjeta",
  origin: "scan" as const,
};
const supplierDraft = {
  name: "Proveedor sintético",
  nif: "B00000000",
  category: "Otros",
};
const recurringDraft = {
  supplierName: supplierDraft.name,
  description: "Cuota sintética",
  amount: 24.2,
  ivaPercent: 21,
  category: "Otros",
  paymentMethod: "Tarjeta",
  frequency: "monthly" as const,
  dueTiming: { kind: "end_of_month" as const },
  duration: { kind: "indefinite" as const },
  startDate: "2026-07-30",
  enabled: true,
};

function data(overrides: Partial<AppData> = {}): AppData {
  return {
    ...EMPTY_DATA,
    expenses: [],
    suppliers: [],
    recurringExpenses: [],
    ...overrides,
  };
}

describe("central expense bundle preparation", () => {
  it("uses the exact scanned supplier and expense persisted locally", () => {
    const prepared = prepareCentralScannedExpenseBundle({
      data: data(),
      expense: expenseDraft,
      operationId: "scan-preparation-0001",
      now,
      supplier: supplierDraft,
    });

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.mutations).toHaveLength(2);
    expect(prepared.mutations[0]).toMatchObject({
      entityType: "supplier",
      entityId: prepared.transition.value.supplier?.id,
      expectation: "create",
      payload: prepared.transition.value.supplier,
    });
    expect(prepared.mutations[1]).toMatchObject({
      entityType: "expense",
      entityId: prepared.transition.value.expense.id,
      expectation: "create",
      payload: prepared.transition.value.expense,
    });
    expect(prepared.transition.value.expense.supplierId).toBe(
      prepared.transition.value.supplier?.id,
    );
  });

  it("requires the known version when a scanned save updates an expense", () => {
    const existing: Expense = {
      ...expenseDraft,
      id: "expense-existing-0001",
      createdAt: "2026-07-29T09:00:00.000Z",
    };
    const prepared = prepareCentralScannedExpenseBundle({
      data: data({ expenses: [existing] }),
      expense: { ...existing, description: "Gasto corregido" },
      operationId: "scan-update-0001",
      now,
    });

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.mutations).toEqual([
      expect.objectContaining({
        entityType: "expense",
        entityId: existing.id,
        expectation: "known",
        payload: prepared.transition.value.expense,
      }),
    ]);
  });

  it("uses one exact three-member bundle for a fixed expense", () => {
    const prepared = prepareCentralFixedExpenseBundle({
      data: data(),
      expense: { ...expenseDraft, businessKind: "fixed" },
      recurringExpense: recurringDraft,
      operationId: "fixed-preparation-0001",
      now,
      supplier: supplierDraft,
    });

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    const { value } = prepared.transition;
    expect(prepared.mutations).toEqual([
      expect.objectContaining({
        entityType: "supplier",
        entityId: value.supplier?.id,
        payload: value.supplier,
      }),
      expect.objectContaining({
        entityType: "expense",
        entityId: value.expense.id,
        payload: value.expense,
      }),
      expect.objectContaining({
        entityType: "recurring_expense",
        entityId: value.recurringExpense.id,
        payload: value.recurringExpense,
      }),
    ]);
    expect(value.expense.recurringExpenseId).toBe(value.recurringExpense.id);
    expect(value.expense.supplierId).toBe(value.supplier?.id);
  });

  it("includes every local occurrence generated from a past start date", () => {
    const prepared = prepareCentralFixedExpenseBundle({
      data: data(),
      expense: {
        ...expenseDraft,
        date: "2026-04-30",
        businessKind: "fixed",
      },
      recurringExpense: {
        ...recurringDraft,
        startDate: "2026-04-30",
      },
      operationId: "fixed-past-occurrences-0001",
      now,
    });

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    const centralExpenses = prepared.mutations.filter(
      (mutation) => mutation.entityType === "expense",
    );
    const localChangedExpenses = prepared.transition.data.expenses;
    expect(localChangedExpenses.length).toBeGreaterThan(1);
    expect(centralExpenses).toHaveLength(localChangedExpenses.length);
    expect(centralExpenses.map((mutation) => mutation.payload)).toEqual(
      localChangedExpenses,
    );
    expect(
      centralExpenses.every((mutation) => mutation.expectation === "create"),
    ).toBe(true);
  });

  it("fails closed when a generated fixed identity already collides", () => {
    const first = prepareCentralFixedExpenseBundle({
      data: data(),
      expense: { ...expenseDraft, businessKind: "fixed" },
      recurringExpense: recurringDraft,
      operationId: "fixed-collision-0001",
      now,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const collided = prepareCentralFixedExpenseBundle({
      data: {
        ...first.transition.data,
        recurringExpenses: first.transition.data.recurringExpenses.map(
          (entry) => ({ ...entry, amount: entry.amount + 1 }),
        ),
      },
      expense: { ...expenseDraft, businessKind: "fixed" },
      recurringExpense: recurringDraft,
      operationId: "fixed-collision-0001",
      now,
    });

    expect(collided).toEqual({
      ok: false,
      error: "No se pudo preparar de forma inequívoca el gasto fijo.",
    });
  });
});
