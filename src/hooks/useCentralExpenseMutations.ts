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
import type { CentralBusinessEntityMutationResult } from "@/lib/central-business-authority/entity-mutation-canary";
import type { Expense } from "@/lib/types";

type ExpenseDraft = Omit<Expense, "id" | "createdAt">;

export function useCentralExpenseMutations(): {
  createExpense: (
    expense: ExpenseDraft,
  ) => Promise<CentralExpenseCreateResult>;
  updateExpense: (
    expense: Expense,
  ) => Promise<CentralBusinessEntityMutationResult<Expense>>;
  deleteExpense: (
    expenseId: string,
  ) => Promise<CentralBusinessEntityMutationResult<string>>;
} {
  const {
    addExpense,
    addExpenseDurably,
    deleteExpense: deleteExpenseFallback,
    deleteExpenseDurably,
    getCurrentData,
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

  return { createExpense, updateExpense, deleteExpense };
}
