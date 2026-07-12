import { describe, expect, it } from "vitest";
import {
  expenseAllocatedAmountForWorkIds,
  removeExpenseWorkAllocations,
  upsertExpenseWorkAllocation,
} from "./expense-work-allocations";
import type { Expense } from "./types";

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense_1",
    date: "2026-07-11",
    supplierName: "Proveedor",
    description: "Material",
    amount: 100,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    createdAt: "2026-07-11T10:00:00.000Z",
    ...overrides,
  };
}

describe("expense work allocations", () => {
  it("reparte un gasto entre trabajos sin superar su coste", () => {
    const first = upsertExpenseWorkAllocation(expense(), {
      workDocumentId: "doc_1",
      amount: 60,
      fullAmount: 100,
      includedLineIds: ["line_1"],
      now: "2026-07-11T11:00:00.000Z",
    });
    const second = upsertExpenseWorkAllocation(first, {
      workDocumentId: "doc_2",
      amount: 80,
      fullAmount: 100,
      includedLineIds: ["line_2"],
      now: "2026-07-11T12:00:00.000Z",
    });

    expect(expenseAllocatedAmountForWorkIds(second, ["doc_1"], 100)).toBe(60);
    expect(expenseAllocatedAmountForWorkIds(second, ["doc_2"], 100)).toBe(40);
  });

  it("conserva el signo de un abono repartido", () => {
    const allocated = upsertExpenseWorkAllocation(expense({ amount: -100 }), {
      workDocumentId: "doc_1",
      amount: -35,
      fullAmount: -100,
      now: "2026-07-11T11:00:00.000Z",
    });

    expect(expenseAllocatedAmountForWorkIds(allocated, ["doc_1"], -100)).toBe(
      -35,
    );
    expect(allocated.workAllocations?.[0]?.fullAmountAtAllocation).toBe(-100);
  });

  it("sella solo la asignación creada o actualizada con el canon firmado usado", () => {
    const existing = expense({
      workDocumentId: "doc_1",
      workAllocations: [
        {
          workDocumentId: "doc_1",
          amount: 60,
          includedLineIds: ["line_1"],
          allocatedAt: "2026-07-11T09:00:00.000Z",
        },
      ],
    });
    const result = upsertExpenseWorkAllocation(existing, {
      workDocumentId: "doc_2",
      amount: 40,
      fullAmount: 126.2,
      includedLineIds: ["line_2"],
      now: "2026-07-11T11:00:00.000Z",
    });

    expect(result.workAllocations?.[0]?.fullAmountAtAllocation).toBeUndefined();
    expect(result.workAllocations?.[1]?.fullAmountAtAllocation).toBe(126.2);
  });

  it("migra un vínculo antiguo al añadir un segundo reparto", () => {
    const legacy = expense({ workDocumentId: "doc_1" });
    const result = upsertExpenseWorkAllocation(legacy, {
      workDocumentId: "doc_2",
      amount: 20,
      fullAmount: 100,
      now: "2026-07-11T11:00:00.000Z",
    });

    expect(result.workAllocations).toEqual([
      expect.objectContaining({ workDocumentId: "doc_1", amount: 100 }),
    ]);
    expect(removeExpenseWorkAllocations(result, ["doc_1"]).workDocumentId).toBe(
      undefined,
    );
  });
});
