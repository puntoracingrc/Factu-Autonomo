"use client";

import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "@/lib/app-data-durability";
import type { AppData } from "@/lib/types";

import {
  discardCentralBusinessOperation,
  drainCentralBusinessDurableQueue,
  enqueueCentralBusinessBatch,
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueueStorage,
  withCentralBusinessQueueLock,
} from "./durable-queue";
import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";
import {
  isCentralExpenseCanaryEnabledForUser,
  type CentralExpenseProfileCanaryEnvironment,
} from "./expense-profile-canary";
import {
  mutateCentralBusinessBatchFromBrowser,
  type CentralBusinessBrowserBatchMutationResult,
} from "./batch-mutation-client";
import { CENTRAL_BUSINESS_ATOMIC_BATCH_MAX_OPERATIONS } from "./batch-contract";
import {
  mutateCentralBusinessFromBrowser,
  type CentralBusinessBrowserMutationResult,
} from "./mutation-client";
import type {
  CentralBusinessEntityType,
  CentralBusinessJson,
} from "./mutation-command";
import {
  fetchCentralBusinessAuthorityStatusFromBrowser,
  type CentralBusinessAuthorityStatusResult,
} from "./status-client";

export const CENTRAL_EXPENSE_BUNDLE_CANARY = "CENTRAL_EXPENSE_BUNDLE_CANARY_V1";

type ExpenseBundleEntityType = "supplier" | "expense" | "recurring_expense";

export interface CentralExpenseBundlePreparedMutation {
  entityType: ExpenseBundleEntityType;
  entityId: string;
  expectation: "create" | "known";
  operationKind?: "upsert" | "delete";
  payload: CentralBusinessJson | null;
}

export type CentralExpenseBundlePreparation<T> =
  | {
      ok: true;
      transition: AppDataTransition<T>;
      mutations: CentralExpenseBundlePreparedMutation[];
    }
  | { ok: false; error: string };

export type CentralExpenseBundleDelivery =
  "local" | "central_confirmed" | "central_pending" | "central_review";

export type CentralExpenseBundleResult<T> =
  | {
      ok: true;
      local: Extract<AppDataDurabilityResult<T>, { status: "applied" }>;
      delivery: CentralExpenseBundleDelivery;
    }
  | {
      ok: false;
      error: string;
      localFailure?: Exclude<AppDataDurabilityResult<T>, { status: "applied" }>;
    };

export interface CentralExpenseBundleCanaryDependencies<T> {
  getCurrentData(): AppData;
  fallback(): AppDataDurabilityResult<T>;
  prepareLocal(input: {
    data: AppData;
    now: string;
  }): CentralExpenseBundlePreparation<T>;
  commitLocal(
    expected: AppData,
    transition: AppDataTransition<T>,
    now: string,
  ): AppDataDurabilityResult<T>;
  syncEventsBeforeWrite?: () => Promise<CentralBusinessEventsAppDataSyncResult>;
  fetchStatus?: () => Promise<CentralBusinessAuthorityStatusResult>;
  mutate?: (
    input: Parameters<typeof mutateCentralBusinessFromBrowser>[0],
  ) => Promise<CentralBusinessBrowserMutationResult>;
  mutateBatch?: (
    input: Parameters<typeof mutateCentralBusinessBatchFromBrowser>[0],
  ) => Promise<CentralBusinessBrowserBatchMutationResult>;
  storage?: CentralBusinessQueueStorage;
  now?: () => string;
  statusTimeoutMs?: number;
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

function entityKey(entityType: CentralBusinessEntityType, entityId: string) {
  return `${entityType}:${entityId}`;
}

function durableFailure<T>(
  result: Exclude<AppDataDurabilityResult<T>, { status: "applied" }>,
): string {
  if (result.status === "indeterminate") {
    return "El guardado quedó pendiente de revisión porque no se pudo confirmar el almacenamiento local.";
  }
  if (result.reason === "stale_precondition") {
    return "Los datos cambiaron mientras se guardaba. Revisa el formulario y vuelve a intentarlo.";
  }
  return "No se pudo guardar y verificar el gasto completo en este dispositivo.";
}

function validatePreparedMutations(
  mutations: CentralExpenseBundlePreparedMutation[],
): boolean {
  if (
    mutations.length < 1 ||
    mutations.length > CENTRAL_BUSINESS_ATOMIC_BATCH_MAX_OPERATIONS
  ) {
    return false;
  }
  const entities = new Set<string>();
  for (const mutation of mutations) {
    if (
      mutation.entityId.length < 1 ||
      mutation.entityId.length > 200 ||
      entities.has(entityKey(mutation.entityType, mutation.entityId))
    ) {
      return false;
    }
    entities.add(entityKey(mutation.entityType, mutation.entityId));
  }
  return true;
}

async function operationIdentity(operationId: string): Promise<{
  batchId: string;
  idempotencyPrefix: string;
}> {
  const normalized = operationId.trim();
  if (!/^[A-Za-z0-9_-]{1,160}$/u.test(normalized)) {
    throw new Error("CENTRAL_EXPENSE_BUNDLE_INVALID_OPERATION_ID");
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized),
  );
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return {
    batchId: `CENTRAL_EXPENSE_BUNDLE:${hash}`,
    idempotencyPrefix: `CENTRAL_EXPENSE_BUNDLE:${hash}`,
  };
}

export async function saveCentralExpenseBundleWithCanary<T>(input: {
  userId: string | null | undefined;
  operationId: string;
  dependencies: CentralExpenseBundleCanaryDependencies<T>;
}): Promise<CentralExpenseBundleResult<T>> {
  const { dependencies } = input;
  if (
    !isCentralExpenseCanaryEnabledForUser(
      input.userId,
      dependencies.environment,
    )
  ) {
    const local = dependencies.fallback();
    return local.status === "applied"
      ? { ok: true, local, delivery: "local" }
      : { ok: false, error: durableFailure(local), localFailure: local };
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
  const canAttemptServer = status.ok && status.summary.writesPossible;
  if (
    (!status.ok && !transientStatusFailure(status)) ||
    (status.ok && !status.summary.writesPossible)
  ) {
    return {
      ok: false,
      error:
        "El servidor central todavía no está preparado para guardar este gasto completo.",
    };
  }

  try {
    return await withCentralBusinessQueueLock(ownerScope, async () => {
      const baseline = dependencies.getCurrentData();
      const now = (dependencies.now ?? (() => new Date().toISOString()))();
      const prepared = dependencies.prepareLocal({ data: baseline, now });
      if (!prepared.ok) return prepared;
      if (!validatePreparedMutations(prepared.mutations)) {
        return {
          ok: false,
          error:
            "El gasto completo no cumple el contrato del servidor central.",
        };
      }

      const identity = await operationIdentity(input.operationId);
      const queue = loadCentralBusinessDurableQueue(
        ownerScope,
        dependencies.storage,
      );
      const existingBatch = queue.operations.filter(
        (operation) => operation.batchId === identity.batchId,
      );
      const batchEntityKeys = new Set(
        existingBatch.map((operation) =>
          entityKey(operation.input.entityType, operation.input.entityId),
        ),
      );
      for (const mutation of prepared.mutations) {
        const key = entityKey(mutation.entityType, mutation.entityId);
        if (
          queue.operations.some(
            (operation) =>
              entityKey(
                operation.input.entityType,
                operation.input.entityId,
              ) === key && !batchEntityKeys.has(key),
          )
        ) {
          return {
            ok: false,
            error:
              "Una parte de este gasto ya tiene un cambio pendiente. Sincroniza antes de volver a guardarlo.",
          };
        }
      }

      const mutations = prepared.mutations.map((mutation, index) => {
        const known =
          queue.entityVersions[
            entityKey(mutation.entityType, mutation.entityId)
          ];
        if (
          mutation.expectation === "create" &&
          known &&
          !existingBatch.length
        ) {
          throw new Error("CENTRAL_EXPENSE_BUNDLE_ENTITY_EXISTS");
        }
        if (mutation.expectation === "known" && (!known || known.deleted)) {
          throw new Error("CENTRAL_EXPENSE_BUNDLE_VERSION_UNKNOWN");
        }
        return {
          idempotencyKey: `${identity.idempotencyPrefix}:${index}`,
          operationKind: mutation.operationKind ?? ("upsert" as const),
          entityType: mutation.entityType,
          entityId: mutation.entityId,
          expectedVersion:
            mutation.expectation === "known" ? known!.version : 0,
          payload: mutation.payload,
        };
      });

      enqueueCentralBusinessBatch({
        ownerScope,
        batchId: identity.batchId,
        mutations,
        storage: dependencies.storage,
        now: () => now,
      });

      const local = dependencies.commitLocal(
        baseline,
        prepared.transition,
        now,
      );
      if (local.status !== "applied") {
        if (local.status === "blocked") {
          discardCentralBusinessOperation({
            ownerScope,
            operationId: mutations[0].idempotencyKey,
            storage: dependencies.storage,
          });
        }
        return {
          ok: false,
          error: durableFailure(local),
          localFailure: local,
        };
      }

      if (!canAttemptServer) {
        return { ok: true, local, delivery: "central_pending" };
      }

      let drained;
      try {
        drained = await drainCentralBusinessDurableQueue({
          ownerScope,
          storage: dependencies.storage,
          mutate: dependencies.mutate ?? mutateCentralBusinessFromBrowser,
          mutateBatch:
            dependencies.mutateBatch ?? mutateCentralBusinessBatchFromBrowser,
          now: dependencies.now,
        });
      } catch {
        return { ok: true, local, delivery: "central_review" };
      }
      const ownOperations = drained.state.operations.filter(
        (operation) => operation.batchId === identity.batchId,
      );
      if (ownOperations.length === 0) {
        return { ok: true, local, delivery: "central_confirmed" };
      }
      return {
        ok: true,
        local,
        delivery:
          ownOperations.every((operation) => operation.status === "pending") &&
          drained.stoppedBy === "retryable"
            ? "central_pending"
            : "central_review",
      };
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "CENTRAL_EXPENSE_BUNDLE_VERSION_UNKNOWN") {
      return {
        ok: false,
        error:
          "No se pudo confirmar la versión central de una ficha vinculada. Sincroniza y vuelve a intentarlo.",
      };
    }
    if (code === "CENTRAL_EXPENSE_BUNDLE_ENTITY_EXISTS") {
      return {
        ok: false,
        error:
          "El servidor central ya conoce una identidad que este guardado intentaba crear. Revisa la sincronización.",
      };
    }
    return {
      ok: false,
      error:
        "No se pudo preparar y verificar el guardado atómico. No se aplicó el cambio.",
    };
  }
}
