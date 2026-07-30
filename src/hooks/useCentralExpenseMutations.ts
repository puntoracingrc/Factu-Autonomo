"use client";

import { useCallback, useMemo } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  createExpenseWithCentralCanary,
  type CentralExpenseCreateResult,
} from "@/lib/central-business-authority/expense-create-canary";
import {
  deleteExpenseWithCentralCanary,
  updateExpenseWithCentralCanary,
} from "@/lib/central-business-authority/expense-mutation-canary";
import {
  saveCentralExpenseBundleWithCanary,
  type CentralExpenseBundleResult,
} from "@/lib/central-business-authority/expense-bundle-canary";
import {
  prepareCentralFixedExpenseBundle,
  prepareCentralProviderSummaryExpenseBundle,
  prepareCentralScannedExpenseBundle,
  type ProviderSummaryExpenseBundleValue,
} from "@/lib/central-business-authority/expense-bundle-preparation";
import type { CentralBusinessEntityMutationResult } from "@/lib/central-business-authority/entity-mutation-canary";
import type { FixedExpenseBundleValue } from "@/lib/app-data-durability";
import type { ProviderInvoiceSummaryRow } from "@/lib/provider-summary-expenses";
import type { RecurringExpenseDraft } from "@/lib/recurring-expenses";
import type { ScannedExpenseDurableValue } from "@/lib/scanned-expense-durability";
import type { Expense, Supplier } from "@/lib/types";

type ExpenseDraft = Omit<Expense, "id" | "createdAt">;
type DurableExpense = ExpenseDraft | Expense;

interface DurableExpenseSaveOptions {
  expected: ReturnType<ReturnType<typeof useAppStore>["getCurrentData"]>;
  operationId: string;
  supplier?: Omit<Supplier, "id" | "createdAt">;
}

export interface ProviderSummaryExpenseSaveInput {
  operationId: string;
  rows: ProviderInvoiceSummaryRow[];
  providerName?: string;
  supplierId?: string;
  supplier?: Omit<Supplier, "id" | "createdAt">;
  fileName?: string;
}

export function useCentralExpenseMutations(): {
  createExpense: (expense: ExpenseDraft) => Promise<CentralExpenseCreateResult>;
  updateExpense: (
    expense: Expense,
  ) => Promise<CentralBusinessEntityMutationResult<Expense>>;
  deleteExpense: (
    expenseId: string,
  ) => Promise<CentralBusinessEntityMutationResult<string>>;
  saveScannedExpenseDurably: (
    expense: DurableExpense,
    options: DurableExpenseSaveOptions,
  ) => Promise<CentralExpenseBundleResult<ScannedExpenseDurableValue>>;
  saveFixedExpenseWithRecurringTemplate: (
    expense: DurableExpense,
    item: RecurringExpenseDraft,
    options: DurableExpenseSaveOptions,
  ) => Promise<CentralExpenseBundleResult<FixedExpenseBundleValue>>;
  saveProviderSummaryExpenses: (
    input: ProviderSummaryExpenseSaveInput,
  ) => Promise<CentralExpenseBundleResult<ProviderSummaryExpenseBundleValue>>;
} {
  const {
    addExpense,
    addExpenseDurably,
    commitPreparedAppDataDurably,
    deleteExpense: deleteExpenseFallback,
    deleteExpenseDurably,
    getCurrentData,
    saveFixedExpenseWithRecurringTemplate:
      saveFixedExpenseWithRecurringTemplateFallback,
    saveScannedExpenseDurably: saveScannedExpenseDurablyFallback,
    syncCentralBusinessEvents,
    updateExpense: updateExpenseFallback,
    updateExpenseDurably,
  } = useAppStore();
  const { user } = useCloudSync();
  const userId = user?.id;

  const syncEventsBeforeWrite = useMemo(
    () => (userId ? () => syncCentralBusinessEvents(userId) : undefined),
    [syncCentralBusinessEvents, userId],
  );

  const createExpense = useCallback(
    (expense: ExpenseDraft) =>
      createExpenseWithCentralCanary({
        userId,
        expense,
        dependencies: {
          getCurrentData,
          addExpenseFallback: addExpense,
          addExpenseDurably,
          syncEventsBeforeWrite,
        },
      }),
    [
      addExpense,
      addExpenseDurably,
      getCurrentData,
      syncEventsBeforeWrite,
      userId,
    ],
  );

  const mutationDependencies = useMemo(
    () => ({
      getCurrentData,
      updateExpenseFallback,
      deleteExpenseFallback,
      updateExpenseDurably,
      deleteExpenseDurably,
      syncEventsBeforeWrite,
    }),
    [
      deleteExpenseDurably,
      deleteExpenseFallback,
      getCurrentData,
      syncEventsBeforeWrite,
      updateExpenseDurably,
      updateExpenseFallback,
    ],
  );

  const updateExpense = useCallback(
    (expense: Expense) =>
      updateExpenseWithCentralCanary({
        userId,
        expense,
        dependencies: mutationDependencies,
      }),
    [mutationDependencies, userId],
  );

  const deleteExpense = useCallback(
    (expenseId: string) =>
      deleteExpenseWithCentralCanary({
        userId,
        expenseId,
        dependencies: mutationDependencies,
      }),
    [mutationDependencies, userId],
  );

  const saveScannedExpenseDurably = useCallback(
    (expense: DurableExpense, options: DurableExpenseSaveOptions) =>
      saveCentralExpenseBundleWithCanary({
        userId,
        operationId: options.operationId,
        dependencies: {
          getCurrentData,
          syncEventsBeforeWrite,
          fallback: () => saveScannedExpenseDurablyFallback(expense, options),
          prepareLocal: ({ data, now }) =>
            prepareCentralScannedExpenseBundle({
              data,
              expense,
              operationId: options.operationId,
              now,
              supplier: options.supplier,
            }),
          commitLocal: (expected, _transition, now) =>
            saveScannedExpenseDurablyFallback(expense, {
              ...options,
              expected,
              now,
            }),
        },
      }),
    [
      getCurrentData,
      saveScannedExpenseDurablyFallback,
      syncEventsBeforeWrite,
      userId,
    ],
  );

  const saveFixedExpenseWithRecurringTemplate = useCallback(
    (
      expense: DurableExpense,
      item: RecurringExpenseDraft,
      options: DurableExpenseSaveOptions,
    ) =>
      saveCentralExpenseBundleWithCanary({
        userId,
        operationId: options.operationId,
        dependencies: {
          getCurrentData,
          syncEventsBeforeWrite,
          fallback: () =>
            saveFixedExpenseWithRecurringTemplateFallback(
              expense,
              item,
              options,
            ),
          prepareLocal: ({ data, now }) =>
            prepareCentralFixedExpenseBundle({
              data,
              expense,
              recurringExpense: item,
              operationId: options.operationId,
              now,
              supplier: options.supplier,
            }),
          commitLocal: (expected, _transition, now) =>
            saveFixedExpenseWithRecurringTemplateFallback(expense, item, {
              ...options,
              expected,
              now,
              referenceDate: now.slice(0, 10),
            }),
        },
      }),
    [
      getCurrentData,
      saveFixedExpenseWithRecurringTemplateFallback,
      syncEventsBeforeWrite,
      userId,
    ],
  );

  const saveProviderSummaryExpenses = useCallback(
    (input: ProviderSummaryExpenseSaveInput) => {
      const prepare = ({
        data,
        now,
      }: {
        data: ReturnType<typeof getCurrentData>;
        now: string;
      }) =>
        prepareCentralProviderSummaryExpenseBundle({
          data,
          rows: input.rows,
          operationId: input.operationId,
          now,
          providerName: input.providerName,
          supplierId: input.supplierId,
          supplier: input.supplier,
          fileName: input.fileName,
        });

      return saveCentralExpenseBundleWithCanary({
        userId,
        operationId: input.operationId,
        dependencies: {
          getCurrentData,
          syncEventsBeforeWrite,
          fallback: () => {
            const expected = getCurrentData();
            const prepared = prepare({
              data: expected,
              now: new Date().toISOString(),
            });
            return prepared.ok
              ? commitPreparedAppDataDurably(expected, prepared.transition)
              : { status: "blocked", reason: "transition_failed" as const };
          },
          prepareLocal: prepare,
          commitLocal: (expected, transition) =>
            commitPreparedAppDataDurably(expected, transition),
        },
      });
    },
    [
      commitPreparedAppDataDurably,
      getCurrentData,
      syncEventsBeforeWrite,
      userId,
    ],
  );

  return {
    createExpense,
    updateExpense,
    deleteExpense,
    saveScannedExpenseDurably,
    saveFixedExpenseWithRecurringTemplate,
    saveProviderSummaryExpenses,
  };
}
