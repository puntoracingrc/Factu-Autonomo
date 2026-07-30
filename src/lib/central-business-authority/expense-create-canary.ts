"use client";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import type { AppData, Expense } from "@/lib/types";

import {
  discardCentralBusinessOperation,
  drainCentralBusinessDurableQueue,
  enqueueCentralBusinessOperation,
  type CentralBusinessQueueStorage,
  withCentralBusinessQueueLock,
} from "./durable-queue";
import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";
import {
  isCentralExpenseCanaryEnabledForUser,
  type CentralExpenseProfileCanaryEnvironment,
} from "./expense-profile-canary";
import {
  mutateCentralBusinessFromBrowser,
  type CentralBusinessBrowserMutationResult,
} from "./mutation-client";
import type { CentralBusinessJson } from "./mutation-command";
import {
  fetchCentralBusinessAuthorityStatusFromBrowser,
  type CentralBusinessAuthorityStatusResult,
} from "./status-client";

export const CENTRAL_EXPENSE_CREATE_CANARY =
  "CENTRAL_EXPENSE_CREATE_CANARY_V1";

type ExpenseDraft = Omit<Expense, "id" | "createdAt">;

export type CentralExpenseCreateDelivery =
  | "local"
  | "central_confirmed"
  | "central_pending"
  | "central_review";

export type CentralExpenseCreateResult =
  | {
      ok: true;
      expense: Expense | null;
      delivery: CentralExpenseCreateDelivery;
    }
  | { ok: false; error: string };

export interface CentralExpenseCreateCanaryDependencies {
  getCurrentData(): AppData;
  addExpenseFallback(expense: ExpenseDraft): void;
  addExpenseDurably(
    expense: ExpenseDraft,
    identity: { id: string; now: string },
    expected: AppData,
  ): AppDataDurabilityResult<Expense>;
  fetchStatus?: () => Promise<CentralBusinessAuthorityStatusResult>;
  mutate?: (
    input: Parameters<typeof mutateCentralBusinessFromBrowser>[0],
  ) => Promise<CentralBusinessBrowserMutationResult>;
  storage?: CentralBusinessQueueStorage;
  createId?: () => string;
  now?: () => string;
  statusTimeoutMs?: number;
  syncEventsBeforeWrite?: () => Promise<CentralBusinessEventsAppDataSyncResult>;
  environment?: CentralExpenseProfileCanaryEnvironment;
}

function transientStatusFailure(
  result: Extract<CentralBusinessAuthorityStatusResult, { ok: false }>,
): boolean {
  return result.status === 0 || result.status === 429 || result.status >= 500;
}

async function statusWithTimeout(
  fetchStatus: () => Promise<CentralBusinessAuthorityStatusResult>,
  timeoutMs: number,
): Promise<CentralBusinessAuthorityStatusResult> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetchStatus(),
      new Promise<CentralBusinessAuthorityStatusResult>((resolve) => {
        timeout = setTimeout(
          () =>
            resolve({
              ok: false,
              status: 0,
              code: "CENTRAL_BUSINESS_STATUS_TIMEOUT",
              message: "La comprobacion central tardo demasiado.",
            }),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function jsonExpense(expense: Expense): CentralBusinessJson {
  return JSON.parse(JSON.stringify(expense)) as CentralBusinessJson;
}

function durabilityError(
  result: Exclude<AppDataDurabilityResult<Expense>, { status: "applied" }>,
): string {
  if (result.status === "indeterminate") {
    return "El gasto quedó pendiente de revisión porque no se pudo confirmar el almacenamiento local.";
  }
  if (result.reason === "stale_precondition") {
    return "Los gastos cambiaron mientras se guardaba. Revisa la lista y vuelve a intentarlo.";
  }
  return "No se pudo guardar y verificar el gasto en este dispositivo.";
}

export async function createExpenseWithCentralCanary(input: {
  userId: string | null | undefined;
  expense: ExpenseDraft;
  dependencies: CentralExpenseCreateCanaryDependencies;
}): Promise<CentralExpenseCreateResult> {
  const { dependencies } = input;
  if (
    !isCentralExpenseCanaryEnabledForUser(
      input.userId,
      dependencies.environment,
    )
  ) {
    dependencies.addExpenseFallback(input.expense);
    return { ok: true, expense: null, delivery: "local" };
  }

  const ownerScope = input.userId as string;
  const eventSync = await dependencies.syncEventsBeforeWrite?.();
  if (eventSync && !eventSync.ok && !eventSync.retryable) {
    return {
      ok: false,
      error:
        "Hay cambios centrales que este dispositivo no pudo aplicar. Revisa la sincronización antes de guardar el gasto.",
    };
  }

  const status = await statusWithTimeout(
    dependencies.fetchStatus ?? fetchCentralBusinessAuthorityStatusFromBrowser,
    dependencies.statusTimeoutMs ?? 3_000,
  );
  const canAttemptServer = status.ok && status.summary.writesPossible;
  if (
    (!status.ok && !transientStatusFailure(status)) ||
    (status.ok && !status.summary.writesPossible)
  ) {
    return {
      ok: false,
      error:
        "El servidor central todavía no está preparado para guardar gastos en esta cuenta.",
    };
  }

  try {
    return await withCentralBusinessQueueLock(ownerScope, async () => {
      const baseline = dependencies.getCurrentData();
      const id = (dependencies.createId ?? (() => crypto.randomUUID()))();
      if (baseline.expenses.some((expense) => expense.id === id)) {
        return {
          ok: false,
          error:
            "No se pudo generar un identificador único para el gasto. Vuelve a intentarlo.",
        };
      }
      const now = (dependencies.now ?? (() => new Date().toISOString()))();
      const created: Expense = {
        ...input.expense,
        id,
        createdAt: now,
      };
      const operationId = `CENTRAL_EXPENSE_CREATE:${id}`;
      enqueueCentralBusinessOperation({
        ownerScope,
        operationId,
        mutation: {
          idempotencyKey: operationId,
          operationKind: "upsert",
          entityType: "expense",
          entityId: id,
          expectedVersion: 0,
          payload: jsonExpense(created),
        },
        storage: dependencies.storage,
        now: () => now,
      });

      const local = dependencies.addExpenseDurably(
        input.expense,
        { id, now },
        baseline,
      );
      if (local.status !== "applied") {
        if (local.status === "blocked") {
          discardCentralBusinessOperation({
            ownerScope,
            operationId,
            storage: dependencies.storage,
          });
        }
        return { ok: false, error: durabilityError(local) };
      }

      if (!canAttemptServer) {
        return {
          ok: true,
          expense: local.value,
          delivery: "central_pending",
        };
      }

      const drained = await drainCentralBusinessDurableQueue({
        ownerScope,
        storage: dependencies.storage,
        mutate: dependencies.mutate ?? mutateCentralBusinessFromBrowser,
        now: dependencies.now,
      });
      const ownOperation = drained.state.operations.find(
        (operation) => operation.operationId === operationId,
      );
      if (!ownOperation) {
        return {
          ok: true,
          expense: local.value,
          delivery: "central_confirmed",
        };
      }
      return {
        ok: true,
        expense: local.value,
        delivery:
          ownOperation.status === "pending" && drained.stoppedBy === "retryable"
            ? "central_pending"
            : "central_review",
      };
    });
  } catch {
    return {
      ok: false,
      error:
        "No se pudo preparar y verificar la cola segura. No se guardó el gasto.",
    };
  }
}
