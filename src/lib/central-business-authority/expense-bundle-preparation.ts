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
import {
  planProviderSummaryExpenseImport,
  type ProviderInvoiceSummaryRow,
} from "@/lib/provider-summary-expenses";
import type { AppData, Expense, Supplier } from "@/lib/types";

import { CENTRAL_BUSINESS_ATOMIC_BATCH_MAX_OPERATIONS } from "./batch-contract";
import type { CentralExpenseBundlePreparation } from "./expense-bundle-canary";
import type { CentralBusinessJson } from "./mutation-command";

type DurableExpense = Omit<Expense, "id" | "createdAt"> | Expense;
const OPERATION_ID = /^[A-Za-z0-9_-]{1,160}$/u;

export interface ProviderSummaryExpenseBundleValue {
  supplier?: Supplier;
  expenses: Expense[];
  skippedExisting: number;
  skippedCompleted: number;
}

export interface ProviderSummaryExpenseBundleInput {
  data: AppData;
  rows: ProviderInvoiceSummaryRow[];
  operationId: string;
  now: string;
  providerName?: string;
  supplierId?: string;
  supplier?: Omit<Supplier, "id" | "createdAt">;
  fileName?: string;
}

function jsonValue(value: unknown): CentralBusinessJson {
  return JSON.parse(JSON.stringify(value)) as CentralBusinessJson;
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validIsoTimestamp(value: string): boolean {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function providerSummaryExpenseId(operationId: string, rowIndex: number) {
  return `provider-summary-expense-${operationId}-${rowIndex}`;
}

function providerSummarySupplierId(operationId: string) {
  return `provider-summary-supplier-${operationId}`;
}

export function prepareCentralProviderSummaryExpenseBundle(
  input: ProviderSummaryExpenseBundleInput,
): CentralExpenseBundlePreparation<ProviderSummaryExpenseBundleValue> {
  try {
    const operationId = input.operationId.trim();
    if (
      !OPERATION_ID.test(operationId) ||
      !validIsoTimestamp(input.now) ||
      input.rows.length < 1 ||
      (input.supplier && input.supplierId)
    ) {
      throw new Error("PROVIDER_SUMMARY_INVALID_OPERATION");
    }

    const supplier: Supplier | undefined = input.supplier
      ? {
          ...input.supplier,
          id: providerSummarySupplierId(operationId),
          createdAt: input.now,
        }
      : undefined;
    if (
      supplier &&
      input.data.suppliers.some((entry) => entry.id === supplier.id)
    ) {
      throw new Error("PROVIDER_SUMMARY_SUPPLIER_COLLISION");
    }

    const supplierId = supplier?.id ?? input.supplierId;
    if (
      input.supplierId &&
      !input.data.suppliers.some((entry) => entry.id === input.supplierId)
    ) {
      throw new Error("PROVIDER_SUMMARY_SUPPLIER_NOT_FOUND");
    }
    const providerName =
      supplier?.name.trim() || input.providerName?.trim() || undefined;
    const plan = planProviderSummaryExpenseImport(
      input.data.expenses,
      input.rows,
      {
        providerName,
        supplierId,
        summaryId: operationId,
        fileName: input.fileName,
        importedAt: input.now,
      },
    );
    if (plan.expenses.length === 0) {
      return {
        ok: false,
        error:
          "No quedan facturas nuevas que guardar desde este resumen de proveedor.",
      };
    }

    const expenseIds = new Set<string>();
    const expenses = plan.expenses.map((expense) => {
      const invoiceNumber = expense.purchaseDocument?.invoiceNumber;
      const rowIndex = input.rows.findIndex(
        (row) => row.invoiceNumber === invoiceNumber,
      );
      if (rowIndex < 0) {
        throw new Error("PROVIDER_SUMMARY_ROW_NOT_FOUND");
      }
      const stored: Expense = {
        ...expense,
        id: providerSummaryExpenseId(operationId, rowIndex),
        createdAt: input.now,
      };
      if (
        expenseIds.has(stored.id) ||
        input.data.expenses.some((entry) => entry.id === stored.id)
      ) {
        throw new Error("PROVIDER_SUMMARY_EXPENSE_COLLISION");
      }
      expenseIds.add(stored.id);
      return stored;
    });
    const mutationCount = expenses.length + (supplier ? 1 : 0);
    if (mutationCount > CENTRAL_BUSINESS_ATOMIC_BATCH_MAX_OPERATIONS) {
      return {
        ok: false,
        error: supplier
          ? "Este resumen puede guardar como máximo 99 facturas al crear también el proveedor."
          : "Este resumen puede guardar como máximo 100 facturas en una sola operación.",
      };
    }

    const transition = {
      data: {
        ...input.data,
        suppliers: supplier
          ? [...input.data.suppliers, supplier]
          : input.data.suppliers,
        expenses: [...input.data.expenses, ...expenses],
      },
      value: {
        supplier,
        expenses,
        skippedExisting: plan.skippedExisting,
        skippedCompleted: plan.skippedCompleted,
      },
    };
    return {
      ok: true,
      transition,
      mutations: [
        ...(supplier
          ? [
              {
                entityType: "supplier" as const,
                entityId: supplier.id,
                expectation: "create" as const,
                payload: jsonValue(supplier),
              },
            ]
          : []),
        ...expenses.map((expense) => ({
          entityType: "expense" as const,
          entityId: expense.id,
          expectation: "create" as const,
          payload: jsonValue(expense),
        })),
      ],
    };
  } catch {
    return {
      ok: false,
      error:
        "No se pudo preparar de forma inequívoca el resumen del proveedor.",
    };
  }
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
