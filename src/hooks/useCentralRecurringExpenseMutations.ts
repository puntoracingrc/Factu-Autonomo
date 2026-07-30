"use client";

import { useCallback, useMemo } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  saveCentralExpenseBundleWithCanary,
  type CentralExpenseBundleCanaryDependencies,
  type CentralExpenseBundleResult,
} from "@/lib/central-business-authority/expense-bundle-canary";
import {
  prepareCentralRecurringExpenseChange,
  prepareCentralRecurringExpenseCreate,
  prepareCentralRecurringExpenseDelete,
  prepareCentralRecurringExpenseEnabled,
} from "@/lib/central-business-authority/recurring-expense-mutation-preparation";
import type {
  RecurringExpenseChangeApplyResult,
  RecurringExpenseDraft,
} from "@/lib/recurring-expenses";
import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import type { RecurringExpense } from "@/lib/types";

type AppliedRecurringExpenseChange = Extract<
  RecurringExpenseChangeApplyResult,
  { status: "applied" }
>;

function operationId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function useCentralRecurringExpenseMutations(): {
  createRecurringExpense: (
    item: RecurringExpenseDraft,
  ) => Promise<CentralExpenseBundleResult<RecurringExpense>>;
  setRecurringExpenseEnabled: (
    recurringExpenseId: string,
    enabled: boolean,
  ) => Promise<CentralExpenseBundleResult<RecurringExpense>>;
  applyRecurringExpenseChange: (
    recurringExpenseId: string,
    item: RecurringExpenseDraft,
    effectiveDate: string,
    approval: { precondition: string; referenceDate: string },
  ) => Promise<CentralExpenseBundleResult<AppliedRecurringExpenseChange>>;
  deleteRecurringExpense: (
    recurringExpenseId: string,
  ) => Promise<CentralExpenseBundleResult<string>>;
} {
  const {
    addRecurringExpense: addRecurringExpenseFallback,
    applyRecurringExpenseChange: applyRecurringExpenseChangeFallback,
    commitPreparedAppDataDurably,
    deleteRecurringExpense: deleteRecurringExpenseFallback,
    getCurrentData,
    setRecurringExpenseEnabled: setRecurringExpenseEnabledFallback,
    syncCentralBusinessEvents,
  } = useAppStore();
  const { user } = useCloudSync();
  const userId = user?.id;

  const syncEventsBeforeWrite = useMemo(
    () => (userId ? () => syncCentralBusinessEvents(userId) : undefined),
    [syncCentralBusinessEvents, userId],
  );

  const saveBundle = useCallback(
    <T>(
      id: string,
      fallback: () => AppDataDurabilityResult<T>,
      prepareLocal: CentralExpenseBundleCanaryDependencies<T>["prepareLocal"],
    ) =>
      saveCentralExpenseBundleWithCanary({
        userId,
        operationId: id,
        dependencies: {
          getCurrentData,
          syncEventsBeforeWrite,
          fallback,
          prepareLocal,
          commitLocal: (expected, transition) =>
            commitPreparedAppDataDurably(expected, transition),
        },
      }),
    [
      commitPreparedAppDataDurably,
      getCurrentData,
      syncEventsBeforeWrite,
      userId,
    ],
  );

  const createRecurringExpense = useCallback(
    (item: RecurringExpenseDraft) => {
      const id = operationId("RECURRING_CREATE");
      return saveBundle(
        id,
        () => addRecurringExpenseFallback(item, getCurrentData()),
        ({ data, now }) =>
          prepareCentralRecurringExpenseCreate({
            data,
            item,
            operationId: id,
            now,
          }),
      );
    },
    [addRecurringExpenseFallback, getCurrentData, saveBundle],
  );

  const setRecurringExpenseEnabled = useCallback(
    (recurringExpenseId: string, enabled: boolean) => {
      const id = operationId("RECURRING_ENABLED");
      return saveBundle(
        id,
        () =>
          setRecurringExpenseEnabledFallback(
            recurringExpenseId,
            enabled,
            getCurrentData(),
          ),
        ({ data, now }) =>
          prepareCentralRecurringExpenseEnabled({
            data,
            recurringExpenseId,
            enabled,
            operationId: id,
            now,
          }),
      );
    },
    [getCurrentData, saveBundle, setRecurringExpenseEnabledFallback],
  );

  const applyRecurringExpenseChange = useCallback(
    (
      recurringExpenseId: string,
      item: RecurringExpenseDraft,
      effectiveDate: string,
      approval: { precondition: string; referenceDate: string },
    ) => {
      const id = operationId("RECURRING_CHANGE");
      return saveBundle(
        id,
        () => {
          const result = applyRecurringExpenseChangeFallback(
            recurringExpenseId,
            item,
            effectiveDate,
            {
              ...approval,
              expected: getCurrentData(),
            },
          );
          if (result.status === "blocked") {
            return {
              status: "blocked",
              reason:
                result.reason === "manual_review" ||
                result.reason === "stale_preview"
                  ? ("transition_failed" as const)
                  : result.reason,
            };
          }
          return result;
        },
        ({ data, now }) =>
          prepareCentralRecurringExpenseChange({
            data,
            recurringExpenseId,
            item,
            effectiveDate,
            precondition: approval.precondition,
            referenceDate: approval.referenceDate,
            operationId: id,
            now,
          }),
      );
    },
    [applyRecurringExpenseChangeFallback, getCurrentData, saveBundle],
  );

  const deleteRecurringExpense = useCallback(
    (recurringExpenseId: string) => {
      const id = operationId("RECURRING_DELETE");
      return saveBundle(
        id,
        () =>
          deleteRecurringExpenseFallback(recurringExpenseId, getCurrentData()),
        ({ data }) =>
          prepareCentralRecurringExpenseDelete({
            data,
            recurringExpenseId,
          }),
      );
    },
    [deleteRecurringExpenseFallback, getCurrentData, saveBundle],
  );

  return {
    createRecurringExpense,
    setRecurringExpenseEnabled,
    applyRecurringExpenseChange,
    deleteRecurringExpense,
  };
}
