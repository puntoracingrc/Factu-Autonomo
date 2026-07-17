import type { AppData, Expense, Supplier } from "./types";

const OPERATION_ID = /^[A-Za-z0-9_-]{1,160}$/u;

export interface ScannedExpenseDurableValue {
  expense: Expense;
  supplier?: Supplier;
}

export function buildScannedExpenseDurableTransition(input: {
  data: AppData;
  expense: Omit<Expense, "id" | "createdAt"> | Expense;
  operationId: string;
  now: string;
  supplier?: Omit<Supplier, "id" | "createdAt">;
}): { data: AppData; value: ScannedExpenseDurableValue } {
  const operationId = input.operationId.trim();
  if (!OPERATION_ID.test(operationId) || !validIsoTimestamp(input.now)) {
    throw new Error("SCANNED_EXPENSE_INVALID_OPERATION");
  }

  const storedExpense = isStoredExpense(input.expense) ? input.expense : null;
  const updating = storedExpense !== null;
  const expenseId = storedExpense
    ? storedExpense.id
    : `scanned-expense-${operationId}`;
  const supplierId = input.supplier
    ? `scanned-supplier-${operationId}`
    : input.expense.supplierId;
  const existingExpenses = input.data.expenses.filter(
    (expense) => expense.id === expenseId,
  );
  if (existingExpenses.length > 1) {
    throw new Error("SCANNED_EXPENSE_IDENTIFIER_COLLISION");
  }

  const createdSupplier: Supplier | undefined = input.supplier
    ? {
        ...input.supplier,
        id: supplierId!,
        createdAt: input.now,
      }
    : undefined;
  const supplierCollisions = createdSupplier
    ? input.data.suppliers.filter((supplier) => supplier.id === createdSupplier.id)
    : [];
  if (supplierCollisions.length > 1) {
    throw new Error("SCANNED_EXPENSE_SUPPLIER_COLLISION");
  }

  const expense: Expense = storedExpense
    ? {
        ...storedExpense,
        supplierId,
      }
    : {
        ...input.expense,
        supplierId,
        id: expenseId,
        createdAt: input.now,
      };

  const existingExpense = existingExpenses[0];
  if (existingExpense && !updating) {
    if (!sameProvenance(existingExpense, expense)) {
      throw new Error("SCANNED_EXPENSE_IDENTIFIER_COLLISION");
    }
    return {
      data: input.data,
      value: {
        expense: existingExpense,
        supplier: supplierCollisions[0],
      },
    };
  }
  if (updating && !existingExpense) {
    throw new Error("SCANNED_EXPENSE_NOT_FOUND");
  }
  if (
    createdSupplier &&
    supplierCollisions[0] &&
    !sameSupplier(supplierCollisions[0], createdSupplier)
  ) {
    throw new Error("SCANNED_EXPENSE_SUPPLIER_COLLISION");
  }

  const suppliers =
    createdSupplier && supplierCollisions.length === 0
      ? [...input.data.suppliers, createdSupplier]
      : input.data.suppliers;
  const expenses = updating
    ? input.data.expenses.map((entry) =>
        entry.id === expense.id ? expense : entry,
      )
    : [...input.data.expenses, expense];
  return {
    data: { ...input.data, suppliers, expenses },
    value: { expense, supplier: createdSupplier ?? supplierCollisions[0] },
  };
}

function sameProvenance(left: Expense, right: Expense): boolean {
  if (
    left.sourceInboxItemId &&
    left.sourceInboxItemId === right.sourceInboxItemId
  ) {
    return true;
  }
  return Boolean(
    left.originalArchive?.sourceSha256 &&
      left.originalArchive.sourceSha256 ===
        right.originalArchive?.sourceSha256,
  );
}

function isStoredExpense(
  expense: Omit<Expense, "id" | "createdAt"> | Expense,
): expense is Expense {
  return "id" in expense && "createdAt" in expense;
}

function sameSupplier(left: Supplier, right: Supplier): boolean {
  return (
    left.name === right.name &&
    left.nif === right.nif &&
    left.category === right.category
  );
}

function validIsoTimestamp(value: string): boolean {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}
