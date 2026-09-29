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
        "Hay cambios centrales que este dispositivo no pudo aplicar. Ve a Cuenta > Migración central y usa la copia del servidor en este dispositivo antes de guardar el gasto.",
    };
  }

  const status = await statusWithTimeout(
    dependencies.fetchStatus ?? fetchCentralBusinessAuthorityStatusFromBrowser,
    dependencies.statusTimeoutMs ?? 3_000,
  );
  if (!status.ok || !status.summary.writesPossible) {
    return {
      ok: false,
      error:
        "Se necesita conexión con el servidor central para guardar gastos. No se ha aplicado ningún cambio en este dispositivo.",
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

      const drained = await drainCentralBusinessDurableQueue({
        ownerScope,
        storage: dependencies.storage,
        mutate: dependencies.mutate ?? mutateCentralBusinessFromBrowser,
        now: dependencies.now,
      });
      const ownOperation = drained.state.operations.find(
        (operation) => operation.operationId === operationId,
      );
      if (ownOperation) {
        if (ownOperation.status !== "pending") {
          discardCentralBusinessOperation({
            ownerScope,
            operationId,
            storage: dependencies.storage,
          });
        }
        return {
          ok: false,
          error:
            ownOperation.status === "pending" &&
            drained.stoppedBy === "retryable"
              ? "No se pudo confirmar la respuesta del servidor central. El gasto no se ha añadido a la caché de este dispositivo y se conservará únicamente la identidad necesaria para comprobar la operación sin duplicarla."
              : "El servidor central rechazó el alta. No se ha creado ningún gasto solo en este dispositivo.",
        };
      }

      const local = dependencies.addExpenseDurably(
        input.expense,
        { id, now },
        baseline,
      );
      if (local.status !== "applied") {
        return {
          ok: false,
          error:
            "El servidor confirmó el gasto, pero la caché local no pudo actualizarse. Recarga para recibir la versión central; el gasto no se ha perdido.",
        };
      }
      return {
        ok: true,
        expense: local.value,
        delivery: "central_confirmed",
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
