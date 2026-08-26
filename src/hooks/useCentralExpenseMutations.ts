"use client";

import { useCallback, useMemo } from "react";

import { useAppStore } from "@/context/AppStore";
import {
  useBilling,
  type BillingQuotaReservationHandle,
} from "@/context/BillingContext";
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
  providerSummarySupplierId,
  type ProviderSummaryExpenseBundleValue,
} from "@/lib/central-business-authority/expense-bundle-preparation";
import type { CentralBusinessEntityMutationResult } from "@/lib/central-business-authority/entity-mutation-canary";
import {
  fixedExpenseBundleIds,
  type FixedExpenseBundleValue,
} from "@/lib/app-data-durability";
import type { ProviderInvoiceSummaryRow } from "@/lib/provider-summary-expenses";
import type { RecurringExpenseDraft } from "@/lib/recurring-expenses";
import {
  scannedExpenseBundleIds,
  type ScannedExpenseDurableValue,
} from "@/lib/scanned-expense-durability";
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
  const { reserveQuota, commitQuota, releaseQuota } = useBilling();
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
      const baseline = getCurrentData();
      const existingIds = new Set(baseline.expenses.map((entry) => entry.id));
      const expenseId = crypto.randomUUID();
      let reservation: BillingQuotaReservationHandle | null = null;
      if (expense.origin === "manual") {
        const quota = await reserveQuota({
          metric: "manual_expenses",
          operationKey: `manual-expense:${expenseId}`,
          subjectId: expenseId,
        });
        if (!quota.allowed) {
          return { ok: false as const, error: quota.block.message };
        }
        reservation = { claimId: quota.claimId, metric: quota.metric };
      }
      const result = await createExpenseWithCentralCanary({
        userId,
        expense,
        dependencies: {
          getCurrentData,
          addExpenseFallback: addExpense,
          addExpenseDurably,
          createId: () => expenseId,
          syncEventsBeforeWrite,
        },
      });
      if (!result.ok) {
        if (reservation) await releaseQuota(reservation);
        return result;
      }
      if (reservation) {
        const created =
          result.expense ??
          getCurrentData().expenses.find((entry) => !existingIds.has(entry.id));
        if (created) await commitQuota(reservation, created.id);
        else await releaseQuota(reservation);
      }
      return result;
    },
    [
      addExpense,
      addExpenseDurably,
      commitQuota,
      getCurrentData,
      planGate.mode,
      releaseQuota,
      reserveQuota,
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
      const ids = scannedExpenseBundleIds(options.operationId);
      const reservations: Array<{
        handle: BillingQuotaReservationHandle;
        kind: "expense" | "supplier";
      }> = [];
      if (!("id" in expense) && expense.origin === "manual") {
        const quota = await reserveQuota({
          metric: "manual_expenses",
          operationKey: `manual-expense:${options.operationId}`,
          subjectId: ids.expenseId,
        });
        if (!quota.allowed) {
          return { ok: false as const, error: quota.block.message };
        }
        reservations.push({
          handle: { claimId: quota.claimId, metric: quota.metric },
          kind: "expense",
        });
      }
      if (options.supplier) {
        const quota = await reserveQuota({
          metric: "suppliers",
          operationKey: `supplier:${options.operationId}`,
          subjectId: ids.supplierId,
          source: "automatic_supplier",
        });
        if (!quota.allowed) {
          await Promise.all(
            reservations.map(({ handle }) => releaseQuota(handle)),
          );
          return { ok: false as const, error: quota.block.message };
        }
        reservations.push({
          handle: { claimId: quota.claimId, metric: quota.metric },
          kind: "supplier",
        });
      }
      const result = await saveCentralExpenseBundleWithCanary({
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
      if (!result.ok) {
        await Promise.all(
          reservations.map(({ handle }) => releaseQuota(handle)),
        );
        return result;
      }
      for (const reservation of reservations) {
        const subject =
          reservation.kind === "expense"
            ? result.local.value.expense
            : result.local.value.supplier;
        if (subject) await commitQuota(reservation.handle, subject.id);
        else await releaseQuota(reservation.handle);
      }
      return result;
    },
    [
      commitQuota,
      getCurrentData,
      planGate.mode,
      releaseQuota,
      reserveQuota,
      saveScannedExpenseDurablyFallback,
      syncEventsBeforeWrite,
      userId,
    ],
  );

  const saveFixedExpenseWithRecurringTemplate = useCallback(
    async (
      expense: DurableExpense,
      item: RecurringExpenseDraft,
      options: DurableExpenseSaveOptions,
    ) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      const reservations: Array<{
        handle: BillingQuotaReservationHandle;
        kind: "expense" | "supplier";
      }> = [];
      const ids = fixedExpenseBundleIds(options.operationId);
      if (!("id" in expense) && expense.origin === "manual") {
        const quota = await reserveQuota({
          metric: "manual_expenses",
          operationKey: `manual-expense:${options.operationId}`,
          subjectId: ids.expenseId,
        });
        if (!quota.allowed) {
          return { ok: false as const, error: quota.block.message };
        }
        reservations.push({
          handle: { claimId: quota.claimId, metric: quota.metric },
          kind: "expense",
        });
      }
      if (options.supplier) {
        const quota = await reserveQuota({
          metric: "suppliers",
          operationKey: `supplier:${options.operationId}`,
          subjectId: ids.supplierId,
          source: "automatic_supplier",
        });
        if (!quota.allowed) {
          await Promise.all(
            reservations.map(({ handle }) => releaseQuota(handle)),
          );
          return { ok: false as const, error: quota.block.message };
        }
        reservations.push({
          handle: { claimId: quota.claimId, metric: quota.metric },
          kind: "supplier",
        });
      }
      const result = await saveCentralExpenseBundleWithCanary({
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
      if (!result.ok) {
        await Promise.all(
          reservations.map(({ handle }) => releaseQuota(handle)),
        );
        return result;
      }
      for (const reservation of reservations) {
        const subject =
          reservation.kind === "expense"
            ? result.local.value.expense
            : result.local.value.supplier;
        if (subject) await commitQuota(reservation.handle, subject.id);
        else await releaseQuota(reservation.handle);
      }
      return result;
    },
    [
      commitQuota,
      getCurrentData,
      planGate.mode,
      releaseQuota,
      reserveQuota,
      saveFixedExpenseWithRecurringTemplateFallback,
      syncEventsBeforeWrite,
      userId,
    ],
  );

  const saveProviderSummaryExpenses = useCallback(
    async (input: ProviderSummaryExpenseSaveInput) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      let supplierReservation: BillingQuotaReservationHandle | null = null;
      if (input.supplier) {
        const quota = await reserveQuota({
          metric: "suppliers",
          operationKey: `supplier:${input.operationId}`,
          subjectId: providerSummarySupplierId(input.operationId),
          source: "automatic_supplier",
        });
        if (!quota.allowed) {
          return { ok: false as const, error: quota.block.message };
        }
        supplierReservation = { claimId: quota.claimId, metric: quota.metric };
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

      const result = await saveCentralExpenseBundleWithCanary({
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
      if (!result.ok) {
        if (supplierReservation) await releaseQuota(supplierReservation);
        return result;
      }
      if (supplierReservation) {
        if (result.local.value.supplier) {
          await commitQuota(supplierReservation, result.local.value.supplier.id);
        } else {
          await releaseQuota(supplierReservation);
        }
      }
      return result;
    },
    [
      commitQuota,
      commitPreparedAppDataDurably,
      getCurrentData,
      planGate.mode,
      releaseQuota,
      reserveQuota,
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
