"use client";

import { useCallback, useMemo } from "react";

import { useAppStore } from "@/context/AppStore";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
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
  const planGate = useCentralAuthorityPlanGate();
  const userId = planGate.centralUserId;

  const syncEventsBeforeWrite = useMemo(
    () => (userId ? () => syncCentralBusinessEvents(userId) : undefined),
    [syncCentralBusinessEvents, userId],
  );

  const createExpense = useCallback(
    async (expense: ExpenseDraft) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      return createExpenseWithCentralCanary({
        userId,
        expense,
        dependencies: {
          getCurrentData,
          addExpenseFallback: addExpense,
          addExpenseDurably,
          syncEventsBeforeWrite,
        },
      });
    },
    [
      addExpense,
      addExpenseDurably,
      getCurrentData,
      planGate.mode,
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
    async (expense: Expense) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      return updateExpenseWithCentralCanary({
        userId,
        expense,
        dependencies: mutationDependencies,
      });
    },
    [mutationDependencies, planGate.mode, userId],
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      return deleteExpenseWithCentralCanary({
        userId,
        expenseId,
        dependencies: mutationDependencies,
      });
    },
    [mutationDependencies, planGate.mode, userId],
  );

  const saveScannedExpenseDurably = useCallback(
    async (expense: DurableExpense, options: DurableExpenseSaveOptions) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      return saveCentralExpenseBundleWithCanary({
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
      });
    },
    [
      getCurrentData,
      planGate.mode,
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
    ) => {
      if (planGate.mode === "loading") {
        return Promise.resolve(centralAuthorityPlanLoadingFailure());
      }
      return saveCentralExpenseBundleWithCanary({
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
      });
    },
    [
      getCurrentData,
      planGate.mode,
      saveFixedExpenseWithRecurringTemplateFallback,
      syncEventsBeforeWrite,
      userId,
    ],
  );

  const saveProviderSummaryExpenses = useCallback(
    (input: ProviderSummaryExpenseSaveInput) => {
      if (planGate.mode === "loading") {
        return Promise.resolve(centralAuthorityPlanLoadingFailure());
      }
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
      planGate.mode,
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
