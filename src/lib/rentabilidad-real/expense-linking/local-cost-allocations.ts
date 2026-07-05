import { roundMoney } from "@/lib/calculations";

const COST_ALLOCATIONS_STORAGE_KEY =
  "fa_rentabilidad_real_work_expense_cost_allocations";

interface RentabilidadRealLocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type ExpenseCostAllocationsByExpenseId = Record<string, number>;
type ExpenseCostAllocationsByWork = Record<
  string,
  ExpenseCostAllocationsByExpenseId
>;

function getLocalStorage(
  storage?: RentabilidadRealLocalStorageLike,
): RentabilidadRealLocalStorageLike | undefined {
  if (storage) return storage;
  if (typeof localStorage === "undefined") return undefined;
  return localStorage;
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return roundMoney(value);
}

function normalizeAllocations(value: unknown): ExpenseCostAllocationsByWork {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const normalized: ExpenseCostAllocationsByWork = {};
  for (const [workDocumentId, allocations] of Object.entries(value)) {
    if (!workDocumentId || !allocations || typeof allocations !== "object") {
      continue;
    }

    const normalizedWorkAllocations: ExpenseCostAllocationsByExpenseId = {};
    for (const [expenseId, amount] of Object.entries(allocations)) {
      if (!expenseId) continue;
      const normalizedAmount = normalizeAmount(amount);
      if (normalizedAmount === null) continue;
      normalizedWorkAllocations[expenseId] = normalizedAmount;
    }

    if (Object.keys(normalizedWorkAllocations).length > 0) {
      normalized[workDocumentId] = normalizedWorkAllocations;
    }
  }

  return normalized;
}

function readAllocations(
  storage?: RentabilidadRealLocalStorageLike,
): ExpenseCostAllocationsByWork {
  const targetStorage = getLocalStorage(storage);
  if (!targetStorage) return {};

  try {
    const raw = targetStorage.getItem(COST_ALLOCATIONS_STORAGE_KEY);
    return normalizeAllocations(raw ? JSON.parse(raw) : null);
  } catch {
    return {};
  }
}

function writeAllocations(
  value: ExpenseCostAllocationsByWork,
  storage?: RentabilidadRealLocalStorageLike,
): void {
  const targetStorage = getLocalStorage(storage);
  if (!targetStorage) return;

  if (Object.keys(value).length === 0) {
    targetStorage.removeItem(COST_ALLOCATIONS_STORAGE_KEY);
    return;
  }

  targetStorage.setItem(COST_ALLOCATIONS_STORAGE_KEY, JSON.stringify(value));
}

export function getExpenseCostAllocationsForWork(
  workDocumentId: string | undefined,
  storage?: RentabilidadRealLocalStorageLike,
): ExpenseCostAllocationsByExpenseId {
  if (!workDocumentId) return {};
  return readAllocations(storage)[workDocumentId] ?? {};
}

export function setExpenseCostAllocationForWork(
  workDocumentId: string | undefined,
  expenseId: string,
  amount: number,
  originalAmount: number,
  storage?: RentabilidadRealLocalStorageLike,
): ExpenseCostAllocationsByExpenseId {
  if (!workDocumentId || !expenseId) return {};

  const allocations = readAllocations(storage);
  const workAllocations = { ...(allocations[workDocumentId] ?? {}) };
  const maxAmount = Math.max(roundMoney(originalAmount), 0);
  const normalizedAmount = Math.min(
    Math.max(roundMoney(Number.isFinite(amount) ? amount : maxAmount), 0),
    maxAmount,
  );

  if (normalizedAmount >= maxAmount) {
    delete workAllocations[expenseId];
  } else {
    workAllocations[expenseId] = normalizedAmount;
  }

  if (Object.keys(workAllocations).length > 0) {
    allocations[workDocumentId] = workAllocations;
  } else {
    delete allocations[workDocumentId];
  }

  writeAllocations(allocations, storage);
  return allocations[workDocumentId] ?? {};
}

export function clearExpenseCostAllocationForWork(
  workDocumentId: string | undefined,
  expenseId: string,
  storage?: RentabilidadRealLocalStorageLike,
): ExpenseCostAllocationsByExpenseId {
  if (!workDocumentId || !expenseId) return {};

  const allocations = readAllocations(storage);
  const workAllocations = { ...(allocations[workDocumentId] ?? {}) };
  delete workAllocations[expenseId];

  if (Object.keys(workAllocations).length > 0) {
    allocations[workDocumentId] = workAllocations;
  } else {
    delete allocations[workDocumentId];
  }

  writeAllocations(allocations, storage);
  return allocations[workDocumentId] ?? {};
}

export function clearExpenseCostAllocationsForTests(
  storage?: RentabilidadRealLocalStorageLike,
): void {
  const targetStorage = getLocalStorage(storage);
  targetStorage?.removeItem(COST_ALLOCATIONS_STORAGE_KEY);
}
