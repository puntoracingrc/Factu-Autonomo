import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearExpenseCostAllocationForWork,
  clearExpenseCostAllocationsForTests,
  getExpenseCostAllocationsForWork,
  setExpenseCostAllocationForWork,
} from "./local-cost-allocations";

function mockLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  });
}

describe("rentabilidad real local expense cost allocations", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    clearExpenseCostAllocationsForTests();
    vi.unstubAllGlobals();
  });

  it("guarda importe aplicado por gasto y documento", () => {
    expect(
      setExpenseCostAllocationForWork("invoice_1", "expense_1", 75.555, 200),
    ).toEqual({ expense_1: 75.56 });
    expect(getExpenseCostAllocationsForWork("invoice_1")).toEqual({
      expense_1: 75.56,
    });
  });

  it("aplicar todo elimina el ajuste local", () => {
    setExpenseCostAllocationForWork("invoice_1", "expense_1", 75, 200);

    expect(
      setExpenseCostAllocationForWork("invoice_1", "expense_1", 200, 200),
    ).toEqual({});
    expect(getExpenseCostAllocationsForWork("invoice_1")).toEqual({});
  });

  it("limita el importe al total del gasto", () => {
    expect(
      setExpenseCostAllocationForWork("invoice_1", "expense_1", 300, 200),
    ).toEqual({});
    expect(
      setExpenseCostAllocationForWork("invoice_1", "expense_1", -10, 200),
    ).toEqual({ expense_1: 0 });
  });

  it("limpia un ajuste concreto", () => {
    setExpenseCostAllocationForWork("invoice_1", "expense_1", 80, 200);
    setExpenseCostAllocationForWork("invoice_1", "expense_2", 60, 200);

    expect(clearExpenseCostAllocationForWork("invoice_1", "expense_1")).toEqual({
      expense_2: 60,
    });
  });

  it("tolera SSR sin localStorage", () => {
    vi.unstubAllGlobals();

    expect(getExpenseCostAllocationsForWork("invoice_1")).toEqual({});
  });
});
