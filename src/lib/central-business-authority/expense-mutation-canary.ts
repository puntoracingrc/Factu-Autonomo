"use client";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import type { AppData, Expense } from "@/lib/types";

import type { CentralBusinessQueueStorage } from "./durable-queue";
import {
  mutateCentralBusinessEntityWithCanary,
  type CentralBusinessEntityMutationResult,
} from "./entity-mutation-canary";
import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";
import {
  isCentralExpenseCanaryEnabledForUser,
  type CentralExpenseProfileCanaryEnvironment,
} from "./expense-profile-canary";
import type { CentralBusinessBrowserMutationResult } from "./mutation-client";
import type { CentralBusinessJson } from "./mutation-command";
import type { CentralBusinessAuthorityStatusResult } from "./status-client";

export const CENTRAL_EXPENSE_MUTATION_CANARY =
  "CENTRAL_EXPENSE_MUTATION_CANARY_V1";

export interface CentralExpenseMutationCanaryDependencies {
  getCurrentData(): AppData;
  updateExpenseFallback(expense: Expense): void;
  deleteExpenseFallback(id: string): void;
  updateExpenseDurably(
    expense: Expense,
    expected: AppData,
  ): AppDataDurabilityResult<Expense>;
  deleteExpenseDurably(
    id: string,
    identity: { excludedAt: string },
    expected: AppData,
  ): AppDataDurabilityResult<string>;
  syncEventsBeforeWrite?: () => Promise<CentralBusinessEventsAppDataSyncResult>;
  fetchStatus?: () => Promise<CentralBusinessAuthorityStatusResult>;
  mutate?: (
    input: Parameters<
      typeof import("./mutation-client").mutateCentralBusinessFromBrowser
    >[0],
  ) => Promise<CentralBusinessBrowserMutationResult>;
  storage?: CentralBusinessQueueStorage;
  createId?: () => string;
  now?: () => string;
  statusTimeoutMs?: number;
  environment?: CentralExpenseProfileCanaryEnvironment;
}

function jsonExpense(expense: Expense): CentralBusinessJson {
  return JSON.parse(JSON.stringify(expense)) as CentralBusinessJson;
}

function expenseById(data: AppData, id: string): Expense | null {
  const matches = data.expenses.filter((expense) => expense.id === id);
  return matches.length === 1 ? matches[0] : null;
}

export async function updateExpenseWithCentralCanary(input: {
  userId: string | null | undefined;
  expense: Expense;
  dependencies: CentralExpenseMutationCanaryDependencies;
}): Promise<CentralBusinessEntityMutationResult<Expense>> {
  const { dependencies } = input;
  return mutateCentralBusinessEntityWithCanary({
    enabled: isCentralExpenseCanaryEnabledForUser(
      input.userId,
      dependencies.environment,
    ),
    userId: input.userId,
    entityType: "expense",
    entityId: input.expense.id,
    operationKind: "upsert",
    operationIdPrefix: "CENTRAL_EXPENSE_UPDATE",
    entityLabel: "este gasto",
    dependencies: {
      ...dependencies,
      fallback: () => {
        dependencies.updateExpenseFallback(input.expense);
        return {
          ok: true,
          value: input.expense,
          delivery: "local",
        };
      },
      prepareLocal: ({ data }) => {
        if (!expenseById(data, input.expense.id)) {
          return { ok: false, error: "El gasto ya no existe." };
        }
        return {
          ok: true,
          payload: jsonExpense(input.expense),
          transition: {
            data: {
              ...data,
              expenses: data.expenses.map((expense) =>
                expense.id === input.expense.id ? input.expense : expense,
              ),
            },
            value: input.expense,
          },
        };
      },
      commitLocal: (expected, transition) =>
        dependencies.updateExpenseDurably(transition.value, expected),
    },
  });
}

export async function deleteExpenseWithCentralCanary(input: {
  userId: string | null | undefined;
  expenseId: string;
  dependencies: CentralExpenseMutationCanaryDependencies;
}): Promise<CentralBusinessEntityMutationResult<string>> {
  const { dependencies } = input;
  return mutateCentralBusinessEntityWithCanary({
    enabled: isCentralExpenseCanaryEnabledForUser(
      input.userId,
      dependencies.environment,
    ),
    userId: input.userId,
    entityType: "expense",
    entityId: input.expenseId,
    operationKind: "delete",
    operationIdPrefix: "CENTRAL_EXPENSE_DELETE",
    entityLabel: "este gasto",
    dependencies: {
      ...dependencies,
      fallback: () => {
        dependencies.deleteExpenseFallback(input.expenseId);
        return {
          ok: true,
          value: input.expenseId,
          delivery: "local",
        };
      },
      prepareLocal: ({ data }) => {
        const current = expenseById(data, input.expenseId);
        if (!current) {
          return { ok: false, error: "El gasto ya no existe." };
        }
        if (current.recurringExpenseId) {
          return {
            ok: false,
            error:
              "Este gasto pertenece a un gasto fijo. Su retirada central requiere confirmar juntos el gasto y su ocurrencia.",
          };
        }
        return {
          ok: true,
          payload: null,
          transition: {
            data: {
              ...data,
              expenses: data.expenses.filter(
                (expense) => expense.id !== input.expenseId,
              ),
            },
            value: input.expenseId,
          },
        };
      },
      commitLocal: (expected, _transition, now) =>
        dependencies.deleteExpenseDurably(
          input.expenseId,
          { excludedAt: now },
          expected,
        ),
    },
  });
}
